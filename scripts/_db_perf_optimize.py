"""
DB performans optimizasyonları:
  1. FTS5 tokenizer: remove_diacritics 1 → 2 (Türkçe â/î/û desteği)
  2. verse_tag_items junction tablosu (json_each full scan yerine index lookup)
  3. WAL checkpoint + PRAGMA tuning

Kullanım:
  python scripts/_db_perf_optimize.py
  python scripts/_db_perf_optimize.py --dry-run
"""

import sqlite3, sys, argparse, time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB = Path("data/app.db")

parser = argparse.ArgumentParser()
parser.add_argument("--dry-run", action="store_true")
args = parser.parse_args()

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

# ── 1. FTS5 yeniden oluştur (remove_diacritics 2) ────────────────────────────

print("1. FTS5 tokenizer güncelleniyor (remove_diacritics 1 → 2)...")
old_tok = conn.execute(
    "SELECT sql FROM sqlite_master WHERE name='ayet_fts'"
).fetchone()
print(f"   Mevcut: {old_tok[0][:100] if old_tok else 'yok'}")

if not args.dry_run:
    # Drop + recreate
    conn.execute("DROP TABLE IF EXISTS ayet_fts")
    conn.execute("""
        CREATE VIRTUAL TABLE ayet_fts USING fts5(
            verse_key   UNINDEXED,
            surah_id    UNINDEXED,
            ayah_number UNINDEXED,
            meal,
            literal,
            tags,
            tokenize = 'unicode61 remove_diacritics 2'
        )
    """)

    rows = conn.execute("""
        SELECT v.verse_key, v.surah_id, v.ayah_number,
               COALESCE(t.text, v.primary_translation, '') AS meal,
               COALESCE(v.literal_ceviri, '')              AS literal,
               COALESCE(
                   REPLACE(REPLACE(REPLACE(vt.alt_taglar,'["',''),'"]',''),'","',' '),
                   ''
               )                                           AS tags
        FROM   verses v
        LEFT   JOIN translations t
               ON  t.verse_key = v.verse_key AND t.source = 'diyanet'
        LEFT   JOIN verse_tags vt ON vt.verse_key = v.verse_key
        ORDER  BY v.surah_id, v.ayah_number
    """).fetchall()

    conn.executemany(
        "INSERT INTO ayet_fts VALUES (?,?,?,?,?,?)",
        rows
    )
    conn.execute("INSERT INTO ayet_fts(ayet_fts) VALUES('optimize')")
    conn.commit()
    print(f"   ✓ {len(rows)} satır yeniden indekslendi (remove_diacritics 2)")
else:
    print("   [dry-run] atlandı")

# ── 2. verse_tag_items junction tablosu ───────────────────────────────────────

print("\n2. verse_tag_items junction tablosu oluşturuluyor...")

if not args.dry_run:
    conn.execute("DROP TABLE IF EXISTS verse_tag_items")
    conn.execute("""
        CREATE TABLE verse_tag_items (
            verse_key TEXT NOT NULL,
            tag       TEXT NOT NULL
        )
    """)

    # json_each ile mevcut verileri doldur
    conn.execute("""
        INSERT INTO verse_tag_items(verse_key, tag)
        SELECT vt.verse_key, je.value
        FROM   verse_tags vt, json_each(vt.alt_taglar) je
        WHERE  vt.alt_taglar IS NOT NULL
    """)

    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_vti_tag
        ON verse_tag_items(tag, verse_key)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_vti_verse
        ON verse_tag_items(verse_key)
    """)
    conn.commit()

    count = conn.execute("SELECT COUNT(*) FROM verse_tag_items").fetchone()[0]
    print(f"   ✓ {count} satır eklendi, 2 index oluşturuldu")

    # Sorgu planı doğrulama
    plan = conn.execute("""
        EXPLAIN QUERY PLAN
        SELECT vi.verse_key, v.surah_id, v.ayah_number
        FROM   verse_tag_items vi
        JOIN   verses v ON v.verse_key = vi.verse_key
        WHERE  vi.tag = 'namaz'
        ORDER  BY v.surah_id, v.ayah_number
        LIMIT 50 OFFSET 0
    """).fetchall()
    print("   Yeni sorgu planı:")
    for r in plan:
        print(f"     {r}")
else:
    print("   [dry-run] atlandı")

# ── 3. WAL checkpoint ─────────────────────────────────────────────────────────

print("\n3. WAL checkpoint...")
if not args.dry_run:
    before = Path("data/app.db-wal")
    before_size = before.stat().st_size if before.exists() else 0
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    after_size  = before.stat().st_size if before.exists() else 0
    print(f"   ✓ WAL: {before_size//1024} KB → {after_size//1024} KB")
else:
    print("   [dry-run] atlandı")

conn.close()
print("\n✓ Optimizasyon tamamlandı.")
