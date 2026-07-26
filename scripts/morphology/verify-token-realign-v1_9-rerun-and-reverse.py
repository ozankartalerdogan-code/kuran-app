#!/usr/bin/env python3
"""Prove, on throwaway copies, that forward.sql cannot double-apply and that
reverse.sql restores the pre-migration state byte for byte.

Read-only with respect to data/app.db and Turso: every experiment happens on a
copy under the OS temp directory, which is deleted at the end.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "data" / "candidates" / "morphology" / "token-realign-v1_9"
BACKUP = REPO / "data" / "app.db.yedek_20260725_010115_pre_token_realign_v1_9"

COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
           "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"]


def snapshot(path: Path) -> tuple[str, int]:
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    rows = connection.execute(
        f"SELECT id, {', '.join(COLUMNS)} FROM words ORDER BY id").fetchall()
    connection.close()
    return hashlib.sha256(repr(rows).encode("utf-8")).hexdigest(), len(rows)


def copy_live(workdir: Path, name: str) -> Path:
    """A WAL-folded copy of the live database, via sqlite's own backup API."""
    target = workdir / name
    source = sqlite3.connect(f"file:{REPO / 'data' / 'app.db'}?mode=ro", uri=True)
    destination = sqlite3.connect(target)
    source.backup(destination)
    destination.commit()
    destination.close()
    source.close()
    return target


def main() -> int:
    forward = (OUT / "forward.sql").read_text(encoding="utf-8")
    reverse = (OUT / "reverse.sql").read_text(encoding="utf-8")
    results: dict[str, object] = {}

    with tempfile.TemporaryDirectory(prefix="token-realign-v1_9-") as tmp:
        workdir = Path(tmp)

        # ---- 1. re-running forward.sql on the migrated db --------------------
        rerun_db = copy_live(workdir, "rerun.db")
        before_hash, before_rows = snapshot(rerun_db)
        connection = sqlite3.connect(rerun_db)
        error = None
        try:
            connection.executescript(forward)
            connection.commit()
        except sqlite3.Error as exc:
            error = f"{type(exc).__name__}: {exc}"
        finally:
            connection.close()
        after_hash, after_rows = snapshot(rerun_db)
        results["rerun"] = {
            "raised": error,
            "rows_before": before_rows,
            "rows_after": after_rows,
            "net_change": before_hash != after_hash,
            "fail_closed_no_net_change": before_hash == after_hash,
        }

        # ---- 2. reverse.sql on a copy of the migrated db ---------------------
        reverse_db = copy_live(workdir, "reverse.db")
        connection = sqlite3.connect(reverse_db)
        connection.executescript(reverse)
        connection.commit()
        connection.close()
        reversed_hash, reversed_rows = snapshot(reverse_db)
        backup_hash, backup_rows = snapshot(BACKUP)
        results["reverse"] = {
            "rows_after_reverse": reversed_rows,
            "backup_rows": backup_rows,
            "words_table_identical_to_backup": reversed_hash == backup_hash,
            "reversed_sha256": reversed_hash,
            "backup_sha256": backup_hash,
        }

    (OUT / "rerun-and-reverse-verification.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))

    ok = (results["rerun"]["fail_closed_no_net_change"]
          and results["rerun"]["rows_after"] == 77_433
          and results["reverse"]["words_table_identical_to_backup"]
          and results["reverse"]["rows_after_reverse"] == 77_429)
    print("\nRERUN + REVERSE:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
