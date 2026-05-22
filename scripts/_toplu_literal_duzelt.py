"""
Literal çeviri toplu düzeltme scripti.
Kurallar:
  1. Sinonim çiftleri tekleştir
  2. Mastar kalıplarını çekimli fiile çevir
  3. 1. tekil → 1. çoğul (Allah öznesi)
  4. Soru yapılarını düzelt
  5. fark_turu etiketlerini güncelle (CSV)
  6. Edat fazlalıklarını temizle
"""

import sqlite3, csv, re, sys
from pathlib import Path
from copy import deepcopy

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH      = Path(__file__).parent.parent / "data" / "app.db"
FARK_CSV     = Path(__file__).parent.parent / "data" / "fark_analiz_sonuclari.csv"
KONTROL_CSV  = Path(__file__).parent.parent / "data" / "kapsamli_fark_kontrol.csv"


# ── Kural 1: Sinonim çiftleri ─────────────────────────────────────────────────

SINONIM_CIFTI = [
    (r"\battı,\s*bıraktı\b",        "attı"),
    (r"\bbıraktı,\s*attı\b",        "attı"),
    (r"\bkıldı,\s*yaptı\b",         "kıldı"),
    (r"\byaptı,\s*kıldı\b",         "kıldı"),
    (r"\büzerine,\s*üstüne\b",      "üzerine"),
    (r"\büstüne,\s*üzerine\b",      "üzerine"),
    (r"\bokudu,\s*takip\s+etti\b",  "okudu"),
    (r"\btakip\s+etti,\s*okudu\b",  "okudu"),
    (r"\bgeldi,\s*getirdi\b",       "geldi"),
    (r"\bgetirdi,\s*geldi\b",       "geldi"),
    (r"\bder,\s*dedi\b",            "dedi"),
    (r"\bdedi,\s*der\b",            "dedi"),
    (r"\boldunuz,\s*idiniz\b",      "oldunuz"),
    (r"\bidiniz,\s*oldunuz\b",      "oldunuz"),
    (r"\bgeldi,\s*getirildi\b",     "geldi"),
]


# ── Kural 2: Mastar → çekimli fiil ───────────────────────────────────────────

MASTAR_DONUSUM = [
    (r"\byemin\s+etmek\b",  "yemin eder"),
    (r"\bgirişmek\b",        "girişti"),
    (r"\bbırakmak\b",        "bıraktı"),
    (r"\bsormak\b",          "sordu"),
    (r"\bdilemek\b",         "diledi"),
    (r"\bsöylemek\b",        "söyledi"),
    (r"\bgelmek\b",          "geldi"),
    (r"\bgitmek\b",          "gitti"),
    (r"\byapmak\b",          "yaptı"),
    (r"\betmek\b",           "etti"),
    (r"\bolmak\b",           "oldu"),
]


# ── Kural 3: 1. tekil → 1. çoğul ─────────────────────────────────────────────

SAHIS_DUZELT = [
    (r"\bben\s+indirir\b",   "Biz indiririz"),
    (r"\bben\s+yaratır\b",   "Biz yaratırız"),
    (r"\bben\s+gönderir\b",  "Biz göndeririz"),
    (r"\bben\s+yarattım\b",  "Biz yarattık"),
    (r"\bben\s+indirdim\b",  "Biz indirdik"),
    (r"\bben\s+gönderdim\b", "Biz gönderdik"),
]


# ── Kural 4: Soru yapıları ────────────────────────────────────────────────────

SORU_DUZELT = [
    (r"mı\?\s*\(soru\)\s*(\w+)",  r"\1 mı?"),
    (r"mi\?\s*\(soru\)\s*(\w+)",  r"\1 mi?"),
    (r"mu\?\s*\(soru\)\s*(\w+)",  r"\1 mu?"),
    (r"mü\?\s*\(soru\)\s*(\w+)",  r"\1 mü?"),
    (r"\(soru\)\s*(\w+)",          r"\1 mı?"),
]


# ── Kural 6: Edat fazlalıkları ────────────────────────────────────────────────

EDAT_TEMIZLE = [
    (r"\bhakkında,\s*-den\b",       "hakkında"),
    (r"\b-den,\s*hakkında\b",       "hakkında"),
    (r"\biçinde\s+içinde\b",        "içinde"),
    (r"\büzerine\s+üzerine\b",      "üzerine"),
    (r"\bile\s+beraber\s+ile\b",    "ile"),
    (r"\bve\s+ve\b",                "ve"),
]


# ── Uygulama ──────────────────────────────────────────────────────────────────

def uygula_kurallar(metin: str) -> str:
    if not metin:
        return metin
    for pattern, yeni in SINONIM_CIFTI:
        metin = re.sub(pattern, yeni, metin, flags=re.IGNORECASE)
    for pattern, yeni in MASTAR_DONUSUM:
        metin = re.sub(pattern, yeni, metin, flags=re.IGNORECASE)
    for pattern, yeni in SAHIS_DUZELT:
        metin = re.sub(pattern, yeni, metin, flags=re.IGNORECASE)
    for pattern, yeni in SORU_DUZELT:
        metin = re.sub(pattern, yeni, metin)
    for pattern, yeni in EDAT_TEMIZLE:
        metin = re.sub(pattern, yeni, metin, flags=re.IGNORECASE)
    return metin.strip()


# ── Ana akış ──────────────────────────────────────────────────────────────────

def main():
    # Sorunlu ayetleri kontrol CSV'den al
    with open(KONTROL_CSV, encoding="utf-8-sig") as f:
        kontrol_rows = {r["verse_key"]: r for r in csv.DictReader(f)}

    sorunlu_vks = list(kontrol_rows.keys())

    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Literal çevirileri yükle (sadece sorunlu ayetler)
    yer = ",".join("?" * len(sorunlu_vks))
    cur.execute(
        f"SELECT verse_key, literal_ceviri FROM verses WHERE verse_key IN ({yer})",
        sorunlu_vks
    )
    verses = {r[0]: r[1] for r in cur.fetchall()}

    # Kuralları uygula
    degisen       = []
    degismeyen    = 0
    kural_sayaci  = {
        "sinonim": 0, "mastar": 0, "sahis": 0,
        "soru": 0, "edat": 0,
    }

    for vk, eski in verses.items():
        if not eski:
            continue

        yeni = eski
        adim = {}

        # Her kuralı ayrı ayrı izle
        sonra = eski
        for p, r in SINONIM_CIFTI:
            sonra = re.sub(p, r, sonra, flags=re.IGNORECASE)
        if sonra != yeni:
            adim["sinonim"] = True
            kural_sayaci["sinonim"] += 1
        yeni = sonra

        sonra = yeni
        for p, r in MASTAR_DONUSUM:
            sonra = re.sub(p, r, sonra, flags=re.IGNORECASE)
        if sonra != yeni:
            adim["mastar"] = True
            kural_sayaci["mastar"] += 1
        yeni = sonra

        sonra = yeni
        for p, r in SAHIS_DUZELT:
            sonra = re.sub(p, r, sonra, flags=re.IGNORECASE)
        if sonra != yeni:
            adim["sahis"] = True
            kural_sayaci["sahis"] += 1
        yeni = sonra

        sonra = yeni
        for p, r in SORU_DUZELT:
            sonra = re.sub(p, r, sonra)
        if sonra != yeni:
            adim["soru"] = True
            kural_sayaci["soru"] += 1
        yeni = sonra

        sonra = yeni
        for p, r in EDAT_TEMIZLE:
            sonra = re.sub(p, r, sonra, flags=re.IGNORECASE)
        if sonra != yeni:
            adim["edat"] = True
            kural_sayaci["edat"] += 1
        yeni = sonra

        if yeni != eski:
            degisen.append((vk, eski, yeni, adim))
        else:
            degismeyen += 1

    # DB'ye yaz
    for vk, _, yeni, _ in degisen:
        cur.execute("UPDATE verses SET literal_ceviri=? WHERE verse_key=?", (yeni, vk))
    conn.commit()
    conn.close()

    # ── Kural 5: fark_turu CSV güncellemesi ──────────────────────────────────

    with open(FARK_CSV, encoding="utf-8-sig") as f:
        fark_rows = list(csv.DictReader(f))

    fark_map = {r["verse_key"]: r for r in fark_rows}
    fark_degisen = []

    for vk, kontrol in kontrol_rows.items():
        row = fark_map.get(vk)
        if not row:
            continue

        eski_tur = row["fark_turu"]
        analiz   = kontrol.get("analiz_ozet", "").lower()
        ort_ben  = float(kontrol.get("ort_benzerlik", 0) or 0)

        yeni_tur = eski_tur
        neden    = ""

        if eski_tur == "GERÇEK FARK":
            if ort_ben >= 70:
                yeni_tur = "ÜSLUP FARKI"
                neden    = f"ort_benzerlik=%{ort_ben:.0f}"
            elif any(x in analiz for x in ["anlam farkı yoktur", "sadece üslup farkı", "anlam farkı yok", "uyumludur"]):
                yeni_tur = "ÜSLUP FARKI"
                neden    = "analiz_ozet fark_yok diyor"

        if yeni_tur != eski_tur:
            fark_degisen.append((vk, eski_tur, yeni_tur, neden))
            row["fark_turu"] = yeni_tur

    fieldnames = list(fark_rows[0].keys())
    with open(FARK_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(fark_rows)

    # ── Rapor ────────────────────────────────────────────────────────────────

    print(f"\n{'='*65}")
    print(f"  TOPLU LİTERAL DÜZELTİCİ — RAPOR")
    print(f"{'='*65}")
    print(f"\n  Taranan sorunlu ayet  : {len(sorunlu_vks)}")
    print(f"  Literal değişen       : {len(degisen)}")
    print(f"  Değişmeyen            : {degismeyen}")
    print(f"\n  Kural bazlı dağılım:")
    for k, v in kural_sayaci.items():
        print(f"    Kural {k:<10}: {v} ayet")

    print(f"\n  fark_turu değişen     : {len(fark_degisen)}")
    for vk, eski, yeni, neden in fark_degisen[:20]:
        print(f"    {vk:<10} {eski} → {yeni}  ({neden})")
    if len(fark_degisen) > 20:
        print(f"    ... ve {len(fark_degisen)-20} ayet daha")

    # Manuel müdahale gerektirenler: çok kısa veya hâlâ anlamsız
    manuel = []
    for vk, eski, yeni, adim in degisen:
        if len(yeni.split()) <= 3 and len(yeni) < 25:
            manuel.append((vk, yeni, "ÇOK KISA"))
        elif re.search(r"\b(mı\?|mi\?|mu\?|mü\?)\s*\(soru\)", yeni):
            manuel.append((vk, yeni, "SORU YAPISINDA KALINTI"))
        elif re.search(r"\d+\s*\.\s*(tekil|çoğul)", yeni, re.IGNORECASE):
            manuel.append((vk, yeni, "ŞAHIS ETİKETİ KALDI"))

    print(f"\n  Manuel müdahale gerekenler: {len(manuel)}")
    for vk, metin, neden in manuel[:15]:
        print(f"    {vk:<10} [{neden}]  {metin[:70]}")

    print(f"\n  İlk 30 değişen ayet (özet):")
    print(f"  {'AYET':<10} {'ESKİ':<50} {'YENİ'}")
    print(f"  {'-'*10} {'-'*50} {'-'*50}")
    for vk, eski, yeni, adim in degisen[:30]:
        print(f"  {vk:<10} {eski[:50]:<50} {yeni[:50]}")

    print()


if __name__ == "__main__":
    main()
