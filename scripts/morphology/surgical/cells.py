#!/usr/bin/env python3
"""Turn a list of cell decisions into a guarded, reversible migration.

Input  : a JSON file holding {"batch": "...", "decisions": [ ... ]} where every
         decision names one cell —
             {"words_id": 58040, "verse_key": "37:130", "word_index": 4,
              "column": "lemma", "after": "...", "evidence": "..."}
         `before` is read from the live database, never trusted from the input.
Output : forward.sql, reverse.sql, preimage.json, field-change-manifest.json
         under data/candidates/morphology/surgical-v1_10/<batch>/

Read-only with respect to every database: data/app.db is opened mode=ro and
Turso is never contacted. Nothing here applies anything.

Guard shape, identical to the token-realign-v1_9 migration that is already in
production: every UPDATE is pinned on id + verse_key + word_index + the exact
pre-image value of the column being written. A cell that has drifted since the
plan was generated simply does not match, so a stale plan is a no-op instead of
a silent overwrite.

    python scripts/morphology/surgical/cells.py <decisions.json>
"""

from __future__ import annotations

import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DB = REPO / "data" / "app.db"
ROOT_OUT = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10"

WRITABLE_COLUMNS = {"arabic", "root", "lemma", "pos", "morphology",
                    "meaning_tr", "gloss_en", "confidence", "source", "role"}
ALL_COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
               "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"]


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def guard(row, column):
    """id + verse_key + word_index + the exact pre-image of the target column."""
    before = row[column]
    predicate = (f"{column} IS NULL" if before is None
                 else f"{column} = {sql_literal(before)}")
    return (f"WHERE id = {row['id']}"
            f" AND verse_key = {sql_literal(row['verse_key'])}"
            f" AND word_index = {row['word_index']}"
            f" AND {predicate}")


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    batch = spec["batch"]
    decisions = spec["decisions"]
    out = ROOT_OUT / batch
    out.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row

    changes, preimage, forward, reverse, skipped = [], {}, [], [], []

    for decision in decisions:
        column = decision["column"]
        if column not in WRITABLE_COLUMNS:
            raise SystemExit(f"refusing to write column {column!r}")
        words_id = decision["words_id"]
        row = connection.execute(
            f"SELECT id, {', '.join(ALL_COLUMNS)} FROM words WHERE id = ?",
            (words_id,)).fetchone()
        if row is None:
            raise SystemExit(f"words.id {words_id} not found")
        if row["verse_key"] != decision["verse_key"] or row["word_index"] != decision["word_index"]:
            raise SystemExit(
                f"id {words_id} is {row['verse_key']}:{row['word_index']}, "
                f"decision says {decision['verse_key']}:{decision['word_index']}")

        before, after = row[column], decision["after"]
        if before == after:
            skipped.append({"words_id": words_id, "column": column,
                            "reason": "already at target value"})
            continue

        preimage[words_id] = {key: row[key] for key in ["id"] + ALL_COLUMNS}
        changes.append({
            "words_id": words_id, "verse_key": row["verse_key"],
            "word_index": row["word_index"], "column": column,
            "before": before, "after": after,
            "evidence": decision.get("evidence", ""),
        })
        forward.append(f"UPDATE words SET {column} = {sql_literal(after)} "
                       + guard(row, column) + ";")
        # the reverse guard pins the value the forward migration wrote
        reverse_predicate = (f"{column} IS NULL" if after is None
                             else f"{column} = {sql_literal(after)}")
        reverse.append(
            f"UPDATE words SET {column} = {sql_literal(before)}"
            f" WHERE id = {row['id']}"
            f" AND verse_key = {sql_literal(row['verse_key'])}"
            f" AND word_index = {row['word_index']}"
            f" AND {reverse_predicate};")

    total_rows = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    connection.close()

    summary = {
        "batch": batch,
        "cells_to_change": len(changes),
        "rows_touched": len({c["words_id"] for c in changes}),
        "verses_touched": sorted({c["verse_key"] for c in changes}),
        "cells_by_column": dict(Counter(c["column"] for c in changes)),
        "skipped_already_at_target": skipped,
        "corpus_rows_before": total_rows,
        "corpus_rows_after": total_rows,   # cell updates never change row count
    }

    (out / "field-change-manifest.json").write_text(
        json.dumps(changes, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "preimage.json").write_text(
        json.dumps(list(preimage.values()), ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    (out / "forward.sql").write_text("\n".join([
        f"-- surgical-v1_10/{batch} forward migration DRAFT - NOT APPLIED",
        "-- Generated by scripts/morphology/surgical/cells.py",
        f"-- {len(changes)} cell(s) across {summary['rows_touched']} row(s); "
        f"row count unchanged at {total_rows}",
        "-- Each UPDATE is pinned on id + verse_key + word_index + the exact",
        "-- pre-image value, so a re-run or a drifted cell matches nothing.",
        "BEGIN IMMEDIATE;", ""] + forward + [
        "", f"-- SELECT COUNT(*) FROM words;  -- expect {total_rows}",
        "COMMIT;"]), encoding="utf-8")

    (out / "reverse.sql").write_text("\n".join([
        f"-- surgical-v1_10/{batch} reverse migration DRAFT - NOT APPLIED",
        "-- Restores the exact pre-image captured in preimage.json.",
        "BEGIN IMMEDIATE;", ""] + list(reversed(reverse)) + [
        "", f"-- SELECT COUNT(*) FROM words;  -- expect {total_rows}",
        "COMMIT;"]), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    for change in changes:
        print(f"  {change['verse_key']}:{change['word_index']} id={change['words_id']} "
              f"{change['column']}: {change['before']!r} -> {change['after']!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
