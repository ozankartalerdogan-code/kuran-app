"""Denetim raporundaki WEAK ayetlerin düzeltmesi (2026-11-19; agy flash önerisi + Claude incelemesi).

  python scripts/themes/fix_weak_2026_11_19.py --db data/app.themes.db

Kürasyonlu kodlar (namaz-/korunma-/ismiazam-/dua-) korunur. İdempotent.
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common as C  # noqa: E402
from clean import write_state  # noqa: E402

FIXES = {
    "70:27": ("A6_AHIRET_MEAD", ["cehennem", "husu-korku", "ahiret", "rabb"]),
    "70:3": ("A1_ALLAH_ULUHIYET", ["ilah", "ars"]),
    "89:12": ("F2_HELAK_KAVIMLER", ["helak-kavimler", "bozgunculuk", "ad-semud", "firavun-karun"]),
    "75:5": ("A6_AHIRET_MEAD", ["dirilis", "ahiret", "kiyamet", "gunah-isyan"]),
    "26:123": ("F2_HELAK_KAVIMLER", ["ad-semud", "hz-hud", "peygamberlik", "kafirler"]),
    "26:141": ("F2_HELAK_KAVIMLER", ["ad-semud", "hz-salih", "peygamberlik", "kafirler"]),
    "49:6": ("C3_ILETISIM_SOZ_AHLAKI", ["dogruluk", "adalet", "ilim", "gunah-isyan"]),
}
CURATED = ("namaz-", "korunma-", "ismiazam-", "dua-")


def apply(conn: sqlite3.Connection) -> list[str]:
    vt, items = C.load_tag_state(conn)
    changed = []
    for k, (ana, subs) in FIXES.items():
        old_ana, old_alts = vt[k]
        curated = [t for t in old_alts if t.startswith(CURATED)]
        alts = subs + [t for t in curated if t not in subs]
        if (old_ana, list(old_alts)) == (ana, alts):
            continue
        old_items = items.get(k, {})
        vt[k] = (ana, alts)
        items[k] = {t: old_items.get(t, (None, None)) for t in alts}
        changed.append(k)
    if changed:
        write_state(conn, vt, items, only_keys=changed)
        conn.commit()
    return changed


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default="data/app.themes.db")
    a = ap.parse_args(argv)
    ch = apply(sqlite3.connect(a.db))
    print(f"Düzeltildi: {len(ch)} ayet {' '.join(ch)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
