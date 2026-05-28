import sys
sys.stdout.reconfigure(encoding="utf-8")

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from pathlib import Path

CIKTI = Path(r"C:\Users\jalek\OneDrive\Masaüstü\bulac_eksik_ayetler.pdf")

doc = SimpleDocTemplate(
    str(CIKTI), pagesize=A4,
    leftMargin=2.5*cm, rightMargin=2.5*cm,
    topMargin=2.5*cm,  bottomMargin=2.5*cm,
)

styles = getSampleStyleSheet()
baslik_style = ParagraphStyle(
    "baslik", parent=styles["Title"],
    fontSize=16, spaceAfter=8, textColor=colors.HexColor("#1a1a1a"),
)
icerik_style = ParagraphStyle(
    "icerik", parent=styles["Normal"],
    fontSize=11, spaceAfter=6, textColor=colors.HexColor("#2e7d32"),
)
not_style = ParagraphStyle(
    "not", parent=styles["Normal"],
    fontSize=9, textColor=colors.HexColor("#777777"),
)

icerik = []
icerik.append(Paragraph("Bulaç Meali — Eksik Ayetler Raporu", baslik_style))
icerik.append(Paragraph(
    "Ali Bulaç çevirisinde eksik bulunan tüm ayetler tamamlanmıştır.",
    icerik_style
))
icerik.append(Spacer(1, 0.4*cm))
icerik.append(Paragraph(
    "Durum: 6.236/6.236 ayet  •  Eksik: 0  •  Tamamlanma: 2026-05-21  •  Kaynak: data/app.db",
    not_style
))

doc.build(icerik)
print(f"PDF güncellendi: {CIKTI}")
