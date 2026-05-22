"""
Tüm ayetlerin transliterasyonunu Gemini 2.5 Flash ile Türkçe okunuşa çevirir.

Çıktı: data/normalized/reading_tr.json  →  {"1:1": "Bismillahirrahmanirrahim", ...}
Checkpoint: data/reading_tr_checkpoint.json  (kesintide kaldığı yerden devam)

Kullanım:
  python scripts/generate-reading-tr.py
  python scripts/generate-reading-tr.py --batch-size 15
  python scripts/generate-reading-tr.py --sifirla        # checkpoint sil, baştan başla
  python scripts/generate-reading-tr.py --dry-run        # API çağrısı yapmadan test
"""

import json, os, sys, time, argparse
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

TRANSLATIONS_JSON = Path(__file__).parent.parent / "data" / "normalized" / "translations.json"
OUTPUT_JSON       = Path(__file__).parent.parent / "data" / "normalized" / "reading_tr.json"
CHECKPOINT        = Path(__file__).parent.parent / "data" / "reading_tr_checkpoint.json"
MODEL             = "gemini-2.5-flash"
ARALIK_SN         = 2.0   # istek arası bekleme (saniye)

SYSTEM_PROMPT = """\
Sen Kuran transliterasyon uzmanısın. Sana verilen İngilizce fonetik \
transliterasyonları doğal Türkçe okunuş formatına çeviriyorsun.

Dönüşüm kuralları:
- AA → ayın harfi, Türkçe okunuşta atılır veya yumuşatılır (örn. naAAbudu → nabudu)
- sh → ş  (örn. sharri → şerri)
- kh → h  (örn. khusrin → husrin)
- th → s  (örn. allatheena → ellezine)
- gh → g  (örn. ghayri → gayri)
- q → k   (örn. qul → kul)
- oo → u  (örn. yooladu → yuladu)
- ee → i  (örn. alrraheemi → errahimi)
- wa kelime başında bağlaç → "ve" (örn. waiyyaka → ve iyyake)
- diğer w → v  (örn. hawl → havl)
- Güneş harfi asimilasyonu: al + güneş harfi → o harfin şeddeli hali
  (örn. alrrahmani → errahmani, alnnasi → ennasi, alddaallin → eddaallin)
- Tanınmış ibareleri standart Türkçe formda yaz (örn. Bismillahirrahmanirrahim)

Sadece Türkçe okunuşu döndür, hiç açıklama yapma."""


def yukle_checkpoint() -> dict:
    if CHECKPOINT.exists():
        with open(CHECKPOINT, encoding="utf-8") as f:
            return json.load(f)
    return {}


def kaydet_checkpoint(sonuclar: dict):
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        json.dump(sonuclar, f, ensure_ascii=False)


def cevir_batch(client, batch: list[tuple[str, str]]) -> dict[str, str]:
    """batch: [(verse_key, transliteration), ...] → {verse_key: reading_tr}"""
    satirlar = "\n".join(
        f"{i+1}. {translit}"
        for i, (_, translit) in enumerate(batch)
    )
    prompt = (
        f"Aşağıdaki {len(batch)} transliterasyonu sırasıyla Türkçe okunuşa çevir.\n"
        "Her satırı '1. ...', '2. ...' formatında döndür, başka hiçbir şey yazma.\n\n"
        f"{satirlar}"
    )
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.05,
        max_output_tokens=1024,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )
    resp = client.models.generate_content(model=MODEL, contents=prompt, config=config)
    text = (resp.text or "").strip()

    sonuclar: dict[str, str] = {}
    satirlar_cikti = text.splitlines()
    idx = 0
    for satir in satirlar_cikti:
        satir = satir.strip()
        if not satir:
            continue
        # "1. ..." veya "1) ..." formatını parse et
        for sep in (". ", ") ", "- "):
            if satir[0].isdigit() and sep in satir:
                num_str, _, rest = satir.partition(sep)
                try:
                    num = int(num_str.strip())
                    if 1 <= num <= len(batch):
                        verse_key = batch[num - 1][0]
                        sonuclar[verse_key] = rest.strip()
                except ValueError:
                    pass
                break
        else:
            # Numara yoksa sırayla ata
            if idx < len(batch):
                verse_key = batch[idx][0]
                sonuclar[verse_key] = satir
                idx += 1

    return sonuclar


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=20, help="Tek istekte kaç ayet (varsayılan: 20)")
    parser.add_argument("--sifirla", action="store_true", help="Checkpoint'i sil ve baştan başla")
    parser.add_argument("--dry-run", action="store_true", help="API çağrısı yapmadan simüle et")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key and not args.dry_run:
        print("HATA: GEMINI_API_KEY veya GOOGLE_API_KEY .env.local'da bulunamadı.")
        sys.exit(1)

    client = genai.Client(api_key=api_key) if api_key else None

    # Transliterasyon verisini yükle
    with open(TRANSLATIONS_JSON, encoding="utf-8") as f:
        data = json.load(f)

    ayetler = [
        (f"{r['surahId']}:{r['ayahNumber']}", r["transliteration"])
        for r in data
        if r.get("transliteration") and r.get("transliterationStatus") == "available"
    ]
    print(f"Toplam ayet: {len(ayetler)}")

    # Checkpoint sıfırla
    if args.sifirla and CHECKPOINT.exists():
        CHECKPOINT.unlink()
        print("Checkpoint silindi.")

    sonuclar = yukle_checkpoint()
    bekleyen = [(k, t) for k, t in ayetler if k not in sonuclar]
    print(f"Tamamlanan: {len(sonuclar)} | Bekleyen: {len(bekleyen)}")

    if not bekleyen:
        print("Tüm ayetler zaten tamamlanmış.")
    else:
        batch_size = args.batch_size
        toplam_batch = (len(bekleyen) + batch_size - 1) // batch_size

        for batch_no, start in enumerate(range(0, len(bekleyen), batch_size), 1):
            batch = bekleyen[start : start + batch_size]
            print(f"[{batch_no}/{toplam_batch}] {batch[0][0]} ... {batch[-1][0]}", end=" ", flush=True)

            if args.dry_run:
                for key, translit in batch:
                    sonuclar[key] = f"[DRY-RUN] {translit[:40]}"
                print("(dry-run)")
            else:
                basari = False
                for deneme in range(3):
                    try:
                        batch_sonuc = cevir_batch(client, batch)
                        eksik = [k for k, _ in batch if k not in batch_sonuc]
                        if eksik:
                            print(f"UYARI: {len(eksik)} ayet parse edilemedi: {eksik[:3]}")
                        sonuclar.update(batch_sonuc)
                        basari = True
                        break
                    except Exception as e:
                        bekle = ARALIK_SN * (2 ** deneme)
                        print(f"HATA ({deneme+1}/3): {e} — {bekle:.0f}s bekleniyor")
                        time.sleep(bekle)

                if not basari:
                    print(f"ATLANDΙ: batch {batch_no} başarısız oldu.")

                kaydet_checkpoint(sonuclar)
                print(f"ok ({len(sonuclar)}/{len(ayetler)})")
                if batch_no < toplam_batch:
                    time.sleep(ARALIK_SN)

    # Çıktı dosyasını yaz
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(sonuclar, f, ensure_ascii=False, indent=2)
    print(f"\nTamamlandi! {len(sonuclar)} ayet -> {OUTPUT_JSON}")

    # Checkpoint'i temizle
    if CHECKPOINT.exists() and len(sonuclar) == len(ayetler):
        CHECKPOINT.unlink()
        print("Checkpoint temizlendi.")


if __name__ == "__main__":
    main()
