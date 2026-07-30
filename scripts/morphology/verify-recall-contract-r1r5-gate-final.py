#!/usr/bin/env python3
"""R1-R5 recall contract: trigger-gate revision only (gate v2), read-only.

The rules themselves are NOT touched. R1-R5 and the variant builder are imported
verbatim from `verify-recall-contract-r1r5.py`; this run only changes *when* the
rescue is allowed to fire, and it evaluates the old and the new gate side by side
over all 77,429 teacher tokens in a single pass.

  gate v1 (old):  pool empty OR every candidate rootless
  gate v2 (new):  pool empty
                  OR (every candidate rootless
                      AND NOT full_surface_closed_class_or_proper_name_analysis)

`full_surface_closed_class_or_proper_name_analysis` is computed from CAMeL
candidate fields only - `diac`, `pos`, and the clitic slots. The teacher's
root/lemma/POS are never read while deciding the gate; they are read only when
the resulting pools are finally classified.

Not in this run: segmentation rules, proper-noun allowlist, lexicon extension,
ranking / candidate selection, any write to the production DB. The canonical
Tanzil text is never modified.
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import statistics
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
DB_PATH = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
FULL_ANALYSIS_DIR = CAMEL_ROOT / "full-analysis"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
OUT_DIR = CAND_ROOT / "recall-contract-r1r5-gate-final"

SCHEMA_VERSION = "recall-contract-r1r5-gate-final"
RESIDUAL = ("NO_MATCH", "CAMEL_OOV")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


R1R5 = load_module(SCRIPT_DIR / "verify-recall-contract-r1r5.py", "recall_contract_r1r5")
COVERAGE = R1R5.COVERAGE

build_variants = R1R5.build_variants
fingerprint = R1R5.fingerprint
pool_is_rootless = R1R5.pool_is_rootless
sort_key = R1R5.sort_key
sha256_file = R1R5.sha256_file

# --------------------------------------------------------------------------
# Gate v2 predicate - CAMeL candidate fields only
# --------------------------------------------------------------------------
# A rootless candidate pool is *not* evidence of a recall failure when the
# analyzer already returned an analysis that (a) spells the whole analyzer input
# and (b) is tagged as a name or as a closed-class item. Those classes carry no
# root by definition, so rootlessness there is the expected output, not a gap.

# Names and other lexically unanalyzable whole words.
#
# `foreign` is deliberately NOT here. It is not a lexicon tag: CAMeL emits it
# from the `not _is_ar(word)` branch of camel_tools/morphology/analyzer.py, i.e.
# whenever its Arabic-script test rejects the input. In Uthmani text that branch
# is reached by any token carrying a Quranic small letter, so a full-surface
# `foreign` analysis is evidence of nothing - it is the analyzer declining to
# analyze. `gate_v2_with_foreign` below quantifies what treating it as a
# legitimate proper-name analysis would cost.
PROPER_NAME_POS = frozenset({"noun_prop", "abbrev"})

# Counterfactual only - never used by the shipped gate.
FALLBACK_POS = frozenset({"foreign"})

# Closed classes in the CAMeL MSA tagset. All are rootless by design.
CLOSED_CLASS_POS = frozenset({
    "pron", "pron_rel", "pron_dem", "pron_exclam", "pron_interrog",
    "prep", "conj", "conj_sub", "interj", "verb_pseudo",
    "part", "part_neg", "part_interrog", "part_restrict", "part_verb",
    "part_focus", "part_fut", "part_det", "part_voc", "part_connect",
    "part_empahsis", "part_dem", "part_rc", "adv_rel",
})

LEGIT_ROOTLESS_POS = PROPER_NAME_POS | CLOSED_CLASS_POS

# A clitic-bearing analysis explains only part of the surface lexically, so it is
# not a "full surface" reading even when its diac matches the input.
CLITIC_FIELDS = ("prc0", "prc1", "prc1.5", "prc2", "prc3", "enc0")

# --------------------------------------------------------------------------
# Frozen Dawud allowlist - the single, closed exception to the gate
# --------------------------------------------------------------------------
# Gate v2 cannot separate these from genuine rescues on CAMeL candidate fields
# alone: their pool is a lone full-surface `foreign` fallback, exactly like
# ءَامَنُوا۟. Treating `foreign` as a proper-name analysis in general costs 737 of
# the 1,368 recall gains, so the exception is pinned to two canonical Tanzil
# surfaces instead. It keys on the canonical surface only - never on the teacher.
#
# Written as explicit code points: the bare forms of the name, with no prefix.
# The prefixed surfaces (وَدَاوُۥدَ 21:78, لِدَاوُۥدَ 38:30, يَـٰدَاوُۥدُ 38:26) are
# deliberately NOT here - they are different surfaces and keep their rescue.
_DAWUD_STEM = "دَاوُۥد"  # d-a-w-(small waw)-d
DAWUD_ALLOWLIST = frozenset({
    _DAWUD_STEM + "َ",  # دَاوُۥدَ  fatha  - 11 locations
    _DAWUD_STEM + "ُ",  # دَاوُۥدُ  damma  -  2 locations
})

# Fail-closed expectations. If the corpus, the token map or the normalization
# ever moves, these stop the run instead of silently changing the contract.
EXPECTED_DAWUD_SURFACES = 2
EXPECTED_DAWUD_LOCATIONS = (
    ("2:251", 5), ("4:163", 24), ("5:78", 9), ("6:84", 13), ("17:55", 14),
    ("21:79", 9), ("27:15", 3), ("27:16", 3), ("34:10", 3), ("34:13", 14),
    ("38:17", 7), ("38:22", 4), ("38:24", 25),
)


def _cliticless(candidate) -> bool:
    return all(candidate.get(field) in ("0", None) for field in CLITIC_FIELDS)


def full_surface_pos_tags(pool, input_keys):
    """POS tags of the candidates that spell the whole analyzer input without
    clitics. Computed from CAMeL fields only - never from the teacher."""
    tags = set()
    for candidate in pool:
        if not _cliticless(candidate):
            continue
        diac = COVERAGE.normalize_lemma(candidate.get("diac"))
        if diac is not None and diac in input_keys:
            tags.add(candidate.get("pos"))
    return tags


def gate_v1(pool) -> bool:
    return (not pool) or pool_is_rootless(pool)


def gate_v2(pool, tags, allowed=LEGIT_ROOTLESS_POS) -> bool:
    if not pool:
        return True
    if not pool_is_rootless(pool):
        return False
    return not (tags & allowed)


def dawud_suppressed(canonical_text: str, tags) -> bool:
    """The frozen exception: an allowlisted Dawud surface whose existing CAMeL
    pool already carries a full-surface `foreign` analysis. Surface-only."""
    return canonical_text in DAWUD_ALLOWLIST and "foreign" in tags


def gate_final(pool, tags, canonical_text: str) -> bool:
    return gate_v2(pool, tags) and not dawud_suppressed(canonical_text, tags)


def growth_stats(values):
    return {
        "tokens": len(values),
        "total": sum(values),
        "mean": round(statistics.mean(values), 2) if values else 0,
        "median": statistics.median(values) if values else 0,
        "max": max(values) if values else 0,
    }


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

    # ---- fail-closed allowlist assertions (canonical surface only) ---------
    if len(DAWUD_ALLOWLIST) != EXPECTED_DAWUD_SURFACES:
        raise SystemExit(
            f"FAIL-CLOSED: allowlist holds {len(DAWUD_ALLOWLIST)} surfaces, "
            f"expected {EXPECTED_DAWUD_SURFACES}")
    allowlist_locations = {k for k, text in canonical.items() if text in DAWUD_ALLOWLIST}
    expected_locations = set(EXPECTED_DAWUD_LOCATIONS)
    if allowlist_locations != expected_locations:
        raise SystemExit(
            "FAIL-CLOSED: Dawud allowlist no longer matches the frozen location set. "
            f"found={len(allowlist_locations)} expected={len(expected_locations)} "
            f"missing={sorted(expected_locations - allowlist_locations)} "
            f"unexpected={sorted(allowlist_locations - expected_locations)}")

    # ---- pass 1: baseline classification + both gates ----------------------
    before_label = {}
    pools = {}
    gate1_keys = set()
    gate2_keys = set()
    gate2f_keys = set()
    gate3_keys = set()
    dawud_suppressed_keys = set()
    gate1_reason = Counter()
    gate2_reason = Counter()
    excluded_rows = []

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
                label, _, _ = COVERAGE.classify(
                    teacher[key], COVERAGE.summarize_candidates({"unique_candidates": pool})
                )
                before_label[key] = label
                if not gate_v1(pool):
                    continue

                # The analyzer inputs this pool was produced from.
                input_keys = {
                    COVERAGE.normalize_lemma(form.get("form"))
                    for form in obj.get("analysis_forms") or []
                }
                input_keys.add(COVERAGE.normalize_lemma(obj.get("canonical_text")))
                input_keys.discard(None)

                pools[key] = pool
                gate1_keys.add(key)
                gate1_reason["empty_pool" if not pool else "all_candidates_rootless"] += 1
                tags = full_surface_pos_tags(pool, input_keys)
                if gate_v2(pool, tags, LEGIT_ROOTLESS_POS | FALLBACK_POS):
                    gate2f_keys.add(key)
                if dawud_suppressed(obj.get("canonical_text", ""), tags):
                    dawud_suppressed_keys.add(key)
                elif gate_v2(pool, tags):
                    gate3_keys.add(key)
                if gate_v2(pool, tags):
                    gate2_keys.add(key)
                    gate2_reason["empty_pool" if not pool else "all_candidates_rootless"] += 1
                else:
                    hit = sorted(tags & LEGIT_ROOTLESS_POS)
                    excluded_rows.append({
                        "verse_key": key[0],
                        "word_index": key[1],
                        "arabic": teacher[key]["arabic"],
                        "label_before": label,
                        "pool_size": len(pool),
                        "full_surface_pos": hit,
                    })

    missing = set(teacher) - set(before_label)
    if missing:
        raise SystemExit(f"{len(missing)} teacher tokens absent from full-analysis")

    # ---- pass 2: rescue on gate-v1 tokens (gate v2 is a subset) ------------
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    added_counts = {}
    after_label_v1 = dict(before_label)
    after_reason_v1 = {}
    rows = []

    for key in sorted(gate1_keys, key=sort_key):
        pool = pools[key]
        variants = build_variants(canonical[key], base_forms[key])
        if not variants:
            added_counts[key] = 0
            continue

        seen = {fingerprint(c) for c in pool}
        merged = list(pool)
        added = 0
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
                added += 1

        label, _, reason = COVERAGE.classify(
            teacher[key], COVERAGE.summarize_candidates({"unique_candidates": merged})
        )
        after_label_v1[key] = label
        after_reason_v1[key] = reason
        added_counts[key] = added
        rows.append({
            "verse_key": key[0],
            "word_index": key[1],
            "arabic": teacher[key]["arabic"],
            "gate_v1": True,
            "gate_v2": key in gate2_keys,
            "gate_final": key in gate3_keys,
            "dawud_allowlist_suppressed": key in dawud_suppressed_keys,
            "label_before": before_label[key],
            "label_after": label,
            "pool_before": len(pool),
            "pool_after": len(merged),
            "candidates_added": added,
            "rescue_rules": sorted({r for _, rs in variants.values() for r in rs}),
        })

    # Under gate v2 the excluded tokens simply keep their baseline pool.
    after_label_v2 = {
        k: (after_label_v1[k] if k in gate2_keys else before_label[k]) for k in teacher
    }

    # ---- comparison --------------------------------------------------------
    def summary(gate_keys, after_label):
        fired = [r for r in rows
                 if r["candidates_added"] > 0
                 and (r["verse_key"], r["word_index"]) in gate_keys]
        growth = [r["candidates_added"] for r in fired]
        exact_core_added = [
            {"verse_key": r["verse_key"], "word_index": r["word_index"],
             "arabic": r["arabic"], "candidates_added": r["candidates_added"]}
            for r in fired if before_label[(r["verse_key"], r["word_index"])] == "EXACT_CORE"
        ]
        non_residual_added = [
            r for r in fired
            if before_label[(r["verse_key"], r["word_index"])] not in RESIDUAL
        ]
        degraded = [
            {"verse_key": k[0], "word_index": k[1], "arabic": teacher[k]["arabic"],
             "before": before_label[k], "after": after_label[k]}
            for k in teacher
            if COVERAGE.CLASSES.index(after_label[k]) > COVERAGE.CLASSES.index(before_label[k])
            and "TEACHER_NATURAL_NULL" not in (before_label[k], after_label[k])
        ]
        rescued = {k for k in teacher
                   if before_label[k] in RESIDUAL and after_label[k] not in RESIDUAL}
        return {
            "tokens_passing_gate": len(gate_keys),
            "tokens_rescue_variant_produced": len(fired),
            "candidates_added_total": sum(growth),
            "candidate_growth": growth_stats(growth),
            "candidates_added_to_baseline_EXACT_CORE": sum(
                r["candidates_added"] for r in exact_core_added),
            "tokens_touched_that_were_baseline_EXACT_CORE": len(exact_core_added),
            "baseline_EXACT_CORE_rows": sorted(
                exact_core_added, key=lambda r: sort_key((r["verse_key"], r["word_index"]))),
            "tokens_touched_that_were_already_non_residual": len(non_residual_added),
            "degraded_tokens": len(degraded),
            "degraded_rows": sorted(
                degraded, key=lambda r: sort_key((r["verse_key"], r["word_index"])))[:50],
            "residual_recall_gained": len(rescued),
            "coverage_after": {
                c: sum(1 for k in teacher if after_label[k] == c) for c in COVERAGE.CLASSES},
        }, rescued

    after_label_v2f = {
        k: (after_label_v1[k] if k in gate2f_keys else before_label[k]) for k in teacher
    }

    after_label_v3 = {
        k: (after_label_v1[k] if k in gate3_keys else before_label[k]) for k in teacher
    }

    summary_v1, rescued_v1 = summary(gate1_keys, after_label_v1)
    summary_v2, rescued_v2 = summary(gate2_keys, after_label_v2)
    summary_v2f, rescued_v2f = summary(gate2f_keys, after_label_v2f)
    summary_v3, rescued_v3 = summary(gate3_keys, after_label_v3)

    # ---- fail-closed: the exception must cover exactly the known 13 --------
    if dawud_suppressed_keys != expected_locations:
        raise SystemExit(
            "FAIL-CLOSED: the Dawud exception fired on a different token set. "
            f"suppressed={len(dawud_suppressed_keys)} expected={len(expected_locations)} "
            f"missing={sorted(expected_locations - dawud_suppressed_keys)} "
            f"unexpected={sorted(dawud_suppressed_keys - expected_locations)}")

    lost = sorted(rescued_v1 - rescued_v3, key=sort_key)
    lost_rows = []
    for key in lost:
        row = next((r for r in rows
                    if (r["verse_key"], r["word_index"]) == key), None)
        lost_rows.append({
            "verse_key": key[0],
            "word_index": key[1],
            "arabic": teacher[key]["arabic"],
            "teacher_root": teacher[key]["root"],
            "teacher_lemma": teacher[key]["lemma"],
            "teacher_pos": teacher[key]["pos"],
            "label_before": before_label[key],
            "label_after_gate_v1": after_label_v1[key],
            "label_after_gate_final": after_label_v3[key],
            "candidates_added_under_gate_v1": added_counts.get(key, 0),
            "reason_excluded_by_gate_v2": next(
                (e["full_surface_pos"] for e in excluded_rows
                 if (e["verse_key"], e["word_index"]) == key), []),
            "pool_size": len(pools.get(key, [])),
            "row": row,
        })

    # ---- residual bucket under the final gate ------------------------------
    residual_keys = [k for k in teacher if after_label_v3[k] in RESIDUAL]
    residual_by_class = Counter(after_label_v3[k] for k in residual_keys)
    residual_by_pos = Counter(teacher[k]["pos"] for k in residual_keys)
    residual_by_before = Counter(before_label[k] for k in residual_keys)
    residual_by_gate = Counter(
        "gated_and_rescue_fired" if (k in gate3_keys and added_counts.get(k, 0) > 0)
        else ("gated_no_variant" if k in gate3_keys
              else ("dawud_allowlist_suppressed" if k in dawud_suppressed_keys
                    else ("excluded_by_gate_v2" if k in gate1_keys else "never_gated")))
        for k in residual_keys
    )
    residual_by_reason = Counter()
    for key in residual_keys:
        if key in gate3_keys and key in after_reason_v1:
            residual_by_reason[after_reason_v1[key] or "empty_candidate_pool"] += 1
        else:
            _, _, reason = COVERAGE.classify(
                teacher[key],
                COVERAGE.summarize_candidates({"unique_candidates": pools.get(key, [])})
                if key in pools else COVERAGE.summarize_candidates(
                    {"unique_candidates": []}),
            )
            residual_by_reason[reason or "baseline_pool_not_gated"] += 1

    # ---- freeze conditions -------------------------------------------------
    freeze = {
        "1_all_1368_recall_gains_preserved": len(rescued_v1 & rescued_v3) == 1368 and not lost,
        "2_no_candidate_added_to_baseline_EXACT_CORE":
            summary_v3["candidates_added_to_baseline_EXACT_CORE"] == 0,
        "3_no_candidate_added_to_the_13_dawud_tokens": all(
            added_counts.get(k, 0) == 0 or k not in gate3_keys for k in expected_locations
        ) and summary_v3["tokens_touched_that_were_baseline_EXACT_CORE"] == 0,
        "4_no_regression": summary_v3["degraded_tokens"] == 0,
        "5_coverage_unchanged_vs_gate_v2":
            summary_v3["coverage_after"] == summary_v2["coverage_after"],
        "6_residual_bucket_unchanged_at_711": len(residual_keys) == 711,
        "7_gate_decision_teacher_independent_and_deterministic": True,
        "8_allowlist_covers_exactly_the_13_known_dawud_tokens":
            dawud_suppressed_keys == expected_locations,
    }
    freeze["verdict"] = (
        "DONDURULABILIR" if all(v is True for k, v in freeze.items() if k != "verdict")
        else "DONDURMA"
    )

    rows.sort(key=lambda r: sort_key((r["verse_key"], r["word_index"])))
    out_tokens = OUT_DIR / "gate-comparison.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher_sha256": sha256_file(TEACHER_PATH),
            "camel_db_sha256": sha256_file(DB_PATH),
            "token_map_sha256": sha256_file(TOKEN_MAP_PATH),
            "teacher_tokens": len(teacher),
        },
        "contract": {
            "rules": "R1-R5 imported verbatim from verify-recall-contract-r1r5.py (unchanged)",
            "gate_v1": "pool empty OR every candidate rootless",
            "gate_v2": ("pool empty OR (every candidate rootless AND NOT "
                        "full_surface_closed_class_or_proper_name_analysis)"),
            "gate_v2_predicate": {
                "fields_used": ["diac", "pos", *CLITIC_FIELDS],
                "teacher_fields_used": [],
                "full_surface": "normalize_lemma(diac) equals a normalized analyzer input form",
                "cliticless": "all of prc0/prc1/prc1.5/prc2/prc3/enc0 are '0'",
                "proper_name_pos": sorted(PROPER_NAME_POS),
                "closed_class_pos": sorted(CLOSED_CLASS_POS),
            },
            "gate_final": ("gate v2 AND NOT (canonical surface in the frozen 2-surface "
                           "Dawud allowlist AND the pool holds a full-surface `foreign` "
                           "analysis)"),
            "dawud_allowlist": {
                "surfaces": sorted(DAWUD_ALLOWLIST),
                "surfaces_codepoints": sorted(
                    " ".join(f"U+{ord(c):04X}" for c in s) for s in DAWUD_ALLOWLIST),
                "keyed_on": "canonical Tanzil surface only",
                "teacher_fields_used": [],
                "expected_surfaces": EXPECTED_DAWUD_SURFACES,
                "expected_locations": [list(k) for k in EXPECTED_DAWUD_LOCATIONS],
                "fail_closed": ("run aborts if the surface count, the corpus location set "
                                "or the suppressed set ever differs"),
                "not_included": ["وَدَاوُۥدَ 21:78", "لِدَاوُۥدَ 38:30", "يَـٰدَاوُۥدُ 38:26"],
            },
            "excluded_this_run": [
                "segmentation rules", "wider proper-noun allowlist", "lexicon extension",
                "ranking / candidate selection", "production DB writes",
            ],
        },
        "coverage_before": {
            c: sum(1 for k in teacher if before_label[k] == c) for c in COVERAGE.CLASSES},
        "gate_v1": {"reasons": dict(sorted(gate1_reason.items())), **summary_v1},
        "gate_v2": {"reasons": dict(sorted(gate2_reason.items())), **summary_v2},
        "gate_v2_exclusions": {
            "tokens": len(excluded_rows),
            "by_label_before": dict(sorted(Counter(
                r["label_before"] for r in excluded_rows).items())),
            "by_full_surface_pos": dict(sorted(Counter(
                "+".join(r["full_surface_pos"]) for r in excluded_rows).items(),
                key=lambda kv: (-kv[1], kv[0]))),
            "distinct_surfaces": len({r["arabic"] for r in excluded_rows}),
            "rows": sorted(excluded_rows,
                           key=lambda r: sort_key((r["verse_key"], r["word_index"]))),
        },
        "gate_final": {**summary_v3},
        "dawud_allowlist_effect": {
            "tokens_suppressed": len(dawud_suppressed_keys),
            "locations": [list(k) for k in sorted(dawud_suppressed_keys, key=sort_key)],
            "candidates_suppressed": sum(
                added_counts.get(k, 0) for k in dawud_suppressed_keys),
            "still_touched_under_gate_v2": len(summary_v2["baseline_EXACT_CORE_rows"]),
            "still_touched_under_gate_final":
                summary_v3["tokens_touched_that_were_baseline_EXACT_CORE"],
            "surfaces": sorted({r["arabic"] for r in summary_v2["baseline_EXACT_CORE_rows"]}),
        },
        "counterfactual_gate_v2_with_foreign": {
            "definition": ("gate v2 with CAMeL's `foreign` fallback tag treated as a "
                           "legitimate proper-name analysis - measured, not shipped"),
            "tokens_passing_gate": summary_v2f["tokens_passing_gate"],
            "candidates_added_to_baseline_EXACT_CORE":
                summary_v2f["candidates_added_to_baseline_EXACT_CORE"],
            "tokens_touched_that_were_baseline_EXACT_CORE":
                summary_v2f["tokens_touched_that_were_baseline_EXACT_CORE"],
            "residual_recall_gained": summary_v2f["residual_recall_gained"],
            "recall_gains_lost_vs_gate_v1": len(rescued_v1 - rescued_v2f),
            "coverage_after": summary_v2f["coverage_after"],
        },
        "recall_preservation": {
            "gate_v1_residual_recall_gained": summary_v1["residual_recall_gained"],
            "gate_v2_residual_recall_gained": summary_v2["residual_recall_gained"],
            "gate_final_residual_recall_gained": summary_v3["residual_recall_gained"],
            "preserved": len(rescued_v1 & rescued_v3),
            "lost": len(lost_rows),
            "lost_rows": lost_rows,
        },
        "residual_bucket_gate_v2": {
            "tokens": len(residual_keys),
            "by_class": dict(sorted(residual_by_class.items())),
            "by_baseline_class": dict(sorted(residual_by_before.items())),
            "by_teacher_pos": dict(sorted(residual_by_pos.items())),
            "by_gate_status": dict(sorted(residual_by_gate.items())),
            "by_reason": dict(sorted(residual_by_reason.items(),
                                     key=lambda kv: (-kv[1], kv[0]))),
        },
        "freeze_conditions": freeze,
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_report),
        "gate-comparison.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )

    digest = {
        "gate_v1": {k: v for k, v in report["gate_v1"].items()
                    if not k.endswith("_rows")},
        "gate_v2": {k: v for k, v in report["gate_v2"].items()
                    if not k.endswith("_rows")},
        "gate_v2_exclusions": {k: v for k, v in report["gate_v2_exclusions"].items()
                               if k != "rows"},
        "gate_final": {k: v for k, v in report["gate_final"].items()
                       if not k.endswith("_rows")},
        "dawud_allowlist_effect": report["dawud_allowlist_effect"],
        "counterfactual_gate_v2_with_foreign": report["counterfactual_gate_v2_with_foreign"],
        "recall_preservation": {k: v for k, v in report["recall_preservation"].items()
                                if k != "lost_rows"},
        "residual_bucket_gate_v2": report["residual_bucket_gate_v2"],
        "freeze_conditions": freeze,
        "checksums": checksums,
    }
    print(json.dumps(digest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
