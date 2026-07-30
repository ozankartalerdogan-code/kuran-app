#!/usr/bin/env python3
"""The combined acceptance package: what one future round would take on.

This script writes nothing new. It reads the frozen and prepared artefacts and
assembles the single list a combined acceptance round would run, plus the
records that stay open because nothing in this repo can close them.

Nothing here is applied: no dump is regenerated, the selector is not run, the
CAMeL DB is not written and the production DB is not touched.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"

HAMZA = CAND_ROOT / "hamza-carrier-v1" / "report.json"
SEGMENTATION = CAND_ROOT / "segmentation-v1" / "report.json"
LEXICON = CAND_ROOT / "lexicon-oov-sources-v1" / "report.json"
FREEZE = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
OUT_DIR = CAND_ROOT / "acceptance-package-v1"

SCHEMA_VERSION = "acceptance-package-v1"


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

    hamza = json.loads(HAMZA.read_text(encoding="utf-8"))
    segmentation = json.loads(SEGMENTATION.read_text(encoding="utf-8"))
    lexicon = json.loads(LEXICON.read_text(encoding="utf-8"))

    hc1 = "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW"
    hamza_tokens = hamza["closable_token_count"]
    segmentation_safe = len(segmentation["safe_records"])
    lexicon_ready_groups = [g for g in lexicon["group_detail"]
                            if g["status"] == "READY_FOR_AUTHORED_LEXICON"]
    lexicon_ready_tokens = sum(g["tokens"] for g in lexicon_ready_groups)

    package = {
        "schema_version": SCHEMA_VERSION,
        "status": "PREPARED_NOT_APPLIED",
        "frozen_chain_head": {
            "manifest": str(FREEZE.relative_to(REPO_ROOT)).replace("\\", "/"),
            "sha256": sha256_file(FREEZE),
        },
        "items": {
            "hamza_carrier_rule": {
                "rule": hc1,
                "definition": hamza["rule_doc"][hc1],
                "tokens_expected_to_close": hamza_tokens,
                "evidence": {
                    "in_scope_reached_teacher_core":
                        hamza["in_scope"][hc1]["tokens_reached_teacher_core"],
                    "candidates_compatible": hamza["in_scope"][hc1]["candidates_compatible"],
                    "candidates_incompatible": hamza["in_scope"][hc1]["candidates_incompatible"],
                    "negative_sample_surfaces":
                        hamza["negative_sample"][hc1]["surfaces_fired_on"],
                    "v1_7_correct_tokens_given_a_competing_core":
                        hamza["negative_sample"][hc1]["v1_7_correct_tokens_given_a_competing_core"],
                },
                "state": "PROPOSED_PRODUCTION_CANDIDATE, measured but never applied",
            },
            "segmentation_records": {
                "safe_records": segmentation_safe,
                "tokens_expected_to_close": segmentation_safe,
                "state": ("nothing qualified: both tokens decompose under more than "
                          "one licensed frame, so no contract was proposed"),
                "unresolved": segmentation["unresolved_records"],
            },
            "authored_lexicon_entries": {
                "groups": len(lexicon_ready_groups),
                "tokens": lexicon_ready_tokens,
                "tokens_expected_to_close": 0,
                "state": ("READY means the repo evidence is assembled and free of "
                          "conflict, NOT that an entry exists. No CAMeL entry was "
                          "written this round, so these close nothing until someone "
                          "authors them."),
                "caveat": lexicon["readiness_caveat"],
                "entries": [
                    {"lemma": g["lexical_core"]["lemma"],
                     "root": g["lexical_core"]["root"],
                     "pos": g["lexical_core"]["pos"],
                     "tokens": g["tokens"],
                     "surfaces": sorted(g["surfaces"]),
                     "root_corroboration": g["root_corroboration_outside_qac_lineage"],
                     "camel_status": g["camel_status"]}
                    for g in lexicon_ready_groups],
            },
        },
        "expected_total_closure": {
            "from_hamza_carrier_rule": hamza_tokens,
            "from_segmentation": segmentation_safe,
            "from_authored_lexicon_entries_in_this_round": 0,
            "total_now": hamza_tokens + segmentation_safe,
            "note": ("only the hamza carrier rule is runnable as-is. The lexicon "
                     "groups become closable only after entries are authored and "
                     "each entry passes its own surface validation and additivity "
                     "gate, which is a separate round."),
        },
        "open_records": {
            "hamza_risky_tokens": sum(
                1 for line in (CAND_ROOT / "hamza-carrier-v1" / "classification.jsonl")
                .read_text(encoding="utf-8").strip().split("\n")
                if json.loads(line)["closed_by"]
                and not any(rule == "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW"
                            for rule in json.loads(line)["closed_by"])),
            "hamza_open_detail": {
                "risky": 12,
                "unresolved": hamza["unresolved_count"],
                "note": ("12 reachable only through rules rejected for regression "
                         "risk; 1 (تَسَآءَلُونَ) reachable by no carrier rule"),
            },
            "segmentation_unresolved": len(segmentation["unresolved_records"]),
            "lexicon_needs_external_verification": {
                "groups": lexicon["status_counts"].get("NEEDS_EXTERNAL_VERIFICATION", 0),
                "tokens": lexicon["tokens_by_status"].get("NEEDS_EXTERNAL_VERIFICATION", 0),
                "reasons": lexicon["missing_reasons"],
            },
            "lemma_and_pos_single_source_for_every_lexicon_group": True,
        },
        "input_checksums": {
            "hamza-carrier-v1/report.json": sha256_file(HAMZA),
            "segmentation-v1/report.json": sha256_file(SEGMENTATION),
            "lexicon-oov-sources-v1/report.json": sha256_file(LEXICON),
        },
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "package.json").write_text(
        json.dumps(package, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {"schema_version": SCHEMA_VERSION,
                 "package.json": sha256_file(out_dir / "package.json")}
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": package["status"],
        "expected_total_closure": package["expected_total_closure"],
        "hamza_rule_tokens": hamza_tokens,
        "segmentation_safe": segmentation_safe,
        "lexicon_ready_groups": len(lexicon_ready_groups),
        "lexicon_ready_tokens": lexicon_ready_tokens,
        "open_records": {k: v for k, v in package["open_records"].items()
                         if k != "hamza_open_detail"},
        "checksums": checksums,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
