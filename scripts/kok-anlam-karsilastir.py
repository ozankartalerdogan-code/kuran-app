"""
Aynı köke (root) sahip kelimelerin meaning_tr değerlerini karşılaştırır.
Mod anlamdan %10'dan az oranda sapan kelimeler "POTANSİYEL HATA" olarak işaretlenir.

Çıktı: data/kok_anlam_karsilastir.csv

Kullanım:
  python scripts/kok-anlam-karsilastir.py
  python scripts/kok-anlam-karsilastir.py --min-ornek 5   (kök min tekrar sayısı)
  python scripts/kok-anlam-karsilastir.py --esik 0.15     (fark eşiği, varsayılan 0.10)
  python scripts/kok-anlam-karsilastir.py --sadece-hata   (sadece POTANSİYEL HATA satırları)
"""

import sqlite3
import csv
import re
import difflib
import argparse
from collections import Counter
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "app.db"
OUTPUT  = Path(__file__).parent.parent / "data" / "kok_anlam_karsilastir.csv"

# Türkçe olumsuzluk belirteçleri
OLUMSUZLUK = {"değil", "yok", "olmayan", "olmaz", "hayır", "değildir",
              "olmayacak", "etmez", "yapmaz", "bilmez"}

# Yaygın zıt anlam çiftleri (her iki yönde de kontrol edilir)
ZIT_CIFTLER = [
    ("güzel",    "çirkin"),
    ("iyi",      "kötü"),
    ("büyük",    "küçük"),
    ("uzun",     "kısa"),
    ("çok",      "az"),
    ("açık",     "kapalı"),
    ("doğru",    "yanlış"),
    ("haklı",    "haksız"),
    ("iyilik",   "kötülük"),
    ("galip",    "mağlup"),
    ("kurtuluş", "helak"),
    ("sevmek",   "nefret"),
    ("ölmek",    "yaşamak"),
    ("vermek",   "almak"),
    ("gelmek",   "gitmek"),
    ("girmek",   "çıkmak"),
    ("aşağı",    "yukarı"),
    ("önce",     "sonra"),
    ("ilk",      "son"),
    ("hak",      "batıl"),
    ("iman",     "küfür"),
    ("cennet",   "cehennem"),
    ("sevap",    "günah"),
]
# Her iki yön için set
ZIT_MAP: dict[str, str] = {}
for a, b in ZIT_CIFTLER:
    ZIT_MAP[a] = b
    ZIT_MAP[b] = a


def normalize(text: str) -> str:
    """Karşılaştırma için normalize et: küçük harf, noktalama sil."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[,;/\-–—\(\)\[\]\"\'.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> list[str]:
    return [t for t in normalize(text).split() if len(t) >= 2]


def fark_nedeni(mod: str, varyant: str) -> str:
    """
    İki anlam arasındaki farkın muhtemel sebebini tahmin eder.
    Öncelik sırası: zıt anlam > olumsuzluk farkı > yazım/format farkı >
                    kısmi örtüşme > tamamen farklı
    """
    mod_tok     = set(tokenize(mod))
    varyant_tok = set(tokenize(varyant))
    mod_n       = normalize(mod)
    varyant_n   = normalize(varyant)

    # 1. Zıt anlam kontrolü
    for mt in mod_tok:
        if mt in ZIT_MAP and ZIT_MAP[mt] in varyant_tok:
            return f"ZIT ANLAM ({mt} ↔ {ZIT_MAP[mt]})"
    for vt in varyant_tok:
        if vt in ZIT_MAP and ZIT_MAP[vt] in mod_tok:
            return f"ZIT ANLAM ({vt} ↔ {ZIT_MAP[vt]})"

    # 2. Olumsuzluk farkı
    mod_olum     = bool(mod_tok & OLUMSUZLUK)
    varyant_olum = bool(varyant_tok & OLUMSUZLUK)
    if mod_olum != varyant_olum:
        return "OLUMSUZLUK FARKI"

    # 3. Yüksek string benzerliği → yazım/format farkı
    ratio = difflib.SequenceMatcher(None, mod_n, varyant_n).ratio()
    if ratio >= 0.65:
        return f"YAZIM/FORMAT FARKI ({ratio:.0%} benzer)"

    # 4. Kısmi token örtüşmesi
    ortak = mod_tok & varyant_tok
    if ortak:
        return f"KISMI ORTUSME (ortak: {', '.join(sorted(ortak))})"

    # 5. Varyant çok kısa veya genel → belirsiz atama
    if len(varyant_n) <= 3 or varyant_n in {"şey", "bir", "o", "bu", "ve"}:
        return "BELIRSIZ/EKSIK ANLAM"

    # 6. Tamamen farklı
    return "TAMAMEN FARKLI ANLAM"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-ornek", type=int, default=3,
                        help="Bir kökteki minimum kelime sayısı (varsayılan: 3)")
    parser.add_argument("--esik", type=float, default=0.10,
                        help="Potansiyel hata eşiği oranı (varsayılan: 0.10 = %%10)")
    parser.add_argument("--sadece-hata", action="store_true",
                        help="Sadece POTANSİYEL HATA satırlarını CSV'ye yaz")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT verse_key, word_index, arabic, root, meaning_tr
        FROM words
        WHERE root IS NOT NULL AND root != ''
          AND meaning_tr IS NOT NULL AND meaning_tr != ''
        ORDER BY root, verse_key, word_index
    """)
    rows = cur.fetchall()
    conn.close()

    # Root başına gruplama
    gruplar: dict[str, list] = {}
    for row in rows:
        gruplar.setdefault(row["root"], []).append(dict(row))

    print(f"Toplam kök: {len(gruplar)}  |  Eşik: %{args.esik*100:.0f}  |  Min örnek: {args.min_ornek}")

    satirlar   = []
    hata_sayac = 0
    kucuk_grup = 0

    for root, kelimeler in sorted(gruplar.items()):
        if len(kelimeler) < args.min_ornek:
            kucuk_grup += 1
            continue

        # Normalize edilmiş anlam → orijinal anlam eşlemesi
        norm_anlam_map: dict[str, str] = {}
        norm_listesi = []
        for k in kelimeler:
            norm = normalize(k["meaning_tr"])
            norm_anlam_map[norm] = k["meaning_tr"]   # son karşılaşılan orijinali sakla
            norm_listesi.append(norm)

        sayac     = Counter(norm_listesi)
        toplam    = len(norm_listesi)
        mod_norm, mod_sayi = sayac.most_common(1)[0]
        mod_anlam = norm_anlam_map[mod_norm]

        for kelime in kelimeler:
            k_norm = normalize(kelime["meaning_tr"])

            if k_norm == mod_norm:
                # Mod anlamıyla aynı → normal
                if not args.sadece_hata:
                    satirlar.append({
                        "root":        root,
                        "verse_key":   kelime["verse_key"],
                        "word_index":  kelime["word_index"],
                        "arabic":      kelime["arabic"],
                        "meaning_tr":  kelime["meaning_tr"],
                        "mod_anlam":   mod_anlam,
                        "mod_sayi":    mod_sayi,
                        "toplam":      toplam,
                        "oran":        f"%{sayac[k_norm]/toplam*100:.1f}",
                        "durum":       "NORMAL",
                        "fark_nedeni": "",
                    })
                continue

            # Farklı anlam — oran hesapla
            varyant_sayi = sayac[k_norm]
            oran         = varyant_sayi / toplam

            if oran < args.esik:
                durum = "POTANSİYEL HATA"
                neden = fark_nedeni(mod_anlam, kelime["meaning_tr"])
                hata_sayac += 1
            else:
                durum = "FARKLI YORUM"
                neden = fark_nedeni(mod_anlam, kelime["meaning_tr"])

            if args.sadece_hata and durum != "POTANSİYEL HATA":
                continue

            satirlar.append({
                "root":        root,
                "verse_key":   kelime["verse_key"],
                "word_index":  kelime["word_index"],
                "arabic":      kelime["arabic"],
                "meaning_tr":  kelime["meaning_tr"],
                "mod_anlam":   mod_anlam,
                "mod_sayi":    mod_sayi,
                "toplam":      toplam,
                "oran":        f"%{oran*100:.1f}",
                "durum":       durum,
                "fark_nedeni": neden,
            })

    # CSV yaz
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "root", "verse_key", "word_index", "arabic",
        "meaning_tr", "mod_anlam", "mod_sayi", "toplam",
        "oran", "durum", "fark_nedeni"
    ]
    with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(satirlar)

    # Özet
    farkli_yorum = sum(1 for s in satirlar if s["durum"] == "FARKLI YORUM")
    normal       = sum(1 for s in satirlar if s["durum"] == "NORMAL")

    print(f"\n{'='*60}")
    print(f"SONUÇ ÖZETİ")
    print(f"{'='*60}")
    print(f"  CSV satır sayısı          : {len(satirlar)}")
    print(f"  NORMAL (mod ile aynı)     : {normal}")
    print(f"  FARKLI YORUM (≥%{args.esik*100:.0f})     : {farkli_yorum}")
    print(f"  POTANSİYEL HATA (<%%{args.esik*100:.0f})  : {hata_sayac}")
    print(f"  Atlanan (min örnek <{args.min_ornek})    : {kucuk_grup} kök")
    print(f"\nCSV: {OUTPUT}")

    # Konsol: fark_nedeni dağılımı
    neden_sayac: Counter = Counter()
    for s in satirlar:
        if s["durum"] == "POTANSİYEL HATA":
            tur = s["fark_nedeni"].split("(")[0].strip()
            neden_sayac[tur] += 1

    if neden_sayac:
        print(f"\n--- POTANSİYEL HATA fark nedeni dağılımı ---")
        for neden, sayi in neden_sayac.most_common():
            print(f"  {sayi:>5}x  {neden}")

    # Konsol: ilk 30 POTANSİYEL HATA
    hatalar = [s for s in satirlar if s["durum"] == "POTANSİYEL HATA"]
    hatalar.sort(key=lambda x: (x["root"], x["verse_key"]))
    if hatalar:
        print(f"\n--- POTANSİYEL HATA örnekleri (ilk 30) ---")
        print(f"{'KÖK':<12} {'AYET':<8} {'IDX':>4}  {'ANLAM':<28} {'MOD ANLAM':<25} NEDEN")
        print("-" * 110)
        for s in hatalar[:30]:
            print(
                f"{s['root']:<12} {s['verse_key']:<8} {s['word_index']:>4}  "
                f"{s['meaning_tr']:<28} {s['mod_anlam']:<25} {s['fark_nedeni']}"
            )


if __name__ == "__main__":
    main()
