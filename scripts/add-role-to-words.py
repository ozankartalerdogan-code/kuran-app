"""
canonical_word_analysis.json (v1) -> app.db words.role
ALTER TABLE words ADD COLUMN role TEXT, sonra batch UPDATE.
"""
import json
import sqlite3
import time
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data2" / "processed" / "canonical_word_analysis.json"
DB_PATH   = ROOT / "data" / "app.db"
BATCH     = 500

print(f"JSON : {JSON_PATH}")
print(f"DB   : {DB_PATH}")
print()

if not JSON_PATH.exists():
    raise FileNotFoundError(JSON_PATH)
if not DB_PATH.exists():
    raise FileNotFoundError(DB_PATH)

# --- JSON yükle ---
print("JSON yükleniyor...")
with open(JSON_PATH, encoding="utf-8") as f:
    data: dict = json.load(f)
print(f"Yüklendi: {len(data):,} verse_key")

# --- (verse_key, word_index, role) tripletlerini topla ---
updates: list[tuple[str, str, int]] = []
for verse_key, words in data.items():
    for w in words:
        role = (w.get("role") or "").strip()
        pos  = w.get("position")
        if role and pos is not None:
            updates.append((role, verse_key, int(pos)))

print(f"Güncellenecek kayıt: {len(updates):,}")
print()

# --- DB bağlantısı ---
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA synchronous  = OFF")
conn.execute("PRAGMA cache_size   = -32768")
cur = conn.cursor()

# --- Kolon var mı kontrol et; yoksa ekle ---
cur.execute("PRAGMA table_info(words)")
existing_cols = [c[1] for c in cur.fetchall()]
if "role" not in existing_cols:
    print("ALTER TABLE words ADD COLUMN role TEXT...")
    cur.execute("ALTER TABLE words ADD COLUMN role TEXT")
    conn.commit()
    print("Kolon eklendi.")
else:
    print("role kolonu zaten var, atlanıyor.")
print()

# --- Index oluştur (kolon boşken hızlı) ---
print("Index oluşturuluyor: idx_words_role...")
cur.execute("CREATE INDEX IF NOT EXISTS idx_words_role ON words(role)")
conn.commit()
print("Index hazır.")
print()

# --- Batch UPDATE ---
SQL = "UPDATE words SET role = ? WHERE verse_key = ? AND word_index = ?"

print(f"Güncelleme başlıyor ({BATCH} satır/batch, tek transaction)...")
t0 = time.perf_counter()

with conn:
    for offset in range(0, len(updates), BATCH):
        batch = updates[offset : offset + BATCH]
        cur.executemany(SQL, batch)
        done = min(offset + BATCH, len(updates))
        print(f"  {done:>7,} / {len(updates):,}", end="\r", flush=True)

elapsed = time.perf_counter() - t0
print()

# --- Doğrulama ---
cur.execute("SELECT COUNT(*) FROM words WHERE role IS NULL OR trim(role) = ''")
null_count = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM words WHERE role IS NOT NULL AND trim(role) != ''")
filled_count = cur.fetchone()[0]

# NULL kalan varsa listele (max 20)
null_rows = []
if null_count > 0:
    cur.execute(
        "SELECT verse_key, word_index, arabic FROM words "
        "WHERE role IS NULL OR trim(role) = '' LIMIT 20"
    )
    null_rows = cur.fetchall()

conn.close()

print()
print("=" * 50)
print(f"Güncelleme süresi  : {elapsed:.2f} sn")
print(f"Güncellenen kayıt  : {len(updates):,}")
print(f"role dolu          : {filled_count:,}")
print(f"role NULL kalan    : {null_count:,}")
print("=" * 50)

if null_rows:
    print()
    print("NULL kalan kayıtlar (ilk 20):")
    for row in null_rows:
        print(f"  verse_key={row[0]}  word_index={row[1]}  arabic={row[2]}")
