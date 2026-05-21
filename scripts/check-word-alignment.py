import sqlite3, sys, re, unicodedata
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

def norm(t):
    # Hareke ve işaretleri unicode kategori ile kaldır (Mn = NonSpacing Mark)
    t = ''.join(c for c in (t or '') if unicodedata.category(c) != 'Mn')
    t = re.sub(r'[أإآٱ]', 'ا', t)
    t = re.sub(r'[يى]', 'ي', t)
    t = re.sub(r'ؤ', 'و', t)
    # Özel Kuran işaretleri (U+06D6–U+06ED)
    t = re.sub(r'[ۖ-ۭ]', '', t)
    # Kuran nokta işaretleri (U+0600–U+0605)
    t = re.sub(r'[؀-؅]', '', t)
    # Tatweel / Kashida (U+0640) — tipografik uzatma, anlam taşımaz
    t = t.replace('ـ', '')
    return t.strip()

conn = sqlite3.connect('data/app.db')
cursor = conn.cursor()

cursor.execute('SELECT verse_key, arabic_text FROM verses ORDER BY verse_key')
verses = cursor.fetchall()

mismatches = []
checked = 0
no_words = 0

for vk, text in verses:
    if not text:
        continue

    verse_words = [norm(w) for w in text.split() if w.strip()]

    cursor.execute(
        'SELECT word_index, arabic FROM words WHERE verse_key=? ORDER BY word_index', (vk,)
    )
    db_words = cursor.fetchall()

    if not db_words:
        no_words += 1
        continue

    checked += 1

    if len(verse_words) != len(db_words):
        mismatches.append(('sayı_fark', vk,
                           f'ayet={len(verse_words)} db={len(db_words)}'))
        continue

    for wi, ar in db_words:
        idx = wi - 1
        if 0 <= idx < len(verse_words):
            if norm(ar) != verse_words[idx]:
                mismatches.append(('içerik_fark', vk, wi,
                                   norm(ar), verse_words[idx]))
                break

conn.close()

print(f'Kontrol edilen ayet : {checked}')
print(f'Kelimesiz ayet      : {no_words}')
print(f'Uyumsuz ayet        : {len(mismatches)}')
print()

tip = Counter(m[0] for m in mismatches)
for t, c in tip.items():
    print(f'  {t}: {c}')

if mismatches:
    print()
    print('İlk 20 örnek:')
    for m in mismatches[:20]:
        print(f'  {m}')
