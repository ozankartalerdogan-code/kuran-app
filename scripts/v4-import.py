"""Adim 2: updates.csv -> app.db (WAL, DEFERRED transaction)"""
import csv, sqlite3, sys
sys.stdout.reconfigure(encoding="utf-8")

CSV = r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\scripts\v4-updates.csv"
DB  = r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\data\app.db"

with open(CSV, "r", encoding="utf-8") as f:
    rows = [(r[0], r[1], int(r[2])) for r in csv.reader(f)]
print(f"CSV okundu: {len(rows):,} satir")

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")
conn.execute("PRAGMA busy_timeout=10000")

cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr)=''")
before = cur.fetchone()[0]
print(f"Oncesi bos: {before:,}")

SQL = ("UPDATE words SET meaning_tr=? "
       "WHERE verse_key=? AND word_index=? "
       "AND (meaning_tr IS NULL OR trim(meaning_tr)='')")

with conn:
    cur.executemany(SQL, rows)

cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr)=''")
after = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NOT NULL AND trim(meaning_tr)!=''")
filled = cur.fetchone()[0]
conn.close()

print(f"Guncellenen: {before - after:,}")
print(f"Bos sonrasi: {after:,}")
print(f"Dolu toplam: {filled:,}")
