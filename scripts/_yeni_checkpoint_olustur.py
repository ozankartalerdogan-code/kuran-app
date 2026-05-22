import sqlite3, csv, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB         = Path("data/app.db")
FARK_CSV   = Path("data/fark_analiz_sonuclari.csv")
ESKI_CKPT  = Path("data/duzeltilmis_literal.csv")
MANUEL_CSV = Path("data/manuel_mudahale_gerekli.csv")

ADIM2 = {
    "55:24","56:17","70:25","78:16","68:25","84:5","80:5","38:82",
    "56:15","12:93","37:162","15:91","97:1","85:4","101:9","105:2",
    "51:4","90:11","26:132","74:13",
}

def sort_key(vk):
    try:
        p = vk.split(":")
        return (int(p[0]), int(p[1]))
    except Exception:
        return (9999, 9999)


def main():
    # 1. Orijinal snapshot (fark_analiz_sonuclari.csv — 21.05 22:31)
    with open(FARK_CSV, encoding="utf-8-sig") as f:
        orijinal = {r["verse_key"]: r["literal_ceviri"] for r in csv.DictReader(f)}

    # 2. DB güncel değerleri
    conn = sqlite3.connect(DB)
    cur  = conn.cursor()
    cur.execute("SELECT verse_key, literal_ceviri FROM verses WHERE verse_key IS NOT NULL")
    db_guncel = {r[0]: r[1] or "" for r in cur.fetchall()}
    conn.close()

    # 3. Son 18 saatte değişenler
    bugun_degisen = {}
    for vk, ori in orijinal.items():
        guncel = db_guncel.get(vk, "")
        if guncel.strip() != ori.strip() and guncel.strip():
            bugun_degisen[vk] = guncel

    print(f"Orijinal CSV ayeti     : {len(orijinal)}")
    print(f"DB toplam ayet         : {len(db_guncel)}")
    print(f"Son 18s degisen        : {len(bugun_degisen)}")

    # 4. Manuel CSV'den yardımcı veri
    with open(MANUEL_CSV, encoding="utf-8-sig") as f:
        manuel_map = {r["verse_key"]: r for r in csv.DictReader(f)}

    # 5. Eski checkpoint
    eski_ckpt = {}
    if ESKI_CKPT.exists():
        with open(ESKI_CKPT, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                eski_ckpt[r["verse_key"]] = r

    print(f"Eski checkpoint        : {len(eski_ckpt)}")

    # 6. Birleştir — bugün değişenler eski checkpoint'in üzerine yazar
    yeni = {}
    for vk, row in eski_ckpt.items():
        yeni[vk] = row

    for vk, yeni_lit in bugun_degisen.items():
        m = manuel_map.get(vk, {})
        kaynak = "ADIM2_MANUEL" if vk in ADIM2 else "TOPLU_KURAL"
        ht = m.get("hata_turleri", "")
        yeni[vk] = {
            "verse_key":     vk,
            "yeni_literal":  yeni_lit,
            "eski_literal":  orijinal.get(vk, "")[:120],
            "hata_turleri":  (kaynak + "|" + ht) if ht else kaynak,
            "meal_referans": m.get("meal_referans", "")[:120],
        }

    # 7. Sıralı yaz
    fn = ["verse_key", "yeni_literal", "eski_literal", "hata_turleri", "meal_referans"]
    sirali = sorted(yeni.values(), key=lambda r: sort_key(r["verse_key"]))

    with open(ESKI_CKPT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn)
        w.writeheader()
        w.writerows(sirali)

    adim2_sayi  = sum(1 for vk in bugun_degisen if vk in ADIM2)
    toplu_sayi  = sum(1 for vk in bugun_degisen if vk not in ADIM2)
    koru_sayi   = sum(1 for vk in eski_ckpt if vk not in bugun_degisen)

    print()
    print("=== YENI CHECKPOINT ===")
    print(f"  ADIM 2 manuel (bugun)  : {adim2_sayi}")
    print(f"  Toplu kural (bugun)    : {toplu_sayi}")
    print(f"  Eski ckpt korunan      : {koru_sayi}")
    print(f"  -------------------------")
    print(f"  TOPLAM                 : {len(sirali)}")
    kalan = max(0, 4855 - len(sirali))
    print(f"  Kalan (fix_literal)    : {kalan}")
    print(f"  Dosya: {ESKI_CKPT}")
    print()
    print("Degisim ornekleri (ilk 10 bugun degisen):")
    for vk in sorted(list(bugun_degisen.keys()), key=sort_key)[:10]:
        ori = orijinal.get(vk, "")[:60]
        yni = bugun_degisen[vk][:60]
        print(f"  {vk:<10} ESK: {ori}")
        print(f"  {vk:<10} YNI: {yni}")
        print()


if __name__ == "__main__":
    main()
