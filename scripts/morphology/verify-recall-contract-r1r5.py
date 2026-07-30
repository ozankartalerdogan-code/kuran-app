#!/usr/bin/env python3
"""Single read-only integration run of the R1-R5 candidate recall contract.

R1-R3  frozen hamza rules, imported unchanged from `hamza_madda_rescue_rules`.
R4     drop U+06D6..U+06ED Quranic marks from the analyzer input only.
R5     re-apply the repo's existing normalization profiles (wasl_standardized,
       alif_folded, undia, dagger_alif_expanded) on the R1-R4 output, reusing
       `build-token-map.py::build_analysis_forms` verbatim.

Gate: rescue runs only when the original CAMeL pool is empty OR every candidate
in it is rootless (NTWS/FOREIGN). Everything else is left untouched.

Not in this run: segmentation rules, proper-noun allowlist, lexicon extension,
ranking / final candidate selection, any write to the production DB.

The canonical Tanzil text is never modified: `arabic` and the token identity
always come from the teacher row, and no analyzer variant is written to any
canonical output. Every added candidate carries original_form / analyzer_form /
rescue_rule provenance, original candidates are never removed, and dedupe uses a
normalized morphological fingerprint.
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

from hamza_madda_rescue_rules import apply_rules  # noqa: E402

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
DB_PATH = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
FULL_ANALYSIS_DIR = CAMEL_ROOT / "full-analysis"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
OUT_DIR = CAND_ROOT / "recall-contract-r1r5"

SCHEMA_VERSION = "recall-contract-r1r5-v1"
QURAN_MARKS = re.compile("[" + "".join(chr(c) for c in range(0x06D6, 0x06EE)) + "]")

RULE_R4 = "R4_STRIP_QURAN_MARKS_U06D6_U06ED"
RULE_R5 = "R5_REAPPLY_REPO_NORMALIZATION_PROFILES"

FINGERPRINT_FIELDS = (
    "pos", "cas", "mod", "vox", "asp", "per", "gen", "num", "stt",
    "prc0", "prc1", "prc1.5", "prc2", "prc3", "enc0",
)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    # Register before exec: the loaded module uses @dataclass, which resolves the
    # defining module through sys.modules.
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


COVERAGE = load_module(SCRIPT_DIR / "analyze-teacher-camel-coverage.py", "coverage_analysis")
TOKEN_MAP_BUILDER = load_module(SCRIPT_DIR / "camel-poc/build-token-map.py", "token_map_builder")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def fingerprint(candidate: dict) -> str:
    core = {
        "root": COVERAGE.normalize_root(candidate.get("root")),
        "lex": COVERAGE.normalize_lemma(candidate.get("lex")),
    }
    for field in FINGERPRINT_FIELDS:
        core[field] = candidate.get(field)
    return json.dumps(core, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def pool_is_rootless(candidates) -> bool:
    return all(COVERAGE.normalize_root(c.get("root")) is None for c in candidates)


def hamza_pass(form: str):
    """R1-R3, unchanged."""
    variant, rules = apply_rules(form)
    return (variant, rules) if rules else (form, [])


def build_variants(canonical_text: str, base_forms):
    """Return {analyzer_form: (original_form, [rule ids])} for R1-R5."""
    out = {}
    known = set(base_forms)

    def offer(form, original, rules):
        if not form or form in known or form in out:
            return
        out[form] = (original, rules)

    # R1-R3 on every existing analyzer form.
    for form in base_forms:
        variant, rules = hamza_pass(form)
        if rules:
            offer(variant, form, rules)

    # R4 on the canonical text, then R1-R3.
    stripped = QURAN_MARKS.sub("", canonical_text)
    if stripped != canonical_text:
        offer(stripped, canonical_text, [RULE_R4])
        variant, rules = hamza_pass(stripped)
        if rules:
            offer(variant, canonical_text, [RULE_R4, *rules])

    # R5: the repo's own profile ladder rebuilt on the R1-R4 output.
    r5_seed = QURAN_MARKS.sub("", canonical_text)
    r5_seed, seed_rules = hamza_pass(r5_seed)
    try:
        profile_forms, _ = TOKEN_MAP_BUILDER.build_analysis_forms(r5_seed)
    except Exception:
        profile_forms = []
    for form in profile_forms:
        offer(form, canonical_text, [RULE_R4, *seed_rules, RULE_R5])
        variant, rules = hamza_pass(form)
        if rules:
            offer(variant, canonical_text, [RULE_R4, *seed_rules, RULE_R5, *rules])
    return out


def main() -> int:
    for path in (TEACHER_PATH, TOKEN_MAP_PATH, DB_PATH, FULL_ANALYSIS_DIR):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    teacher = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    canonical = {}
    base_forms = {}
    for line in TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key in teacher:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])

    # ---- pass 1: baseline classification for all 77,429 tokens -------------
    before_label = {}
    before_detail = {}
    gated_pools = {}
    exact_has = {}
    gate_reason = Counter()
    for path in sorted(FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                if key not in teacher:
                    continue
                pool = obj.get("unique_candidates") or []
                label, detail, _ = COVERAGE.classify(
                    teacher[key], COVERAGE.summarize_candidates({"unique_candidates": pool})
                )
                before_label[key] = label
                before_detail[key] = detail
                if not pool:
                    gate_reason["empty_pool"] += 1
                    gated_pools[key] = pool
                    exact_has[key] = bool(obj.get("exact_has_analysis"))
                elif pool_is_rootless(pool):
                    gate_reason["all_candidates_rootless"] += 1
                    gated_pools[key] = pool
                    exact_has[key] = bool(obj.get("exact_has_analysis"))

    missing = set(teacher) - set(before_label)
    if missing:
        raise SystemExit(f"{len(missing)} teacher tokens absent from full-analysis")

    # ---- pass 2: rescue on gated tokens only -------------------------------
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    after_label = dict(before_label)
    added_counts = {}
    rows = []
    rule_usage = Counter()
    marginal = {"R1_R3_only": 0, "R4_only": 0, "R1_R4_no_R5": 0, "R1_R5_full": 0,
                "R4_adds_over_R1_R3": 0, "R5_adds_over_R1_R4": 0}
    provenance_rows = 0

    for key in sorted(gated_pools, key=sort_key):
        pool = gated_pools[key]
        variants = build_variants(canonical[key], base_forms[key])
        if not variants:
            added_counts[key] = 0
            continue

        seen = {fingerprint(c) for c in pool}
        merged = list(pool)
        added = []
        for form in sorted(variants):
            original, rules = variants[form]
            for candidate in analyze(form):
                print_ = fingerprint(candidate)
                if print_ in seen:
                    continue
                seen.add(print_)
                enriched = dict(candidate)
                enriched["_rescue"] = {
                    "original_form": original,
                    "analyzer_form": form,
                    "rescue_rule": rules,
                }
                merged.append(enriched)
                added.append(enriched)
                for rule in rules:
                    rule_usage[rule] += 1

        label, _, _ = COVERAGE.classify(
            teacher[key], COVERAGE.summarize_candidates({"unique_candidates": merged})
        )
        after_label[key] = label
        added_counts[key] = len(added)
        provenance_rows += len(added)

        # ---- per-rule marginal gain (same gate, subsets of the contract) ----
        def label_with(rule_filter):
            sub = list(pool)
            subseen = {fingerprint(c) for c in pool}
            for form in sorted(variants):
                _, rules = variants[form]
                if not rule_filter(rules):
                    continue
                for candidate in analyze(form):
                    print_ = fingerprint(candidate)
                    if print_ not in subseen:
                        subseen.add(print_)
                        sub.append(candidate)
            return COVERAGE.classify(
                teacher[key], COVERAGE.summarize_candidates({"unique_candidates": sub})
            )[0]

        residual = {"NO_MATCH", "CAMEL_OOV"}
        r4_no_r5_rescued = False
        if before_label[key] in residual:
            hamza_only = label_with(lambda r: RULE_R4 not in r and RULE_R5 not in r) not in residual
            r4_only = label_with(lambda r: r == [RULE_R4]) not in residual
            no_r5 = label_with(lambda r: RULE_R5 not in r) not in residual
            full = label not in residual
            marginal["R1_R3_only"] += hamza_only
            marginal["R4_only"] += r4_only
            marginal["R1_R4_no_R5"] += no_r5
            marginal["R1_R5_full"] += full
            marginal["R4_adds_over_R1_R3"] += (no_r5 and not hamza_only)
            marginal["R5_adds_over_R1_R4"] += (full and not no_r5)
            r4_no_r5_rescued = no_r5 and not hamza_only

        rows.append(
            {
                "verse_key": key[0],
                "word_index": key[1],
                "arabic": teacher[key]["arabic"],
                "gate": "empty_pool" if not pool else "all_candidates_rootless",
                "label_before": before_label[key],
                "label_after": label,
                "pool_before": len(pool),
                "pool_after": len(merged),
                "candidates_added": len(added),
                "rescue_rules": sorted({r for _, rules in variants.values() for r in rules}),
                "exact_has_analysis": exact_has.get(key, False),
                "rescued_by_R4_without_R5": r4_no_r5_rescued,
            }
        )

    # ---- verifications -----------------------------------------------------
    residual = {"NO_MATCH", "CAMEL_OOV"}
    correct_before = [k for k in teacher if before_label[k] not in residual]
    exact_core_before = [k for k in teacher if before_label[k] == "EXACT_CORE"]
    violation_exact_core = [
        {"verse_key": k[0], "word_index": k[1], "arabic": teacher[k]["arabic"],
         "added": added_counts[k]}
        for k in exact_core_before if added_counts.get(k, 0) > 0
    ]
    violation_added_to_correct = [
        {"verse_key": k[0], "word_index": k[1], "added": added_counts[k],
         "label_before": before_label[k]}
        for k in correct_before if added_counts.get(k, 0) > 0
    ]
    degraded = [
        {"verse_key": k[0], "word_index": k[1], "before": before_label[k], "after": after_label[k]}
        for k in teacher
        if COVERAGE.CLASSES.index(after_label[k]) > COVERAGE.CLASSES.index(before_label[k])
        and "TEACHER_NATURAL_NULL" not in (before_label[k], after_label[k])
    ]

    growths = [r["pool_after"] - r["pool_before"] for r in rows if r["candidates_added"] > 0]
    triggered = [r for r in rows if r["candidates_added"] > 0]
    r4_rescued = [r for r in triggered if r.get("rescued_by_R4_without_R5")]

    # ---- gate B: the specified gate plus "the exact form had no analysis" ----
    gate_b_keys = {k for k in gated_pools if not exact_has.get(k, False)}
    after_label_b = {
        k: (after_label[k] if k in gate_b_keys else before_label[k]) for k in teacher
    }
    violation_b = [
        k for k in correct_before if k in gate_b_keys and added_counts.get(k, 0) > 0
    ]
    growth_b = [
        r["pool_after"] - r["pool_before"] for r in rows
        if r["candidates_added"] > 0 and (r["verse_key"], r["word_index"]) in gate_b_keys
    ]

    out_tokens = OUT_DIR / "rescue-integration.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher_sha256": sha256_file(TEACHER_PATH),
            "camel_db_sha256": sha256_file(DB_PATH),
            "teacher_tokens": len(teacher),
        },
        "contract": {
            "R1_R3": "frozen hamza rules, imported unchanged",
            "R4": "strip U+06D6..U+06ED from the analyzer input only",
            "R5": "re-apply build-token-map.py::build_analysis_forms on the R1-R4 output",
            "gate": "original pool empty OR every original candidate rootless",
            "provenance_fields": ["original_form", "analyzer_form", "rescue_rule"],
            "dedupe_fingerprint": ["root(normalized)", "lex(normalized)", *FINGERPRINT_FIELDS],
            "excluded_this_run": [
                "segmentation rules", "proper-noun allowlist", "lexicon extension",
                "ranking / candidate selection", "production DB writes",
            ],
        },
        "gate": {
            "tokens_gated": len(gated_pools),
            "reasons": dict(sorted(gate_reason.items())),
            "tokens_rescue_triggered": len(triggered),
        },
        "coverage": {
            "before": {c: sum(1 for k in teacher if before_label[k] == c) for c in COVERAGE.CLASSES},
            "after": {c: sum(1 for k in teacher if after_label[k] == c) for c in COVERAGE.CLASSES},
        },
        "marginal_gain": marginal,
        "r4_check": {
            "tokens_rescued_by_R4_without_R5": len(r4_rescued),
            "expectation": "~300 tokens (P1a=295 + P1b=5 from the previous classification turn)",
        },
        "gate_b_exact_form_had_no_analysis": {
            "definition": "specified gate AND full-analysis exact_has_analysis == false",
            "tokens_gated": len(gate_b_keys),
            "added_to_already_correct_tokens": len(violation_b),
            "coverage_after": {
                c: sum(1 for k in teacher if after_label_b[k] == c) for c in COVERAGE.CLASSES
            },
            "candidates_added_total": sum(growth_b),
            "mean": round(statistics.mean(growth_b), 2) if growth_b else 0,
            "median": statistics.median(growth_b) if growth_b else 0,
            "max": max(growth_b) if growth_b else 0,
        },
        "candidate_growth": {
            "candidates_added_total": sum(growths),
            "mean": round(statistics.mean(growths), 2) if growths else 0,
            "median": statistics.median(growths) if growths else 0,
            "max": max(growths) if growths else 0,
        },
        "verifications": {
            "added_to_tokens_already_holding_the_teacher_reading": len(violation_exact_core),
            "added_to_tokens_already_holding_the_teacher_reading_rows": sorted(
                violation_exact_core,
                key=lambda r: sort_key((r["verse_key"], r["word_index"])),
            ),
            "added_to_tokens_already_holding_the_teacher_reading_surfaces": sorted(
                {r["arabic"] for r in violation_exact_core}
            ),
            "added_to_any_non_residual_token": len(violation_added_to_correct),
            "added_to_any_non_residual_sample": sorted(
                violation_added_to_correct,
                key=lambda r: sort_key((r["verse_key"], r["word_index"])),
            )[:20],
            "degraded_tokens": len(degraded),
            "provenance_rows_written": provenance_rows,
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
        "rescue-integration.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )
    print(json.dumps({k: report[k] for k in
                      ("gate", "coverage", "marginal_gain", "r4_check",
                       "candidate_growth", "verifications")} | {"checksums": checksums},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
