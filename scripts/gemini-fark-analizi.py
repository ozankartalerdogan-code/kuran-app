"""
GERÇEK FARK olan ayetler için Gemini ile fark analizi yapar.
Diğer ayetlere varsayılan mesaj yazar.

Sonuç: verses.fark_analizi sütunu (per-verse, kaynaktan bağımsız)

Kullanım:
  python scripts/gemini-fark-analizi.py
  python scripts/gemini-fark-analizi.py --dry-run
  python scripts/gemini-fark-analizi.py --limit 30
  python scripts/gemini-fark-analizi.py --surah 2
  python scripts/gemini-fark-analizi.py --sifirla    (checkpoint sil)
  python scripts/gemini-fark-analizi.py --sadece-varsayilan  (API kullanma, sadece default yaz)
"""

import sqlite3, csv, os, sys, json, time, argparse
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH      = Path(__file__).parent.parent / "data" / "app.db"
CSV_PATH     = Path(__file__).parent.parent / "data" / "fark_analiz_sonuclari.csv"
CHECKPOINT   = Path(__file__).parent.parent / "data" / "gemini_fark_checkpoint.json"
MODEL        = "gemini-2.5-flash"
BATCH_SIZE   = 10
ARALIK_SN    = 0.5

# Varsayılan mesajlar (API kullanılmaz)
VARSAYILAN = {
    "ÜSLUP FARKI": (
        "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır."
    ),
    "KÖK SAPMASI": (
        "Kök anlamında küçük tutarsızlık var, ancak genel anlam uyumludur."
    ),
    "TUTARLI": (
        "Meal ile literal çeviri uyumludur, anlam farkı yoktur."
    ),
}

SYSTEM_INSTRUCTION = """\
Sen Kuran-ı Kerim metin analizi uzmanısın.
Sana verilen her ayet için literal çeviri, meal ve kelime kök bilgilerini karşılaştırarak
fark analizini belirtilen formatta üret.
Fazladan açıklama veya giriş cümlesi yazma — sadece istenen formatı kullan.\
"""

PROMPT_TEMPLATE = """\
Aşağıdaki {n} ayet için fark analizi yap.
Her ayet için verse_key ve belirtilen formatta analiz döndür.

{data}\
"""

ANALIZ_FORMAT = """\
Ayet: {verse_key}
LİTERAL: {literal}
MEAL: {meal}
KÖKLER: {kokler}
"""


# ── Pydantic şema ─────────────────────────────────────────────────────────────

class AyetAnaliz(BaseModel):
    verse_key: str
    analiz: str


# ── DB yardımcıları ───────────────────────────────────────────────────────────

def kolon_ekle(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(verses)")
    if "fark_analizi" not in [r[1] for r in cur.fetchall()]:
        cur.execute("ALTER TABLE verses ADD COLUMN fark_analizi TEXT")
        conn.commit()
        print("  ✓ fark_analizi kolonu eklendi (verses tablosu).")
    else:
        print("  ✓ fark_analizi kolonu zaten mevcut.")


def verileri_yukle(
    conn: sqlite3.Connection,
    verse_keys: list[str],
) -> dict[str, dict]:
    """verse_key → {literal, meal, kokler_str} sözlüğü."""
    cur = conn.cursor()
    yer = ",".join("?" * len(verse_keys))

    cur.execute(
        f"SELECT verse_key, literal_ceviri FROM verses WHERE verse_key IN ({yer})",
        verse_keys
    )
    literal_map = {r[0]: r[1] or "" for r in cur.fetchall()}

    cur.execute(
        f"SELECT verse_key, text FROM translations "
        f"WHERE verse_key IN ({yer}) AND source='diyanet'",
        verse_keys
    )
    meal_map = {r[0]: r[1] or "" for r in cur.fetchall()}

    cur.execute(
        f"SELECT verse_key, arabic, root, meaning_tr "
        f"FROM words "
        f"WHERE verse_key IN ({yer}) AND root IS NOT NULL AND meaning_tr IS NOT NULL "
        f"ORDER BY verse_key, word_index",
        verse_keys
    )
    kok_map: dict[str, list[str]] = defaultdict(list)
    for vk, ar, root, meaning in cur.fetchall():
        kok_map[vk].append(f"{ar}→{meaning} (kök:{root})")

    sonuc = {}
    for vk in verse_keys:
        sonuc[vk] = {
            "literal": literal_map.get(vk, ""),
            "meal":    meal_map.get(vk, ""),
            "kokler":  "; ".join(kok_map.get(vk, [])) or "—",
        }
    return sonuc


def db_guncelle(
    conn: sqlite3.Connection,
    guncellemeler: list[tuple[str, str]],   # [(verse_key, fark_analizi), ...]
    dry_run: bool,
) -> int:
    if dry_run:
        return len(guncellemeler)
    cur = conn.cursor()
    n = 0
    for vk, analiz in guncellemeler:
        cur.execute(
            "UPDATE verses SET fark_analizi = ? WHERE verse_key = ?",
            (analiz, vk)
        )
        n += cur.rowcount
    conn.commit()
    return n


# ── Checkpoint ────────────────────────────────────────────────────────────────

def ckpt_yukle() -> set[str]:
    if not CHECKPOINT.exists():
        return set()
    return set(json.loads(CHECKPOINT.read_text(encoding="utf-8")))


def ckpt_kaydet(tamamlananlar: set[str]) -> None:
    CHECKPOINT.write_text(
        json.dumps(sorted(tamamlananlar), ensure_ascii=False),
        encoding="utf-8"
    )


# ── Gemini çağrısı ────────────────────────────────────────────────────────────

def gemini_batch(
    client: genai.Client,
    batch_veriler: list[dict],   # [{"verse_key":..., "literal":..., "meal":..., "kokler":...}]
) -> list[AyetAnaliz]:
    bloklar = []
    for v in batch_veriler:
        bloklar.append(ANALIZ_FORMAT.format(
            verse_key = v["verse_key"],
            literal   = v["literal"][:200],
            meal      = v["meal"][:200],
            kokler    = v["kokler"][:300],
        ))

    prompt_icerigi = "\n---\n".join(bloklar)
    prompt = PROMPT_TEMPLATE.format(n=len(batch_veriler), data=prompt_icerigi)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=list[AyetAnaliz],
    )
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    raw = resp.text
    if not raw:
        raise ValueError("Gemini boş yanıt döndürdü.")

    sonuclar = [AyetAnaliz(**item) for item in json.loads(raw)]

    # Verse key eşleşme kontrolü
    beklenen = {v["verse_key"] for v in batch_veriler}
    gelen    = {s.verse_key for s in sonuclar}
    eksik    = beklenen - gelen
    if eksik:
        raise ValueError(f"Yanıtta eksik verse_key: {eksik}")

    # AI notu ekle
    for s in sonuclar:
        if "ℹ️" not in s.analiz:
            s.analiz += (
                "\n\nℹ️ AI tarafından üretilmiştir. "
                "Kesin bilgi için güvenilir tefsirlere başvurunuz."
            )
    return sonuclar


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",          action="store_true")
    parser.add_argument("--limit",            type=int, default=None)
    parser.add_argument("--surah",            type=int, default=None)
    parser.add_argument("--sifirla",          action="store_true")
    parser.add_argument("--sadece-varsayilan", action="store_true",
                        help="Sadece varsayılan mesajları yaz, API çağrısı yapma")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key and not args.sadece_varsayilan:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr)
        sys.exit(1)
    client = None if args.sadece_varsayilan else genai.Client(api_key=api_key)

    # CSV oku
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        tum_satirlar = list(csv.DictReader(f))

    # Sure filtresi
    if args.surah:
        tum_satirlar = [r for r in tum_satirlar if r["verse_key"].startswith(f"{args.surah}:")]

    # Türlere ayır
    gercek_fark = [r for r in tum_satirlar if r["fark_turu"] == "GERÇEK FARK"]
    diger       = [r for r in tum_satirlar if r["fark_turu"] != "GERÇEK FARK"]

    if args.limit:
        gercek_fark = gercek_fark[:args.limit]

    conn = sqlite3.connect(DB_PATH)
    kolon_ekle(conn)

    print(f"\n{'='*62}")
    print(f"  GEMİNİ FARK ANALİZİ  |  {'DRY-RUN' if args.dry_run else 'CANLI'}")
    print(f"{'='*62}")
    print(f"  Model               : {MODEL}")
    print(f"  GERÇEK FARK         : {len(gercek_fark)}")
    print(f"  Diğer (varsayılan)  : {len(diger)}")
    print(f"  Batch boyutu        : {BATCH_SIZE}")

    # ── 1. Varsayılan mesajları yaz ───────────────────────────────────────────
    print(f"\n── Aşama 1: Varsayılan mesajlar ({len(diger)} ayet)")
    varsayilan_guncellemeler = [
        (r["verse_key"], VARSAYILAN.get(r["fark_turu"], "—"))
        for r in diger
    ]
    n_varsayilan = db_guncelle(conn, varsayilan_guncellemeler, args.dry_run)
    print(f"   Yazılan: {n_varsayilan}")

    if args.sadece_varsayilan:
        conn.close()
        print("\n  Sadece varsayılan modunda çıkılıyor.")
        return

    # ── 2. GERÇEK FARK — Gemini ile analiz ───────────────────────────────────
    if args.sifirla and CHECKPOINT.exists():
        CHECKPOINT.unlink()
        print("  Checkpoint sıfırlandı.")
    tamamlananlar = ckpt_yukle()
    bekleyen = [r for r in gercek_fark if r["verse_key"] not in tamamlananlar]

    print(f"\n── Aşama 2: Gemini analizi ({len(bekleyen)} ayet kaldı)")
    batch_sayisi = (len(bekleyen) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"   Batch sayısı: {batch_sayisi}")

    islenen = hata_sayac = toplam_guncellenen = 0

    for batch_no, baslangic in enumerate(range(0, len(bekleyen), BATCH_SIZE), 1):
        batch_satirlar = bekleyen[baslangic : baslangic + BATCH_SIZE]
        batch_keys     = [r["verse_key"] for r in batch_satirlar]

        veri_map = verileri_yukle(conn, batch_keys)

        batch_veriler = [
            {
                "verse_key": vk,
                **veri_map.get(vk, {"literal": "", "meal": "", "kokler": "—"}),
            }
            for vk in batch_keys
        ]

        print(f"\n  Batch {batch_no:>3}/{batch_sayisi}  "
              f"[{batch_keys[0]} – {batch_keys[-1]}]  ({len(batch_keys)} ayet)")

        try:
            sonuclar = gemini_batch(client, batch_veriler)
        except Exception as e:
            print(f"    ✗ Hata: {e}")
            hata_sayac += 1
            time.sleep(4)
            continue

        guncellemeler = [(s.verse_key, s.analiz) for s in sonuclar]
        n = db_guncelle(conn, guncellemeler, args.dry_run)
        toplam_guncellenen += n
        islenen += len(batch_keys)

        for s in sonuclar:
            tamamlananlar.add(s.verse_key)
        ckpt_kaydet(tamamlananlar)

        # İlk sonucu göster
        if sonuclar:
            ornek = sonuclar[0]
            print(f"    {ornek.verse_key}: {ornek.analiz[:120].replace(chr(10), ' ')}")

        time.sleep(ARALIK_SN)

    conn.close()

    # ── Özet ─────────────────────────────────────────────────────────────────
    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  Varsayılan mesaj yazılan : {n_varsayilan}")
    print(f"  Gemini analiz yapılan    : {islenen}/{len(bekleyen)}")
    print(f"  Güncellenen toplam       : {toplam_guncellenen + n_varsayilan}")
    print(f"  API hatası               : {hata_sayac}")
    print(f"  Mod                      : {'DRY-RUN' if args.dry_run else 'Kaydedildi'}")
    print()


if __name__ == "__main__":
    main()
