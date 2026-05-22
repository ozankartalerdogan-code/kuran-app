import csv, sys, os
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

KONTROL_CSV = Path("data/kapsamli_fark_kontrol.csv")
HEDEF       = Path(os.path.expanduser("~")) / "OneDrive" / "Masaüstü" / "kalan_farklar.csv"

with open(KONTROL_CSV, encoding="utf-8-sig") as f:
    rows = [r for r in csv.DictReader(f)
            if r["kontrol_sonucu"].strip() != "TEMİZ"
            and "YUK_BENZERLIK" not in r["kontrol_sonucu"]]


def sort_key(r):
    try:
        p = r["verse_key"].split(":")
        return (int(p[0]), int(p[1]))
    except Exception:
        return (9999, 9999)


rows.sort(key=sort_key)

fn = list(rows[0].keys()) if rows else []

with open(HEDEF, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=fn)
    w.writeheader()
    w.writerows(rows)

from collections import Counter
sayac = Counter()
for r in rows:
    for parca in r["kontrol_sonucu"].split("|"):
        sayac[parca.strip().split("(")[0].split(":")[0].strip()] += 1

print(f"Toplam sorunlu ayet : {len(rows)}")
print(f"Dosya               : {HEDEF}")
print()
print("Sorun dagilimi:")
for tur, sayi in sayac.most_common():
    print(f"  {sayi:>4}x  {tur}")
