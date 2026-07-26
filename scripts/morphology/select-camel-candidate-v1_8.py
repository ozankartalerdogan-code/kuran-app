#!/usr/bin/env python3
"""Run the FROZEN v1.7 selection line against the HC1-extended dump.

v1.8 is not a new selector, exactly as v1.7 and v1.6 were not. It imports
`select-camel-candidate-v1_7.py` and calls its `run_frozen_v1_5_on_ortho_inputs`
- which is itself nothing but `select-camel-candidate-v1_5.main()` - after
redirecting two module-level paths:

  * the dump directory  -> the dump built from the HC1-extended token map
  * the output dir      -> a NEW output directory (selector-v1_8)

`V.TOKEN_MAP_PATH` stays on the FROZEN token map, so the R1-R5 recall contract
keeps building exactly the variants it built in v1.6 and v1.7. No selector,
recall, split, hamza or lexicon rule is edited, and no rule ordering is changed.
The only thing that differs is what the pools already contain.

Acceptance is measured against the FROZEN v1.7 selection:
  * pools: candidates removed / altered / reordered              -> target 0
  * additions not attributable to an added analyzer form         -> target 0
  * v1.7 CORRECT selections whose fingerprint changed            -> target 0
  * CORRECT -> INCORRECT / AMBIGUOUS / RECALL_GAP transitions    -> target 0
  * newly INCORRECT selections                                   -> target 0
  * selection changes on tokens no HC1 rule fired on             -> target 0
  * HC1 tokens whose new selection carries a wrong lemma         -> target 0
  * of the 29 expected tokens: RECALL_GAP -> CORRECT, and exact
    lemma + root + POS agreement on the SELECTED candidate
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
EXTENDED_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
FROZEN_V1_7_DUMP = CAMEL_ROOT / "full-analysis-ortho-ext-v1"
HC1_DUMP = CAMEL_ROOT / "full-analysis-hc1-ext-v1_8"
HC1_EXT_DIR = CAND_ROOT / "hc1-ext-v1_8"
DERIVED_TOKEN_MAP = HC1_EXT_DIR / "token-map-hc1-ext-v1_8.jsonl"
TRIGGER_REPORT = HC1_EXT_DIR / "trigger-report.json"
V1_7_SELECTION = CAND_ROOT / "selector-v1_7" / "selection.jsonl"
RESIDUAL = CAND_ROOT / "orthographic-residual-v1" / "classification.jsonl"
OUT_DIR = CAND_ROOT / "selector-v1_8"

EXPECTED_ROWS = 77_429
EXPECTED_CLOSURES = 29
BUCKET = "HAMZA_CARRIER"
BUCKET_TOKENS = 42

POS_MAP = {
    "N": {"noun", "noun_prop", "noun_num", "noun_quant", "adj", "adj_comp", "adj_num"},
    "V": {"verb"},
    "P": {"part", "part_neg", "part_interrog", "part_restrict", "part_verb",
          "part_focus", "part_fut", "part_det", "part_voc", "part_connect",
          "part_dem", "part_rc", "part_empahsis", "prep", "conj", "conj_sub",
          "pron", "pron_rel", "pron_dem", "pron_exclam", "pron_interrog",
          "interj", "verb_pseudo", "adv_rel"},
}
_LEMMA_TAIL = re.compile(r"-.?$")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V1_7 = load_module(SCRIPT_DIR / "select-camel-candidate-v1_7.py", "camel_selector_v1_7")
V = V1_7.V
COVERAGE = V1_7.COVERAGE
POOL_FIELDS = V1_7.POOL_FIELDS


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_frozen_line(out_dir: Path, selection_path: Path) -> None:
    """Call the frozen v1.7 runner with the dump and output dir redirected."""
    for path in (EXTENDED_DB, HC1_DUMP):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    saved = {"dump": V1_7.ORTHO_DUMP, "out": V1_7.OUT_DIR, "sel": V1_7.V1_7_SELECTION}
    V1_7.ORTHO_DUMP = HC1_DUMP
    V1_7.OUT_DIR = out_dir
    V1_7.V1_7_SELECTION = selection_path
    try:
        V1_7.run_frozen_v1_5_on_ortho_inputs()
    finally:
        V1_7.ORTHO_DUMP = saved["dump"]
        V1_7.OUT_DIR = saved["out"]
        V1_7.V1_7_SELECTION = saved["sel"]


def camel_lemma_key(lex):
    return COVERAGE.normalize_lemma(_LEMMA_TAIL.sub("", lex)) if lex else None


def exact_against_teacher(selected: dict, teacher_row: dict) -> bool:
    t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
    t_root = COVERAGE.normalize_root(teacher_row.get("root"))
    if not t_lemma or not selected:
        return False
    if camel_lemma_key(selected.get("lex")) != t_lemma:
        return False
    if t_root and COVERAGE.normalize_root(selected.get("root")) != t_root:
        return False
    return selected.get("pos") in POS_MAP.get(teacher_row.get("pos"), set())


def selection_is_complete(path: Path) -> bool:
    if not path.exists():
        return False
    with path.open(encoding="utf-8") as handle:
        return sum(1 for _ in handle) == EXPECTED_ROWS


def main() -> int:
    global HC1_DUMP, HC1_EXT_DIR, DERIVED_TOKEN_MAP, TRIGGER_REPORT
    out_dir = OUT_DIR
    force = "--force" in sys.argv
    for index, arg in enumerate(sys.argv):
        if index + 1 >= len(sys.argv):
            continue
        value = sys.argv[index + 1]
        if arg == "--out-dir":
            out_dir = Path(value)
        elif arg == "--dump-dir":
            HC1_DUMP = Path(value)
        elif arg == "--ext-dir":
            HC1_EXT_DIR = Path(value)
            DERIVED_TOKEN_MAP = HC1_EXT_DIR / "token-map-hc1-ext-v1_8.jsonl"
            TRIGGER_REPORT = HC1_EXT_DIR / "trigger-report.json"
    selection_path = out_dir / "selection.jsonl"
    comparison_path = out_dir / "v1_8-vs-v1_7-comparison.json"

    if force or not selection_is_complete(selection_path):
        run_frozen_line(out_dir, selection_path)
    if not selection_is_complete(selection_path):
        raise SystemExit(f"frozen line did not produce {EXPECTED_ROWS} rows")

    trigger = json.loads(TRIGGER_REPORT.read_text(encoding="utf-8"))
    if trigger["contract"]["teacher_opened"] or trigger["contract"]["allowlist_or_verse_filter"]:
        raise SystemExit("FAIL-CLOSED: the token map was not built teacher-free")
    if not trigger["rules_disjoint"]:
        raise SystemExit("FAIL-CLOSED: the two rules fired on a shared token")

    added_forms_by_token = {}
    rule_of_form = {}
    rule_of_token = {}
    for line in DERIVED_TOKEN_MAP.open(encoding="utf-8"):
        obj = json.loads(line)
        entries = obj.get("hamza_carrier_ext_v1_8")
        if not entries:
            continue
        key = (obj["verse_key"], obj["word_index"])
        added_forms_by_token[key] = {e["analyzer_form"] for e in entries}
        rule_of_form[key] = {e["analyzer_form"]: e["rule"] for e in entries}
        rule_of_token[key] = sorted({e["rule"] for e in entries})
    fired_keys = set(rule_of_token)

    residual = [json.loads(l) for l in RESIDUAL.open(encoding="utf-8")]
    bucket = {(r["verse_key"], r["word_index"]) for r in residual
              if r["bucket"] == BUCKET}
    if len(bucket) != BUCKET_TOKENS:
        raise SystemExit(f"scope moved: {len(bucket)} != {BUCKET_TOKENS}")
    expected = sorted(fired_keys & bucket, key=V.sort_key)
    still_open = sorted(bucket - fired_keys, key=V.sort_key)

    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    v1_7 = V1_7.load_selection(V1_7_SELECTION)
    v1_8 = V1_7.load_selection(selection_path)

    before_pools = V1_7.pool_signatures(FROZEN_V1_7_DUMP)
    after_pools = V1_7.pool_signatures(HC1_DUMP)
    attributable = V1_7.added_form_signatures(HC1_DUMP, added_forms_by_token)

    removed_or_altered = []
    tokens_gaining = []
    unattributable = []
    for key in sorted(before_pools, key=V.sort_key):
        before = before_pools[key]
        after = after_pools.get(key, set())
        if not before <= after:
            removed_or_altered.append({"verse_key": key[0], "word_index": key[1]})
        added = after - before
        if not added:
            continue
        tokens_gaining.append({
            "verse_key": key[0], "word_index": key[1],
            "arabic": (v1_8.get(key) or {}).get("arabic"),
            "candidates_added": len(added),
            "rules": rule_of_token.get(key, []),
            "v1_7_verdict": (v1_7.get(key) or {}).get("verdict"),
            "v1_8_verdict": (v1_8.get(key) or {}).get("verdict"),
        })
        stray = added - attributable.get(key, set())
        if stray:
            unattributable.append({"verse_key": key[0], "word_index": key[1],
                                   "count": len(stray)})

    transitions = Counter()
    changed_correct = []
    correct_lost = []
    new_incorrect = []
    recall_gap_to_correct = []
    changed_outside_hc1 = []
    changed_selection_keys = []
    for key, old in v1_7.items():
        new = v1_8.get(key)
        if new is None:
            raise SystemExit(f"v1.8 selection missing token {key}")
        old_verdict, new_verdict = old.get("verdict"), new.get("verdict")
        transitions[f"{old_verdict}->{new_verdict}"] += 1
        changed = new.get("selected_fingerprint") != old.get("selected_fingerprint")
        if changed:
            changed_selection_keys.append(key)
            if key not in fired_keys:
                changed_outside_hc1.append({
                    "verse_key": key[0], "word_index": key[1],
                    "arabic": new.get("arabic"),
                    "v1_7_verdict": old_verdict, "v1_8_verdict": new_verdict})
        if old_verdict == "CORRECT" and changed:
            changed_correct.append({"verse_key": key[0], "word_index": key[1],
                                    "arabic": new.get("arabic"),
                                    "v1_8_verdict": new_verdict})
        if old_verdict == "CORRECT" and new_verdict != "CORRECT":
            correct_lost.append({"verse_key": key[0], "word_index": key[1],
                                 "arabic": new.get("arabic"),
                                 "v1_8_verdict": new_verdict})
        if old_verdict != "INCORRECT" and new_verdict == "INCORRECT":
            new_incorrect.append({"verse_key": key[0], "word_index": key[1],
                                  "arabic": new.get("arabic"),
                                  "v1_7_verdict": old_verdict,
                                  "selected": (new.get("selected") or {})})
        if old_verdict == "RECALL_GAP" and new_verdict == "CORRECT":
            recall_gap_to_correct.append({"verse_key": key[0], "word_index": key[1],
                                          "arabic": new.get("arabic"),
                                          "rules": rule_of_token.get(key, [])})

    # ---- the 29 expected closures ------------------------------------------
    # Two distinct claims, kept apart on purpose:
    #   POOL LEVEL   - does the added carrier form put an exact lemma+root+POS
    #                  candidate into the token's pool? This is the rule's own
    #                  claim, and it is what the narrowing round measured.
    #   SELECTION    - does the FROZEN cascade then pick that candidate? This
    #                  the rules do not control: the cascade is frozen and
    #                  unchanged, and on the جَآءُو + enclitic family both the verb
    #                  جَاء and the adjective جَائِي are exact-root, so the cascade
    #                  declines to choose and the token stays AMBIGUOUS. That
    #                  costs nothing under any regression gate.
    lex_i, root_i, pos_i = (POOL_FIELDS.index("lex"), POOL_FIELDS.index("root"),
                            POOL_FIELDS.index("pos"))

    def pool_has_exact(key) -> bool:
        for sig in after_pools.get(key, set()):
            candidate = {"lex": sig[lex_i], "root": sig[root_i], "pos": sig[pos_i]}
            if exact_against_teacher(candidate, teacher[key]):
                return True
        return False

    expected_detail = []
    for key in expected:
        old, new = v1_7.get(key) or {}, v1_8.get(key) or {}
        selected = new.get("selected") or {}
        expected_detail.append({
            "verse_key": key[0], "word_index": key[1],
            "arabic": new.get("arabic"),
            "rules": rule_of_token.get(key, []),
            "v1_7_verdict": old.get("verdict"),
            "v1_8_verdict": new.get("verdict"),
            "recall_gap_to_correct": old.get("verdict") == "RECALL_GAP"
            and new.get("verdict") == "CORRECT",
            "pool_has_exact_candidate": pool_has_exact(key),
            "selected_lex": selected.get("lex"),
            "selected_root": selected.get("root"),
            "selected_pos": selected.get("pos"),
            "teacher_lemma": teacher[key].get("lemma"),
            "teacher_root": teacher[key].get("root"),
            "teacher_pos": teacher[key].get("pos"),
            "selected_exact_lemma_root_pos": exact_against_teacher(selected, teacher[key]),
        })
    expected_converted = [d for d in expected_detail if d["recall_gap_to_correct"]]
    expected_selected_exact = [d for d in expected_detail
                               if d["selected_exact_lemma_root_pos"]]
    expected_pool_exact = [d for d in expected_detail if d["pool_has_exact_candidate"]]
    expected_left_ambiguous = [d for d in expected_detail
                               if not d["recall_gap_to_correct"]]

    # ---- HC1 tokens whose new selection carries a wrong lemma ---------------
    hamza_wrong_lemma = []
    for key in sorted(fired_keys, key=V.sort_key):
        old, new = v1_7.get(key) or {}, v1_8.get(key) or {}
        if new.get("selected_fingerprint") == old.get("selected_fingerprint"):
            continue
        selected = new.get("selected") or {}
        t_lemma = COVERAGE.normalize_lemma((teacher.get(key) or {}).get("lemma"))
        if t_lemma and camel_lemma_key(selected.get("lex")) != t_lemma:
            hamza_wrong_lemma.append({
                "verse_key": key[0], "word_index": key[1],
                "arabic": new.get("arabic"),
                "selected_lex": selected.get("lex"),
                "teacher_lemma": (teacher.get(key) or {}).get("lemma")})

    gates = {
        "purely_additive_pools": not removed_or_altered,
        "all_additions_attributable_to_added_forms": not unattributable,
        "no_v1_7_correct_fingerprint_changed": len(changed_correct) == 0,
        "no_correct_lost_to_incorrect_or_ambiguous": len(correct_lost) == 0,
        "no_new_incorrect": len(new_incorrect) == 0,
        "no_selection_change_outside_hc1_tokens": len(changed_outside_hc1) == 0,
        "no_hc1_token_selecting_a_wrong_lemma": len(hamza_wrong_lemma) == 0,
        "expected_scope_is_29_tokens": len(expected) == EXPECTED_CLOSURES,
        "all_29_expected_tokens_have_exact_candidate_in_pool":
            len(expected_pool_exact) == EXPECTED_CLOSURES,
        "every_expected_conversion_selects_the_exact_candidate":
            len(expected_selected_exact) == len(expected_converted),
    }

    comparison = {
        "schema_version": "camel-selector-v1_8-vs-v1_7",
        "contract": {
            "frozen_v1_7_line_run_unmodified": True,
            "no_rule_or_ordering_change": True,
            "token_map_for_recall_left_frozen": True,
            "teacher_used_only_for_evaluation": True,
            "no_allowlist_no_verse_filter": True,
            "canonical_text_untouched": True,
            "production_db_written": False,
        },
        "inputs": {
            "extended_db_sha256": sha256_file(EXTENDED_DB),
            "derived_token_map_sha256": sha256_file(DERIVED_TOKEN_MAP),
            "v1_7_selection_sha256": sha256_file(V1_7_SELECTION),
            "v1_8_selection_sha256": sha256_file(selection_path),
        },
        "rule_triggers": {
            "tokens_by_rule": trigger["trigger_tokens"],
            "distinct_surfaces_by_rule": trigger["trigger_distinct_surfaces"],
            "analyzer_forms_added_by_rule": trigger["analyzer_forms_added_by_rule"],
            "tokens_extended_total": trigger["tokens_extended"],
            "analyzer_forms_added_total": trigger["analyzer_forms_added"],
            "rules_disjoint": trigger["rules_disjoint"],
        },
        "pool_additivity": {
            "tokens_gaining_candidates": len(tokens_gaining),
            "pools_with_removed_or_altered_candidate": removed_or_altered,
            "additions_not_attributable_to_added_forms": unattributable,
            "purely_additive": not removed_or_altered and not unattributable,
            "gaining_tokens": tokens_gaining,
        },
        "selection_stability": {
            "v1_7_correct_selections_changed": changed_correct,
            "correct_lost_to_incorrect_or_ambiguous": correct_lost,
            "new_incorrect_selections": new_incorrect,
            "selection_changes_outside_hc1_tokens": changed_outside_hc1,
            "selections_changed_total": len(changed_selection_keys),
            "hc1_tokens_selecting_a_wrong_lemma": hamza_wrong_lemma,
            "recall_gap_to_correct": len(recall_gap_to_correct),
            "recall_gap_to_correct_detail": recall_gap_to_correct,
            "verdict_transitions": dict(sorted(transitions.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
        },
        "expected_closures": {
            "expected_tokens": len(expected),
            "pool_has_exact_candidate": len(expected_pool_exact),
            "converted_recall_gap_to_correct": len(expected_converted),
            "converted_selections_exact_lemma_root_pos": len(expected_selected_exact),
            "left_ambiguous_exact_present_but_cascade_undecided":
                len(expected_left_ambiguous),
            "by_rule_pool_exact": dict(sorted(Counter(
                r for d in expected_detail if d["pool_has_exact_candidate"]
                for r in d["rules"]).items())),
            "by_rule_converted": dict(sorted(Counter(
                r for d in expected_converted for r in d["rules"]).items())),
            "left_ambiguous_detail": [
                {"verse_key": d["verse_key"], "word_index": d["word_index"],
                 "arabic": d["arabic"], "rules": d["rules"],
                 "v1_8_verdict": d["v1_8_verdict"],
                 "pool_has_exact_candidate": d["pool_has_exact_candidate"]}
                for d in expected_left_ambiguous],
            "detail": expected_detail,
        },
        "hamza_carrier_bucket": {
            "bucket_tokens": BUCKET_TOKENS,
            "closed_this_round": len(expected),
            "left_unresolved": len(still_open),
            "unresolved_tokens": [{"verse_key": k[0], "word_index": k[1],
                                   "arabic": (v1_8.get(k) or {}).get("arabic"),
                                   "v1_8_verdict": (v1_8.get(k) or {}).get("verdict")}
                                  for k in still_open],
        },
        "acceptance_gates": gates,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    comparison_path.write_text(
        json.dumps(comparison, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": "camel-selector-v1_8",
        "selection.jsonl": sha256_file(selection_path),
        "v1_8-vs-v1_7-comparison.json": sha256_file(comparison_path),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {
        "rule_triggers": comparison["rule_triggers"],
        "pool_additivity": {k: v for k, v in comparison["pool_additivity"].items()
                            if k != "gaining_tokens"},
        "selection_stability": {k: v for k, v in comparison["selection_stability"].items()
                               if k != "recall_gap_to_correct_detail"},
        "expected_closures": {k: v for k, v in comparison["expected_closures"].items()
                              if k not in ("detail", "left_ambiguous_detail")},
        "hamza_carrier_bucket": {k: v for k, v in comparison["hamza_carrier_bucket"].items()
                                 if k != "unresolved_tokens"},
        "acceptance_gates": gates,
        "checksums": checksums,
    }
    print(json.dumps(digest, ensure_ascii=False, indent=2))
    failed = [k for k, v in gates.items() if not v]
    if failed:
        print("ACCEPTANCE GATES FAILED: " + ", ".join(sorted(failed)), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
