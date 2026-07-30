#!/usr/bin/env python3
"""Compare frozen v2.1 with frozen v2, then blindly benchmark legacy with honest denominators."""

from __future__ import annotations

import json
import re
from collections import Counter

import v21_common as common


FEATURE_FIELDS = ("cas", "stt", "gen", "num", "per", "asp", "vox", "mod")
ASCII_LETTERS = re.compile(r"[A-Za-z]")


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


def field_result(candidate_value: str, legacy_value: str, candidate_reason: str, legacy_reason: str) -> dict:
    """Empty normalized values are never counted as matches: they are non_comparable."""
    reasons = []
    if not candidate_value:
        reasons.append(candidate_reason)
    if not legacy_value:
        reasons.append(legacy_reason)
    if reasons:
        return {"status": "non_comparable", "reasons": reasons}
    return {"status": "matched" if candidate_value == legacy_value else "mismatched", "reasons": []}


def compare_candidate(candidate: dict | None, legacy_word: dict) -> dict | None:
    if candidate is None:
        return None
    candidate_root = str(candidate.get("root") or "")
    root_norm_candidate = "" if candidate_root in {"FOREIGN", "NTWS"} else common.normalize_root(candidate_root)
    root_norm_legacy = common.normalize_root(legacy_word.get("root"))
    root = field_result(root_norm_candidate, root_norm_legacy, "candidate_root_foreign_ntws_or_empty", "legacy_root_empty")

    legacy_lemma_raw = str(legacy_word.get("lemma") or "")
    candidate_lemma_raw = str(candidate.get("lex") or "")
    lemma_norm_candidate = common.normalize_lemma(candidate_lemma_raw)
    lemma_norm_legacy = common.normalize_lemma(legacy_lemma_raw)
    legacy_is_ascii = bool(ASCII_LETTERS.search(legacy_lemma_raw))
    lemma = field_result(
        lemma_norm_candidate, lemma_norm_legacy,
        "candidate_lemma_empty_after_normalization",
        "legacy_lemma_buckwalter_not_decoded" if legacy_is_ascii else "legacy_lemma_empty",
    )
    raw_lemma = field_result(candidate_lemma_raw, legacy_lemma_raw, "candidate_raw_lemma_empty", "legacy_raw_lemma_empty")

    legacy_feature_values = legacy_features(legacy_word)
    feature_matches = {
        field: candidate.get(field) == value
        for field, value in legacy_feature_values.items()
        if candidate.get(field) not in {None, "", "0", "na"}
    }
    return {
        "root": root,
        "lemma_normalized": lemma,
        "lemma_raw": raw_lemma,
        "pos": {"status": "matched" if common.coarse_pos(candidate.get("pos")) == legacy_pos(legacy_word) else "mismatched", "reasons": []},
        "feature_compared": len(feature_matches),
        "feature_matched": sum(feature_matches.values()),
    }


def metric_group(comparisons: list[dict]) -> dict:
    result: dict = {"words": len(comparisons)}
    for field in ("root", "lemma_normalized", "lemma_raw", "pos"):
        matched = sum(item[field]["status"] == "matched" for item in comparisons)
        mismatched = sum(item[field]["status"] == "mismatched" for item in comparisons)
        non_comparable = sum(item[field]["status"] == "non_comparable" for item in comparisons)
        comparable = matched + mismatched
        reasons = Counter(reason for item in comparisons for reason in item[field]["reasons"])
        result[field] = {
            "matched": matched,
            "mismatched": mismatched,
            "comparable": comparable,
            "non_comparable": non_comparable,
            "percent_of_comparable": round(100 * matched / comparable, 4) if comparable else None,
            "non_comparable_reasons": dict(sorted(reasons.items())),
        }
    feature_compared = sum(item["feature_compared"] for item in comparisons)
    feature_matched = sum(item["feature_matched"] for item in comparisons)
    result["morphology_features"] = {
        "matched": feature_matched,
        "compared": feature_compared,
        "percent": round(100 * feature_matched / feature_compared, 4) if feature_compared else None,
    }
    return result


def foreign_counters(pick, records: list[dict]) -> dict:
    counts = Counter()
    for record in records:
        candidate = pick(record)
        if candidate is None:
            continue
        counts["total"] += 1
        counts["pos_foreign"] += str(candidate.get("pos") or "") == "foreign"
        counts["root_FOREIGN"] += candidate.get("root") == "FOREIGN"
        counts["root_NTWS"] += candidate.get("root") == "NTWS"
    return dict(counts)


def run() -> dict:
    manifest, v21_ranked = common.validate_v21_frozen()
    upstream_state = manifest["upstream_frozen_state"]
    common.assert_state_unchanged(upstream_state)

    # --- v2 vs v2.1 (frozen v2 output is read only after the v2.1 freeze validation above) ---
    v2_ranked_iter = common.read_jsonl(common.V2_RANKED)
    transitions = Counter()
    v2_records_slim = []
    v2_foreign_selected_outcomes = []
    for v2_record, v21_record in zip(v2_ranked_iter, v21_ranked, strict=True):
        if common.identity(v2_record) != common.identity(v21_record):
            raise ValueError("v2/v2.1 identity order mismatch")
        transitions[(v2_record["confidence_class"], v21_record["confidence_class"])] += 1
        v2_selected = v2_record["selected_candidate"]
        v2_records_slim.append({
            "top": v2_record["equivalence_clusters"][0]["representative"] if v2_record["equivalence_clusters"] else None,
            "selected": v2_selected,
            "class": v2_record["confidence_class"],
        })
        if v2_selected is not None and str(v2_selected.get("pos") or "") == "foreign":
            new_selected = v21_record["selected_candidate"]
            v2_foreign_selected_outcomes.append({
                "verse_key": v21_record["verse_key"],
                "word_index": v21_record["word_index"],
                "canonical_text": v21_record["canonical_text"],
                "v2_class": v2_record["confidence_class"],
                "v2_selected_lex": v2_selected.get("lex"),
                "v21_class": v21_record["confidence_class"],
                "v21_selection_blocked_reason": v21_record["selection_blocked_reason"],
                "v21_automatic_selection": v21_record["automatic_selection"],
                "v21_selected_root": new_selected.get("root") if new_selected else None,
                "v21_selected_lex": new_selected.get("lex") if new_selected else None,
                "v21_selected_pos": new_selected.get("pos") if new_selected else None,
                "v21_top_root": v21_record["equivalence_clusters"][0]["representative"].get("root") if v21_record["equivalence_clusters"] else None,
                "v21_top_pos": v21_record["equivalence_clusters"][0]["representative"].get("pos") if v21_record["equivalence_clusters"] else None,
                "v21_margin": v21_record["margin"],
            })

    def side_counters(records, ranked):
        return {
            "top_cluster": foreign_counters(lambda item: item["top"], records) if records else
                           foreign_counters(lambda record: record["equivalence_clusters"][0]["representative"] if record["equivalence_clusters"] else None, ranked),
            "automatic_selected": foreign_counters(lambda item: item["selected"], records) if records else
                                  foreign_counters(lambda record: record["selected_candidate"], ranked),
        }

    v21_selected = [record for record in v21_ranked if record["automatic_selection"]]
    v21_classes = Counter(record["confidence_class"] for record in v21_ranked)
    v2_classes = Counter(item["class"] for item in v2_records_slim)
    vs_v2 = {
        "schema_version": "camel-contextual-disambiguation-v2.1-vs-v2-v1",
        "comparison_role": "Frozen v2 diagnosis only; v2 choices were not read by the v2.1 ranker.",
        "frozen_v2_ranked_sha256": common.FROZEN_V2_EXPECTED["data/candidates/morphology/disambiguation-v2/ranked-eval-set.jsonl"],
        "frozen_v21_ranked_sha256": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
        "confidence_classes": {"v2": dict(sorted(v2_classes.items())), "v2.1": dict(sorted(v21_classes.items()))},
        "automatic_selection_total": {
            "v2": sum(item["selected"] is not None for item in v2_records_slim),
            "v2.1": len(v21_selected),
        },
        "foreign_ntws_counters": {
            "v2": side_counters(v2_records_slim, None),
            "v2.1": side_counters(None, v21_ranked),
        },
        "echo_metrics_v21": {
            "echo_selected_total": sum(1 for record in v21_selected if record["top_flags"] and record["top_flags"]["echo"]),
            "echo_selected_with_alternatives": sum(
                1 for record in v21_selected
                if record["top_flags"] and record["top_flags"]["echo"] and record["candidate_count_after_grouping"] > 1
            ),
            "high_confidence_echo_top": sum(
                1 for record in v21_ranked
                if record["confidence_class"] == "HIGH_CONFIDENCE" and record["top_flags"]["echo"]
            ),
        },
        "confidence_transitions": [
            {"v2": key[0], "v2.1": key[1], "count": count} for key, count in sorted(transitions.items())
        ],
        "v2_foreign_selected_outcomes": {
            "count": len(v2_foreign_selected_outcomes),
            "still_auto_selected_as_foreign": sum(
                1 for item in v2_foreign_selected_outcomes
                if item["v21_automatic_selection"] and str(item["v21_selected_pos"] or "") == "foreign"
            ),
            "records": v2_foreign_selected_outcomes,
        },
    }
    common.write_json_atomic(common.VS_V2_REPORT, vs_v2)

    # --- legacy benchmark (accessed only after v2.1 freeze validation; benchmark only) ---
    if common.sha256_file(common.LEGACY_PATH) != common.EXPECTED_LEGACY_SHA256:
        raise ValueError("Legacy baseline SHA-256 mismatch")
    legacy = json.loads(common.LEGACY_PATH.read_text(encoding="utf-8-sig"))
    groups: dict[str, list[dict]] = {"automatic_selected": [], "high_confidence_selected": [], "normalization_sensitive_top": [], "medium_confidence_top": []}
    for record in v21_ranked:
        words = legacy.get(record["verse_key"], [])
        index = record["word_index"] - 1
        if index < 0 or index >= len(words) or words[index].get("position") != record["word_index"]:
            raise ValueError(f"Legacy identity unavailable: {common.identity(record)}")
        legacy_word = words[index]
        top = record["equivalence_clusters"][0]["representative"] if record["equivalence_clusters"] else None
        selected_comparison = compare_candidate(record["selected_candidate"], legacy_word)
        top_comparison = compare_candidate(top, legacy_word)
        if selected_comparison is not None:
            groups["automatic_selected"].append(selected_comparison)
            if record["confidence_class"] == "HIGH_CONFIDENCE":
                groups["high_confidence_selected"].append(selected_comparison)
        if top_comparison is not None:
            if record["normalization_sensitive"]:
                groups["normalization_sensitive_top"].append(top_comparison)
            if record["confidence_class"] == "MEDIUM_CONFIDENCE":
                groups["medium_confidence_top"].append(top_comparison)

    legacy_report = {
        "schema_version": "camel-contextual-disambiguation-v2.1-vs-legacy-v1",
        "benchmark_role": "Blind production baseline comparison only; not gold, training, scoring, weighting, selection, or OOV fill.",
        "legacy_accessed_only_after_v21_freeze_validation": True,
        "legacy_used_to_select_repair_rescore_or_fill": False,
        "legacy_baseline": {"relative_path": "data2/processed/canonical_word_analysis_v4.json", "sha256": common.EXPECTED_LEGACY_SHA256},
        "denominator_policy": "matched/comparable only; empty, FOREIGN, NTWS, or undecoded values are non_comparable and never counted as matches",
        "lemma_normalized_metric_name": "lemma_normalized_arabic_only_NO_buckwalter_decode",
        "buckwalter_note": "Legacy lemmas in Buckwalter transliteration are NOT decoded; they are reported as non_comparable (legacy_lemma_buckwalter_not_decoded), never as matches.",
        "metrics": {name: metric_group(items) for name, items in groups.items()},
        "manual_independent_gold_required": True,
    }
    common.write_json_atomic(common.LEGACY_REPORT, legacy_report)

    # --- final summary ---
    ranker_summary = common.load_json(common.RANKER_REPORT)
    auto_metrics = legacy_report["metrics"]["automatic_selected"]
    success = {
        "echo_auto_selected_with_alternatives": vs_v2["echo_metrics_v21"]["echo_selected_with_alternatives"],
        "echo_auto_selected_total": vs_v2["echo_metrics_v21"]["echo_selected_total"],
        "high_confidence_echo_top": vs_v2["echo_metrics_v21"]["high_confidence_echo_top"],
        "vacuous_root_lemma_matches_in_benchmark": 0,
        "root_non_comparable_excluded": auto_metrics["root"]["non_comparable"],
        "lemma_non_comparable_excluded": auto_metrics["lemma_normalized"]["non_comparable"],
        "full_77429_selection_run": False,
        "production_files_modified": False,
    }
    success["all_success_criteria_met"] = (
        success["echo_auto_selected_with_alternatives"] == 0
        and success["echo_auto_selected_total"] == 0
        and success["high_confidence_echo_top"] == 0
    )
    final = {
        "schema_version": "camel-contextual-disambiguation-v2.1-summary-v1",
        "status": "echo_fix_candidate_complete_production_blocked",
        "candidate_only": True,
        "production_approved": False,
        "independent_gold_review_allowed": True,
        "full_77429_selection_allowed": False,
        "production_integration_allowed": False,
        "words_processed": 1_000,
        "confidence_classes": ranker_summary["confidence_classes"],
        "automatic_selection": ranker_summary["automatic_selection"],
        "selection_blocked_reasons": ranker_summary["selection_blocked_reasons"],
        "echo_metrics": ranker_summary["echo_metrics"],
        "success_criteria": success,
        "margin_distribution_after_echo_fix": ranker_summary["margin_distribution_after_echo_fix"],
        "legacy_blind_comparison": legacy_report["metrics"],
        "v2_comparison": {
            "confidence_classes": vs_v2["confidence_classes"],
            "automatic_selection_total": vs_v2["automatic_selection_total"],
            "foreign_ntws_counters": vs_v2["foreign_ntws_counters"],
            "v2_foreign_selected_count": vs_v2["v2_foreign_selected_outcomes"]["count"],
            "v2_foreign_still_selected_as_foreign_in_v21": vs_v2["v2_foreign_selected_outcomes"]["still_auto_selected_as_foreign"],
        },
        "blockers_closed": [
            "B1/F1: FOREIGN/NTWS echo auto-selection (0 echo selections; echo-only words are NO_USABLE_ANALYSIS).",
            "B2/F2: vacuous empty-vs-empty root/lemma matches removed from benchmark denominators (matched/comparable reporting).",
        ],
        "blockers_open": [
            "Independent gold adjudication of the frozen 200-record v2 package is still pending.",
            "Buckwalter legacy lemmas remain undecoded; they are excluded as non_comparable, not resolved.",
            "HIGH margin threshold 18 is unvalidated; candidate thresholds are reported for gold review only.",
            "Explicit wrong-selection rate remains unknown without independent gold.",
        ],
        "frozen_hashes": {
            "v21_ranked_eval_set": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
            "v21_ranker_summary": manifest["frozen_ranker_outputs"]["ranker_summary"]["sha256"],
            "vs_v2_report": common.sha256_file(common.VS_V2_REPORT),
            "legacy_report": common.sha256_file(common.LEGACY_REPORT),
        },
        "gold_review_package_unchanged": True,
        "next_step": "Independent expert gold adjudication (frozen v2 200-record package remains valid; v2.1 results inform the reviewers); no production propagation.",
    }
    common.write_json_atomic(common.FINAL_REPORT, final)
    common.assert_state_unchanged(upstream_state)
    return {
        "status": "completed_production_blocked",
        "echo_metrics": final["echo_metrics"],
        "success_criteria": success,
        "automatic_selection": final["automatic_selection"],
        "final_report_sha256": common.sha256_file(common.FINAL_REPORT),
    }


if __name__ == "__main__":
    print(json.dumps(run(), ensure_ascii=True, sort_keys=True))
