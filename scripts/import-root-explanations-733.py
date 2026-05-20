"""
root_explanations_review_batch_733_FINAL.csv -> app.db root_meanings
- short_tr_candidate -> short_tr
- summary_tr_candidate -> summary_tr
694 yeni INSERT + 39 mevcut UPDATE
"""
import csv
import sqlite3
import time
from pathlib import Path

CSV_PATH = Path(r"C:\Users\jalek\Downloads\root_explanations_review_batch_733_FINAL.csv")
DB_PATH  = Path(__file__).resolve().parent.parent / "data" / "app.db"

print(f"CSV : {CSV_PATH}")
print(f"DB  : {DB_PATH}")
print()

# --- CSV yükle (BOM temizle) ---
with open(CSV_PATH, encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

# BOM kalıntısı '﻿root' key'ini temizle
cleaned = []
for r in rows:
    entry = {k.lstrip("﻿"): v.strip() for k, v in r.items()}
    cleaned.append(entry)

print(f"CSV kayıt sayısı : {len(cleaned)}")
sample_keys = list(cleaned[0].keys())
print(f"Alanlar          : {sample_keys}")
print()

# short_tr_candidate veya summary_tr_candidate boş olanları say
no_short   = sum(1 for r in cleaned if not r.get("short_tr_candidate","").strip())
no_summary = sum(1 for r in cleaned if not r.get("summary_tr_candidate","").strip())
print(f"short_tr_candidate bos   : {no_short}")
print(f"summary_tr_candidate bos : {no_summary}")
print()

# --- DB bağlantısı ---
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA synchronous  = OFF")
conn.execute("PRAGMA cache_size   = -32768")
cur = conn.cursor()

# --- Sütun ekle (yoksa) ---
cur.execute("PRAGMA table_info(root_meanings)")
existing_cols = {c[1] for c in cur.fetchall()}

for col in ("short_tr", "summary_tr"):
    if col not in existing_cols:
        cur.execute(f"ALTER TABLE root_meanings ADD COLUMN {col} TEXT")
        print(f"Sütun eklendi: {col}")
    else:
        print(f"Sütun zaten var: {col}")
conn.commit()

# --- Index ekle (yoksa) ---
cur.execute(
    "CREATE INDEX IF NOT EXISTS idx_root_meanings_root ON root_meanings(root)"
)
conn.commit()
print("Index hazır: idx_root_meanings_root")
print()

# --- Mevcut rootları yükle ---
cur.execute("SELECT DISTINCT root FROM root_meanings")
existing_roots = {r[0].strip() for r in cur.fetchall() if r[0]}

# --- INSERT ve UPDATE listelerini hazırla ---
to_insert = []
to_update = []

for r in cleaned:
    root       = r.get("root", "").strip()
    short_tr   = r.get("short_tr_candidate", "").strip() or None
    summary_tr = r.get("summary_tr_candidate", "").strip() or None

    if not root:
        continue

    if root in existing_roots:
        to_update.append((short_tr, summary_tr, root))
    else:
        to_insert.append((root, short_tr, summary_tr))

print(f"INSERT edilecek : {len(to_insert)}")
print(f"UPDATE edilecek : {len(to_update)}")
print()

# --- Tek transaction ---
t0 = time.perf_counter()

SQL_INSERT = """
    INSERT INTO root_meanings (root, short_tr, summary_tr, source)
    VALUES (?, ?, ?, 'root_explanations_733')
"""

SQL_UPDATE = """
    UPDATE root_meanings
    SET short_tr = ?, summary_tr = ?
    WHERE root = ?
"""

with conn:
    cur.executemany(SQL_INSERT, to_insert)
    cur.executemany(SQL_UPDATE, to_update)

elapsed = time.perf_counter() - t0

# --- Doğrulama ---
cur.execute("SELECT COUNT(*) FROM root_meanings")
total = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM root_meanings WHERE short_tr IS NOT NULL")
short_filled = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM root_meanings WHERE summary_tr IS NOT NULL")
summary_filled = cur.fetchone()[0]

conn.close()

print("=" * 50)
print(f"Süre                 : {elapsed:.2f} sn")
print(f"INSERT               : {len(to_insert)}")
print(f"UPDATE               : {len(to_update)}")
print(f"SELECT COUNT(*)      : {total}")
print(f"short_tr dolu        : {short_filled}")
print(f"summary_tr dolu      : {summary_filled}")
print("=" * 50)
