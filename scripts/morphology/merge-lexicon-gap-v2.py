#!/usr/bin/env python3
"""Move the PARADIGM_GAP bucket into LEXICON_OOV and report the merged total.

`analyze-paradigm-gap-v2.py` asked whether the 44 PARADIGM_GAP tokens are missing
a STEM of a lexeme CAMeL already carries. The answer was no: 34 have no existing
stem under any overt paradigm at all, 6 are lexically ambiguous, and the 4 that
derived were all rejected - 3 because CAMeL has no attested category licensing
the suffix, 1 in surface validation. Zero entries were accepted.

So the label was wrong. What these tokens are missing is the lexeme itself,
exactly like LEXICON_OOV. This script performs the migration as a NEW artefact -
the frozen v1.7 residual classification is never edited - and reports the merged
lexicon-gap total.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
RESIDUAL_V1 = CAND_ROOT / "orthographic-residual-v1" / "classification.jsonl"
PARADIGM_REPORT = CAND_ROOT / "paradigm-gap-v2" / "report.json"
OUT_DIR = CAND_ROOT / "lexicon-gap-v2"

SCHEMA_VERSION = "lexicon-gap-v2"
MIGRATED_FROM = "PARADIGM_GAP"
MIGRATED_TO = "LEXICON_OOV"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    paradigm = json.loads(PARADIGM_REPORT.read_text(encoding="utf-8"))
    if paradigm["accepted_distinct_lexemes"] != 0:
        raise SystemExit("refusing to migrate: paradigm-gap-v2 accepted entries")

    rows = [json.loads(l) for l in RESIDUAL_V1.open(encoding="utf-8")]
    before = collections.Counter(r["bucket"] for r in rows)

    migrated = []
    for row in rows:
        if row["bucket"] != MIGRATED_FROM:
            continue
        record = dict(row)
        record["bucket"] = MIGRATED_TO
        record["migrated_from"] = MIGRATED_FROM
        record["migration_reason"] = (
            "paradigm-gap-v2 found no derivable stem of an existing CAMeL lexeme: "
            "no existing stem under an overt paradigm, or the derivation was "
            "ambiguous, or it failed surface validation")
        migrated.append(record)

    lexicon_rows = [dict(r) for r in rows if r["bucket"] == MIGRATED_TO] + migrated
    lexicon_rows.sort(key=lambda r: (int(r["verse_key"].split(":")[0]),
                                     int(r["verse_key"].split(":")[1]),
                                     r["word_index"]))

    after = collections.Counter(before)
    after[MIGRATED_TO] += after.pop(MIGRATED_FROM, 0)

    surfaces = collections.Counter(r["canonical_text"] for r in lexicon_rows)
    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "residual_v1_sha256": sha256_file(RESIDUAL_V1),
            "paradigm_gap_v2_report_sha256": sha256_file(PARADIGM_REPORT),
        },
        "migration": {
            "from": MIGRATED_FROM, "to": MIGRATED_TO,
            "tokens_migrated": len(migrated),
            "evidence": {
                "outcomes": paradigm["outcomes"],
                "surface_validation_summary": paradigm["surface_validation_summary"],
                "accepted_distinct_lexemes": paradigm["accepted_distinct_lexemes"],
                "expected_closures_next_full_dump_round":
                    paradigm["expected_closures_next_full_dump_round"],
            },
            "frozen_residual_v1_edited": False,
        },
        "buckets_before": dict(sorted(before.items(), key=lambda kv: (-kv[1], kv[0]))),
        "buckets_after": dict(sorted(after.items(), key=lambda kv: (-kv[1], kv[0]))),
        "lexicon_gap_total": len(lexicon_rows),
        "lexicon_gap_distinct_surfaces": len(surfaces),
        "lexicon_gap_surfaces": dict(sorted(surfaces.items(),
                                            key=lambda kv: (-kv[1], kv[0]))),
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "classification.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n"
                for r in lexicon_rows), encoding="utf-8", newline="\n")
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "classification.jsonl": sha256_file(out_dir / "classification.jsonl"),
        "report.json": sha256_file(out_dir / "report.json"),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in
                      ("migration", "buckets_before", "buckets_after",
                       "lexicon_gap_total", "lexicon_gap_distinct_surfaces")}
                     | {"checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
