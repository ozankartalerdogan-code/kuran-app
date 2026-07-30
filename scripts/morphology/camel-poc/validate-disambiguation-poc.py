#!/usr/bin/env python3
"""Validate frozen contextual disambiguation PoC artifacts without reranking."""

from __future__ import annotations

import json
from collections import Counter

import disambiguation_common as common


REQUIRED_COMPONENTS = {
    "surface_diacritics",
    "analysis_form_origin",
    "lemma_surface_similarity",
    "prefix_stem_suffix_reconstruction",
    "proclitic_enclitic_surface",
    "verb_person_gender_number",
    "verb_aspect_mood_voice",
    "post_preposition_case",
    "article_definiteness",
    "idafa_context",
    "pronoun_enclitic_agreement",
    "neighbor_pos_sequence",
    "near_surface_consistency",
}


def validate() -> dict:
    common.validate_full_inputs(check_shard_hashes=False)
    manifest = common.load_json(common.EVAL_MANIFEST)
    frozen = manifest.get("frozen_ranker_outputs")
    if not frozen or frozen.get("status") != "frozen_before_legacy_comparison":
        raise ValueError("Ranker outputs are not frozen")
    hashes = {
        common.EVAL_SET: manifest["eval_set"]["sha256"],
        common.RANKED_SET: frozen["ranked_eval_set"]["sha256"],
        common.OOV_RECOVERY: frozen["oov_recovery"]["sha256"],
    }
    for path, expected in hashes.items():
        if common.sha256_file(path) != expected:
            raise ValueError(f"Frozen hash mismatch: {path.name}")

    eval_records = list(common.read_jsonl(common.EVAL_SET))
    ranked = list(common.read_jsonl(common.RANKED_SET))
    oov = list(common.read_jsonl(common.OOV_RECOVERY))
    if len(eval_records) != 1_000 or len(ranked) != 1_000 or len(oov) != 50:
        raise ValueError("PoC record count mismatch")
    if [common.identity(record) for record in eval_records] != [common.identity(record) for record in ranked]:
        raise ValueError("Eval/ranked identity sequence mismatch")

    classes = Counter()
    selected = 0
    for eval_record, record in zip(eval_records, ranked, strict=True):
        if record["canonical_text"] != eval_record["canonical_text"]:
            raise ValueError(f"Canonical text mismatch: {common.identity(record)}")
        if len(record["context_before"]) > 3 or len(record["context_after"]) > 3:
            raise ValueError(f"Context window exceeds three words: {common.identity(record)}")
        if record["candidate_count"] != len(record["ranked_candidates"]):
            raise ValueError(f"Candidate count mismatch: {common.identity(record)}")
        expected_order = sorted(record["ranked_candidates"], key=lambda item: (-item["total_score"], item["candidate_signature_sha256"]))
        if [item["candidate_signature_sha256"] for item in record["ranked_candidates"]] != [item["candidate_signature_sha256"] for item in expected_order]:
            # Equal-score ordering is defined by full candidate signature; hashes are a compact secondary audit only.
            tied_scores = [item["total_score"] for item in record["ranked_candidates"]]
            if tied_scores != sorted(tied_scores, reverse=True):
                raise ValueError(f"Candidate score ordering mismatch: {common.identity(record)}")
        for index, item in enumerate(record["ranked_candidates"], start=1):
            if item["rank"] != index or item["total_score"] != sum(part["score"] for part in item["score_components"]):
                raise ValueError(f"Rank or score sum mismatch: {common.identity(record)}")
            if {part["rule"] for part in item["score_components"]} != REQUIRED_COMPONENTS:
                raise ValueError(f"Score component set mismatch: {common.identity(record)}")
        if record["ranked_candidates"]:
            top = record["ranked_candidates"][0]["total_score"]
            second = record["ranked_candidates"][1]["total_score"] if len(record["ranked_candidates"]) > 1 else None
            margin = top - second if second is not None else None
            if record["top_score"] != top or record["second_score"] != second or record["margin"] != margin:
                raise ValueError(f"Top/second/margin mismatch: {common.identity(record)}")
        if record["selected_candidate"] is not None:
            selected += 1
            if record["confidence_class"] not in {"UNIQUE_INPUT", "HIGH_CONFIDENCE"}:
                raise ValueError(f"Unsafe automatic selection class: {common.identity(record)}")
            if record["confidence_class"] == "HIGH_CONFIDENCE" and record["margin"] < 20:
                raise ValueError(f"High-confidence margin below threshold: {common.identity(record)}")
        if record["provenance"]["legacy_used_for_ranking"] or record["provenance"]["mle_disambiguator_used"]:
            raise ValueError(f"Forbidden ranking provenance: {common.identity(record)}")
        classes[record["confidence_class"]] += 1

    zero_attempts = 0
    for record in oov:
        if record["selected_candidate"] is not None or record["provenance"]["legacy_used"] or record["provenance"]["network_used"]:
            raise ValueError(f"Unsafe OOV output: {common.identity(record)}")
        if not record["attempted_forms"]:
            zero_attempts += 1
        for form in record["attempted_forms"]:
            if not form["normalization_trace"] or form["candidate_count"] != len(form["candidates"]):
                raise ValueError(f"OOV trace/count mismatch: {common.identity(record)}")
            if form["false_surface_expansion_risk"] not in {"low", "medium", "high"}:
                raise ValueError(f"OOV risk class mismatch: {common.identity(record)}")

    legacy_report = common.load_json(common.VS_LEGACY)
    summary = common.load_json(common.POC_SUMMARY)
    if legacy_report["legacy_used_to_select_repair_rescore_or_fill"] is not False:
        raise ValueError("Legacy comparison safety flag mismatch")
    if summary["words_processed"] != 1_000 or summary["full_77429_contextual_selection_allowed"] is not False:
        raise ValueError("Final PoC summary decision mismatch")
    if summary["automatic_selected"] != selected or summary["confidence_classes"] != dict(sorted(classes.items())):
        raise ValueError("Final PoC summary ranking counts mismatch")
    tmp_files = list(common.DISAMBIG_DIR.glob("*.tmp")) + list(common.REPORT_DIR.glob("disambiguation*.tmp"))
    if tmp_files:
        raise ValueError(f"Temporary files remain: {[path.name for path in tmp_files]}")
    return {
        "status": "valid",
        "eval_records": len(eval_records),
        "ranked_records": len(ranked),
        "oov_records": len(oov),
        "oov_records_without_safe_novel_form": zero_attempts,
        "automatic_selected": selected,
        "confidence_classes": dict(sorted(classes.items())),
        "ranked_sha256": common.sha256_file(common.RANKED_SET),
        "legacy_report_sha256": common.sha256_file(common.VS_LEGACY),
        "summary_sha256": common.sha256_file(common.POC_SUMMARY),
    }


if __name__ == "__main__":
    print(json.dumps(validate(), ensure_ascii=True, sort_keys=True))
