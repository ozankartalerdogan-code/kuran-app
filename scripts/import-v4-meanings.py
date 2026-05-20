import json
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

V4_PATH = "data2/processed/canonical_word_analysis_v4.json"
DB_PATH = "data/app.db"

print("v4 JSON yukleniyor...")
with open(V4_PATH, "r", encoding="utf-8") as f:
    v4 = json.load(f)
print(f"Yuklendi: {len(v4)} verse_key")

conn = sqlite3.connect(DB_PATH, timeout=60)
conn.execute("PRAGMA busy_timeout=60000")
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")
cur = conn.cursor()

batch = []
BATCH_SIZE = 2000
updated = 0
skipped = 0

SQL = (
    "UPDATE words SET meaning_tr = ? "
    "WHERE verse_key = ? AND word_index = ? "
    "AND (meaning_tr IS NULL OR meaning_tr = '')"
)

for verse_key, words in v4.items():
    for word in words:
        m = (word.get("meaning_tr") or "").strip()
        p = word.get("position")
        if not m:
            skipped += 1
            continue
        batch.append((m, verse_key, p))
        if len(batch) >= BATCH_SIZE:
            cur.executemany(SQL, batch)
            updated += cur.rowcount
            batch.clear()

if batch:
    cur.executemany(SQL, batch)
    updated += cur.rowcount

conn.commit()

cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL OR meaning_tr = ''")
remaining = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NOT NULL AND meaning_tr != ''")
filled = cur.fetchone()[0]
conn.close()

print(f"Guncellenen : {updated:,}")
print(f"v4 anlam yok: {skipped:,}")
print(f"Dolu sonrasi: {filled:,}")
print(f"Bos sonrasi : {remaining:,}")
print(f"Toplam      : {filled + remaining:,}")
