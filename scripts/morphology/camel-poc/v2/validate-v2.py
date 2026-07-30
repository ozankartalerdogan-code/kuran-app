#!/usr/bin/env python3
"""Validate v2 freeze, candidate retention, diagnostics, and review-package safety."""

from __future__ import annotations

import json
from collections import Counter

import v2_common as common


REQUIRED_REVIEW_TAGS = {
    "HIGH", "V1_V2_CHANGED", "TOP_TIE", "RULE_CONFLICT",
    "NORMALIZATION_SENSITIVE", "ROOT_LEMMA_POS_MISMATCH", "OOV",
}


def main() -> dict:
    manifest, ranked, frozen_state = common.validate_v2_frozen()
    eval_records = list(common.read_jsonl(common.EVAL_SET))
    if len(eval_records) != 1_000:
        raise ValueError("Frozen eval set must contain 1,000 records")

    raw_total = cluster_total = selected = oov = 0
    classes = Counter()
    for expected, record in zip(eval_records, ranked, strict=True):
        if common.identity(expected) != common.identity(record):
            raise ValueError("Eval/v2 identity mismatch")
        if expected["canonical_text"] != record["canonical_text"]:
            raise ValueError(f"Canonical text mismatch: {common.identity(record)}")
        raw_count = record["candidate_count_before_grouping"]
        cluster_count = record["candidate_count_after_grouping"]
        if cluster_count > raw_count:
            raise ValueError(f"Grouping increased candidate count: {common.identity(record)}")
        if sum(cluster["raw_candidate_count"] for cluster in record["equivalence_clusters"]) != raw_count:
            raise ValueError(f"Raw candidate retention mismatch: {common.identity(record)}")
        signatures = [
            member["candidate_signature_sha256"]
            for cluster in record["equivalence_clusters"]
            for member in cluster["raw_candidates"]
        ]
        if len(signatures) != len(set(signatures)):
            raise ValueError(f"Raw candidate duplicated/lost across clusters: {common.identity(record)}")
        for cluster in record["equivalence_clusters"]:
            if cluster["representative_normalized_lemma"] != common.normalize_lemma(cluster["representative_raw_lemma"]):
                raise ValueError(f"Lemma normalization mismatch: {common.identity(record)}")
            scores = {part["rule"]: part["score"] for part in cluster["score_components"]}
            if scores["neighbor_pos_weak"] not in {-1, 0, 1}:
                raise ValueError("Neighbor POS is not weak")
            if scores["foreign_ntws_guard"] not in {-30, 0, 2}:
                raise ValueError("FOREIGN/NTWS guard score is outside policy")
        if record["automatic_selection"] != (record["selected_candidate"] is not None):
            raise ValueError("Automatic selection flag mismatch")
        if record["automatic_selection"] and record["confidence_class"] not in {"UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"}:
            raise ValueError("Unsafe confidence class was automatically selected")
        if record["confidence_class"] == "MEDIUM_CONFIDENCE" and record["automatic_selection"]:
            raise ValueError("MEDIUM must remain unselected")
        if record["confidence_class"] == "NO_ANALYSIS":
            oov += 1
            if record["equivalence_clusters"] or record["selected_candidate"] is not None:
                raise ValueError("OOV was guessed or filled")
        if record["provenance"].get("legacy_used_for_ranking") or record["provenance"].get("v1_choices_used_for_ranking"):
            raise ValueError("V2 ranking provenance is not blind")
        if record["provenance"].get("global_same_surface_forcing"):
            raise ValueError("Global same-surface forcing is enabled")
        raw_total += raw_count
        cluster_total += cluster_count
        selected += record["automatic_selection"]
        classes[record["confidence_class"]] += 1
    if oov != 50:
        raise ValueError(f"Expected 50 frozen OOV records, got {oov}")

    ranker_report = common.load_json(common.RANKER_REPORT)
    if ranker_report["equivalence_grouping"]["candidate_count_before"] != raw_total:
        raise ValueError("Ranker raw total mismatch")
    if ranker_report["equivalence_grouping"]["cluster_count_after"] != cluster_total:
        raise ValueError("Ranker cluster total mismatch")
    if ranker_report["automatic_selection"]["total"] != selected:
        raise ValueError("Ranker automatic selection total mismatch")
    if ranker_report["confidence_classes"] != dict(sorted(classes.items())):
        raise ValueError("Ranker confidence counts mismatch")

    final = common.load_json(common.FINAL_REPORT)
    if final["words_processed"] != 1_000 or final["full_77429_selection_allowed"]:
        raise ValueError("Final safety/count mismatch")
    if not final["safety"]["v2_frozen_before_legacy_access"] or final["safety"]["legacy_used_for_tuning_or_weights"]:
        raise ValueError("Legacy freeze boundary mismatch")

    review = list(common.read_jsonl(common.GOLD_PACKAGE))
    review_manifest = common.load_json(common.GOLD_MANIFEST)
    if len(review) != 200 or review_manifest["records"] != 200:
        raise ValueError("Gold review package must contain 200 records")
    review_ids = [item["review_id"] for item in review]
    if len(review_ids) != len(set(review_ids)):
        raise ValueError("Gold review package contains duplicate records")
    included_tags = {tag for item in review for tag in item["stratification_tags"]}
    if not REQUIRED_REVIEW_TAGS.issubset(included_tags):
        raise ValueError(f"Gold review strata missing: {sorted(REQUIRED_REVIEW_TAGS - included_tags)}")
    if any(item["gold_answer_included"] or item["legacy_values_included"] for item in review):
        raise ValueError("Gold answer or legacy values leaked into review package")
    if common.sha256_file(common.GOLD_PACKAGE) != review_manifest["gold_review_sha256"]:
        raise ValueError("Gold review SHA-256 mismatch")

    common.assert_state_unchanged(frozen_state)
    return {
        "status": "validated",
        "records": len(ranked),
        "raw_candidates": raw_total,
        "equivalence_clusters": cluster_total,
        "automatic_selected": selected,
        "oov_unfilled": oov,
        "gold_review_records": len(review),
        "frozen_v1_files": len(manifest["frozen_v1_state"]),
        "protected_files": len(manifest["protected_state"]),
    }


if __name__ == "__main__":
    print(json.dumps(main(), ensure_ascii=True, sort_keys=True))
