import sqlite3, sys, re
sys.stdout.reconfigure(encoding='utf-8')

DB = 'data/app.db'
conn = sqlite3.connect(DB)
cursor = conn.cursor()

# 1. Manuel düzeltmeleri geri yükle (script üstüne yazdı)
manual_fixes = [
    (1818, 'uyuklama, hafif uyku'),
    (1550, 'ağır gelmek, yormak, bunaltmak'),
]
for id_, val in manual_fixes:
    cursor.execute('UPDATE root_meanings SET short_tr=?, meaning_tr=? WHERE id=?', (val, val, id_))
    print(f'Manuel geri yüklendi id={id_}: {val}')

# 2. Prompt kalıntısı ve Arapça harf temizliği
cursor.execute("SELECT id, short_tr FROM root_meanings WHERE source='v2_easy_only'")
rows = cursor.fetchall()

AR_RE = re.compile(r'[؀-ۿ]')

def clean(text):
    if not text:
        return text
    t = text.strip("'\"")
    # Arapça harf + prompt kalıntısı ön eki: "قرن kökü Kuran'daki temel Türkçe anlamı: asır..."
    t = re.sub(r'^[؀-ۿ\s]+(?:kök[üu]?\s*(?:için\s*|Kuran.*?)?:\s*)?', '', t, flags=re.IGNORECASE)
    # "X kökünün ... anlamı: Y" → Y
    if ':' in t:
        parts = t.split(':', 1)
        if len(parts[0]) < 35:
            t = parts[1].strip()
    # Sondaki nokta
    t = t.rstrip('.')
    # Boşluk normalize
    t = re.sub(r'\s+', ' ', t).strip()
    # İlk harf küçük
    if t and t[0].isupper():
        t = t[0].lower() + t[1:]
    # Hâlâ Arapça harf varsa sil
    if AR_RE.search(t):
        t = AR_RE.sub('', t).strip()
        t = re.sub(r'\s+', ' ', t).strip()
    return t

updates = []
for id_, short_tr in rows:
    cleaned = clean(short_tr)
    if cleaned != short_tr and cleaned:
        updates.append((cleaned, id_, short_tr))

print(f'\nTemizlenecek kalıntı: {len(updates)}')
for new_val, id_, orig in updates[:10]:
    print(f'  id={id_}: {repr(orig[:60])} → {repr(new_val[:60])}')

for new_val, id_, _ in updates:
    cursor.execute('UPDATE root_meanings SET short_tr=?, meaning_tr=? WHERE id=?',
                   (new_val, new_val, id_))

conn.commit()
conn.close()
print(f'\nToplam {len(updates) + len(manual_fixes)} kayıt düzeltildi.')
