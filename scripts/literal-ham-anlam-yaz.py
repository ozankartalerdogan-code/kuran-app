"""
literal_ceviri sütununu words tablosundaki meaning_tr değerlerinin
sıralı birleşimiyle (ham anlam özeti) günceller. API kullanılmaz.

Kullanım:
  python scripts/literal-ham-anlam-yaz.py
  python scripts/literal-ham-anlam-yaz.py --dry-run
  python scripts/literal-ham-anlam-yaz.py --surah 2
"""

import sqlite3, sys, argparse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).parent.parent / "data" / "app.db"


def ingilizce_mi(text: str) -> bool:
    import re
    return bool(re.search(
        r"\b(the|and|of|to|in|a|an|is|are|was|were|for|on|with|at|by|from)\b",
        text, re.IGNORECASE
    ))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--surah",   type=int, default=None)
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Tüm kelimeleri verse_key + sırasına göre çek
    sorgu = """
        SELECT w.verse_key, w.meaning_tr
        FROM words w
        JOIN verses v ON w.verse_key = v.verse_key
        WHERE w.meaning_tr IS NOT NULL AND TRIM(w.meaning_tr) != ''
    """
    params: list = []
    if args.surah:
        sorgu += " AND v.surah_id = ?"
        params.append(args.surah)
    sorgu += " ORDER BY w.verse_key, w.word_index"

    cur.execute(sorgu, params)

    # verse_key → [meaning_tr, ...] biriktir
    from collections import defaultdict
    anlam_harita: dict[str, list[str]] = defaultdict(list)
    for verse_key, meaning_tr in cur.fetchall():
        if not ingilizce_mi(meaning_tr):
            anlam_harita[verse_key].append(meaning_tr)

    toplam = len(anlam_harita)
    print(f"\n{'='*55}")
    print(f"  HAM ANLAM → literal_ceviri")
    print(f"{'='*55}")
    print(f"  Güncellenecek ayet : {toplam}")
    print(f"  Mod                : {'DRY-RUN' if args.dry_run else 'CANLI'}")

    # Örnek göster
    ornekler = list(anlam_harita.items())[:3]
    print(f"\n  Örnek çıktılar:")
    for vk, anlamlar in ornekler:
        print(f"  {vk:<8}  {' '.join(anlamlar)[:80]}")

    if args.dry_run:
        print("\n  (DRY-RUN — DB'ye yazılmadı)")
        conn.close()
        return

    # Güncelle
    guncellenen = 0
    for verse_key, anlamlar in anlam_harita.items():
        ham = " ".join(anlamlar)
        cur.execute(
            "UPDATE verses SET literal_ceviri = ? WHERE verse_key = ?",
            (ham, verse_key)
        )
        guncellenen += cur.rowcount

    conn.commit()
    conn.close()

    print(f"\n  Güncellenen : {guncellenen} ayet")
    print(f"  ✓ Tamamlandı")
    print()


if __name__ == "__main__":
    main()
