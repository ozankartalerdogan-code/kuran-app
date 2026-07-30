#!/usr/bin/env python3
"""Freeze the orthographic PRODUCTION round (v1.7), chained to the v1.6 manifest.

v1.7 is the first orthographic round with no teacher gate: O1a/O2a/O5 fire
wherever their Unicode condition holds across all 77,429 analysis words, with no
allowlist, no verse-key filter and no surface list. It was accepted on the
frozen v1.5 selector, run unmodified against the orthographically-extended dump.

Rule verdicts pinned here:
    O1a  ACCEPTED    U+06E5 -> U+0648, preceding letter not U+0647
    O2a  ACCEPTED    U+06E6 -> U+064A, preceding letter not U+0647
    O5   ACCEPTED    U+0635 (+harakat) U+06DC -> U+0633 (+harakat)
    O3   WITHDRAWN   gain and regression are codepoint-identical
    O4X  REJECTED    0 closures; the جَآءُو family needs a hamza carrier, not an alef
    O6X  DEFERRED    no source notation licenses it

The unguarded O1/O2/O3 run is frozen too, as permanent NEGATIVE evidence: it is
the measurement that forced the U+0647 guard and the O3 withdrawal, and without
it the guard looks like an unmotivated special case.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
ORTHO_DUMP = CAMEL_ROOT / "full-analysis-ortho-ext-v1"
CHAIN = SCRIPT_DIR / "resources" / "frozen-v1_6-manifest.json"
V1_DIAGNOSTIC = SCRIPT_DIR / "resources" / "frozen-orthographic-only-v1-manifest.json"
MANIFEST = SCRIPT_DIR / "resources" / "frozen-orthographic-production-v1_7-manifest.json"

SCHEMA_VERSION = "morphology-freeze-orthographic-production-v1_7"

ARTIFACTS = {
    # --- the rule set and the pipeline that applied it --------------------
    "scripts/morphology/orthographic_production_rules.py":
        "FROZEN production rule set: O1a/O2a/O5 as edit scripts, O3 withdrawn",
    "scripts/morphology/build-orthographic-token-map-v1.py":
        "teacher-free derived token map builder (no allowlist, no verse filter)",
    "scripts/morphology/build-full-analysis-ortho-ext-v1.py":
        "dump builder; reuses the frozen full-analysis builder verbatim",
    "scripts/morphology/select-camel-candidate-v1_7.py":
        "runs the FROZEN v1.5 selector on the orthographic dump; acceptance gates",
    "scripts/morphology/classify-orthographic-residual-v1.py":
        "diagnostic re-bucketing of the 94 tokens no orthographic rule closes",
    "scripts/morphology/freeze-orthographic-only-v1.py":
        "the v1 diagnostic freeze script",
    # --- production inputs and outputs ------------------------------------
    "data/candidates/morphology/orthographic-ext-v1/token-map-ortho-ext-v1.jsonl":
        "derived token map: 77,429 records, 53 extended, canonical form untouched",
    "data/candidates/morphology/orthographic-ext-v1/trigger-report.json":
        "per-rule trigger totals for the accepted rule set",
    "data/candidates/morphology/selector-v1_7/selection.jsonl":
        "FROZEN v1.7 selection (baseline for the next round)",
    "data/candidates/morphology/selector-v1_7/v1_7-vs-v1_6-comparison.json":
        "acceptance evidence vs frozen v1.6: 0/0/0 regressions, 7 RECALL_GAP->CORRECT",
    "data/candidates/morphology/selector-v1_7/checksums.json":
        "v1.7 selection checksums",
    "data/candidates/morphology/orthographic-residual-v1/classification.jsonl":
        "diagnostic: the 94 residual tokens re-bucketed",
    "data/candidates/morphology/orthographic-residual-v1/report.json":
        "diagnostic: residual bucket report",
    "data/candidates/morphology/orthographic-residual-v1/checksums.json":
        "diagnostic: residual checksums",
    # --- permanent negative evidence --------------------------------------
    "data/candidates/morphology/selector-v1_7-unguarded/v1_7-vs-v1_6-comparison.json":
        "NEGATIVE EVIDENCE: unguarded O1/O2/O3 - 34 CORRECT fingerprints changed, "
        "22 CORRECT lost, 5 new INCORRECT. This is why O1a/O2a carry the U+0647 "
        "guard and why O3 was withdrawn.",
    "data/candidates/morphology/selector-v1_7-unguarded/trigger-report-unguarded.json":
        "NEGATIVE EVIDENCE: unguarded trigger totals (6,175 tokens vs 53 guarded)",
    "data/candidates/morphology/selector-v1_7-unguarded/selection.jsonl":
        "NEGATIVE EVIDENCE: the rejected selection, kept so the regression is "
        "re-inspectable without re-running the pipeline",
    "data/candidates/morphology/selector-v1_7-unguarded/checksums.json":
        "NEGATIVE EVIDENCE: checksums of the rejected run",
    # --- write-ups ---------------------------------------------------------
    "docs/morfoloji-orthographic-production-v1_7.md":
        "v1.7 write-up: contract, rejected measurement, narrowing, acceptance",
}

RULE_VERDICTS = {
    "O1a_SMALL_WAW_TO_WAW_NOT_AFTER_HEH": "ACCEPTED",
    "O2a_SMALL_YEH_TO_YEH_NOT_AFTER_HEH": "ACCEPTED",
    "O5_SMALL_SEEN_SAD_TO_SEEN": "ACCEPTED",
    "O3_SILENT_LETTER_DROP": "WITHDRAWN",
    "O4X_PLURAL_WAW_OTIOSE_ALEF": "REJECTED",
    "O6X_FINAL_ALEF_TO_MAQSURA": "DEFERRED",
}

RULE_VERDICT_REASONS = {
    "O1a_SMALL_WAW_TO_WAW_NOT_AFTER_HEH":
        "Accepted with a single neighbouring-codepoint guard. Unguarded it cost "
        "12 CORRECT selections, all on the 3sg enclitic pronoun هُۥ, where U+06E5 "
        "notates the pronoun vowel's length rather than an omitted consonant. "
        "Guarded: 29 trigger tokens, 6 RECALL_GAP->CORRECT, 0 regressions.",
    "O2a_SMALL_YEH_TO_YEH_NOT_AFTER_HEH":
        "Accepted under the same guard, for the same reason (هِۦ). Unguarded it "
        "cost 5 CORRECT selections. Guarded: 22 trigger tokens, 0 conversions and "
        "0 regressions - it is the exact mirror of O1a and is kept for that "
        "symmetry, with its zero net gain recorded rather than hidden.",
    "O5_SMALL_SEEN_SAD_TO_SEEN":
        "Accepted unconditionally. 2 trigger tokens, 1 RECALL_GAP->CORRECT "
        "(وَيَبْصُۜطُ), 0 regressions.",
    "O3_SILENT_LETTER_DROP":
        "WITHDRAWN. Corpus-wide it moved 5 tokens RECALL_GAP->CORRECT but cost 5 "
        "CORRECT selections and created 5 new INCORRECT ones. Gain and regression "
        "share an identical codepoint structure - نَدْعُوا۟ against كَاشِفُوا۟ - so no "
        "narrower general condition separates them; the only structural narrowing "
        "available deletes every gain along with every regression. A token "
        "allowlist was not an option, so the rule was withdrawn rather than "
        "special-cased.",
    "O4X_PLURAL_WAW_OTIOSE_ALEF":
        "REJECTED. 12 triggers in the v1 bucket, 0 closures: CAMeL returns no "
        "analysis for جاءوا / جَآءُوا / جاءوك / جاءوكم. What the جَآءُو family actually "
        "needs is a hamza carrier change (جاءو -> جاؤو reaches ج.ي.أ), not an alef.",
    "O6X_FINAL_ALEF_TO_MAQSURA":
        "DEFERRED. Closes 14 tokens but no source notation licenses it and its "
        "additions are majority noise (+41 teacher-matching / +87 not; +108 / +297 "
        "on وَرَءَا).",
}

ACCEPTANCE_RESULTS = {
    "tokens_extended": 53,
    "analyzer_forms_added": 117,
    "tokens_gaining_candidates": 51,
    "pools_removed_or_altered": 0,
    "additions_not_attributable_to_added_forms": 0,
    "v1_6_correct_fingerprints_changed": 0,
    "correct_lost_to_incorrect_or_ambiguous": 0,
    "new_incorrect_selections": 0,
    "recall_gap_to_correct": 7,
    "only_verdict_transition": "RECALL_GAP->CORRECT",
    "token_map_byte_identical_two_runs": True,
    "dump_byte_identical_two_runs": True,
    "selection_byte_identical_two_runs": True,
    "residual_classification_byte_identical_two_runs": True,
}

POLICY = {
    "teacher_gate": "removed; the token map builder never opens the teacher export",
    "allowlist_or_verse_filter": "none anywhere in the rule path",
    "canonical_text": "untouched; analysis_forms[0] is the frozen canonical form",
    "additions": "analyzer input forms only, appended after the existing ones",
    "frozen_lines_unchanged": (
        "v1.7 imports and runs select-camel-candidate-v1_5 with redirected "
        "input/output paths only; V.TOKEN_MAP_PATH stays on the FROZEN token map "
        "so R1-R5 build exactly the variants they built in v1.6. No selector, "
        "recall, split, hamza or lexicon rule was edited."),
    "production_db": "not written; the original CAMeL DB was opened read-only",
    "inherited": "every policy of the v1.6 and v1 diagnostic manifests",
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
    for path in (CHAIN, V1_DIAGNOSTIC, ORTHO_DUMP):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")

    # Fail-closed: the chain must still be intact before anything is pinned on it.
    chain_manifest = json.loads(CHAIN.read_text(encoding="utf-8"))
    drift = [rel for rel, meta in chain_manifest["artifacts"].items()
             if not (REPO_ROOT / rel).exists()
             or sha256_file(REPO_ROOT / rel) != meta["sha256"]]
    if drift:
        raise SystemExit("frozen v1.6 drifted: " + ", ".join(drift[:5]))

    shards = sorted(ORTHO_DUMP.glob("surah-*.jsonl.gz"))
    if len(shards) != 114:
        raise SystemExit(f"expected 114 dump shards, found {len(shards)}")
    run_manifest = json.loads((ORTHO_DUMP / "run-manifest.json").read_text(encoding="utf-8"))
    if run_manifest["analysis_words"] != 77_429:
        raise SystemExit("dump word count moved")
    containment = run_manifest["containment_vs_frozen_v1_6"]
    if not containment["purely_additive"]:
        raise SystemExit("refusing to freeze a dump that is not purely additive")

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "status": "ACCEPTED_PRODUCTION_CANDIDATE",
        "chains_from": {
            "path": str(CHAIN.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": chain_manifest["schema_version"],
            "sha256": sha256_file(CHAIN),
        },
        "also_pins": {
            "path": str(V1_DIAGNOSTIC.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": "orthographic-only-freeze-v1",
            "sha256": sha256_file(V1_DIAGNOSTIC),
            "note": "the teacher-gated v1 diagnostic this round replaced",
        },
        "rule_verdicts": RULE_VERDICTS,
        "rule_verdict_reasons": RULE_VERDICT_REASONS,
        "acceptance_results": ACCEPTANCE_RESULTS,
        "policy": POLICY,
        "negative_evidence": {
            "dir": "data/candidates/morphology/selector-v1_7-unguarded",
            "why_kept": (
                "The U+0647 guard and the O3 withdrawal are only justified by the "
                "measurement that failed. Deleting it would leave the accepted rule "
                "set looking like an arbitrary special case."),
            "unguarded_selection_sha256": sha256_file(
                REPO_ROOT / "data/candidates/morphology/selector-v1_7-unguarded/selection.jsonl"),
            "accepted_selection_sha256": sha256_file(
                REPO_ROOT / "data/candidates/morphology/selector-v1_7/selection.jsonl"),
            "note": "the two selections differ, so the byte-identity of the two "
                    "accepted runs is determinism, not a constant output",
        },
        "ortho_dump": {
            "dir": str(ORTHO_DUMP.relative_to(REPO_ROOT)).replace("\\", "/"),
            "analysis_words": run_manifest["analysis_words"],
            "extended_db_sha256": run_manifest["extended_db_sha256"],
            "original_db_sha256": run_manifest["original_db_sha256"],
            "token_map_sha256": run_manifest["token_map_sha256"],
            "containment_vs_frozen_v1_6": containment,
            "shard_sha256": {p.name: sha256_file(p) for p in shards},
        },
        "artifacts": {
            rel: {"note": note, "sha256": sha256_file(REPO_ROOT / rel)}
            for rel, note in sorted(ARTIFACTS.items())
        },
    }

    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({
        "manifest": str(MANIFEST.relative_to(REPO_ROOT)).replace("\\", "/"),
        "status": manifest["status"],
        "artifacts": len(manifest["artifacts"]),
        "dump_shards": len(manifest["ortho_dump"]["shard_sha256"]),
        "rule_verdicts": RULE_VERDICTS,
        "chain_ok": True,
        "sha256": sha256_file(MANIFEST),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
