"""
KuranappKorunma.txt → verse_tag_items tablosuna korunma etiketlerini aktarır.

Kullanım (proje kökünden):
  python scripts/import_korunma_tags.py
  python scripts/import_korunma_tags.py --txt "C:/path/to/KuranappKorunma.txt"
  python scripts/import_korunma_tags.py --dry-run
"""

import argparse
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH      = PROJECT_ROOT / "data" / "app.db"
TXT_DEFAULT  = PROJECT_ROOT / "KuranappKorunma.txt"

KATEGORI_MAP: list[tuple[str, str]] = []

DDL = """
CREATE TABLE IF NOT EXISTS verse_tag_items (
    verse_key TEXT NOT NULL,
    tag       TEXT NOT NULL,
    isim      TEXT,
    aciklama  TEXT,
    PRIMARY KEY (verse_key, tag)
);
CREATE INDEX IF NOT EXISTS idx_vti_tag       ON verse_tag_items(tag);
CREATE INDEX IF NOT EXISTS idx_vti_verse_key ON verse_tag_items(verse_key);
"""

MIGRATE_SQL = [
    "ALTER TABLE verse_tag_items ADD COLUMN isim     TEXT",
    "ALTER TABLE verse_tag_items ADD COLUMN aciklama TEXT",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_vti ON verse_tag_items(verse_key, tag)",
]

INSERT_SQL = """
INSERT INTO verse_tag_items (verse_key, tag, isim, aciklama) VALUES (?, ?, ?, ?)
ON CONFLICT(verse_key, tag) DO UPDATE SET
    isim     = COALESCE(excluded.isim,     isim),
    aciklama = COALESCE(excluded.aciklama, aciklama)
"""

_VERSE_RE = re.compile(r"^(\d{1,3}):(\d{1,3})(?:-\d+)?$")

_SLUG_TABLE = str.maketrans({
    "ı": "i", "İ": "i",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
    "ö": "o", "Ö": "o",
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
})


def normalize_tag(tag: str) -> str:
    return tag.translate(_SLUG_TABLE)


def normalize_verse_key(raw: str) -> str | None:
    raw = re.sub(r"\(.*?\)", "", raw).strip()
    raw = raw.split(",")[0].strip()
    m = _VERSE_RE.match(raw)
    if not m:
        return None
    surah, ayah = int(m.group(1)), int(m.group(2))
    if surah < 1 or surah > 114 or ayah < 1:
        return None
    return f"{surah}:{ayah}"


_ISIM_RE = re.compile(r"\(([^)]+)\)")


def extract_isim(raw_ref: str) -> str | None:
    m = _ISIM_RE.search(raw_ref)
    return m.group(1).strip() if m else None


def parse_txt(path: Path) -> list[tuple[str, str, str | None, str | None]]:
    seen: set[tuple[str, str]] = set()
    rows: list[tuple[str, str, str | None, str | None]] = []
    skipped = 0

    with open(path, encoding="utf-8") as f:
        for _lineno, raw in enumerate(f, 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "→" not in line:
                continue

            parts = [p.strip() for p in line.split("→")]
            if len(parts) < 2:
                continue

            verse_key = normalize_verse_key(parts[0])
            if not verse_key:
                skipped += 1
                continue

            tag = normalize_tag(parts[1].strip())
            if not tag.startswith("korunma-"):
                skipped += 1
                continue

            isim     = extract_isim(parts[0])
            aciklama = parts[2].strip() if len(parts) >= 3 else None

            pair = (verse_key, tag)
            if pair not in seen:
                seen.add(pair)
                rows.append((verse_key, tag, isim, aciklama))

    if skipped:
        print(f"  Atlandı (parse edilemeyen satır): {skipped}")

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="KuranappKorunma.txt → verse_tag_items")
    parser.add_argument("--txt",     type=Path, default=TXT_DEFAULT, help="Txt dosyası yolu")
    parser.add_argument("--db",      type=Path, default=DB_PATH,     help="SQLite DB yolu")
    parser.add_argument("--dry-run", action="store_true",            help="Ekleme yapmadan raporla")
    args = parser.parse_args()

    if not args.txt.exists():
        print(f"[HATA] Txt dosyası bulunamadı: {args.txt}")
        sys.exit(1)
    if not args.db.exists():
        print(f"[HATA] Veritabanı bulunamadı: {args.db}")
        sys.exit(1)

    print(f"Kaynak : {args.txt}")
    print(f"Hedef  : {args.db}")
    if args.dry_run:
        print("[DRY-RUN modu — DB'ye yazılmayacak]")
    print()

    records = parse_txt(args.txt)
    print(f"Parse edilen toplam çift : {len(records)}")

    from collections import Counter
    tag_count = Counter(tag for _, tag, *_ in records)
    for tag, n in sorted(tag_count.items()):
        print(f"  {tag:<35} {n} adet")
    print()

    if args.dry_run:
        for vk, tag, isim, aciklama in records[:5]:
            print(f"  [{vk}] {tag} | isim={isim!r} | acik={str(aciklama)[:50]}")
        print("Dry-run tamamlandı. DB'ye dokunulmadı.")
        return

    con = sqlite3.connect(args.db)
    try:
        con.executescript(DDL)
        for sql in MIGRATE_SQL:
            try:
                con.execute(sql)
            except sqlite3.OperationalError:
                pass

        before: int = con.execute(
            "SELECT COUNT(*) FROM verse_tag_items WHERE tag LIKE 'korunma-%'"
        ).fetchone()[0]

        con.executemany(INSERT_SQL, records)
        con.commit()

        after: int = con.execute(
            "SELECT COUNT(*) FROM verse_tag_items WHERE tag LIKE 'korunma-%'"
        ).fetchone()[0]

        added = after - before
        print(f"Eklenen/güncellenen korunma kaydı : {added if added else len([r for r in records if r[1].startswith('korunma-')])}")
        print(f"Toplam korunma kaydı (DB)          : {after}")
        total: int = con.execute("SELECT COUNT(*) FROM verse_tag_items").fetchone()[0]
        print(f"verse_tag_items toplam             : {total}")

    except sqlite3.Error as e:
        print(f"[DB HATASI] {e}")
        con.rollback()
        sys.exit(1)
    finally:
        con.close()

    print()
    print("✓ Tamamlandı.")


if __name__ == "__main__":
    main()
