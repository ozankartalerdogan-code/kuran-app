import sqlite3, sys
sys.stdout.reconfigure(encoding="utf-8")
conn = sqlite3.connect("data/app.db")
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM verses")
toplam = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM verses WHERE literal_ceviri IS NOT NULL AND TRIM(literal_ceviri) != ''")
dolu = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM verses WHERE literal_ceviri IS NULL OR TRIM(literal_ceviri) = ''")
bos = cur.fetchone()[0]

print(f"Toplam ayet     : {toplam}")
print(f"Literal var     : {dolu}")
print(f"Literal yok     : {bos}")
print(f"Tamamlanma oranı: %{dolu/toplam*100:.1f}")
print()

# Sure bazlı ozet (bos olan sureler varsa goster)
cur.execute("""
    SELECT s.adi_turkce, s.id, COUNT(*) as toplam,
           SUM(CASE WHEN v.literal_ceviri IS NOT NULL AND TRIM(v.literal_ceviri) != '' THEN 1 ELSE 0 END) as dolu
    FROM sureler s
    JOIN verses v ON s.id = v.surah_id
    GROUP BY s.id
    HAVING dolu < toplam
    ORDER BY s.id
""")
eksik = cur.fetchall()
if eksik:
    print("Eksik sureler:")
    for r in eksik:
        print(f"  Sure {r[1]:>3} {r[0]:<20} {r[3]}/{r[2]}")
else:
    print("Tüm surelerde literal çeviri tam!")

print()
# Son 3 ayet ornegi
cur.execute("""
    SELECT verse_key, literal_ceviri FROM verses
    ORDER BY surah_id DESC, ayah_number DESC LIMIT 3
""")
print("Son 3 ayet:")
for r in cur.fetchall():
    print(f"  {r[0]:<8} {r[1][:80]}")
