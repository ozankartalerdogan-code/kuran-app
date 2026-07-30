#!/usr/bin/env python3
"""Blindly compare frozen ranker output with the production legacy baseline."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import disambiguation_common as common


LEGACY_PATH = common.REPO_ROOT / "data2/processed/canonical_word_analysis_v4.json"
FEATURE_FIELDS = ("cas", "stt", "gen", "num", "per", "asp", "vox", "mod")
THRESHOLDS = {
    "high_confidence_root_match_percent_min": 97.0,
    "high_confidence_lemma_match_percent_min": 95.0,
    "high_confidence_pos_match_percent_min": 97.0,
    "explicit_wrong_selection_percent_max": 1.0,
    "minimum_high_confidence_evaluation_words": 100,
}


def normalize_root(value: str | None) -> str:
    return re.sub(r"[^ء-ي]", "", common.strip_marks(value or ""))


def normalize_lemma(value: str | None) -> str:
    text = re.sub(r"_\d+$", "", value or "")
    return re.sub(r"[^ء-ي]", "", common.strip_marks(text))


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
    number_gender = re.search(r"\|([MF])([SDP])(?:\||$)", morphology)
    if number_gender:
        result["gen"] = number_gender.group(1).lower()
        result["num"] = {"S": "s", "D": "d", "P": "p"}[number_gender.group(2)]
    person = re.search(r"\|([123])(?:[MF])?(?:[SDP])(?:\||$)", morphology)
    if person:
        result["per"] = person.group(1)
    return result


def compare_candidate(candidate: dict | None, legacy_word: dict) -> dict:
    if candidate is None:
        return {
            "candidate_present": False,
            "root_match": False,
            "lemma_match": False,
            "pos_match": False,
            "feature_matches": {},
            "feature_compared": 0,
            "feature_matched": 0,
        }
    legacy_feature_values = legacy_features(legacy_word)
    feature_matches = {
        field: candidate.get(field) == value
        for field, value in legacy_feature_values.items()
        if candidate.get(field) not in {None, "", "0", "na"}
    }
    return {
        "candidate_present": True,
        "root_match": normalize_root(candidate.get("root")) == normalize_root(legacy_word.get("root")),
        "lemma_match": normalize_lemma(candidate.get("lex")) == normalize_lemma(legacy_word.get("lemma")),
        "pos_match": common.coarse_pos(candidate.get("pos")) == legacy_pos(legacy_word),
        "feature_matches": feature_matches,
        "feature_compared": len(feature_matches),
        "feature_matched": sum(feature_matches.values()),
    }


def rate(records: list[dict], field: str) -> dict:
    denominator = len(records)
    matched = sum(record["comparison"][field] for record in records)
    return {"matched": matched, "compared": denominator, "percent": round(100 * matched / denominator, 4) if denominator else None}


def metric_group(records: list[dict]) -> dict:
    selected = [record for record in records if record["comparison"]["candidate_present"]]
    feature_compared = sum(record["comparison"]["feature_compared"] for record in selected)
    feature_matched = sum(record["comparison"]["feature_matched"] for record in selected)
    return {
        "words": len(selected),
        "root": rate(selected, "root_match"),
        "lemma": rate(selected, "lemma_match"),
        "pos": rate(selected, "pos_match"),
        "morphology_features": {
            "matched": feature_matched,
            "compared": feature_compared,
            "percent": round(100 * feature_matched / feature_compared, 4) if feature_compared else None,
        },
    }


def rule_conflicts(ranked: list[dict]) -> list[dict]:
    counts = Counter()
    for record in ranked:
        if record["confidence_class"] != "RULE_CONFLICT" or not record["ranked_candidates"]:
            continue
        parts = record["ranked_candidates"][0]["score_components"]
        positives = [part["rule"] for part in parts if part["score"] >= 8]
        negatives = [part["rule"] for part in parts if part["score"] <= -8]
        for positive in positives:
            for negative in negatives:
                counts[(positive, negative)] += 1
    return [
        {"positive_rule": key[0], "negative_rule": key[1], "count": count}
        for key, count in counts.most_common()
    ]


def validate_frozen_inputs() -> tuple[dict, list[dict], list[dict], dict[str, tuple[str, int]]]:
    common.validate_full_inputs(check_shard_hashes=False)
    manifest = common.load_json(common.EVAL_MANIFEST)
    frozen = manifest.get("frozen_ranker_outputs")
    if not frozen or frozen.get("status") != "frozen_before_legacy_comparison":
        raise ValueError("Ranker outputs were not frozen before legacy access")
    expected = {
        common.EVAL_SET: manifest["eval_set"]["sha256"],
        common.RANKED_SET: frozen["ranked_eval_set"]["sha256"],
        common.OOV_RECOVERY: frozen["oov_recovery"]["sha256"],
    }
    state = {}
    for path, digest in expected.items():
        if common.sha256_file(path) != digest:
            raise ValueError(f"Frozen input SHA mismatch: {path.name}")
        state[str(path)] = (digest, path.stat().st_mtime_ns)
    ranked = list(common.read_jsonl(common.RANKED_SET))
    oov = list(common.read_jsonl(common.OOV_RECOVERY))
    if len(ranked) != 1_000 or len(oov) != 50:
        raise ValueError("Frozen ranked/OOV record count mismatch")
    return manifest, ranked, oov, state


def run(args: argparse.Namespace) -> dict:
    common.require_exact(args.ranked_set, common.RANKED_SET, "ranked eval set")
    common.require_exact(args.eval_manifest, common.EVAL_MANIFEST, "eval-set manifest")
    legacy_path = common.require_exact(args.legacy, LEGACY_PATH, "legacy baseline")
    output = common.require_candidate_output(args.output, common.VS_LEGACY, "legacy comparison output")
    summary_output = common.require_candidate_output(args.summary_output, common.POC_SUMMARY, "PoC summary output")

    manifest, ranked, oov, frozen_state = validate_frozen_inputs()
    # Legacy access occurs only after every frozen hash above has been verified.
    legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
    comparisons: list[dict] = []
    for record in ranked:
        words = legacy.get(record["verse_key"], [])
        index = record["word_index"] - 1
        if index < 0 or index >= len(words) or words[index].get("position") != record["word_index"]:
            raise ValueError(f"Legacy identity unavailable: {record['verse_key']}:{record['word_index']}")
        legacy_word = words[index]
        selected = record["selected_candidate"]
        top = record["ranked_candidates"][0]["candidate"] if record["ranked_candidates"] else None
        comparison = compare_candidate(selected, legacy_word)
        top_comparison = compare_candidate(top, legacy_word)
        comparisons.append({
            "verse_key": record["verse_key"],
            "word_index": record["word_index"],
            "canonical_text": record["canonical_text"],
            "confidence_class": record["confidence_class"],
            "margin": record["margin"],
            "selected_candidate": selected,
            "top_candidate": top,
            "legacy_baseline": {
                "root": legacy_word.get("root"),
                "lemma": legacy_word.get("lemma"),
                "pos": legacy_word.get("pos"),
                "role": legacy_word.get("role"),
                "morphology": legacy_word.get("morphology"),
            },
            "comparison": comparison,
            "top_candidate_comparison": top_comparison,
            "interpretation": "Legacy is a production baseline, not a correctness ground truth; disagreement requires independent adjudication.",
        })

    automatic = [record for record in comparisons if record["comparison"]["candidate_present"]]
    unique = [record for record in comparisons if record["confidence_class"] == "UNIQUE_INPUT"]
    high = [record for record in comparisons if record["confidence_class"] == "HIGH_CONFIDENCE"]
    normalization_sensitive = []
    for comparison, ranked_record in zip(comparisons, ranked, strict=True):
        if ranked_record["normalization"]["normalization_sensitive"] and comparison["top_candidate_comparison"]["candidate_present"]:
            normalization_sensitive.append({**comparison, "comparison": comparison["top_candidate_comparison"]})

    def mismatch_count(record: dict) -> int:
        value = record["comparison"]
        return sum(not value[field] for field in ("root_match", "lemma_match", "pos_match"))

    ranked_worst = sorted(
        (record for record in comparisons if record["top_candidate_comparison"]["candidate_present"]),
        key=lambda record: (
            -sum(not record["top_candidate_comparison"][field] for field in ("root_match", "lemma_match", "pos_match")),
            record["margin"] if record["margin"] is not None else -1,
            common.identity_sort(record),
        ),
    )[:100]
    worst_100 = [{**record, "comparison": record["top_candidate_comparison"]} for record in ranked_worst]
    baseline_disagreements = [record for record in automatic if mismatch_count(record) > 0]
    high_metrics = metric_group(high)
    high_any_disagreement = sum(mismatch_count(record) > 0 for record in high)
    high_disagreement_percent = round(100 * high_any_disagreement / len(high), 4) if high else None

    threshold_status = {
        "root": high_metrics["root"]["percent"] is not None and high_metrics["root"]["percent"] >= THRESHOLDS["high_confidence_root_match_percent_min"],
        "lemma": high_metrics["lemma"]["percent"] is not None and high_metrics["lemma"]["percent"] >= THRESHOLDS["high_confidence_lemma_match_percent_min"],
        "pos": high_metrics["pos"]["percent"] is not None and high_metrics["pos"]["percent"] >= THRESHOLDS["high_confidence_pos_match_percent_min"],
        "minimum_high_confidence_sample": len(high) >= THRESHOLDS["minimum_high_confidence_evaluation_words"],
        "explicit_wrong_rate": "UNMEASURABLE_WITHOUT_INDEPENDENT_GOLD_ADJUDICATION",
    }
    full_corpus_allowed = all(value is True for value in threshold_status.values())
    report = {
        "schema_version": "camel-contextual-vs-legacy-v1",
        "benchmark_role": "Existing production baseline only; not a correctness reference or training signal.",
        "legacy_used_to_select_repair_rescore_or_fill": False,
        "frozen_inputs": {
            "eval_set_sha256": manifest["eval_set"]["sha256"],
            "ranked_eval_set_sha256": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
            "oov_recovery_sha256": manifest["frozen_ranker_outputs"]["oov_recovery"]["sha256"],
            "eval_set_manifest_sha256": common.sha256_file(common.EVAL_MANIFEST),
        },
        "legacy_baseline": {"relative_path": "data2/processed/canonical_word_analysis_v4.json", "sha256": common.sha256_file(legacy_path)},
        "metrics": {
            "automatic_selected": metric_group(automatic),
            "unique_input": metric_group(unique),
            "high_confidence": high_metrics,
            "normalization_sensitive_top_candidate": metric_group(normalization_sensitive),
        },
        "high_confidence_any_root_lemma_or_pos_disagreement": {"count": high_any_disagreement, "words": len(high), "percent": high_disagreement_percent},
        "success_thresholds": THRESHOLDS,
        "threshold_status": threshold_status,
        "full_77429_contextual_selection_allowed": full_corpus_allowed,
        "most_frequent_rule_conflicts": rule_conflicts(ranked),
        "worst_100_by_legacy_disagreement": worst_100,
        "automatic_selection_baseline_disagreement_examples": baseline_disagreements[:30],
        "manual_adjudication_required": True,
    }
    common.write_json_atomic(output, report)

    classes = Counter(record["confidence_class"] for record in ranked)
    selected_count = len(automatic)
    analyzed_count = sum(record["candidate_count"] > 0 for record in ranked)
    recovered = sum(record["recovered"] for record in oov)
    summary = {
        "schema_version": "camel-contextual-disambiguation-poc-summary-v1",
        "status": "completed_full_corpus_blocked",
        "candidate_only": True,
        "production_approved": False,
        "words_processed": len(ranked),
        "automatic_selected": selected_count,
        "automatic_selection_percent_all_words": round(100 * selected_count / len(ranked), 4),
        "automatic_selection_percent_analyzed_words": round(100 * selected_count / analyzed_count, 4),
        "confidence_classes": dict(sorted(classes.items())),
        "candidate_reduction": {
            "average_input_unique_candidates": round(sum(record["candidate_count"] for record in ranked) / len(ranked), 4),
            "average_explainable_shortlist_candidates": round(sum(record["shortlist_count"] for record in ranked) / len(ranked), 4),
        },
        "oov_recovery": {"attempted": len(oov), "recovered": recovered, "recovery_percent": round(100 * recovered / len(oov), 4)},
        "legacy_comparison": report["metrics"],
        "high_confidence_baseline_disagreement_percent": high_disagreement_percent,
        "success_thresholds": THRESHOLDS,
        "threshold_status": threshold_status,
        "full_77429_contextual_selection_allowed": full_corpus_allowed,
        "blockers": [
            "HIGH_CONFIDENCE evaluation sample is below the required minimum." if not threshold_status["minimum_high_confidence_sample"] else None,
            "Explicit wrong-selection rate cannot be established from a legacy baseline without independent gold adjudication.",
            "Required root/lemma/POS thresholds are not all proven." if not all(threshold_status[key] for key in ("root", "lemma", "pos")) else None,
        ],
        "ranked_eval_set_sha256": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
        "oov_recovery_sha256": manifest["frozen_ranker_outputs"]["oov_recovery"]["sha256"],
        "legacy_report_sha256": None,
    }
    summary["blockers"] = [value for value in summary["blockers"] if value]
    summary["legacy_report_sha256"] = common.sha256_file(output)
    common.write_json_atomic(summary_output, summary)

    for path_string, (digest, mtime_ns) in frozen_state.items():
        path = Path(path_string)
        if common.sha256_file(path) != digest or path.stat().st_mtime_ns != mtime_ns:
            raise ValueError(f"Frozen ranker input changed during comparison: {path.name}")
    return {
        "status": "completed",
        "automatic_selected": selected_count,
        "high_confidence_words": len(high),
        "metrics": report["metrics"],
        "full_77429_contextual_selection_allowed": full_corpus_allowed,
        "legacy_report_sha256": common.sha256_file(output),
        "summary_sha256": common.sha256_file(summary_output),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ranked-set", type=Path, default=common.RANKED_SET)
    parser.add_argument("--eval-manifest", type=Path, default=common.EVAL_MANIFEST)
    parser.add_argument("--legacy", type=Path, default=LEGACY_PATH)
    parser.add_argument("--output", type=Path, default=common.VS_LEGACY)
    parser.add_argument("--summary-output", type=Path, default=common.POC_SUMMARY)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
