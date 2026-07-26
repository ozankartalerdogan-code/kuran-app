#!/usr/bin/env python3
"""Apply a surgical-v1_10 batch to local data/app.db and re-check every gate.

Takes its own timestamped SQLite .backup first, then uses that backup as the
authority for "nothing outside this batch moved" — a row-by-row comparison in
one process, not a hash constant carried between runtimes.

    python scripts/morphology/surgical/apply_local.py <batch>
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DB = REPO / "data" / "app.db"

COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
           "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"]


def all_rows(connection, exclude_ids=frozenset()):
    return [row for row in connection.execute(
        f"SELECT id, {', '.join(COLUMNS)} FROM words ORDER BY id")
        if row[0] not in exclude_ids]


def fingerprint(connection, exclude_ids=frozenset()):
    digest = hashlib.sha256()
    count = 0
    for row in all_rows(connection, exclude_ids):
        digest.update(repr(row).encode("utf-8"))
        count += 1
    return digest.hexdigest(), count


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    batch = sys.argv[1]
    out = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10" / batch

    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
    changes = json.loads((out / "field-change-manifest.json").read_text(encoding="utf-8"))
    touched_ids = frozenset(c["words_id"] for c in changes)
    expected_rows = summary["corpus_rows_before"]

    # ---- backup -----------------------------------------------------------
    stamp = time.strftime("%Y%m%d_%H%M%S")
    backup_path = REPO / "data" / f"app.db.yedek_{stamp}_pre_{batch.replace('-', '_')}"
    source = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    backup_connection = sqlite3.connect(backup_path)
    source.backup(backup_connection)
    backup_connection.commit()
    backup_rows = backup_connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    backup_integrity = backup_connection.execute("PRAGMA integrity_check").fetchone()[0]
    source.close()
    if backup_rows != expected_rows or backup_integrity != "ok":
        print(f"ABORT: backup has {backup_rows} rows, integrity={backup_integrity}")
        backup_connection.close()
        return 1

    # ---- apply ------------------------------------------------------------
    connection = sqlite3.connect(DB)
    connection.execute("PRAGMA foreign_keys = ON")
    before = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    if before != expected_rows:
        print(f"ABORT: rows before = {before}, expected {expected_rows}")
        return 1

    connection.executescript((out / "forward.sql").read_text(encoding="utf-8"))
    after = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]

    # ---- gates ------------------------------------------------------------
    untouched_after, untouched_count = fingerprint(connection, touched_ids)
    untouched_backup, backup_count = fingerprint(backup_connection, touched_ids)
    drifted = [live[0] for live, kept in
               zip(all_rows(connection, touched_ids), all_rows(backup_connection, touched_ids))
               if live != kept]

    applied = []
    for change in changes:
        value = connection.execute(
            f"SELECT {change['column']} FROM words WHERE id = ?",
            (change["words_id"],)).fetchone()[0]
        applied.append({"words_id": change["words_id"], "column": change["column"],
                        "expected": change["after"], "actual": value,
                        "ok": value == change["after"]})

    bad_index = []
    for (verse_key,) in connection.execute("SELECT DISTINCT verse_key FROM words"):
        indexes = [r[0] for r in connection.execute(
            "SELECT word_index FROM words WHERE verse_key=? ORDER BY word_index", (verse_key,))]
        if indexes != list(range(1, len(indexes) + 1)):
            bad_index.append(verse_key)

    results = {
        "batch": batch,
        "backup_path": str(backup_path),
        "backup_sha256": hashlib.sha256(backup_path.read_bytes()).hexdigest(),
        "rows_before": before,
        "rows_after": after,
        "cells_expected": len(changes),
        "cells_applied": sum(1 for a in applied if a["ok"]),
        "cells_not_applied": [a for a in applied if not a["ok"]],
        "untouched_rows": untouched_count,
        "untouched_unchanged": untouched_after == untouched_backup,
        "untouched_rows_drifted": drifted[:20],
        "integrity_check": connection.execute("PRAGMA integrity_check").fetchone()[0],
        "foreign_key_check": connection.execute("PRAGMA foreign_key_check").fetchall(),
        "ascii_in_root_or_lemma": connection.execute(
            "SELECT COUNT(*) FROM words WHERE root GLOB '*[A-Za-z]*' "
            "OR lemma GLOB '*[A-Za-z]*'").fetchone()[0],
        "verses_checked": connection.execute(
            "SELECT COUNT(DISTINCT verse_key) FROM words").fetchone()[0],
        "verses_with_bad_word_index": bad_index,
        "null_meaning_tr": connection.execute(
            "SELECT COUNT(*) FROM words WHERE meaning_tr IS NULL").fetchone()[0],
    }

    connection.commit()
    connection.close()
    backup_connection.close()

    (out / "local-apply-report.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))

    ok = (after == expected_rows
          and results["cells_applied"] == len(changes)
          and not results["cells_not_applied"]
          and results["untouched_unchanged"] and not drifted
          and results["untouched_rows"] == backup_count
          and results["integrity_check"] == "ok"
          and not results["foreign_key_check"]
          and results["ascii_in_root_or_lemma"] == 0
          and not bad_index
          and results["verses_checked"] == 6236)
    print("\nLOCAL GATES:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
