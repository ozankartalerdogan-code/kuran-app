#!/usr/bin/env python3
"""Apply the verified additive v1.8 merge to production data/app.db.

Flow (atomic, restore-on-deviation):
  1. Verify production is the exact DB the merge was built from (sha256 pin).
  2. Take a timestamped backup and record its sha256.
  3. Install the verified byte-identical merge candidate as production.
     (Running merge-forward.sql would change the same cells but NOT reproduce
     the candidate byte-for-byte, so the candidate file - already proven equal
     to the forward patch's logical result - is installed directly. The forward
     SQL stays as the human-readable change manifest.)
  4. Verify every acceptance condition. On ANY deviation, restore from the
     backup and stop. No Buckwalter or other repair is performed.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data"
PROD = DATA / "app.db"
FINAL_DIR = DATA / "candidates" / "morphology" / "final-v1_8"
CANDIDATE = FINAL_DIR / "app.db.merge-candidate"
FORWARD_SQL = FINAL_DIR / "merge-forward.sql"

PROD_SHA_EXPECTED = "f00a3864c59282c91a187438c499687412d044d083987240d502414d80ac7208"
CAND_SHA_EXPECTED = "0c24bde1a60fc346ddd0e3ccbb5409d5c471cf039b8d8558cb9c44d95abd9893"

BASELINE_WORDS = 77429
BASELINE_ROOT_MEANINGS = 1703
BASELINE_ROOT_FILLED = 50297
BASELINE_LEMMA_FILLED = 74140
EXPECT_ROOT_FILLED = BASELINE_ROOT_FILLED + 333
EXPECT_LEMMA_FILLED = BASELINE_LEMMA_FILLED + 664

COLUMNS = ("verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
           "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source",
           "role")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def drop_sidecars(db: Path) -> None:
    for ext in ("-wal", "-shm"):
        side = db.with_name(db.name + ext)
        if side.exists():
            side.unlink()


def fetch_words(path: Path) -> dict[int, tuple]:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        rows = connection.execute(f"SELECT id, {', '.join(COLUMNS)} FROM words").fetchall()
    finally:
        connection.close()
    return {row[0]: row[1:] for row in rows}


def counts(path: Path) -> dict:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        return {
            "integrity": connection.execute("PRAGMA integrity_check").fetchone()[0],
            "words": connection.execute("SELECT COUNT(*) FROM words").fetchone()[0],
            "root_meanings": connection.execute(
                "SELECT COUNT(*) FROM root_meanings").fetchone()[0],
            "root_filled": connection.execute(
                "SELECT COUNT(*) FROM words WHERE root IS NOT NULL AND root<>''").fetchone()[0],
            "lemma_filled": connection.execute(
                "SELECT COUNT(*) FROM words WHERE lemma IS NOT NULL AND lemma<>''").fetchone()[0],
        }
    finally:
        connection.close()


def sample_verse_detail(path: Path, verse_key: str) -> list[dict]:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            "SELECT verse_key, word_index, arabic, root, lemma, pos, meaning_tr "
            "FROM words WHERE verse_key=? ORDER BY word_index, segment_index",
            (verse_key,),
        ).fetchall()
    finally:
        connection.close()
    return [dict(r) for r in rows]


def restore(backup: Path) -> None:
    drop_sidecars(PROD)
    shutil.copyfile(backup, PROD)


def main() -> int:
    report = {"schema_version": "apply-additive-merge-v1_8", "aborted": False}

    # 1. Preconditions --------------------------------------------------------
    if not PROD.exists() or not CANDIDATE.exists():
        raise SystemExit("production or candidate DB missing")
    prod_sha_before = sha256_file(PROD)
    if prod_sha_before != PROD_SHA_EXPECTED:
        raise SystemExit(f"production changed since audit; refusing.\n"
                         f"  expected {PROD_SHA_EXPECTED}\n  actual   {prod_sha_before}")
    cand_sha = sha256_file(CANDIDATE)
    if cand_sha != CAND_SHA_EXPECTED:
        raise SystemExit(f"merge candidate sha mismatch: {cand_sha}")
    wal = PROD.with_name("app.db-wal")
    if wal.exists() and wal.stat().st_size:
        raise SystemExit("production WAL non-empty; checkpoint first")

    baseline = fetch_words(PROD)

    # 2. Backup ---------------------------------------------------------------
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = DATA / f"app.db.yedek_{stamp}_premerge_v1_8"
    shutil.copyfile(PROD, backup)
    backup_sha = sha256_file(backup)
    report["backup"] = {"path": str(backup.relative_to(REPO)).replace("\\", "/"),
                        "sha256": backup_sha}
    report["production_sha_before"] = prod_sha_before
    if backup_sha != prod_sha_before:
        backup.unlink()
        raise SystemExit("backup is not identical to production; aborting")

    # 3. Install the verified candidate as production -------------------------
    drop_sidecars(PROD)
    shutil.copyfile(CANDIDATE, PROD)
    drop_sidecars(PROD)
    prod_sha_after = sha256_file(PROD)
    report["production_sha_after"] = prod_sha_after

    failures = []

    # 4. Verification ---------------------------------------------------------
    if prod_sha_after != CAND_SHA_EXPECTED:
        failures.append("production is not byte-identical to the merge candidate")

    post = counts(PROD)
    report["post_counts"] = post
    if post["integrity"] != "ok":
        failures.append(f"integrity_check={post['integrity']}")
    if post["words"] != BASELINE_WORDS:
        failures.append(f"words count {post['words']} != {BASELINE_WORDS}")
    if post["root_meanings"] != BASELINE_ROOT_MEANINGS:
        failures.append(f"root_meanings {post['root_meanings']} != {BASELINE_ROOT_MEANINGS}")
    if post["root_filled"] != EXPECT_ROOT_FILLED:
        failures.append(f"root_filled {post['root_filled']} != {EXPECT_ROOT_FILLED}")
    if post["lemma_filled"] != EXPECT_LEMMA_FILLED:
        failures.append(f"lemma_filled {post['lemma_filled']} != {EXPECT_LEMMA_FILLED}")

    # Row-level: exactly 949 rows changed, only root/lemma, all fills.
    merged = fetch_words(PROD)
    col = {name: i for i, name in enumerate(COLUMNS)}
    changed_ids = [i for i in baseline if baseline[i] != merged[i]]
    changed_cols, non_additive, lemma_cells, root_cells = set(), 0, 0, 0
    for i in changed_ids:
        for name, idx in col.items():
            b, a = baseline[i][idx], merged[i][idx]
            if b != a:
                changed_cols.add(name)
                if not (b is None or str(b).strip() == ""):
                    non_additive += 1
                if name == "lemma":
                    lemma_cells += 1
                elif name == "root":
                    root_cells += 1
    report["change_audit"] = {
        "changed_rows": len(changed_ids),
        "changed_columns": sorted(changed_cols),
        "lemma_cells": lemma_cells, "root_cells": root_cells,
        "non_additive_changes": non_additive,
    }
    if len(changed_ids) != 949:
        failures.append(f"changed rows {len(changed_ids)} != 949")
    if changed_cols and changed_cols > {"root", "lemma"}:
        failures.append(f"unexpected changed columns: {sorted(changed_cols)}")
    if lemma_cells != 664:
        failures.append(f"lemma cells {lemma_cells} != 664")
    if root_cells != 333:
        failures.append(f"root cells {root_cells} != 333")
    if non_additive:
        failures.append(f"{non_additive} non-additive (overwrote a filled cell)")

    # Second application must be a no-op. Proven on a copy so prod bytes are
    # left exactly as the candidate.
    noop_copy = FINAL_DIR / "app.db.noop-check"
    if noop_copy.exists():
        noop_copy.unlink()
    shutil.copyfile(PROD, noop_copy)
    connection = sqlite3.connect(noop_copy)
    try:
        connection.executescript(FORWARD_SQL.read_text(encoding="utf-8"))
        second_changes = connection.total_changes
        connection.commit()
    finally:
        connection.close()
    drop_sidecars(noop_copy)
    report["second_application_changes"] = second_changes
    if second_changes != 0:
        failures.append(f"second application changed {second_changes} rows (not a no-op)")
    noop_copy.unlink()

    report["sample_verse_detail"] = {
        vk: sample_verse_detail(PROD, vk) for vk in ("2:14", "1:2", "2:181")
    }

    # 5. Decision -------------------------------------------------------------
    if failures:
        restore(backup)
        report["aborted"] = True
        report["failures"] = failures
        report["production_sha_after_restore"] = sha256_file(PROD)
        report["restored_from_backup"] = True
        (FINAL_DIR / "apply-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        raise SystemExit("DEVIATION DETECTED - production restored from backup, stopped.")

    report["all_conditions_passed"] = True
    (FINAL_DIR / "apply-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8")
    print(json.dumps({k: report[k] for k in
                      ("backup", "production_sha_before", "production_sha_after",
                       "post_counts", "change_audit", "second_application_changes",
                       "all_conditions_passed")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
