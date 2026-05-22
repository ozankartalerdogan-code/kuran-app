import sqlite3, sys, re
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB = Path("data/app.db")

SINONIM = [
    r"attı,\s*bıraktı",
    r"kıldı,\s*yaptı",
    r"üzerine,\s*üstüne",
    r"geldi,\s*getirdi",
    r"der,\s*dedi",
]
MASTAR = r"\b(etmek|yapmak|olmak|gitmek|bırakmak|sormak|dilemek)\b"
FIIL   = (
    r"\b(etti|eder|oldu|olur|geldi|gitti|kıldı|dedi|der|var|yok"
    r"|mı|mi|dır|dir|tır|tir|lar|ler|ar|er|ir|ştur|ştir"
    r"|tur|tir|du|di|yor|ecek|ş|diği|ince|erek|arak)\b"
)

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("""
    SELECT v.verse_key, v.literal_ceviri, t.text AS meal
    FROM verses v
    JOIN translations t ON v.verse_key = t.verse_key AND t.source = 'diyanet'
    WHERE v.literal_ceviri IS NOT NULL AND TRIM(v.literal_ceviri) != ''
    ORDER BY v.surah_id, v.ayah_number
""")
rows = cur.fetchall()
conn.close()

cok_kisa      = []
sinonim_cifti = []
mastar_kaldi  = []
soru_bozuk    = []
fiil_yok      = []
guclu         = []

for row in rows:
    vk  = row["verse_key"]
    lit = row["literal_ceviri"] or ""
    n   = len(lit.split())

    if n <= 2 and len(lit) < 15:
        cok_kisa.append((vk, lit))
    elif any(re.search(p, lit, re.IGNORECASE) for p in SINONIM):
        sinonim_cifti.append((vk, lit[:90]))
    elif re.search(MASTAR, lit, re.IGNORECASE) and n < 10:
        mastar_kaldi.append((vk, lit[:90]))
    elif "(soru)" in lit.lower():
        soru_bozuk.append((vk, lit[:90]))
    elif n >= 5 and not re.search(FIIL, lit, re.IGNORECASE):
        fiil_yok.append((vk, lit[:90]))
    else:
        guclu.append(vk)

toplam = len(rows)
print(f"Toplam kontrol edilen : {toplam}")
print(f"Sorunsuz (guclu)      : {len(guclu):>5}  (%{len(guclu)/toplam*100:.1f})")
print(f"cok_kisa              : {len(cok_kisa):>5}")
print(f"sinonim_cifti         : {len(sinonim_cifti):>5}")
print(f"mastar_kaldi          : {len(mastar_kaldi):>5}")
print(f"soru_bozuk            : {len(soru_bozuk):>5}")
print(f"fiil_yok              : {len(fiil_yok):>5}")
print(f"Toplam sorunlu        : {len(cok_kisa)+len(sinonim_cifti)+len(mastar_kaldi)+len(soru_bozuk)+len(fiil_yok):>5}")

print("\n=== COK KISA (ilk 20) ===")
for vk, lit in cok_kisa[:20]:
    print(f"  {vk:<10} '{lit}'")

print("\n=== SINONIM CIFTI (ilk 15) ===")
for vk, lit in sinonim_cifti[:15]:
    print(f"  {vk:<10} {lit}")

print("\n=== MASTAR KALDI (ilk 15) ===")
for vk, lit in mastar_kaldi[:15]:
    print(f"  {vk:<10} {lit}")

print("\n=== SORU BOZUK ===")
for vk, lit in soru_bozuk[:15]:
    print(f"  {vk:<10} {lit}")

print("\n=== FIIL YOK (ilk 15) ===")
for vk, lit in fiil_yok[:15]:
    print(f"  {vk:<10} {lit}")
