"""
Fark analizlerinin kapsamlı son kontrolü.
UI'ye yansıyan tüm veri kaynaklarını kullanır:

  1. YAPISAL      — encoding, uzunluk, AI notu eksikliği
  2. ÇOK KAYNAK   — 5 mealin ortalamasıyla benzerlik (sadece diyanet değil)
  3. CSV UYUMU    — fark_turu vs analiz metni tutarsızlığı
  4. KÖK DOĞRULA  — analizde geçen Arapça köklerin root_meanings ile çapraz kontrolü
  5. COVERAGE     — fidelity_signals coverage_ratio düşükse analiz bunu belirtiyor mu?
  6. HAM ANLAM    — ham_anlam_ozeti ile literal farkı, analizde bahsedilmiş mi?
  7. TEKRAR       — aynı analiz birden fazla ayette (batch karışması)

Çıktı: data/kapsamli_fark_kontrol.csv
"""

import sqlite3, csv, re, difflib, sys, unicodedata
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH  = Path(__file__).parent.parent / "data" / "app.db"
CSV_FARK = Path(__file__).parent.parent / "data" / "fark_analiz_sonuclari.csv"
OUTPUT   = Path(__file__).parent.parent / "data" / "kapsamli_fark_kontrol.csv"

KAYNAKLAR = ["yazir", "diyanet", "vakfi", "ozturk", "bulac"]

VARSAYILAN = {
    "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.",
    "Kök anlamında küçük tutarsızlık var, ancak genel anlam uyumludur.",
    "Meal ile literal çeviri uyumludur, anlam farkı yoktur.",
}

ENC_RE = re.compile(r"[Ã\x00-\x08\x0B\x0C\x0E-\x1F]|(?:Ù|Ø)[^\s]")

_AKSAN = str.maketrans("âîûÂÎÛ", "aiuAIU")

def norm(t):
    if not t: return ""
    t = t.lower().replace("i̇","i").translate(_AKSAN)
    t = re.sub(r"[«»\"\'.,;:!?\(\)\[\]…\-–—/\\]"," ",t)
    return re.sub(r"\s+"," ",t).strip()

def tokenize(t): return [x for x in norm(t).split() if len(x)>=3]

def benzerlik(a, b):
    na,nb = norm(a),norm(b)
    if not na or not nb: return 0.0
    cr = difflib.SequenceMatcher(None,na,nb).ratio()
    sa,sb = set(tokenize(a)),set(tokenize(b))
    jac = len(sa&sb)/len(sa|sb) if sa or sb else 0.0
    return (cr+jac)/2

def cok_kaynak_benzerlik(literal, meal_map):
    """5 kaynağın ortalaması."""
    oranlar = [benzerlik(literal, m) for m in meal_map.values() if m]
    return sum(oranlar)/len(oranlar) if oranlar else 0.0

def farkli_tokenlar(literal, meal, esik=5):
    tl = {t for t in tokenize(literal) if len(t)>=esik}
    tm = {t for t in tokenize(meal) if len(t)>=esik}
    return sorted(tm - tl)[:6]

# ── Veri yükleme ─────────────────────────────────────────────────────────────

def load_csv():
    if not CSV_FARK.exists(): return {}
    with open(CSV_FARK, encoding="utf-8-sig") as f:
        return {r["verse_key"]: r for r in csv.DictReader(f)}

def load_root_meanings(conn):
    cur = conn.cursor()
    cur.execute("SELECT root, meaning_tr FROM root_meanings WHERE meaning_tr IS NOT NULL")
    rm = defaultdict(list)
    for root, m in cur.fetchall():
        rm[root.strip()].append(m.lower())
    return rm

def load_fidelity(conn):
    cur = conn.cursor()
    cur.execute("""SELECT verse_key, note FROM fidelity_signals
                   WHERE signal_type='coverage_ratio'""")
    sonuc = {}
    for vk, note in cur.fetchall():
        m = re.search(r"coverage_ratio=([\d.]+)", note or "")
        if m: sonuc[vk] = float(m.group(1))
    return sonuc

# ── Kontrol fonksiyonları ────────────────────────────────────────────────────

def kontrol_yapisal(analiz):
    sorunlar = []
    if ENC_RE.search(analiz):
        sorunlar.append("ENCODİNG_BOZUK")
    is_varsayilan = analiz.strip() in VARSAYILAN
    is_gemini = not is_varsayilan
    if is_gemini and len(analiz) < 120:
        sorunlar.append(f"KISA_GEMİNİ({len(analiz)}kar)")
    if is_gemini and len(analiz) > 200 and "ℹ️" not in analiz:
        sorunlar.append("AI_NOTU_EKSİK")
    return sorunlar

def kontrol_csv_uyumu(csv_tur, analiz):
    sorunlar = []
    al = analiz.lower()
    fark_yok_ifade = any(x in al for x in [
        "anlam farkı yoktur","anlam bütünlüğü korunmuş",
        "fark bulunmamaktadır","fark yoktur","uyumludur",
    ])
    is_varsayilan = analiz.strip() in VARSAYILAN
    if csv_tur == "GERÇEK FARK" and (fark_yok_ifade or is_varsayilan):
        sorunlar.append("CSV_UYUMSUZ:GERCEK_FARK+analiz_fark_yok")
    if csv_tur in ("TUTARLI","ÜSLUP FARKI") and not is_varsayilan and len(analiz) > 300:
        sorunlar.append(f"CSV_UYUMSUZ:{csv_tur}+uzun_gemini")
    return sorunlar

def kontrol_cok_kaynak(literal, meal_map, csv_tur, analiz):
    """5 kaynak ortalamasıyla benzerlik; yüksek fakat GERÇEK FARK → şüpheli."""
    ort = cok_kaynak_benzerlik(literal, meal_map)
    sorunlar = []
    is_varsayilan = analiz.strip() in VARSAYILAN
    if csv_tur == "GERÇEK FARK" and not is_varsayilan and ort > 0.70:
        sorunlar.append(f"YUK_BENZERLIK_5K(%{ort*100:.0f})")
    return sorunlar, round(ort*100, 1)

def kontrol_kok_dogrulama(analiz, kelimeler, rm):
    """Analizde geçen kök etiketlerinin root_meanings ile tutarsız olup olmadığı."""
    sorunlar = []
    kok_set = {k["root"] for k in kelimeler if k["root"]}
    al = analiz.lower()
    for root in kok_set:
        rm_anlamlar = rm.get(root, [])
        if not rm_anlamlar: continue
        # Kök analizde geçiyor mu?
        root_lower = root
        if root_lower not in al: continue
        # Kök geçiyor; rm anlamlarından en az biri analizde var mı?
        esleyen = any(any(parca in al for parca in m.split(",")) for m in rm_anlamlar)
        if not esleyen:
            sorunlar.append(f"KÖK_CONTEXT_ZAYIF({root})")
            break   # en fazla 1 tane raporla
    return sorunlar[:1]

def kontrol_coverage(vk, coverage_map, analiz):
    """Coverage < 0.6 ama analiz bunu belirtmiyor → EKSİK BAĞLAM."""
    coverage = coverage_map.get(vk, 1.0)
    sorunlar = []
    if coverage < 0.60 and analiz.strip() in VARSAYILAN:
        sorunlar.append(f"DUSUK_COVERAGE(%{coverage*100:.0f})+varsayilan_analiz")
    return sorunlar

def kontrol_ham_anlam(ham, literal, analiz):
    """Ham anlam ile literal arasında ciddi fark ama analizde bahsedilmemiş."""
    sorunlar = []
    ben = benzerlik(ham, literal)
    al  = analiz.lower()
    farkli = farkli_tokenlar(ham, literal, esik=5)
    if ben < 0.25 and farkli and analiz.strip() in VARSAYILAN:
        sorunlar.append(f"HAM_LITERAL_FARK(%{ben*100:.0f})+varsayilan")
    return sorunlar

def kontrol_tekrar(analiz, tekrar_set):
    if analiz.strip() in VARSAYILAN: return []
    if analiz in tekrar_set:
        return ["TEKRAR_ANALIZ"]
    return []

# ── Ana akış ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--sadece-sorunlu", action="store_true")
    parser.add_argument("--surah", type=int, default=None)
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    csv_harita  = load_csv()
    rm          = load_root_meanings(conn)
    coverage    = load_fidelity(conn)

    # Ayetler
    q = """
        SELECT v.verse_key, v.fark_analizi, v.literal_ceviri, v.ham_anlam_ozeti,
               v.surah_id, v.ayah_number
        FROM verses v
        WHERE v.fark_analizi IS NOT NULL AND TRIM(v.fark_analizi) != ''
    """
    params = []
    if args.surah:
        q += " AND v.surah_id=?"; params.append(args.surah)
    q += " ORDER BY v.surah_id, v.ayah_number"
    cur.execute(q, params)
    ayetler = [dict(r) for r in cur.fetchall()]

    # 5 meal kaynağı toplu yükle
    vks = [a["verse_key"] for a in ayetler]
    yer = ",".join("?"*len(vks))
    cur.execute(
        f"SELECT verse_key, source, text FROM translations WHERE verse_key IN ({yer})",
        vks
    )
    meal_harita: dict[str,dict] = defaultdict(dict)
    for vk, src, txt in cur.fetchall():
        if src in KAYNAKLAR and txt:
            meal_harita[vk][src] = txt

    # Kelimeler
    cur.execute(
        f"SELECT verse_key, root, meaning_tr FROM words "
        f"WHERE verse_key IN ({yer}) AND meaning_tr IS NOT NULL ORDER BY verse_key, word_index",
        vks
    )
    kelime_harita: dict[str, list] = defaultdict(list)
    for vk, root, mt in cur.fetchall():
        kelime_harita[vk].append({"root": root, "meaning_tr": mt})
    conn.close()

    # Tekrar tespiti
    analiz_sayac = Counter(
        a["fark_analizi"] for a in ayetler
        if a["fark_analizi"].strip() not in VARSAYILAN
    )
    tekrar_set = {m for m, c in analiz_sayac.items() if c >= 2}

    # ── Tarama ───────────────────────────────────────────────────────────────
    satirlar = []
    sayaclar: Counter = Counter()

    for a in ayetler:
        vk      = a["verse_key"]
        analiz  = a["fark_analizi"] or ""
        literal = a["literal_ceviri"] or ""
        ham     = a["ham_anlam_ozeti"] or ""
        csv_r   = csv_harita.get(vk, {})
        csv_tur = csv_r.get("fark_turu", "")
        meals   = meal_harita.get(vk, {})
        kelimeler = kelime_harita.get(vk, [])

        sorunlar: list[str] = []

        sorunlar += kontrol_yapisal(analiz)
        sorunlar += kontrol_csv_uyumu(csv_tur, analiz)
        s, ort_ben = kontrol_cok_kaynak(literal, meals, csv_tur, analiz)
        sorunlar += s
        sorunlar += kontrol_kok_dogrulama(analiz, kelimeler, rm)
        sorunlar += kontrol_coverage(vk, coverage, analiz)
        sorunlar += kontrol_ham_anlam(ham, literal, analiz)
        sorunlar += kontrol_tekrar(analiz, tekrar_set)

        for s in sorunlar:
            sayaclar[s.split("(")[0].split(":")[0].strip()] += 1

        if not sorunlar:
            if args.sadece_sorunlu: continue
            kontrol = "TEMİZ"; aciklama = "—"
        else:
            kontrol  = " | ".join(sorunlar)
            aciklama = kontrol

        satirlar.append({
            "verse_key":      vk,
            "csv_fark_turu":  csv_tur,
            "ort_benzerlik":  ort_ben,
            "coverage":       round(coverage.get(vk, 1.0)*100, 1),
            "analiz_uzunluk": len(analiz),
            "is_varsayilan":  "E" if analiz.strip() in VARSAYILAN else "H",
            "kontrol_sonucu": kontrol[:120],
            "analiz_ozet":    analiz[:150].replace("\n"," "),
            "literal_ozet":   literal[:100],
            "meal_ozet":      (meals.get("diyanet") or "")[:100],
        })

    # CSV kaydet
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fn = ["verse_key","csv_fark_turu","ort_benzerlik","coverage","analiz_uzunluk",
          "is_varsayilan","kontrol_sonucu","analiz_ozet","literal_ozet","meal_ozet"]
    with open(OUTPUT,"w",newline="",encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn)
        w.writeheader(); w.writerows(satirlar)

    toplam = len(ayetler)
    sorunlu_sayisi = sum(1 for s in satirlar if s["kontrol_sonucu"] != "TEMİZ")

    print(f"\n{'='*65}")
    print(f"  KAPSAMLI FARK ANALİZİ KALİTE KONTROLÜ")
    print(f"{'='*65}")
    print(f"  Kullanılan kaynaklar:")
    print(f"    ✓ verses.fark_analizi + literal_ceviri + ham_anlam_ozeti")
    print(f"    ✓ translations (5 kaynak: yazir/diyanet/vakfi/ozturk/bulac)")
    print(f"    ✓ words (kök + meaning_tr)")
    print(f"    ✓ root_meanings (1.713 kök)")
    print(f"    ✓ fidelity_signals (coverage_ratio)")
    print(f"    ✓ fark_analiz_sonuclari.csv")
    print(f"\n  Taranan ayet    : {toplam}")
    print(f"  Sorunlu ayet    : {sorunlu_sayisi}  (%{sorunlu_sayisi/toplam*100:.1f})")
    print(f"\n  Sorun türleri:")
    for tur, sayi in sayaclar.most_common():
        print(f"    {sayi:>5}x  {tur}")
    print(f"\n  CSV: {OUTPUT}")

    sorunlular = [s for s in satirlar if s["kontrol_sonucu"] != "TEMİZ"]
    sorunlular.sort(key=lambda x: x["ort_benzerlik"])
    if sorunlular:
        print(f"\n{'─'*65}")
        print(f"  İlk 20 sorunlu ayet (ort. benzerliğe göre):")
        print(f"{'─'*65}")
        for s in sorunlular[:20]:
            print(f"  {s['verse_key']:<8} {s['csv_fark_turu']:<14} "
                  f"B%{s['ort_benzerlik']:>5.1f} Cov%{s['coverage']:>4.0f}  "
                  f"{s['kontrol_sonucu'][:40]}")
            print(f"  {'':8} {s['analiz_ozet'][:60]}")
            print()

if __name__ == "__main__":
    main()
