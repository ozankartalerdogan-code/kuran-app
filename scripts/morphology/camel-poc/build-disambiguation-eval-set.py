#!/usr/bin/env python3
"""Build a deterministic, legacy-blind 1,000-word contextual evaluation set."""

from __future__ import annotations

import argparse
import gzip
import json
from collections import Counter
from pathlib import Path

import disambiguation_common as common


BUCKET_QUOTAS = {"oov": 50, "single": 100, "low": 200, "medium": 450, "high": 200}
MINIMUM_TAG_COUNTS = {
    "pos_noun": 10,
    "pos_verb": 10,
    "pos_particle": 10,
    "pos_pronoun": 10,
    "pos_proper_noun": 10,
    "exact_analysis": 700,
    "normalize_only": 50,
    "normalization_sensitive": 200,
    "hamzat_al_wasl": 100,
    "uthmani_mark": 200,
    "canonical_harakat": 500,
    "has_undia_form": 500,
}
MIN_SURAHS = 60
CONFIDENCE_THRESHOLDS = {
    "high_confidence_min_margin": 20,
    "medium_confidence_min_margin": 10,
    "low_confidence_min_margin": 1,
    "top_tie_margin": 0,
}
SCORING_WEIGHTS = {
    "surface_diacritics_exact": 24,
    "surface_diacritics_close": 12,
    "exact_form_origin": 8,
    "normalized_form_origin": 3,
    "lemma_similarity_max": 12,
    "surface_reconstruction_exact": 16,
    "surface_reconstruction_close": 8,
    "clitic_surface_match": 8,
    "clitic_surface_conflict": -8,
    "verb_feature_complete": 5,
    "verb_feature_conflict": -8,
    "verb_tam_consistent": 5,
    "verb_tam_conflict": -8,
    "post_preposition_genitive": 10,
    "post_preposition_case_conflict": -10,
    "article_state_match": 8,
    "article_state_conflict": -8,
    "idafa_likely": 4,
    "idafa_conflict": -3,
    "pronoun_enclitic_match": 6,
    "pronoun_enclitic_conflict": -6,
    "neighbor_pos_sequence_plausible": 5,
    "neighbor_pos_sequence_conflict": -8,
    "near_surface_consistency": 5,
}


def load_token_rows() -> tuple[list[dict], dict[str, dict]]:
    rows: list[dict] = []
    by_identity: dict[str, dict] = {}
    for raw in common.read_jsonl(common.TOKEN_MAP):
        if raw.get("tokenization_rule") != "arabic_word":
            continue
        row = {
            "verse_key": raw["verse_key"],
            "word_index": raw["word_index"],
            "canonical_text": raw["canonical_text"],
            "analysis_forms": raw["analysis_forms"],
            "normalization_profiles": sorted({
                path["profile"]
                for trace in raw.get("normalization_traces", [])
                for path in trace.get("paths", [])
            }),
        }
        key = common.identity(row)
        if key in by_identity:
            raise ValueError(f"Duplicate token identity: {key}")
        row["corpus_index"] = len(rows)
        row["surah"] = int(row["verse_key"].split(":", 1)[0])
        rows.append(row)
        by_identity[key] = row
    if len(rows) != common.EXPECTED_WORDS:
        raise ValueError(f"Expected {common.EXPECTED_WORDS} lexical tokens, found {len(rows)}")
    return rows, by_identity


def tags_for(full: dict, token: dict, pos_hints: set[str]) -> list[str]:
    profiles = set(token["normalization_profiles"])
    tags = {f"pos_{pos}" for pos in pos_hints if pos != "other"}
    if full["exact_has_analysis"]:
        tags.add("exact_analysis")
    if not full["exact_has_analysis"] and full["normalized_has_analysis"]:
        tags.add("normalize_only")
    if full["normalization_sensitive"]:
        tags.add("normalization_sensitive")
    if "ٱ" in token["canonical_text"]:
        tags.add("hamzat_al_wasl")
    if common.has_uthmani_mark(token["canonical_text"]):
        tags.add("uthmani_mark")
    if common.has_harakat(token["canonical_text"]):
        tags.add("canonical_harakat")
    if "undia" in profiles:
        tags.add("has_undia_form")
    if full["no_analysis"]:
        tags.add("oov")
    return sorted(tags)


def collect_metadata(manifest: dict, token_by_identity: dict[str, dict]) -> tuple[list[dict], Counter]:
    metadata: list[dict] = []
    population = Counter()
    seen: set[str] = set()
    shard_hashes = {entry["surah"]: entry["sha256"] for entry in manifest["shards"]}
    for entry in manifest["shards"]:
        shard = common.FULL_DIR / entry["filename"]
        with gzip.open(shard, "rt", encoding="utf-8", newline="") as handle:
            for line in handle:
                full = json.loads(line)
                key = common.identity(full)
                token = token_by_identity.get(key)
                if token is None or token["canonical_text"] != full["canonical_text"]:
                    raise ValueError(f"Token/full-analysis identity mismatch: {key}")
                if key in seen:
                    raise ValueError(f"Duplicate full-analysis identity: {key}")
                seen.add(key)
                pos_hints = {common.coarse_pos(candidate.get("pos")) for candidate in full["unique_candidates"]}
                count = full["candidate_count_unique"]
                bucket = common.candidate_bucket(count)
                tags = tags_for(full, token, pos_hints)
                record = {
                    "verse_key": full["verse_key"],
                    "word_index": full["word_index"],
                    "canonical_text": full["canonical_text"],
                    "candidate_count": count,
                    "candidate_bucket": bucket,
                    "exact_has_analysis": full["exact_has_analysis"],
                    "normalized_has_analysis": full["normalized_has_analysis"],
                    "normalization_sensitive": full["normalization_sensitive"],
                    "no_analysis": full["no_analysis"],
                    "analysis_forms": token["analysis_forms"],
                    "normalization_profiles": token["normalization_profiles"],
                    "possible_pos_classes": sorted(pos_hints),
                    "selection_tags": tags,
                    "surah": token["surah"],
                    "corpus_index": token["corpus_index"],
                    "source_shard": entry["filename"],
                    "source_shard_sha256": shard_hashes[token["surah"]],
                    "stable_rank": common.stable_hash(key),
                }
                metadata.append(record)
                population[f"bucket:{bucket}"] += 1
                for tag in tags:
                    population[f"tag:{tag}"] += 1
    if len(metadata) != common.EXPECTED_WORDS or len(seen) != common.EXPECTED_WORDS:
        raise ValueError("Full-analysis record count mismatch")
    return metadata, population


def select_records(metadata: list[dict]) -> list[dict]:
    selected: dict[str, dict] = {}
    bucket_counts = Counter()
    selected_surahs: set[int] = set()

    def add(record: dict) -> bool:
        key = common.identity(record)
        bucket = record["candidate_bucket"]
        if key in selected or bucket_counts[bucket] >= BUCKET_QUOTAS[bucket]:
            return False
        selected[key] = record
        bucket_counts[bucket] += 1
        selected_surahs.add(record["surah"])
        return True

    def tag_count(tag: str) -> int:
        return sum(tag in record["selection_tags"] for record in selected.values())

    def choose_tag(tag: str, minimum: int) -> None:
        pool = sorted(
            (record for record in metadata if tag in record["selection_tags"]),
            key=lambda record: record["stable_rank"],
        )
        for prefer_new_surah in (True, False):
            for record in pool:
                if tag_count(tag) >= minimum:
                    return
                if prefer_new_surah and record["surah"] in selected_surahs:
                    continue
                add(record)
        if tag_count(tag) < minimum:
            raise ValueError(f"Cannot satisfy minimum tag quota {tag}={minimum}")

    choose_tag("oov", BUCKET_QUOTAS["oov"])
    for tag, minimum in MINIMUM_TAG_COUNTS.items():
        choose_tag(tag, minimum)

    for surah in range(1, 115):
        if len(selected_surahs) >= MIN_SURAHS:
            break
        if surah in selected_surahs:
            continue
        pool = sorted((record for record in metadata if record["surah"] == surah), key=lambda record: record["stable_rank"])
        for record in pool:
            if add(record):
                break
    if len(selected_surahs) < MIN_SURAHS:
        raise ValueError(f"Only {len(selected_surahs)} surahs represented")

    for bucket, quota in BUCKET_QUOTAS.items():
        pool = sorted((record for record in metadata if record["candidate_bucket"] == bucket), key=lambda record: record["stable_rank"])
        for record in pool:
            if bucket_counts[bucket] >= quota:
                break
            add(record)
        if bucket_counts[bucket] != quota:
            raise ValueError(f"Cannot satisfy bucket quota {bucket}={quota}")

    if len(selected) != 1_000:
        raise ValueError(f"Expected 1,000 selected records, found {len(selected)}")
    for tag, minimum in MINIMUM_TAG_COUNTS.items():
        if tag_count(tag) < minimum:
            raise ValueError(f"Final selection lost tag quota {tag}")
    return sorted(selected.values(), key=common.identity_sort)


def add_context(selected: list[dict], token_rows: list[dict]) -> list[dict]:
    output: list[dict] = []
    for sample_index, record in enumerate(selected, start=1):
        index = record.pop("corpus_index")
        record.pop("surah")
        surah = int(record["verse_key"].split(":", 1)[0])

        def context(direction: int) -> list[dict]:
            values: list[dict] = []
            cursor = index + direction
            while 0 <= cursor < len(token_rows) and len(values) < 3:
                neighbor = token_rows[cursor]
                if neighbor["surah"] != surah:
                    break
                values.append({
                    "verse_key": neighbor["verse_key"],
                    "word_index": neighbor["word_index"],
                    "canonical_text": neighbor["canonical_text"],
                })
                cursor += direction
            if direction < 0:
                values.reverse()
            return values

        output.append({
            "sample_index": sample_index,
            **record,
            "context_before": context(-1),
            "context_after": context(1),
            "provenance": {
                "token_map_sha256": common.EXPECTED_TOKEN_SHA256,
                "full_run_manifest_sha256": common.EXPECTED_RUN_MANIFEST_SHA256,
                "selection_seed": common.SEED,
                "legacy_used_for_selection": False,
            },
        })
    return output


def build(args: argparse.Namespace) -> dict:
    common.require_exact(args.token_map, common.TOKEN_MAP, "token map")
    common.require_exact(args.full_dir, common.FULL_DIR, "full-analysis directory")
    common.require_exact(args.run_manifest, common.RUN_MANIFEST, "run manifest")
    common.require_exact(args.full_summary, common.FULL_SUMMARY, "full-analysis summary")
    output = common.require_candidate_output(args.output, common.EVAL_SET, "eval-set output")
    manifest_output = common.require_candidate_output(args.manifest_output, common.EVAL_MANIFEST, "eval-set manifest")
    manifest = common.validate_full_inputs(check_shard_hashes=True)
    token_rows, token_by_identity = load_token_rows()
    metadata, population = collect_metadata(manifest, token_by_identity)
    records = add_context(select_records(metadata), token_rows)
    common.write_jsonl_atomic(output, records)

    bucket_counts = Counter(record["candidate_bucket"] for record in records)
    tag_counts = {tag: sum(tag in record["selection_tags"] for record in records) for tag in MINIMUM_TAG_COUNTS}
    eval_manifest = {
        "schema_version": "camel-contextual-eval-set-v1",
        "candidate_only": True,
        "legacy_blind_selection": True,
        "production_approved": False,
        "deterministic": True,
        "selection_seed": common.SEED,
        "inputs": {
            "token_map_sha256": common.EXPECTED_TOKEN_SHA256,
            "full_run_manifest_sha256": common.EXPECTED_RUN_MANIFEST_SHA256,
            "full_summary_sha256": common.EXPECTED_FULL_SUMMARY_SHA256,
        },
        "sampling_parameters": {
            "total_words": 1_000,
            "minimum_surahs": MIN_SURAHS,
            "bucket_quotas": BUCKET_QUOTAS,
            "minimum_tag_counts": MINIMUM_TAG_COUNTS,
        },
        "ranker_parameters": {
            "context_lexical_words_each_side": 3,
            "confidence_thresholds": CONFIDENCE_THRESHOLDS,
            "scoring_weights": SCORING_WEIGHTS,
            "automatic_selection": "unique input or non-conflicting HIGH_CONFIDENCE margin only",
        },
        "population_counts": dict(sorted(population.items())),
        "selection": {
            "words": len(records),
            "surahs": len({int(record["verse_key"].split(":", 1)[0]) for record in records}),
            "bucket_counts": dict(sorted(bucket_counts.items())),
            "tag_counts": dict(sorted(tag_counts.items())),
        },
        "eval_set": {
            "filename": output.name,
            "bytes": output.stat().st_size,
            "sha256": common.sha256_file(output),
        },
        "scripts": {
            "builder_sha256": common.sha256_file(Path(__file__).resolve()),
            "common_sha256": common.sha256_file(Path(common.__file__).resolve()),
        },
        "frozen_ranker_outputs": None,
    }
    common.write_json_atomic(manifest_output, eval_manifest)
    return {
        "status": "completed",
        "words": len(records),
        "surahs": eval_manifest["selection"]["surahs"],
        "eval_set_sha256": eval_manifest["eval_set"]["sha256"],
        "bucket_counts": eval_manifest["selection"]["bucket_counts"],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-map", type=Path, default=common.TOKEN_MAP)
    parser.add_argument("--full-dir", type=Path, default=common.FULL_DIR)
    parser.add_argument("--run-manifest", type=Path, default=common.RUN_MANIFEST)
    parser.add_argument("--full-summary", type=Path, default=common.FULL_SUMMARY)
    parser.add_argument("--output", type=Path, default=common.EVAL_SET)
    parser.add_argument("--manifest-output", type=Path, default=common.EVAL_MANIFEST)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(build(parse_args()), ensure_ascii=True, sort_keys=True))
