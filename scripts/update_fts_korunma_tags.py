"""
verse_tag_items'daki korunma etiketlerini ayet_fts.tags sütununa ekler.

Çalıştırma (proje kökünden):
  python scripts/update_fts_korunma_tags.py
  python scripts/update_fts_korunma_tags.py --dry-run

Tasarım notları:
- Idempotent: birden fazla çalıştırmak aynı sonucu verir.
  Her verse için tags değeri, alt_taglar tabanı + korunma etiketleri
  şeklinde sıfırdan inşa edilir.
- FTS5 rowid ile güncelleme yapılır (verse_key UNINDEXED olduğundan
  WHERE verse_key doğrudan index'lenemez; rowid lookupı O(1)).
- Script sonunda OPTIMIZE çalıştırılır (FTS segment birleştirme).
"""

import argparse
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path("data/app.db")

KORUNMA_PREFIX = "korunma-"


def build_fts_tags(current_fts_tags: str, new_tags: list[str], prefix: str) -> str:
    # Strip existing tokens for this prefix, preserve everything else
    base = re.sub(r"\b" + re.escape(prefix) + r"\S*", "", current_fts_tags or "")
    base = re.sub(r"\s{2,}", " ", base).strip()
    new_str = " ".join(sorted(set(new_tags)))
    return (base + " " + new_str).strip() if new_str else base


def main() -> None:
    parser = argparse.ArgumentParser(description="ayet_fts.tags ← korunma etiketleri güncelle")
    parser.add_argument("--db",      type=Path, default=DB_PATH)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.db.exists():
        print(f"[HATA] DB bulunamadı: {args.db}")
        sys.exit(1)

    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row

    # ── 1. verse_tag_items'dan korunma etiketlerini çek ───────────────────────
    korunma_rows = con.execute(
        "SELECT verse_key, tag FROM verse_tag_items WHERE tag LIKE 'korunma-%'"
    ).fetchall()

    verse_korunma: dict[str, list[str]] = {}
    for row in korunma_rows:
        verse_korunma.setdefault(row["verse_key"], []).append(row["tag"])

    print(f"Korunma etiketi bulunan unique ayet: {len(verse_korunma)}")

    # ── 2. İlgili verse'ler için ayet_fts rowid + mevcut tags ─────────────────
    placeholders = ",".join("?" * len(verse_korunma))
    fts_rows = con.execute(
        f"SELECT rowid, verse_key, tags FROM ayet_fts WHERE verse_key IN ({placeholders})",
        list(verse_korunma.keys()),
    ).fetchall()

    fts_map: dict[str, tuple[int, str]] = {
        r["verse_key"]: (r["rowid"], r["tags"] or "") for r in fts_rows
    }

    # ── 3. Her ayet için yeni tags değerini hesapla ──────────────────────────
    updates: list[tuple[str, int]] = []
    skipped = 0

    for vk, korunma_tags in verse_korunma.items():
        if vk not in fts_map:
            skipped += 1
            continue

        rowid, current_tags = fts_map[vk]
        new_tags = build_fts_tags(current_tags, korunma_tags, KORUNMA_PREFIX)

        if new_tags != current_tags:
            updates.append((new_tags, rowid))

    print(f"Güncellenecek satır : {len(updates)}")
    print(f"Zaten güncel (atla) : {len(verse_korunma) - len(updates) - skipped}")
    if skipped:
        print(f"FTS'de bulunamadı   : {skipped}")

    if args.dry_run:
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

    # ── 6. FTS5 OPTIMIZE ──────────────────────────────────────────────────────
    con.execute("INSERT INTO ayet_fts(ayet_fts) VALUES('optimize')")
    con.commit()
    con.close()

    # ── 7. Doğrulama ──────────────────────────────────────────────────────────
    con2 = sqlite3.connect(args.db)
    sample = con2.execute(
        "SELECT verse_key, tags FROM ayet_fts WHERE verse_key = '2:255'"
    ).fetchone()
    korunma_count = con2.execute(
        "SELECT COUNT(*) FROM ayet_fts WHERE tags LIKE '%korunma-%'"
    ).fetchone()[0]
    con2.close()

    print(f"\n2:255 tags  : {sample[1][:100] if sample else 'N/A'}")
    print(f"FTS'de korunma- içeren satır: {korunma_count}")
    print("\n✓ Tamamlandı.")


if __name__ == "__main__":
    main()
