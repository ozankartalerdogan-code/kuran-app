"""
Üretilen fark analizlerinin doğruluğunu offline kontrol eder.

3 kontrol katmanı:
  A) YANLIŞ POZİTİF   — fark_analizi metni "fark var" diyor ama metrikler tutarlı
  B) KAÇIRILAN FARK   — ÜSLUP FARKI işaretli ama metrikler ciddi fark gösteriyor
  C) EKSİK ANALİZ     — literal↔meal arası kritik kelimeler analizde geçmiyor

Ek: Kritik teolojik terimlerin root_meanings ile tutarsız kullanımı

Çıktı: data/fark_analizi_kontrol.csv

Kullanım:
  python scripts/fark-analizi-dogruluk-kontrol.py
  python scripts/fark-analizi-dogruluk-kontrol.py --surah 2
  python scripts/fark-analizi-dogruluk-kontrol.py --sadece-sorunlu
"""

import sqlite3, csv, re, difflib, argparse, sys, unicodedata
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH  = Path(__file__).parent.parent / "data" / "app.db"
CSV_FARK = Path(__file__).parent.parent / "data" / "fark_analiz_sonuclari.csv"
OUTPUT   = Path(__file__).parent.parent / "data" / "fark_analizi_kontrol.csv"

# Eşikler
ESIK_BENZERLIK_YUKSEK = 0.72   # üstü → "literal≈meal"
ESIK_BENZERLIK_DUSUK  = 0.32   # altı  → "ciddi fark"
ESIK_KOK_UYUM_IYI    = 0.55   # üstü → "kökler tutarlı"
ESIK_KOK_UYUM_ZAYIF  = 0.28   # altı  → "kök sapması var"

# Fark analizinde "fark yok" bildiren ifadeler
FAR_YOK_IFADELER = [
    "anlam farkı yoktur", "anlam bütünlüğü korunmuş", "uyumludur",
    "anlam farkı bulunmamaktadır", "anlam farkı yok", "fark yoktur",
]

# Fark analizinde "fark var" bildiren ifadeler
FAR_VAR_IFADELER = [
    "anlam farkı var", "farklı", "fark", "sapma", "daha geniş", "daha dar",
    "eklenmiş", "çıkarılmış", "yorumlanmış", "tefsirsel",
]

# Teolojik kritik terimler → root_meanings'ten doğrulanacak
KRITIK_TERIMLER = {
    "veli": ["koruyucu", "dost", "yardımcı", "wali"],
    "kayyum": ["yöneten", "ayakta tutan", "kendi kendine var"],
    "rahman": ["merhamet", "esirgeyen"],
    "rahim": ["merhamet", "bağışlayan"],
    "hidayet": ["doğru yol", "rehberlik"],
    "takva": ["sakınma", "korunma", "Allah'tan korkma"],
    "iman": ["inanma", "güven"],
    "küfür": ["inkâr", "nankörlük"],
    "zulüm": ["haksızlık", "zalimlik"],
    "fitne": ["kargaşa", "sınama", "bela"],
    "tevbe": ["dönüş", "pişmanlık"],
    "şükür": ["teşekkür", "minnet"],
    "sabır": ["dayanma", "tahammül"],
}


# ── Metin araçları ────────────────────────────────────────────────────────────

_AKSAN = str.maketrans("âîûÂÎÛ", "aiuAIU")

def norm(text: str) -> str:
    if not text:
        return ""
    t = text.lower().replace("i̇", "i").translate(_AKSAN)
    t = re.sub(r"[«»\"\'.,;:!?\(\)\[\]…\-–—/\\]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def tokenize(text: str) -> list[str]:
    return [t for t in norm(text).split() if len(t) >= 3]


def benzerlik_hesapla(a: str, b: str) -> float:
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return 0.0
    char_r = difflib.SequenceMatcher(None, na, nb).ratio()
    sa, sb = set(tokenize(a)), set(tokenize(b))
    jac = len(sa & sb) / len(sa | sb) if (sa or sb) else 0.0
    return (char_r + jac) / 2


def kok_uyum_hesapla(kelimeler: list[dict], meal: str) -> float:
    meal_n = norm(meal)
    meal_w = meal_n.split()
    toplam = esles = 0
    for k in kelimeler:
        if not k["root"] or not k["meaning_tr"]:
            continue
        toks = [t for t in tokenize(k["meaning_tr"]) if len(t) >= 3]
        if not toks:
            continue
        toplam += len(toks)
        for tok in toks:
            if tok in meal_n:
                esles += 1
                continue
            for mw in meal_w:
                plen = min(len(tok), len(mw), 5)
                if plen >= 4 and tok[:plen] == mw[:plen]:
                    esles += 1
                    break
    return esles / toplam if toplam else 1.0


def farkli_tokenlar(literal: str, meal: str, esik: int = 4) -> list[str]:
    """Meal'de olup literal'de olmayan, veya tersi; uzun tokenlar."""
    tl = set(t for t in tokenize(literal) if len(t) >= esik)
    tm = set(t for t in tokenize(meal)    if len(t) >= esik)
    # Sadece meal'de var olanlar (literal'in kaçırdığı anlamlar)
    return sorted(tm - tl)[:8]


# ── Veri yükleme ─────────────────────────────────────────────────────────────

def csv_fark_yukle() -> dict[str, dict]:
    if not CSV_FARK.exists():
        return {}
    with open(CSV_FARK, encoding="utf-8-sig") as f:
        return {r["verse_key"]: r for r in csv.DictReader(f)}


def root_meanings_yukle(conn: sqlite3.Connection) -> dict[str, list[str]]:
    """root → [meaning_tr, ...] haritası"""
    cur = conn.cursor()
    cur.execute("SELECT root, meaning_tr FROM root_meanings WHERE meaning_tr IS NOT NULL")
    sonuc: dict[str, list[str]] = defaultdict(list)
    for root, meaning in cur.fetchall():
        sonuc[root].append(meaning.lower())
    return sonuc


# ── Kontrol fonksiyonları ─────────────────────────────────────────────────────

def kontrol_A_yanlis_pozitif(
    csv_tur: str, analiz: str, benzerlik: float, kok_uyum: float
) -> str | None:
    """GERÇEK FARK ama metrikler fark olmadığını gösteriyorsa → YANLIŞ POZİTİF."""
    if csv_tur != "GERÇEK FARK":
        return None
    analiz_lower = analiz.lower()
    analiz_fark_yok = any(ifade in analiz_lower for ifade in FAR_YOK_IFADELER)
    if analiz_fark_yok:
        return (f"YANLIŞ POZİTİF: CSV=GERÇEK_FARK ama analiz 'fark yok' diyor "
                f"(benzerlik=%{benzerlik*100:.0f}, kök=%{kok_uyum*100:.0f})")
    if benzerlik >= ESIK_BENZERLIK_YUKSEK and kok_uyum >= ESIK_KOK_UYUM_IYI:
        return (f"ŞÜPHELİ POZİTİF: Metrikler yüksek "
                f"(benzerlik=%{benzerlik*100:.0f}, kök=%{kok_uyum*100:.0f}) "
                f"ama GERÇEK FARK işaretli")
    return None


def kontrol_B_kacarilan_fark(
    csv_tur: str, analiz: str, benzerlik: float, kok_uyum: float
) -> str | None:
    """ÜSLUP FARKI ama metrikler ciddi fark gösteriyorsa → KAÇIRILAN FARK."""
    if csv_tur not in ("ÜSLUP FARKI", "TUTARLI"):
        return None
    analiz_lower = analiz.lower()
    if benzerlik < ESIK_BENZERLIK_DUSUK and kok_uyum < ESIK_KOK_UYUM_ZAYIF:
        analiz_fark_var = any(ifade in analiz_lower for ifade in FAR_VAR_IFADELER)
        if not analiz_fark_var:
            return (f"KAÇIRILAN FARK: CSV={csv_tur} ama metrikler ciddi fark gösteriyor "
                    f"(benzerlik=%{benzerlik*100:.0f}, kök=%{kok_uyum*100:.0f})")
    return None


def kontrol_C_eksik_analiz(
    literal: str, meal: str, analiz: str
) -> str | None:
    """Literal↔meal arası önemli kelimeler analizde geçmiyorsa → EKSİK ANALİZ."""
    farkli = farkli_tokenlar(literal, meal, esik=5)
    if not farkli:
        return None
    analiz_lower = analiz.lower()
    gececmeyen = []
    for tok in farkli[:5]:
        # 4-karakter prefix kontrolü
        if not any(tok[:4] in analiz_lower[i:i+8]
                   for i in range(0, len(analiz_lower), 4)):
            gececmeyen.append(tok)
    if len(gececmeyen) >= 3:
        return (f"EKSİK ANALİZ: Şu kelimeler analizde geçmiyor: "
                f"{', '.join(gececmeyen[:5])}")
    return None


def kontrol_kritik_terimler(analiz: str, kelimeler: list[dict], rm: dict[str, list[str]]) -> str | None:
    """Analizde geçen kritik terimlerin root_meanings ile tutarsız olup olmadığı."""
    analiz_lower = analiz.lower()
    sorunlar = []

    # Ayetin köklerini al
    ayet_kokleri = {k["root"] for k in kelimeler if k["root"]}

    for terim, beklenen_anlamlar in KRITIK_TERIMLER.items():
        if terim not in analiz_lower:
            continue
        # Analizde bu terimi içeren cümleyi bul
        cumle_match = re.search(rf".{{0,60}}{re.escape(terim)}.{{0,60}}", analiz_lower)
        if not cumle_match:
            continue
        cumle = cumle_match.group()
        # Beklenen anlamlardan hiçbiri cümlede geçmiyorsa + terimin zıddı geçiyorsa
        zit_ihtimaller = ["yanlış", "hata", "farklı yorum", "sapma"]
        cumle_beklenen = any(b in cumle for b in beklenen_anlamlar)
        cumle_zit = any(z in cumle for z in zit_ihtimaller)
        if not cumle_beklenen and cumle_zit:
            sorunlar.append(f"'{terim}' terimi analizde şüpheli bağlamda kullanılmış")

    return "; ".join(sorunlar) if sorunlar else None


def onerisi_olustur(sorunlar: list[str], benzerlik: float, kok_uyum: float,
                    farkli: list[str], csv_tur: str) -> str:
    parcalar = []
    if any("YANLIŞ POZİTİF" in s or "ŞÜPHELİ" in s for s in sorunlar):
        parcalar.append("Fark kategorisini 'ÜSLUP FARKI' olarak değiştirmeyi değerlendirin")
    if any("KAÇIRILAN" in s for s in sorunlar):
        parcalar.append(f"Şu kelimeler için analiz derinleştirilebilir: {', '.join(farkli[:3])}")
    if any("EKSİK" in s for s in sorunlar):
        parcalar.append(f"Analizi şu kelimelerle zenginleştirin: {', '.join(farkli[:3])}")
    if not parcalar:
        parcalar.append("—")
    return " | ".join(parcalar)


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--surah",         type=int,  default=None)
    parser.add_argument("--sadece-sorunlu", action="store_true")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    csv_harita = csv_fark_yukle()
    rm         = root_meanings_yukle(conn)

    # Ayetleri çek
    q = """
        SELECT v.verse_key, v.literal_ceviri, v.fark_analizi,
               t.text AS meal
        FROM verses v
        JOIN translations t ON v.verse_key = t.verse_key AND t.source = 'diyanet'
        WHERE v.fark_analizi IS NOT NULL AND TRIM(v.fark_analizi) != ''
          AND v.literal_ceviri IS NOT NULL AND TRIM(v.literal_ceviri) != ''
    """
    params: list = []
    if args.surah:
        q += " AND v.surah_id = ?"
        params.append(args.surah)
    q += " ORDER BY v.surah_id, v.ayah_number"
    cur.execute(q, params)
    ayetler = [dict(r) for r in cur.fetchall()]

    # Kelimeleri toplu yükle
    verse_keys = [a["verse_key"] for a in ayetler]
    if verse_keys:
        yer = ",".join("?" * len(verse_keys))
        cur.execute(
            f"SELECT verse_key, root, meaning_tr FROM words "
            f"WHERE verse_key IN ({yer}) AND meaning_tr IS NOT NULL "
            f"ORDER BY verse_key, word_index",
            verse_keys
        )
        kelime_harita: dict[str, list[dict]] = defaultdict(list)
        for row in cur.fetchall():
            kelime_harita[row["verse_key"]].append(dict(row))
    conn.close()

    print(f"\n{'='*62}")
    print(f"  FARK ANALİZİ DOĞRULUK KONTROLÜ")
    print(f"{'='*62}")
    print(f"  Kontrol edilen ayet: {len(ayetler)}")

    satirlar = []
    sayaclar: dict[str, int] = {
        "YANLIŞ POZİTİF": 0, "ŞÜPHELİ POZİTİF": 0,
        "KAÇIRILAN FARK":  0, "EKSİK ANALİZ": 0,
        "TERIM SORUNU": 0,   "TEMİZ": 0,
    }

    for a in ayetler:
        vk       = a["verse_key"]
        literal  = a["literal_ceviri"] or ""
        meal     = a["meal"] or ""
        analiz   = a["fark_analizi"] or ""
        csv_r    = csv_harita.get(vk, {})
        csv_tur  = csv_r.get("fark_turu", "")
        kelimeler = kelime_harita.get(vk, [])

        # Metrikler
        benzerlik = benzerlik_hesapla(literal, meal)
        kok_uyum  = kok_uyum_hesapla(kelimeler, meal)
        farkli    = farkli_tokenlar(literal, meal)

        # Kontroller
        sorunlar: list[str] = []

        r = kontrol_A_yanlis_pozitif(csv_tur, analiz, benzerlik, kok_uyum)
        if r:
            sorunlar.append(r)
            if "YANLIŞ" in r:
                sayaclar["YANLIŞ POZİTİF"] += 1
            else:
                sayaclar["ŞÜPHELİ POZİTİF"] += 1

        r = kontrol_B_kacarilan_fark(csv_tur, analiz, benzerlik, kok_uyum)
        if r:
            sorunlar.append(r)
            sayaclar["KAÇIRILAN FARK"] += 1

        r = kontrol_C_eksik_analiz(literal, meal, analiz)
        if r:
            sorunlar.append(r)
            sayaclar["EKSİK ANALİZ"] += 1

        r = kontrol_kritik_terimler(analiz, kelimeler, rm)
        if r:
            sorunlar.append(r)
            sayaclar["TERIM SORUNU"] += 1

        if not sorunlar:
            sayaclar["TEMİZ"] += 1
            if args.sadece_sorunlu:
                continue
            kontrol_sonucu = "TEMİZ"
            aciklama = "—"
            oneri    = "—"
        else:
            kontrol_sonucu = " | ".join(s.split(":")[0] for s in sorunlar)
            aciklama       = " || ".join(sorunlar)
            oneri          = onerisi_olustur(sorunlar, benzerlik, kok_uyum, farkli, csv_tur)

        satirlar.append({
            "verse_key":       vk,
            "csv_fark_turu":   csv_tur,
            "benzerlik":       round(benzerlik * 100, 1),
            "kok_uyum":        round(kok_uyum   * 100, 1),
            "literal_ceviri":  literal[:150],
            "meal":            meal[:150],
            "fark_analizi":    analiz[:200],
            "kontrol_sonucu":  kontrol_sonucu,
            "aciklama":        aciklama[:300],
            "duzeltme_onerisi": oneri[:200],
        })

    # CSV kaydet
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "verse_key", "csv_fark_turu", "benzerlik", "kok_uyum",
        "literal_ceviri", "meal", "fark_analizi",
        "kontrol_sonucu", "aciklama", "duzeltme_onerisi"
    ]
    with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(satirlar)

    # Özet
    toplam_sorunlu = len(satirlar) - sayaclar["TEMİZ"] if not args.sadece_sorunlu else len(satirlar)
    toplam = len(ayetler)

    print(f"\n{'─'*62}")
    print(f"  {'SONUÇ':<25} {'ADET':>6}  {'ORAN':>6}")
    print(f"{'─'*62}")
    for tur, sayi in sayaclar.items():
        print(f"  {tur:<25} {sayi:>6}  %{sayi/toplam*100:>5.1f}")
    print(f"{'─'*62}")
    print(f"  {'Toplam sorunlu':<25} {toplam - sayaclar['TEMİZ']:>6}  "
          f"%{(toplam-sayaclar['TEMİZ'])/toplam*100:>5.1f}")
    print(f"\n  CSV: {OUTPUT}")

    # Konsol: en önemli sorunlu ayetler
    sorunlular = [s for s in satirlar if s["kontrol_sonucu"] != "TEMİZ"]
    sorunlular.sort(key=lambda x: x["benzerlik"])
    if sorunlular:
        print(f"\n{'─'*62}")
        print(f"  İlk 20 sorunlu ayet:")
        print(f"{'─'*62}")
        for s in sorunlular[:20]:
            print(f"  {s['verse_key']:<8} {s['csv_fark_turu']:<14} "
                  f"B%{s['benzerlik']:>5.1f} K%{s['kok_uyum']:>5.1f}  "
                  f"{s['kontrol_sonucu'][:35]}")
            print(f"  {'':8} L: {s['literal_ceviri'][:55]}")
            print(f"  {'':8} M: {s['meal'][:55]}")
            print()


if __name__ == "__main__":
    main()
