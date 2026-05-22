"""
Hatalı literal çevirileri Gemini 2.5 Flash ile düzeltir.

Kullanım:
  python scripts/fix_literal.py
  python scripts/fix_literal.py --dry-run
  python scripts/fix_literal.py --limit 50
  python scripts/fix_literal.py --sadece FIIL_YOK
  python scripts/fix_literal.py --sifirla
"""

import csv, os, sys, json, time, argparse
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel
from tqdm import tqdm

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

INPUT_CSV  = Path("data/manuel_mudahale_gerekli.csv")
OUTPUT_CSV = Path("data/duzeltilmis_literal.csv")
MODEL      = "gemini-2.5-flash"
KAYIT_ARALI = 10
ARALIK_SN   = 0.5

SYSTEM = """\
Sen uzman bir Kur'an çevirmenisin. Görevin, sana verilen hatalı çeviriyi düzeltip, \
ayetin %100 Literal (Harfiyen) Çevirisini yapmaktır.
KESİN KURALLAR:
CÜMLE BÜTÜNLÜĞÜ: Kelimeleri sözlük gibi peş peşe dizme. Çevirin MUTLAKA kurallı \
bir Türkçe fiil/yüklem ile bitmelidir (Örn: yaptı, eder, kılar, hükmeder).
TEFSİR YASAK: Parantez içi açıklama (), [] kullanma. Orijinal Arapça metinde \
olmayan hiçbir kelimeyi ekleme.
EKSİKSİZ ÇEVİRİ: Ayetteki hiçbir kelimeyi atlama.
KÖK HASSASİYETİ: Özellikle Kavl (dedi, der) ve Kavm (topluluk, kavim) köklerini \
bağlamına en uygun literal haliyle çevir.
SADELİK: Gereksiz yere arka arkaya virgüller kullanma.\
"""

OUTPUT_FIELDS = [
    "verse_key", "yeni_literal", "eski_literal",
    "hata_turleri", "meal_referans",
]


class LiteralDuzeltme(BaseModel):
    verse_key: str
    yeni_literal: str


# ── Checkpoint ────────────────────────────────────────────────────────────────

def ckpt_yukle() -> dict[str, str]:
    """verse_key → yeni_literal sözlüğü olarak döner."""
    if not OUTPUT_CSV.exists():
        return {}
    with open(OUTPUT_CSV, encoding="utf-8-sig") as f:
        return {r["verse_key"]: r["yeni_literal"] for r in csv.DictReader(f)}


def ckpt_kaydet(tamamlananlar: list[dict]) -> None:
    mode = "w"
    with open(OUTPUT_CSV, mode, newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        w.writeheader()
        w.writerows(tamamlananlar)


# ── Gemini çağrısı ────────────────────────────────────────────────────────────

def gemini_duzelt(
    client: genai.Client,
    config: types.GenerateContentConfig,
    verse_key: str,
    literal_mevcut: str,
    meal_referans: str,
) -> LiteralDuzeltme:
    prompt = (
        f"Ayet No: {verse_key}\n"
        f"Referans Meal: {meal_referans} (Sadece bağlamı anla, aynısını yazma!)\n"
        f"Senin Önceki Hatalı Çevirin: {literal_mevcut}\n"
        "Lütfen kurallara uyarak sadece yeni literal çeviriyi JSON olarak ver."
    )
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    if not resp.text:
        raise ValueError("Gemini boş yanıt döndürdü.")
    data = json.loads(resp.text)
    if isinstance(data, list):
        data = data[0]
    return LiteralDuzeltme(**data)


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",  action="store_true", help="DB/CSV'ye yazma")
    parser.add_argument("--limit",    type=int, default=None, help="Kaç ayet işlensin")
    parser.add_argument("--sadece",   type=str, default=None, help="Hata türü filtresi (örn: FIIL_YOK)")
    parser.add_argument("--sifirla",  action="store_true", help="Checkpoint sil ve baştan başla")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr)
        sys.exit(1)

    if not INPUT_CSV.exists():
        print(f"HATA: {INPUT_CSV} bulunamadı.", file=sys.stderr)
        sys.exit(1)

    # Girdi CSV'yi oku
    with open(INPUT_CSV, encoding="utf-8-sig") as f:
        tum_satirlar = list(csv.DictReader(f))

    # Filtrele: KONTROL_GEREKLI olmayanlar (gerçek hatalılar)
    satirlar = [
        r for r in tum_satirlar
        if r.get("hata_turleri", "").strip()
        and r.get("hata_turleri", "").strip() != "KONTROL_GEREKLI"
    ]

    # Hata türü filtresi
    if args.sadece:
        satirlar = [r for r in satirlar if args.sadece.upper() in r["hata_turleri"].upper()]

    # Limit
    if args.limit:
        satirlar = satirlar[:args.limit]

    # Checkpoint
    if args.sifirla and OUTPUT_CSV.exists():
        OUTPUT_CSV.unlink()
        print("  Checkpoint sıfırlandı.")

    tamamlananlar_map = ckpt_yukle()
    bekleyen = [r for r in satirlar if r["verse_key"] not in tamamlananlar_map]

    # Tamamlananları başlangıç listesine al
    tamamlananlar: list[dict] = [
        {
            "verse_key":    vk,
            "yeni_literal": yeni,
            "eski_literal": "",
            "hata_turleri": "",
            "meal_referans": "",
        }
        for vk, yeni in tamamlananlar_map.items()
    ]

    print(f"\n{'='*62}")
    print(f"  LİTERAL DÜZELTİCİ  |  {'DRY-RUN' if args.dry_run else 'CANLI'}")
    print(f"{'='*62}")
    print(f"  Model             : {MODEL}")
    print(f"  Toplam hatalı     : {len(satirlar)}")
    print(f"  Önceden tamamlanan: {len(tamamlananlar_map)}")
    print(f"  İşlenecek (bekl.) : {len(bekleyen)}")
    if args.sadece:
        print(f"  Filtre            : {args.sadece}")
    print()

    if not bekleyen:
        print("  Tüm ayetler zaten tamamlanmış.")
        return

    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        temperature=0.1,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=LiteralDuzeltme,
    )

    hata_sayac = 0
    kayit_sayac = 0

    for row in tqdm(bekleyen, desc="Düzeltiliyor", unit="ayet", ncols=80):
        vk      = row["verse_key"]
        literal = row.get("literal_mevcut", "")
        meal    = row.get("meal_referans", "")
        hatalar = row.get("hata_turleri", "")

        try:
            sonuc = gemini_duzelt(client, config, vk, literal, meal)
        except Exception as e:
            tqdm.write(f"  ✗ {vk} hata: {e}")
            hata_sayac += 1
            time.sleep(3)
            continue

        tamamlananlar.append({
            "verse_key":    sonuc.verse_key,
            "yeni_literal": sonuc.yeni_literal,
            "eski_literal": literal[:120],
            "hata_turleri": hatalar,
            "meal_referans": meal[:120],
        })

        tqdm.write(f"  ✓ {vk}: {sonuc.yeni_literal[:70]}")

        kayit_sayac += 1
        if kayit_sayac % KAYIT_ARALI == 0 and not args.dry_run:
            ckpt_kaydet(tamamlananlar)

        time.sleep(ARALIK_SN)

    # Son kayıt
    if not args.dry_run:
        ckpt_kaydet(tamamlananlar)

    # ── Özet ─────────────────────────────────────────────────────────────────
    islenen = len(bekleyen) - hata_sayac
    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  İşlenen          : {islenen}/{len(bekleyen)}")
    print(f"  Hata             : {hata_sayac}")
    print(f"  Toplam CSV satır : {len(tamamlananlar)}")
    print(f"  Çıktı            : {OUTPUT_CSV}")
    print(f"  Mod              : {'DRY-RUN' if args.dry_run else 'Kaydedildi'}")
    print()


if __name__ == "__main__":
    main()
