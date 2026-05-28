import csv, sqlite3, sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle

sys.stdout.reconfigure(encoding="utf-8")

CIKTI = Path(r"C:\Users\jalek\OneDrive\Masaüstü\yanlis_pozitif_manuel_kontrol.pdf")

# 112 YANLIŞ POZİTİF oku
with open("data/fark_analizi_kontrol.csv", encoding="utf-8-sig") as f:
    sorunlu = [r for r in csv.DictReader(f) if "YANLIŞ POZİTİF" in r["kontrol_sonucu"]]

sorunlu.sort(key=lambda r: tuple(int(p) for p in r["verse_key"].split(":")))

# DB'den meal, literal, fark_analizi al
conn = sqlite3.connect("data/app.db")
cur  = conn.cursor()
verse_keys = [r["verse_key"] for r in sorunlu]
yer = ",".join("?" * len(verse_keys))

cur.execute(f"SELECT verse_key, literal_ceviri, fark_analizi FROM verses WHERE verse_key IN ({yer})", verse_keys)
db_map = {r[0]: {"literal": r[1] or "", "analiz": r[2] or ""} for r in cur.fetchall()}

cur.execute(f"SELECT verse_key, text FROM translations WHERE verse_key IN ({yer}) AND source='diyanet'", verse_keys)
meal_map = {r[0]: r[1] or "" for r in cur.fetchall()}
conn.close()

# PDF
doc = SimpleDocTemplate(str(CIKTI), pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()

def sty(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)

baslik_s   = sty("B", fontSize=16, spaceAfter=4, textColor=colors.HexColor("#111"))
alt_bas_s  = sty("AB", fontSize=9, spaceAfter=14, textColor=colors.grey)
ayet_no_s  = sty("AN", fontSize=11, spaceBefore=10, spaceAfter=4,
                 textColor=colors.HexColor("#1a56a0"), fontName="Helvetica-Bold")
etiket_s   = sty("ET", fontSize=8, textColor=colors.HexColor("#888"),
                 spaceBefore=3, spaceAfter=1, fontName="Helvetica-Bold")
metin_s    = sty("MT", fontSize=9, spaceAfter=4, leading=14,
                 textColor=colors.HexColor("#222"))
analiz_s   = sty("AZ", fontSize=9, spaceAfter=6, leading=13,
                 textColor=colors.HexColor("#444"), leftIndent=8)
onay_s     = sty("ON", fontSize=9, spaceAfter=2, textColor=colors.HexColor("#888"))

icerik = []
icerik.append(Paragraph("Yanliş Pozitif — Manuel Kontrol Raporu", baslik_s))
icerik.append(Paragraph(
    f"GERÇEK FARK işaretlenmiş ama Gemini 'anlam farkı yok' diyen {len(sorunlu)} ayet. "
    "Lütfen her ayet için: ONAYLA / GERCEK FARK / USTUP FARKI seçeneklerinden birini işaretleyin.",
    alt_bas_s))

for i, r in enumerate(sorunlu, 1):
    vk    = r["verse_key"]
    db    = db_map.get(vk, {})
    meal  = meal_map.get(vk, "")
    lit   = db.get("literal", "")
    analiz = db.get("analiz", "")
    ben   = r["benzerlik"]
    kok   = r["kok_uyum"]

    icerik.append(Paragraph(
        f"<b>{i}. {vk}</b>  &nbsp;&nbsp; Benzerlik: <b>%{ben}</b>  |  Kök uyumu: <b>%{kok}</b>",
        ayet_no_s
    ))

    icerik.append(Paragraph("MEAL (Diyanet):", etiket_s))
    icerik.append(Paragraph(meal[:300], metin_s))

    icerik.append(Paragraph("LİTERAL ÇEVİRİ:", etiket_s))
    icerik.append(Paragraph(lit[:300], metin_s))

    icerik.append(Paragraph("MEVCUT FARK ANALİZİ:", etiket_s))
    icerik.append(Paragraph(analiz[:400], analiz_s))

    # Onay kutucukları
    onay_tablo = Table(
        [["☐  ONAYLA (analiz doğru, fark gerçekten yok)",
          "☐  GERÇEK FARK (analiz yanlış, fark var)",
          "☐  ÜSLUP FARKI (kategori değiştir)"]],
        colWidths=[6.5*cm, 6.5*cm, 5.5*cm]
    )
    onay_tablo.setStyle(TableStyle([
        ("FONTSIZE",  (0,0), (-1,-1), 8),
        ("TEXTCOLOR", (0,0), (-1,-1), colors.HexColor("#555")),
        ("TOPPADDING",(0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0),(-1,-1), 3),
        ("BOX", (0,0), (-1,-1), 0.3, colors.HexColor("#ccc")),
        ("INNERGRID",(0,0),(-1,-1), 0.3, colors.HexColor("#ddd")),
        ("BACKGROUND",(0,0),(-1,-1), colors.HexColor("#fafafa")),
    ]))
    icerik.append(onay_tablo)

    if i < len(sorunlu):
        icerik.append(HRFlowable(width="100%", thickness=0.3,
                                  color=colors.HexColor("#e0e0e0"), spaceAfter=4))

doc.build(icerik)
print(f"PDF: {CIKTI}  ({len(sorunlu)} ayet)")
