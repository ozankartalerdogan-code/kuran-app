"""
words tablosu denetim raporu
Çıktı: docs/WORDS_AUDIT_REPORT.md
"""
import sqlite3, sys, re, unicodedata
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

DB = 'data/app.db'
OUT = Path('docs/WORDS_AUDIT_REPORT.md')
OUT.parent.mkdir(exist_ok=True)

conn = sqlite3.connect(DB)
c = conn.cursor()

lines = ["# Words Tablosu Denetim Raporu", "", f"Tarih: 2026-05-21", ""]

# ─── Yardımcı ────────────────────────────────────────────────────────────────
def norm_ar(t):
    t = ''.join(ch for ch in (t or '') if unicodedata.category(ch) != 'Mn')
    t = re.sub(r'[أإآٱ]', 'ا', t)
    t = re.sub(r'[يى]', 'ي', t)
    t = t.replace('ـ', '')
    t = re.sub(r'[ۖ-ۭ؀-؅]', '', t)
    return t.strip()

def section(title, sql_display, rows, cols, notes=""):
    lines.append(f"## {title}")
    lines.append("")
    if notes:
        lines.append(f"> {notes}")
        lines.append("")
    lines.append(f"**SQL:**")
    lines.append("```sql")
    lines.append(sql_display.strip())
    lines.append("```")
    lines.append("")
    lines.append(f"**Bulunan:** {len(rows)} kayıt")
    lines.append("")
    if rows:
        header = "| " + " | ".join(cols) + " |"
        sep    = "| " + " | ".join(["---"]*len(cols)) + " |"
        lines.append(header); lines.append(sep)
        for row in rows[:10]:
            cells = [str(v or '')[:60].replace("|","‖") for v in row]
            lines.append("| " + " | ".join(cells) + " |")
    lines.append("")

# ─── 1. ANLAM EKSİKLİĞİ ─────────────────────────────────────────────────────
sql1 = """
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE meaning_tr IS NULL
   OR trim(meaning_tr) = ''
   OR lower(trim(meaning_tr)) = 'bilinmiyor'
ORDER BY verse_key, word_index
"""
c.execute(sql1)
r1 = c.fetchall()
section("1. Anlam Eksikliği", sql1,
        r1, ["verse_key","word_index","arabic","meaning_tr"])

# ─── 2a. İSİM — mastar anlamı ────────────────────────────────────────────────
sql2a = """
SELECT verse_key, word_index, arabic, pos, meaning_tr
FROM words
WHERE pos = 'İSİM'
  AND (meaning_tr LIKE '%mak' OR meaning_tr LIKE '%mek'
       OR meaning_tr LIKE '%mak,' OR meaning_tr LIKE '%mek,')
ORDER BY verse_key
"""
c.execute(sql2a)
r2a = c.fetchall()
section("2a. İsim — Mastar Anlamlı", sql2a,
        r2a, ["verse_key","word_index","arabic","pos","meaning_tr"],
        "pos=İSİM ama anlam fiil masteri gibi bitmiş.")

# ─── 2b. FİİL — tek kelime isim anlamı ──────────────────────────────────────
ISIM_EK_SQL = "(meaning_tr LIKE '%lık' OR meaning_tr LIKE '%luk' OR meaning_tr LIKE '%lük'" \
              " OR meaning_tr LIKE '%lik' OR meaning_tr LIKE '%ım' OR meaning_tr LIKE '%im'" \
              " OR meaning_tr LIKE '%um' OR meaning_tr LIKE '%üm'" \
              " OR meaning_tr LIKE '%ış' OR meaning_tr LIKE '%iş'" \
              " OR meaning_tr LIKE '%uş' OR meaning_tr LIKE '%üş')"
sql2b = f"""
SELECT verse_key, word_index, arabic, pos, meaning_tr
FROM words
WHERE pos LIKE '%V%'
  AND {ISIM_EK_SQL}
  AND instr(meaning_tr,' ') = 0   -- tek kelime
ORDER BY verse_key
"""
c.execute(sql2b)
r2b = c.fetchall()
section("2b. Fiil — İsim Anlamlı", sql2b,
        r2b, ["verse_key","word_index","arabic","pos","meaning_tr"],
        "pos=FİİL ama anlam isim ekiyle bitiyor.")

# ─── 3. OLUMSUZLUK KONTROLÜ ──────────────────────────────────────────────────
sql3 = """
SELECT w.verse_key, w.word_index, w.arabic, w.meaning_tr
FROM words w
JOIN verses v ON w.verse_key = v.verse_key
WHERE w.pos LIKE '%V%'
  AND w.meaning_tr IS NOT NULL
  AND (v.arabic_text LIKE '%لَا%' OR v.arabic_text LIKE '%لَّا%'
       OR v.arabic_text LIKE '%لَن%' OR v.arabic_text LIKE '%لَّن%')
  AND w.arabic LIKE '%لَا%'   -- fiil öncesinde olumsuzluk
  AND w.meaning_tr NOT LIKE '%değil%'
  AND w.meaning_tr NOT LIKE '%mez%'
  AND w.meaning_tr NOT LIKE '%maz%'
  AND w.meaning_tr NOT LIKE '%yok%'
  AND w.meaning_tr NOT LIKE '%asla%'
ORDER BY w.verse_key
LIMIT 50
"""
# Daha doğru: olumsuzluk edatı olan kelimeleri ara
sql3_display = """
-- Olumsuzluk edatı (لا, لن) olan kelimeler ama anlam olumlu
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE (arabic LIKE '%لَا%' OR arabic LIKE '%لَّا%' OR arabic LIKE '%لَن%')
  AND meaning_tr IS NOT NULL
  AND meaning_tr NOT LIKE '%değil%'
  AND meaning_tr NOT LIKE '%mez%'
  AND meaning_tr NOT LIKE '%maz%'
  AND meaning_tr NOT LIKE '%yok%'
  AND meaning_tr NOT LIKE '%asla%'
  AND meaning_tr NOT LIKE '%hayır%'
ORDER BY verse_key
"""
c.execute("""
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE (arabic LIKE '%لَا%' OR arabic LIKE '%لَّا%' OR arabic LIKE '%لَن%')
  AND meaning_tr IS NOT NULL
  AND meaning_tr NOT LIKE '%değil%'
  AND meaning_tr NOT LIKE '%mez%'
  AND meaning_tr NOT LIKE '%maz%'
  AND meaning_tr NOT LIKE '%yok%'
  AND meaning_tr NOT LIKE '%asla%'
  AND meaning_tr NOT LIKE '%hayır%'
ORDER BY verse_key
""")
r3 = c.fetchall()
section("3. Olumsuzluk Kontrolü", sql3_display,
        r3, ["verse_key","word_index","arabic","meaning_tr"],
        "Olumsuzluk edatı içeren kelimelerin anlamı olumsuz değil.")

# ─── 4. SORU ANLAMI ──────────────────────────────────────────────────────────
sql4 = """
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE (arabic LIKE '%مَنْ%' OR arabic LIKE '%مَاذَا%'
       OR arabic LIKE '%أَيَّانَ%' OR arabic LIKE '%كَيْفَ%'
       OR arabic LIKE '%لِمَ%' OR arabic LIKE '%لِمَاذَا%'
       OR arabic LIKE '%هَلْ%' OR arabic LIKE '%أَيْنَ%')
  AND meaning_tr IS NOT NULL
  AND meaning_tr NOT LIKE '%?%'
  AND meaning_tr NOT LIKE '%mı%'
  AND meaning_tr NOT LIKE '%mi%'
  AND meaning_tr NOT LIKE '%nedir%'
  AND meaning_tr NOT LIKE '%neden%'
  AND meaning_tr NOT LIKE '%nerede%'
  AND meaning_tr NOT LIKE '%nasıl%'
  AND meaning_tr NOT LIKE '%kim%'
ORDER BY verse_key
"""
c.execute(sql4)
r4 = c.fetchall()
section("4. Soru Anlamı Eksik", sql4,
        r4, ["verse_key","word_index","arabic","meaning_tr"],
        "Soru kelimesi ama anlam soru formatında değil.")

# ─── 5. ÖZEL İSİM KONTROLÜ ───────────────────────────────────────────────────
OZEL_ISIMLER = {
    'Cebrail': ['جبريل','جِبۡرِيلَ'],
    'Mikail':  ['ميكائيل','مِيكَٰئِيلَ'],
    'Haman':   ['هامان','هَـٰمَٰنَ'],
    "Fir'avn": ['فرعون','فِرۡعَوۡنَ'],
    'İblis':   ['إبليس','إِبۡلِيسَ'],
    'Cennet':  ['جنة','جَنَّةَ','جَنَّةٌ'],
    'Cehennem':['جهنم','جَهَنَّمَ'],
}

sql5_display = """
-- Özel isim içeren kelimelerin anlamı değiştirilmiş mi?
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE arabic LIKE '%جِبۡرِيلَ%'  -- Cebrail örneği
   OR arabic LIKE '%فِرۡعَوۡنَ%' -- Firavun örneği
   -- diğerleri...
"""
r5 = []
for isim, patterns in OZEL_ISIMLER.items():
    for pat in patterns:
        c.execute("SELECT verse_key, word_index, arabic, meaning_tr FROM words WHERE arabic LIKE ?",
                  (f'%{pat}%',))
        for row in c.fetchall():
            m = (row[3] or '').lower()
            expected = isim.lower().replace("'","")
            if expected not in m and not any(p.replace('%','') in m for p in [isim.lower()[:4]]):
                r5.append((row[0], row[1], row[2], row[3], f'Beklenen: {isim}'))

section("5. Özel İsim Kontrolü", sql5_display,
        r5, ["verse_key","word_index","arabic","meaning_tr","not"],
        "Uyarı: özel isimlerin anlamı beklenenden farklı. Değişiklik yapılmadı.")

# ─── 6. SEGMENTASYON TUTARLILIĞI ─────────────────────────────────────────────
sql6 = """
SELECT v.verse_key,
       LENGTH(v.arabic_text) - LENGTH(REPLACE(v.arabic_text,' ','')) + 1 AS verse_word_count,
       COUNT(w.id) AS db_word_count
FROM verses v
JOIN words w ON v.verse_key = w.verse_key
GROUP BY v.verse_key
HAVING verse_word_count != db_word_count
ORDER BY ABS(verse_word_count - db_word_count) DESC
"""
c.execute(sql6)
r6 = c.fetchall()
# Sadece fark büyük olanları göster (>3 kelime fark)
r6_big = [(vk, vc, dc, vc-dc) for vk, vc, dc in r6 if abs(vc-dc) > 3]
section("6. Segmentasyon Tutarsızlığı (fark > 3)", sql6,
        r6_big, ["verse_key","verse_kelime","db_kelime","fark"],
        "Verse metnindeki boşlukla ayrılan kelime sayısı ile DB'deki kelime sayısı farklı.")

conn.close()

# ─── ÖZET ────────────────────────────────────────────────────────────────────
lines.insert(4, "## Özet\n")
lines.insert(5, "| Kontrol | Bulunan |")
lines.insert(6, "|---|---:|")
lines.insert(7, f"| 1. Anlam eksikliği | {len(r1)} |")
lines.insert(8, f"| 2a. İsim-mastar | {len(r2a)} |")
lines.insert(9, f"| 2b. Fiil-isim | {len(r2b)} |")
lines.insert(10, f"| 3. Olumsuzluk | {len(r3)} |")
lines.insert(11, f"| 4. Soru anlamı | {len(r4)} |")
lines.insert(12, f"| 5. Özel isim | {len(r5)} |")
lines.insert(13, f"| 6. Seg. fark > 3 | {len(r6_big)} |")
lines.insert(14, "")

OUT.write_text('\n'.join(lines), encoding='utf-8')
print(f"Rapor: {OUT}")
print()
print("Özet:")
print(f"  1. Anlam eksikliği : {len(r1)}")
print(f"  2a. İsim-mastar    : {len(r2a)}")
print(f"  2b. Fiil-isim      : {len(r2b)}")
print(f"  3. Olumsuzluk      : {len(r3)}")
print(f"  4. Soru anlamı     : {len(r4)}")
print(f"  5. Özel isim       : {len(r5)}")
print(f"  6. Seg. fark>3     : {len(r6_big)}")
