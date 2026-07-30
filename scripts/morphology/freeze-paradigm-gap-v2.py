#!/usr/bin/env python3
"""Freeze the PARADIGM_GAP v2 NEGATIVE result and the LEXICON_OOV migration.

Chained to the v1.7 production manifest. Nothing was accepted this round, so
what is being frozen is a proven "no": the 44 PARADIGM_GAP tokens are not
missing a stem of a lexeme CAMeL already has, and they have been merged into
LEXICON_OOV, bringing that bucket to 50.

A negative result is worth pinning for the same reason the unguarded orthographic
run was: without it the next round re-derives the same two junk candidates
(تَغَابَى for ٱلتَّغَابُنِ, مَات-ُ for مُتِمُّ) and re-spends the surface validation to
reject them. The rejected candidate DB is kept alongside for the same reason.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CHAIN = SCRIPT_DIR / "resources" / "frozen-orthographic-production-v1_7-manifest.json"
MANIFEST = SCRIPT_DIR / "resources" / "frozen-paradigm-gap-v2-manifest.json"

SCHEMA_VERSION = "morphology-freeze-paradigm-gap-v2"

ARTIFACTS = {
    "scripts/morphology/analyze-paradigm-gap-v2.py":
        "FROZEN: the derivation search and its surface validation",
    "scripts/morphology/merge-lexicon-gap-v2.py":
        "FROZEN: the PARADIGM_GAP -> LEXICON_OOV migration",
    "data/candidates/morphology/paradigm-gap-v2/classification.jsonl":
        "per-token derivation evidence for all 44 tokens, both matching regimes",
    "data/candidates/morphology/paradigm-gap-v2/report.json":
        "NEGATIVE RESULT: 0 accepted entries, 0 expected closures",
    "data/candidates/morphology/paradigm-gap-v2/checksums.json":
        "paradigm-gap-v2 checksums",
    "data/candidates/morphology/paradigm-gap-v2/camel_morph_msa_v1.0+paradigm-stem-v2.CANDIDATE.db":
        "REJECTED candidate DB, kept as evidence: it fails surface validation and "
        "additionally leaks 27 analyses onto unrelated surfaces. Never shippable.",
    "data/candidates/morphology/lexicon-gap-v2/classification.jsonl":
        "the merged LEXICON_OOV bucket: 50 tokens, 30 distinct surfaces",
    "data/candidates/morphology/lexicon-gap-v2/report.json":
        "migration report with the evidence that motivated it",
    "data/candidates/morphology/lexicon-gap-v2/checksums.json":
        "lexicon-gap-v2 checksums",
    "docs/morfoloji-paradigm-gap-v2.md":
        "write-up of the negative result",
}

RESULT = {
    "scope_tokens": 44,
    "surface_paradigm_types": {"VERB_PLURAL_WAW": 20,
                               "NO_OVERT_NUMBER_OR_GENDER_ENDING": 17,
                               "SOUND_MASC_PLURAL": 7},
    "outcomes_vocalized_regime": {"NO_EXISTING_STEM_UNDER_AN_OVERT_PARADIGM": 34,
                                  "AMBIGUOUS_LEXEME_DROPPED": 6,
                                  "SAFE_DERIVATION": 4},
    "outcomes_letters_only_regime": {"AMBIGUOUS_LEXEME_DROPPED": 22,
                                     "NO_EXISTING_STEM_UNDER_AN_OVERT_PARADIGM": 21,
                                     "SAFE_DERIVATION": 1},
    "dropped_before_generation": 3,
    "candidate_entries": 2,
    "surface_validation": {"DROPPED_ROOT_DISAGREES_WITH_TEACHER": 1,
                           "DROPPED_SURFACE_STILL_NOT_ANALYZABLE": 1,
                           "KEPT": 0},
    "accepted_entries": 0,
    "accepted_distinct_lexemes": 0,
    "expected_closures_next_full_dump_round": 0,
    "candidate_db_additivity": {"surfaces_checked": 18993,
                                "analyses_removed_or_altered": 0,
                                "additions_outside_generated_lexemes": 27,
                                "purely_additive": False},
    "byte_identical_two_runs": True,
}

BUCKET_MIGRATION = {
    "from": "PARADIGM_GAP", "to": "LEXICON_OOV", "tokens_migrated": 44,
    "buckets_before": {"PARADIGM_GAP": 44, "HAMZA_CARRIER": 42,
                       "LEXICON_OOV": 6, "SEGMENTATION": 2},
    "buckets_after": {"LEXICON_OOV": 50, "HAMZA_CARRIER": 42, "SEGMENTATION": 2},
    "lexicon_gap_total": 50,
    "lexicon_gap_distinct_surfaces": 30,
    "frozen_residual_v1_edited": False,
    "note": ("the v1.7 residual classification is frozen and was not edited; the "
             "migration is a new artefact under lexicon-gap-v2/"),
}

POLICY = {
    "no_root_or_lemma_guessing": True,
    "derivation_source": "existing CAMeL stem entries only",
    "teacher_use": "evaluation oracle only; never selects which token is derived",
    "camel_db_dump_and_selector_untouched": True,
    "full_dump_not_regenerated": True,
    "production_db": "not written",
    "inherited": "every policy of the v1.7, v1 diagnostic and v1.6 manifests",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    missing = [rel for rel in ARTIFACTS if not (REPO_ROOT / rel).exists()]
    if missing:
        raise SystemExit("missing artefacts: " + ", ".join(missing))
    chain_manifest = json.loads(CHAIN.read_text(encoding="utf-8"))
    drift = [rel for rel, meta in chain_manifest["artifacts"].items()
             if not (REPO_ROOT / rel).exists()
             or sha256_file(REPO_ROOT / rel) != meta["sha256"]]
    if drift:
        raise SystemExit("frozen v1.7 drifted: " + ", ".join(drift[:5]))

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "status": "NEGATIVE_RESULT_FROZEN",
        "chains_from": {
            "path": str(CHAIN.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": chain_manifest["schema_version"],
            "sha256": sha256_file(CHAIN),
        },
        "result": RESULT,
        "bucket_migration": BUCKET_MIGRATION,
        "policy": POLICY,
        "why_a_negative_result_is_frozen": (
            "Without it the next round re-derives the same two rejected "
            "candidates and re-spends surface validation to reject them again. "
            "The rejected candidate DB is pinned for the same reason."),
        "artifacts": {
            rel: {"note": note, "sha256": sha256_file(REPO_ROOT / rel)}
            for rel, note in sorted(ARTIFACTS.items())
        },
    }
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({"manifest": str(MANIFEST.relative_to(REPO_ROOT)).replace("\\", "/"),
                      "status": manifest["status"],
                      "artifacts": len(manifest["artifacts"]),
                      "bucket_migration": {k: BUCKET_MIGRATION[k] for k in
                                           ("tokens_migrated", "buckets_after",
                                            "lexicon_gap_total")},
                      "sha256": sha256_file(MANIFEST)},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
