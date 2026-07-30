#!/usr/bin/env python3
"""Why each of the 114 segmentation tokens did or did not close under v1.5.

Read-only. It replays `camel_clitic_split_rules` over the cohort and counts the
exact clause that rejected every candidate, which the selector's own report can
only summarize as one bucket. Nothing here feeds the selector; the teacher is
read solely to say whether a surviving candidate carried the attested core.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
COHORT = CAND_ROOT / "selector-v1_5" / "segmentation-cohort.jsonl"
RESIDUAL = CAND_ROOT / "residual-recall-gap" / "residual-classification.jsonl"
OUT = CAND_ROOT / "selector-v1_5" / "split-rejection-analysis.json"
SEGMENTATION_LEVELS = ("L4_PROCLITIC_SEGMENTATION", "L5_ENCLITIC_SEGMENTATION",
                       "L6_PROCLITIC_AND_ENCLITIC")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
SPLIT = load_module(SCRIPT_DIR / "camel_clitic_split_rules.py", "camel_clitic_split_rules")
COVERAGE = V.COVERAGE
RECALL = V.RECALL


def main() -> int:
    tables = SPLIT.CliticTables(V.DB_PATH, V.skeleton, V.normalize_vocalized)

    cohort = {}
    for line in RESIDUAL.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj["level"] in SEGMENTATION_LEVELS:
            cohort[(obj["verse_key"], obj["word_index"])] = obj

    outcome = {}
    if COHORT.exists():
        for line in COHORT.open(encoding="utf-8"):
            obj = json.loads(line)
            outcome[(obj["verse_key"], obj["word_index"])] = obj

    teacher = {}
    for line in (CAND_ROOT / "qac-tanzil-teacher.jsonl").open(encoding="utf-8"):
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in cohort:
            teacher[key] = obj

    canonical, base_forms = {}, {}
    for line in (CAND_ROOT / "camel-morph-msa-v1.0" / "token-map.jsonl").open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key in cohort:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    rejects = Counter()
    per_token = []
    for key in sorted(cohort, key=V.sort_key):
        surface = canonical[key]
        surf_skel = V.skeleton(surface)
        forms = list(base_forms[key]) + sorted(RECALL.build_variants(surface, base_forms[key]))
        counts = Counter()
        survivors = 0
        for form in sorted(set(forms)):
            for (pre, pres, stem, suf, sufs) in SPLIT.enumerate_splits(tables, form):
                stem_analyses = analyze(stem)
                if not stem_analyses:
                    counts["stem_out_of_vocabulary"] += 1
                    continue
                for prefix_entry in (pres or [None]):
                    for suffix_entry in (sufs or [None]):
                        for cand in stem_analyses:
                            if not cand.get("stemcat"):
                                counts["no_stem_category"] += 1
                            elif not SPLIT.is_cliticless(cand):
                                counts["stem_analysis_claims_its_own_clitic"] += 1
                            elif not V.is_selectable_evidence(cand, V.skeleton(stem)):
                                counts["stem_analysis_is_not_usable_evidence"] += 1
                            elif not V.clitics_consistent(
                                    SPLIT.reattach(cand, prefix_entry, pre,
                                                   suffix_entry, suf), surf_skel):
                                counts["reattachment_contradicts_the_surface"] += 1
                            else:
                                counts["accepted"] += 1
                                survivors += 1
        row = outcome.get(key, {})
        per_token.append({
            "verse_key": key[0], "word_index": key[1], "arabic": surface,
            "residual_level": cohort[key]["level"],
            "closed": row.get("closed"),
            "unresolved_reason": row.get("unresolved_reason"),
            "accepted_candidates": survivors,
            "rejections": dict(sorted(counts.items())),
        })
        if not row.get("closed"):
            for name, count in counts.items():
                if name != "accepted":
                    rejects[name] += count

    report = {
        "schema_version": "clitic-split-residual-analysis-v1",
        "scope": {"tokens": len(per_token),
                  "closed": sum(1 for r in per_token if r["closed"]),
                  "open": sum(1 for r in per_token if not r["closed"])},
        "rejection_clause_totals_on_open_tokens": dict(
            sorted(rejects.items(), key=lambda kv: (-kv[1], kv[0]))),
        "dominant_clause_per_open_token": dict(sorted(Counter(
            max((r["rejections"] or {"none": 0}).items(),
                key=lambda kv: (kv[1], kv[0]))[0]
            for r in per_token if not r["closed"]).items(),
            key=lambda kv: (-kv[1], kv[0]))),
        "tokens": per_token,
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                   encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in
                      ("scope", "rejection_clause_totals_on_open_tokens",
                       "dominant_clause_per_open_token")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
