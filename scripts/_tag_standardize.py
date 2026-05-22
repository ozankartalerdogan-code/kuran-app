"""
Alt taglardaki ASCII/karakter karmaşalarını düzeltir.
Tüm taglar: küçük harf + düzgün Türkçe karakter.
"""
import sqlite3, json, sys, os
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

DB   = Path("data/app.db")
DEST = Path(os.path.expanduser("~")) / "OneDrive" / "Masaüstü" / "kuranapp_temalar.txt"

# ── Düzeltme haritası ─────────────────────────────────────────────────────────
# ASCII/karmaşık → düzgün Türkçe
DUZELTME = {
    # Sabır ailesi
    "sabir":              "sabır",
    "sabr":               "sabır",
    # Akıl ailesi
    "akil":               "akıl",
    "akl":                "akıl",
    # Savaş ailesi
    "savas":              "savaş",
    # Yaratılış ailesi
    "yaratilis":          "yaratılış",
    "yaratilic":          "yaratılış",
    # Tövbe ailesi
    "tovbe":              "tövbe",
    "tobe":               "tövbe",
    # Boşanma
    "bosanma":            "boşanma",
    # Kardeşlik
    "kardeslik":          "kardeşlik",
    # Müslüman
    "musluman":           "müslüman",
    "muslüman":           "müslüman",
    # Şükür
    "sukur":              "şükür",
    "shukur":             "şükür",
    # Şeytan
    "seytan":             "şeytan",
    # İman
    "iman_":              "iman",
    # Günahkar
    "gunahkar":           "günahkar",
    "gunah":              "günah",
    "günahkar":           "günahkâr",
    # Sığınma
    "siginma":            "sığınma",
    # Sığınak
    "siginak":            "sığınak",
    # Kişisel
    "kisisel":            "kişisel",
    # Kısas
    "kisas":              "kısas",
    # Karanlık
    "karanlik":           "karanlık",
    # Yoksulluk
    "yoksulluk_":         "yoksulluk",
    # Zorluk
    "zorлук":             "zorluk",
    # İbadet karmaşaları
    "namaz_":             "namaz",
    "zekat_":             "zekât",
    "hac_":               "hac",
    "oruc_":              "oruç",
    # Çeşitli
    "ihlas":              "ihlâs",
    "inanc":              "inanç",
    "kavim_":             "kavim",
    "nifak_":             "nifak",
    "fitne_":             "fitne",
    "zulm":               "zulüm",
    "adl":                "adalet",
    "harb":               "savaş",
    "salat":              "namaz",
    "zakat":              "zekât",
    "infaq":              "infak",
    "jihad":              "cihad",
    "munafik":            "münafık",
    "kafir":              "kâfir",
    "tevhid":             "tevhit",
    "musab":              "musab",
    "hac_ibadet":         "hac",
    "doğru_yol_":         "doğru_yol",
    "salih_amel_":        "salih_amel",
    "lut_kavmi":          "lut kavmi",
    "harf-i_mukatta":     "hurufu_mukatta",
    "ogut":               "öğüt",
    "savas_":             "savaş",
}

def duzelt(tag: str) -> str:
    t = tag.strip().lower()
    # Önce haritaya bak
    if t in DUZELTME:
        return DUZELTME[t]
    # Sondaki alt çizgileri temizle
    t = t.rstrip("_")
    if t in DUZELTME:
        return DUZELTME[t]
    return t


# ── DB güncelleme ─────────────────────────────────────────────────────────────

conn = sqlite3.connect(DB)
rows = conn.execute("SELECT verse_key, alt_taglar FROM verse_tags WHERE alt_taglar IS NOT NULL").fetchall()

degisen = 0
for vk, alt_json in rows:
    try:
        eski = json.loads(alt_json)
    except Exception:
        continue

    yeni = [duzelt(t) for t in eski]

    if yeni != eski:
        conn.execute(
            "UPDATE verse_tags SET alt_taglar=? WHERE verse_key=?",
            (json.dumps(yeni, ensure_ascii=False), vk)
        )
        degisen += 1

conn.commit()
print(f"Guncellenen ayet: {degisen}")


# ── Güncel temalar.txt oluştur ────────────────────────────────────────────────

from collections import defaultdict

tema_rows = conn.execute("""
    SELECT ana_tema, COUNT(*) as adet
    FROM verse_tags WHERE ana_tema != ''
    GROUP BY ana_tema ORDER BY ana_tema
""").fetchall()

alt_rows = conn.execute("""
    SELECT vt.ana_tema, je.value
    FROM verse_tags vt, json_each(vt.alt_taglar) je
    WHERE vt.ana_tema != ''
""").fetchall()

conn.close()

tema_taglar = defaultdict(Counter)
tum_taglar  = Counter()
for ana, tag in alt_rows:
    tema_taglar[ana][tag] += 1
    tum_taglar[tag] += 1

GRUPLAR = {
    "A": "İnanç Esasları",
    "B": "İbadet",
    "C": "Ahlak ve Değerler",
    "D": "Hukuk ve Toplum",
    "E": "Kâinat ve İnsan",
    "F": "Kıssalar ve Tarih",
    "G": "Kur'an ve Dinlerarası",
}

L = []
L.append("=" * 65)
L.append("KURANAPP — TEMA VE TAG REHBERİ")
L.append("Son güncelleme: 2026-05-22  (Standartlaştırılmış)")
L.append("=" * 65)
L.append("")
L.append(f"Toplam ayet         : {sum(r[1] for r in tema_rows)}")
L.append(f"Toplam ana tema     : {len(tema_rows)}")
L.append(f"Toplam benzersiz tag: {len(tum_taglar)}")
L.append("")

for grup, grup_adi in GRUPLAR.items():
    L.append("=" * 65)
    L.append(f"GRUP {grup} — {grup_adi}")
    L.append("=" * 65)
    for tema, adet in tema_rows:
        if not tema.startswith(grup):
            continue
        L.append(f"\n  [{tema}]  ({adet} ayet)")
        taglar = tema_taglar.get(tema, Counter())
        if taglar:
            sirali = [t for t, _ in taglar.most_common(8)]
            L.append(f"  Taglar : {', '.join(sirali)}")
    L.append("")

L.append("=" * 65)
L.append("TÜM UNIQUE TAGLAR — En sık 60 (tag: kaç ayette geçtiği)")
L.append("=" * 65)
L.append("")
buf = []
for i, (tag, sayi) in enumerate(tum_taglar.most_common(60), 1):
    buf.append(f"{tag}({sayi})")
    if i % 5 == 0:
        L.append("  " + "   ".join(buf))
        buf = []
if buf:
    L.append("  " + "   ".join(buf))

L.append("")
L.append("=" * 65)
L.append("KULLANIM ÖRNEKLERİ")
L.append("=" * 65)
L.append("")
L.append("  /api/tags/filter?tag=A1_ALLAH_ULUHIYET   → tüm ayetler")
L.append("  /api/tags/filter?tag=F1                  → F1_* prefix")
L.append("  /api/tags/filter?tag=namaz               → alt tag")
L.append("  /search?tag=tevhit                       → UI filtresi")
L.append("  /discover                                → Keşfet sayfası")
L.append("")

DEST.write_text("\n".join(L), encoding="utf-8")
print(f"Yazıldı : {DEST}")
