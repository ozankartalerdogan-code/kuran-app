#!/usr/bin/env python3
"""Read-only hamza/madda rescue experiment on the CAMeL candidate recall layer.

Scope: the 2,079 tokens classified CAMEL_OOV or NO_MATCH by
`analyze-teacher-camel-coverage.py`. A bounded regression/risk probe additionally
covers every other token whose *surface* triggers the rescue rules, so the
production risk of the contract can be sized. Nothing else is re-analyzed.

Guarantees:
  * The canonical Tanzil text is never modified. `arabic` and the token identity
    always come from the teacher / token-map record.
  * Variants are derived from surface orthography only (see
    `hamza_madda_rescue_rules`). Teacher root/lemma/POS are read only in the
    final evaluation step, never during variant generation.
  * Original CAMeL candidates are kept; rescue candidates are appended and
    deduplicated against them by a normalized fingerprint.
  * `full-analysis/`, `token-map.jsonl`, the teacher export and the production
    DB are opened read-only or not at all.
  * No ranking and no candidate selection happens here.
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

from hamza_madda_rescue_rules import (  # noqa: E402
    RULE_DOC,
    apply_rules,
    motifs,
)

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
DB_PATH = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
FULL_ANALYSIS_DIR = CAMEL_ROOT / "full-analysis"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
BASELINE_DIR = CAND_ROOT / "teacher-camel-coverage"
BASELINE_TOKENS = BASELINE_DIR / "token-classification.jsonl"
OUT_DIR = CAND_ROOT / "hamza-madda-rescue"

SCHEMA_VERSION = "hamza-madda-rescue-v1"
TARGET_CLASSES = {"CAMEL_OOV", "NO_MATCH"}

# Fields that define a candidate's identity for deduplication. Surface-derived
# fields (diac, stem, bw, atbtok, ...) are excluded on purpose: a rescue variant
# necessarily spells them differently while describing the same analysis.
FINGERPRINT_FIELDS = (
    "pos", "cas", "mod", "vox", "asp", "per", "gen", "num", "stt",
    "prc0", "prc1", "prc1.5", "prc2", "prc3", "enc0",
)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COVERAGE = load_module(SCRIPT_DIR / "analyze-teacher-camel-coverage.py", "coverage_analysis")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fingerprint(candidate: dict) -> str:
    core = {
        "root": COVERAGE.normalize_root(candidate.get("root")),
        "lex": COVERAGE.normalize_lemma(candidate.get("lex")),
    }
    for field in FINGERPRINT_FIELDS:
        core[field] = candidate.get(field)
    return json.dumps(core, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def load_analyzer():
    """Reuse the frozen CAMeL Morph MSA v1.0 DB. Read-only, offline."""
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    return Analyzer(MorphologyDB(str(DB_PATH), flags="a"))


def main() -> int:
    for path in (BASELINE_TOKENS, TEACHER_PATH, TOKEN_MAP_PATH, DB_PATH, FULL_ANALYSIS_DIR):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    baseline = {}
    for line in BASELINE_TOKENS.open(encoding="utf-8"):
        obj = json.loads(line)
        baseline[(obj["verse_key"], obj["word_index"])] = obj

    teacher = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    targets = {k for k, v in baseline.items() if v["classification"] in TARGET_CLASSES}

    # ---- Stage 1: surface clustering + variant derivation (no lexicon) -------
    token_forms = {}
    variants_by_token = {}
    trigger_keys = set()
    cluster_counts = Counter()
    cluster_examples = defaultdict(list)
    rule_token_counts = Counter()

    for line in TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key not in baseline:
            continue
        forms = list(obj["analysis_forms"])
        variants = []
        seen_forms = set(forms)
        applied_here = set()
        for form in forms:
            variant, rules = apply_rules(form)
            if not rules or variant in seen_forms:
                continue
            seen_forms.add(variant)
            variants.append({"original_form": form, "analyzer_form": variant, "rescue_rule": rules})
            applied_here.update(rules)
        if variants:
            trigger_keys.add(key)
            variants_by_token[key] = variants
            for rule in sorted(applied_here):
                rule_token_counts[rule] += 1
        if key in targets:
            token_forms[key] = forms
            motif = tuple(motifs(obj["canonical_text"]))
            cluster_counts[motif] += 1
            if len(cluster_examples[motif]) < 3:
                cluster_examples[motif].append(
                    {
                        "verse_key": key[0],
                        "word_index": key[1],
                        "canonical_text": obj["canonical_text"],
                        "analyzer_form": variants[0]["analyzer_form"] if variants else None,
                        "rescue_rule": variants[0]["rescue_rule"] if variants else [],
                    }
                )

    probe_keys = trigger_keys - targets

    # ---- Stage 2: existing candidate pools (read-only) ----------------------
    wanted = targets | trigger_keys
    base_pools = {}
    for path in sorted(FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                if key in wanted:
                    base_pools[key] = obj.get("unique_candidates") or []

    # ---- Stage 3: analyze the distinct variant forms once -------------------
    distinct_forms = sorted({v["analyzer_form"] for vs in variants_by_token.values() for v in vs})
    analyzer = load_analyzer()
    analysis_cache = {form: [dict(c) for c in analyzer.analyze(form)] for form in distinct_forms}

    # ---- Stage 4: merge, dedupe, re-evaluate --------------------------------
    rows = []
    transition = Counter()
    before_counts = Counter()
    after_counts = Counter()
    recovered = {"root": 0, "lemma": 0, "pos": 0}
    regressions = []
    pool_growth_exact_core = []
    unresolved_reason = Counter()
    unresolved_examples = defaultdict(list)
    empty_variant_analysis = 0

    for key in sorted(wanted, key=sort_key):
        t_row = teacher[key]
        base = base_pools.get(key, [])
        base_prints = {fingerprint(c) for c in base}
        merged = list(base)
        added = []
        for variant in variants_by_token.get(key, []):
            for candidate in analysis_cache.get(variant["analyzer_form"], []):
                print_ = fingerprint(candidate)
                if print_ in base_prints:
                    continue
                base_prints.add(print_)
                enriched = dict(candidate)
                enriched["_rescue"] = {
                    "original_form": variant["original_form"],
                    "analyzer_form": variant["analyzer_form"],
                    "rescue_rule": variant["rescue_rule"],
                }
                merged.append(enriched)
                added.append(enriched)

        if key in targets and variants_by_token.get(key) and not added:
            empty_variant_analysis += 1

        before_label, before_detail, before_reason = COVERAGE.classify(
            t_row, COVERAGE.summarize_candidates({"unique_candidates": base})
        )
        after_label, after_detail, after_reason = COVERAGE.classify(
            t_row, COVERAGE.summarize_candidates({"unique_candidates": merged})
        )

        if key in targets:
            before_counts[before_label] += 1
            after_counts[after_label] += 1
            transition[f"{before_label}->{after_label}"] += 1
            for field in ("root", "lemma", "pos"):
                if not before_detail[f"{field}_covered"] and after_detail[f"{field}_covered"]:
                    recovered[field] += 1
            if after_label in ("NO_MATCH", "CAMEL_OOV"):
                reason = after_reason or "unclassified"
                if not variants_by_token.get(key):
                    reason = f"no_rescue_rule_applies::{'+'.join(motifs(t_row['arabic']))}"
                unresolved_reason[reason] += 1
                if len(unresolved_examples[reason]) < 5:
                    unresolved_examples[reason].append(
                        {
                            "verse_key": key[0],
                            "word_index": key[1],
                            "arabic": t_row["arabic"],
                            "teacher_root": t_row["root"],
                            "teacher_lemma": t_row["lemma"],
                            "teacher_pos": t_row["pos"],
                            "pool_size": after_detail["pool_size"],
                        }
                    )
        else:
            if before_label == "EXACT_CORE":
                pool_growth_exact_core.append(
                    {
                        "verse_key": key[0],
                        "word_index": key[1],
                        "pool_before": before_detail["pool_size"],
                        "pool_after": after_detail["pool_size"],
                    }
                )

        if COVERAGE.CLASSES.index(after_label) > COVERAGE.CLASSES.index(before_label) and not (
            before_label == "TEACHER_NATURAL_NULL" or after_label == "TEACHER_NATURAL_NULL"
        ):
            regressions.append({"verse_key": key[0], "word_index": key[1],
                                "before": before_label, "after": after_label})

        rows.append(
            {
                "verse_key": key[0],
                "word_index": key[1],
                "arabic": t_row["arabic"],
                "in_target_set": key in targets,
                "classification_before": before_label,
                "classification_after": after_label,
                "pool_before": before_detail["pool_size"],
                "pool_after": after_detail["pool_size"],
                "rescue_candidates_added": len(added),
                "variants": variants_by_token.get(key, []),
            }
        )

    out_tokens = OUT_DIR / "rescue-tokens.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    hamza_class = sum(
        count for motif, count in cluster_counts.items()
        if motif != ("NO_BARE_HAMZA",)
    )
    rescued = sum(
        v for k, v in transition.items()
        if k.split("->")[1] not in ("NO_MATCH", "CAMEL_OOV")
    )

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "baseline_report_sha256": sha256_file(BASELINE_DIR / "report.json"),
            "baseline_tokens_sha256": sha256_file(BASELINE_TOKENS),
            "camel_db_sha256": sha256_file(DB_PATH),
            "teacher_sha256": sha256_file(TEACHER_PATH),
        },
        "rule_contract": {
            "rules": {rule: RULE_DOC[rule] for rule in sorted(RULE_DOC)},
            "not_applied": [
                "general alif folding (أ/إ/آ/ٱ -> ا)",
                "ta-marbuta folding", "ya-maqsura folding", "full dediacritization",
            ],
            "provenance_fields": ["original_form", "analyzer_form", "rescue_rule"],
            "dedupe_fingerprint": ["root(normalized)", "lex(normalized)", *FINGERPRINT_FIELDS],
        },
        "target_set": {
            "tokens": len(targets),
            "in_hamza_class": hamza_class,
            "not_in_hamza_class": len(targets) - hamza_class,
            "tokens_with_at_least_one_variant": sum(1 for k in targets if variants_by_token.get(k)),
            "tokens_whose_variants_returned_no_candidate": empty_variant_analysis,
        },
        "surface_clusters": {
            "+".join(motif): {
                "tokens": count,
                "examples": cluster_examples[motif],
            }
            for motif, count in sorted(cluster_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        },
        "rule_token_coverage": {
            "target_set_and_probe": dict(sorted(rule_token_counts.items())),
            "distinct_analyzer_forms": len(distinct_forms),
        },
        "results_target_set": {
            "before": {c: before_counts.get(c, 0) for c in COVERAGE.CLASSES},
            "after": {c: after_counts.get(c, 0) for c in COVERAGE.CLASSES},
            "rescued_tokens": rescued,
            "transitions": dict(sorted(transition.items(), key=lambda kv: (-kv[1], kv[0]))),
            "field_recovery": dict(sorted(recovered.items())),
        },
        "residual": {
            "tokens": after_counts.get("NO_MATCH", 0) + after_counts.get("CAMEL_OOV", 0),
            "reasons": dict(sorted(unresolved_reason.items(), key=lambda kv: (-kv[1], kv[0]))),
            "examples": {k: unresolved_examples[k] for k in sorted(unresolved_examples)},
        },
        "risk_probe": {
            "definition": "tokens outside the target set whose surface triggers a rescue rule",
            "tokens": len(probe_keys),
            "regressions": regressions,
            "exact_core_pool_growth": {
                "tokens": len(pool_growth_exact_core),
                "candidates_added_total": sum(
                    row["pool_after"] - row["pool_before"] for row in pool_growth_exact_core
                ),
                "max_growth": max(
                    (row["pool_after"] - row["pool_before"] for row in pool_growth_exact_core),
                    default=0,
                ),
                "rows": sorted(pool_growth_exact_core, key=lambda r: sort_key((r["verse_key"], r["word_index"]))),
            },
        },
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_report),
        "rescue-tokens.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )
    print(json.dumps(
        {"target": report["target_set"], "results": report["results_target_set"],
         "risk": {k: v for k, v in report["risk_probe"].items() if k != "exact_core_pool_growth"},
         "checksums": checksums},
        ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
