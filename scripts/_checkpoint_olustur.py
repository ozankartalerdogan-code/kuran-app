import sqlite3, csv, sys, json
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB   = Path("data/app.db")
CKPT = Path("data/checkpoints")
CKPT.mkdir(exist_ok=True)

tarih = datetime.now().strftime("%Y%m%d_%H%M")

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur  = conn.cursor()

# 1. literal_ceviri snapshot
cur.execute("""
    SELECT verse_key, literal_ceviri, ham_anlam_ozeti
    FROM verses
    WHERE verse_key IS NOT NULL
    ORDER BY surah_id, ayah_number
""")
lit_rows = [dict(r) for r in cur.fetchall()]
lit_path = CKPT / f"literal_ceviri_{tarih}.csv"
with open(lit_path, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=["verse_key","literal_ceviri","ham_anlam_ozeti"])
    w.writeheader()
    w.writerows(lit_rows)

lit_dolu = sum(1 for r in lit_rows if r["literal_ceviri"] and r["literal_ceviri"].strip())

# 2. fark_analizi snapshot
cur.execute("""
    SELECT verse_key, fark_analizi
    FROM verses
    WHERE fark_analizi IS NOT NULL AND TRIM(fark_analizi) != ''
    ORDER BY surah_id, ayah_number
""")
fark_rows = [dict(r) for r in cur.fetchall()]
fark_path = CKPT / f"fark_analizi_{tarih}.csv"
with open(fark_path, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=["verse_key","fark_analizi"])
    w.writeheader()
    w.writerows(fark_rows)

# 3. Özet meta
cur.execute("SELECT COUNT(*) FROM verses")
toplam_ayet = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM verses WHERE fark_analizi IS NOT NULL AND TRIM(fark_analizi) != ''")
fark_dolu = cur.fetchone()[0]

conn.close()

# 4. Meta JSON
meta = {
    "tarih":               tarih,
    "toplam_ayet":         toplam_ayet,
    "literal_dolu":        lit_dolu,
    "literal_bos":         toplam_ayet - lit_dolu,
    "fark_analizi_dolu":   fark_dolu,
    "fark_analizi_bos":    toplam_ayet - fark_dolu,
    "literal_csv":         str(lit_path),
    "fark_analizi_csv":    str(fark_path),
}
meta_path = CKPT / f"meta_{tarih}.json"
meta_path.write_text(
    json.dumps(meta, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print(f"{'='*55}")
print(f"  CHECKPOINT OLUŞTURULDU — {tarih}")
print(f"{'='*55}")
print(f"  Toplam ayet           : {toplam_ayet}")
print(f"  literal_ceviri dolu   : {lit_dolu}  ({lit_dolu/toplam_ayet*100:.1f}%)")
print(f"  literal_ceviri boş    : {toplam_ayet - lit_dolu}")
print(f"  fark_analizi dolu     : {fark_dolu}  ({fark_dolu/toplam_ayet*100:.1f}%)")
print(f"  fark_analizi boş      : {toplam_ayet - fark_dolu}")
print()
print(f"  Dosyalar:")
print(f"    {lit_path}")
print(f"    {fark_path}")
print(f"    {meta_path}")
