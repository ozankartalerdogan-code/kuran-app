"""
meal-comparison/by-surah/*.json -> app.db meal_comparisons tablosu
114 sure dosyasındaki entries[] dizisini satır bazında yazar.
Idempotent: INSERT OR IGNORE, mevcut tablolara dokunmaz.
"""
import json
import sqlite3
import time
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
SRC_DIR   = ROOT / "data" / "meal-comparison" / "by-surah"
DB_PATH   = ROOT / "data" / "app.db"

BATCH_SIZE = 500

print(f"Kaynak : {SRC_DIR}")
print(f"DB     : {DB_PATH}")
print()

if not SRC_DIR.exists():
    raise FileNotFoundError(f"Kaynak dizin bulunamadı: {SRC_DIR}")
if not DB_PATH.exists():
    raise FileNotFoundError(f"DB bulunamadı: {DB_PATH}")

json_files = sorted(SRC_DIR.glob("*.json"))
if not json_files:
    raise FileNotFoundError(f"*.json bulunamadı: {SRC_DIR}")
print(f"Dosya sayısı : {len(json_files)}")

# --- DB bağlantısı ---
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA synchronous  = OFF")
conn.execute("PRAGMA cache_size   = -32768")
cur = conn.cursor()

# --- Tablo oluştur (indexlerden önce) ---
print("Tablo oluşturuluyor (IF NOT EXISTS)...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS meal_comparisons (
        id          INTEGER PRIMARY KEY,
        verse_key   TEXT NOT NULL,
        surah_id    INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        source_name TEXT NOT NULL,
        text        TEXT,
        source_url  TEXT,
        status      TEXT DEFAULT 'available',
        ayah_status TEXT
    )
""")
conn.commit()

# --- Indexler ---
print("Indexler oluşturuluyor...")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_mc_verse_key
    ON meal_comparisons(verse_key)
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_mc_source_name
    ON meal_comparisons(source_name)
""")
cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_uniq
    ON meal_comparisons(verse_key, source_name)
""")
conn.commit()
print("Indexler hazır.")
print()

# --- Tüm dosyaları oku, satırları biriktir ---
print("Dosyalar okunuyor...")
rows: list[tuple] = []
for fp in json_files:
    with open(fp, encoding="utf-8") as f:
        data: list[dict] = json.load(f)
    for rec in data:
        surah_id    = rec["surahId"]
        ayah_number = rec["ayahNumber"]
        verse_key   = f"{surah_id}:{ayah_number}"
        ayah_status = rec.get("status", "available")
        for entry in rec.get("entries", []):
            rows.append((
                verse_key,
                surah_id,
                ayah_number,
                entry.get("sourceName", ""),
                entry.get("text"),
                entry.get("sourceUrl"),
                entry.get("status", "available"),
                ayah_status,
            ))

print(f"Toplam satır : {len(rows):,}")
print()

# --- Batch INSERT ---
SQL = """
    INSERT OR IGNORE INTO meal_comparisons
        (verse_key, surah_id, ayah_number, source_name, text, source_url, status, ayah_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"""

print(f"Import başlıyor ({BATCH_SIZE} satır/batch, tek transaction)...")
t0 = time.perf_counter()

with conn:
    for offset in range(0, len(rows), BATCH_SIZE):
        batch = rows[offset : offset + BATCH_SIZE]
        cur.executemany(SQL, batch)
        done = min(offset + BATCH_SIZE, len(rows))
        print(f"  {done:>7,} / {len(rows):,}", end="\r", flush=True)

elapsed = time.perf_counter() - t0
print()

# --- Doğrulama ---
cur.execute("SELECT COUNT(*) FROM meal_comparisons")
total = cur.fetchone()[0]
conn.close()

print()
print("=" * 45)
print(f"Import süresi   : {elapsed:.2f} sn")
print(f"Hazırlanan satır: {len(rows):,}")
print(f"SELECT COUNT(*) : {total:,}")
print("=" * 45)
