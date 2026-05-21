"""
Olumsuzluk edatı içeren kelimelerin anlam kontrolü
Çıktı: masaüstü/olumsuzluk_rapor.tsv
"""
import sqlite3, csv, sys, re, unicodedata, os
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB      = 'data/app.db'
OUT     = Path(os.path.expanduser('~')) / 'OneDrive' / 'Masaüstü' / 'olumsuzluk_rapor.tsv'

conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute('SELECT verse_key, word_index, arabic, meaning_tr FROM words WHERE meaning_tr IS NOT NULL')
rows = c.fetchall()
conn.close()

# ─── Hareke yardımcıları ──────────────────────────────────────────────────────
def letters_only(t):
    """Sadece harf bırak (hareke, sukun, şedde, kuran işaretleri kaldır)."""
    t = ''.join(ch for ch in (t or '') if unicodedata.category(ch) not in ('Mn','Cf'))
    t = re.sub(r'[ۖ-ۭ؀-؅]', '', t)
    return t.replace('ـ', '').strip()

FATHA = 'َ'   # َ
KASRA = 'ِ'   # ِ
SUKUN = 'ْ'   # ْ
SHADDA= 'ّ'   # ّ

def first_vowel_after(text, letter):
    """letter'dan sonraki ilk harekeyi döndür."""
    for i, ch in enumerate(text):
        if ch == letter and i + 1 < len(text):
            return text[i+1]
    return ''

def is_negation_la(arabic):
    """لَا veya لَّا (olumsuzluk) mı?"""
    stripped = letters_only(arabic)
    # En başta لا (tek veya şeddeli) var mı?
    if not stripped.startswith('لا'):
        return False
    # Lam üzerindeki hareke fatha olmalı (لَا), kasra değil (لِ)
    for i, ch in enumerate(arabic):
        if ch == 'ل':
            nxt = arabic[i+1] if i+1 < len(arabic) else ''
            return nxt in (FATHA, SHADDA, SHADDA+FATHA, '')  # شدّه+فتحة veya sade
    return False

def is_negation_lan(arabic):
    """لَن (gelecek olumsuz) mu?"""
    stripped = letters_only(arabic)
    if not (stripped == 'لن' or stripped.startswith('لن') and len(stripped) == 2):
        return False
    for i, ch in enumerate(arabic):
        if ch == 'ل':
            nxt = arabic[i+1] if i+1 < len(arabic) else ''
            return nxt == FATHA
    return False

def has_negation_meaning(meaning):
    neg = ['değil','mez','maz','yok','asla','hayır','hiç','olmaz','olamaz','etmez','etmemek']
    m = meaning.lower()
    return any(n in m for n in neg)

def classify(arabic, meaning):
    """(olasi_sorun, not) döner."""
    ar = arabic.strip()
    letters = letters_only(ar)
    m = meaning.lower()

    # ─ وَلَا veya فَلَا: "ve ... değil" bağlacı (çoğunlukla anlam olumlu olabilir)
    if letters.startswith('ولا') or letters.startswith('فلا'):
        return 'false_positive_ve', 've/sonra bağlacı (وَلَا / فَلَا)'

    # ─ إِلَّا: istisna "ancak, sadece" — olumsuzluk değil
    if letters.startswith('الا') or letters.startswith('إلا'):
        return 'false_positive_diger', 'istisna edatı (إِلَّا)'

    # ─ لَيْسَ (leyse) — ayrı olumsuzluk fiili
    if letters.startswith('ليس'):
        return 'false_positive_diger', 'leyse fiili (ayrı kontrol)'

    # ─ لِ + fiil (amaç lamı): لِيَ, لِن gibi — kasra ile başlar
    for i, ch in enumerate(ar):
        if ch == 'ل':
            nxt = ar[i+1] if i+1 < len(ar) else ''
            if nxt == KASRA:
                return 'false_positive_diger', 'amaç/iyelik lamı (لِ, kasra)'
            break

    # ─ لَ + fiil (vurgu lamı): لَيَ, لَنَ, لَكَ gibi — fatha, sonrasında elif yok
    if letters.startswith('ل') and not letters.startswith('لا') and not letters.startswith('لن'):
        for i, ch in enumerate(ar):
            if ch == 'ل':
                nxt = ar[i+1] if i+1 < len(ar) else ''
                if nxt == FATHA:
                    # Sonraki harf ا (elif) değilse vurgu lamı
                    nxt2 = ar[i+2] if i+2 < len(ar) else ''
                    if nxt2 not in ('ا','ٰ','ن'):
                        return 'false_positive_vurgu', 'vurgu/yemin lamı (لَ + fiil, elif yok)'
                break

    # ─ لَن (lan) olumsuzluk
    if is_negation_lan(ar):
        if has_negation_meaning(meaning):
            return None, None  # zaten doğru
        return 'gercek_olumsuzluk', 'لَن (gelecek olumsuz) — anlama olumsuzluk eklenmeli'

    # ─ لَا olumsuzluk
    if is_negation_la(ar):
        if has_negation_meaning(meaning):
            return None, None  # zaten doğru
        return 'gercek_olumsuzluk', 'لَا (olumsuzluk) — anlama olumsuzluk eklenmeli'

    return None, None  # eşleşme yok

# ─── Tara ────────────────────────────────────────────────────────────────────
REPORT_ROWS = []

for vk, wi, arabic, meaning in rows:
    ar = arabic.strip()
    letters = letters_only(ar)
    # Sadece لا veya لن içerenleri kontrol et
    has_la  = 'لا' in letters or letters.startswith('لا')
    has_lan = letters == 'لن' or letters.startswith('لن')
    if not (has_la or has_lan):
        continue

    olasi, not_ = classify(ar, meaning)
    if olasi:
        REPORT_ROWS.append((vk, wi, arabic, meaning, olasi, not_))

# ─── Özet ─────────────────────────────────────────────────────────────────────
from collections import Counter
cats = Counter(r[4] for r in REPORT_ROWS)
print(f'Toplam tespit: {len(REPORT_ROWS)}')
for cat, cnt in cats.most_common():
    print(f'  {cat:35s}: {cnt}')

# ─── TSV yaz ──────────────────────────────────────────────────────────────────
with open(OUT, 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t')
    w.writerow(['verse_key','word_index','arabic','meaning_tr','olasi_sorun','not'])
    w.writerows(REPORT_ROWS)

print(f'\nDosya: {OUT}')
