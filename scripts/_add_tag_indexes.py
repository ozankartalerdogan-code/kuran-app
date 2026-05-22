"""
verse_tags ve verses tablolarına performans indexleri ekler.
python scripts/_add_tag_indexes.py
"""
import sqlite3, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

DB = Path("data/app.db")
conn = sqlite3.connect(DB)

indexler = [
    # Ana tema filtresi (en sık kullanılan)
    ("idx_verse_tags_ana_tema",
     "CREATE INDEX IF NOT EXISTS idx_verse_tags_ana_tema ON verse_tags(ana_tema)"),

    # Meal LIKE araması — FTS zaten varsa bu gereksiz ama LIKE için covering index
    ("idx_verses_surah_ayah",
     "CREATE INDEX IF NOT EXISTS idx_verses_surah_ayah ON verses(surah_id, ayah_number)"),

    # verse_tags JOIN için (zaten PK ama explicit)
    ("idx_verse_tags_verse_key",
     "CREATE INDEX IF NOT EXISTS idx_verse_tags_verse_key ON verse_tags(verse_key)"),
]

# Alt tag (json_each) için virtual tablo — isteğe bağlı, büyük veri setinde kazanç sağlar
# SQLite'da json_each index'lenemez; bunun yerine ayrı bir junction tablo önerilebilir.
# Şimdilik 6236 ayet için json_each yeterince hızlı (~5ms).

for isim, sql in indexler:
    conn.execute(sql)
    print(f"  ✓ {isim}")

conn.commit()
conn.close()
print("\nIndexler eklendi.")
