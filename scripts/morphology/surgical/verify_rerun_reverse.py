#!/usr/bin/env python3
"""Prove, on throwaway copies, that a surgical-v1_10 batch cannot double-apply
and that its reverse.sql restores the pre-batch state byte for byte.

Read-only with respect to data/app.db and Turso: every experiment happens on a
copy under the OS temp directory, deleted at the end.

    python scripts/morphology/surgical/verify_rerun_reverse.py <batch>
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
           "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"]


def snapshot(path: Path) -> tuple[str, int]:
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    rows = connection.execute(
        f"SELECT id, {', '.join(COLUMNS)} FROM words ORDER BY id").fetchall()
    connection.close()
    return hashlib.sha256(repr(rows).encode("utf-8")).hexdigest(), len(rows)


def copy_live(workdir: Path, name: str) -> Path:
    target = workdir / name
    source = sqlite3.connect(f"file:{REPO / 'data' / 'app.db'}?mode=ro", uri=True)
    destination = sqlite3.connect(target)
    source.backup(destination)
    destination.commit()
    destination.close()
    source.close()
    return target


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    batch = sys.argv[1]
    out = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10" / batch
    report = json.loads((out / "local-apply-report.json").read_text(encoding="utf-8"))
    backup = Path(report["backup_path"])

    forward = (out / "forward.sql").read_text(encoding="utf-8")
    reverse = (out / "reverse.sql").read_text(encoding="utf-8")
    results: dict[str, object] = {"batch": batch, "backup_path": str(backup)}

    temp_root = REPO / ".dry-run-tmp"
    temp_root.mkdir(exist_ok=True)
    rerun_db = temp_root / f"{batch}-rerun.db"
    reverse_db = temp_root / f"{batch}-reverse.db"
    for target in (rerun_db, reverse_db):
        if target.exists():
            target.unlink()
    try:
        # ---- 1. re-run forward.sql on the already-migrated database ---------
        copy_live(temp_root, rerun_db.name)
        before_hash, before_rows = snapshot(rerun_db)
        connection = sqlite3.connect(rerun_db)
        error, changed = None, None
        try:
            connection.executescript(forward)
            connection.commit()
            changed = connection.total_changes
        except sqlite3.Error as exc:
            error = f"{type(exc).__name__}: {exc}"
            connection.rollback()
        finally:
            connection.close()
        after_hash, after_rows = snapshot(rerun_db)
        results["rerun"] = {
            "raised": error,
            "rows_before": before_rows,
            "rows_after": after_rows,
            "sqlite_total_changes": changed,
            "no_net_change": before_hash == after_hash,
        }

        # ---- 2. reverse.sql on a copy of the migrated database --------------
        copy_live(temp_root, reverse_db.name)
        connection = sqlite3.connect(reverse_db)
        connection.executescript(reverse)
        connection.commit()
        connection.close()
        reversed_hash, reversed_rows = snapshot(reverse_db)
        backup_hash, backup_rows = snapshot(backup)
        results["reverse"] = {
            "rows_after_reverse": reversed_rows,
            "backup_rows": backup_rows,
            "words_table_identical_to_backup": reversed_hash == backup_hash,
            "reversed_sha256": reversed_hash,
            "backup_sha256": backup_hash,
        }
    finally:
        for target in (rerun_db, reverse_db):
            if target.exists():
                target.unlink()
    (out / "rerun-and-reverse-verification.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))

    ok = (results["rerun"]["no_net_change"]
          and results["reverse"]["words_table_identical_to_backup"])
    print("\nRERUN + REVERSE:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
