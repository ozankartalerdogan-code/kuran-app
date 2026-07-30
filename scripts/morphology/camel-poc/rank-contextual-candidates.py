#!/usr/bin/env python3
"""Rank Camel Morph candidates with explainable, legacy-blind context rules."""

from __future__ import annotations

import argparse
import difflib
import gzip
import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import disambiguation_common as common


UNINFORMATIVE = {None, "", "0", "na"}
PROCLITIC_FIELDS = ("prc3", "prc2", "prc1.5", "prc1", "prc0")
PRONOUN_SUFFIXES = ("كما", "هما", "كم", "كن", "هم", "هن", "ها", "نا", "ه", "ك", "ي")


def component(rule: str, score: int, evidence: str) -> dict:
    return {"rule": rule, "score": int(score), "evidence": evidence}


def clean_diacritics(value: str) -> str:
    output = []
    for char in value or "":
        if char == "ـ" or 0x06D6 <= ord(char) <= 0x06ED:
            continue
        output.append(char)
    return "".join(output).replace("ٱ", "ا")


def similarity(left: str, right: str) -> float:
    return difflib.SequenceMatcher(None, left or "", right or "").ratio()


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


def candidate_origins(record: dict) -> dict[str, dict[str, set[str]]]:
    origins: dict[str, dict[str, set[str]]] = defaultdict(lambda: {"forms": set(), "profiles": set()})
    for form in record["analysis_forms"]:
        for candidate in form["candidates"]:
            origin = origins[common.candidate_signature(candidate)]
            origin["forms"].add(form["form_id"])
            origin["profiles"].update(form["profiles"])
    return origins


def score_candidate(target: dict, candidate: dict, origin: dict[str, set[str]], neighbors: list[dict | None], weights: dict) -> list[dict]:
    before = neighbors[:3]
    after = neighbors[3:]
    previous = before[-1] if before else None
    following = after[0] if after else None
    canonical = target["canonical_text"]
    surface_diac = clean_diacritics(canonical)
    candidate_diac = clean_diacritics(str(candidate.get("diac") or ""))
    surface_plain = common.strip_marks(canonical)
    lemma_plain = common.strip_marks(str(candidate.get("lex") or candidate.get("stem") or ""))
    pos = common.coarse_pos(candidate.get("pos"))
    parts: list[dict] = []

    ratio = similarity(surface_diac, candidate_diac)
    if surface_diac == candidate_diac and surface_diac:
        parts.append(component("surface_diacritics", weights["surface_diacritics_exact"], "canonical and candidate diacritics match after Quran-mark cleanup"))
    elif ratio >= 0.80:
        parts.append(component("surface_diacritics", weights["surface_diacritics_close"], f"diacritic similarity={ratio:.3f}"))
    else:
        parts.append(component("surface_diacritics", 0, f"diacritic similarity={ratio:.3f}"))

    if "exact" in origin["forms"]:
        parts.append(component("analysis_form_origin", weights["exact_form_origin"], "candidate occurs in exact-form analyses"))
    else:
        parts.append(component("analysis_form_origin", weights["normalized_form_origin"], "candidate occurs only in normalized-form analyses"))

    lemma_ratio = similarity(surface_plain, lemma_plain)
    if lemma_plain and (lemma_plain in surface_plain or surface_plain.endswith(lemma_plain)):
        lemma_score = weights["lemma_similarity_max"]
    else:
        lemma_score = round(weights["lemma_similarity_max"] * lemma_ratio)
    parts.append(component("lemma_surface_similarity", lemma_score, f"undiacritized similarity={lemma_ratio:.3f}"))

    reconstructed = common.strip_marks(str(candidate.get("d3seg") or candidate.get("atbseg") or candidate.get("diac") or "").replace("+_", "").replace("_+", "").replace("+", "").replace("_", ""))
    reconstruction_ratio = similarity(surface_plain, reconstructed)
    if reconstructed == surface_plain and reconstructed:
        reconstruction_score = weights["surface_reconstruction_exact"]
    elif reconstruction_ratio >= 0.80:
        reconstruction_score = weights["surface_reconstruction_close"]
    else:
        reconstruction_score = 0
    parts.append(component("prefix_stem_suffix_reconstruction", reconstruction_score, f"surface reconstruction similarity={reconstruction_ratio:.3f}"))

    clitics = [str(candidate.get(field) or "0") for field in PROCLITIC_FIELDS]
    has_clitic = any(value not in {"0", "na", ""} for value in clitics)
    article_candidate = "det" in clitics[-1].lower()
    article_surface = "ال" in surface_plain[:4]
    if has_clitic and (reconstruction_ratio >= 0.80 or (article_candidate and article_surface)):
        clitic_score = weights["clitic_surface_match"]
        clitic_evidence = "declared proclitic sequence is compatible with reconstructed surface"
    elif article_candidate != article_surface:
        clitic_score = weights["clitic_surface_conflict"]
        clitic_evidence = "article/proclitic declaration conflicts with surface"
    else:
        clitic_score = 0
        clitic_evidence = "no decisive clitic-surface signal"
    parts.append(component("proclitic_enclitic_surface", clitic_score, clitic_evidence))

    if pos == "verb":
        complete = all(candidate.get(field) not in UNINFORMATIVE for field in ("per", "gen", "num"))
        parts.append(component(
            "verb_person_gender_number",
            weights["verb_feature_complete"] if complete else weights["verb_feature_conflict"],
            "verb person/gender/number features complete" if complete else "verb lacks an informative person/gender/number feature",
        ))
        aspect = candidate.get("asp")
        mood = candidate.get("mod")
        tam_ok = (aspect == "i" and mood not in UNINFORMATIVE) or (aspect in {"p", "c"} and mood in UNINFORMATIVE)
        parts.append(component(
            "verb_aspect_mood_voice",
            weights["verb_tam_consistent"] if tam_ok else weights["verb_tam_conflict"],
            f"aspect={aspect}, mood={mood}, voice={candidate.get('vox')}",
        ))
    else:
        parts.append(component("verb_person_gender_number", 0, "not a verb candidate"))
        parts.append(component("verb_aspect_mood_voice", 0, "not a verb candidate"))

    if has_preposition(previous) and pos in {"noun", "proper_noun", "pronoun"}:
        case = candidate.get("cas")
        case_ok = case == "g" or pos == "pronoun"
        parts.append(component(
            "post_preposition_case",
            weights["post_preposition_genitive"] if case_ok else weights["post_preposition_case_conflict"],
            f"previous word permits a preposition; candidate case={case}",
        ))
    else:
        parts.append(component("post_preposition_case", 0, "no decisive preceding-preposition context"))

    state = candidate.get("stt")
    state_match = article_surface and article_candidate and state == "d"
    state_conflict = article_surface != article_candidate or (article_candidate and state != "d")
    parts.append(component(
        "article_definiteness",
        weights["article_state_match"] if state_match else weights["article_state_conflict"] if state_conflict else 0,
        f"surface_article={article_surface}, candidate_article={article_candidate}, state={state}",
    ))

    next_pos = possible_pos(following)
    if pos in {"noun", "proper_noun"} and next_pos.intersection({"noun", "proper_noun"}):
        idafa_score = weights["idafa_likely"] if state == "c" else weights["idafa_conflict"] if state == "d" else 0
        parts.append(component("idafa_context", idafa_score, f"next POS possibilities={sorted(next_pos)}, state={state}"))
    else:
        parts.append(component("idafa_context", 0, "no adjacent noun-noun idafa signal"))

    enc0 = str(candidate.get("enc0") or "0")
    if enc0 not in {"0", "na", ""}:
        suffix_match = any(surface_plain.endswith(suffix) for suffix in PRONOUN_SUFFIXES)
        parts.append(component(
            "pronoun_enclitic_agreement",
            weights["pronoun_enclitic_match"] if suffix_match else weights["pronoun_enclitic_conflict"],
            f"enc0={enc0}, recognizable_surface_suffix={suffix_match}, per/gen/num={candidate.get('per')}/{candidate.get('gen')}/{candidate.get('num')}",
        ))
    else:
        parts.append(component("pronoun_enclitic_agreement", 0, "no enclitic pronoun"))

    if has_preposition(previous):
        plausible = pos in {"noun", "proper_noun", "pronoun"}
        pos_score = weights["neighbor_pos_sequence_plausible"] if plausible else weights["neighbor_pos_sequence_conflict"]
        pos_evidence = f"preposition-compatible current POS={pos}"
    else:
        pos_score = 0
        pos_evidence = f"no decisive POS sequence; current POS={pos}"
    parts.append(component("neighbor_pos_sequence", pos_score, pos_evidence))

    candidate_key = (common.strip_marks(str(candidate.get("root") or "")), common.strip_marks(str(candidate.get("lex") or "")), pos)
    consistent = False
    for neighbor in [item for item in neighbors if item is not None]:
        if common.strip_marks(neighbor["canonical_text"]) != surface_plain:
            continue
        if any(
            (common.strip_marks(str(other.get("root") or "")), common.strip_marks(str(other.get("lex") or "")), common.coarse_pos(other.get("pos"))) == candidate_key
            for other in neighbor.get("unique_candidates", [])
        ):
            consistent = True
            break
    parts.append(component(
        "near_surface_consistency",
        weights["near_surface_consistency"] if consistent else 0,
        "same nearby surface permits the same root/lemma/POS" if consistent else "no same-surface nearby confirmation",
    ))
    return parts


def rank_record(eval_record: dict, target: dict, loaded: dict[str, dict], parameters: dict) -> dict:
    context_before = eval_record["context_before"][-3:]
    context_after = eval_record["context_after"][:3]
    before_neighbors = [loaded.get(common.identity(item)) for item in context_before]
    after_neighbors = [loaded.get(common.identity(item)) for item in context_after]
    neighbors = (
        [None] * (3 - len(before_neighbors)) + before_neighbors + after_neighbors + [None] * (3 - len(after_neighbors))
    )
    count = target["candidate_count_unique"]
    base = {
        "verse_key": target["verse_key"],
        "word_index": target["word_index"],
        "canonical_text": target["canonical_text"],
        "context_before": context_before,
        "context_after": context_after,
        "candidate_count": count,
        "normalization": {
            "exact_has_analysis": target["exact_has_analysis"],
            "normalized_has_analysis": target["normalized_has_analysis"],
            "normalization_sensitive": target["normalization_sensitive"],
            "forms": [{"form_id": form["form_id"], "form": form["form"], "profiles": form["profiles"], "candidate_count": form["candidate_count"]} for form in target["analysis_forms"]],
        },
        "provenance": {
            "candidate_source": "Camel Morph MSA v1.0 full-analysis unique_candidates",
            "token_map_sha256": common.EXPECTED_TOKEN_SHA256,
            "full_run_manifest_sha256": common.EXPECTED_RUN_MANIFEST_SHA256,
            "eval_set_sha256": common.sha256_file(common.EVAL_SET),
            "legacy_used_for_ranking": False,
            "mle_disambiguator_used": False,
        },
    }
    if count == 0:
        return {**base, "ranked_candidates": [], "top_score": None, "second_score": None, "margin": None, "shortlist_count": 0, "confidence_class": "NO_ANALYSIS", "selected_candidate": None}

    origins = candidate_origins(target)
    ranked = []
    for candidate in target["unique_candidates"]:
        signature = common.candidate_signature(candidate)
        parts = score_candidate(target, candidate, origins[signature], neighbors, parameters["scoring_weights"])
        ranked.append({
            "candidate_signature_sha256": common.stable_hash(signature, "candidate-signature-v1"),
            "candidate": candidate,
            "source_forms": sorted(origins[signature]["forms"]),
            "source_profiles": sorted(origins[signature]["profiles"]),
            "score_components": parts,
            "total_score": sum(item["score"] for item in parts),
            "_signature": signature,
        })
    ranked.sort(key=lambda item: (-item["total_score"], item["_signature"]))
    for index, item in enumerate(ranked, start=1):
        item["rank"] = index
        item.pop("_signature")
    top_score = ranked[0]["total_score"]
    second_score = ranked[1]["total_score"] if len(ranked) > 1 else None
    margin = top_score - second_score if second_score is not None else None
    shortlist_count = sum(item["total_score"] >= top_score - 9 for item in ranked)
    top_parts = ranked[0]["score_components"]
    rule_conflict = any(item["score"] >= 8 for item in top_parts) and any(item["score"] <= -8 for item in top_parts)
    thresholds = parameters["confidence_thresholds"]
    selected = None
    if len(ranked) == 1:
        confidence = "UNIQUE_INPUT"
        selected = ranked[0]["candidate"]
    elif margin == thresholds["top_tie_margin"]:
        confidence = "TOP_TIE"
    elif rule_conflict:
        confidence = "RULE_CONFLICT"
    elif target["normalization_sensitive"]:
        confidence = "NORMALIZATION_SENSITIVE"
    elif margin >= thresholds["high_confidence_min_margin"]:
        confidence = "HIGH_CONFIDENCE"
        selected = ranked[0]["candidate"]
    elif margin >= thresholds["medium_confidence_min_margin"]:
        confidence = "MEDIUM_CONFIDENCE"
    else:
        confidence = "LOW_CONFIDENCE"
    return {
        **base,
        "ranked_candidates": ranked,
        "top_score": top_score,
        "second_score": second_score,
        "margin": margin,
        "shortlist_count": shortlist_count,
        "confidence_class": confidence,
        "selected_candidate": selected,
    }


def transform_form(canonical: str, profile: str) -> tuple[str, list[dict], str]:
    output: list[str] = []
    operations: list[dict] = []
    risk = "low"
    for index, char in enumerate(canonical):
        replacement: str | None = char
        reason = ""
        if profile == "quran_combining_marks_only" and 0x06D6 <= ord(char) <= 0x06ED and unicodedata.category(char).startswith("M"):
            replacement, reason = "", "remove_extended_Quran_combining_mark"
        elif profile == "wasl_to_hamza_above" and char == "ٱ":
            replacement, reason = "أ", "standardize_hamzat_al_wasl_to_hamza_above"
            risk = "medium"
        elif profile == "dagger_alif_delete_preserve_harakat" and char == "ٰ":
            replacement, reason = "", "delete_dagger_alif_while_preserving_other_harakat"
            risk = "medium"
        elif profile == "dagger_alif_expand_preserve_harakat" and char == "ٰ":
            replacement, reason = "ا", "expand_dagger_alif_while_preserving_other_harakat"
            risk = "medium"
        elif profile == "tatweel_remove_preserve_marks" and char == "ـ":
            replacement, reason = "", "remove_tatweel_without_deleting_attached_marks"
            risk = "medium"
        if replacement != char:
            operations.append({"op": "delete" if replacement == "" else "replace", "input_cp_start": index, "input_cp_end": index + 1, "input_hex": [f"U+{ord(char):04X}"], "output": replacement, "reason": reason})
        if replacement:
            output.append(replacement)
    return "".join(output), operations, risk


def oov_forms(canonical: str, existing: set[str]) -> list[dict]:
    forms: list[dict] = []
    seen = set(existing)
    for profile in (
        "quran_combining_marks_only",
        "wasl_to_hamza_above",
        "dagger_alif_delete_preserve_harakat",
        "dagger_alif_expand_preserve_harakat",
        "tatweel_remove_preserve_marks",
    ):
        form, operations, risk = transform_form(canonical, profile)
        if form and form not in seen and operations:
            seen.add(form)
            forms.append({"profile": profile, "form": form, "normalization_trace": operations, "false_surface_expansion_risk": risk})

    plain = common.strip_marks(canonical, fold_alif=False).replace("ٱ", "ا")
    index = next((idx for idx, char in enumerate(plain) if char in "اأإآ" and idx <= 1), None)
    if index is not None:
        for replacement in "اأإآ":
            form = plain[:index] + replacement + plain[index + 1:]
            if form in seen:
                continue
            seen.add(form)
            forms.append({
                "profile": f"controlled_initial_alif_variant_{ord(replacement):04x}",
                "form": form,
                "normalization_trace": [{"op": "replace", "input_cp_start": index, "input_cp_end": index + 1, "input_hex": [f"U+{ord(plain[index]):04X}"], "output": replacement, "reason": "controlled_initial_alif_or_hamza_variant"}],
                "false_surface_expansion_risk": "high",
            })
    return forms


def recover_oov(eval_record: dict, target: dict, analyzer) -> dict:
    attempts = []
    unique: dict[str, dict] = {}
    for form_index, form_record in enumerate(oov_forms(target["canonical_text"], {form["form"] for form in target["analysis_forms"]}), start=1):
        candidates = [dict(candidate) for candidate in analyzer.analyze(form_record["form"])]
        for candidate in candidates:
            unique.setdefault(common.candidate_signature(candidate), candidate)
        attempts.append({
            "form_id": f"oov_form_{form_index}",
            **form_record,
            "has_analysis": bool(candidates),
            "candidate_count": len(candidates),
            "candidates": candidates,
        })
    return {
        "verse_key": target["verse_key"],
        "word_index": target["word_index"],
        "canonical_text": target["canonical_text"],
        "original_candidate_count": 0,
        "attempted_forms": attempts,
        "recovered": bool(unique),
        "recovered_candidate_count_unique": len(unique),
        "unique_recovered_candidates": list(unique.values()),
        "confidence_class": "UNRANKED_RECOVERY_CANDIDATES" if unique else "NO_ANALYSIS",
        "selected_candidate": None,
        "provenance": {
            "source": "Camel Morph MSA v1.0 only",
            "db_sha256": common.EXPECTED_DB_SHA256,
            "canonical_text_modified": False,
            "legacy_used": False,
            "network_used": False,
        },
    }


def load_required_records(eval_records: list[dict], manifest: dict, parameters: dict) -> tuple[list[dict], list[dict]]:
    grouped: dict[int, list[dict]] = defaultdict(list)
    for record in eval_records:
        grouped[int(record["verse_key"].split(":", 1)[0])].append(record)
    shard_by_surah = {entry["surah"]: entry for entry in manifest["shards"]}
    ranked_records: list[dict] = []
    oov_records: list[dict] = []
    analyzer = None
    for surah in sorted(grouped):
        required = set()
        for record in grouped[surah]:
            required.add(common.identity(record))
            required.update(common.identity(item) for item in record["context_before"][-3:] + record["context_after"][:3])
        loaded: dict[str, dict] = {}
        entry = shard_by_surah[surah]
        with gzip.open(common.FULL_DIR / entry["filename"], "rt", encoding="utf-8", newline="") as handle:
            for line in handle:
                record = json.loads(line)
                key = common.identity(record)
                if key in required:
                    loaded[key] = record
        missing = required - loaded.keys()
        if missing:
            raise ValueError(f"Missing target/context records in surah {surah}: {sorted(missing)[:3]}")
        for eval_record in grouped[surah]:
            target = loaded[common.identity(eval_record)]
            ranked_records.append(rank_record(eval_record, target, loaded, parameters))
            if target["no_analysis"]:
                if analyzer is None:
                    analyzer = common.load_camel_analyzer()
                oov_records.append(recover_oov(eval_record, target, analyzer))
    return sorted(ranked_records, key=common.identity_sort), sorted(oov_records, key=common.identity_sort)


def ranking_summary(ranked: list[dict], oov: list[dict]) -> dict:
    classes = Counter(record["confidence_class"] for record in ranked)
    selected = [record for record in ranked if record["selected_candidate"] is not None]
    analyzed = [record for record in ranked if record["candidate_count"] > 0]
    return {
        "schema_version": "camel-contextual-disambiguation-poc-summary-v1",
        "status": "ranker_frozen_legacy_comparison_pending",
        "candidate_only": True,
        "production_approved": False,
        "words_processed": len(ranked),
        "automatic_selected": len(selected),
        "automatic_selection_percent_all_words": round(100 * len(selected) / len(ranked), 4),
        "automatic_selection_percent_analyzed_words": round(100 * len(selected) / len(analyzed), 4) if analyzed else 0.0,
        "confidence_classes": dict(sorted(classes.items())),
        "candidate_reduction": {
            "average_input_unique_candidates": round(sum(record["candidate_count"] for record in ranked) / len(ranked), 4),
            "average_explainable_shortlist_candidates": round(sum(record["shortlist_count"] for record in ranked) / len(ranked), 4),
        },
        "oov_recovery": {
            "attempted": len(oov),
            "recovered": sum(record["recovered"] for record in oov),
            "recovery_percent": round(100 * sum(record["recovered"] for record in oov) / len(oov), 4) if oov else 0.0,
        },
        "legacy_comparison": None,
        "threshold_decision": "pending_blind_legacy_comparison_and_manual_error_adjudication",
    }


def run(args: argparse.Namespace) -> dict:
    common.require_exact(args.eval_set, common.EVAL_SET, "eval set")
    common.require_exact(args.eval_manifest, common.EVAL_MANIFEST, "eval-set manifest")
    common.require_exact(args.full_dir, common.FULL_DIR, "full-analysis directory")
    common.require_exact(args.db, common.DB_PATH, "Camel Morph DB")
    ranked_output = common.require_candidate_output(args.ranked_output, common.RANKED_SET, "ranked output")
    oov_output = common.require_candidate_output(args.oov_output, common.OOV_RECOVERY, "OOV output")
    summary_output = common.require_candidate_output(args.summary_output, common.POC_SUMMARY, "summary output")
    manifest = common.validate_full_inputs(check_shard_hashes=True)
    eval_manifest = common.load_json(common.EVAL_MANIFEST)
    if common.sha256_file(common.EVAL_SET) != eval_manifest["eval_set"]["sha256"]:
        raise ValueError("Eval-set hash is not frozen")
    eval_records = list(common.read_jsonl(common.EVAL_SET))
    if len(eval_records) != 1_000 or sum(record["no_analysis"] for record in eval_records) != 50:
        raise ValueError("Eval-set count or OOV quota mismatch")
    ranked, oov = load_required_records(eval_records, manifest, eval_manifest["ranker_parameters"])
    if len(ranked) != 1_000 or len(oov) != 50:
        raise ValueError("Ranked or OOV output count mismatch")
    common.write_jsonl_atomic(ranked_output, ranked)
    common.write_jsonl_atomic(oov_output, oov)
    summary = ranking_summary(ranked, oov)
    common.write_json_atomic(summary_output, summary)
    eval_manifest["frozen_ranker_outputs"] = {
        "status": "frozen_before_legacy_comparison",
        "eval_set_sha256": common.sha256_file(common.EVAL_SET),
        "ranked_eval_set": {"filename": ranked_output.name, "bytes": ranked_output.stat().st_size, "sha256": common.sha256_file(ranked_output), "records": len(ranked)},
        "oov_recovery": {"filename": oov_output.name, "bytes": oov_output.stat().st_size, "sha256": common.sha256_file(oov_output), "records": len(oov)},
        "ranker_script_sha256": common.sha256_file(Path(__file__).resolve()),
        "common_script_sha256": common.sha256_file(Path(common.__file__).resolve()),
        "camel_morph_db_sha256": common.EXPECTED_DB_SHA256,
        "legacy_read_during_ranking": False,
        "mle_disambiguator_used": False,
    }
    common.write_json_atomic(common.EVAL_MANIFEST, eval_manifest)
    return {
        "status": "completed_and_frozen",
        "ranked_records": len(ranked),
        "oov_records": len(oov),
        "ranked_sha256": common.sha256_file(ranked_output),
        "oov_sha256": common.sha256_file(oov_output),
        "confidence_classes": summary["confidence_classes"],
        "automatic_selected": summary["automatic_selected"],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", type=Path, default=common.EVAL_SET)
    parser.add_argument("--eval-manifest", type=Path, default=common.EVAL_MANIFEST)
    parser.add_argument("--full-dir", type=Path, default=common.FULL_DIR)
    parser.add_argument("--db", type=Path, default=common.DB_PATH)
    parser.add_argument("--ranked-output", type=Path, default=common.RANKED_SET)
    parser.add_argument("--oov-output", type=Path, default=common.OOV_RECOVERY)
    parser.add_argument("--summary-output", type=Path, default=common.POC_SUMMARY)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
