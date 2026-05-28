#!/usr/bin/env python3
"""
gTTS (Google Translate TTS) ile Elif-Ba harf sesleri üretir.
Her harf için: public/audio/elifba/harf_{harf_id:02d}.mp3

Kurulum:
  pip install gtts
  python generate_elifba_audio.py

Not: İnternet bağlantısı gereklidir. Ücretiz, Google AI Studio kredisi kullanmaz.
"""
import sqlite3
import sys
import time
from pathlib import Path

ROOT    = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "app.db"
OUT_DIR = ROOT / "apps" / "web" / "public" / "audio" / "elifba"

# Arapça harf adları — gTTS Arapça TTS için en doğal ses
ARABIC_NAMES: dict[int, str] = {
    1:  "الألف",        # Elif
    2:  "الباء",        # Be
    3:  "التاء",        # Te
    4:  "الثاء",        # Se
    5:  "الجيم",        # Cim
    6:  "الحاء",        # Ha
    7:  "الخاء",        # Hı
    8:  "الدال",        # Dal
    9:  "الذال",        # Zel
    10: "الراء",        # Ra
    11: "الزاي",        # Ze
    12: "السين",        # Sin
    13: "الشين",        # Şın
    14: "الصاد",        # Sad
    15: "الضاد",        # Dad
    16: "الطاء",        # Tı
    17: "الظاء",        # Zı
    18: "العين",        # Ayn
    19: "الغين",        # Ğayn
    20: "الفاء",        # Fe
    21: "القاف",        # Kaf
    22: "الكاف",        # Kef
    23: "اللام",        # Lam
    24: "الميم",        # Mim
    25: "النون",        # Nun
    26: "الواو",        # Vav
    27: "الهاء",        # He
    28: "الياء",        # Ye
    29: "لام ألف",      # Lamelif
}


def load_harfler() -> list[dict]:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    rows = db.execute(
        "SELECT harf_id, harf_adi, tek_basina FROM elifba_harfler ORDER BY harf_id"
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


def progress_bar(current: int, total: int, width: int = 30) -> str:
    filled = int(width * current / total)
    bar = "#" * filled + "-" * (width - filled)
    pct = int(100 * current / total)
    return f"[{bar}] {pct:3d}% ({current}/{total})"


def main() -> None:
    try:
        from gtts import gTTS
    except ImportError:
        print("Hata: gtts paketi eksik.")
        print("Kur: pip install gtts")
        sys.exit(1)

    harfler = load_harfler()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total      = len(harfler)
    created    = 0
    skipped    = 0
    failed     = 0
    total_bytes = 0

    print(f"Elif-Ba ses uretimi basliyor — {total} harf")
    print(f"Cikti: {OUT_DIR}\n")

    for i, h in enumerate(harfler, 1):
        harf_id  = h["harf_id"]
        harf_adi = h["harf_adi"]
        out_path = OUT_DIR / f"harf_{harf_id:02d}.mp3"

        bar = progress_bar(i - 1, total)
        print(f"\r{bar}  {harf_adi:<12}", end="", flush=True)

        if out_path.exists():
            skipped += 1
            total_bytes += out_path.stat().st_size
            continue

        arabic_text = ARABIC_NAMES.get(harf_id, h["tek_basina"])

        retry = 0
        while retry < 3:
            try:
                tts = gTTS(text=arabic_text, lang="ar", slow=True)
                tts.save(str(out_path))
                size = out_path.stat().st_size
                created    += 1
                total_bytes += size
                break
            except Exception as exc:
                retry += 1
                if retry >= 3:
                    print(f"\n  HATA harf_id={harf_id} ({harf_adi}): {exc}")
                    failed += 1
                else:
                    time.sleep(1.5)

        # Rate-limit: Google Translate aşırı hızlı istekte 429 döner
        time.sleep(0.4)

    bar = progress_bar(total, total)
    print(f"\r{bar}  Tamamlandi", flush=True)

    kb = total_bytes / 1024
    mb = kb / 1024
    size_str = f"{mb:.1f} MB" if mb >= 1 else f"{kb:.0f} KB"

    print(f"""
--- Ozet ---
Olusturulan : {created}
Atlanan     : {skipped} (zaten mevcut)
Hata        : {failed}
Toplam dosya: {created + skipped}
Toplam boyut: {size_str}
Konum       : {OUT_DIR}
""")


if __name__ == "__main__":
    main()
