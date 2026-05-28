import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('data/app.db')
cur = conn.cursor()

cur.execute("SELECT source, COUNT(*) FROM translations GROUP BY source")
print('=== TRANSLATIONS KAYNAKLAR ===')
for r in cur.fetchall():
    print(r)

cur.execute("SELECT * FROM translations LIMIT 2")
print('\n=== TRANSLATIONS SAMPLE ===')
for r in cur.fetchall():
    print(r)

cur.execute('PRAGMA table_info(translations)')
print('\n=== TRANSLATIONS SCHEMA ===')
for r in cur.fetchall():
    print(r)

cur.execute('PRAGMA table_info(verses)')
print('\n=== VERSES SCHEMA ===')
for r in cur.fetchall():
    print(r)

cur.execute('SELECT * FROM verses LIMIT 3')
print('\n=== VERSES SAMPLE ===')
for r in cur.fetchall():
    print(r)
