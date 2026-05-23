"""
KuranappDuaTema.txt → verse_tag_items tablosuna dua etiketlerini aktarır.

Kullanım (proje kökünden):
  python scripts/import_dua_tags.py
  python scripts/import_dua_tags.py --txt "C:/path/to/KuranappDuaTema.txt"
  python scripts/import_dua_tags.py --dry-run
"""

import argparse
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ── Varsayılan yollar ─────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH      = PROJECT_ROOT / "data" / "app.db"
TXT_DEFAULT  = Path.home() / "OneDrive" / "Masaüstü" / "KuranappDuaTema.txt"

# ── Kategori → ana etiket haritası ────────────────────────────────────────────
# Emoji prefix'i ile eşleştirme; "DUALAR >" içeren satırlarda kullanılır.

KATEGORI_MAP: list[tuple[str, str]] = [
    ("🛡", "korunma"),
    ("👤", "peygamber-duasi"),
    ("🤲", "rabbena"),
    ("💚", "sifa"),
    ("⚓", "tevekkul"),
    ("📿", "zikir"),
]

# ── SQL ───────────────────────────────────────────────────────────────────────

DDL = """
CREATE TABLE IF NOT EXISTS verse_tag_items (
    verse_key TEXT NOT NULL,
    tag       TEXT NOT NULL,
    isim      TEXT,
    aciklama  TEXT,
    PRIMARY KEY (verse_key, tag)
);
CREATE INDEX IF NOT EXISTS idx_vti_tag       ON verse_tag_items(tag);
CREATE INDEX IF NOT EXISTS idx_vti_verse_key ON verse_tag_items(verse_key);
"""

MIGRATE_SQL = [
    "ALTER TABLE verse_tag_items ADD COLUMN isim     TEXT",
    "ALTER TABLE verse_tag_items ADD COLUMN aciklama TEXT",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_vti ON verse_tag_items(verse_key, tag)",
]

INSERT_SQL = """
INSERT INTO verse_tag_items (verse_key, tag, isim, aciklama) VALUES (?, ?, ?, ?)
ON CONFLICT(verse_key, tag) DO UPDATE SET
    isim     = COALESCE(excluded.isim,     isim),
    aciklama = COALESCE(excluded.aciklama, aciklama)
"""

# ── Parsing yardımcıları ──────────────────────────────────────────────────────

_VERSE_RE = re.compile(r"^(\d{1,3}):(\d{1,3})(?:-\d+)?$")


_TR_TABLE = str.maketrans("ışüöçğİŞÜÖÇĞ", "isüocgİSÜOCG")
_TR_TABLE.update(str.maketrans("ıİ", "iI"))

# Türkçe karakter → ASCII slug dönüşüm tablosu
_SLUG_TABLE = str.maketrans({
    "ı": "i", "İ": "i",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
    "ö": "o", "Ö": "o",
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
})


def normalize_tag(tag: str) -> str:
    """
    Türkçe karakterleri ASCII'ye çevirir:
      dua-sabır   → dua-sabir
      dua-tefekkür → dua-tefekkur
    """
    return tag.translate(_SLUG_TABLE)


def normalize_verse_key(raw: str) -> str | None:
    """
    "2:255", "1:1-7", "2:285-286" gibi referansları normalleştirir.
    Aralık varsa (1:1-7) sadece ilk ayahı alır.
    Geçersiz formatlarda None döner.
    """
    # Parantez içini ve fazladan boşlukları temizle
    raw = re.sub(r"\(.*?\)", "", raw).strip()
    # Virgülle ayrılmışsa ilk parçayı al ("12:23, 12:79" → "12:23")
    raw = raw.split(",")[0].strip()

    m = _VERSE_RE.match(raw)
    if not m:
        return None
    surah, ayah = int(m.group(1)), int(m.group(2))
    if surah < 1 or surah > 114 or ayah < 1:
        return None
    return f"{surah}:{ayah}"


def detect_category(line: str) -> str | None:
    """Satır bir kategori başlığıysa ana etiketini döner, değilse None."""
    if "DUALAR" not in line or "→" in line:
        return None
    for emoji_prefix, tag in KATEGORI_MAP:
        if line.startswith(emoji_prefix):
            return tag
    return None


_ISIM_RE = re.compile(r"\(([^)]+)\)")


def extract_isim(raw_ref: str) -> str | None:
    """'2:255 (Ayetel Kürsi)' gibi referanstan parantez içi ismi döner."""
    m = _ISIM_RE.search(raw_ref)
    return m.group(1).strip() if m else None


def parse_txt(path: Path) -> list[tuple[str, str, str | None, str | None]]:
    """
    Txt dosyasını parse ederek (verse_key, tag, isim, aciklama) dörtlülerini döner.
    Her ayet satırı için:
      1. Spesifik dua etiketi  (örn. "dua-korunma") — isim ve aciklama ile
      2. Kategori ana etiketi  (örn. "korunma")      — isim ve aciklama yok
    """
    seen: set[tuple[str, str]] = set()
    rows: list[tuple[str, str, str | None, str | None]] = []
    current_category: str | None = None
    skipped = 0

    with open(path, encoding="utf-8") as f:
        for lineno, raw in enumerate(f, 1):
            line = raw.strip()
            if not line:
                continue

            # Kategori başlığı?
            cat = detect_category(line)
            if cat is not None:
                current_category = cat
                continue

            # Dua satırı? Ayırıcı: "→"
            if "→" not in line:
                continue

            parts = [p.strip() for p in line.split("→")]
            if len(parts) < 2:
                continue

            verse_key = normalize_verse_key(parts[0])
            if not verse_key:
                skipped += 1
                continue

            tag = normalize_tag(parts[1].strip())
            if not tag.startswith("dua-"):
                skipped += 1
                continue

            isim     = extract_isim(parts[0])
            aciklama = parts[2].strip() if len(parts) >= 3 else None

            # Spesifik dua etiketi
            pair = (verse_key, tag)
            if pair not in seen:
                seen.add(pair)
                rows.append((verse_key, tag, isim, aciklama))

            # Kategori ana etiketi (isim/aciklama yok — sadece gruplama için)
            if current_category:
                cat_pair = (verse_key, current_category)
                if cat_pair not in seen:
                    seen.add(cat_pair)
                    rows.append((verse_key, current_category, None, None))

    if skipped:
        print(f"  Atlandı (parse edilemeyen satır): {skipped}")

    return rows


# ── Ana fonksiyon ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="KuranappDuaTema.txt → verse_tag_items")
    parser.add_argument("--txt",     type=Path, default=TXT_DEFAULT, help="Txt dosyası yolu")
    parser.add_argument("--db",      type=Path, default=DB_PATH,     help="SQLite DB yolu")
    parser.add_argument("--dry-run", action="store_true",            help="Ekleme yapmadan raporla")
    args = parser.parse_args()

    # Dosya kontrolleri
    if not args.txt.exists():
        print(f"[HATA] Txt dosyası bulunamadı: {args.txt}")
        print("       --txt ile yolu belirtin.")
        sys.exit(1)
    if not args.db.exists():
        print(f"[HATA] Veritabanı bulunamadı: {args.db}")
        sys.exit(1)

    print(f"Kaynak : {args.txt}")
    print(f"Hedef  : {args.db}")
    if args.dry_run:
        print("[DRY-RUN modu — DB'ye yazılmayacak]")
    print()

    # Parse
    records = parse_txt(args.txt)
    print(f"Parse edilen toplam çift : {len(records)}")

    # Kategori bazlı özet
    from collections import Counter
    tag_count = Counter(tag for _, tag, *_ in records)
    for tag, n in sorted(tag_count.items()):
        print(f"  {tag:<30} {n} adet")
    print()

    if args.dry_run:
        for vk, tag, isim, aciklama in records[:3]:
            print(f"  [{vk}] {tag} | isim={isim!r} | acik={str(aciklama)[:50]}")
        print("Dry-run tamamlandı. DB'ye dokunulmadı.")
        return

    # DB işlemleri
    con = sqlite3.connect(args.db)
    try:
        # Tablo + index oluştur (idempotent)
        con.executescript(DDL)

        # Mevcut tabloya yeni kolonları ekle (zaten varsa hata almayız)
        for sql in MIGRATE_SQL:
            try:
                con.execute(sql)
            except sqlite3.OperationalError:
                pass  # kolon zaten mevcut

        # Önceki dua kayıt sayısı
        before: int = con.execute(
            "SELECT COUNT(*) FROM verse_tag_items WHERE tag LIKE 'dua-%'"
        ).fetchone()[0]

        con.executemany(INSERT_SQL, records)
        con.commit()

        after: int = con.execute(
            "SELECT COUNT(*) FROM verse_tag_items WHERE tag LIKE 'dua-%'"
        ).fetchone()[0]

        added = after - before

        print(f"Eklenen/güncellenen dua kaydı : {added if added else len([r for r in records if r[1].startswith('dua-')])}")
        print(f"Toplam dua kaydı (DB)          : {after}")

        # Toplam verse_tag_items boyutu
        total: int = con.execute("SELECT COUNT(*) FROM verse_tag_items").fetchone()[0]
        print(f"verse_tag_items toplam         : {total}")

    except sqlite3.Error as e:
        print(f"[DB HATASI] {e}")
        con.rollback()
        sys.exit(1)
    finally:
        con.close()

    print()
    print("✓ Tamamlandı.")


if __name__ == "__main__":
    main()
