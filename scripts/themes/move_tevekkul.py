"""Kullanıcı kararı (2026-11-19): dua-tevekkul içindeki dua olmayan EMİR ayetleri genel `tevekkul` etiketine taşınır.

  python scripts/themes/move_tevekkul.py --db data/app.themes.db

Dua/zikir olarak okunan beyan ayetleri (3:173, 9:51, 10:71, 11:56, 65:3, 67:29) dua-tevekkul'de kalır.
İdempotent: tekrar çalıştırmak değişiklik yapmaz.
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common as C  # noqa: E402
from clean import write_state  # noqa: E402

COMMAND_VERSES = ["3:122", "3:159", "3:160", "10:84", "14:11", "26:217", "64:13"]


def move(conn: sqlite3.Connection, keys=COMMAND_VERSES) -> list[str]:
    vt, items = C.load_tag_state(conn)
    changed = []
    for k in keys:
        if k not in vt:
            continue
        ana, alts = vt[k]
        it = dict(items.get(k, {}))
        if "dua-tevekkul" not in alts and "dua-tevekkul" not in it:
            continue
        alts = [t for t in alts if t != "dua-tevekkul"]
        if "tevekkul" not in alts:
            alts.append("tevekkul")
        it.pop("dua-tevekkul", None)
        it.setdefault("tevekkul", (None, None))
        vt[k], items[k] = (ana, alts), it
        changed.append(k)
    if changed:
        write_state(conn, vt, items, only_keys=changed)
        conn.commit()
    return changed


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default="data/app.themes.db")
    a = ap.parse_args(argv)
    conn = sqlite3.connect(a.db)
    ch = move(conn)
    print(f"Taşındı (dua-tevekkul -> tevekkul): {len(ch)} ayet {' '.join(ch)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
