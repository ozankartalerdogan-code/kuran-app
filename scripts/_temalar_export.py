import sqlite3, json, sys, os
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding="utf-8")

DB   = Path("data/app.db")
DEST = Path(os.path.expanduser("~")) / "OneDrive" / "Masaüstü" / "kuranapp_temalar.txt"

conn = sqlite3.connect(DB)

rows = conn.execute("""
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
    "E": "Kainat ve İnsan",
    "F": "Kıssalar ve Tarih",
    "G": "Kuran ve Dinlerarası",
}

L = []
L.append("=" * 65)
L.append("KURANAPP — TEMA VE TAG REHBERİ")
L.append("Olusturulma: 2026-05-22")
L.append("=" * 65)
L.append("")
L.append(f"Toplam ayet         : {sum(r[1] for r in rows)}")
L.append(f"Toplam ana tema     : {len(rows)}")
L.append(f"Toplam benzersiz tag: {len(tum_taglar)}")
L.append("")

for grup, grup_adi in GRUPLAR.items():
    L.append("=" * 65)
    L.append(f"GRUP {grup} — {grup_adi}")
    L.append("=" * 65)
    for tema, adet in rows:
        if not tema.startswith(grup):
            continue
        L.append(f"\n  [{tema}]  ({adet} ayet)")
        taglar = tema_taglar.get(tema, Counter())
        if taglar:
            sirali = [t for t, _ in taglar.most_common(8)]
            L.append(f"  Taglar : {', '.join(sirali)}")
    L.append("")

L.append("=" * 65)
L.append("TUM UNIQUE TAGLAR — En sik 60 (tag: kac ayette gectigi)")
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
L.append("KULLANIM ORNEKLERI")
L.append("=" * 65)
L.append("")
L.append("  /api/tags/filter?tag=A1_ALLAH_ULUHIYET   -> tum ayetler")
L.append("  /api/tags/filter?tag=F1                  -> F1_* prefix")
L.append("  /api/tags/filter?tag=namaz               -> alt tag")
L.append("  /search?tag=tevhit                       -> UI filtresi")
L.append("  /discover                                -> Kesfet sayfasi")
L.append("")

DEST.write_text("\n".join(L), encoding="utf-8")
print(f"Yazildi : {DEST}")
print(f"Satirlar: {len(L)}")
