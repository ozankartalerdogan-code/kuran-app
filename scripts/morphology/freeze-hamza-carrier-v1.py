#!/usr/bin/env python3
"""Freeze the HAMZA_CARRIER v1 result, chained to the paradigm-gap-v2 manifest.

Verdicts pinned:
    HC1   PROPOSED_PRODUCTION_CANDIDATE   closes 29/29 in scope, 0 competing
                                          cores on tokens v1.7 already gets right
    HC2   REJECTED                        closes 2, risks 9
    HC3   REJECTED                        closes 3, risks 13
    HC4X  REJECTED                        closes 7, risks 58
    HC5X  REJECTED                        closes 2, risks 178
    HC6X  REJECTED                        closes 0, risks 85

HC1 is a candidate, not an accepted rule: this round measured it but did not
apply it - no dump was regenerated and the selector was not run. It enters the
combined acceptance round with the segmentation and lexicon work.

The 12 risky and 1 unresolved tokens stay OPEN. No allowlist was added to close
them, and none is pinned here.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CHAIN = SCRIPT_DIR / "resources" / "frozen-paradigm-gap-v2-manifest.json"
MANIFEST = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"

SCHEMA_VERSION = "morphology-freeze-hamza-carrier-v1"

ARTIFACTS = {
    "scripts/morphology/analyze-hamza-carrier-v1.py":
        "FROZEN: carrier-only rule search, edit-script + inverse enforced",
    "data/candidates/morphology/hamza-carrier-v1/classification.jsonl":
        "per-token evidence for all 42 tokens under all six candidate rules",
    "data/candidates/morphology/hamza-carrier-v1/report.json":
        "families, in-scope gain, broad negative sample, verdicts",
    "data/candidates/morphology/hamza-carrier-v1/checksums.json":
        "hamza-carrier-v1 checksums",
    "docs/morfoloji-hamza-carrier-v1.md": "write-up",
}

RULE_VERDICTS = {
    "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW": "PROPOSED_PRODUCTION_CANDIDATE",
    "HC2_BARE_AFTER_SUKUN_GLIDE": "REJECTED",
    "HC3_BARE_AFTER_LONG_YEH": "REJECTED",
    "HC4X_WAW_SEAT_TO_YEH_SEAT": "REJECTED",
    "HC5X_YEH_SEAT_TO_ALEF_SEAT": "REJECTED",
    "HC6X_WAW_SEAT_TO_ALEF_SEAT": "REJECTED",
}

RULE_EVIDENCE = {
    "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW": {
        "rule": "U+0621 -> U+0624 when the preceding letter is U+0627/U+0622/U+0671 "
                "carrying no short vowel and the following letter is U+0648",
        "in_scope_fired": 29, "in_scope_reached_teacher_core": 29,
        "candidates_compatible": 86, "candidates_incompatible": 29,
        "negative_sample_surfaces": 8,
        "v1_7_correct_tokens_given_a_competing_core": 0,
        "note": "the frozen R2 declines this context on purpose (it keeps a hamza "
                "after a long vowel on the line), so HC1 is a new context, not an "
                "edit to R2",
    },
    "HC2_BARE_AFTER_SUKUN_GLIDE": {
        "in_scope_reached_teacher_core": 2, "negative_sample_surfaces": 17,
        "v1_7_correct_tokens_given_a_competing_core": 9},
    "HC3_BARE_AFTER_LONG_YEH": {
        "in_scope_reached_teacher_core": 3, "negative_sample_surfaces": 358,
        "v1_7_correct_tokens_given_a_competing_core": 13},
    "HC4X_WAW_SEAT_TO_YEH_SEAT": {
        "in_scope_reached_teacher_core": 7, "negative_sample_surfaces": 693,
        "v1_7_correct_tokens_given_a_competing_core": 58},
    "HC5X_YEH_SEAT_TO_ALEF_SEAT": {
        "in_scope_reached_teacher_core": 2, "negative_sample_surfaces": 919,
        "v1_7_correct_tokens_given_a_competing_core": 178},
    "HC6X_WAW_SEAT_TO_ALEF_SEAT": {
        "in_scope_reached_teacher_core": 0, "negative_sample_surfaces": 693,
        "v1_7_correct_tokens_given_a_competing_core": 85},
}

VERDICT_CRITERION = (
    "Applied uniformly, no rule gets a special case: no gain -> rejected; gain "
    "with zero competing cores on tokens the frozen v1.7 selection already gets "
    "CORRECT -> proposed; otherwise rejected when it risks more already-correct "
    "tokens than it closes, deferred when it risks fewer. No rule landed in the "
    "deferral band this round. Narrowing by allowlist was not an option.")

OPEN_RECORDS = {
    "risky_tokens": 12,
    "risky_detail": ("3 reached only via HC2/HC3 (ٱسْتَيْـَٔسَ, ٱسْتَيْـَٔسُوا۟, سِيٓـَٔتْ), "
                     "7 only via HC4X (يَبْدَؤُا۟ x6, يُنَبَّؤُا۟), 2 only via HC5X (ٱئْتُوا۟)"),
    "unresolved_tokens": 1,
    "unresolved_detail": "4:1:21 تَسَآءَلُونَ, lemma يَتَساءَلُ - no carrier rule reaches it",
    "note": ("left open deliberately. The يَبْدَؤُا۟ family additionally needs "
             "something that is not a carrier change - MSA يبدأ also drops the "
             "silent alef, and that rule (O3) was withdrawn in v1.7."),
}

POLICY = {
    "carrier_only": "each edit replaces one hamza-family codepoint with another; "
                    "length preservation and carrier membership are asserted",
    "no_hamza_deleted_or_folded_to_a_non_hamza_letter": True,
    "edit_script_and_inverse_checked_on_every_variant": True,
    "no_verse_key_no_surface_allowlist_no_teacher_gate": True,
    "teacher_use": "scoring only",
    "frozen_rules_unchanged": ["R1-R3 hamza", "R1-R5 recall", "selector cascade",
                               "O1a/O2a/O5"],
    "full_dump_not_regenerated": True,
    "selector_not_run": True,
    "production_db": "not written",
    "inherited": "every policy of the paradigm-gap-v2, v1.7, v1 and v1.6 manifests",
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
        raise SystemExit("frozen chain drifted: " + ", ".join(drift[:5]))

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "status": "MEASURED_NOT_APPLIED",
        "chains_from": {
            "path": str(CHAIN.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": chain_manifest["schema_version"],
            "sha256": sha256_file(CHAIN),
        },
        "rule_verdicts": RULE_VERDICTS,
        "rule_evidence": RULE_EVIDENCE,
        "verdict_criterion": VERDICT_CRITERION,
        "families": {"BARE_AFTER_LONG_ALEF_BEFORE_WAW": 29, "SEATED_WAW": 7,
                     "BARE_AFTER_LONG_YEH+BARE_AFTER_SUKUN_GLIDE": 2,
                     "SEATED_YEH": 2, "BARE_AFTER_LONG_ALEF_OTHER": 1,
                     "BARE_AFTER_LONG_YEH": 1},
        "closable_tokens": 29,
        "open_records": OPEN_RECORDS,
        "byte_identical_two_runs": True,
        "policy": POLICY,
        "artifacts": {rel: {"note": note, "sha256": sha256_file(REPO_ROOT / rel)}
                      for rel, note in sorted(ARTIFACTS.items())},
    }
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({"manifest": str(MANIFEST.relative_to(REPO_ROOT)).replace("\\", "/"),
                      "status": manifest["status"], "artifacts": len(ARTIFACTS),
                      "rule_verdicts": RULE_VERDICTS,
                      "closable_tokens": 29,
                      "open": {"risky": 12, "unresolved": 1},
                      "sha256": sha256_file(MANIFEST)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
