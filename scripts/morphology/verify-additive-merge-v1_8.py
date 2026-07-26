#!/usr/bin/env python3
"""Independent verification of the additive v1.8 merge candidate.

Re-derives the diff between the production DB and the merge candidate directly
from the two databases (not from the merge script's own bookkeeping) and proves:

  * exactly 949 rows differ, on exactly the (verse_key, word_index) target set;
  * every difference is a NULL/empty -> value fill (never an overwrite);
  * only the root and lemma columns changed; every other column is untouched on
    every one of the 77,429 rows;
  * applying merge-rollback.sql to a copy of the candidate reproduces the
    production DB's `words` content exactly.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FINAL_DIR = REPO_ROOT / "data" / "candidates" / "morphology" / "final-v1_8"
PROD_DB = REPO_ROOT / "data" / "app.db"
WORK_DB = FINAL_DIR / "app.db.merge-candidate"
ROLLBACK = FINAL_DIR / "merge-rollback.sql"
REVIEW = FINAL_DIR / "merge-review.jsonl"

COLUMNS = ("verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
           "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source",
           "role")


def fetch_words(path: Path) -> dict[int, tuple]:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        rows = connection.execute(
            f"SELECT id, {', '.join(COLUMNS)} FROM words"
        ).fetchall()
    finally:
        connection.close()
    return {row[0]: row[1:] for row in rows}


def row_digest(mapping: dict[int, tuple]) -> str:
    digest = hashlib.sha256()
    for row_id in sorted(mapping):
        digest.update(repr((row_id, mapping[row_id])).encode("utf-8"))
    return digest.hexdigest()


def main() -> int:
    prod = fetch_words(PROD_DB)
    cand = fetch_words(WORK_DB)

    result = {"schema_version": "additive-merge-v1_8-verify"}

    # Same id set, same row count.
    result["same_id_set"] = set(prod) == set(cand)
    result["prod_rows"] = len(prod)
    result["cand_rows"] = len(cand)

    col_index = {name: i for i, name in enumerate(COLUMNS)}
    changed_ids = []
    changed_columns = set()
    non_additive = []
    for row_id in prod:
        if prod[row_id] != cand[row_id]:
            changed_ids.append(row_id)
            for name, idx in col_index.items():
                before, after = prod[row_id][idx], cand[row_id][idx]
                if before != after:
                    changed_columns.add(name)
                    before_empty = before is None or str(before).strip() == ""
                    if not before_empty:
                        non_additive.append({"id": row_id, "column": name,
                                             "before": before, "after": after})

    review_keys = set()
    with REVIEW.open(encoding="utf-8") as handle:
        for line in handle:
            entry = json.loads(line)
            review_keys.add((entry["verse_key"], entry["word_index"]))

    changed_keys = {(cand[i][col_index["verse_key"]], cand[i][col_index["word_index"]])
                    for i in changed_ids}

    result["changed_rows"] = len(changed_ids)
    result["changed_rows_is_949"] = len(changed_ids) == 949
    result["changed_columns"] = sorted(changed_columns)
    result["only_root_and_lemma_changed"] = changed_columns <= {"root", "lemma"}
    result["non_additive_changes"] = len(non_additive)
    result["all_changes_additive"] = not non_additive
    result["changed_keys_match_review"] = changed_keys == review_keys

    # Rollback proof: apply the reverse patch to a throwaway copy, compare to prod.
    rollback_copy = FINAL_DIR / "app.db.rollback-check"
    if rollback_copy.exists():
        rollback_copy.unlink()
    shutil.copyfile(WORK_DB, rollback_copy)
    connection = sqlite3.connect(rollback_copy)
    try:
        connection.executescript(ROLLBACK.read_text(encoding="utf-8"))
        connection.commit()
    finally:
        connection.close()
    rolled_back = fetch_words(rollback_copy)
    result["rollback_reproduces_production"] = row_digest(rolled_back) == row_digest(prod)
    rollback_copy.unlink()

    result["all_checks_passed"] = all([
        result["same_id_set"],
        result["changed_rows_is_949"],
        result["only_root_and_lemma_changed"],
        result["all_changes_additive"],
        result["changed_keys_match_review"],
        result["rollback_reproduces_production"],
    ])

    with (FINAL_DIR / "merge-verification.json").open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["all_checks_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
