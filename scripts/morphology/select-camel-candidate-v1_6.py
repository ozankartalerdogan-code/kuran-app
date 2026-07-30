#!/usr/bin/env python3
"""Run the FROZEN v1.5 selection line against the paradigm-extended full-analysis
dump, without editing a single frozen rule.

v1.6 is not a new selector. It imports `select-camel-candidate-v1_5.py` and calls
its `main()` unchanged, after redirecting three input paths at the module level:

  * `V.DB_PATH`            -> the paradigm-extended CAMeL DB
  * `V.FULL_ANALYSIS_DIR`  -> the regenerated dump built from that DB
  * `V1_5.OUT_DIR`         -> a NEW output directory (selector-v1_6)

No selector, recall, split or lexicon rule is touched; the same frozen code runs
on new pools. The frozen v1.5 output, the original DB and the original dump are
never written, so every earlier checksum in the manifest chain is preserved.

After the frozen run produces the v1.6 selection, this script performs the
acceptance comparison against the FROZEN v1.5 selection:

  * which tokens gained an analysis, and whether the new candidates come only
    from the 30 generated lexemes;
  * whether any prior candidate pool lost or altered a candidate;
  * whether any v1.5 CORRECT selection changed (target 0);
  * whether any new INCORRECT selection appeared (target 0);
  * how many tokens moved RECALL_GAP -> CORRECT;
  * the exact reason each still-open safe token stayed open.
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
EXTENDED_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
EXTENDED_DUMP = CAMEL_ROOT / "full-analysis-paradigm-ext-v1"
ORIGINAL_DUMP = CAMEL_ROOT / "full-analysis"
EXTENSION_JSONL = CAND_ROOT / "lexicon-extension-v1" / "extension.jsonl"
CLASSIFICATION = CAND_ROOT / "lexicon-oov" / "classification.jsonl"
V1_5_SELECTION = CAND_ROOT / "selector-v1_5" / "selection.jsonl"
OUT_DIR = CAND_ROOT / "selector-v1_6"
V1_6_SELECTION = OUT_DIR / "selection.jsonl"
COMPARISON_PATH = OUT_DIR / "v1_6-vs-v1_5-comparison.json"


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


def run_frozen_v1_5_on_extended_inputs() -> None:
    """Execute the frozen v1.5 main() with redirected input/output paths."""
    for path in (EXTENDED_DB, EXTENDED_DUMP):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    saved = {
        "db": V.DB_PATH, "dump": V.FULL_ANALYSIS_DIR, "out": V1_5.OUT_DIR,
    }
    V.DB_PATH = EXTENDED_DB
    V.FULL_ANALYSIS_DIR = EXTENDED_DUMP
    V1_5.OUT_DIR = OUT_DIR
    try:
        rc = V1_5.main()
    finally:
        V.DB_PATH = saved["db"]
        V.FULL_ANALYSIS_DIR = saved["dump"]
        V1_5.OUT_DIR = saved["out"]
    # v1.5's own acceptance gates compare to the v1.4 baseline; a nonzero code
    # there is not this run's verdict (we gate against v1.5 below), but the
    # selection.jsonl is always written, so a missing file is a hard failure.
    if not V1_6_SELECTION.exists():
        raise SystemExit(f"frozen v1.5 run did not produce {V1_6_SELECTION} (rc={rc})")


def load_selection(path: Path) -> dict:
    rows = {}
    for line in path.open(encoding="utf-8"):
        obj = json.loads(line)
        rows[(obj["verse_key"], obj["word_index"])] = obj
    return rows


def pool_signatures(dump_dir: Path) -> dict:
    """The frozen unique-candidate pool per token, as comparable signatures."""
    fields = ("diac", "lex", "root", "pos", "prc0", "prc1", "prc1.5", "prc2",
              "prc3", "enc0", "cas", "stt", "num", "gen", "stem")
    pools = {}
    for shard in sorted(dump_dir.glob("surah-*.jsonl.gz")):
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                pools[key] = {
                    tuple(c.get(f) for f in fields)
                    for c in obj.get("unique_candidates") or []
                }
    return pools


def selection_is_complete(path: Path, expected_rows: int = 77429) -> bool:
    if not path.exists():
        return False
    with path.open(encoding="utf-8") as handle:
        return sum(1 for _ in handle) == expected_rows


def main() -> int:
    # The frozen v1.5 selection is deterministic; skip re-running it only when a
    # complete selection is already present (so the expensive selector runs once
    # while the comparison stage can be re-entered freely). Pass --force to
    # always regenerate - used for the independent determinism run.
    force = "--force" in sys.argv
    if force or not selection_is_complete(V1_6_SELECTION):
        run_frozen_v1_5_on_extended_inputs()

    v1_5 = load_selection(V1_5_SELECTION)
    v1_6 = load_selection(V1_6_SELECTION)

    generated = {}
    for line in EXTENSION_JSONL.open(encoding="utf-8"):
        entry = json.loads(line)
        generated[(COVERAGE.normalize_lemma(entry["lex"]), entry["root"])] = entry
    safe_tokens = {}
    for line in CLASSIFICATION.open(encoding="utf-8"):
        row = json.loads(line)
        if row.get("safe_for_extension"):
            safe_tokens[(row["verse_key"], row["word_index"])] = row

    # ---- pool-level additivity: nothing removed or altered ------------------
    before_pools = pool_signatures(ORIGINAL_DUMP)
    after_pools = pool_signatures(EXTENDED_DUMP)
    removed_or_altered = []
    tokens_gaining = []
    additions_outside_generated = []
    for key in sorted(before_pools, key=V.sort_key):
        before = before_pools[key]
        after = after_pools.get(key, set())
        if not before <= after:
            removed_or_altered.append({"verse_key": key[0], "word_index": key[1]})
        added = after - before
        if added:
            tokens_gaining.append(key)
            for signature in added:
                lemma = COVERAGE.normalize_lemma(signature[1])
                root = signature[2]
                if (lemma, root) not in generated:
                    additions_outside_generated.append(
                        {"verse_key": key[0], "word_index": key[1],
                         "lex": signature[1], "root": signature[2]})

    # ---- selection-level: CORRECT stability and new INCORRECT ---------------
    transitions = Counter()
    changed_correct = []
    new_incorrect = []
    recall_gap_to_correct = []
    for key, old in v1_5.items():
        new = v1_6.get(key)
        if new is None:
            raise SystemExit(f"v1.6 selection missing token {key}")
        transitions[f"{old.get('verdict')}->{new.get('verdict')}"] += 1
        if old.get("verdict") == "CORRECT" and \
                new.get("selected_fingerprint") != old.get("selected_fingerprint"):
            changed_correct.append({"verse_key": key[0], "word_index": key[1],
                                    "arabic": new.get("arabic")})
        if old.get("verdict") != "INCORRECT" and new.get("verdict") == "INCORRECT":
            new_incorrect.append({"verse_key": key[0], "word_index": key[1],
                                  "arabic": new.get("arabic"),
                                  "v1_5_verdict": old.get("verdict"),
                                  "selected": (new.get("selected") or {})})
        if old.get("verdict") == "RECALL_GAP" and new.get("verdict") == "CORRECT":
            recall_gap_to_correct.append(key)

    # ---- the 54 safe tokens: closed vs still-open, with exact reasons -------
    safe_status = []
    still_open = []
    for key in sorted(safe_tokens, key=V.sort_key):
        row = safe_tokens[key]
        cand = row["paradigm_candidates"][0]
        lemma_root = (COVERAGE.normalize_lemma(cand["generated_lex"]), cand["root"])
        old, new = v1_5[key], v1_6[key]
        gained = after_pools.get(key, set()) - before_pools.get(key, set())
        reaches = any(COVERAGE.normalize_lemma(sig[1]) == lemma_root[0]
                      and sig[2] == lemma_root[1] for sig in gained)
        shipped = lemma_root in generated
        closed = new["verdict"] == "CORRECT" and old["verdict"] != "CORRECT"
        record = {
            "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
            "generated_lex": cand["generated_lex"], "root": cand["root"],
            "shipped_as_entry": shipped,
            "pool_reaches_generated_lexeme": reaches,
            "v1_5_verdict": old["verdict"], "v1_6_verdict": new["verdict"],
            "closed": closed,
        }
        if not closed:
            if not shipped:
                reason = "LEXEME_DROPPED_IN_SURFACE_VERIFICATION"
            elif not reaches:
                reason = "BORROWED_CATEGORY_DOES_NOT_LICENSE_THIS_SURFACE_ENDING"
            elif new["verdict"] == "RECALL_GAP":
                reason = "POOL_HAS_LEXEME_BUT_TEACHER_CORE_NOT_MATCHED"
            elif new["verdict"] == "AMBIGUOUS":
                reason = "CASCADE_UNDECIDED_AFTER_INJECTION"
            elif new["verdict"] == "INCORRECT":
                reason = "CASCADE_SELECTED_A_DIFFERENT_CORE"
            else:
                reason = "UNCLASSIFIED"
            record["open_reason"] = reason
            still_open.append(record)
        safe_status.append(record)

    closed_safe = [r for r in safe_status if r["closed"]]

    comparison = {
        "schema_version": "camel-selector-v1_6-vs-v1_5",
        "inputs": {
            "extended_db_sha256": sha256_file(EXTENDED_DB),
            "v1_5_selection_sha256": sha256_file(V1_5_SELECTION),
            "v1_6_selection_sha256": sha256_file(V1_6_SELECTION),
        },
        "pool_additivity": {
            "tokens_gaining_candidates": len(tokens_gaining),
            "pools_with_removed_or_altered_candidate": removed_or_altered,
            "additions_outside_generated_lexemes": additions_outside_generated,
            "purely_additive": not removed_or_altered and not additions_outside_generated,
        },
        "selection_stability": {
            "v1_5_correct_selections_changed": changed_correct,
            "new_incorrect_selections": new_incorrect,
            "recall_gap_to_correct": len(recall_gap_to_correct),
            "verdict_transitions": dict(sorted(transitions.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
        },
        "safe_token_outcomes": {
            "safe_tokens": len(safe_status),
            "closed": len(closed_safe),
            "still_open": len(still_open),
            "open_reasons": dict(sorted(Counter(
                r["open_reason"] for r in still_open).items(),
                key=lambda kv: (-kv[1], kv[0]))),
            "open_detail": still_open,
        },
        "acceptance_gates": {
            "purely_additive_pools": not removed_or_altered
            and not additions_outside_generated,
            "no_v1_5_correct_changed": len(changed_correct) == 0,
            "no_new_incorrect": len(new_incorrect) == 0,
        },
    }

    COMPARISON_PATH.write_text(
        json.dumps(comparison, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": "camel-selector-v1_6",
        "selection.jsonl": sha256_file(V1_6_SELECTION),
        "v1_6-vs-v1_5-comparison.json": sha256_file(COMPARISON_PATH),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {k: comparison[k] for k in
              ("pool_additivity", "selection_stability")}
    digest["safe_token_outcomes"] = {
        k: v for k, v in comparison["safe_token_outcomes"].items()
        if k != "open_detail"}
    digest["acceptance_gates"] = comparison["acceptance_gates"]
    digest["checksums"] = checksums
    print(json.dumps(digest, ensure_ascii=False, indent=2))

    failed = [k for k, v in comparison["acceptance_gates"].items() if not v]
    if failed:
        print("ACCEPTANCE GATES FAILED: " + ", ".join(sorted(failed)), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
