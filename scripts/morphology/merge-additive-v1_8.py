#!/usr/bin/env python3
"""Additive-only merge of the final v1.8 artifact into a COPY of app.db.

Scope, fixed and fail-closed:
  * Never writes data/app.db (or any production DB). It copies the production
    DB to a work path inside data/candidates/morphology/ and edits only that.
  * Fills ONLY the 949 VERIFIED_CORRECT tokens whose subclass is NEW_LEMMA_ONLY
    (616) or NEW_ROOT_ON_CONTENT_WORD (333) - i.e. tokens where the new line
    carries a root/lemma that legacy left empty and the new selection is teacher-
    verified.
  * Writes a cell ONLY when the current legacy value is empty. Any already-filled
    field is left exactly as it is - no overwrite, ever.
  * Touches nothing else: no DIFF, no LEGACY_RICHER, no ALIGNMENT_UNSAFE, no POS,
    no morphology, no source/confidence column.
  * Expected effect is deterministic: 949 rows updated, 997 cells written
    (664 lemma + 333 root; 48 rows get both). Any deviation aborts before commit.

Root convention: the new root is dotted ('ع.ل.م'); the legacy column is dotless
('علم'). Dots are stripped on write, nothing else is transformed. Lemma is
written verbatim (both sides use diacritized Arabic).

Outputs (candidate folder only):
  final-v1_8/app.db.merge-candidate        the edited COPY
  final-v1_8/merge-review.jsonl            one line per cell change (prev/new/evidence)
  final-v1_8/merge-rollback.sql            reverse patch (sets each cell back to NULL)
  final-v1_8/merge-report.json             counts, gates, integrity, checksums
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
FINAL_DIR = CAND_ROOT / "final-v1_8"
COMPARISON = FINAL_DIR / "legacy-comparison.jsonl"

PROD_DB = REPO_ROOT / "data" / "app.db"
PROD_DB_SHA = "f00a3864c59282c91a187438c499687412d044d083987240d502414d80ac7208"
WORK_DB = FINAL_DIR / "app.db.merge-candidate"

TARGET_SUBCLASSES = {"NEW_LEMMA_ONLY", "NEW_ROOT_ON_CONTENT_WORD"}
EXPECT_ROWS = 949
EXPECT_CELLS = 997
EXPECT_LEMMA_CELLS = 664
EXPECT_ROOT_CELLS = 333

FORBIDDEN_WRITES = {
    PROD_DB.resolve(),
    (REPO_ROOT / "data" / "app.db.yedek_20260521_164049").resolve(),
    (REPO_ROOT / "data" / "kuran_core.db").resolve(),
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_empty(value) -> bool:
    return value is None or str(value).strip() == ""


def dotless_root(value: str) -> str:
    return str(value).replace(".", "")


def load_targets() -> list[dict]:
    targets = []
    with COMPARISON.open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            if (row.get("subclass") in TARGET_SUBCLASSES
                    and row.get("new_risk_class") == "VERIFIED_CORRECT"):
                targets.append(row)
    return targets


def assert_work_path(path: Path) -> None:
    resolved = path.resolve()
    if resolved in FORBIDDEN_WRITES:
        raise SystemExit(f"refusing to write a production DB: {resolved}")
    if CAND_ROOT.resolve() not in resolved.parents:
        raise SystemExit(f"work DB must live under data/candidates/morphology: {resolved}")


def main() -> int:
    assert_work_path(WORK_DB)

    # 1. Verify the production source is exactly the DB we audited, then COPY it.
    if not PROD_DB.exists():
        raise SystemExit(f"production DB missing: {PROD_DB}")
    actual = sha256_file(PROD_DB)
    if actual != PROD_DB_SHA:
        raise SystemExit(
            f"production DB changed since the audit; refusing to merge.\n"
            f"  expected {PROD_DB_SHA}\n  actual   {actual}"
        )
    if (PROD_DB.parent / "app.db-wal").exists() and (PROD_DB.parent / "app.db-wal").stat().st_size:
        raise SystemExit("production WAL is non-empty; checkpoint before merging")

    if WORK_DB.exists():
        WORK_DB.unlink()
    shutil.copyfile(PROD_DB, WORK_DB)
    if sha256_file(WORK_DB) != PROD_DB_SHA:
        raise SystemExit("copy is not byte-identical to the production source")

    targets = load_targets()
    if len(targets) != EXPECT_ROWS:
        raise SystemExit(f"expected {EXPECT_ROWS} target rows, found {len(targets)}")

    connection = sqlite3.connect(WORK_DB)
    connection.row_factory = sqlite3.Row
    review: list[dict] = []
    rollback: list[str] = []
    rows_updated = 0
    lemma_cells = 0
    root_cells = 0
    violations: list[dict] = []

    try:
        connection.execute("PRAGMA foreign_keys=ON")
        for target in targets:
            verse_key = target["verse_key"]
            word_index = target["word_index"]
            db_rows = connection.execute(
                "SELECT id, root, lemma FROM words WHERE verse_key=? AND word_index=?",
                (verse_key, word_index),
            ).fetchall()
            if len(db_rows) != 1:
                violations.append({"token_id": target["token_id"],
                                   "reason": f"expected 1 legacy row, got {len(db_rows)}"})
                continue
            db_row = db_rows[0]
            row_id = db_row["id"]

            updates = {}
            row_changes = []
            # Lemma: fill only if new provides one and legacy cell is empty.
            if target["lemma_state"] == "NEW_ONLY":
                if not is_empty(db_row["lemma"]):
                    violations.append({"token_id": target["token_id"],
                                       "reason": "lemma cell not empty at write time"})
                    continue
                new_lemma = target["new_lemma"]
                if is_empty(new_lemma):
                    violations.append({"token_id": target["token_id"],
                                       "reason": "new lemma missing"})
                    continue
                updates["lemma"] = new_lemma
                row_changes.append(("lemma", db_row["lemma"], new_lemma))
            # Root: dot-stripped to match the legacy dotless convention.
            if target["root_state"] == "NEW_ONLY":
                if not is_empty(db_row["root"]):
                    violations.append({"token_id": target["token_id"],
                                       "reason": "root cell not empty at write time"})
                    continue
                new_root = dotless_root(target["new_root"])
                if is_empty(new_root):
                    violations.append({"token_id": target["token_id"],
                                       "reason": "new root missing"})
                    continue
                updates["root"] = new_root
                row_changes.append(("root", db_row["root"], new_root))

            if not updates:
                violations.append({"token_id": target["token_id"],
                                   "reason": "no fillable field"})
                continue

            set_clause = ", ".join(f"{col}=?" for col in updates)
            connection.execute(
                f"UPDATE words SET {set_clause} WHERE id=?",
                (*updates.values(), row_id),
            )
            rows_updated += 1
            for field, prev, new in row_changes:
                if field == "lemma":
                    lemma_cells += 1
                else:
                    root_cells += 1
                review.append({
                    "token_id": target["token_id"],
                    "verse_key": verse_key,
                    "word_index": word_index,
                    "db_id": row_id,
                    "canonical_arabic": target["canonical_arabic"],
                    "field": field,
                    "previous_value": prev,
                    "new_value": new,
                    "evidence_class": target["subclass"],
                    "risk_class": target["new_risk_class"],
                    "new_verdict": target["new_verdict"],
                    "new_root_dotted": target["new_root"] if field == "root" else None,
                    "corruption_flags": target.get("corruption_flags") or [],
                })
                # Reverse patch restores the exact previous cell (NULL/empty).
                if prev is None:
                    rollback.append(f"UPDATE words SET {field}=NULL WHERE id={row_id};")
                else:
                    escaped = str(prev).replace("'", "''")
                    rollback.append(
                        f"UPDATE words SET {field}='{escaped}' WHERE id={row_id};")

        # ---- Fail-closed gates BEFORE commit ----------------------------------
        gate_failures = []
        if violations:
            gate_failures.append(f"{len(violations)} precondition violations")
        if rows_updated != EXPECT_ROWS:
            gate_failures.append(f"rows_updated {rows_updated} != {EXPECT_ROWS}")
        cells = lemma_cells + root_cells
        if cells != EXPECT_CELLS:
            gate_failures.append(f"cells {cells} != {EXPECT_CELLS}")
        if lemma_cells != EXPECT_LEMMA_CELLS:
            gate_failures.append(f"lemma_cells {lemma_cells} != {EXPECT_LEMMA_CELLS}")
        if root_cells != EXPECT_ROOT_CELLS:
            gate_failures.append(f"root_cells {root_cells} != {EXPECT_ROOT_CELLS}")

        if gate_failures:
            connection.rollback()
            connection.close()
            if WORK_DB.exists():
                WORK_DB.unlink()
            raise SystemExit("FAIL-CLOSED, no artifact written:\n  - "
                             + "\n  - ".join(gate_failures)
                             + (f"\n  first violations: {violations[:5]}" if violations else ""))

        connection.commit()

        # ---- Post-merge verification -----------------------------------------
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        fk = connection.execute("PRAGMA foreign_key_check").fetchall()
        total = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
        distinct_keys = connection.execute(
            "SELECT COUNT(*) FROM (SELECT DISTINCT verse_key, word_index FROM words)"
        ).fetchone()[0]
        root_filled = connection.execute(
            "SELECT COUNT(*) FROM words WHERE root IS NOT NULL AND root<>''"
        ).fetchone()[0]
        lemma_filled = connection.execute(
            "SELECT COUNT(*) FROM words WHERE lemma IS NOT NULL AND lemma<>''"
        ).fetchone()[0]
        # App-query smoke: the shape the runtime reads a verse in.
        smoke = connection.execute(
            "SELECT verse_key, word_index, arabic, root, lemma, pos "
            "FROM words WHERE verse_key=? ORDER BY word_index", ("2:14",),
        ).fetchall()
    finally:
        connection.close()

    review.sort(key=lambda r: (int(r["verse_key"].split(":")[0]),
                               int(r["verse_key"].split(":")[1]),
                               r["word_index"], r["field"]))
    with (FINAL_DIR / "merge-review.jsonl").open("w", encoding="utf-8", newline="\n") as handle:
        for entry in review:
            handle.write(json.dumps(entry, ensure_ascii=False, sort_keys=True) + "\n")

    with (FINAL_DIR / "merge-rollback.sql").open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("-- Reverse patch for the additive v1.8 merge.\n")
        handle.write("-- Restores every touched cell to its pre-merge value.\n")
        handle.write("BEGIN;\n")
        for statement in rollback:
            handle.write(statement + "\n")
        handle.write("COMMIT;\n")

    baseline_root_filled = 50297
    baseline_lemma_filled = 74140
    report = {
        "schema_version": "additive-merge-v1_8",
        "wrote_production_db": False,
        "source": {"path": "data/app.db", "sha256": PROD_DB_SHA, "verified": True},
        "work_db": "data/candidates/morphology/final-v1_8/app.db.merge-candidate",
        "gates": {
            "rows_updated": rows_updated,
            "expected_rows": EXPECT_ROWS,
            "cells_written": lemma_cells + root_cells,
            "expected_cells": EXPECT_CELLS,
            "lemma_cells": lemma_cells,
            "root_cells": root_cells,
            "precondition_violations": len(violations),
            "all_gates_passed": True,
        },
        "never_overwrote_filled_field": True,
        "integrity": {
            "integrity_check": integrity,
            "foreign_key_violations": len(fk),
            "row_count": total,
            "row_count_unchanged": total == 77429,
            "distinct_keys": distinct_keys,
        },
        "fill_delta": {
            "root_filled_before": baseline_root_filled,
            "root_filled_after": root_filled,
            "root_gain": root_filled - baseline_root_filled,
            "lemma_filled_before": baseline_lemma_filled,
            "lemma_filled_after": lemma_filled,
            "lemma_gain": lemma_filled - baseline_lemma_filled,
        },
        "smoke_query_2_14": [dict(r) for r in smoke],
        "checksums": {
            "app.db.merge-candidate": sha256_file(WORK_DB),
            "merge-review.jsonl": sha256_file(FINAL_DIR / "merge-review.jsonl"),
            "merge-rollback.sql": sha256_file(FINAL_DIR / "merge-rollback.sql"),
        },
        "flagged_targets_note": (
            "2 target rows carry LEGACY_MORPHOLOGY_EMPTY/POS_EMPTY (2:181:14, "
            "8:6:12 - legacy split-artifact rows). Only their empty root/lemma "
            "cells are filled; the empty morphology/pos columns are left untouched."
        ),
    }
    with (FINAL_DIR / "merge-report.json").open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")

    print(json.dumps({k: report[k] for k in
                      ("wrote_production_db", "gates", "integrity", "fill_delta",
                       "checksums")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
