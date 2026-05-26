"""
verse_tag_items'daki namaz etiketlerini ayet_fts.tags sütununa ekler.

Çalıştırma (proje kökünden):
  python scripts/update_fts_namaz_tags.py
  python scripts/update_fts_namaz_tags.py --dry-run

Tasarım notları:
- Idempotent: birden fazla çalıştırmak aynı sonucu verir.
  Her verse için tags değeri, alt_taglar tabanı + namaz etiketleri
  şeklinde sıfırdan inşa edilir.
- FTS5 rowid ile güncelleme yapılır (verse_key UNINDEXED olduğundan
  WHERE verse_key doğrudan index'lenemez; rowid lookupı O(1)).
- Script sonunda OPTIMIZE çalıştırılır (FTS segment birleştirme).
"""

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path("data/app.db")

# verse_tag_items'da bulunan kategori (ana) etiketleri — FTS'e eklenmez,
# findTagMatch zaten verse_tag_items'ı sorgular.
# FTS'e sadece namaz-* spesifik etiketler eklenir.
NAMAZ_PREFIX = "namaz-"


def build_fts_tags(base_alt_taglar: str | None, namaz_tags: list[str]) -> str:
    """
    base_alt_taglar : verse_tags.alt_taglar  (JSON str, örn. '["besmele","tevhit"]')
                     veya None (verse_tags kaydı yoksa)
    namaz_tags      : verse_tag_items'dan gelen "namaz-*" etiket listesi

    Dönen string FTS5 tags sütununa yazılır.
    Format  :  base_content + " " + "namaz-vakit namaz-husu ..."
    Örnek   :  'besmele", "rahman" namaz-vakit namaz-husu'
    """
    if base_alt_taglar:
        # JSON parse — başarısız olursa ham stringi kullan
        try:
            parts = json.loads(base_alt_taglar)          # list[str]
            base = ", ".join(f'"{p}"' for p in parts)    # mevcut format: "a", "b"
        except (json.JSONDecodeError, TypeError):
            base = base_alt_taglar.strip()
    else:
        base = ""

    namaz_str = " ".join(sorted(set(namaz_tags)))
    return (base + " " + namaz_str).strip() if namaz_str else base


def main() -> None:
    parser = argparse.ArgumentParser(description="ayet_fts.tags ← namaz etiketleri güncelle")
    parser.add_argument("--db",      type=Path, default=DB_PATH)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.db.exists():
        print(f"[HATA] DB bulunamadı: {args.db}")
        sys.exit(1)

    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row

    # ── 1. verse_tag_items'dan namaz etiketlerini çek ──────────────────────────
    namaz_rows = con.execute(
        "SELECT verse_key, tag FROM verse_tag_items WHERE tag LIKE 'namaz-%'"
    ).fetchall()

    # verse_key → [namaz-tag, ...]
    verse_namaz: dict[str, list[str]] = {}
    for row in namaz_rows:
        verse_namaz.setdefault(row["verse_key"], []).append(row["tag"])

    print(f"Namaz etiketi bulunan unique ayet: {len(verse_namaz)}")

    # ── 2. İlgili verse'ler için ayet_fts rowid + mevcut tags ─────────────────
    placeholders = ",".join("?" * len(verse_namaz))
    fts_rows = con.execute(
        f"SELECT rowid, verse_key, tags FROM ayet_fts WHERE verse_key IN ({placeholders})",
        list(verse_namaz.keys()),
    ).fetchall()

    # rowid lookup
    fts_map: dict[str, tuple[int, str]] = {
        r["verse_key"]: (r["rowid"], r["tags"] or "") for r in fts_rows
    }

    # ── 3. verse_tags.alt_taglar taban değeri ─────────────────────────────────
    alt_rows = con.execute(
        f"SELECT verse_key, alt_taglar FROM verse_tags WHERE verse_key IN ({placeholders})",
        list(verse_namaz.keys()),
    ).fetchall()
    alt_map: dict[str, str] = {r["verse_key"]: r["alt_taglar"] for r in alt_rows}

    # ── 4. Her ayet için yeni tags değerini hesapla ──────────────────────────
    updates: list[tuple[str, int]] = []   # (new_tags, rowid)
    skipped = 0

    for vk, namaz_tags in verse_namaz.items():
        if vk not in fts_map:
            skipped += 1
            continue

        rowid, current_tags = fts_map[vk]
        base_alt = alt_map.get(vk)              # None → bu verse verse_tags'de yok
        new_tags = build_fts_tags(base_alt, namaz_tags)

        if new_tags != current_tags:
            updates.append((new_tags, rowid))

    print(f"Güncellenecek satır : {len(updates)}")
    print(f"Zaten güncel (atla) : {len(verse_namaz) - len(updates) - skipped}")
    if skipped:
        print(f"FTS'de bulunamadı   : {skipped}")

    if args.dry_run:
        # İlk 3 örneği göster
        for new_tags, rowid in updates[:3]:
            vk = next(k for k, (r, _) in fts_map.items() if r == rowid)
            print(f"  [{vk}] → {new_tags[:120]}")
        print("\nDry-run tamamlandı. DB'ye dokunulmadı.")
        con.close()
        return

    if not updates:
        print("Güncellenecek satır yok — FTS zaten güncel.")
        con.close()
        return

    # ── 5. Batch UPDATE ───────────────────────────────────────────────────────
    con.executemany(
        "UPDATE ayet_fts SET tags = ? WHERE rowid = ?",
        updates,
    )

    # ── 6. FTS5 OPTIMIZE (segment birleştirme) ────────────────────────────────
    con.execute("INSERT INTO ayet_fts(ayet_fts) VALUES('optimize')")
    con.commit()
    con.close()

    # ── 7. Doğrulama ──────────────────────────────────────────────────────────
    con2 = sqlite3.connect(args.db)
    sample = con2.execute(
        "SELECT verse_key, tags FROM ayet_fts WHERE verse_key = '2:238'"
    ).fetchone()
    namaz_count = con2.execute(
        "SELECT COUNT(*) FROM ayet_fts WHERE tags LIKE '%namaz-%'"
    ).fetchone()[0]
    con2.close()

    print(f"\n2:238 tags  : {sample[1][:100] if sample else 'N/A'}")
    print(f"FTS'de namaz- içeren satır: {namaz_count}")
    print("\n✓ Tamamlandı.")


if __name__ == "__main__":
    main()
