#!/usr/bin/env python3
"""Run v2 with one deterministic tie-break for ranking and rule ablation."""

from __future__ import annotations

import json
from pathlib import Path

import rank_contextual_candidates_v2_base as base


_base_group_candidates = base.group_candidates


def group_candidates(target: dict, neighbors: list[dict | None]) -> list[dict]:
    clusters = _base_group_candidates(target, neighbors)
    clusters.sort(key=lambda item: (-item["total_score"], item["equivalence_key_sha256"]))
    for index, cluster in enumerate(clusters, start=1):
        cluster["rank"] = index
    return clusters


def confidence_without_rule(record: dict, rule: str) -> tuple[str, str | None]:
    clusters = []
    for cluster in record["equivalence_clusters"]:
        adjusted_parts = [
            {**part, "score": 0, "evidence": f"ablated: {part['evidence']}"} if part["rule"] == rule else part
            for part in cluster["score_components"]
        ]
        clusters.append({
            **cluster,
            "score_components": adjusted_parts,
            "total_score": sum(part["score"] for part in adjusted_parts),
        })
    clusters.sort(key=lambda item: (-item["total_score"], item["equivalence_key_sha256"]))
    confidence, _, _, _ = base.classify(clusters)
    selected = clusters[0]["equivalence_key_sha256"] if confidence in {"UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"} else None
    return confidence, selected


base.group_candidates = group_candidates
base.confidence_without_rule = confidence_without_rule
base.__file__ = str(Path(__file__).resolve())


if __name__ == "__main__":
    print(json.dumps(base.run(base.parse_args()), ensure_ascii=True, sort_keys=True))
