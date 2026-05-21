import sqlite3, sys, re
sys.stdout.reconfigure(encoding='utf-8')

HAREKE = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]')

def norm(t):
    t = HAREKE.sub('', t or '').strip()
    t = re.sub(r'[أإآٱ]', 'ا', t)
    t = re.sub(r'[يى]', 'ي', t)
    t = re.sub(r'ؤ', 'و', t)
    return t

EDAT = {
    'بهم':'onlarla', 'بهما':'onların ikisiyle', 'بها':'onunla (dişil)',
    'به':'onunla', 'بهن':'onlarla (dişil çoğul)',
    'لهم':'onlar için', 'لهما':'onların ikisi için', 'لها':'onun için (dişil)',
    'له':'onun için', 'لك':'senin için', 'لكم':'sizin için', 'لنا':'bizim için',
    'لي':'benim için', 'لهن':'onlar için (dişil)',
    'عليهم':'onların üzerine', 'عليهما':'onların ikisi üzerine',
    'عليها':'onun üzerine (dişil)', 'عليه':'onun üzerine', 'عليك':'senin üzerine',
    'علينا':'bizim üzerine', 'عليكم':'sizin üzerine',
    'فيهم':'onların içinde', 'فيها':'onun içinde', 'فيه':'onun içinde',
    'فيك':'senin içinde', 'فينا':'bizim içinde', 'فيكم':'sizin içinde',
    'منهم':'onlardan', 'منهما':'onların ikisinden', 'منها':'ondan (dişil)',
    'منه':'ondan', 'منك':'senden', 'منكم':'sizden', 'منا':'bizden',
    'اليهم':'onlara doğru', 'اليهما':'onların ikisine', 'اليها':'ona doğru (dişil)',
    'اليه':'ona doğru', 'اليك':'sana doğru', 'الينا':'bize doğru', 'اليكم':'size doğru',
    'عنهم':'onlardan (uzak)', 'عنهما':'onların ikisinden (uzak)', 'عنها':'ondan uzak (dişil)',
    'عنه':'ondan uzak', 'عنك':'senden uzak', 'عنكم':'sizden uzak', 'عنا':'bizden uzak',
    'هو':'o', 'هي':'o (dişil)', 'هم':'onlar', 'هن':'onlar (dişil)',
    'هما':'onların ikisi', 'انت':'sen', 'انتم':'siz', 'انتما':'siz ikiniz',
    'انتن':'siz (dişil çoğul)', 'نحن':'biz', 'انا':'ben',
    'ماذا':'nedir, ne', 'سوف':'yakında (gelecek zaman)',
    'كيف':'nasıl', 'اين':'nerede', 'متي':'ne zaman', 'هل':'mı, mi (soru)',
    'كم':'kaç, ne kadar', 'لماذا':'neden, niçin',
    'ما':'ne, şey, olmayan', 'من':'kim, -den', 'في':'içinde',
    'علي':'üzerine', 'من':'kimden, -den', 'ب':'ile', 'ل':'için',
    'كلهم':'hepsini, hepsi', 'كلها':'hepsi (dişil)', 'كله':'hepsi',
    'بعضهم':'bir kısmı, bazıları', 'بعضها':'bir kısmı (dişil)',
    'معهم':'onlarla birlikte', 'معه':'onunla birlikte', 'معك':'seninle',
    'معكم':'sizinle', 'معنا':'bizimle', 'معها':'onunla (dişil)',
    'عندهم':'onların yanında', 'عنده':'onun yanında', 'عندك':'senin yanında',
    'عندنا':'bizim yanımızda', 'عندكم':'sizin yanınızda',
    'اياهم':'onları (vurgulu)', 'اياه':'onu (vurgulu)', 'اياك':'seni (vurgulu)',
    'اياكم':'sizi (vurgulu)', 'اياي':'beni (vurgulu)', 'ايانا':'bizi (vurgulu)',
}

PREFIXES = ['وال','فال','لل','بال','كال','ال','وب','ول','وف','وك','فب','فل','فب',
            'و','ف','ل','ب','ك','س']

def resolve(arabic):
    n = norm(arabic)
    if n in EDAT:
        return EDAT[n]
    for p in PREFIXES:
        if n.startswith(p) and len(n) > len(p) + 1:
            rest = n[len(p):]
            if rest in EDAT:
                return EDAT[rest]
    return None

DB = 'data/app.db'
conn = sqlite3.connect(DB)
cursor = conn.cursor()

cursor.execute("SELECT id, verse_key, word_index, arabic FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr)=''")
rows = cursor.fetchall()

auto  = []
cant  = []
for id_, vk, wi, ar in rows:
    m = resolve(ar)
    if m:
        auto.append((m, id_))
    else:
        cant.append((vk, wi, ar))

print(f'Toplam boş     : {len(rows)}')
print(f'Otomatik fill  : {len(auto)}')
print(f'Manuel gereken : {len(cant)}')

# Otomatik güncelle
if auto:
    cursor.executemany('UPDATE words SET meaning_tr=? WHERE id=?', auto)
    conn.commit()
    print(f'\n{len(auto)} kelime güncellendi.')

conn.close()

# Manuel gereken — benzersiz formlar
print('\nManuel düzeltme gereken benzersiz formlar:')
unique = {}
for vk, wi, ar in cant:
    key = norm(ar)
    unique.setdefault(key, []).append(f'{vk}#{wi}')

for ar_key, examples in sorted(unique.items(), key=lambda x: -len(x[1])):
    print(f'  {ar_key:25s}  ({len(examples)}x)  örn: {", ".join(examples[:3])}')
