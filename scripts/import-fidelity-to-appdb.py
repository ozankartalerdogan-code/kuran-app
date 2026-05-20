"""
fidelity/by-surah/index.json -> app.db fidelity_comparisons tablosu
Her ayahın çeviri karşılaştırma metinlerini (comparisons[]) kayıt eder.
Idempotent: INSERT OR IGNORE, mevcut kayıtlara dokunmaz.
"""
import json
import sqlite3
import time
from pathlib import Path

ROOT     = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "fidelity" / "by-surah" / "index.json"
DB_PATH  = ROOT / "data" / "app.db"

BATCH_SIZE = 500

print(f"JSON : {JSON_PATH}")
print(f"DB   : {DB_PATH}")
print()

# --- Bağımsızlık kontrolü ---
if not JSON_PATH.exists():
    raise FileNotFoundError(f"JSON bulunamadı: {JSON_PATH}")
if not DB_PATH.exists():
    raise FileNotFoundError(f"DB bulunamadı: {DB_PATH}")

# --- JSON yükle ---
print("JSON yükleniyor...")
with open(JSON_PATH, encoding="utf-8") as f:
    data: list[dict] = json.load(f)
print(f"Yüklendi : {len(data):,} ayah kaydı")
print()

# --- DB bağlantısı ve pragma ---
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA synchronous  = OFF")
conn.execute("PRAGMA cache_size   = -32768")
cur = conn.cursor()

# --- Tablo oluştur ---
print("Tablo oluşturuluyor (IF NOT EXISTS)...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS fidelity_comparisons (
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
    CREATE INDEX IF NOT EXISTS idx_fc_verse_key
    ON fidelity_comparisons(verse_key)
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_fc_source_name
    ON fidelity_comparisons(source_name)
""")
cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fc_uniq
    ON fidelity_comparisons(verse_key, source_name)
""")
conn.commit()
print("Indexler hazır.")
print()

# --- Satırları hazırla ---
print("Satırlar hazırlanıyor...")
rows: list[tuple] = []
for record in data:
    surah_id    = record["surahId"]
    ayah_number = record["ayahNumber"]
    verse_key   = f"{surah_id}:{ayah_number}"
    ayah_status = record.get("status", "available")

    for comp in record.get("comparisons", []):
        rows.append((
            verse_key,
            surah_id,
            ayah_number,
            comp.get("sourceName", ""),
            comp.get("text"),
            comp.get("sourceUrl"),
            comp.get("status", "available"),
            ayah_status,
        ))

print(f"Toplam satır : {len(rows):,}")
print()

# --- Batch INSERT ---
SQL = """
    INSERT OR IGNORE INTO fidelity_comparisons
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
print()  # \r satırını temizle

# --- Doğrulama ---
cur.execute("SELECT COUNT(*) FROM fidelity_comparisons")
total = cur.fetchone()[0]

conn.close()

print()
print("=" * 45)
print(f"İmport süresi   : {elapsed:.2f} sn")
print(f"Hazırlanan satır: {len(rows):,}")
print(f"SELECT COUNT(*) : {total:,}")
print("=" * 45)
