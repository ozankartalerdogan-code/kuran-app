"""
ayet_fts FTS5 tablosunu yeniden kurar.

Mevcut tablo encoding bozukluğu içeriyor (ı→1, ş→s vb.).
Bu script temiz veriyle yeniden doldurur ve eksik indexleri ekler.

Kullanım:
  python scripts/_fts_rebuild.py
"""
import sqlite3, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB = Path("data/app.db")

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")

print("1. Eski FTS tabloları temizleniyor...")
conn.execute("DROP TABLE IF EXISTS ayet_fts")
conn.commit()
print("   ✓ Silindi")

print("\n2. Yeni FTS5 tablosu oluşturuluyor...")
conn.execute("""
    CREATE VIRTUAL TABLE ayet_fts USING fts5(
        verse_key   UNINDEXED,
        surah_id    UNINDEXED,
        ayah_number UNINDEXED,
        meal,
        literal,
        tags,
        tokenize = 'unicode61 remove_diacritics 1'
    )
""")
print("   ✓ Tablo oluşturuldu")

print("\n3. Veriler dolduruluyor (6236 ayet)...")
rows = conn.execute("""
    SELECT
        v.verse_key,
        v.surah_id,
        v.ayah_number,
        COALESCE(t.text, v.primary_translation, '') AS meal,
        COALESCE(v.literal_ceviri, '')              AS literal,
        COALESCE(
            REPLACE(REPLACE(vt.alt_taglar, '["', ''), '"]', ''),
            ''
        )                                            AS tags
    FROM   verses v
    LEFT   JOIN translations t
           ON  t.verse_key = v.verse_key AND t.source = 'diyanet'
    LEFT   JOIN verse_tags vt ON vt.verse_key = v.verse_key
    ORDER  BY v.surah_id, v.ayah_number
""").fetchall()

conn.executemany(
    "INSERT INTO ayet_fts(verse_key, surah_id, ayah_number, meal, literal, tags) VALUES (?,?,?,?,?,?)",
    rows
)
conn.commit()
print(f"   ✓ {len(rows)} satır eklendi")

print("\n4. Ek indexler kontrol ediliyor...")
eksik_indexler = [
    ("idx_verses_verse_key",
     "CREATE UNIQUE INDEX IF NOT EXISTS idx_verses_verse_key ON verses(verse_key)"),
    ("idx_verses_surah_id",
     "CREATE INDEX IF NOT EXISTS idx_verses_surah_id ON verses(surah_id)"),
    ("idx_translations_diyanet",
     "CREATE INDEX IF NOT EXISTS idx_translations_diyanet ON translations(verse_key, source)"),
    ("idx_verse_tags_ana_tema",
     "CREATE INDEX IF NOT EXISTS idx_verse_tags_ana_tema ON verse_tags(ana_tema)"),
    ("idx_verse_tags_verse_key",
     "CREATE INDEX IF NOT EXISTS idx_verse_tags_verse_key ON verse_tags(verse_key)"),
]

mevcut = {r[0] for r in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='index'"
).fetchall()}

for isim, sql in eksik_indexler:
    if isim not in mevcut:
        conn.execute(sql)
        print(f"   + {isim} eklendi")
    else:
        print(f"   ✓ {isim} zaten var")

conn.commit()

print("\n5. FTS optimize ediliyor...")
conn.execute("INSERT INTO ayet_fts(ayet_fts) VALUES('optimize')")
conn.commit()
print("   ✓ Optimize tamamlandı")

# Doğrulama
total = conn.execute("SELECT COUNT(*) FROM ayet_fts").fetchone()[0]
test  = conn.execute(
    "SELECT verse_key, meal FROM ayet_fts WHERE ayet_fts MATCH 'namaz' LIMIT 3"
).fetchall()

print(f"\n6. Doğrulama:")
print(f"   FTS satır sayısı : {total}")
print(f"   'namaz' MATCH    : {len(test)} sonuç (ilk 3)")
for vk, meal in test:
    print(f"     {vk}: {meal[:60]}")

conn.close()
print("\n✓ FTS5 yeniden yapılandırması tamamlandı.")
