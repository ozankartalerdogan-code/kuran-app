"""
2. AŞAMA v2 — LİTERAL ÇEVİRİ (DÜZELTİLMİŞ PROMPT)

Önceki versiyonun sorunu: Gemini, meaning_tr değerlerindeki "hayır/değil",
"-den, -dan", "yaşamak, hayat" gibi ham alternatifleri doğrudan kopyalıyordu.

Bu versiyondaki düzeltmeler:
  1. meaning_tr temizleme — slash ve virgüllü alternatifler Gemini'ya gönderilmeden
     tek anlamlı forma indirgenir (örn: "hayır/değil" → "hayır, değil")
  2. System instruction — Türkçe cümle kuruluşuna uyma zorunluluğu
  3. Prompt — Kelime yapıştırma yasağı + doğru/yanlış örnek

Kullanım:
  python scripts/literal-ceviri-v2.py
  python scripts/literal-ceviri-v2.py --dry-run
  python scripts/literal-ceviri-v2.py --limit 30
  python scripts/literal-ceviri-v2.py --surah 2
  python scripts/literal-ceviri-v2.py --batch-size 10
  python scripts/literal-ceviri-v2.py --sadece-anomali   (sadece hatalı ayetleri yenile)
"""

import sqlite3, os, sys, json, time, argparse, re
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH    = Path(__file__).parent.parent / "data" / "app.db"
ANOMALI_CSV = Path(__file__).parent.parent / "data" / "kok_literal_anomali_raporu.csv"
MODEL      = "gemini-2.5-flash"
BATCH_SIZE = 15
ARALIK_SN  = 0.5

# ── Düzeltilmiş System Instruction ───────────────────────────────────────────

SYSTEM_INSTRUCTION = """\
Sen Kur'an ayetlerinin Türkçe literal (harfi harfine) çevirisini yapan bir dilbilim asistanısın.

GÖREV:
Sana her ayet için Arapça metin ve kelimelerin temel Türkçe anlamları verilecek.
Bu anlamları kullanarak ayetin anlaşılır, akıcı, kupkuru bir Türkçe literal çevirisini üret.

ZORUNLU KURALLAR:
1. Kelimeleri birebir yapıştırma — Türkçe cümle kurallarına (özne-nesne-yüklem) göre düzenle.
2. Verilen kelime anlamlarının özünü koru, ama doğal Türkçe ekler kullan (-in, -e, -i, -de, -den vb.).
3. Edebi süsleme, tefsir veya yorum ekleme — kupkuru, sade bir çeviri yap.
4. Açıklama veya giriş cümlesi yazma — sadece çeviriyi yaz.
5. Slash (/) veya parantez ile alternatif anlam verme — en uygun anlamı seç, tek cümle yaz.

ÖRNEK (DOĞRU):
  Kelimeler: Allah | yok | ilah | ancak | o | diri | yöneten
  DOĞRU çeviri: "Allah, O'ndan başka ilah yoktur. O, her an diri ve yönetendir."
  YANLIŞ çeviri: "Allah hayır/değil Allah ancak o yaşamak, hayat kavim değil/yok"
"""

PROMPT_TEMPLATE = """\
Aşağıdaki {n} ayet için literal Türkçe çeviri üret.
Her ayet için verse_key ve literal_ceviri alanlarını döndür.

{data}\
"""


# ── Pydantic şema ─────────────────────────────────────────────────────────────

class LiteralResult(BaseModel):
    verse_key: str
    literal_ceviri: str


# ── meaning_tr temizleyici ────────────────────────────────────────────────────

def temizle_meaning(meaning: str) -> str:
    """
    Ham meaning_tr değerlerini Gemini'ya göndermeden önce temizler.
    - "hayır/değil"    → "hayır ya da değil"  (slash → ya da)
    - "-den, -dan"     → "dan/den (edat)"
    - "yaşamak, hayat" → "yaşamak, hayat"  (virgüllü eş anlamlı → olduğu gibi bırak)
    - "Ne zaman, -dığında" → "ne zaman"
    """
    m = meaning.strip()

    # Gramatikal göstericiler (-den, -dan gibi) → kısa açıklama
    if re.match(r"^-[a-zçğıöşüA-ZÇĞİÖŞÜ]", m):
        # "-den, -dan" → "den/dan (hal eki)"
        temiz = m.lstrip("-").split(",")[0].strip()
        return f"{temiz} (edat/ek)"

    # Slash varsa → "A ya da B" yerine ilk seçeneği al
    if "/" in m:
        # "hayır/değil" → "hayır"
        # "ne / şey"    → "ne"
        return m.split("/")[0].strip()

    # "Ne zaman, -dığında" gibi — ikinci kısım "-" ile başlıyorsa at
    if "," in m:
        parcalar = [p.strip() for p in m.split(",")]
        if len(parcalar) == 2 and parcalar[1].startswith("-"):
            return parcalar[0]

    return m


# ── Veritabanı yardımcıları ───────────────────────────────────────────────────

def kolon_ekle(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(verses)")
    kolonlar = [r[1] for r in cur.fetchall()]
    if "literal_ceviri" not in kolonlar:
        cur.execute("ALTER TABLE verses ADD COLUMN literal_ceviri TEXT")
        conn.commit()
        print("  ✓ literal_ceviri kolonu eklendi.")
    else:
        print("  ✓ literal_ceviri kolonu mevcut.")


def anomali_verse_keyleri() -> set[str]:
    """Daha önce üretilmiş anomali raporundaki verse_key'leri döner."""
    if not ANOMALI_CSV.exists():
        return set()
    import csv
    keys: set[str] = set()
    with open(ANOMALI_CSV, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            keys.add(row["verse_key"])
    return keys


def bekleyen_ayetleri_cek(
    conn: sqlite3.Connection,
    surah: Optional[int],
    yeniden_yaz: bool,
    sadece_anomali: bool,
    limit: Optional[int],
) -> list[dict]:
    cur = conn.cursor()
    kosul = ""
    params: list = []

    if sadece_anomali:
        # Anomali raporundaki ayet listesini kullan
        anomali_keys = anomali_verse_keyleri()
        if not anomali_keys:
            print("  ⚠ Anomali raporu bulunamadı. Önce data-anomaly-detector.py çalıştırın.")
            return []
        yer_tutucu = ",".join("?" * len(anomali_keys))
        kosul += f" AND v.verse_key IN ({yer_tutucu})"
        params.extend(sorted(anomali_keys))
    elif not yeniden_yaz:
        kosul += " AND (v.literal_ceviri IS NULL OR TRIM(v.literal_ceviri) = '')"

    if surah:
        kosul += " AND v.surah_id = ?"
        params.append(surah)

    sorgu = (
        f"SELECT v.verse_key, v.arabic_text, v.surah_id, v.ayah_number "
        f"FROM verses v WHERE 1=1 {kosul} "
        f"ORDER BY v.surah_id, v.ayah_number"
        + (" LIMIT ?" if limit else "")
    )
    if limit:
        params.append(limit)

    cur.execute(sorgu, params)
    return [
        {"verse_key": r[0], "arabic_text": r[1], "surah_id": r[2], "ayah_number": r[3]}
        for r in cur.fetchall()
    ]


def kelimeleri_cek(conn: sqlite3.Connection, verse_keys: list[str]) -> dict[str, list[str]]:
    """verse_key → [temizlenmiş_meaning, ...] listesi döner."""
    if not verse_keys:
        return {}
    cur = conn.cursor()
    yer = ",".join("?" * len(verse_keys))
    cur.execute(
        f"SELECT verse_key, word_index, meaning_tr "
        f"FROM words "
        f"WHERE verse_key IN ({yer}) "
        f"  AND meaning_tr IS NOT NULL AND TRIM(meaning_tr) != '' "
        f"ORDER BY verse_key, word_index",
        verse_keys,
    )
    sonuc: dict[str, list[str]] = {vk: [] for vk in verse_keys}
    for vk, _, mt in cur.fetchall():
        temiz = temizle_meaning(mt)
        if temiz:
            sonuc[vk].append(temiz)
    return sonuc


def batch_payload(ayetler: list[dict], kelime_harita: dict[str, list[str]]) -> str:
    veri = []
    for a in ayetler:
        vk = a["verse_key"]
        kelimeler = kelime_harita.get(vk, [])
        veri.append({
            "verse_key":    vk,
            "verse_arabic": a["arabic_text"],
            # Kelimeleri " | " ile ayır — Gemini'nın alternatif olarak okuyabileceği
            # virgül/slash yerine pipe kullan
            "kelime_anlamlari": " | ".join(kelimeler),
        })
    return json.dumps(veri, ensure_ascii=False, separators=(",", ":"))


def db_guncelle(
    conn: sqlite3.Connection,
    sonuclar: list[LiteralResult],
    dry_run: bool,
) -> int:
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
    kelime_harita: dict[str, list[str]],
) -> list[LiteralResult]:
    payload = batch_payload(ayetler, kelime_harita)
    prompt  = PROMPT_TEMPLATE.format(n=len(ayetler), data=payload)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=list[LiteralResult],
    )
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    raw = resp.text
    if not raw:
        raise ValueError("Gemini boş yanıt döndürdü.")

    sonuclar = [LiteralResult(**item) for item in json.loads(raw)]

    beklenen = {a["verse_key"] for a in ayetler}
    gelen    = {s.verse_key for s in sonuclar}
    eksik    = beklenen - gelen
    if eksik:
        raise ValueError(f"Yanıtta eksik verse_key: {eksik}")

    return sonuclar


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",       action="store_true")
    parser.add_argument("--limit",         type=int,   default=None)
    parser.add_argument("--surah",         type=int,   default=None)
    parser.add_argument("--batch-size",    type=int,   default=BATCH_SIZE)
    parser.add_argument("--yeniden-yaz",   action="store_true",
                        help="Dolu olanları da üret (tüm DB yenile)")
    parser.add_argument("--sadece-anomali", action="store_true",
                        help="Sadece anomali raporundaki ayetleri yeniden üret")
    parser.add_argument("--aralik",        type=float, default=ARALIK_SN)
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr)
        sys.exit(1)
    client = genai.Client(api_key=api_key)
    conn   = sqlite3.connect(DB_PATH)

    mod_etiketi = (
        "SADECE-ANOMALİ" if args.sadece_anomali
        else "YENİDEN-YAZ" if args.yeniden_yaz
        else "NORMAL"
    )

    print(f"\n{'='*62}")
    print(f"  LİTERAL ÇEVİRİ v2  |  "
          f"{'DRY-RUN' if args.dry_run else 'CANLI'}  |  {mod_etiketi}")
    print(f"{'='*62}")
    print(f"  Model       : {MODEL}")
    print(f"  Batch boyutu: {args.batch_size}")
    print(f"  Sure        : {args.surah or 'tümü'}")

    kolon_ekle(conn)

    ayetler = bekleyen_ayetleri_cek(
        conn, args.surah, args.yeniden_yaz, args.sadece_anomali, args.limit
    )
    toplam = len(ayetler)

    if toplam == 0:
        print("\n  ✓ İşlenecek ayet yok.")
        conn.close()
        return

    batch_sayisi = (toplam + args.batch_size - 1) // args.batch_size
    print(f"  İşlenecek ayet  : {toplam}")
    print(f"  Batch sayısı    : {batch_sayisi}")

    islenen = toplam_guncellenen = hata_sayac = 0

    for batch_no, baslangic in enumerate(range(0, toplam, args.batch_size), 1):
        batch      = ayetler[baslangic : baslangic + args.batch_size]
        verse_keys = [a["verse_key"] for a in batch]

        print(f"\n  Batch {batch_no:>3}/{batch_sayisi}"
              f"  [{verse_keys[0]} – {verse_keys[-1]}]  ({len(batch)} ayet)")

        kelime_harita = kelimeleri_cek(conn, verse_keys)

        try:
            sonuclar = gemini_cagir(client, batch, kelime_harita)
        except (ValueError, ValidationError, json.JSONDecodeError) as e:
            print(f"    ✗ Hata: {e}")
            hata_sayac += 1
            time.sleep(args.aralik * 3)
            continue
        except Exception as e:
            print(f"    ✗ Beklenmedik hata: {e}")
            hata_sayac += 1
            time.sleep(5)
            continue

        n = db_guncelle(conn, sonuclar, args.dry_run)
        islenen            += len(batch)
        toplam_guncellenen += n

        for s in sonuclar[:3]:
            print(f"    {s.verse_key:<8}  {s.literal_ceviri[:70]}")
        if len(sonuclar) > 3:
            print(f"    ... ve {len(sonuclar) - 3} ayet daha")

        time.sleep(args.aralik)

    conn.close()

    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  İşlenen ayet    : {islenen}/{toplam}")
    print(f"  Güncellenen     : {toplam_guncellenen}")
    print(f"  Hatalı batch    : {hata_sayac}")
    print(f"  Mod             : {'DRY-RUN' if args.dry_run else 'Kaydedildi'}")
    print()


if __name__ == "__main__":
    main()
