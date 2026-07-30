#!/usr/bin/env python3
"""Validate v2.1 freeze, retention, gating, success criteria, and upstream immutability."""

from __future__ import annotations

import json
from collections import Counter

import v21_common as common


SELECTABLE = {"UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"}
NEVER_SELECTED = {"NO_ANALYSIS", "NO_USABLE_ANALYSIS", "ECHO_TOP_UNRESOLVED", "TOP_TIE",
                  "RULE_CONFLICT", "MEDIUM_CONFIDENCE", "LOW_CONFIDENCE"}


def main() -> dict:
    manifest, ranked = common.validate_v21_frozen()
    common.assert_state_unchanged(manifest["upstream_frozen_state"])

    eval_records = list(common.read_jsonl(common.EVAL_SET))
    if len(eval_records) != 1_000:
        raise ValueError("Frozen eval set must contain 1,000 records")

    classes = Counter()
    selected = 0
    echo_selected = 0
    echo_selected_with_alt = 0
    high_echo_top = 0
    foreign_ntws_selected_with_alt = 0
    raw_total = cluster_total = 0
    for expected, record in zip(eval_records, ranked, strict=True):
        key = common.identity(record)
        if common.identity(expected) != key or expected["canonical_text"] != record["canonical_text"]:
            raise ValueError(f"Eval/v2.1 identity mismatch: {key}")
        clusters = record["equivalence_clusters"]
        raw_count = record["candidate_count_before_grouping"]
        raw_total += raw_count
        cluster_total += len(clusters)
        if record["candidate_count_after_grouping"] != len(clusters):
            raise ValueError(f"Cluster count mismatch: {key}")
        if sum(cluster["raw_candidate_count"] for cluster in clusters) != raw_count:
            raise ValueError(f"Raw candidate retention mismatch: {key}")
        signatures = [member["candidate_signature_sha256"] for cluster in clusters for member in cluster["raw_candidates"]]
        if len(signatures) != len(set(signatures)) or len(signatures) != raw_count:
            raise ValueError(f"Raw candidate duplicated/lost: {key}")
        for cluster in clusters:
            for member in cluster["raw_candidates"]:
                if common.equivalence_payload(member["candidate"]) != cluster["equivalence_key"]:
                    raise ValueError(f"Member escaped its equivalence class: {key}")
                if member["total_score"] != sum(part["score"] for part in member["score_components"]):
                    raise ValueError(f"Member score sum mismatch: {key}")
            if cluster["total_score"] != sum(part["score"] for part in cluster["score_components"]):
                raise ValueError(f"Cluster score sum mismatch: {key}")
            guard = next(part["score"] for part in cluster["score_components"] if part["rule"] == "foreign_ntws_guard")
            if guard not in {-30, 0}:
                raise ValueError(f"Echo guard score outside policy: {key}")
        for left, right in zip(clusters, clusters[1:]):
            if left["total_score"] < right["total_score"] or (
                left["total_score"] == right["total_score"]
                and left["equivalence_key_sha256"] > right["equivalence_key_sha256"]
            ):
                raise ValueError(f"Cluster ordering violation: {key}")

        confidence = record["confidence_class"]
        classes[confidence] += 1
        flags = record["top_flags"]
        if clusters and all(cluster["representative_flags"]["echo"] for cluster in clusters) and confidence != "NO_USABLE_ANALYSIS":
            raise ValueError(f"Echo-only word not NO_USABLE_ANALYSIS: {key}")
        if clusters and clusters[0]["representative_flags"]["echo"] and confidence in SELECTABLE:
            raise ValueError(f"Echo top classified as selectable: {key}")
        if confidence == "HIGH_CONFIDENCE" and flags["echo"]:
            high_echo_top += 1
        if record["automatic_selection"] != (record["selected_candidate"] is not None):
            raise ValueError(f"Selection flag mismatch: {key}")
        if record["selected_candidate"] is not None:
            selected += 1
            if confidence not in SELECTABLE:
                raise ValueError(f"Unsafe class auto-selected: {key}")
            if record["selected_candidate"] != clusters[0]["representative"]:
                raise ValueError(f"Selected candidate is not the top representative: {key}")
            if flags["echo"]:
                echo_selected += 1
                if len(clusters) > 1:
                    echo_selected_with_alt += 1
            if flags["foreign_ntws"] and len(clusters) > 1:
                foreign_ntws_selected_with_alt += 1
            if flags["abbrev"]:
                raise ValueError(f"Abbreviation top auto-selected: {key}")
        elif confidence in NEVER_SELECTED and record["selected_candidate"] is not None:
            raise ValueError(f"Never-selected class carries a selection: {key}")
        provenance = record["provenance"]
        if provenance["legacy_used_for_ranking"] or provenance["v1_choices_used_for_ranking"] or provenance["v2_choices_used_for_ranking"]:
            raise ValueError(f"V2.1 ranking provenance is not blind: {key}")

    if classes.get("NO_ANALYSIS", 0) != 50:
        raise ValueError("Frozen OOV word count changed")

    summary = common.load_json(common.RANKER_REPORT)
    if summary["confidence_classes"] != dict(sorted(classes.items())):
        raise ValueError("Ranker summary class counts mismatch")
    if summary["automatic_selection"]["total"] != selected:
        raise ValueError("Ranker summary selection total mismatch")

    legacy_report = common.load_json(common.LEGACY_REPORT)
    for group_name, group in legacy_report["metrics"].items():
        for field in ("root", "lemma_normalized", "lemma_raw"):
            block = group[field]
            if block["matched"] + block["mismatched"] != block["comparable"]:
                raise ValueError(f"Benchmark comparable arithmetic broken: {group_name}.{field}")
            if block["comparable"] + block["non_comparable"] != group["words"]:
                raise ValueError(f"Benchmark denominator broken: {group_name}.{field}")

    final = common.load_json(common.FINAL_REPORT)
    success = final["success_criteria"]
    checks = {
        "echo_auto_selected_with_alternatives": (echo_selected_with_alt, 0),
        "echo_auto_selected_total": (echo_selected, 0),
        "high_confidence_echo_top": (high_echo_top, 0),
        "foreign_ntws_selected_with_alternatives": (foreign_ntws_selected_with_alt, 0),
    }
    for name, (actual, target) in checks.items():
        if actual != target:
            raise ValueError(f"Success criterion failed: {name}={actual} (expected {target})")
    if success["echo_auto_selected_with_alternatives"] != 0 or success["high_confidence_echo_top"] != 0:
        raise ValueError("Final report success criteria mismatch")
    if final["full_77429_selection_allowed"] or final["production_integration_allowed"]:
        raise ValueError("Final report must keep full-corpus and production blocked")

    gold_sha = common.sha256_file(common.REPO_ROOT / "data/candidates/morphology/disambiguation-v2/gold-review-package.jsonl")
    if gold_sha != common.FROZEN_V2_EXPECTED["data/candidates/morphology/disambiguation-v2/gold-review-package.jsonl"]:
        raise ValueError("Gold review package changed")

    tmp_files = list(common.V21_DIR.glob("*.tmp")) + list(common.REPORT_DIR.glob("disambiguation-v2.1-*.tmp"))
    if tmp_files:
        raise ValueError(f"Temporary files remain: {[path.name for path in tmp_files]}")

    return {
        "status": "validated",
        "records": len(ranked),
        "raw_candidates": raw_total,
        "equivalence_clusters": cluster_total,
        "automatic_selected": selected,
        "confidence_classes": dict(sorted(classes.items())),
        "success_criteria_verified": {name: actual for name, (actual, _) in checks.items()},
        "gold_package_unchanged": True,
        "upstream_frozen_files_checked": len(manifest["upstream_frozen_state"]),
    }


if __name__ == "__main__":
    print(json.dumps(main(), ensure_ascii=True, sort_keys=True))
