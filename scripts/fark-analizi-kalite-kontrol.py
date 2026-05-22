"""
fark_analizi kalite kontrol scripti.
Elimizdeki verilerle tespit edilebilecek hataları tarar:

  1. UZUNLUK ANOMALISI  — GERÇEK FARK ayetler için çok kısa analiz (<150 kar)
  2. TÜR UYUMSUZLUĞU   — CSV fark_turu ile analiz içeriği çelişiyor
  3. TEKRAR             — Aynı analiz metni birden fazla farklı ayette (batch karışması)
  4. BENZERLİK ÇAKIŞMA  — CSV benzerlik yüksek (>75%) ama analiz Gemini çıktısı
  5. ENCODİNG BOZUKLUĞU — Garip/bozuk karakter içeriyor
  6. KISA VARSAYILAN    — Varsayılan kategoride ama beklenen uzunluktan sapan

Çıktı: data/fark_analizi_kalite_raporu.csv
"""

import sqlite3, csv, re, sys, difflib
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH    = Path(__file__).parent.parent / "data" / "app.db"
CSV_FARK   = Path(__file__).parent.parent / "data" / "fark_analiz_sonuclari.csv"
OUTPUT     = Path(__file__).parent.parent / "data" / "fark_analizi_kalite_raporu.csv"

VARSAYILAN_METINLER = {
    "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.",
    "Kök anlamında küçük tutarsızlık var, ancak genel anlam uyumludur.",
    "Meal ile literal çeviri uyumludur, anlam farkı yoktur.",
}

ENC_RE = re.compile(r"[Ã�\x00-\x08\x0B\x0C\x0E-\x1F]|(?:Ù|Ø)[^\s]")


def encoding_sorunu(text: str) -> bool:
    return bool(ENC_RE.search(text))


def main() -> None:
    # ── CSV yükle ─────────────────────────────────────────────────────────────
    with open(CSV_FARK, encoding="utf-8-sig") as f:
        csv_rows: dict[str, dict] = {r["verse_key"]: r for r in csv.DictReader(f)}

    # ── DB yükle ──────────────────────────────────────────────────────────────
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT v.verse_key, v.fark_analizi, v.literal_ceviri,
               t.text AS meal
        FROM verses v
        LEFT JOIN translations t ON v.verse_key = t.verse_key AND t.source = 'yazir'
        WHERE v.fark_analizi IS NOT NULL AND TRIM(v.fark_analizi) != ''
        ORDER BY v.surah_id, v.ayah_number
    """)
    db_rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    # ── Tekrar tespiti için analiz metni sayacı ───────────────────────────────
    analiz_sayac: Counter = Counter(
        r["fark_analizi"] for r in db_rows
        if r["fark_analizi"] not in VARSAYILAN_METINLER
    )
    # 2+ farklı ayette geçen özgün (varsayılan olmayan) analizler
    tekrar_metinler = {metin for metin, sayi in analiz_sayac.items() if sayi >= 2}

    # ── Tarama ───────────────────────────────────────────────────────────────
    hatalar: list[dict] = []
    sayaclar: Counter = Counter()

    for row in db_rows:
        vk        = row["verse_key"]
        analiz    = row["fark_analizi"] or ""
        csv_r     = csv_rows.get(vk, {})
        csv_tur   = csv_r.get("fark_turu", "")
        benzerlik = float(csv_r.get("benzerlik_orani", 100))
        kok_uyum  = float(csv_r.get("kok_uyum_orani", 100))

        is_varsayilan = analiz.strip() in VARSAYILAN_METINLER
        is_gemini     = not is_varsayilan

        sorunlar: list[str] = []

        # 1. UZUNLUK ANOMALİSİ
        if csv_tur == "GERÇEK FARK" and is_gemini and len(analiz) < 150:
            sorunlar.append(f"KISA_GEMİNİ ({len(analiz)} kar, beklenen >150)")

        # 2. TÜR UYUMSUZLUĞU
        #    CSV=GERÇEK FARK ama analiz varsayılan mesaj
        if csv_tur == "GERÇEK FARK" and is_varsayilan:
            sorunlar.append("TÜR_UYUMSUZ: CSV=GERÇEK_FARK ama analiz=varsayılan")
        #    CSV=TUTARLI/ÜSLUP ama analiz Gemini çıktısı (uzun)
        if csv_tur in ("TUTARLI", "ÜSLUP FARKI") and is_gemini and len(analiz) > 300:
            sorunlar.append(f"TÜR_UYUMSUZ: CSV={csv_tur} ama analiz Gemini ({len(analiz)} kar)")

        # 3. TEKRAR (batch karışması)
        if is_gemini and analiz in tekrar_metinler:
            sorunlar.append(f"TEKRAR: aynı metin {analiz_sayac[analiz]} ayette")

        # 4. BENZERLİK ÇAKIŞMASI
        #    Benzerlik çok yüksek ama Gemini analizi yapılmış (muhtemelen yanlış GERÇEK FARK)
        if is_gemini and benzerlik >= 80 and csv_tur == "GERÇEK FARK":
            sorunlar.append(f"BENZERLİK_YÜKSEK: %{benzerlik:.0f} ama Gemini analizi var")

        # 5. ENCODİNG BOZUKLUĞU
        if encoding_sorunu(analiz):
            sorunlar.append("ENCODİNG_BOZUK")

        # 6. Gemini analizinde AI notu eksik (format bütünlüğü)
        if is_gemini and "ℹ️" not in analiz and len(analiz) > 200:
            sorunlar.append("AI_NOTU_EKSİK")

        if not sorunlar:
            continue

        for s in sorunlar:
            sayaclar[s.split(":")[0].split("(")[0].strip()] += 1

        hatalar.append({
            "verse_key":    vk,
            "csv_fark_turu": csv_tur,
            "benzerlik":    benzerlik,
            "analiz_uzunluk": len(analiz),
            "is_gemini":    "EVET" if is_gemini else "HAYIR",
            "sorunlar":     " | ".join(sorunlar),
            "analiz_ozet":  analiz[:120].replace("\n", " "),
        })

    # ── CSV kaydet ────────────────────────────────────────────────────────────
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["verse_key", "csv_fark_turu", "benzerlik", "analiz_uzunluk",
                  "is_gemini", "sorunlar", "analiz_ozet"]
    with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(hatalar)

    # ── Özet ─────────────────────────────────────────────────────────────────
    toplam = len(db_rows)
    print(f"\n{'='*62}")
    print(f"  FARK ANALİZİ KALİTE RAPORU")
    print(f"{'='*62}")
    print(f"  Taranan ayet    : {toplam}")
    print(f"  Sorunlu ayet    : {len(hatalar)}  (%{len(hatalar)/toplam*100:.1f})")
    print()
    print(f"  Sorun türleri:")
    for tur, sayi in sayaclar.most_common():
        print(f"    {sayi:>5}x  {tur}")
    print(f"\n  CSV: {OUTPUT}")

    # Konsol: ilk 20 sorunlu ayet
    if hatalar:
        print(f"\n{'─'*62}")
        print(f"  İlk 20 sorunlu ayet:")
        print(f"{'─'*62}")
        print(f"  {'AYET':<8} {'TÜR':<14} {'BEN%':>5} {'UZ':>4}  SORUN")
        print()
        for h in hatalar[:20]:
            print(f"  {h['verse_key']:<8} {h['csv_fark_turu']:<14} "
                  f"{h['benzerlik']:>5.1f} {h['analiz_uzunluk']:>4}  {h['sorunlar'][:50]}")
            print(f"  {'':8} {h['analiz_ozet'][:60]}")
            print()


if __name__ == "__main__":
    main()
