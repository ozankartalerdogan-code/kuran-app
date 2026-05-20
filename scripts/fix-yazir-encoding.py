"""
Elmalılı H. Yazır meali encoding hatalarını temiz kaynaktan düzelt.

Sorunlar (app.db translations tablosunda, source='yazir'):
  1. ğ/Ğ düşmüş   : "topluluun"  → "topluluğun"
  2. Ş → ^         : "^imdi"      → "Şimdi"
  3. ı → 1 (rakam): "Allah'1"    → "Allah'ı"

Temiz kaynak: data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/tr.yazir.json
Hedef DB    : data/app.db  (translations WHERE source='yazir')
"""

import json
import sqlite3
import sys
from pathlib import Path

CLEAN_SOURCE = Path(
    "data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/tr.yazir.json"
)
APP_DB = Path("data/app.db")

sys.stdout.reconfigure(encoding="utf-8")


def load_clean_source() -> dict[str, str]:
    data = json.loads(CLEAN_SOURCE.read_text(encoding="utf-8"))
    return {
        f"{v['chapter']}:{v['verse']}": v["text"]
        for v in data["quran"]
    }


def main(dry_run: bool = False) -> None:
    clean = load_clean_source()
    print(f"Temiz kaynak yüklendi: {len(clean)} ayet")

    conn = sqlite3.connect(APP_DB)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT verse_key, text FROM translations WHERE source='yazir' ORDER BY verse_key"
    )
    rows = cursor.fetchall()
    print(f"DB'deki yazir ayetleri: {len(rows)}")

    updates: list[tuple[str, str]] = []   # (clean_text, verse_key)
    for verse_key, db_text in rows:
        clean_text = clean.get(verse_key)
        if clean_text is None:
            print(f"  UYARI: {verse_key} temiz kaynakta yok, atlandı")
            continue
        if db_text != clean_text:
            updates.append((clean_text, verse_key))

    print(f"\nDüzeltilecek ayet sayısı: {len(updates)}")

    if dry_run:
        print("\n[DRY RUN] İlk 20 değişiklik:")
        for clean_text, vk in updates[:20]:
            old = dict(rows)[vk]
            print(f"  {vk}")
            print(f"    ESKİ: {old[:90]}")
            print(f"    YENİ: {clean_text[:90]}")
            print()
        print("[DRY RUN] Veritabanı değiştirilmedi.")
        conn.close()
        return

    # Apply updates
    cursor.executemany(
        "UPDATE translations SET text = ? WHERE source = 'yazir' AND verse_key = ?",
        updates,
    )
    print(f"UPDATE tamamlandı: {cursor.rowcount} satır etkilendi")

    # Rebuild FTS if present
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ayet_fts'"
    )
    if cursor.fetchone():
        print("FTS tablosu tespit edildi, yeniden indexleniyor…")
        # ayet_fts içeriğini yaz → rebuild
        # Sütun düzenini bul
        cursor.execute("PRAGMA table_info(ayet_fts)")
        fts_cols = [row[1] for row in cursor.fetchall() if row[1] not in ("sure", "ayet")]
        print(f"  FTS sütunları: {fts_cols}")

        # FTS5 external content tablosu değil: doğrudan DELETE + INSERT gerek
        # Sadece güncellenen ayetleri yenile
        cursor.execute("PRAGMA table_info(verses)")
        verses_cols = [row[1] for row in cursor.fetchall()]

        # FTS rebuild yap (tüm tabloyu yeniden yaz)
        cursor.execute("INSERT INTO ayet_fts(ayet_fts) VALUES('rebuild')")
        print("  FTS rebuild tamamlandı")

    conn.commit()
    conn.close()
    print(f"\nTamamlandı. {len(updates)} ayet güncellendi → {APP_DB}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Yazır meali encoding düzeltici")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Değişiklikleri göster ama kaydetme",
    )
    args = parser.parse_args()
    main(dry_run=args.dry_run)
