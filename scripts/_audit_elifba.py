#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Elif-Ba verilerini denetler: harfler.json, diyanetelifba.json, quiz scriptleri"""
import json, sys, io, re
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]

harfler = json.loads((ROOT / "data" / "elifba_harfler.json").read_text("utf-8"))
diyanet = json.loads((ROOT / "data" / "diyanetelifba.json").read_text("utf-8"))

TATWIL = "ـ"
harf_map = {h["harf_id"]: h for h in harfler}

hatalar = []
uyarilar = []

def hata(konu, mesaj):
    hatalar.append(f"[HATA]  {konu}: {mesaj}")

def uyari(konu, mesaj):
    uyarilar.append(f"[UYARI] {konu}: {mesaj}")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 1: unicode_hex ↔ tek_basina
# ──────────────────────────────────────────────────────────────────────────────
for h in harfler:
    gercek = "+".join(f"U+{ord(c):04X}" for c in h["tek_basina"])
    if gercek != h["unicode_hex"]:
        hata(f"id={h['harf_id']} {h['harf_adi']}",
             f"unicode_hex={h['unicode_hex']} ama tek_basina={repr(h['tek_basina'])} -> {gercek}")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 2: Birleşen harf pozisyon yön kontrolü
# ──────────────────────────────────────────────────────────────────────────────
for h in harfler:
    if h["grup"] != "birlesen":
        continue
    b, o, s = h["basta"], h["ortada"], h["sonda"]
    if not (b.endswith(TATWIL) and not b.startswith(TATWIL)):
        hata(f"id={h['harf_id']} {h['harf_adi']}", f"basta yonu yanlis: {repr(b)}")
    if not (o.startswith(TATWIL) and o.endswith(TATWIL)):
        hata(f"id={h['harf_id']} {h['harf_adi']}", f"ortada yonu yanlis: {repr(o)}")
    if not (s.startswith(TATWIL) and not s.endswith(TATWIL)):
        hata(f"id={h['harf_id']} {h['harf_adi']}", f"sonda yonu yanlis: {repr(s)}")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 3: Birleşmeyen harf — basta == tek_basina
# ──────────────────────────────────────────────────────────────────────────────
for h in harfler:
    if h["grup"] != "birlesmeyen":
        continue
    if h["basta"] != h["tek_basina"]:
        hata(f"id={h['harf_id']} {h['harf_adi']}",
             f"basta ({repr(h['basta'])}) != tek_basina ({repr(h['tek_basina'])})")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 4: Mahrec doğruluğu
# ──────────────────────────────────────────────────────────────────────────────
# Klasik tecvid gruplama:
MAHREC_BEKLENEN = {
    1:  "Boğaz sonu",       # Elif/Hamza
    2:  "Dudaklar",         # Be
    5:  "Dil ortası-damak", # Cim
    6:  "Boğaz ortası",     # Ha
    7:  "Boğaz başı",       # Hı
    13: "Dil ortası-damak", # Şın (klasik: Cim/Şın/Ye = aynı bölge)
    15: "Dil kenarı-azı dişler",  # Dad
    18: "Boğaz ortası",     # Ayn
    19: "Boğaz başı",       # Ğayn
    20: "Alt dudak-üst dişler",   # Fe
    21: "Dil kökü-küçük dil",     # Kaf
    24: "Dudaklar",         # Mim
    26: "Dudaklar",         # Vav
    27: "Boğaz sonu",       # He
    28: "Dil ortası-damak", # Ye (klasik: Cim/Şın/Ye)
}
for hid, beklenen in MAHREC_BEKLENEN.items():
    h = harf_map[hid]
    if h["mahrec"] != beklenen:
        # Şın için özel uyarı (kritik bilgi hatası)
        seviye = hata if hid == 13 else uyari
        seviye(f"id={hid} {h['harf_adi']}",
               f"mahrec={repr(h['mahrec'])} — beklenen={repr(beklenen)}")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 5: kalin_ince doğruluğu
# ──────────────────────────────────────────────────────────────────────────────
# Yedi kalın harf (huruf isti'la): خ ص ض ط ظ غ ق
KALIN_IDS  = {7, 14, 15, 16, 17, 19, 21}
# Her ikisi de olabilecekler: ا ر ل ع و لا
IKISI_IDS  = {1, 10, 18, 23, 26, 29}

for h in harfler:
    hid = h["harf_id"]
    if hid in KALIN_IDS:
        beklenen = "kalın"
    elif hid in IKISI_IDS:
        beklenen = "her ikisi"
    else:
        beklenen = "ince"
    if h["kalin_ince"] != beklenen:
        hata(f"id={hid} {h['harf_adi']}",
             f"kalin_ince={repr(h['kalin_ince'])} — beklenen={repr(beklenen)}")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 6: diyanetelifba.json — Konu 1'de Latin harf var mı?
# ──────────────────────────────────────────────────────────────────────────────
konu1 = next((s for s in diyanet["sayfalar"] if s.get("baslik") == "1. KONU: HARFLER"), None)
if konu1:
    for i, line in enumerate(konu1["icerik"].split("\n")):
        for j, c in enumerate(line):
            if c.isascii() and c.isalpha():
                hata("diyanetelifba.json sayfa 8 (Konu 1)",
                     f"Satır {i+1}, konum {j}: Latin harf '{c}' (U+{ord(c):04X}) — satır: {repr(line)}")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 7: Harf tablosu sayfa 9 sütun başlığı tutarlılığı
# ──────────────────────────────────────────────────────────────────────────────
for s in diyanet["sayfalar"]:
    icerik = s.get("icerik", "") or ""
    if "Başa |" in icerik and s.get("sayfa") != 9:
        uyari(f"diyanetelifba.json sayfa {s['sayfa']}",
              "Sütun başlığı 'Başa' — diğer sayfalar 'Başta' kullanıyor")
    if "Başa |" in icerik and s.get("sayfa") == 9:
        uyari("diyanetelifba.json sayfa 9",
              "Sütun başlığı 'Başa' — sayfa 10/11'de 'Başta' kullanılıyor (tutarsızlık)")

# ──────────────────────────────────────────────────────────────────────────────
# BÖLÜM 8: Quiz soruları doğruluğu
# ──────────────────────────────────────────────────────────────────────────────
quiz_src1 = (ROOT / "scripts" / "import_elifba_quiz.py").read_text("utf-8")
quiz_src2 = (ROOT / "scripts" / "import_elifba_quiz_4_9.py").read_text("utf-8")

# Tüm soruları string olarak parse et (basit regex)
def extract_questions(src):
    items = []
    for m in re.finditer(
        r'"lesson_id":\s*(\d+).*?'
        r'"soru":\s*"([^"]+)".*?'
        r'"secenekler":\s*\[([^\]]+)\].*?'
        r'"dogru_cevap":\s*"([^"]+)".*?'
        r'"ipucu":\s*"([^"]*)"',
        src, re.DOTALL
    ):
        secenekler = re.findall(r'"([^"]+)"', m.group(3))
        items.append({
            "lesson_id": int(m.group(1)),
            "soru": m.group(2),
            "secenekler": secenekler,
            "dogru_cevap": m.group(4),
            "ipucu": m.group(5),
        })
    return items

sorular = extract_questions(quiz_src1) + extract_questions(quiz_src2)

# Kural 1: dogru_cevap seçenekler içinde olmalı
for i, s in enumerate(sorular):
    if s["dogru_cevap"] not in s["secenekler"]:
        hata(f"Quiz Ders {s['lesson_id']} S{i+1}",
             f"dogru_cevap={repr(s['dogru_cevap'])} secenekler içinde yok: {s['secenekler']}")

# Kural 2: Her soruda tam 4 seçenek olmalı
for i, s in enumerate(sorular):
    if len(s["secenekler"]) != 4:
        uyari(f"Quiz Ders {s['lesson_id']} S{i+1}",
              f"Seçenek sayısı {len(s['secenekler'])} (beklenen 4)")

# Kural 3: Ders başına soru sayısı
from collections import Counter
counts = Counter(s["lesson_id"] for s in sorular)
for ders_id in range(1, 10):
    c = counts.get(ders_id, 0)
    if c != 5:
        hata(f"Quiz Ders {ders_id}", f"Soru sayısı {c} (beklenen 5)")

# Kural 4: Bilinen faktüel kontroller
FAKTOREL_KONTROLLER = [
    # (lesson_id, soru_alt_string, beklenen_cevap_alt_string, aciklama)
    (3, "بَ", "Ba", "Ders 3: fetha+be = Ba, Be degil"),
    (1, "Sin", "س",  "Ders 1: Sin harfi = س"),
    (1, "Ra", "Birlesmeyen", "Ders 1: Ra birlesmeyen"),
    (6, "Med harfleri", "Elif", "Ders 6: Med harfleri arasinda Elif var"),
    (7, "Tenvin", "3", "Ders 7: Tenvin 3 cesit"),
    (4, "لَمْ", "Lem", "Ders 4: lem okunusu"),
    (5, "كُلُّ", "Kul-lu", "Ders 5: kul-lu okunusu"),
]
for lesson_id, soru_str, cevap_str, aciklama in FAKTOREL_KONTROLLER:
    for s in sorular:
        if s["lesson_id"] == lesson_id and soru_str in s["soru"]:
            if cevap_str not in s["dogru_cevap"]:
                hata(f"Quiz Ders {lesson_id}", f"{aciklama} — bulunan: {repr(s['dogru_cevap'])}")

# Kural 5: Ders 3 S1 ipucu — بَ = 'Ba' mı 'Be' mi?
for s in sorular:
    if s["lesson_id"] == 3 and "fetha" in s["soru"].lower() and "ipucu" in dir(s):
        pass  # aşağıda kontrol ediyoruz

# ipucu kontrolü: بَ = 'Be' yanlış, 'Ba' olmalı
for i, s in enumerate(sorular):
    if s["lesson_id"] == 3:
        ipucu = s.get("ipucu", "")
        # بَ = 'Be' gibi bir ifade var mı?
        if "بَ" in ipucu and "'Be'" in ipucu:
            hata(f"Quiz Ders 3 S{i%5+1} ipucu",
                 f"'بَ = Be' yanlis — fetha A sesi verir, okuyus 'Ba' olmali (ipucu: {repr(ipucu[:80])})")

# ──────────────────────────────────────────────────────────────────────────────
# SONUÇ
# ──────────────────────────────────────────────────────────────────────────────
print("=" * 70)
print(f"HATA  : {len(hatalar)}")
print(f"UYARI : {len(uyarilar)}")
print("=" * 70)
if hatalar:
    print("\n── HATALAR ──")
    for h in hatalar:
        print(" ", h)
if uyarilar:
    print("\n── UYARILAR ──")
    for u in uyarilar:
        print(" ", u)
if not hatalar and not uyarilar:
    print("\nTum kontroller gecti.")
