import sqlite3, csv, re, sys
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

DB          = Path(__file__).parent.parent / "data" / "app.db"
KONTROL_CSV = Path(__file__).parent.parent / "data" / "kapsamli_fark_kontrol.csv"
OUTPUT      = Path(__file__).parent.parent / "data" / "manuel_mudahale_gerekli.csv"


def sort_key(s):
    parts = s["verse_key"].split(":")
    return (int(parts[0]), int(parts[1]))


def tespit_hatalar(vk, literal, kontrol_row):
    hatalar = []
    kelimeler = literal.split()
    n = len(kelimeler)

    if n <= 3 and len(literal) < 25:
        hatalar.append(f"COK_KISA({n}_kelime)")

    sinonim_pattler = [
        r"atti,\s*birakti", r"kildi,\s*yapti", r"uzerine,\s*ustune",
        r"geldi,\s*getirdi", r"der,\s*dedi", r"okudu,\s*takip",
    ]
    for p in sinonim_pattler:
        if re.search(p, literal, re.IGNORECASE):
            hatalar.append("SINONIM_CIFTI_KALDI")
            break

    mastar_patt = r"\b(etmek|yapmak|olmak|gitmek|gelmek|birak" + r"mak|sormak|dilemek)\b"
    if re.search(mastar_patt, literal, re.IGNORECASE):
        hatalar.append("MASTAR_KALDI")

    if "(soru)" in literal.lower():
        hatalar.append("SORU_YAPISI_BOZUK")

    virgul_say = literal.count(",")
    if virgul_say >= 3 and n < 12:
        hatalar.append(f"VIRGUL_FAZLALIGI({virgul_say})")

    fiil_var = bool(re.search(
        r"\b(etti|eder|oldu|olur|geldi|gitti|kildi|dedi|der|var|yok)\b",
        literal, re.IGNORECASE
    ))
    if n >= 5 and not fiil_var:
        hatalar.append("FIIL_YOK")

    kontrol_sonucu = kontrol_row.get("kontrol_sonucu", "")
    kok_m = re.search(r"KOK_CONTEXT_ZAYIF\(([^)]+)\)", kontrol_sonucu)
    if not kok_m:
        kok_m = re.search(r"K.K_CONTEXT_ZAYIF\(([^)]+)\)", kontrol_sonucu)
    if kok_m:
        hatalar.append(f"KOK_HATASI({kok_m.group(1)})")

    benzerlik = float(kontrol_row.get("ort_benzerlik", 100) or 100)
    if benzerlik < 15 and not hatalar:
        hatalar.append("DUSUK_BENZERLIK")

    return hatalar if hatalar else ["KONTROL_GEREKLI"]


def main():
    with open(KONTROL_CSV, encoding="utf-8-sig") as f:
        kontrol = {r["verse_key"]: r for r in csv.DictReader(f)}

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    vks = list(kontrol.keys())
    yer = ",".join("?" * len(vks))
    cur.execute(
        f"SELECT verse_key, literal_ceviri FROM verses WHERE verse_key IN ({yer})",
        vks
    )
    verses = {r["verse_key"]: r["literal_ceviri"] or "" for r in cur.fetchall()}
    conn.close()

    satirlar = []
    for vk, literal in verses.items():
        k = kontrol.get(vk, {})
        hatalar = tespit_hatalar(vk, literal, k)
        satirlar.append({
            "verse_key":         vk,
            "literal_mevcut":    literal[:120],
            "meal_referans":     k.get("meal_ozet", "")[:120],
            "hata_turleri":      " | ".join(hatalar),
            "ort_benzerlik":     k.get("ort_benzerlik", ""),
            "csv_fark_turu":     k.get("csv_fark_turu", ""),
            "kontrol_sonucu":    k.get("kontrol_sonucu", "")[:80],
            "onerilen_duzeltme": "",
        })

    oncelikli = [s for s in satirlar if s["hata_turleri"] != "KONTROL_GEREKLI"]
    diger     = [s for s in satirlar if s["hata_turleri"] == "KONTROL_GEREKLI"]
    oncelikli.sort(key=sort_key)
    diger.sort(key=sort_key)
    tum = oncelikli + diger

    fn = [
        "verse_key", "literal_mevcut", "meal_referans", "hata_turleri",
        "ort_benzerlik", "csv_fark_turu", "kontrol_sonucu", "onerilen_duzeltme",
    ]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn)
        w.writeheader()
        w.writerows(tum)

    print(f"Toplam satir    : {len(tum)}")
    print(f"Hatali (onceli) : {len(oncelikli)}")
    print(f"Kontrol gereken : {len(diger)}")
    print(f"CSV             : {OUTPUT}")
    print()
    print("=== Hata turu dagilimi ===")
    tum_hatalar = []
    for s in oncelikli:
        tum_hatalar += s["hata_turleri"].split(" | ")
    for tur, sayi in Counter(tum_hatalar).most_common():
        print(f"  {sayi:>4}x  {tur}")


if __name__ == "__main__":
    main()
