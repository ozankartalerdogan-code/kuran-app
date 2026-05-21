import sqlite3, sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('data/app.db')
cursor = conn.cursor()
cursor.execute('SELECT verse_key, word_index, arabic, root, pos, meaning_tr, source FROM words')
rows = cursor.fetchall()
conn.close()

def norm_ar(t):
    t = re.sub(r'[ً-ٞؐ-ؚۖ-ۛ۠-۪ۤۧۨ-ٰۭ]', '', t or '')
    t = re.sub(r'[أإآٱ]', 'ا', t)
    return t.strip()

TR = re.compile(r'[a-zçğışöüA-ZÇĞİÖŞÜ]{3,}')
# ım/im/um/üm: fiil kiplerini (ulaşayım, görelim, edelim) dışla — sadece saf isim eki
ISIM_EK = re.compile(r'(lık|luk|lük|lik|ış|iş|uş|üş)\b')

issues = []

for vk, wi, ar, root, pos, m, src in rows:
    if not m:
        continue
    ms = m.strip()

    # 1. Fiil ama tek kelime isim eki
    if pos and 'V' in pos and len(ms.split()) == 1 and ISIM_EK.search(ms):
        issues.append(('fiil→isim', vk, wi, ar, pos, ms, src))

    # 2. Türkçe karakter yok (çevrilmemiş)
    if len(ms) > 2 and not TR.search(ms):
        issues.append(('çevrilmemiş', vk, wi, ar, pos, ms, src))

    # 3. Anlam Arapçanın kendisi
    if norm_ar(ms) == norm_ar(ar) and len(ms) > 2:
        issues.append(('kopya', vk, wi, ar, pos, ms, src))

    # 4. Claude kaynağından uzun anlam
    if src == 'claude-haiku-v4' and len(ms) > 50:
        issues.append(('uzun_claude', vk, wi, ar, pos, ms, src))

    # 5. Rakamla başlıyor
    if ms[0].isdigit():
        issues.append(('rakam_baş', vk, wi, ar, pos, ms, src))

tip_sayac = Counter(t for t, *_ in issues)
print(f'Toplam kelime: {len(rows)}')
print()
for tip, cnt in tip_sayac.most_common():
    print(f'  {tip:20s}: {cnt}')
    ornek = [(vk, wi, ar, m) for t, vk, wi, ar, pos, m, src in issues if t == tip][:4]
    for vk, wi, ar, m in ornek:
        print(f'    {vk}#{wi:3}  {ar:18s}  → {m[:55]}')
    print()
