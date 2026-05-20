"""
canonical_word_analysis_v4.json -> app.db words tablosu
Sadece meaning_tr bos olan satirlari guncelle.
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V4_PATH = ROOT / "data2" / "processed" / "canonical_word_analysis_v4.json"
DB_PATH = ROOT / "data" / "app.db"

print(f"v4 path : {V4_PATH}")
print(f"DB path : {DB_PATH}")
print()

# --- v4 yukle ---
print("v4 JSON yukleniyor...")
with open(V4_PATH, "r", encoding="utf-8") as f:
    v4: dict = json.load(f)
print(f"Yuklendi  : {len(v4)} verse_key, ornek: {next(iter(v4))}")

# --- Guncelleme batch'i hazirla ---
print("Guncelleme listesi hazirlaniyor...")
updates: list[tuple[str, str, int]] = []

for verse_key, words in v4.items():
    for word in words:
        meaning = (word.get("meaning_tr") or "").strip()
        position = word.get("position")
        if meaning and position is not None:
            updates.append((meaning, verse_key, int(position)))

print(f"v4'te anlam dolu  : {len(updates):,} kelime")
print(f"v4'te anlam bos   : {sum(len(w) for w in v4.values()) - len(updates):,} kelime")
print()

# --- DB'ye yaz ---
SQL_UPDATE = (
    "UPDATE words "
    "SET meaning_tr = ? "
    "WHERE verse_key = ? AND word_index = ? "
    "AND (meaning_tr IS NULL OR trim(meaning_tr) = '')"
)

conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA synchronous = OFF")    # hiz icin; import sonrasi guvende
conn.execute("PRAGMA cache_size = -32768")  # 32 MB page cache

cur = conn.cursor()

# onceki durum
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr) = ''")
before_empty = cur.fetchone()[0]
print(f"Oncesi bos meaning_tr : {before_empty:,}")

print("Guncelleme yapiliyor (tek transaction)...")
with conn:
    cur.executemany(SQL_UPDATE, updates)
    affected = cur.rowcount   # executemany sonrasi rowcount toplam etkilenen

# sonrasi durum
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr) = ''")
after_empty = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NOT NULL AND trim(meaning_tr) != ''")
after_filled = cur.fetchone()[0]

conn.close()

print()
print("=" * 40)
print(f"Guncellenen kayit   : {before_empty - after_empty:,}")
print(f"Hala bos            : {after_empty:,}")
print(f"Toplam dolu         : {after_filled:,}")
print(f"Toplam words satirı : {after_filled + after_empty:,}")
print("=" * 40)
