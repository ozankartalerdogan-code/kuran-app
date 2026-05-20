"""
diyanet, bulac, vakfi meal encoding düzeltici.

Sorun: data/normalized/translations.json ve data/app.db'deki bu üç kaynak
       encoding bozuk (ı→1, ğ düşmüş vb.)

Temiz kaynak: data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/
  tr.diyanet.json, tr.bulac.json, tr.vakfi.json
"""

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

EXT_BASE = Path(
    "data/quran/external/Kuran/Kuran-Rehberi-main/data/translations"
)
NORMALIZED = Path("data/normalized/translations.json")
APP_DB = Path("data/app.db")

SOURCES = {
    "diyanet": EXT_BASE / "tr.diyanet.json",
    "bulac":   EXT_BASE / "tr.bulac.json",
    "vakfi":   EXT_BASE / "tr.vakfi.json",
}


def load_clean(path: Path) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        f"{v['chapter']}:{v['verse']}": v["text"]
        for v in data["quran"]
    }


def fix_normalized(clean_maps: dict[str, dict[str, str]], dry_run: bool) -> int:
    data = json.loads(NORMALIZED.read_text(encoding="utf-8"))
    changed = 0

    for record in data:
        vk = f"{record['surahId']}:{record['ayahNumber']}"
        for t in record.get("translations", []):
            src = t["source"]
            if src not in clean_maps:
                continue
            clean_text = clean_maps[src].get(vk)
            if clean_text is None:
                continue
            if t["text"] != clean_text:
                if not dry_run:
                    t["text"] = clean_text
                changed += 1

    if not dry_run:
        NORMALIZED.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
    return changed


def fix_appdb(clean_maps: dict[str, dict[str, str]], dry_run: bool) -> int:
    conn = sqlite3.connect(APP_DB)
    cursor = conn.cursor()
    updates = []

    for src, clean in clean_maps.items():
        cursor.execute(
            "SELECT verse_key, text FROM translations WHERE source=?", (src,)
        )
        for verse_key, db_text in cursor.fetchall():
            clean_text = clean.get(verse_key)
            if clean_text and db_text != clean_text:
                updates.append((clean_text, src, verse_key))

    if not dry_run and updates:
        cursor.executemany(
            "UPDATE translations SET text=? WHERE source=? AND verse_key=?",
            updates,
        )
        cursor.execute("INSERT INTO ayet_fts(ayet_fts) VALUES('rebuild')")
        conn.commit()

    conn.close()
    return len(updates)


def main(dry_run: bool = False) -> None:
    clean_maps = {}
    for src, path in SOURCES.items():
        clean_maps[src] = load_clean(path)
        print(f"{src}: {len(clean_maps[src])} temiz ayet yüklendi ({path.name})")

    norm_changed = fix_normalized(clean_maps, dry_run)
    db_changed = fix_appdb(clean_maps, dry_run)

    tag = "[DRY RUN] " if dry_run else ""
    print(f"\n{tag}translations.json: {norm_changed} ayet güncellendi")
    print(f"{tag}app.db: {db_changed} ayet güncellendi")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    main(dry_run=args.dry_run)
