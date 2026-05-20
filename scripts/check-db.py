import sqlite3
conn = sqlite3.connect(r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\data\app.db")
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr) = ''")
empty = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM words WHERE meaning_tr IS NOT NULL AND trim(meaning_tr) != ''")
filled = cur.fetchone()[0]
conn.close()
print(f"Bos  : {empty}")
print(f"Dolu : {filled}")
print(f"Toplam: {empty+filled}")
