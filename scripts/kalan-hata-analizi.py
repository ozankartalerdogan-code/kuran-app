"""
Güncel words tablosundaki kalan hataları çok açıdan tarar.
Ayrıca SQL fix'in yanlış uyguladığı satırları da tespit eder.

Çıktılar:
  data/kalan_hatalar.csv       — tüm hata adayları
  data/yanlis_duzeltmeler.csv  — SQL fix'in bozduğu satırlar
"""

import sqlite3, csv, re, sys
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH   = Path(__file__).parent.parent / "data" / "app.db"
OUT_KALAN = Path(__file__).parent.parent / "data" / "kalan_hatalar.csv"
OUT_YANLIS = Path(__file__).parent.parent / "data" / "yanlis_duzeltmeler.csv"

# Bilinen yanlış kök→anlam eşlemeleri (kök: (yanlış_anlam, doğru_anlam))
BILINEN_YANLIS = {
    "عرش": ("çatıları",  "taht, arş"),
    "سمو": ("gökler",    "adıyla"),    # بسم kelimesi سمو köküne atanmış ama "adıyla" doğruydu
    "ملك": ("melek",     None),        # مالك = sahip ≠ مَلَك = melek
}

# Fiil anlamı büyük harfle başlıyorsa tutarsızlık (Türkçede fiil küçük başlar)
BUYUK_FIIL_ISTISNALAR = {
    "Allah", "İman etti", "İşte o", "İçinde", "Elif", "Lam", "Mim",
    "Nun", "Ha", "Ayn", "Sin", "Kaf", "Musa", "İbrahim", "Nuh",
    "İsa", "Süleyman", "Davud", "Yakup", "Yusuf", "Yunus", "Lot",
    "Zekeriya", "Yahya", "Hud", "Salih", "Şuayb", "İdris", "Zülkifl",
    "O (kadın)", "O (erkek)", "Ay (zaman)", "Ne kadar",
}

def normalize(t):
    return t.lower().strip() if t else ""


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Tüm kelimeler
    cur.execute("""
        SELECT w.verse_key, w.word_index, w.arabic, w.root,
               w.pos, w.meaning_tr,
               b.meaning_tr AS eski_anlam
        FROM words w
        LEFT JOIN words_backup_meaning b
               ON w.verse_key = b.verse_key AND w.word_index = b.word_index
        ORDER BY w.verse_key, w.word_index
    """)
    rows = [dict(r) for r in cur.fetchall()]

    # Kök → (anlam, sayı) haritası
    kok_sayac: dict[str, Counter] = defaultdict(Counter)
    for r in rows:
        if r["root"] and r["meaning_tr"]:
            kok_sayac[r["root"]][normalize(r["meaning_tr"])] += 1

    hatalar   = []   # kalan hatalar
    yanlis_dz = []   # SQL fix'in bozduğu satırlar

    for r in rows:
        verse_key  = r["verse_key"]
        word_index = r["word_index"]
        arabic     = r["arabic"]
        root       = r["root"] or ""
        meaning_tr = r["meaning_tr"] or ""
        eski_anlam = r["eski_anlam"] or ""
        pos        = r["pos"] or ""

        m_norm = normalize(meaning_tr)
        e_norm = normalize(eski_anlam)
        degisti = (meaning_tr != eski_anlam) and eski_anlam

        hata_tipleri = []

        # ── 1. Bilinen yanlış kök→anlam ──────────────────────────────
        if root in BILINEN_YANLIS:
            yanlis, dogru = BILINEN_YANLIS[root]
            if yanlis and m_norm == normalize(yanlis):
                hata_tipleri.append(f"BİLİNEN YANLIŞ KÖK ANLAMI (doğrusu: {dogru or '?'})")

        # ── 2. SQL fix yanlış düzeltti ────────────────────────────────
        if degisti:
            # Eski anlam daha doğruydu mu? Kök modundan sapıyor mu?
            if root and kok_sayac[root]:
                toplam = sum(kok_sayac[root].values())
                mod_norm, mod_cnt = kok_sayac[root].most_common(1)[0]
                yeni_oran = kok_sayac[root][m_norm] / toplam
                eski_oran = kok_sayac[root][e_norm] / toplam if e_norm else 0

                # Eğer yeni anlam modun kendisiyse normal; ama mod yanlışsa problem
                if m_norm == mod_norm and root in BILINEN_YANLIS:
                    # Kökün modu yanlış — fix hatalı uygulandı
                    yanlis_dz.append({
                        "verse_key":  verse_key,
                        "word_index": word_index,
                        "arabic":     arabic,
                        "root":       root,
                        "eski_anlam": eski_anlam,
                        "yeni_anlam": meaning_tr,
                        "neden":      f"Kök modu yanlış ({root} kökünün modu '{meaning_tr}' ama doğrusu farklı)",
                    })

        # ── 3. Kök tutarsızlığı (güncelleme sonrası kalan) ───────────
        if root and root not in BILINEN_YANLIS and kok_sayac[root]:
            toplam = sum(kok_sayac[root].values())
            if toplam >= 3:
                mod_norm, mod_cnt = kok_sayac[root].most_common(1)[0]
                oran = kok_sayac[root][m_norm] / toplam
                if m_norm != mod_norm and oran < 0.10:
                    mod_orijinal = next(
                        (rr["meaning_tr"] for rr in rows
                         if rr["root"] == root and normalize(rr["meaning_tr"]) == mod_norm),
                        mod_norm
                    )
                    hata_tipleri.append(
                        f"KÖK TUTARSIZLIĞI (%{oran*100:.0f}, mod='{mod_orijinal}' {mod_cnt}/{toplam})"
                    )

        # ── 4. Çok uzun anlam (>50 kar) ──────────────────────────────
        if len(meaning_tr) > 50:
            hata_tipleri.append(f"ÇOK UZUN ({len(meaning_tr)} kar) — virgülle birleştirilmiş?")

        # ── 5. Sistem metni karışmış ──────────────────────────────────
        if re.search(r"Kök (bilgisi|yok)|Bu kelime kök|kısmi veri", meaning_tr, re.I):
            hata_tipleri.append("SİSTEM METNİ KARIŞMIŞ")

        # ── 6. Büyük harfle başlayan şüpheli fiil ─────────────────────
        if (meaning_tr and meaning_tr[0].isupper()
                and meaning_tr not in BUYUK_FIIL_ISTISNALAR
                and pos in ("V", "fiil", "VERB", "")):
            hata_tipleri.append(f"BÜYÜK HARFLE BAŞLIYOR (pos={pos})")

        # ── 7. Anlam ile köküne ait açıklamayı karıştırma ─────────────
        # "kökünden sökülmek", "kökü" gibi metaforik kök kelimeleri
        if "kökünden" in m_norm or m_norm in ("kök",):
            # Gerçekten kök/bitki anlamı mı yoksa sistem metni mi?
            # root kontrolüyle ayırt et
            if root not in ("جذر", "أصل", "شجر", "نبت"):
                hata_tipleri.append("'KÖK' METİN KARIŞIKLIĞI — kontrol et")

        if hata_tipleri:
            hatalar.append({
                "verse_key":   verse_key,
                "word_index":  word_index,
                "arabic":      arabic,
                "root":        root,
                "meaning_tr":  meaning_tr,
                "eski_anlam":  eski_anlam,
                "pos":         pos,
                "hata_tipi":   " | ".join(hata_tipleri),
            })

    # ── CSV kaydet ────────────────────────────────────────────────────
    fn_kalan = ["verse_key","word_index","arabic","root","meaning_tr","eski_anlam","pos","hata_tipi"]
    with open(OUT_KALAN, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn_kalan)
        w.writeheader(); w.writerows(hatalar)

    fn_yanlis = ["verse_key","word_index","arabic","root","eski_anlam","yeni_anlam","neden"]
    with open(OUT_YANLIS, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn_yanlis)
        w.writeheader(); w.writerows(yanlis_dz)

    # ── Özet ──────────────────────────────────────────────────────────
    tip_sayac: Counter = Counter()
    for h in hatalar:
        for tip in h["hata_tipi"].split(" | "):
            tip_sayac[tip.split("(")[0].strip()] += 1

    print(f"\n{'='*62}")
    print(f"KALAN HATA ANALİZİ")
    print(f"{'='*62}")
    print(f"  Toplam hata adayı       : {len(hatalar)}")
    print(f"  Yanlış düzeltme (SQL)   : {len(yanlis_dz)}")
    print()
    print(f"  Hata tipi dağılımı:")
    for tip, sayi in tip_sayac.most_common():
        print(f"    {sayi:>5}x  {tip}")

    print(f"\n  CSV: {OUT_KALAN}")
    print(f"  CSV: {OUT_YANLIS}")

    # Konsol: bilinen yanlış kök örnekleri
    bilinen = [h for h in hatalar if "BİLİNEN YANLIŞ" in h["hata_tipi"]]
    if bilinen:
        print(f"\n--- BİLİNEN YANLIŞ KÖK ANLAMI ({len(bilinen)} adet) ---")
        by_root: dict[str, list] = defaultdict(list)
        for h in bilinen:
            by_root[h["root"]].append(h)
        for root, items in by_root.items():
            print(f"\n  Kök: {root}  ({len(items)} kelime)")
            for h in items[:5]:
                print(f"    {h['verse_key']:<8} #{h['word_index']:>2}  {h['arabic']:<22} {h['meaning_tr']}")
            if len(items) > 5:
                print(f"    ... ve {len(items)-5} adet daha")

    # Konsol: kök tutarsızlığı örnekleri
    tutarsiz = [h for h in hatalar if "KÖK TUTARSIZLIĞI" in h["hata_tipi"]]
    if tutarsiz:
        print(f"\n--- KÖK TUTARSIZLIĞI KALANLARI (ilk 15) ---")
        print(f"{'AYET':<8} {'IDX':>3}  {'KÖK':<12} {'ANLAM':<28} HATA")
        print("-" * 80)
        for h in tutarsiz[:15]:
            print(f"{h['verse_key']:<8} {h['word_index']:>3}  {h['root']:<12} {h['meaning_tr']:<28} {h['hata_tipi'][:35]}")

    conn.close()


if __name__ == "__main__":
    main()
