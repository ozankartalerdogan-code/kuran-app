#!/usr/bin/env python3
"""Derive the production token map that carries HC1a and HC1_PLUS_O4.

Input is the FROZEN v1.7 orthographic token map (O1a/O2a/O5 already applied),
whose sha256 is checked against the v1.7 freeze manifest before anything is
read. The carrier variants are APPENDED after every form that map already
carried, so the analysis_forms list of this map is the v1.7 list plus a suffix -
which is what makes the dump built from it a per-token superset of the frozen
v1.7 dump.

Teacher-free by construction: this script never opens the teacher export. Every
one of the 77,429 analysis words is offered to both rules; there is no
allowlist, no verse-key filter and no surface list anywhere in the path.

The canonical Tanzil text is untouched: `canonical_text` is copied verbatim and
`analysis_forms[0]` stays the canonical form.

Output: data/candidates/morphology/hc1-ext-v1_8/
  token-map-hc1-ext-v1_8.jsonl   the derived map (input to the dump builder)
  trigger-report.json            per-rule trigger counts and examples
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
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
ORTHO_TOKEN_MAP = CAND_ROOT / "orthographic-ext-v1" / "token-map-ortho-ext-v1.jsonl"
V1_7_MANIFEST = SCRIPT_DIR / "resources" / "frozen-orthographic-production-v1_7-manifest.json"
OUT_DIR = CAND_ROOT / "hc1-ext-v1_8"

SCHEMA_VERSION = "hc1-token-map-ext-v1_8"
EXPECTED_ANALYSIS_WORDS = 77_429

import hamza_carrier_production_rules as RULES  # noqa: E402


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

    manifest = json.loads(V1_7_MANIFEST.read_text(encoding="utf-8"))
    pinned = manifest["artifacts"][
        "data/candidates/morphology/orthographic-ext-v1/token-map-ortho-ext-v1.jsonl"]
    input_sha = sha256_file(ORTHO_TOKEN_MAP)
    if input_sha != pinned["sha256"]:
        raise SystemExit("FAIL-CLOSED: the frozen v1.7 token map has drifted")

    out_dir.mkdir(parents=True, exist_ok=True)
    derived_path = out_dir / "token-map-hc1-ext-v1_8.jsonl"

    trigger_tokens = collections.Counter()
    trigger_surfaces = collections.defaultdict(set)
    forms_added = collections.Counter()
    examples = collections.defaultdict(list)
    fired_keys = collections.defaultdict(list)
    analysis_words = 0
    tokens_extended = 0
    total_forms_added = 0

    with derived_path.open("w", encoding="utf-8", newline="\n") as sink:
        for line in ORTHO_TOKEN_MAP.open(encoding="utf-8"):
            record = json.loads(line)
            if record.get("word_index") is None:
                sink.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
                continue
            analysis_words += 1
            base_forms = list(record["analysis_forms"])
            produced = RULES.extra_forms(base_forms, enabled=enabled)
            if produced:
                tokens_extended += 1
                total_forms_added += len(produced)
                for rule_id in sorted({item["rule"] for item in produced}):
                    trigger_tokens[rule_id] += 1
                    trigger_surfaces[rule_id].add(record["canonical_text"])
                    forms_added[rule_id] += sum(1 for i in produced
                                                if i["rule"] == rule_id)
                    fired_keys[rule_id].append(
                        f"{record['verse_key']}:{record['word_index']}")
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
                record["hamza_carrier_ext_v1_8"] = [
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
    both = set(fired_keys[RULES.HC1A]) & set(fired_keys[RULES.HC1_PLUS_O4])
    if both:
        raise SystemExit("FAIL-CLOSED: the two rules are not disjoint: "
                         + ", ".join(sorted(both)[:5]))

    report = {
        "schema_version": SCHEMA_VERSION,
        "contract": {
            "teacher_opened": False,
            "allowlist_or_verse_filter": None,
            "canonical_text_untouched": True,
            "base_forms_preserved_in_order": True,
            "hamza_pass_not_chained_onto_carrier_variants": True,
            "o4x_standalone": "not revived; the alef edit only exists bound to a "
                              "carrier edit from the same site",
            "rules_enabled": list(enabled),
        },
        "inputs": {
            "ortho_token_map": "data/candidates/morphology/orthographic-ext-v1/"
                               "token-map-ortho-ext-v1.jsonl",
            "ortho_token_map_sha256": input_sha,
            "ortho_token_map_pinned_by": "frozen-orthographic-production-v1_7-manifest.json",
        },
        "rule_doc": {r: RULES.RULE_DOC[r] for r in enabled},
        "analysis_words": analysis_words,
        "tokens_extended": tokens_extended,
        "analyzer_forms_added": total_forms_added,
        "trigger_tokens": dict(sorted(trigger_tokens.items())),
        "trigger_distinct_surfaces": {r: len(s) for r, s in sorted(trigger_surfaces.items())},
        "analyzer_forms_added_by_rule": dict(sorted(forms_added.items())),
        "trigger_token_keys": {r: sorted(v) for r, v in sorted(fired_keys.items())},
        "rules_disjoint": True,
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
                       "analyzer_forms_added_by_rule", "rules_disjoint", "outputs")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
