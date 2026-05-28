"""
2. AŞAMA: LITERAL ÇEVİRİ ÜRETME
verses tablosuna literal_ceviri sütununu ekler ve Gemini 2.5 Flash ile doldurur.

Kullanım:
  python scripts/literal-ceviri-uret.py
  python scripts/literal-ceviri-uret.py --dry-run          (DB'ye yazma)
  python scripts/literal-ceviri-uret.py --limit 30         (ilk N ayeti işle)
  python scripts/literal-ceviri-uret.py --surah 2          (sadece bir sure)
  python scripts/literal-ceviri-uret.py --batch-size 10    (batch büyüklüğü)
  python scripts/literal-ceviri-uret.py --yeniden-yaz      (dolu olanları da yenile)
"""

import sqlite3, os, sys, json, time, argparse
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH    = Path(__file__).parent.parent / "data" / "app.db"
MODEL      = "gemini-2.5-flash"
BATCH_SIZE = 15
ARALIK_SN  = 0.5

SYSTEM_INSTRUCTION = (
    "Sen sadece Kur'an ayetlerinin harfiyen (literal) Türkçe çevirisini yapan, "
    "dilbilimsel bir yapay zekasın. Görevin, sana verilen ayetteki kelimelerin "
    "orijinal sırasına, eklerine ve bizim sağladığımız kelime anlamlarına (%100) "
    "sadık kalarak, edebi/tefsirsel hiçbir yorum ve süsleme katmadan, kupkuru ve "
    "birebir bir Türkçe karşılık üretmektir. Asla açıklama veya giriş cümlesi yazma."
)

PROMPT_TEMPLATE = (
    "Aşağıdaki {n} adet ayetin her biri için, sağlanan kelime anlamları dizilimini "
    "temel alarak literal çeviriyi üret:\n{data}"
)


# ── Pydantic şema ─────────────────────────────────────────────────────────────

class LiteralResult(BaseModel):
    verse_key: str
    literal_ceviri: str


# ── Veritabanı yardımcıları ───────────────────────────────────────────────────

def kolon_ekle(conn: sqlite3.Connection) -> None:
    """verses tablosuna literal_ceviri kolonu yoksa ekle."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(verses)")
    kolonlar = [r[1] for r in cur.fetchall()]
    if "literal_ceviri" not in kolonlar:
        cur.execute("ALTER TABLE verses ADD COLUMN literal_ceviri TEXT")
        conn.commit()
        print("  ✓ literal_ceviri kolonu eklendi.")
    else:
        print("  ✓ literal_ceviri kolonu zaten mevcut.")


def bekleyen_ayetleri_cek(
    conn: sqlite3.Connection,
    surah: Optional[int],
    yeniden_yaz: bool,
    limit: Optional[int],
) -> list[dict]:
    """literal_ceviri boş (veya yeniden_yaz=True ise tüm) ayetleri döner."""
    cur = conn.cursor()
    kosul = ""
    params: list = []

    if not yeniden_yaz:
        kosul += " AND (v.literal_ceviri IS NULL OR TRIM(v.literal_ceviri) = '')"
    if surah:
        kosul += " AND v.surah_id = ?"
        params.append(surah)

    sorgu = f"""
        SELECT v.verse_key, v.arabic_text, v.surah_id, v.ayah_number
        FROM verses v
        WHERE 1=1 {kosul}
        ORDER BY v.surah_id, v.ayah_number
        {"LIMIT ?" if limit else ""}
    """
    if limit:
        params.append(limit)

    cur.execute(sorgu, params)
    return [
        {"verse_key": r[0], "arabic_text": r[1], "surah_id": r[2], "ayah_number": r[3]}
        for r in cur.fetchall()
    ]


def kelimeleri_cek(conn: sqlite3.Connection, verse_keys: list[str]) -> dict[str, list[dict]]:
    """Verilen verse_key listesi için words tablosundan kelimeleri çeker."""
    if not verse_keys:
        return {}
    cur = conn.cursor()
    yer_tutucu = ",".join("?" * len(verse_keys))
    cur.execute(
        f"""
        SELECT verse_key, word_index, arabic, meaning_tr
        FROM words
        WHERE verse_key IN ({yer_tutucu})
          AND meaning_tr IS NOT NULL AND TRIM(meaning_tr) != ''
        ORDER BY verse_key, word_index
        """,
        verse_keys,
    )
    sonuc: dict[str, list[dict]] = {vk: [] for vk in verse_keys}
    for verse_key, word_index, arabic, meaning_tr in cur.fetchall():
        sonuc[verse_key].append({arabic: meaning_tr})
    return sonuc


def batch_payload_olustur(
    ayetler: list[dict],
    kelime_haritasi: dict[str, list[dict]],
) -> str:
    """15 ayet için JSON payload üretir (token tasarruflu format)."""
    veri = []
    for ayet in ayetler:
        vk = ayet["verse_key"]
        veri.append({
            "verse_key": vk,
            "verse_arabic": ayet["arabic_text"],
            "kelimeler": kelime_haritasi.get(vk, []),
        })
    return json.dumps(veri, ensure_ascii=False, separators=(",", ":"))


def db_guncelle(
    conn: sqlite3.Connection,
    sonuclar: list[LiteralResult],
    dry_run: bool,
) -> int:
    """Sonuçları verses tablosuna yazar, değişen satır sayısını döner."""
    if dry_run:
        return len(sonuclar)
    cur = conn.cursor()
    n = 0
    for s in sonuclar:
        cur.execute(
            "UPDATE verses SET literal_ceviri = ? WHERE verse_key = ?",
            (s.literal_ceviri, s.verse_key),
        )
        n += cur.rowcount
    conn.commit()
    return n


# ── Gemini çağrısı ────────────────────────────────────────────────────────────

def gemini_cagir(
    client: genai.Client,
    ayetler: list[dict],
    kelime_haritasi: dict[str, list[dict]],
) -> list[LiteralResult]:
    """Bir batch için Gemini çağrısı yapar, LiteralResult listesi döner."""
    payload = batch_payload_olustur(ayetler, kelime_haritasi)
    prompt  = PROMPT_TEMPLATE.format(n=len(ayetler), data=payload)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.1,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=list[LiteralResult],
    )

    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )

    # JSON parse + Pydantic doğrulama
    raw = resp.text
    if not raw:
        raise ValueError("Gemini boş yanıt döndürdü.")

    parsed = json.loads(raw)
    sonuclar = [LiteralResult(**item) for item in parsed]

    # Verse key eşleşme kontrolü
    beklenen = {a["verse_key"] for a in ayetler}
    gelen    = {s.verse_key for s in sonuclar}
    eksik    = beklenen - gelen
    if eksik:
        raise ValueError(f"Yanıtta eksik verse_key'ler: {eksik}")

    return sonuclar


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",      action="store_true")
    parser.add_argument("--limit",        type=int,   default=None)
    parser.add_argument("--surah",        type=int,   default=None)
    parser.add_argument("--batch-size",   type=int,   default=BATCH_SIZE)
    parser.add_argument("--yeniden-yaz",  action="store_true")
    parser.add_argument("--aralik",       type=float, default=ARALIK_SN)
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr)
        sys.exit(1)
    client = genai.Client(api_key=api_key)

    conn = sqlite3.connect(DB_PATH)

    print(f"\n{'='*62}")
    print(f"  LİTERAL ÇEVİRİ ÜRETME  |  {'DRY-RUN' if args.dry_run else 'CANLI'}")
    print(f"{'='*62}")
    print(f"  Model       : {MODEL}")
    print(f"  Batch boyutu: {args.batch_size}")
    print(f"  Sure filtresi: {args.surah or 'tümü'}")

    # Kolon oluştur
    kolon_ekle(conn)

    # Bekleyen ayetleri çek
    ayetler = bekleyen_ayetleri_cek(conn, args.surah, args.yeniden_yaz, args.limit)
    toplam  = len(ayetler)

    if toplam == 0:
        print("\n  ✓ Tüm ayetlerin literal çevirisi zaten mevcut.")
        conn.close()
        return

    print(f"  İşlenecek ayet: {toplam}")
    print(f"  Batch sayısı  : {(toplam + args.batch_size - 1) // args.batch_size}")

    # Batch döngüsü
    islenen = toplam_guncellenen = hata_sayac = 0

    for batch_no, baslangic in enumerate(range(0, toplam, args.batch_size), 1):
        batch = ayetler[baslangic : baslangic + args.batch_size]
        verse_keys = [a["verse_key"] for a in batch]

        print(f"\n  Batch {batch_no:>3}  [{verse_keys[0]} – {verse_keys[-1]}]  ({len(batch)} ayet)")

        # Kelimeleri çek
        kelime_haritasi = kelimeleri_cek(conn, verse_keys)

        try:
            sonuclar = gemini_cagir(client, batch, kelime_haritasi)
        except (ValueError, ValidationError, json.JSONDecodeError, KeyError) as e:
            print(f"    ✗ Hata: {e}")
            hata_sayac += 1
            time.sleep(args.aralik * 2)
            continue
        except Exception as e:
            print(f"    ✗ Beklenmedik hata: {e}")
            hata_sayac += 1
            time.sleep(4)
            continue

        # DB güncelle
        n = db_guncelle(conn, sonuclar, args.dry_run)
        islenen           += len(batch)
        toplam_guncellenen += n

        # İlk 3 sonucu logla
        for s in sonuclar[:3]:
            print(f"    {s.verse_key:<8}  {s.literal_ceviri[:70]}")
        if len(sonuclar) > 3:
            print(f"    ... ve {len(sonuclar)-3} ayet daha")

        time.sleep(args.aralik)

    conn.close()

    # Özet
    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  İşlenen ayet    : {islenen}/{toplam}")
    print(f"  Güncellenen     : {toplam_guncellenen}")
    print(f"  Hatalı batch    : {hata_sayac}")
    print(f"  Mod             : {'DRY-RUN (DB yazılmadı)' if args.dry_run else 'Kaydedildi'}")
    print()


if __name__ == "__main__":
    main()
