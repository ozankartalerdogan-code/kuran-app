#!/usr/bin/env python3
"""V2.1 ranker: v2 rules with a strict FOREIGN/NTWS echo guard and selection gating.

Changes vs the frozen v2 ranker (everything else is reused from v2 unchanged):
1. foreign_ntws_guard: an echo candidate (lex == diac == canonical surface, root=FOREIGN
   or pos=foreign) is never trusted (-30, no evidence exception). Non-echo FOREIGN/NTWS
   candidates are neutral (0) only with exact canonical-diac or exact reconstruction
   evidence, otherwise -30.
2. Classification: if every equivalence cluster is an echo, the word is
   NO_USABLE_ANALYSIS; if the top cluster is an echo while real alternatives exist,
   the word is ECHO_TOP_UNRESOLVED. Neither is ever auto-selected.
3. Selection gating: FOREIGN/NTWS tops are never auto-selected when alternative
   clusters exist; single-cluster non-echo FOREIGN/NTWS needs exact evidence;
   abbreviation tops are tagged and never auto-selected.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import v21_common as common
import rank_contextual_candidates_v2_base as v2base


THRESHOLDS = dict(v2base.THRESHOLDS)
WEIGHTS = dict(v2base.WEIGHTS)
WEIGHTS.pop("foreign_explicit_evidence", None)
WEIGHTS.pop("foreign_without_evidence", None)
WEIGHTS.update({
    "echo_of_canonical_surface": -30,
    "foreign_ntws_without_exact_evidence": -30,
    "foreign_ntws_with_exact_evidence": 0,
})
SELECTABLE_CLASSES = {"UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"}
CANDIDATE_HIGH_THRESHOLDS = (8, 12, 15, 18, 21, 24, 30)


def candidate_flags(target: dict, candidate: dict) -> dict:
    canonical = target["canonical_text"]
    canonical_diac = common.clean_diacritics(canonical)
    candidate_diac = common.clean_diacritics(str(candidate.get("diac") or ""))
    reconstructed = common.clean_diacritics(
        v2base.compact_segment(candidate.get("d3seg") or candidate.get("atbseg") or candidate.get("diac"))
    )
    lex = str(candidate.get("lex") or "")
    diac = str(candidate.get("diac") or "")
    echo = (
        (candidate.get("root") == "FOREIGN" or str(candidate.get("pos") or "") == "foreign")
        and lex == diac
        and (diac == canonical or (bool(candidate_diac) and candidate_diac == canonical_diac))
    )
    return {
        "foreign_ntws": v2base.is_foreign_or_ntws(candidate),
        "echo": echo,
        "exact_diac": bool(canonical_diac) and canonical_diac == candidate_diac,
        "exact_reconstruction": bool(reconstructed) and reconstructed == canonical_diac,
        "abbrev": str(candidate.get("pos") or "") == "abbrev",
    }


def score_candidate(target: dict, candidate: dict, origin: dict, neighbors: list) -> tuple[list[dict], dict]:
    parts = v2base.score_candidate(target, candidate, origin, neighbors)
    flags = candidate_flags(target, candidate)
    if not flags["foreign_ntws"]:
        score, evidence = 0, "candidate is not FOREIGN/NTWS"
    elif flags["echo"]:
        score, evidence = WEIGHTS["echo_of_canonical_surface"], "echo of canonical surface (lex==diac==canonical); never trusted"
    elif flags["exact_diac"] or flags["exact_reconstruction"]:
        score, evidence = WEIGHTS["foreign_ntws_with_exact_evidence"], "non-echo FOREIGN/NTWS with exact canonical-diac or reconstruction evidence"
    else:
        score, evidence = WEIGHTS["foreign_ntws_without_exact_evidence"], "FOREIGN/NTWS without exact evidence"
    parts = [
        part if part["rule"] != "foreign_ntws_guard"
        else {"rule": "foreign_ntws_guard", "score": int(score), "evidence": evidence}
        for part in parts
    ]
    return parts, flags


def group_candidates(target: dict, neighbors: list) -> list[dict]:
    origins = v2base.candidate_origins(target)
    grouped: dict[str, dict] = {}
    for candidate in target["unique_candidates"]:
        signature = common.candidate_signature(candidate)
        parts, flags = score_candidate(target, candidate, origins[signature], neighbors)
        payload = common.equivalence_payload(candidate)
        payload_serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        member = {
            "candidate_signature_sha256": common.stable_digest(signature, "candidate-signature-v2"),
            "raw_lemma": candidate.get("lex"),
            "normalized_lemma": common.normalize_lemma(candidate.get("lex")),
            "candidate": candidate,
            "source_forms": sorted(origins[signature]["forms"]),
            "source_profiles": sorted(origins[signature]["profiles"]),
            "score_components": parts,
            "total_score": sum(part["score"] for part in parts),
            "flags": flags,
            "_signature": signature,
        }
        bucket = grouped.setdefault(payload_serialized, {"payload": payload, "serialized": payload_serialized, "members": []})
        bucket["members"].append(member)

    clusters = []
    for bucket in grouped.values():
        members = sorted(bucket["members"], key=lambda item: (-item["total_score"], item["_signature"]))
        representative = members[0]
        for member in members:
            member.pop("_signature")
        clusters.append({
            "equivalence_key_sha256": common.stable_digest(bucket["serialized"], "morph-equivalence-v2"),
            "equivalence_key": bucket["payload"],
            "raw_candidate_count": len(members),
            "representative": representative["candidate"],
            "representative_raw_lemma": representative["raw_lemma"],
            "representative_normalized_lemma": representative["normalized_lemma"],
            "representative_flags": representative["flags"],
            "score_components": representative["score_components"],
            "total_score": representative["total_score"],
            "member_score_min": min(member["total_score"] for member in members),
            "member_score_max": max(member["total_score"] for member in members),
            "raw_candidates": members,
        })
    clusters.sort(key=lambda item: (-item["total_score"], item["equivalence_key_sha256"]))
    for index, cluster in enumerate(clusters, start=1):
        cluster["rank"] = index
    return clusters


def classify(clusters: list[dict]) -> str:
    if not clusters:
        return "NO_ANALYSIS"
    if all(cluster["representative_flags"]["echo"] for cluster in clusters):
        return "NO_USABLE_ANALYSIS"
    if clusters[0]["representative_flags"]["echo"]:
        return "ECHO_TOP_UNRESOLVED"
    if len(clusters) == 1:
        return "UNIQUE_EQUIVALENCE_CLUSTER"
    margin = clusters[0]["total_score"] - clusters[1]["total_score"]
    if margin == THRESHOLDS["top_tie_margin"]:
        return "TOP_TIE"
    if v2base.top_has_rule_conflict(clusters[0]):
        return "RULE_CONFLICT"
    if margin >= THRESHOLDS["high_confidence_min_margin"]:
        return "HIGH_CONFIDENCE"
    if margin >= THRESHOLDS["medium_confidence_min_margin"]:
        return "MEDIUM_CONFIDENCE"
    return "LOW_CONFIDENCE"


def selection_gate(confidence: str, clusters: list[dict]) -> tuple[bool, str | None]:
    if confidence not in SELECTABLE_CLASSES:
        return False, None
    flags = clusters[0]["representative_flags"]
    if flags["echo"]:
        return False, "echo_top"
    if flags["abbrev"]:
        return False, "abbrev_top_not_auto_selectable"
    if flags["foreign_ntws"]:
        if len(clusters) > 1:
            return False, "foreign_ntws_top_with_alternative_clusters"
        if not (flags["exact_diac"] or flags["exact_reconstruction"]):
            return False, "foreign_ntws_unique_without_exact_evidence"
    return True, None


def rank_record(eval_record: dict, target: dict, loaded: dict) -> dict:
    context_before = eval_record["context_before"][-3:]
    context_after = eval_record["context_after"][:3]
    before = [loaded.get(common.identity(item)) for item in context_before]
    after = [loaded.get(common.identity(item)) for item in context_after]
    neighbors = [None] * (3 - len(before)) + before + after + [None] * (3 - len(after))
    clusters = group_candidates(target, neighbors) if target["candidate_count_unique"] else []
    confidence = classify(clusters)
    top_score = clusters[0]["total_score"] if clusters else None
    second_score = clusters[1]["total_score"] if len(clusters) > 1 else None
    margin = top_score - second_score if second_score is not None else None
    selected_allowed, blocked_reason = selection_gate(confidence, clusters)
    selected_cluster = clusters[0] if selected_allowed else None
    return {
        "verse_key": target["verse_key"],
        "word_index": target["word_index"],
        "canonical_text": target["canonical_text"],
        "context_before": context_before,
        "context_after": context_after,
        "candidate_count_before_grouping": target["candidate_count_unique"],
        "candidate_count_after_grouping": len(clusters),
        "equivalent_candidates_collapsed": target["candidate_count_unique"] - len(clusters),
        "normalization": {
            "exact_has_analysis": target["exact_has_analysis"],
            "normalized_has_analysis": target["normalized_has_analysis"],
            "normalization_sensitive": target["normalization_sensitive"],
            "forms": [{
                "form_id": form["form_id"], "form": form["form"], "profiles": form["profiles"], "candidate_count": form["candidate_count"]
            } for form in target["analysis_forms"]],
        },
        "equivalence_clusters": clusters,
        "top_score": top_score,
        "second_score": second_score,
        "margin": margin,
        "shortlist_cluster_count": sum(cluster["total_score"] >= top_score - 9 for cluster in clusters) if clusters else 0,
        "confidence_class": confidence,
        "normalization_sensitive": target["normalization_sensitive"],
        "top_flags": clusters[0]["representative_flags"] if clusters else None,
        "selection_blocked_reason": blocked_reason,
        "selected_equivalence_key_sha256": selected_cluster["equivalence_key_sha256"] if selected_cluster else None,
        "selected_candidate": selected_cluster["representative"] if selected_cluster else None,
        "automatic_selection": selected_cluster is not None,
        "provenance": {
            "policy_version": "v2.1",
            "candidate_source": "Camel Morph MSA v1.0 frozen full-analysis unique_candidates",
            "eval_set_sha256": common.v2_common.EXPECTED_EVAL_SHA256,
            "legacy_used_for_ranking": False,
            "v1_choices_used_for_ranking": False,
            "v2_choices_used_for_ranking": False,
            "mle_disambiguator_used": False,
            "oov_guessed": False,
            "global_same_surface_forcing": False,
        },
    }


def rank_all(eval_records: list[dict], full_manifest: dict) -> list[dict]:
    grouped: dict[int, list[dict]] = defaultdict(list)
    for record in eval_records:
        grouped[int(record["verse_key"].split(":", 1)[0])].append(record)
    shard_by_surah = {entry["surah"]: entry for entry in full_manifest["shards"]}
    ranked: list[dict] = []
    for surah in sorted(grouped):
        required = set()
        for record in grouped[surah]:
            required.add(common.identity(record))
            required.update(common.identity(item) for item in record["context_before"][-3:] + record["context_after"][:3])
        loaded: dict[str, dict] = {}
        entry = shard_by_surah[surah]
        with gzip.open(common.FULL_DIR / entry["filename"], "rt", encoding="utf-8", newline="") as handle:
            for line in handle:
                item = json.loads(line)
                key = common.identity(item)
                if key in required:
                    loaded[key] = item
        missing = required - loaded.keys()
        if missing:
            raise ValueError(f"Missing target/context records in surah {surah}: {sorted(missing)[:3]}")
        ranked.extend(rank_record(record, loaded[common.identity(record)], loaded) for record in grouped[surah])
    return sorted(ranked, key=common.identity_sort)


def margin_distribution(margins: list[int]) -> dict:
    if not margins:
        return {"count": 0}
    ordered = sorted(margins)
    def quantile(fraction: float) -> int:
        return ordered[min(len(ordered) - 1, int(fraction * len(ordered)))]
    return {
        "count": len(ordered),
        "min": ordered[0],
        "p25": quantile(0.25),
        "p50": quantile(0.50),
        "p75": quantile(0.75),
        "p90": quantile(0.90),
        "max": ordered[-1],
        "at_or_above_threshold": {str(t): sum(m >= t for m in ordered) for t in CANDIDATE_HIGH_THRESHOLDS},
    }


def build_summary(ranked: list[dict]) -> dict:
    classes = Counter(record["confidence_class"] for record in ranked)
    selected = [record for record in ranked if record["automatic_selection"]]
    blocked = Counter(record["selection_blocked_reason"] for record in ranked if record["selection_blocked_reason"])
    raw_total = sum(record["candidate_count_before_grouping"] for record in ranked)
    grouped_total = sum(record["candidate_count_after_grouping"] for record in ranked)

    def counter_block(records: list[dict], pick) -> dict:
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

    echo_selected_with_alternatives = sum(
        1 for record in selected
        if record["top_flags"] and record["top_flags"]["echo"] and record["candidate_count_after_grouping"] > 1
    )
    echo_selected = sum(1 for record in selected if record["top_flags"] and record["top_flags"]["echo"])
    high_records = [record for record in ranked if record["confidence_class"] == "HIGH_CONFIDENCE"]
    high_echo_top = sum(1 for record in high_records if record["top_flags"]["echo"])

    # Margin distributions after the echo fix (echo-top and OOV rows carry no margin here).
    eligible_margins = [
        record["margin"] for record in ranked
        if record["margin"] is not None
        and record["confidence_class"] in {"HIGH_CONFIDENCE", "MEDIUM_CONFIDENCE", "LOW_CONFIDENCE"}
    ]
    selectable_margins = [
        record["margin"] for record in ranked
        if record["margin"] is not None and record["confidence_class"] == "HIGH_CONFIDENCE"
        and record["automatic_selection"]
    ]
    return {
        "schema_version": "camel-contextual-disambiguation-v2.1-ranker-summary-v1",
        "status": "frozen_before_v2_and_legacy_comparison",
        "candidate_only": True,
        "production_approved": False,
        "words_processed": len(ranked),
        "confidence_classes": dict(sorted(classes.items())),
        "automatic_selection": {
            "total": len(selected),
            "unique_equivalence_cluster": sum(record["confidence_class"] == "UNIQUE_EQUIVALENCE_CLUSTER" for record in selected),
            "high_confidence": sum(record["confidence_class"] == "HIGH_CONFIDENCE" for record in selected),
            "percent_all_words": round(100 * len(selected) / len(ranked), 4),
        },
        "selection_blocked_reasons": dict(sorted(blocked.items())),
        "equivalence_grouping": {
            "candidate_count_before": raw_total,
            "cluster_count_after": grouped_total,
            "candidates_collapsed": raw_total - grouped_total,
            "raw_candidates_retained": True,
        },
        "foreign_ntws_counters": {
            "top_cluster": counter_block(ranked, lambda record: record["equivalence_clusters"][0]["representative"] if record["equivalence_clusters"] else None),
            "automatic_selected": counter_block(selected, lambda record: record["selected_candidate"]),
        },
        "echo_metrics": {
            "echo_selected_total": echo_selected,
            "echo_selected_with_alternatives": echo_selected_with_alternatives,
            "high_confidence_echo_top": high_echo_top,
            "no_usable_analysis_words": classes.get("NO_USABLE_ANALYSIS", 0),
            "echo_top_unresolved_words": classes.get("ECHO_TOP_UNRESOLVED", 0),
        },
        "margin_distribution_after_echo_fix": {
            "note": "Diagnostic only. Threshold 18 is NOT auto-approved; no production threshold is set without independent gold adjudication.",
            "all_margin_classes": margin_distribution(eligible_margins),
            "high_confidence_auto_selected": margin_distribution(selectable_margins),
            "candidate_thresholds_for_review": list(CANDIDATE_HIGH_THRESHOLDS),
        },
        "policies": {
            "echo": "lex==diac==canonical with root=FOREIGN/pos=foreign is never trusted and never auto-selected; echo-only words are NO_USABLE_ANALYSIS",
            "foreign_ntws": "trusted (score 0) only with exact canonical-diac or exact reconstruction evidence; never auto-selected while alternative clusters exist",
            "abbrev": "abbreviation tops are tagged and never auto-selected",
            "legacy": "not read during ranking or weight choice",
            "v1_v2_choices": "not read during ranking",
            "oov": "NO_ANALYSIS preserved; no guess or recovery analyzer",
            "high_threshold": "margin>=18 retained for classification only; candidate thresholds reported for gold review",
        },
    }


def ranked_stream_sha256(ranked: list[dict]) -> str:
    digest = hashlib.sha256()
    for record in ranked:
        digest.update(common.json_bytes(record))
    return digest.hexdigest()


def run(args: argparse.Namespace) -> dict:
    frozen_state = common.capture_all_frozen()
    full_manifest = common.v2_common.v1_common.validate_full_inputs(check_shard_hashes=True)
    if common.sha256_file(common.EVAL_SET) != common.v2_common.EXPECTED_EVAL_SHA256:
        raise ValueError("Frozen 1,000-word eval set SHA-256 mismatch")
    eval_records = list(common.read_jsonl(common.EVAL_SET))
    if len(eval_records) != 1_000 or sum(record["no_analysis"] for record in eval_records) != 50:
        raise ValueError("Frozen eval count or OOV quota mismatch")
    ranked = rank_all(eval_records, full_manifest)
    if len(ranked) != 1_000:
        raise ValueError("V2.1 ranked output must contain exactly 1,000 words")

    if args.verify_determinism:
        recomputed = ranked_stream_sha256(ranked)
        on_disk = common.sha256_file(common.V21_RANKED)
        if recomputed != on_disk:
            raise ValueError(f"Determinism check failed: rerun {recomputed} != file {on_disk}")
        common.assert_state_unchanged(frozen_state)
        return {"status": "determinism_verified", "ranked_sha256": on_disk}

    common.write_jsonl_atomic(common.V21_RANKED, ranked)
    summary = build_summary(ranked)
    common.write_json_atomic(common.RANKER_REPORT, summary)
    manifest = {
        "schema_version": "camel-contextual-disambiguation-v2.1-run-manifest-v1",
        "freeze_status": "frozen_before_v2_and_legacy_comparison",
        "inputs": {
            "eval_set": {"sha256": common.v2_common.EXPECTED_EVAL_SHA256, "records": 1_000},
            "full_run_manifest_sha256": common.v2_common.v1_common.EXPECTED_RUN_MANIFEST_SHA256,
            "token_map_sha256": common.v2_common.v1_common.EXPECTED_TOKEN_SHA256,
            "camel_morph_db_sha256": common.v2_common.v1_common.EXPECTED_DB_SHA256,
        },
        "frozen_ranker_outputs": {
            "ranked_eval_set": {
                "sha256": common.sha256_file(common.V21_RANKED),
                "bytes": common.V21_RANKED.stat().st_size,
                "records": 1_000,
            },
            "ranker_summary": {
                "sha256": common.sha256_file(common.RANKER_REPORT),
                "bytes": common.RANKER_REPORT.stat().st_size,
            },
        },
        "scripts": {
            "ranker_sha256": common.sha256_file(Path(__file__).resolve()),
            "v21_common_sha256": common.sha256_file(Path(common.__file__).resolve()),
            "v2_base_sha256": common.sha256_file(Path(v2base.__file__).resolve()),
        },
        "scoring_weights": WEIGHTS,
        "confidence_thresholds": THRESHOLDS,
        "upstream_frozen_state": frozen_state,
        "safety": {
            "legacy_read_during_ranking": False,
            "v1_choices_read_during_ranking": False,
            "v2_choices_read_during_ranking": False,
            "oov_guessed": False,
            "full_77429_selection_run": False,
            "candidate_db_modified": False,
            "production_modified": False,
            "frozen_v1_v2_artifacts_modified": False,
        },
    }
    common.write_json_atomic(common.V21_MANIFEST, manifest)
    common.assert_state_unchanged(frozen_state)
    return {
        "status": "completed_and_frozen",
        "ranked_records": len(ranked),
        "ranked_sha256": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
        "confidence_classes": summary["confidence_classes"],
        "automatic_selection": summary["automatic_selection"],
        "echo_metrics": summary["echo_metrics"],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-determinism", action="store_true",
                        help="Re-rank in memory and compare the stream hash against the frozen output file")
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
