#!/usr/bin/env python3
"""Compare frozen v2 with v1, then blindly benchmark legacy and build review data."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import v2_common as common


FEATURE_FIELDS = ("cas", "stt", "gen", "num", "per", "asp", "vox", "mod")
REVIEW_QUOTAS = {
    "HIGH": 30,
    "V1_V2_CHANGED": 35,
    "TOP_TIE": 30,
    "RULE_CONFLICT": 25,
    "NORMALIZATION_SENSITIVE": 25,
    "ROOT_LEMMA_POS_MISMATCH": 35,
    "OOV": 20,
}


def candidate_equivalence_id(candidate: dict | None) -> str | None:
    if candidate is None:
        return None
    return common.stable_digest(
        json.dumps(common.equivalence_payload(candidate), ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        "morph-equivalence-v2",
    )


def selected_change_reason(v1: dict, v2: dict) -> list[str]:
    reasons: list[str] = []
    v1_id = candidate_equivalence_id(v1.get("selected_candidate"))
    v2_id = v2.get("selected_equivalence_key_sha256")
    if v1_id == v2_id:
        return ["same_morphological_equivalence_selection"]
    if v1_id is None and v2_id is not None:
        reasons.append("v2_became_automatic_after_equivalence_aware_margin")
    elif v1_id is not None and v2_id is None:
        reasons.append(f"v2_withheld_selection_as_{v2['confidence_class']}")
    else:
        reasons.append("different_morphological_equivalence_cluster_selected")
    if v2["equivalent_candidates_collapsed"]:
        reasons.append("technical_candidate_duplicates_collapsed")
    if v1.get("confidence_class") == "RULE_CONFLICT" and v2["confidence_class"] != "RULE_CONFLICT":
        reasons.append("v1_rule_conflict_removed_neighbor_pos_is_weak")
    if v1.get("confidence_class") == "TOP_TIE" and v2["confidence_class"] != "TOP_TIE":
        reasons.append("equivalence_grouping_or_stronger_surface_signal_broke_v1_tie")
    if v2["confidence_class"] == "TOP_TIE" and v1.get("confidence_class") != "TOP_TIE":
        reasons.append("v2_equivalence_clusters_remain_score_tied")
    if v2["confidence_class"] == "RULE_CONFLICT":
        reasons.append("v2_strong_surface_and_structural_negative_conflict")
    if v2.get("equivalence_clusters"):
        top_scores = {part["rule"]: part["score"] for part in v2["equivalence_clusters"][0]["score_components"]}
        if top_scores.get("canonical_diacritic_alignment", 0) >= 20:
            reasons.append("canonical_vocalization_signal_strengthened")
        if top_scores.get("surface_reconstruction", 0) >= 14:
            reasons.append("surface_reconstruction_signal_strengthened")
        if top_scores.get("prefix_stem_suffix_alignment", 0) >= 8:
            reasons.append("prefix_stem_suffix_signal_strengthened")
        if top_scores.get("foreign_ntws_guard", 0) < 0:
            reasons.append("foreign_ntws_candidate_lacked_explicit_evidence")
    return reasons


def compare_with_v1(v2_ranked: list[dict]) -> tuple[dict, dict[str, dict]]:
    v1_records = list(common.read_jsonl(common.V1_RANKED))
    if len(v1_records) != len(v2_ranked):
        raise ValueError("Frozen v1/v2 record count mismatch")
    changes = []
    by_id = {}
    reason_counts = Counter()
    transition_counts = Counter()
    selected_state_counts = Counter()
    for v1, v2 in zip(v1_records, v2_ranked, strict=True):
        if common.identity(v1) != common.identity(v2):
            raise ValueError("Frozen v1/v2 identity order mismatch")
        v1_id = candidate_equivalence_id(v1.get("selected_candidate"))
        v2_id = v2.get("selected_equivalence_key_sha256")
        changed = v1_id != v2_id
        reasons = selected_change_reason(v1, v2)
        if changed:
            reason_counts.update(reasons)
            changes.append({
                "verse_key": v2["verse_key"],
                "word_index": v2["word_index"],
                "canonical_text": v2["canonical_text"],
                "v1_confidence_class": v1["confidence_class"],
                "v2_confidence_class": v2["confidence_class"],
                "v1_selected_equivalence_key_sha256": v1_id,
                "v2_selected_equivalence_key_sha256": v2_id,
                "reasons": reasons,
            })
        transition_counts[(v1["confidence_class"], v2["confidence_class"])] += 1
        selected_state_counts[(v1_id is not None, v2_id is not None, changed)] += 1
        by_id[common.identity(v2)] = {"changed": changed, "reasons": reasons, "v1_class": v1["confidence_class"]}
    report = {
        "schema_version": "camel-contextual-disambiguation-v2-vs-v1-v1",
        "comparison_role": "Frozen baseline diagnosis only; v1 choices were not read by the v2 ranker.",
        "frozen_v1_ranked_sha256": common.EXPECTED_V1_RANKED_SHA256,
        "selection_change_counts": {
            "total_changed": len(changes),
            "v1_unselected_v2_selected": selected_state_counts[(False, True, True)],
            "v1_selected_v2_unselected": selected_state_counts[(True, False, True)],
            "both_selected_different_cluster": selected_state_counts[(True, True, True)],
            "same_selection_state_and_cluster": len(v2_ranked) - len(changes),
        },
        "change_reason_counts": dict(reason_counts.most_common()),
        "confidence_transitions": [
            {"v1": key[0], "v2": key[1], "count": count}
            for key, count in sorted(transition_counts.items())
        ],
        "changed_selections": changes,
    }
    return report, by_id


def legacy_pos(word: dict) -> str:
    role = str(word.get("role") or "").lower()
    pos = str(word.get("pos") or "").upper().split("+")[-1]
    morphology = str(word.get("morphology") or "").upper()
    if role == "verb" or pos.startswith("V"):
        return "verb"
    if "PRON" in pos or role == "pronoun":
        return "pronoun"
    if "PN" in morphology or role == "proper noun":
        return "proper_noun"
    if pos.startswith("N") or role in {"noun", "adjective", "adverb"}:
        return "noun"
    if pos.startswith("P") or role in {"particle", "preposition", "conjunction"}:
        return "particle"
    return "other"


def legacy_features(word: dict) -> dict[str, str]:
    morphology = str(word.get("morphology") or "").upper()
    result: dict[str, str] = {}
    mappings = {
        "cas": (("|NOM", "u"), ("|ACC", "a"), ("|GEN", "g")),
        "stt": (("|DEF", "d"), ("|INDEF", "i")),
        "asp": (("|PERF", "p"), ("|IMPF", "i"), ("|IMPV", "c")),
        "vox": (("|PASS", "p"), ("|ACT", "a")),
        "mod": (("|IND", "i"), ("|SUBJ", "s"), ("|JUS", "j")),
    }
    for field, values in mappings.items():
        for marker, value in values:
            if marker in morphology:
                result[field] = value
                break
    gender_number = re.search(r"\|([MF])([SDP])(?:\||$)", morphology)
    if gender_number:
        result["gen"] = gender_number.group(1).lower()
        result["num"] = {"S": "s", "D": "d", "P": "p"}[gender_number.group(2)]
    person = re.search(r"\|([123])(?:[MF])?(?:[SDP])(?:\||$)", morphology)
    if person:
        result["per"] = person.group(1)
    return result


def compare_candidate(candidate: dict | None, legacy_word: dict) -> dict:
    if candidate is None:
        return {
            "candidate_present": False,
            "root_match": False,
            "raw_lemma_match": False,
            "normalized_lemma_match": False,
            "pos_match": False,
            "feature_compared": 0,
            "feature_matched": 0,
        }
    legacy_lemma = str(legacy_word.get("lemma") or "")
    candidate_lemma = str(candidate.get("lex") or "")
    legacy_feature_values = legacy_features(legacy_word)
    feature_matches = {
        field: candidate.get(field) == value
        for field, value in legacy_feature_values.items()
        if candidate.get(field) not in {None, "", "0", "na"}
    }
    return {
        "candidate_present": True,
        "root_match": common.normalize_root(candidate.get("root")) == common.normalize_root(legacy_word.get("root")),
        "raw_lemma_match": candidate_lemma == legacy_lemma,
        "normalized_lemma_match": common.normalize_lemma(candidate_lemma) == common.normalize_lemma(legacy_lemma),
        "pos_match": common.coarse_pos(candidate.get("pos")) == legacy_pos(legacy_word),
        "feature_matches": feature_matches,
        "feature_compared": len(feature_matches),
        "feature_matched": sum(feature_matches.values()),
    }


def rate(records: list[dict], field: str) -> dict:
    values = [record for record in records if record["comparison"]["candidate_present"]]
    matched = sum(record["comparison"][field] for record in values)
    return {"matched": matched, "compared": len(values), "percent": round(100 * matched / len(values), 4) if values else None}


def metric_group(records: list[dict]) -> dict:
    values = [record for record in records if record["comparison"]["candidate_present"]]
    feature_compared = sum(record["comparison"]["feature_compared"] for record in values)
    feature_matched = sum(record["comparison"]["feature_matched"] for record in values)
    return {
        "words": len(values),
        "root": rate(values, "root_match"),
        "lemma_raw": rate(values, "raw_lemma_match"),
        "lemma_normalized": rate(values, "normalized_lemma_match"),
        "pos": rate(values, "pos_match"),
        "morphology_features": {
            "matched": feature_matched,
            "compared": feature_compared,
            "percent": round(100 * feature_matched / feature_compared, 4) if feature_compared else None,
        },
    }


def compare_with_legacy(v2_ranked: list[dict], legacy_path: Path) -> tuple[dict, dict[str, dict]]:
    legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
    comparisons = []
    by_id = {}
    for record in v2_ranked:
        words = legacy.get(record["verse_key"], [])
        index = record["word_index"] - 1
        if index < 0 or index >= len(words) or words[index].get("position") != record["word_index"]:
            raise ValueError(f"Legacy identity unavailable: {common.identity(record)}")
        legacy_word = words[index]
        top = record["equivalence_clusters"][0]["representative"] if record["equivalence_clusters"] else None
        selected_comparison = compare_candidate(record["selected_candidate"], legacy_word)
        top_comparison = compare_candidate(top, legacy_word)
        item = {
            "verse_key": record["verse_key"],
            "word_index": record["word_index"],
            "canonical_text": record["canonical_text"],
            "confidence_class": record["confidence_class"],
            "selected_comparison": selected_comparison,
            "top_comparison": top_comparison,
        }
        comparisons.append({**item, "comparison": selected_comparison})
        top_mismatch = top_comparison["candidate_present"] and not all(
            top_comparison[field] for field in ("root_match", "normalized_lemma_match", "pos_match")
        )
        by_id[common.identity(record)] = {"top_root_lemma_pos_mismatch": top_mismatch}
    automatic = [item for item in comparisons if item["comparison"]["candidate_present"]]
    high = [item for item in comparisons if item["confidence_class"] == "HIGH_CONFIDENCE"]
    medium_top = []
    normalization_top = []
    for item, ranked in zip(comparisons, v2_ranked, strict=True):
        top_item = {**item, "comparison": item["top_comparison"]}
        if ranked["confidence_class"] == "MEDIUM_CONFIDENCE":
            medium_top.append(top_item)
        if ranked["normalization_sensitive"]:
            normalization_top.append(top_item)
    return {
        "schema_version": "camel-contextual-disambiguation-v2-vs-legacy-v1",
        "benchmark_role": "Blind production baseline comparison only; not gold, training, scoring, weighting, selection, or OOV fill.",
        "legacy_accessed_only_after_v2_freeze_validation": True,
        "legacy_used_to_select_repair_rescore_or_fill": False,
        "legacy_baseline": {
            "relative_path": "data2/processed/canonical_word_analysis_v4.json",
            "sha256": common.sha256_file(legacy_path),
        },
        "metrics": {
            "automatic_selected": metric_group(automatic),
            "high_confidence": metric_group(high),
            "medium_confidence_top_not_auto_selected": metric_group(medium_top),
            "normalization_sensitive_top": metric_group(normalization_top),
        },
        "raw_lemma_definition": "exact raw CAMeL lex string vs exact legacy lemma string",
        "normalized_lemma_definition": "both sides remove lex numeric suffix, Arabic marks and separators, then fold alif/wasl/maqsurah",
        "manual_independent_gold_required": True,
    }, by_id


def review_tags(record: dict, v1_info: dict, legacy_info: dict) -> list[str]:
    tags = []
    if record["confidence_class"] == "HIGH_CONFIDENCE":
        tags.append("HIGH")
    if v1_info["changed"]:
        tags.append("V1_V2_CHANGED")
    if record["confidence_class"] == "TOP_TIE":
        tags.append("TOP_TIE")
    if record["confidence_class"] == "RULE_CONFLICT":
        tags.append("RULE_CONFLICT")
    if record["normalization_sensitive"]:
        tags.append("NORMALIZATION_SENSITIVE")
    if legacy_info["top_root_lemma_pos_mismatch"]:
        tags.append("ROOT_LEMMA_POS_MISMATCH")
    if record["confidence_class"] == "NO_ANALYSIS":
        tags.append("OOV")
    return tags


def compact_cluster(cluster: dict) -> dict:
    candidate = cluster["representative"]
    return {
        "rank": cluster["rank"],
        "equivalence_key_sha256": cluster["equivalence_key_sha256"],
        "raw_candidate_count": cluster["raw_candidate_count"],
        "score": cluster["total_score"],
        "raw_lemma": cluster["representative_raw_lemma"],
        "normalized_lemma": cluster["representative_normalized_lemma"],
        "root_raw": candidate.get("root"),
        "root_normalized": common.normalize_root(candidate.get("root")),
        "pos_raw": candidate.get("pos"),
        "pos_coarse": common.coarse_pos(candidate.get("pos")),
        "features": {field: candidate.get(field) for field in FEATURE_FIELDS},
        "score_components": cluster["score_components"],
        "raw_candidate_signature_sha256s": [item["candidate_signature_sha256"] for item in cluster["raw_candidates"]],
    }


def build_review_package(v2_ranked: list[dict], v1_by_id: dict[str, dict], legacy_by_id: dict[str, dict]) -> tuple[list[dict], dict]:
    eligible: dict[str, list[dict]] = defaultdict(list)
    tags_by_id = {}
    for record in v2_ranked:
        key = common.identity(record)
        tags = review_tags(record, v1_by_id[key], legacy_by_id[key])
        tags_by_id[key] = tags
        for tag in tags:
            eligible[tag].append(record)
    for tag in REVIEW_QUOTAS:
        eligible[tag].sort(key=lambda record: common.stable_digest(common.identity(record), f"gold-review-v2-{tag}"))
    if any(not eligible[tag] for tag in REVIEW_QUOTAS):
        missing = [tag for tag in REVIEW_QUOTAS if not eligible[tag]]
        raise ValueError(f"Review strata unavailable: {missing}")

    chosen: dict[str, tuple[dict, str]] = {}
    # Reserve one record per required stratum before filling the deterministic quotas.
    for tag in REVIEW_QUOTAS:
        record = next(item for item in eligible[tag] if common.identity(item) not in chosen)
        chosen[common.identity(record)] = (record, tag)
    for tag, quota in REVIEW_QUOTAS.items():
        current = sum(primary == tag for _, primary in chosen.values())
        for record in eligible[tag]:
            if current >= quota:
                break
            key = common.identity(record)
            if key in chosen:
                continue
            chosen[key] = (record, tag)
            current += 1

    if len(chosen) < 200:
        remaining = sorted(
            (record for record in v2_ranked if common.identity(record) not in chosen),
            key=lambda record: common.stable_digest(common.identity(record), "gold-review-v2-balance-fill"),
        )
        for record in remaining[: 200 - len(chosen)]:
            chosen[common.identity(record)] = (record, "BALANCE_FILL")
    if len(chosen) != 200:
        raise ValueError(f"Gold review package must contain exactly 200 records, got {len(chosen)}")

    output = []
    for record, primary in sorted(chosen.values(), key=lambda item: common.identity_sort(item[0])):
        key = common.identity(record)
        output.append({
            "review_id": common.stable_digest(key, "independent-gold-review-v2"),
            "verse_key": record["verse_key"],
            "word_index": record["word_index"],
            "canonical_text": record["canonical_text"],
            "context_before": record["context_before"],
            "context_after": record["context_after"],
            "primary_stratum": primary,
            "stratification_tags": tags_by_id[key],
            "confidence_class": record["confidence_class"],
            "margin": record["margin"],
            "normalization": record["normalization"],
            "automatic_selection": record["automatic_selection"],
            "selected_equivalence_key_sha256": record["selected_equivalence_key_sha256"],
            "candidate_counts": {
                "raw_before_grouping": record["candidate_count_before_grouping"],
                "equivalence_clusters_after": record["candidate_count_after_grouping"],
            },
            "top_equivalence_clusters": [compact_cluster(cluster) for cluster in record["equivalence_clusters"][:5]],
            "v1_v2_change_reasons": v1_by_id[key]["reasons"] if v1_by_id[key]["changed"] else [],
            "review_questions": [
                "Is the selected/top root correct for this canonical token in context?",
                "Is the raw or normalized lemma mapping morphologically correct?",
                "Are POS and the stated basic features correct?",
                "If no candidate is correct, mark none; do not infer an OOV analysis.",
            ],
            "gold_answer_included": False,
            "legacy_values_included": False,
        })
    counts = Counter(record["primary_stratum"] for record in output)
    tag_counts = Counter(tag for record in output for tag in record["stratification_tags"])
    manifest = {
        "schema_version": "camel-contextual-disambiguation-v2-gold-review-manifest-v1",
        "records": 200,
        "selection_seed": "independent-gold-review-v2",
        "requested_primary_quotas": REVIEW_QUOTAS,
        "actual_primary_strata": dict(sorted(counts.items())),
        "all_tag_counts": dict(sorted(tag_counts.items())),
        "gold_answers_included": False,
        "legacy_values_included": False,
        "ranking_or_weights_changed_from_review": False,
    }
    return output, manifest


def run(args: argparse.Namespace) -> dict:
    for actual, expected, label in (
        (args.v2_ranked, common.V2_RANKED, "v2 ranked set"),
        (args.v2_manifest, common.V2_MANIFEST, "v2 manifest"),
        (args.legacy, common.LEGACY_PATH, "legacy baseline"),
        (args.v1_report, common.V1_DIFF_REPORT, "v1 comparison report"),
        (args.legacy_report, common.LEGACY_REPORT, "legacy report"),
        (args.gold_output, common.GOLD_PACKAGE, "gold review output"),
        (args.gold_manifest, common.GOLD_MANIFEST, "gold review manifest"),
        (args.final_report, common.FINAL_REPORT, "final report"),
    ):
        common.require_exact(actual, expected, label)

    manifest, v2_ranked, frozen_state = common.validate_v2_frozen()
    frozen_v2_state = {
        str(common.V2_RANKED.relative_to(common.REPO_ROOT)): {
            "sha256": common.sha256_file(common.V2_RANKED), "bytes": common.V2_RANKED.stat().st_size, "mtime_ns": common.V2_RANKED.stat().st_mtime_ns
        },
        str(common.V2_MANIFEST.relative_to(common.REPO_ROOT)): {
            "sha256": common.sha256_file(common.V2_MANIFEST), "bytes": common.V2_MANIFEST.stat().st_size, "mtime_ns": common.V2_MANIFEST.stat().st_mtime_ns
        },
        str(common.RANKER_REPORT.relative_to(common.REPO_ROOT)): {
            "sha256": common.sha256_file(common.RANKER_REPORT), "bytes": common.RANKER_REPORT.stat().st_size, "mtime_ns": common.RANKER_REPORT.stat().st_mtime_ns
        },
    }

    # V1 decisions are first read here, after the v2 ranking and manifest are frozen.
    v1_report, v1_by_id = compare_with_v1(v2_ranked)
    common.write_json_atomic(args.v1_report, v1_report)

    # Legacy is first read here, after the frozen v2 hashes were validated and v1 diagnosis completed.
    legacy_report, legacy_by_id = compare_with_legacy(v2_ranked, args.legacy)
    common.write_json_atomic(args.legacy_report, legacy_report)

    review, review_manifest = build_review_package(v2_ranked, v1_by_id, legacy_by_id)
    common.write_jsonl_atomic(args.gold_output, review)
    review_manifest["gold_review_sha256"] = common.sha256_file(args.gold_output)
    common.write_json_atomic(args.gold_manifest, review_manifest)

    ranker_summary = common.load_json(common.RANKER_REPORT)
    v1_summary = common.load_json(common.V1_SUMMARY)
    v2_classes = ranker_summary["confidence_classes"]
    v1_classes = v1_summary["confidence_classes"]
    blockers = [
        "Independent gold adjudication has not been completed.",
        "Explicit wrong-selection rate is unknown without independent gold.",
    ]
    if not ranker_summary["high_confidence_at_least_100"]:
        blockers.append("HIGH_CONFIDENCE contains fewer than 100 frozen evaluation examples.")
    final = {
        "schema_version": "camel-contextual-disambiguation-v2-summary-v1",
        "status": "diagnostic_candidate_complete_production_blocked",
        "candidate_only": True,
        "production_approved": False,
        "full_77429_selection_allowed": False,
        "words_processed": 1_000,
        "equivalence_grouping": ranker_summary["equivalence_grouping"],
        "confidence_classes": v2_classes,
        "v1_to_v2_class_changes": {
            "top_tie": {"v1": v1_classes.get("TOP_TIE", 0), "v2": v2_classes.get("TOP_TIE", 0), "delta": v2_classes.get("TOP_TIE", 0) - v1_classes.get("TOP_TIE", 0)},
            "rule_conflict": {"v1": v1_classes.get("RULE_CONFLICT", 0), "v2": v2_classes.get("RULE_CONFLICT", 0), "delta": v2_classes.get("RULE_CONFLICT", 0) - v1_classes.get("RULE_CONFLICT", 0)},
        },
        "automatic_selection": ranker_summary["automatic_selection"],
        "rule_impact": ranker_summary["rule_impact"],
        "v1_changed_selections": v1_report["selection_change_counts"],
        "v1_change_reason_counts": v1_report["change_reason_counts"],
        "legacy_blind_comparison": legacy_report["metrics"],
        "high_confidence_at_least_100": ranker_summary["high_confidence_at_least_100"],
        "gold_review_package": {
            "records": 200,
            "sha256": review_manifest["gold_review_sha256"],
            "primary_strata": review_manifest["actual_primary_strata"],
            "all_tag_counts": review_manifest["all_tag_counts"],
            "gold_answers_included": False,
        },
        "safety": {
            "v2_frozen_before_v1_comparison": True,
            "v2_frozen_before_legacy_access": True,
            "legacy_used_for_tuning_or_weights": False,
            "oov_guessed": False,
            "full_77429_selection_run": False,
            "production_or_candidate_db_modified": False,
        },
        "frozen_hashes": {
            "ranked_eval_set": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
            "ranker_summary": manifest["frozen_ranker_outputs"]["ranker_summary"]["sha256"],
            "v1_report": common.sha256_file(args.v1_report),
            "legacy_report": common.sha256_file(args.legacy_report),
            "gold_review": common.sha256_file(args.gold_output),
        },
        "blockers": blockers,
        "next_step": "Independent expert gold adjudication of the frozen 200-record package; no production propagation.",
    }
    common.write_json_atomic(args.final_report, final)

    common.assert_state_unchanged({**frozen_state, **frozen_v2_state})
    return {
        "status": "completed_production_blocked",
        "top_tie_change": final["v1_to_v2_class_changes"]["top_tie"],
        "rule_conflict_change": final["v1_to_v2_class_changes"]["rule_conflict"],
        "automatic_selection": final["automatic_selection"],
        "high_confidence_at_least_100": final["high_confidence_at_least_100"],
        "gold_review_records": 200,
        "final_report_sha256": common.sha256_file(args.final_report),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--v2-ranked", type=Path, default=common.V2_RANKED)
    parser.add_argument("--v2-manifest", type=Path, default=common.V2_MANIFEST)
    parser.add_argument("--legacy", type=Path, default=common.LEGACY_PATH)
    parser.add_argument("--v1-report", type=Path, default=common.V1_DIFF_REPORT)
    parser.add_argument("--legacy-report", type=Path, default=common.LEGACY_REPORT)
    parser.add_argument("--gold-output", type=Path, default=common.GOLD_PACKAGE)
    parser.add_argument("--gold-manifest", type=Path, default=common.GOLD_MANIFEST)
    parser.add_argument("--final-report", type=Path, default=common.FINAL_REPORT)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
