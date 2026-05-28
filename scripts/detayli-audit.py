"""
Words tablosu detaylı denetim raporu
Çıktı: docs/DETAYLI_AUDIT.md
"""
import sqlite3, sys, re, unicodedata
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
DB  = 'data/app.db'
OUT = Path('docs/DETAYLI_AUDIT.md')
OUT.parent.mkdir(exist_ok=True)

conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute('''
    SELECT w.verse_key, w.word_index, w.arabic, w.pos, w.meaning_tr,
           v.arabic_text
    FROM words w
    LEFT JOIN verses v ON w.verse_key = v.verse_key
''')
rows = c.fetchall()
conn.close()

def norm_ar(t):
    t = ''.join(ch for ch in (t or '') if unicodedata.category(ch) != 'Mn')
    t = re.sub(r'[أإآٱ]', 'ا', t)
    t = re.sub(r'[يى]', 'ي', t)
    return t.replace('ـ', '').strip()

def letters(t):
    return re.sub(r'\s', '', norm_ar(t))

def has_neg(m):
    neg = ['değil','mez','maz','yok','asla','hayır','hiç','olmaz','etmez','etmemek']
    return any(n in (m or '').lower() for n in neg)

def has_soru(m):
    sq = ['?','mı','mi','nedir','neden','nerede','nasıl','kim','ne zaman','niçin']
    return any(s in (m or '').lower() for s in sq)

def fatha_on_mim(arabic):
    """م harfinden sonra fatha (َ) var mı?"""
    for i, ch in enumerate(arabic):
        if ch == 'م' and i + 1 < len(arabic):
            return arabic[i+1] == 'َ'
    return False

def kasra_on_mim(arabic):
    """م harfinden sonra kasra (ِ) var mı?"""
    for i, ch in enumerate(arabic):
        if ch == 'م' and i + 1 < len(arabic):
            return arabic[i+1] == 'ِ'
    return False

# ─── Kontrol 1: İsim-Fiil Karışıklığı ───────────────────────────────────────
k1 = []
for vk, wi, ar, pos, m, vtext in rows:
    if not m or not pos: continue
    ms = m.strip()
    if pos == 'İSİM' and (ms.endswith('mak') or ms.endswith('mek')
                          or ms.endswith('mak,') or ms.endswith('mek,')):
        k1.append((vk, wi, ar, pos, ms, 'İsim kelime; mastar yerine isim formu önerilir'))

# ─── Kontrol 2: Olumsuzluk Eksik Fiiller ─────────────────────────────────────
NEGATION_WORDS = re.compile(r'لَا|لَّا|لَن|لَّن')

# Olumsuzluk: sadece KELİMENİN KENDİSİNDE لا/لن olan fiilleri yakala
LA_PREFIX = re.compile(r'^(لَا|لَّا|لَن|وَلَا|فَلَا|وَلَن|فَلَن)')

k2 = []
for vk, wi, ar, pos, m, vtext in rows:
    if not m or not pos: continue
    if 'V' not in pos: continue
    # Kelimenin kendisinde olumsuzluk edatı var mı?
    if not LA_PREFIX.match(ar.strip()): continue
    # Anlam zaten olumsuz mu?
    if has_neg(m): continue
    k2.append((vk, wi, ar, pos, m.strip(), 'لَا/لَن içeren fiil — anlama olumsuzluk eklenmeli'))

# ─── Kontrol 3: Soru Kelimeleri ──────────────────────────────────────────────
# Soru kelimeleri: hareke ile ayırt et (مَن fatha=kim, مِن kasra=-den)
# letters() harekeyi kaldırır, bu yüzden hareke varlığını önce kontrol et
SORU_EXACT = {
    'مَاذَا': 'مَاذَا (ne, nedir)',
    'أَيَّانَ': 'أَيَّانَ (ne zaman)',
    'كَيْفَ':  'كَيْفَ (nasıl)',
    'لِمَ':   'لِمَ (neden)',
    'لِمَاذَا':'لِمَاذَا (neden)',
    'هَلْ':   'هَلْ (mı/mi)',
    'أَيْنَ': 'أَيْنَ (nerede)',
}

k3 = []
for vk, wi, ar, pos, m, vtext in rows:
    if not m: continue

    # مَن (fatha) = kim — kasra olan مِن dahil edilmez
    ar_norm = letters(ar)
    if ar_norm == 'من':
        if not fatha_on_mim(ar): continue   # mِن ise atla
        if has_soru(m): continue
        k3.append((vk, wi, ar, pos, m.strip(), 'مَن (fatha) soru kelimesi = kim'))
        continue

    # Diğer soru kelimeleri: exact hareke eşleşmesi
    ar_clean = ar.strip()
    matched = None
    for exact, label in SORU_EXACT.items():
        if letters(ar_clean) == letters(exact):
            matched = label
            break
    if not matched: continue
    if has_soru(m): continue
    k3.append((vk, wi, ar, pos, m.strip(), f'soru anlamı eklenmeli → {matched}'))

# ─── Kontrol 4: Kim/Den-Dan Karışıklığı ──────────────────────────────────────
k4_men_den = []  # مَن ama -den/-dan
k4_min_kim = []  # مِن ama kim

for vk, wi, ar, pos, m, vtext in rows:
    if not m: continue
    ar_norm = letters(ar)
    if ar_norm != 'من': continue
    ms = m.strip().lower()

    if fatha_on_mim(ar):   # مَن = kim
        if '-den' in ms or '-dan' in ms:
            k4_men_den.append((vk, wi, ar, pos, m.strip(), 'مَن (fatha) = kim — -den/-dan yanlış'))
    elif kasra_on_mim(ar):  # مِن = -den
        if 'kim' in ms:
            k4_min_kim.append((vk, wi, ar, pos, m.strip(), 'مِن (kasra) = -den/-dan — kim yanlış'))

# ─── Rapor yaz ────────────────────────────────────────────────────────────────
lines = [
    '# Words Tablosu Detaylı Denetim Raporu',
    '',
    'Tarih: 2026-05-21',
    '',
    '## Özet',
    '',
    '| # | Kontrol | Bulunan |',
    '|---|---|---:|',
    f'| 1 | İsim-Fiil Karışıklığı | {len(k1)} |',
    f'| 2 | Olumsuzluk Eksik Fiiller | {len(k2)} |',
    f'| 3 | Soru Kelimeleri Anlamı | {len(k3)} |',
    f'| 4a | مَن → -den/-dan (yanlış) | {len(k4_men_den)} |',
    f'| 4b | مِن → kim (yanlış) | {len(k4_min_kim)} |',
    '',
]

def write_section(title, data, cols):
    lines.append(f'## {title}')
    lines.append('')
    lines.append(f'**Bulunan: {len(data)}**')
    lines.append('')
    if not data:
        lines.append('_Sorun bulunamadı._')
        lines.append('')
        return
    header = '| ' + ' | '.join(cols) + ' |'
    sep    = '| ' + ' | '.join(['---']*len(cols)) + ' |'
    lines.append(header); lines.append(sep)
    for row in data[:10]:
        cells = [str(v or '').replace('|','‖')[:55] for v in row]
        lines.append('| ' + ' | '.join(cells) + ' |')
    if len(data) > 10:
        lines.append(f'_... ve {len(data)-10} kayıt daha_')
    lines.append('')

write_section(
    '1. İsim–Fiil Karışıklığı (pos=İSİM, anlam mastar)',
    k1,
    ['verse_key','word_index','arabic','pos','mevcut_anlam','öneri']
)

write_section(
    '2. Olumsuzluk Eksik Fiiller',
    k2[:],
    ['verse_key','word_index','arabic','pos','mevcut_anlam','öneri']
)

write_section(
    '3. Soru Kelimeleri — Anlam Eksik',
    k3,
    ['verse_key','word_index','arabic','pos','mevcut_anlam','öneri']
)

write_section(
    '4a. مَن Fakat Anlam -den/-dan',
    k4_men_den,
    ['verse_key','word_index','arabic','pos','mevcut_anlam','öneri']
)

write_section(
    '4b. مِن Fakat Anlam kim',
    k4_min_kim,
    ['verse_key','word_index','arabic','pos','mevcut_anlam','öneri']
)

OUT.write_text('\n'.join(lines), encoding='utf-8')

# Terminal çıktısı
print(f'Toplam kelime : {len(rows)}')
print()
print(f'1. İsim-Fiil   : {len(k1)}')
print(f'2. Olumsuzluk  : {len(k2)}')
print(f'3. Soru anlam  : {len(k3)}')
print(f'4a. مَن/den    : {len(k4_men_den)}')
print(f'4b. مِن/kim    : {len(k4_min_kim)}')
print()

# K3 tam liste
if k3:
    print('Soru kelimeleri örnekleri:')
    for row in k3[:10]:
        print(f'  {row[0]}#{row[1]}  {row[2]:20s}  {row[4]:25s}  → {row[5]}')

print(f'\nRapor: {OUT}')
