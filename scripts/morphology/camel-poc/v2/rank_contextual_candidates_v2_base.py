#!/usr/bin/env python3
"""Rank the frozen 1,000-word set with legacy-blind, equivalence-aware v2 rules."""

from __future__ import annotations

import argparse
import difflib
import gzip
import json
from collections import Counter, defaultdict
from pathlib import Path

import v2_common as common


UNINFORMATIVE = {None, "", "0", "na"}
PROCLITIC_FIELDS = ("prc3", "prc2", "prc1.5", "prc1", "prc0")
PRONOUN_SUFFIXES = ("كما", "هما", "كم", "كن", "هم", "هن", "ها", "نا", "ه", "ك", "ي")
WEIGHTS = {
    "canonical_diacritics_exact": 40,
    "canonical_diacritics_close": 20,
    "canonical_diacritics_partial": 8,
    "canonical_diacritics_conflict": -15,
    "exact_form_origin": 6,
    "normalized_form_origin": 1,
    "surface_reconstruction_exact": 30,
    "surface_reconstruction_close": 14,
    "surface_reconstruction_conflict": -18,
    "prefix_stem_suffix_exact": 20,
    "prefix_stem_suffix_close": 8,
    "prefix_stem_suffix_conflict": -15,
    "lemma_similarity_max": 8,
    "foreign_explicit_evidence": 2,
    "foreign_without_evidence": -30,
    "clitic_surface_match": 6,
    "clitic_surface_conflict": -10,
    "verb_feature_complete": 2,
    "verb_feature_conflict": -3,
    "post_preposition_genitive": 3,
    "post_preposition_conflict": -3,
    "article_state_match": 4,
    "article_state_conflict": -6,
    "neighbor_pos_plausible": 1,
    "neighbor_pos_implausible": -1,
    "local_surface_support": 1,
}
THRESHOLDS = {
    "top_tie_margin": 0,
    "high_confidence_min_margin": 18,
    "medium_confidence_min_margin": 8,
}
RULES = (
    "canonical_diacritic_alignment",
    "analysis_form_origin",
    "surface_reconstruction",
    "prefix_stem_suffix_alignment",
    "lemma_surface_similarity",
    "foreign_ntws_guard",
    "clitic_surface_alignment",
    "verb_feature_completeness",
    "post_preposition_case",
    "article_definiteness",
    "neighbor_pos_weak",
    "local_surface_support",
)


def component(rule: str, score: int, evidence: str) -> dict:
    return {"rule": rule, "score": int(score), "evidence": evidence}


def similarity(left: str, right: str) -> float:
    return difflib.SequenceMatcher(None, left or "", right or "").ratio()


def compact_segment(value: str) -> str:
    return str(value or "").replace("+_", "").replace("_+", "").replace("+", "").replace("_", "")


def candidate_origins(record: dict) -> dict[str, dict[str, set[str]]]:
    origins: dict[str, dict[str, set[str]]] = defaultdict(lambda: {"forms": set(), "profiles": set()})
    for form in record["analysis_forms"]:
        for candidate in form["candidates"]:
            origin = origins[common.candidate_signature(candidate)]
            origin["forms"].add(form["form_id"])
            origin["profiles"].update(form["profiles"])
    return origins


def possible_pos(record: dict | None) -> set[str]:
    if record is None:
        return set()
    return {common.coarse_pos(candidate.get("pos")) for candidate in record.get("unique_candidates", [])}


def has_preposition(record: dict | None) -> bool:
    if record is None:
        return False
    return any(
        candidate.get("pos") == "prep"
        or any("prep" in str(candidate.get(field, "")).lower() for field in PROCLITIC_FIELDS)
        for candidate in record.get("unique_candidates", [])
    )


def is_foreign_or_ntws(candidate: dict) -> bool:
    markers = "|".join(str(candidate.get(field) or "") for field in ("root", "lex", "stem", "stemcat", "source"))
    upper = markers.upper()
    return "FOREIGN" in upper or "NTWS" in upper


def score_candidate(target: dict, candidate: dict, origin: dict[str, set[str]], neighbors: list[dict | None]) -> list[dict]:
    previous = neighbors[2]
    canonical = target["canonical_text"]
    canonical_diac = common.clean_diacritics(canonical)
    candidate_diac = common.clean_diacritics(str(candidate.get("diac") or ""))
    canonical_plain = common.strip_marks(canonical)
    candidate_plain = common.strip_marks(str(candidate.get("diac") or ""))
    lemma_raw = str(candidate.get("lex") or candidate.get("stem") or "")
    lemma_normalized = common.normalize_lemma(lemma_raw)
    pos = common.coarse_pos(candidate.get("pos"))
    parts: list[dict] = []

    diac_ratio = similarity(canonical_diac, candidate_diac)
    if canonical_diac and canonical_diac == candidate_diac:
        diac_score = WEIGHTS["canonical_diacritics_exact"]
        diac_evidence = "canonical vocalization equals CAMeL diac after only Qur'anic-mark/wasl cleanup"
    elif diac_ratio >= 0.90:
        diac_score = WEIGHTS["canonical_diacritics_close"]
        diac_evidence = f"canonical vocalization similarity={diac_ratio:.3f}"
    elif diac_ratio >= 0.80:
        diac_score = WEIGHTS["canonical_diacritics_partial"]
        diac_evidence = f"partial canonical vocalization similarity={diac_ratio:.3f}"
    else:
        diac_score = WEIGHTS["canonical_diacritics_conflict"] if candidate_diac else 0
        diac_evidence = f"canonical vocalization conflict similarity={diac_ratio:.3f}"
    parts.append(component("canonical_diacritic_alignment", diac_score, diac_evidence))

    exact_origin = "exact" in origin["forms"]
    parts.append(component(
        "analysis_form_origin",
        WEIGHTS["exact_form_origin"] if exact_origin else WEIGHTS["normalized_form_origin"],
        "candidate is present in exact canonical-form analysis" if exact_origin else "candidate is present only in shadow-normalized analysis",
    ))

    reconstructed_diac = common.clean_diacritics(compact_segment(candidate.get("d3seg") or candidate.get("atbseg") or candidate.get("diac")))
    reconstructed_plain = common.strip_marks(reconstructed_diac)
    reconstruction_ratio = similarity(canonical_diac, reconstructed_diac)
    if reconstructed_diac and reconstructed_diac == canonical_diac:
        reconstruction_score = WEIGHTS["surface_reconstruction_exact"]
    elif reconstruction_ratio >= 0.88:
        reconstruction_score = WEIGHTS["surface_reconstruction_close"]
    elif reconstruction_ratio < 0.65:
        reconstruction_score = WEIGHTS["surface_reconstruction_conflict"]
    else:
        reconstruction_score = 0
    parts.append(component(
        "surface_reconstruction",
        reconstruction_score,
        f"d3/ATB reconstruction vs canonical diacritics similarity={reconstruction_ratio:.3f}",
    ))

    plain_ratio = similarity(canonical_plain, reconstructed_plain or candidate_plain)
    declared_prefixes = [str(candidate.get(field) or "0") for field in PROCLITIC_FIELDS]
    declared_suffixes = [str(candidate.get(field) or "0") for field in ("enc0", "enc1", "enc2")]
    has_declared_clitic = any(value not in {"", "0", "na"} for value in declared_prefixes + declared_suffixes)
    if reconstructed_plain and reconstructed_plain == canonical_plain:
        structure_score = WEIGHTS["prefix_stem_suffix_exact"]
    elif plain_ratio >= 0.88:
        structure_score = WEIGHTS["prefix_stem_suffix_close"]
    elif plain_ratio < 0.65:
        structure_score = WEIGHTS["prefix_stem_suffix_conflict"]
    else:
        structure_score = 0
    parts.append(component(
        "prefix_stem_suffix_alignment",
        structure_score,
        f"prefix/stem/suffix reconstruction similarity={plain_ratio:.3f}; declared_clitic={has_declared_clitic}",
    ))

    lemma_ratio = similarity(canonical_plain, lemma_normalized)
    lemma_score = WEIGHTS["lemma_similarity_max"] if lemma_normalized and (
        lemma_normalized in canonical_plain or canonical_plain.endswith(lemma_normalized)
    ) else round(WEIGHTS["lemma_similarity_max"] * lemma_ratio)
    parts.append(component(
        "lemma_surface_similarity",
        lemma_score,
        f"raw_lemma={lemma_raw!r}; normalized_lemma={lemma_normalized!r}; plain similarity={lemma_ratio:.3f}",
    ))

    foreign = is_foreign_or_ntws(candidate)
    explicit_foreign_evidence = foreign and exact_origin and canonical_diac == candidate_diac and reconstructed_diac == canonical_diac
    foreign_score = WEIGHTS["foreign_explicit_evidence"] if explicit_foreign_evidence else WEIGHTS["foreign_without_evidence"] if foreign else 0
    parts.append(component(
        "foreign_ntws_guard",
        foreign_score,
        "FOREIGN/NTWS candidate has exact canonical and reconstruction evidence" if explicit_foreign_evidence else "FOREIGN/NTWS lacks exact evidence" if foreign else "candidate is not FOREIGN/NTWS",
    ))

    article_candidate = "det" in declared_prefixes[-1].lower()
    article_surface = canonical_plain.startswith("ال") or "ال" in canonical_plain[:4]
    enc0 = str(candidate.get("enc0") or "0")
    suffix_match = enc0 in {"", "0", "na"} or any(canonical_plain.endswith(suffix) for suffix in PRONOUN_SUFFIXES)
    if has_declared_clitic and reconstructed_plain == canonical_plain and suffix_match:
        clitic_score = WEIGHTS["clitic_surface_match"]
    elif article_candidate != article_surface or not suffix_match:
        clitic_score = WEIGHTS["clitic_surface_conflict"]
    else:
        clitic_score = 0
    parts.append(component(
        "clitic_surface_alignment",
        clitic_score,
        f"article_surface={article_surface}; article_candidate={article_candidate}; suffix_match={suffix_match}",
    ))

    if pos == "verb":
        complete = all(candidate.get(field) not in UNINFORMATIVE for field in ("per", "gen", "num", "asp", "vox"))
        verb_score = WEIGHTS["verb_feature_complete"] if complete else WEIGHTS["verb_feature_conflict"]
        verb_evidence = f"verb features per/gen/num/asp/vox={candidate.get('per')}/{candidate.get('gen')}/{candidate.get('num')}/{candidate.get('asp')}/{candidate.get('vox')}"
    else:
        verb_score = 0
        verb_evidence = "not a verb candidate"
    parts.append(component("verb_feature_completeness", verb_score, verb_evidence))

    if has_preposition(previous) and pos in {"noun", "proper_noun", "pronoun"}:
        case_ok = candidate.get("cas") == "g" or pos == "pronoun"
        case_score = WEIGHTS["post_preposition_genitive"] if case_ok else WEIGHTS["post_preposition_conflict"]
        case_evidence = f"previous token permits preposition; case={candidate.get('cas')}"
    else:
        case_score = 0
        case_evidence = "no decisive preceding-preposition evidence"
    parts.append(component("post_preposition_case", case_score, case_evidence))

    state = candidate.get("stt")
    if article_surface and article_candidate and state == "d":
        article_score = WEIGHTS["article_state_match"]
    elif article_surface != article_candidate or (article_candidate and state != "d"):
        article_score = WEIGHTS["article_state_conflict"]
    else:
        article_score = 0
    parts.append(component("article_definiteness", article_score, f"surface_article={article_surface}; candidate_article={article_candidate}; state={state}"))

    if has_preposition(previous):
        plausible = pos in {"noun", "proper_noun", "pronoun"}
        neighbor_score = WEIGHTS["neighbor_pos_plausible"] if plausible else WEIGHTS["neighbor_pos_implausible"]
        neighbor_evidence = f"weak preposition/POS compatibility signal; current POS={pos}"
    else:
        neighbor_score = 0
        neighbor_evidence = f"no weak neighbor-POS signal; current POS={pos}"
    parts.append(component("neighbor_pos_weak", neighbor_score, neighbor_evidence))

    candidate_key = (common.normalize_root(candidate.get("root")), common.normalize_lemma(candidate.get("lex")), pos)
    local_support = False
    for neighbor in (item for item in neighbors if item is not None):
        if common.strip_marks(neighbor["canonical_text"]) != canonical_plain:
            continue
        local_support = any(
            (common.normalize_root(other.get("root")), common.normalize_lemma(other.get("lex")), common.coarse_pos(other.get("pos"))) == candidate_key
            for other in neighbor.get("unique_candidates", [])
        )
        if local_support:
            break
    parts.append(component(
        "local_surface_support",
        WEIGHTS["local_surface_support"] if local_support else 0,
        "same surface in the local ±3-token context permits this analysis" if local_support else "no local same-surface support; no corpus-wide forcing",
    ))
    return parts


def group_candidates(target: dict, neighbors: list[dict | None]) -> list[dict]:
    origins = candidate_origins(target)
    grouped: dict[str, dict] = {}
    for candidate in target["unique_candidates"]:
        signature = common.candidate_signature(candidate)
        origin = origins[signature]
        parts = score_candidate(target, candidate, origin, neighbors)
        payload = common.equivalence_payload(candidate)
        payload_serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        member = {
            "candidate_signature_sha256": common.stable_digest(signature, "candidate-signature-v2"),
            "raw_lemma": candidate.get("lex"),
            "normalized_lemma": common.normalize_lemma(candidate.get("lex")),
            "candidate": candidate,
            "source_forms": sorted(origin["forms"]),
            "source_profiles": sorted(origin["profiles"]),
            "score_components": parts,
            "total_score": sum(part["score"] for part in parts),
            "_signature": signature,
        }
        bucket = grouped.setdefault(payload_serialized, {"payload": payload, "members": []})
        bucket["members"].append(member)

    clusters = []
    for payload_serialized, bucket in grouped.items():
        members = sorted(bucket["members"], key=lambda item: (-item["total_score"], item["_signature"]))
        representative = members[0]
        for member in members:
            member.pop("_signature")
        clusters.append({
            "equivalence_key_sha256": common.stable_digest(payload_serialized, "morph-equivalence-v2"),
            "equivalence_key": bucket["payload"],
            "raw_candidate_count": len(members),
            "representative": representative["candidate"],
            "representative_raw_lemma": representative["raw_lemma"],
            "representative_normalized_lemma": representative["normalized_lemma"],
            "score_components": representative["score_components"],
            "total_score": representative["total_score"],
            "member_score_min": min(member["total_score"] for member in members),
            "member_score_max": max(member["total_score"] for member in members),
            "raw_candidates": members,
            "_tie": payload_serialized,
        })
    clusters.sort(key=lambda item: (-item["total_score"], item["_tie"]))
    for index, cluster in enumerate(clusters, start=1):
        cluster["rank"] = index
        cluster.pop("_tie")
    return clusters


def top_has_rule_conflict(top: dict) -> bool:
    scores = {part["rule"]: part["score"] for part in top["score_components"]}
    strong_positive = any(scores.get(rule, 0) >= 20 for rule in (
        "canonical_diacritic_alignment", "surface_reconstruction", "prefix_stem_suffix_alignment"
    ))
    structural_negative = any(scores.get(rule, 0) <= -15 for rule in (
        "canonical_diacritic_alignment", "surface_reconstruction", "prefix_stem_suffix_alignment", "foreign_ntws_guard"
    ))
    return strong_positive and structural_negative


def classify(clusters: list[dict]) -> tuple[str, int | None, int | None, int | None]:
    if not clusters:
        return "NO_ANALYSIS", None, None, None
    top_score = clusters[0]["total_score"]
    second_score = clusters[1]["total_score"] if len(clusters) > 1 else None
    margin = top_score - second_score if second_score is not None else None
    if len(clusters) == 1:
        return "UNIQUE_EQUIVALENCE_CLUSTER", top_score, second_score, margin
    if margin == THRESHOLDS["top_tie_margin"]:
        return "TOP_TIE", top_score, second_score, margin
    if top_has_rule_conflict(clusters[0]):
        return "RULE_CONFLICT", top_score, second_score, margin
    if margin >= THRESHOLDS["high_confidence_min_margin"]:
        return "HIGH_CONFIDENCE", top_score, second_score, margin
    if margin >= THRESHOLDS["medium_confidence_min_margin"]:
        return "MEDIUM_CONFIDENCE", top_score, second_score, margin
    return "LOW_CONFIDENCE", top_score, second_score, margin


def rank_record(eval_record: dict, target: dict, loaded: dict[str, dict]) -> dict:
    context_before = eval_record["context_before"][-3:]
    context_after = eval_record["context_after"][:3]
    before = [loaded.get(common.identity(item)) for item in context_before]
    after = [loaded.get(common.identity(item)) for item in context_after]
    neighbors = [None] * (3 - len(before)) + before + after + [None] * (3 - len(after))
    clusters = group_candidates(target, neighbors) if target["candidate_count_unique"] else []
    confidence, top_score, second_score, margin = classify(clusters)
    selected_cluster = clusters[0] if confidence in {"UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"} else None
    selected_candidate = selected_cluster["representative"] if selected_cluster else None
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
            "lemma_policy": "raw lex is preserved; comparison form removes lex suffix, marks, non-Arabic separators, and folds alif/wasl/maqsurah",
        },
        "equivalence_clusters": clusters,
        "top_score": top_score,
        "second_score": second_score,
        "margin": margin,
        "shortlist_cluster_count": sum(cluster["total_score"] >= top_score - 9 for cluster in clusters) if clusters else 0,
        "confidence_class": confidence,
        "normalization_sensitive": target["normalization_sensitive"],
        "selected_equivalence_key_sha256": selected_cluster["equivalence_key_sha256"] if selected_cluster else None,
        "selected_candidate": selected_candidate,
        "automatic_selection": selected_candidate is not None,
        "provenance": {
            "candidate_source": "Camel Morph MSA v1.0 frozen full-analysis unique_candidates",
            "eval_set_sha256": common.EXPECTED_EVAL_SHA256,
            "full_run_manifest_sha256": common.v1_common.EXPECTED_RUN_MANIFEST_SHA256,
            "legacy_used_for_ranking": False,
            "v1_choices_used_for_ranking": False,
            "mle_disambiguator_used": False,
            "oov_guessed": False,
            "global_same_surface_forcing": False,
        },
    }


def load_required_records(eval_records: list[dict], full_manifest: dict) -> list[dict]:
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


def confidence_without_rule(record: dict, rule: str) -> tuple[str, str | None]:
    clusters = []
    for cluster in record["equivalence_clusters"]:
        score = cluster["total_score"] - next(part["score"] for part in cluster["score_components"] if part["rule"] == rule)
        clusters.append({**cluster, "total_score": score})
    clusters.sort(key=lambda item: (-item["total_score"], item["equivalence_key_sha256"]))
    confidence, _, _, _ = classify(clusters)
    selected = clusters[0]["equivalence_key_sha256"] if confidence in {"UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"} else None
    return confidence, selected


def rule_impact(ranked: list[dict]) -> dict:
    result = {}
    for rule in RULES:
        nonzero = positive = negative = absolute_points = top_changed = confidence_changed = selection_changed = 0
        for record in ranked:
            clusters = record["equivalence_clusters"]
            for cluster in clusters:
                value = next(part["score"] for part in cluster["score_components"] if part["rule"] == rule)
                nonzero += value != 0
                positive += value > 0
                negative += value < 0
                absolute_points += abs(value)
            if len(clusters) < 2:
                continue
            original_top = clusters[0]["equivalence_key_sha256"]
            adjusted = sorted(
                clusters,
                key=lambda cluster: (
                    -(cluster["total_score"] - next(part["score"] for part in cluster["score_components"] if part["rule"] == rule)),
                    cluster["equivalence_key_sha256"],
                ),
            )
            top_changed += adjusted[0]["equivalence_key_sha256"] != original_top
            without_confidence, without_selected = confidence_without_rule(record, rule)
            confidence_changed += without_confidence != record["confidence_class"]
            selection_changed += without_selected != record["selected_equivalence_key_sha256"]
        result[rule] = {
            "candidate_clusters_with_nonzero_score": nonzero,
            "positive_cluster_scores": positive,
            "negative_cluster_scores": negative,
            "total_absolute_score_points": absolute_points,
            "top_choice_changed_without_rule": top_changed,
            "confidence_changed_without_rule": confidence_changed,
            "automatic_selection_changed_without_rule": selection_changed,
        }
    return result


def build_summary(ranked: list[dict]) -> dict:
    classes = Counter(record["confidence_class"] for record in ranked)
    selected = [record for record in ranked if record["automatic_selection"]]
    raw_total = sum(record["candidate_count_before_grouping"] for record in ranked)
    grouped_total = sum(record["candidate_count_after_grouping"] for record in ranked)
    analyzed = [record for record in ranked if record["candidate_count_before_grouping"] > 0]
    return {
        "schema_version": "camel-contextual-disambiguation-v2-ranker-summary-v1",
        "status": "frozen_before_v1_and_legacy_comparison",
        "candidate_only": True,
        "production_approved": False,
        "words_processed": len(ranked),
        "oov_words": sum(record["confidence_class"] == "NO_ANALYSIS" for record in ranked),
        "oov_guessed_or_filled": 0,
        "confidence_classes": dict(sorted(classes.items())),
        "automatic_selection": {
            "total": len(selected),
            "unique_equivalence_cluster": sum(record["confidence_class"] == "UNIQUE_EQUIVALENCE_CLUSTER" for record in selected),
            "high_confidence": sum(record["confidence_class"] == "HIGH_CONFIDENCE" for record in selected),
            "medium_confidence": sum(record["confidence_class"] == "MEDIUM_CONFIDENCE" for record in selected),
            "percent_all_words": round(100 * len(selected) / len(ranked), 4),
            "percent_analyzed_words": round(100 * len(selected) / len(analyzed), 4),
        },
        "equivalence_grouping": {
            "candidate_count_before": raw_total,
            "cluster_count_after": grouped_total,
            "candidates_collapsed": raw_total - grouped_total,
            "reduction_percent": round(100 * (raw_total - grouped_total) / raw_total, 4) if raw_total else 0.0,
            "raw_candidates_retained": True,
        },
        "normalization_sensitive_words": sum(record["normalization_sensitive"] for record in ranked),
        "high_confidence_at_least_100": classes.get("HIGH_CONFIDENCE", 0) >= 100,
        "rule_impact": rule_impact(ranked),
        "policies": {
            "neighbor_pos": "weak +/-1 contribution; never independently triggers RULE_CONFLICT",
            "foreign_ntws": "-30 unless exact canonical form, exact vocalization, and exact reconstruction jointly support the candidate",
            "lemma": "raw lemma retained; normalized lemma is a separate comparison field",
            "equivalence": "root/lemma/POS, diac/stem, clitics, and basic morphology fixed; only technical CAMeL fields may collapse",
            "same_surface": "local context may contribute +1; no verse-wide or corpus-wide identity forcing",
            "legacy": "not read during ranking or weight choice",
            "oov": "NO_ANALYSIS preserved; no guess or recovery analyzer",
        },
    }


def run(args: argparse.Namespace) -> dict:
    common.require_exact(args.eval_set, common.EVAL_SET, "frozen eval set")
    common.require_exact(args.full_dir, common.FULL_DIR, "full-analysis directory")
    common.require_exact(args.ranked_output, common.V2_RANKED, "v2 ranked output")
    common.require_exact(args.manifest_output, common.V2_MANIFEST, "v2 run manifest")
    common.require_exact(args.summary_output, common.RANKER_REPORT, "v2 ranker report")
    frozen_v1_state = common.validate_frozen_v1()
    protected_state = common.capture_state(common.PROTECTED_EXPECTED)
    full_manifest = common.v1_common.validate_full_inputs(check_shard_hashes=True)
    if common.sha256_file(common.EVAL_SET) != common.EXPECTED_EVAL_SHA256:
        raise ValueError("Frozen 1,000-word eval set SHA-256 mismatch")
    eval_records = list(common.read_jsonl(common.EVAL_SET))
    if len(eval_records) != 1_000 or sum(record["no_analysis"] for record in eval_records) != 50:
        raise ValueError("Frozen eval count or OOV quota mismatch")
    ranked = load_required_records(eval_records, full_manifest)
    if len(ranked) != 1_000:
        raise ValueError("V2 ranked output must contain exactly 1,000 words")
    common.write_jsonl_atomic(args.ranked_output, ranked)
    summary = build_summary(ranked)
    common.write_json_atomic(args.summary_output, summary)
    manifest = {
        "schema_version": "camel-contextual-disambiguation-v2-run-manifest-v1",
        "freeze_status": "frozen_before_v1_and_legacy_comparison",
        "inputs": {
            "eval_set": {"sha256": common.EXPECTED_EVAL_SHA256, "records": 1_000},
            "full_run_manifest_sha256": common.v1_common.EXPECTED_RUN_MANIFEST_SHA256,
            "token_map_sha256": common.v1_common.EXPECTED_TOKEN_SHA256,
        },
        "frozen_ranker_outputs": {
            "ranked_eval_set": {"sha256": common.sha256_file(args.ranked_output), "bytes": args.ranked_output.stat().st_size, "records": 1_000},
            "ranker_summary": {"sha256": common.sha256_file(args.summary_output), "bytes": args.summary_output.stat().st_size},
        },
        "scripts": {
            "ranker_sha256": common.sha256_file(Path(__file__).resolve()),
            "common_sha256": common.sha256_file(Path(common.__file__).resolve()),
        },
        "scoring_weights": WEIGHTS,
        "confidence_thresholds": THRESHOLDS,
        "equivalence_key_fields": ["root_normalized", "lemma_normalized", "pos_coarse", "pos_raw", "diac", "stem", *common.BASIC_FEATURE_FIELDS],
        "technical_fields_excluded_from_equivalence_key": sorted(common.TECHNICAL_FIELDS),
        "frozen_v1_state": frozen_v1_state,
        "protected_state": protected_state,
        "safety": {
            "legacy_read_during_ranking": False,
            "v1_choices_read_during_ranking": False,
            "oov_guessed": False,
            "full_77429_selection_run": False,
            "candidate_db_modified": False,
            "production_modified": False,
        },
    }
    common.write_json_atomic(args.manifest_output, manifest)
    common.assert_state_unchanged({**frozen_v1_state, **protected_state})
    return {
        "status": "completed_and_frozen",
        "ranked_records": len(ranked),
        "ranked_sha256": manifest["frozen_ranker_outputs"]["ranked_eval_set"]["sha256"],
        "confidence_classes": summary["confidence_classes"],
        "automatic_selection": summary["automatic_selection"],
        "equivalence_grouping": summary["equivalence_grouping"],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", type=Path, default=common.EVAL_SET)
    parser.add_argument("--full-dir", type=Path, default=common.FULL_DIR)
    parser.add_argument("--ranked-output", type=Path, default=common.V2_RANKED)
    parser.add_argument("--manifest-output", type=Path, default=common.V2_MANIFEST)
    parser.add_argument("--summary-output", type=Path, default=common.RANKER_REPORT)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
