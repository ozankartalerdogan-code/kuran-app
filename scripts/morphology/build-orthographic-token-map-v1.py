#!/usr/bin/env python3
"""Derive a token map whose analysis_forms carry the O1/O2/O3/O5 variants.

Teacher-free by construction: this script never opens the teacher export. A rule
fires wherever its Unicode condition holds in the corpus - all 77,429 analysis
words are offered to every rule, and there is no allowlist, no verse-key filter
and no surface list anywhere in the path.

The canonical Tanzil text is untouched: `canonical_text` is copied verbatim and
`analysis_forms[0]` stays exactly the canonical form the frozen token map
already carried. New forms are APPENDED after the existing ones, so the frozen
dump builder's `unique_candidates` dict keeps every prior candidate at its prior
position and can only grow.

The frozen R1-R3 hamza rewrite is applied to each derived variant - the same
unmodified rules that already run on every other analyzer input. No rule in
`hamza_madda_rescue_rules.py` is edited or re-parameterised.

Output: data/candidates/morphology/orthographic-ext-v1/
  token-map-ortho-ext-v1.jsonl   the derived map (input to the dump builder)
  trigger-report.json            per-rule trigger counts and examples
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
TOKEN_MAP = CAMEL_ROOT / "token-map.jsonl"
OUT_DIR = CAND_ROOT / "orthographic-ext-v1"

SCHEMA_VERSION = "orthographic-token-map-ext-v1"
EXPECTED_ANALYSIS_WORDS = 77_429

import orthographic_production_rules as RULES  # noqa: E402
from hamza_madda_rescue_rules import apply_rules as hamza_pass  # noqa: E402


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    parser.add_argument("--rules", default=",".join(RULES.RULE_ORDER),
                        help="comma-separated rule ids to enable")
    args = parser.parse_args()
    out_dir = Path(args.out_dir)
    enabled = tuple(r for r in RULES.RULE_ORDER if r in set(args.rules.split(",")))
    if not enabled:
        raise SystemExit("no known rule enabled")

    out_dir.mkdir(parents=True, exist_ok=True)
    derived_path = out_dir / "token-map-ortho-ext-v1.jsonl"

    trigger_tokens = collections.Counter()
    trigger_surfaces = collections.defaultdict(set)
    forms_added = collections.Counter()
    examples = collections.defaultdict(list)
    analysis_words = 0
    tokens_extended = 0
    total_forms_added = 0

    with derived_path.open("w", encoding="utf-8", newline="\n") as sink:
        for line in TOKEN_MAP.open(encoding="utf-8"):
            record = json.loads(line)
            if record.get("word_index") is None:
                sink.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
                continue
            analysis_words += 1
            base_forms = list(record["analysis_forms"])
            produced = RULES.extra_forms(base_forms, hamza_pass=hamza_pass,
                                         enabled=enabled)
            if produced:
                tokens_extended += 1
                total_forms_added += len(produced)
                fired = {item["rule"] for item in produced}
                for rule_id in sorted(fired):
                    trigger_tokens[rule_id] += 1
                    trigger_surfaces[rule_id].add(record["canonical_text"])
                    forms_added[rule_id] += sum(1 for i in produced
                                                if i["rule"] == rule_id)
                    if len(examples[rule_id]) < 8:
                        examples[rule_id].append({
                            "verse_key": record["verse_key"],
                            "word_index": record["word_index"],
                            "canonical_text": record["canonical_text"],
                            "added": [i["analyzer_form"] for i in produced
                                      if i["rule"] == rule_id],
                        })
                record = dict(record)
                record["analysis_forms"] = base_forms + [i["analyzer_form"]
                                                         for i in produced]
                record["orthographic_ext_v1"] = [
                    {"analyzer_form": i["analyzer_form"], "from_form": i["from_form"],
                     "rule": i["rule"], "rule_chain": i["rule_chain"],
                     "edit_codepoints": i["edit_codepoints"]}
                    for i in produced]
                # fail-closed: the canonical form must stay at index 0 and every
                # prior form must survive, in order.
                if record["analysis_forms"][:len(base_forms)] != base_forms:
                    raise SystemExit("derived map reordered or dropped a base form")
                if record["analysis_forms"][0] != record["canonical_text"]:
                    raise SystemExit("derived map moved the canonical form")
            sink.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")

    if analysis_words != EXPECTED_ANALYSIS_WORDS:
        raise SystemExit(f"expected {EXPECTED_ANALYSIS_WORDS} analysis words, "
                         f"found {analysis_words}")

    report = {
        "schema_version": SCHEMA_VERSION,
        "contract": {
            "teacher_opened": False,
            "allowlist_or_verse_filter": None,
            "canonical_text_untouched": True,
            "base_forms_preserved_in_order": True,
            "frozen_hamza_rules_applied_unmodified": True,
            "rules_enabled": list(enabled),
        },
        "inputs": {"token_map_sha256": sha256_file(TOKEN_MAP)},
        "rule_doc": {r: RULES.RULE_DOC[r] for r in enabled},
        "analysis_words": analysis_words,
        "tokens_extended": tokens_extended,
        "analyzer_forms_added": total_forms_added,
        "trigger_tokens": dict(sorted(trigger_tokens.items())),
        "trigger_distinct_surfaces": {r: len(s) for r, s in sorted(trigger_surfaces.items())},
        "analyzer_forms_added_by_rule": dict(sorted(forms_added.items())),
        "examples": {r: examples[r] for r in sorted(examples)},
        "outputs": {"token_map": str(derived_path).replace("\\", "/")},
    }
    (out_dir / "trigger-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    report["outputs"]["token_map_sha256"] = sha256_file(derived_path)
    print(json.dumps({k: report[k] for k in
                      ("analysis_words", "tokens_extended", "analyzer_forms_added",
                       "trigger_tokens", "trigger_distinct_surfaces",
                       "analyzer_forms_added_by_rule", "outputs")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
