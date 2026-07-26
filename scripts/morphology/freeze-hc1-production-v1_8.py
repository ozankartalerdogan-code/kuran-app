#!/usr/bin/env python3
"""Freeze the HC1 production round (v1.8) and chain it onto the existing freezes.

Verdicts pinned:
    HC1a           ACCEPTED_PRODUCTION
    HC1_PLUS_O4    ACCEPTED_PRODUCTION
    HC1            SUPERSEDED   (fires on 29, exact on 20; HC1a keeps those 20
                                 and HC1_PLUS_O4 recovers the other 9)
    O4X            NOT_REVIVED  (no independent trigger; the alef edit exists
                                 only bound to a carrier edit from the same site)
    HC2/HC3/HC4X/HC5X/HC6X   REJECTED, inherited from the carrier round

Every acceptance number in the manifest is READ from the produced artefacts -
the selector comparison, the dump manifest and the determinism report - rather
than typed here, so a manifest can never claim a result the run did not produce.
The script refuses to write if any acceptance gate is false.

Nothing is written to the production `data/app.db`.
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

CHAIN = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
ALSO_PINS = SCRIPT_DIR / "resources" / "frozen-orthographic-production-v1_7-manifest.json"
MANIFEST = SCRIPT_DIR / "resources" / "frozen-hc1-production-v1_8-manifest.json"

COMPARISON = CAND_ROOT / "selector-v1_8" / "v1_8-vs-v1_7-comparison.json"
DUMP_MANIFEST = CAMEL_ROOT / "full-analysis-hc1-ext-v1_8" / "run-manifest.json"
DETERMINISM = CAND_ROOT / "hc1-ext-v1_8" / "determinism-v1_8.json"

SCHEMA_VERSION = "morphology-freeze-hc1-production-v1_8"

ARTIFACTS = {
    "scripts/morphology/hamza_carrier_production_rules.py":
        "FROZEN production rule set: HC1a and HC1_PLUS_O4 as edit scripts, "
        "carrier membership and the alef binding asserted on every variant",
    "scripts/morphology/build-hc1-token-map-v1_8.py":
        "teacher-free derived token map builder (no allowlist, no verse filter)",
    "scripts/morphology/build-full-analysis-hc1-ext-v1_8.py":
        "dump builder; reuses the frozen full-analysis builder verbatim",
    "scripts/morphology/select-camel-candidate-v1_8.py":
        "runs the FROZEN v1.7 line on the HC1 dump; acceptance gates",
    "scripts/morphology/verify-hc1-determinism-v1_8.py":
        "second independent run and the byte comparison against run A",
    "data/candidates/morphology/hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl":
        "derived production token map: 77,429 records, 35 extended, canonical "
        "form untouched, v1.7 forms kept at their v1.7 positions",
    "data/candidates/morphology/hc1-ext-v1_8/trigger-report.json":
        "per-rule trigger totals and the fired token keys",
    "data/candidates/morphology/hc1-ext-v1_8/determinism-v1_8.json":
        "byte comparison of the two independent runs",
    "data/candidates/morphology/selector-v1_8/selection.jsonl":
        "FROZEN v1.8 selection (baseline for the next round)",
    "data/candidates/morphology/selector-v1_8/v1_8-vs-v1_7-comparison.json":
        "acceptance evidence vs frozen v1.7",
    "data/candidates/morphology/selector-v1_8/checksums.json":
        "v1.8 selection checksums",
    "docs/morfoloji-hc1-production-v1_8.md": "write-up",
}

RULE_VERDICTS = {
    "HC1a_BARE_TO_WAW_SEAT_BEFORE_AFFIXED_WAW": "ACCEPTED_PRODUCTION",
    "HC1_PLUS_O4_BARE_TO_WAW_SEAT_PLUS_OTIOSE_ALEF": "ACCEPTED_PRODUCTION",
    "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW": "SUPERSEDED",
    "O4X_PLURAL_WAW_OTIOSE_ALEF": "NOT_REVIVED_STANDALONE",
    "HC2_BARE_AFTER_SUKUN_GLIDE": "REJECTED",
    "HC3_BARE_AFTER_LONG_YEH": "REJECTED",
    "HC4X_WAW_SEAT_TO_YEH_SEAT": "REJECTED",
    "HC5X_YEH_SEAT_TO_ALEF_SEAT": "REJECTED",
    "HC6X_WAW_SEAT_TO_ALEF_SEAT": "REJECTED",
}

RULE_VERDICT_REASONS = {
    "HC1a_BARE_TO_WAW_SEAT_BEFORE_AFFIXED_WAW":
        "Accepted. U+0621 -> U+0624 in one codepoint neighbourhood (unvowelled "
        "long alef before, waw after) and only where real affix material follows "
        "the waw. 22 trigger tokens corpus-wide, 20 of them in-scope. The added "
        "carrier form puts an exact lemma+root+POS candidate into all 20 pools; "
        "the FROZEN cascade selects it on the 7 يَشَآءُونَ/تَشَآءُونَ tokens and leaves "
        "the 13 جَآءُو + enclitic tokens AMBIGUOUS, where the verb جَاء and the "
        "adjective جَائِي are both exact-root and the unchanged cascade declines to "
        "choose. No token the frozen v1.7 selection already gets CORRECT receives "
        "a competing lexical core; the 13 stay RECALL_GAP->AMBIGUOUS, which costs "
        "nothing under any regression gate.",
    "HC1_PLUS_O4_BARE_TO_WAW_SEAT_PLUS_OTIOSE_ALEF":
        "Accepted. Same site, word-final waw: the carrier substitution and the "
        "otiose alef are ONE edit script. 13 trigger tokens corpus-wide, 9 of "
        "them in-scope; all 13 convert RECALL_GAP->CORRECT and every selected "
        "candidate is exact lemma+root+POS.",
    "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW":
        "Superseded by the pair above. Its own 29-token figure came from a "
        "root-matching, lemma-agnostic criterion; measured as exact "
        "lemma+root+POS it reaches only 20, because on word-final surfaces "
        "جاؤو analyses as the adjective جَائِي rather than the verb جَاء.",
    "O4X_PLURAL_WAW_OTIOSE_ALEF":
        "Not revived as a standalone rule and it cannot be: the alef edit has no "
        "trigger of its own, is emitted only alongside a carrier edit produced by "
        "the same site, records `bound_to_carrier_at`, and `derive()` raises if it "
        "ever sees an unbound alef edit.",
    "HC2_BARE_AFTER_SUKUN_GLIDE": "REJECTED in the carrier round: closes 2, "
                                  "gives 9 already-CORRECT tokens a competing core.",
    "HC3_BARE_AFTER_LONG_YEH": "REJECTED: closes 3, risks 13.",
    "HC4X_WAW_SEAT_TO_YEH_SEAT": "REJECTED: closes 7, risks 58.",
    "HC5X_YEH_SEAT_TO_ALEF_SEAT": "REJECTED: closes 2, risks 178.",
    "HC6X_WAW_SEAT_TO_ALEF_SEAT": "REJECTED: closes 0, risks 85.",
}

POLICY = {
    "carrier_only": "each carrier edit replaces one hamza-family codepoint with "
                    "another; carrier membership is asserted on every variant",
    "otiose_alef": "only ever inside a script that also carries the carrier edit "
                   "from the same site, with `bound_to_carrier_at` recorded",
    "edit_script_and_inverse_checked_on_every_variant": True,
    "no_verse_key_no_surface_allowlist_no_teacher_gate": True,
    "teacher_use": "evaluation only; the token map builder never opens it",
    "additions": "analyzer input forms only, appended after the v1.7 forms",
    "canonical_text": "untouched; analysis_forms[0] is the frozen canonical form",
    "hamza_pass_not_chained": "the frozen R1-R3 rewrite is not applied on top of "
                              "the carrier variants, so the production pools are "
                              "exactly what the narrowing round measured",
    "frozen_lines_unchanged": "v1.8 imports select-camel-candidate-v1_7 and calls "
                              "its runner - itself select-camel-candidate-v1_5.main() "
                              "- with the dump and output directory redirected only. "
                              "V.TOKEN_MAP_PATH stays on the FROZEN token map so "
                              "R1-R5 build exactly the variants they built in v1.6 "
                              "and v1.7. No selector, recall, split, hamza, "
                              "orthographic or lexicon rule was edited and no rule "
                              "ordering was changed.",
    "production_db": "not written; data/app.db untouched",
    "inherited": "every policy of the hamza-carrier-v1, orthographic-production-v1_7, "
                 "paradigm-gap-v2, v1.6 and v1.5 manifests",
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

    for chain_path in (CHAIN, ALSO_PINS):
        chain_manifest = json.loads(chain_path.read_text(encoding="utf-8"))
        drift = [rel for rel, meta in chain_manifest["artifacts"].items()
                 if not (REPO_ROOT / rel).exists()
                 or sha256_file(REPO_ROOT / rel) != meta["sha256"]]
        if drift:
            raise SystemExit(f"frozen chain drifted ({chain_path.name}): "
                             + ", ".join(drift[:5]))

    comparison = json.loads(COMPARISON.read_text(encoding="utf-8"))
    dump_manifest = json.loads(DUMP_MANIFEST.read_text(encoding="utf-8"))
    determinism = json.loads(DETERMINISM.read_text(encoding="utf-8"))

    gates = comparison["acceptance_gates"]
    failed = sorted(k for k, v in gates.items() if not v)
    if failed:
        raise SystemExit("refusing to freeze, gates failed: " + ", ".join(failed))
    if not determinism["byte_identical"]:
        raise SystemExit("refusing to freeze: the two runs are not byte-identical")
    if not (determinism["shards_identical"] == determinism["shards_compared"] == 114):
        raise SystemExit("refusing to freeze: 114 shards were not all compared")

    stability = comparison["selection_stability"]
    expected = comparison["expected_closures"]
    pools = comparison["pool_additivity"]
    bucket = comparison["hamza_carrier_bucket"]

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "status": "ACCEPTED_PRODUCTION",
        "chains_from": {
            "path": str(CHAIN.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": json.loads(CHAIN.read_text(encoding="utf-8"))["schema_version"],
            "sha256": sha256_file(CHAIN),
        },
        "also_pins": {
            "note": "the production line v1.8 extends; its token map is this "
                    "round's input and its selection is this round's baseline",
            "path": str(ALSO_PINS.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": json.loads(ALSO_PINS.read_text(encoding="utf-8"))["schema_version"],
            "sha256": sha256_file(ALSO_PINS),
        },
        "rule_verdicts": RULE_VERDICTS,
        "rule_verdict_reasons": RULE_VERDICT_REASONS,
        "acceptance_results": {
            "expected_tokens": expected["expected_tokens"],
            "expected_tokens_with_exact_candidate_in_pool": expected["pool_has_exact_candidate"],
            "expected_converted_recall_gap_to_correct": expected["converted_recall_gap_to_correct"],
            "expected_conversions_selecting_exact_candidate":
                expected["converted_selections_exact_lemma_root_pos"],
            "expected_left_ambiguous_exact_present_but_cascade_undecided":
                expected["left_ambiguous_exact_present_but_cascade_undecided"],
            "expected_pool_exact_by_rule": expected["by_rule_pool_exact"],
            "expected_converted_by_rule": expected["by_rule_converted"],
            "expected_left_ambiguous_detail": expected["left_ambiguous_detail"],
            "recall_gap_to_correct_total": stability["recall_gap_to_correct"],
            "verdict_transitions": stability["verdict_transitions"],
            "v1_7_correct_fingerprints_changed": len(stability["v1_7_correct_selections_changed"]),
            "correct_lost_to_incorrect_or_ambiguous": len(stability["correct_lost_to_incorrect_or_ambiguous"]),
            "new_incorrect_selections": len(stability["new_incorrect_selections"]),
            "selection_changes_outside_hc1_tokens": len(stability["selection_changes_outside_hc1_tokens"]),
            "selections_changed_total": stability["selections_changed_total"],
            "hc1_tokens_selecting_a_wrong_lemma": len(stability["hc1_tokens_selecting_a_wrong_lemma"]),
            "pools_removed_or_altered": len(pools["pools_with_removed_or_altered_candidate"]),
            "additions_not_attributable_to_added_forms": len(pools["additions_not_attributable_to_added_forms"]),
            "tokens_gaining_candidates": pools["tokens_gaining_candidates"],
            "tokens_extended": comparison["rule_triggers"]["tokens_extended_total"],
            "analyzer_forms_added": comparison["rule_triggers"]["analyzer_forms_added_total"],
            "trigger_tokens_by_rule": comparison["rule_triggers"]["tokens_by_rule"],
            "rules_disjoint": comparison["rule_triggers"]["rules_disjoint"],
            "token_map_byte_identical_two_runs": determinism["artifacts"][
                "token-map-hc1-ext-v1_8.jsonl"]["identical"],
            "dump_shards_byte_identical_two_runs": determinism["shards_identical"],
            "selection_byte_identical_two_runs": determinism["artifacts"][
                "selection.jsonl"]["identical"],
            "comparison_byte_identical_two_runs": determinism["artifacts"][
                "v1_8-vs-v1_7-comparison.json"]["identical"],
        },
        "acceptance_gates": gates,
        "hamza_carrier_bucket": {
            "bucket_tokens": bucket["bucket_tokens"],
            "closed_this_round": bucket["closed_this_round"],
            "left_unresolved": bucket["left_unresolved"],
            "unresolved_tokens": bucket["unresolved_tokens"],
            "note": "left OPEN deliberately. No allowlist, verse-key override or "
                    "lexicon entry was added to close them. They are reachable "
                    "only via the rejected HC2/HC3/HC4X/HC5X rules, or by no "
                    "carrier rule at all (4:1:21 تَسَآءَلُونَ).",
        },
        "hc1_dump": {
            "dir": "data/candidates/morphology/camel-morph-msa-v1.0/full-analysis-hc1-ext-v1_8",
            "analysis_words": dump_manifest["analysis_words"],
            "extended_db_sha256": dump_manifest["extended_db_sha256"],
            "original_db_sha256": dump_manifest["original_db_sha256"],
            "token_map_sha256": dump_manifest["token_map_sha256"],
            "containment_vs_frozen_v1_7": dump_manifest["containment_vs_frozen_v1_7"],
            "shard_sha256": dump_manifest["shard_sha256"],
        },
        "policy": POLICY,
        "artifacts": {rel: {"note": note, "sha256": sha256_file(REPO_ROOT / rel)}
                      for rel, note in sorted(ARTIFACTS.items())},
    }
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({
        "manifest": str(MANIFEST.relative_to(REPO_ROOT)).replace("\\", "/"),
        "status": manifest["status"],
        "artifacts": len(ARTIFACTS),
        "rule_verdicts": RULE_VERDICTS,
        "acceptance_results": manifest["acceptance_results"],
        "left_unresolved": bucket["left_unresolved"],
        "sha256": sha256_file(MANIFEST)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
