#!/usr/bin/env python3
"""Run the FROZEN v1.5 selection line against the orthographically-extended dump.

v1.7 is not a new selector, exactly as v1.6 was not. It imports
`select-camel-candidate-v1_5.py` and calls its `main()` unchanged, after
redirecting three module-level paths:

  * `V.DB_PATH`            -> the v1.6 paradigm-extended CAMeL DB (unchanged)
  * `V.FULL_ANALYSIS_DIR`  -> the dump built from the orthographic token map
  * `V1_5.OUT_DIR`         -> a NEW output directory (selector-v1_7)

`V.TOKEN_MAP_PATH` is deliberately left on the FROZEN token map, so the R1-R5
recall contract keeps building exactly the variants it built in v1.6. The only
thing that differs is what the pools already contain.

No selector, recall, split, hamza or lexicon rule is edited. The orthographic
rules that produced the new pools carry no teacher input, no allowlist and no
verse-key filter.

Acceptance comparison is against the FROZEN v1.6 selection:
  * per-rule trigger totals (from the token-map builder's report);
  * every token that gained candidates, listed;
  * v1.6 CORRECT selections whose fingerprint changed          -> target 0
  * CORRECT -> INCORRECT / AMBIGUOUS / RECALL_GAP transitions  -> target 0
  * newly INCORRECT selections                                 -> target 0
  * RECALL_GAP -> CORRECT count
  * additions not attributable to an added analyzer form       -> target 0
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
EXTENDED_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
FROZEN_V1_6_DUMP = CAMEL_ROOT / "full-analysis-paradigm-ext-v1"
ORTHO_DUMP = CAMEL_ROOT / "full-analysis-ortho-ext-v1"
ORTHO_EXT_DIR = CAND_ROOT / "orthographic-ext-v1"
DERIVED_TOKEN_MAP = ORTHO_EXT_DIR / "token-map-ortho-ext-v1.jsonl"
TRIGGER_REPORT = ORTHO_EXT_DIR / "trigger-report.json"
V1_6_SELECTION = CAND_ROOT / "selector-v1_6" / "selection.jsonl"
OUT_DIR = CAND_ROOT / "selector-v1_7"
V1_7_SELECTION = OUT_DIR / "selection.jsonl"
COMPARISON_PATH = OUT_DIR / "v1_7-vs-v1_6-comparison.json"

EXPECTED_ROWS = 77_429
POOL_FIELDS = ("diac", "lex", "root", "pos", "prc0", "prc1", "prc1.5", "prc2",
               "prc3", "enc0", "cas", "stt", "num", "gen", "stem")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V1_5 = load_module(SCRIPT_DIR / "select-camel-candidate-v1_5.py", "camel_selector_v1_5")
V = V1_5.V
COVERAGE = V.COVERAGE


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_frozen_v1_5_on_ortho_inputs() -> None:
    for path in (EXTENDED_DB, ORTHO_DUMP):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    saved = {"db": V.DB_PATH, "dump": V.FULL_ANALYSIS_DIR, "out": V1_5.OUT_DIR}
    V.DB_PATH = EXTENDED_DB
    V.FULL_ANALYSIS_DIR = ORTHO_DUMP
    V1_5.OUT_DIR = OUT_DIR
    try:
        rc = V1_5.main()
    finally:
        V.DB_PATH = saved["db"]
        V.FULL_ANALYSIS_DIR = saved["dump"]
        V1_5.OUT_DIR = saved["out"]
    if not V1_7_SELECTION.exists():
        raise SystemExit(f"frozen v1.5 run did not produce {V1_7_SELECTION} (rc={rc})")


def load_selection(path: Path) -> dict:
    rows = {}
    for line in path.open(encoding="utf-8"):
        obj = json.loads(line)
        rows[(obj["verse_key"], obj["word_index"])] = obj
    return rows


def pool_signatures(dump_dir: Path) -> dict:
    pools = {}
    for shard in sorted(dump_dir.glob("surah-*.jsonl.gz")):
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                pools[(obj["verse_key"], obj["word_index"])] = {
                    tuple(c.get(f) for f in POOL_FIELDS)
                    for c in obj.get("unique_candidates") or []
                }
    return pools


def added_form_signatures(dump_dir: Path, added_forms_by_token: dict) -> dict:
    """Signatures the ADDED analyzer forms alone account for, per token.

    Read straight out of the produced dump's per-form candidate lists, so the
    attribution is the analyzer's own output, not a re-derivation."""
    out = {}
    for shard in sorted(dump_dir.glob("surah-*.jsonl.gz")):
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                added = added_forms_by_token.get(key)
                if not added:
                    continue
                signatures = set()
                for entry in obj.get("analysis_forms") or []:
                    if entry.get("form") not in added:
                        continue
                    for candidate in entry.get("candidates") or []:
                        signatures.add(tuple(candidate.get(f) for f in POOL_FIELDS))
                out[key] = signatures
    return out


def selection_is_complete(path: Path) -> bool:
    if not path.exists():
        return False
    with path.open(encoding="utf-8") as handle:
        return sum(1 for _ in handle) == EXPECTED_ROWS


def main() -> int:
    global OUT_DIR, V1_7_SELECTION, COMPARISON_PATH
    force = "--force" in sys.argv
    for index, arg in enumerate(sys.argv):
        if arg == "--out-dir" and index + 1 < len(sys.argv):
            OUT_DIR = Path(sys.argv[index + 1])
            V1_7_SELECTION = OUT_DIR / "selection.jsonl"
            COMPARISON_PATH = OUT_DIR / "v1_7-vs-v1_6-comparison.json"
    if force or not selection_is_complete(V1_7_SELECTION):
        run_frozen_v1_5_on_ortho_inputs()

    trigger = json.loads(TRIGGER_REPORT.read_text(encoding="utf-8"))
    if trigger["contract"]["teacher_opened"] or trigger["contract"]["allowlist_or_verse_filter"]:
        raise SystemExit("FAIL-CLOSED: the token map was not built teacher-free")

    added_forms_by_token = {}
    rule_of_form = {}
    for line in DERIVED_TOKEN_MAP.open(encoding="utf-8"):
        obj = json.loads(line)
        entries = obj.get("orthographic_ext_v1")
        if not entries:
            continue
        key = (obj["verse_key"], obj["word_index"])
        added_forms_by_token[key] = {e["analyzer_form"] for e in entries}
        rule_of_form[key] = {e["analyzer_form"]: e["rule"] for e in entries}

    v1_6 = load_selection(V1_6_SELECTION)
    v1_7 = load_selection(V1_7_SELECTION)

    before_pools = pool_signatures(FROZEN_V1_6_DUMP)
    after_pools = pool_signatures(ORTHO_DUMP)
    attributable = added_form_signatures(ORTHO_DUMP, added_forms_by_token)

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
            "arabic": (v1_7.get(key) or {}).get("arabic"),
            "candidates_added": len(added),
            "rules": sorted({rule_of_form.get(key, {}).get(form)
                             for form in added_forms_by_token.get(key, ())
                             if rule_of_form.get(key, {}).get(form)}),
            "v1_6_verdict": (v1_6.get(key) or {}).get("verdict"),
            "v1_7_verdict": (v1_7.get(key) or {}).get("verdict"),
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
    for key, old in v1_6.items():
        new = v1_7.get(key)
        if new is None:
            raise SystemExit(f"v1.7 selection missing token {key}")
        old_verdict, new_verdict = old.get("verdict"), new.get("verdict")
        transitions[f"{old_verdict}->{new_verdict}"] += 1
        if old_verdict == "CORRECT" and \
                new.get("selected_fingerprint") != old.get("selected_fingerprint"):
            changed_correct.append({"verse_key": key[0], "word_index": key[1],
                                    "arabic": new.get("arabic"),
                                    "v1_7_verdict": new_verdict})
        if old_verdict == "CORRECT" and new_verdict != "CORRECT":
            correct_lost.append({"verse_key": key[0], "word_index": key[1],
                                 "arabic": new.get("arabic"),
                                 "v1_7_verdict": new_verdict})
        if old_verdict != "INCORRECT" and new_verdict == "INCORRECT":
            new_incorrect.append({"verse_key": key[0], "word_index": key[1],
                                  "arabic": new.get("arabic"),
                                  "v1_6_verdict": old_verdict,
                                  "selected": (new.get("selected") or {})})
        if old_verdict == "RECALL_GAP" and new_verdict == "CORRECT":
            recall_gap_to_correct.append({"verse_key": key[0], "word_index": key[1],
                                          "arabic": new.get("arabic"),
                                          "rules": sorted({
                                              rule_of_form.get(key, {}).get(f)
                                              for f in added_forms_by_token.get(key, ())
                                              if rule_of_form.get(key, {}).get(f)})})

    gates = {
        "purely_additive_pools": not removed_or_altered,
        "all_additions_attributable_to_added_forms": not unattributable,
        "no_v1_6_correct_fingerprint_changed": len(changed_correct) == 0,
        "no_correct_lost_to_incorrect_or_ambiguous": len(correct_lost) == 0,
        "no_new_incorrect": len(new_incorrect) == 0,
    }

    comparison = {
        "schema_version": "camel-selector-v1_7-vs-v1_6",
        "contract": {
            "frozen_v1_5_selector_run_unmodified": True,
            "token_map_for_recall_left_frozen": True,
            "teacher_used_only_for_evaluation": True,
            "no_allowlist_no_verse_filter": True,
            "canonical_text_untouched": True,
            "production_db_written": False,
        },
        "inputs": {
            "extended_db_sha256": sha256_file(EXTENDED_DB),
            "derived_token_map_sha256": sha256_file(DERIVED_TOKEN_MAP),
            "v1_6_selection_sha256": sha256_file(V1_6_SELECTION),
            "v1_7_selection_sha256": sha256_file(V1_7_SELECTION),
        },
        "rule_triggers": {
            "tokens_by_rule": trigger["trigger_tokens"],
            "distinct_surfaces_by_rule": trigger["trigger_distinct_surfaces"],
            "analyzer_forms_added_by_rule": trigger["analyzer_forms_added_by_rule"],
            "tokens_extended_total": trigger["tokens_extended"],
            "analyzer_forms_added_total": trigger["analyzer_forms_added"],
        },
        "pool_additivity": {
            "tokens_gaining_candidates": len(tokens_gaining),
            "pools_with_removed_or_altered_candidate": removed_or_altered,
            "additions_not_attributable_to_added_forms": unattributable,
            "purely_additive": not removed_or_altered and not unattributable,
            "gaining_tokens": tokens_gaining,
        },
        "selection_stability": {
            "v1_6_correct_selections_changed": changed_correct,
            "correct_lost_to_incorrect_or_ambiguous": correct_lost,
            "new_incorrect_selections": new_incorrect,
            "recall_gap_to_correct": len(recall_gap_to_correct),
            "recall_gap_to_correct_detail": recall_gap_to_correct,
            "verdict_transitions": dict(sorted(transitions.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
        },
        "acceptance_gates": gates,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    COMPARISON_PATH.write_text(
        json.dumps(comparison, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": "camel-selector-v1_7",
        "selection.jsonl": sha256_file(V1_7_SELECTION),
        "v1_7-vs-v1_6-comparison.json": sha256_file(COMPARISON_PATH),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {
        "rule_triggers": comparison["rule_triggers"],
        "pool_additivity": {k: v for k, v in comparison["pool_additivity"].items()
                            if k != "gaining_tokens"},
        "selection_stability": {k: v for k, v in comparison["selection_stability"].items()
                                if k != "recall_gap_to_correct_detail"},
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
