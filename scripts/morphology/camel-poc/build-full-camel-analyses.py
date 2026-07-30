#!/usr/bin/env python3
"""Build candidate-only Camel Morph analyses as deterministic per-surah shards."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import importlib.metadata
import io
import json
import math
import os
import shutil
import socket
import statistics
import struct
import sys
import types
from collections import Counter
from itertools import zip_longest
from pathlib import Path
from typing import Iterable, Iterator


REPO_ROOT = Path(__file__).resolve().parents[3]
CANDIDATE_ROOT = REPO_ROOT / "data/candidates/morphology/camel-morph-msa-v1.0"
TOKEN_MAP = CANDIDATE_ROOT / "token-map.jsonl"
DB_PATH = CANDIDATE_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
ENVIRONMENT_MANIFEST = CANDIDATE_ROOT / "environment-manifest.json"
SOURCE_MANIFEST = DB_PATH.parent / "source-manifest.json"
OUTPUT_DIR = CANDIDATE_ROOT / "full-analysis"
SUMMARY_PATH = REPO_ROOT / "data/candidates/morphology/reports/camel-morph-full-analysis-summary.json"
VALIDATOR_PATH = REPO_ROOT / "scripts/morphology/camel-poc/validate-full-camel-analyses.py"

EXPECTED_TOKEN_SHA256 = "2f56784c102bec10a6ed58a54cc099631fa740c782c47d9b42a3d77e78348329"
EXPECTED_DB_SHA256 = "110e03baa282874062d076e23d9671e985b6f76520b891d58cba4e55de0b8f60"
EXPECTED_SOURCE_SHA256 = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326"
EXPECTED_ANALYSIS_WORDS = 77_429
EXPECTED_SURAHS = 114
EXPECTED_PYTHON = "3.12.10"
EXPECTED_CAMEL_TOOLS = "1.6.0"

SMOKE_WORDS = 300
SMOKE_CANDIDATE_INSTANCES = 24_103
SMOKE_UNIQUE_CANDIDATES = 12_486
SMOKE_RAW_BYTES = 21_575_779
SMOKE_GZIP_BYTES = 830_363
SCHEMA_DUPLICATION_SAFETY_FACTOR = 2
SAFETY_BYTES = 5 * 1024**3

FIELDS = (
    "root", "lex", "pos", "cas", "mod", "vox", "asp", "per", "gen",
    "num", "stt", "stem", "prc3", "prc2", "prc1.5", "prc1", "prc0", "enc0",
)
UNINFORMATIVE = {None, "", "0", "na"}
FORBIDDEN_PROVENANCE = (
    "mustafa0x", "canonical_word_analysis", "data/app.db", "qul.tarteel",
    "corpus.quran.com", "eqtb",
)
DETERMINISM_SURAHS = {
    1: "Fatiha boundary and excluded opening basmala baseline",
    2: "long-surah stress sample",
    55: "dense Uthmani-mark and refrain sample",
    108: "short non-Fatiha sample",
    114: "final-surah boundary sample",
}


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def resolved(path: Path) -> Path:
    return path.resolve(strict=False)


def require_exact(path: Path, expected: Path, label: str) -> Path:
    actual = resolved(path)
    wanted = resolved(expected)
    if actual != wanted:
        raise ValueError(f"{label} must be exactly {wanted}")
    return actual


def require_candidate_path(path: Path, expected: Path, label: str) -> Path:
    actual = require_exact(path, expected, label)
    candidate_data = resolved(REPO_ROOT / "data/candidates/morphology")
    if candidate_data not in actual.parents:
        raise ValueError(f"{label} must be below {candidate_data}")
    return actual


def preflight_estimate() -> dict:
    estimated_instances = math.ceil(SMOKE_CANDIDATE_INSTANCES * EXPECTED_ANALYSIS_WORDS / SMOKE_WORDS)
    estimated_unique = math.ceil(SMOKE_UNIQUE_CANDIDATES * EXPECTED_ANALYSIS_WORDS / SMOKE_WORDS)
    base_raw = math.ceil(SMOKE_RAW_BYTES * EXPECTED_ANALYSIS_WORDS / SMOKE_WORDS)
    base_gzip = math.ceil(SMOKE_GZIP_BYTES * EXPECTED_ANALYSIS_WORDS / SMOKE_WORDS)
    estimated_raw = base_raw * SCHEMA_DUPLICATION_SAFETY_FACTOR
    estimated_gzip = base_gzip * SCHEMA_DUPLICATION_SAFETY_FACTOR
    required = estimated_raw * 2 + SAFETY_BYTES
    return {
        "smoke_words": SMOKE_WORDS,
        "estimated_candidate_instances": estimated_instances,
        "estimated_unique_candidates": estimated_unique,
        "estimated_uncompressed_bytes": estimated_raw,
        "estimated_gzip_bytes": estimated_gzip,
        "schema_duplication_safety_factor": SCHEMA_DUPLICATION_SAFETY_FACTOR,
        "safety_bytes": SAFETY_BYTES,
        "required_free_bytes": required,
    }


def validate_preflight(token_map: Path, db_path: Path, environment_path: Path, source_path: Path, output_dir: Path) -> dict:
    token_sha = sha256_file(token_map)
    db_sha = sha256_file(db_path)
    environment_sha = sha256_file(environment_path)
    source_sha = sha256_file(source_path)
    if token_sha != EXPECTED_TOKEN_SHA256:
        raise ValueError(f"Token-map SHA mismatch: {token_sha}")
    if db_sha != EXPECTED_DB_SHA256:
        raise ValueError(f"Camel Morph DB SHA mismatch: {db_sha}")
    environment = load_json(environment_path)
    source = load_json(source_path)
    if environment["platform"]["python_version"] != EXPECTED_PYTHON:
        raise ValueError("Environment manifest Python mismatch")
    if environment["camel_tools"]["installed_version"] != EXPECTED_CAMEL_TOOLS:
        raise ValueError("Environment manifest camel-tools mismatch")
    if environment["token_map"]["sha256"] != token_sha:
        raise ValueError("Environment manifest token-map SHA mismatch")
    if source["artifact"]["sha256"] != db_sha:
        raise ValueError("Source manifest DB SHA mismatch")
    if sys.version.split()[0] != EXPECTED_PYTHON or struct.calcsize("P") * 8 != 64:
        raise ValueError(f"Runtime must be CPython {EXPECTED_PYTHON} x64")
    if importlib.metadata.version("camel-tools") != EXPECTED_CAMEL_TOOLS:
        raise ValueError("Installed camel-tools version mismatch")
    estimate = preflight_estimate()
    free = shutil.disk_usage(output_dir.parent).free
    if free < estimate["required_free_bytes"]:
        raise RuntimeError(
            f"Insufficient disk: required {estimate['required_free_bytes']} bytes, available {free} bytes"
        )
    return {
        "token_map_sha256": token_sha,
        "db_sha256": db_sha,
        "environment_manifest_sha256": environment_sha,
        "source_manifest_sha256": source_sha,
        "available_free_bytes": free,
        "disk_estimate": estimate,
        "environment": environment,
        "source": source,
    }


def iter_surah_records(token_map: Path) -> Iterator[tuple[int, list[dict]]]:
    current_surah: int | None = None
    records: list[dict] = []
    total = 0
    with token_map.open("r", encoding="utf-8", newline="") as handle:
        for line_number, line in enumerate(handle, start=1):
            record = json.loads(line)
            if record.get("source_sha256") != EXPECTED_SOURCE_SHA256:
                raise ValueError(f"Source SHA mismatch at token-map line {line_number}")
            if record.get("tokenization_rule") != "arabic_word":
                continue
            if not isinstance(record.get("word_index"), int):
                raise ValueError(f"Invalid analysis word_index at token-map line {line_number}")
            forms = record.get("analysis_forms")
            if not isinstance(forms, list) or not forms or forms[0] != record.get("canonical_text"):
                raise ValueError(f"Invalid analysis_forms at token-map line {line_number}")
            surah = int(record["verse_key"].split(":", 1)[0])
            if current_surah is None:
                current_surah = surah
            if surah != current_surah:
                yield current_surah, records
                records = []
                current_surah = surah
            records.append(record)
            total += 1
    if current_surah is not None:
        yield current_surah, records
    if total != EXPECTED_ANALYSIS_WORDS:
        raise ValueError(f"Expected {EXPECTED_ANALYSIS_WORDS} analysis words, found {total}")


def form_profiles(record: dict, form_index: int) -> list[str]:
    profiles: set[str] = set()
    for trace in record.get("normalization_traces", []):
        if trace.get("analysis_form_index") != form_index:
            continue
        for path in trace.get("paths", []):
            profile = path.get("profile")
            if isinstance(profile, str):
                profiles.add(profile)
    return sorted(profiles)


def candidate_signature(candidate: dict) -> str:
    return json.dumps(candidate, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def analyze_word(token_record: dict, analyzer) -> dict:
    forms: list[dict] = []
    unique: dict[str, dict] = {}
    signature_sets: list[set[str]] = []
    total_candidates = 0
    for form_index, form in enumerate(token_record["analysis_forms"]):
        candidates = [dict(candidate) for candidate in analyzer.analyze(form)]
        signatures = {candidate_signature(candidate) for candidate in candidates}
        signature_sets.append(signatures)
        for candidate in candidates:
            unique.setdefault(candidate_signature(candidate), candidate)
        total_candidates += len(candidates)
        forms.append({
            "form_id": "exact" if form_index == 0 else f"analysis_form_{form_index}",
            "form_index": form_index,
            "form": form,
            "profiles": form_profiles(token_record, form_index),
            "has_analysis": bool(candidates),
            "candidate_count": len(candidates),
            "candidates": candidates,
        })
    exact_has = bool(signature_sets[0])
    normalized_has = any(signature_sets[1:])
    normalization_sensitive = any(signatures != signature_sets[0] for signatures in signature_sets[1:])
    return {
        "verse_key": token_record["verse_key"],
        "word_index": token_record["word_index"],
        "canonical_text": token_record["canonical_text"],
        "analysis_forms": forms,
        "unique_candidates": list(unique.values()),
        "exact_has_analysis": exact_has,
        "normalized_has_analysis": normalized_has,
        "normalization_sensitive": normalization_sensitive,
        "no_analysis": not (exact_has or normalized_has),
        "candidate_count_total": total_candidates,
        "candidate_count_unique": len(unique),
    }


def empty_stats(surah: int) -> dict:
    return {
        "surah": surah,
        "word_count": 0,
        "verse_keys": set(),
        "coverage": Counter(),
        "candidate_instances": 0,
        "unique_candidates": 0,
        "candidate_histogram": Counter(),
        "field_present": Counter(),
        "field_informative": Counter(),
        "form_contribution": {},
        "top_tokens": [],
        "uncompressed_bytes": 0,
        "compressed_bytes": 0,
        "sha256": None,
    }


def field_present(candidate: dict, field: str) -> bool:
    return field in candidate and candidate[field] not in (None, "")


def field_informative(candidate: dict, field: str) -> bool:
    return field in candidate and candidate[field] not in UNINFORMATIVE


def update_stats(stats: dict, record: dict, encoded_length: int) -> None:
    stats["word_count"] += 1
    stats["verse_keys"].add(record["verse_key"])
    stats["uncompressed_bytes"] += encoded_length
    exact = record["exact_has_analysis"]
    normalized = record["normalized_has_analysis"]
    any_analysis = exact or normalized
    unique_count = record["candidate_count_unique"]
    stats["coverage"]["exact_has_analysis"] += int(exact)
    stats["coverage"]["any_form_has_analysis"] += int(any_analysis)
    stats["coverage"]["normalize_only"] += int(not exact and normalized)
    stats["coverage"]["no_analysis"] += int(record["no_analysis"])
    stats["coverage"]["normalization_sensitive"] += int(record["normalization_sensitive"])
    stats["coverage"]["single_candidate"] += int(unique_count == 1)
    stats["coverage"]["multiple_candidates"] += int(unique_count > 1)
    stats["coverage"]["zero_candidates"] += int(unique_count == 0)
    stats["candidate_instances"] += record["candidate_count_total"]
    stats["unique_candidates"] += unique_count
    stats["candidate_histogram"][unique_count] += 1
    for candidate in record["unique_candidates"]:
        for field in FIELDS:
            stats["field_present"][field] += int(field_present(candidate, field))
            stats["field_informative"][field] += int(field_informative(candidate, field))
    seen: set[str] = set()
    for form in record["analysis_forms"]:
        profiles = ",".join(form["profiles"])
        key = form["form_id"] if not profiles else f"{form['form_id']}[{profiles}]"
        contribution = stats["form_contribution"].setdefault(key, Counter())
        signatures = {candidate_signature(candidate) for candidate in form["candidates"]}
        contribution["attempted_words"] += 1
        contribution["words_with_analysis"] += int(bool(signatures))
        contribution["candidate_instances"] += len(form["candidates"])
        contribution["incremental_unique_candidates"] += len(signatures - seen)
        seen.update(signatures)
    stats["top_tokens"].append({
        "verse_key": record["verse_key"],
        "word_index": record["word_index"],
        "canonical_text": record["canonical_text"],
        "candidate_count_total": record["candidate_count_total"],
        "candidate_count_unique": unique_count,
    })
    stats["top_tokens"] = top_tokens(stats["top_tokens"], 50)


def identity_sort(token: dict) -> tuple[int, int, int]:
    surah, ayah = (int(value) for value in token["verse_key"].split(":", 1))
    return surah, ayah, token["word_index"]


def top_tokens(tokens: list[dict], limit: int) -> list[dict]:
    return sorted(tokens, key=lambda token: (-token["candidate_count_unique"], identity_sort(token)))[:limit]


def validate_output_record(record: dict, expected: dict, line_number: int) -> None:
    for key in ("verse_key", "word_index", "canonical_text"):
        if record.get(key) != expected.get(key):
            raise ValueError(f"Shard identity mismatch at line {line_number}: {key}")
    forms = record.get("analysis_forms")
    if not isinstance(forms, list) or len(forms) != len(expected["analysis_forms"]):
        raise ValueError(f"Shard form count mismatch at line {line_number}")
    union: dict[str, dict] = {}
    signature_sets: list[set[str]] = []
    total = 0
    for index, (form, expected_text) in enumerate(zip(forms, expected["analysis_forms"], strict=True)):
        if form.get("form_index") != index or form.get("form") != expected_text:
            raise ValueError(f"Shard form identity mismatch at line {line_number}, form {index}")
        candidates = form.get("candidates")
        if not isinstance(candidates, list) or form.get("candidate_count") != len(candidates):
            raise ValueError(f"Shard candidate count mismatch at line {line_number}, form {index}")
        if form.get("has_analysis") is not bool(candidates):
            raise ValueError(f"Shard has_analysis mismatch at line {line_number}, form {index}")
        signatures = {candidate_signature(candidate) for candidate in candidates}
        signature_sets.append(signatures)
        total += len(candidates)
        for candidate in candidates:
            union.setdefault(candidate_signature(candidate), candidate)
    expected_unique = list(union.values())
    if record.get("unique_candidates") != expected_unique:
        raise ValueError(f"Shard unique candidate mismatch at line {line_number}")
    exact = bool(signature_sets[0])
    normalized = any(signature_sets[1:])
    sensitive = any(signatures != signature_sets[0] for signatures in signature_sets[1:])
    expected_flags = {
        "exact_has_analysis": exact,
        "normalized_has_analysis": normalized,
        "normalization_sensitive": sensitive,
        "no_analysis": not (exact or normalized),
        "candidate_count_total": total,
        "candidate_count_unique": len(union),
    }
    for key, value in expected_flags.items():
        if record.get(key) != value:
            raise ValueError(f"Shard aggregate mismatch at line {line_number}: {key}")
    serialized = json.dumps(record, ensure_ascii=False, sort_keys=True).lower()
    for marker in FORBIDDEN_PROVENANCE:
        if marker in serialized:
            raise ValueError(f"Forbidden provenance marker {marker!r} at line {line_number}")
    for candidate in record["unique_candidates"]:
        if "meaning_tr" in candidate or "gloss_en" in candidate:
            raise ValueError(f"Forbidden enriched field at line {line_number}")


def validate_shard(path: Path, expected_records: list[dict], surah: int) -> dict:
    if not path.is_file() or path.stat().st_size <= 0:
        raise ValueError(f"Missing or empty shard: {path}")
    with path.open("rb") as raw:
        header = raw.read(8)
    if len(header) < 8 or header[:2] != b"\x1f\x8b" or header[4:8] != b"\x00\x00\x00\x00":
        raise ValueError(f"Shard does not have deterministic gzip mtime=0: {path}")
    stats = empty_stats(surah)
    with gzip.open(path, "rt", encoding="utf-8", newline="") as handle:
        for line_number, pair in enumerate(zip_longest(handle, expected_records), start=1):
            line, expected = pair
            if line is None or expected is None:
                raise ValueError(f"Shard record count mismatch for surah {surah}")
            record = json.loads(line)
            validate_output_record(record, expected, line_number)
            update_stats(stats, record, len(line.encode("utf-8")))
    expected_verses = {record["verse_key"] for record in expected_records}
    if stats["verse_keys"] != expected_verses:
        raise ValueError(f"Shard verse coverage mismatch for surah {surah}")
    stats["compressed_bytes"] = path.stat().st_size
    stats["sha256"] = sha256_file(path)
    return stats


def write_shard(path: Path, token_records: list[dict], analyzer, surah: int) -> dict:
    tmp_path = path.with_name(path.name + ".tmp")
    if tmp_path.exists():
        tmp_path.unlink()
    path.parent.mkdir(parents=True, exist_ok=True)
    with tmp_path.open("xb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=6, mtime=0) as compressed:
            writer = io.TextIOWrapper(compressed, encoding="utf-8", newline="\n", write_through=False)
            try:
                for token_record in token_records:
                    writer.write(json_bytes(analyze_word(token_record, analyzer)).decode("utf-8"))
                writer.flush()
            finally:
                writer.detach()
    stats = validate_shard(tmp_path, token_records, surah)
    os.replace(tmp_path, path)
    final_hash = sha256_file(path)
    if final_hash != stats["sha256"] or path.stat().st_size != stats["compressed_bytes"]:
        raise ValueError(f"Atomic shard move changed bytes for surah {surah}")
    return stats


def merge_stats(all_stats: Iterable[dict]) -> dict:
    merged = empty_stats(0)
    for stats in all_stats:
        merged["word_count"] += stats["word_count"]
        merged["verse_keys"].update(stats["verse_keys"])
        merged["coverage"].update(stats["coverage"])
        merged["candidate_instances"] += stats["candidate_instances"]
        merged["unique_candidates"] += stats["unique_candidates"]
        merged["candidate_histogram"].update(stats["candidate_histogram"])
        merged["field_present"].update(stats["field_present"])
        merged["field_informative"].update(stats["field_informative"])
        for key, value in stats["form_contribution"].items():
            merged["form_contribution"].setdefault(key, Counter()).update(value)
        merged["top_tokens"].extend(stats["top_tokens"])
        merged["top_tokens"] = top_tokens(merged["top_tokens"], 50)
        merged["uncompressed_bytes"] += stats["uncompressed_bytes"]
        merged["compressed_bytes"] += stats["compressed_bytes"]
    return merged


def percentage(numerator: int, denominator: int) -> float:
    return round(100.0 * numerator / denominator, 4) if denominator else 0.0


def finalized_field_coverage(stats: dict) -> dict:
    denominator = stats["unique_candidates"]
    return {
        field: {
            "key_present_count": stats["field_present"][field],
            "key_present_percent": percentage(stats["field_present"][field], denominator),
            "informative_count": stats["field_informative"][field],
            "informative_percent": percentage(stats["field_informative"][field], denominator),
        }
        for field in FIELDS
    }


def shard_manifest_entry(stats: dict) -> dict:
    coverage = stats["coverage"]
    return {
        "surah": stats["surah"],
        "filename": f"surah-{stats['surah']:03d}.jsonl.gz",
        "word_count": stats["word_count"],
        "verse_count": len(stats["verse_keys"]),
        "compressed_bytes": stats["compressed_bytes"],
        "uncompressed_bytes": stats["uncompressed_bytes"],
        "sha256": stats["sha256"],
        "exact_has_analysis": coverage["exact_has_analysis"],
        "any_form_has_analysis": coverage["any_form_has_analysis"],
        "normalize_only": coverage["normalize_only"],
        "no_analysis": coverage["no_analysis"],
        "normalization_sensitive": coverage["normalization_sensitive"],
        "single_candidate": coverage["single_candidate"],
        "multiple_candidates": coverage["multiple_candidates"],
        "candidate_instances": stats["candidate_instances"],
        "unique_candidates": stats["unique_candidates"],
    }


def distribution(stats: dict) -> dict:
    values: list[int] = []
    for candidate_count, frequency in sorted(stats["candidate_histogram"].items()):
        values.extend([candidate_count] * frequency)
    if not values:
        return {"average": 0.0, "median": 0.0, "p95": 0, "maximum": 0}
    p95_index = max(0, math.ceil(0.95 * len(values)) - 1)
    return {
        "average": round(statistics.fmean(values), 4),
        "median": statistics.median(values),
        "p95": values[p95_index],
        "maximum": values[-1],
    }


def global_totals(stats: dict) -> dict:
    coverage = stats["coverage"]
    words = stats["word_count"]
    return {
        "analysis_words": words,
        "verses_with_analysis_words": len(stats["verse_keys"]),
        "exact_has_analysis": coverage["exact_has_analysis"],
        "exact_coverage_percent": percentage(coverage["exact_has_analysis"], words),
        "any_form_has_analysis": coverage["any_form_has_analysis"],
        "any_form_coverage_percent": percentage(coverage["any_form_has_analysis"], words),
        "normalize_only": coverage["normalize_only"],
        "normalize_only_percent": percentage(coverage["normalize_only"], words),
        "no_analysis": coverage["no_analysis"],
        "no_analysis_percent": percentage(coverage["no_analysis"], words),
        "normalization_sensitive": coverage["normalization_sensitive"],
        "single_candidate": coverage["single_candidate"],
        "multiple_candidates": coverage["multiple_candidates"],
        "zero_candidates": coverage["zero_candidates"],
        "candidate_instances": stats["candidate_instances"],
        "unique_candidates": stats["unique_candidates"],
        "candidate_count_distribution": distribution(stats),
        "compressed_bytes": stats["compressed_bytes"],
        "uncompressed_bytes": stats["uncompressed_bytes"],
    }


def finalized_form_contribution(stats: dict) -> dict:
    return {
        key: dict(sorted(value.items()))
        for key, value in sorted(stats["form_contribution"].items())
    }


def write_json_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(path.name + ".tmp")
    tmp_path.write_bytes(json_bytes(value))
    os.replace(tmp_path, path)


def write_progress(output_dir: Path, status: str, completed: list[int], current: int | None, warnings: list[str], errors: list[str]) -> None:
    write_json_atomic(output_dir / "progress.json", {
        "schema_version": "camel-morph-full-progress-v1",
        "status": status,
        "completed_surahs": completed,
        "current_surah": current,
        "warnings": warnings,
        "errors": errors,
    })


def install_camel_data_stub() -> None:
    if "camel_tools.data" not in sys.modules:
        stub = types.ModuleType("camel_tools.data")
        stub.CATALOGUE = None
        sys.modules["camel_tools.data"] = stub


def block_network() -> None:
    def blocked(*_args, **_kwargs):
        raise RuntimeError("Network access is disabled during full Camel Morph analysis")

    class OfflineSocket(socket.socket):
        def connect(self, *_args, **_kwargs):
            blocked()

        def connect_ex(self, *_args, **_kwargs):
            blocked()

    socket.socket = OfflineSocket
    socket.create_connection = blocked


def load_analyzer(db_path: Path):
    install_camel_data_stub()
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    block_network()
    database = MorphologyDB(str(db_path), flags="a")
    return Analyzer(database)


def collect_determinism_records(token_map: Path) -> dict[int, list[dict]]:
    wanted = set(DETERMINISM_SURAHS)
    return {surah: records for surah, records in iter_surah_records(token_map) if surah in wanted}


def run_determinism_check(output_dir: Path, token_map: Path, analyzer) -> list[dict]:
    check_dir = output_dir / ".determinism-check"
    if check_dir.exists():
        shutil.rmtree(check_dir)
    check_dir.mkdir(parents=True)
    results: list[dict] = []
    records_by_surah = collect_determinism_records(token_map)
    try:
        for surah, reason in DETERMINISM_SURAHS.items():
            check_path = check_dir / f"surah-{surah:03d}.jsonl.gz"
            write_shard(check_path, records_by_surah[surah], analyzer, surah)
            final_path = output_dir / f"surah-{surah:03d}.jsonl.gz"
            check_hash = sha256_file(check_path)
            final_hash = sha256_file(final_path)
            if check_path.read_bytes() != final_path.read_bytes():
                raise ValueError(f"Determinism byte mismatch for surah {surah}")
            results.append({
                "surah": surah,
                "reason": reason,
                "byte_identical": True,
                "sha256": final_hash,
                "rebuild_sha256": check_hash,
            })
    finally:
        if check_dir.exists():
            shutil.rmtree(check_dir)
    return results


def source_versions(preflight: dict) -> dict:
    source = preflight["source"]
    return {
        "python": EXPECTED_PYTHON,
        "camel_tools": EXPECTED_CAMEL_TOOLS,
        "camel_morph_release": source["source"]["release"],
        "camel_morph_repository_commit": source["source"]["repository_commit"],
        "camel_morph_db_filename": source["artifact"]["filename"],
        "camel_morph_db_license": source["license"]["spdx_equivalent"],
    }


def build_manifest(preflight: dict, script_sha: str, shard_stats: list[dict], merged: dict, determinism: list[dict]) -> dict:
    validator_sha = sha256_file(VALIDATOR_PATH) if VALIDATOR_PATH.is_file() else None
    return {
        "schema_version": "camel-morph-full-analysis-v1",
        "candidate_only": True,
        "disambiguated": False,
        "production_approved": False,
        "output_distribution_rights": "unresolved",
        "token_map_sha256": preflight["token_map_sha256"],
        "db_sha256": preflight["db_sha256"],
        "environment_manifest_sha256": preflight["environment_manifest_sha256"],
        "source_manifest_sha256": preflight["source_manifest_sha256"],
        "source_versions": source_versions(preflight),
        "analysis_script_sha256": script_sha,
        "validator_script_sha256": validator_sha,
        "gzip": {"mtime": 0, "compresslevel": 6, "filename_header": ""},
        "preflight_disk_estimate": preflight["disk_estimate"],
        "shards": [shard_manifest_entry(stats) for stats in shard_stats],
        "global_totals": global_totals(merged),
        "field_coverage_over_unique_candidates": finalized_field_coverage(merged),
        "analysis_form_contribution": finalized_form_contribution(merged),
        "determinism_samples": determinism,
    }


def build_summary(manifest: dict, merged: dict, shard_stats: list[dict], warnings: list[str], errors: list[str]) -> dict:
    totals = manifest["global_totals"]
    return {
        "schema_version": "camel-morph-full-analysis-summary-v1",
        "candidate_only": True,
        "disambiguated": False,
        "production_approved": False,
        "output_distribution_rights": "unresolved",
        "all_77429_words_processed": totals["analysis_words"] == EXPECTED_ANALYSIS_WORDS,
        "coverage": {
            key: totals[key]
            for key in (
                "exact_has_analysis", "exact_coverage_percent", "any_form_has_analysis",
                "any_form_coverage_percent", "normalize_only", "normalize_only_percent",
                "no_analysis", "no_analysis_percent", "normalization_sensitive",
            )
        },
        "candidate_statistics": {
            "single_candidate": totals["single_candidate"],
            "multiple_candidates": totals["multiple_candidates"],
            "zero_candidates": totals["zero_candidates"],
            "candidate_instances": totals["candidate_instances"],
            "unique_candidates": totals["unique_candidates"],
            **totals["candidate_count_distribution"],
        },
        "top_50_highest_candidate_tokens": merged["top_tokens"],
        "field_coverage_over_unique_candidates": manifest["field_coverage_over_unique_candidates"],
        "surah_coverage": [shard_manifest_entry(stats) for stats in shard_stats],
        "analysis_form_contribution": manifest["analysis_form_contribution"],
        "output_size": {
            "compressed_bytes": totals["compressed_bytes"],
            "uncompressed_bytes": totals["uncompressed_bytes"],
            "shard_count": len(shard_stats),
        },
        "warnings": warnings,
        "errors": errors,
    }


def run(args: argparse.Namespace) -> dict:
    token_map = require_exact(args.token_map, TOKEN_MAP, "token map")
    db_path = require_exact(args.db, DB_PATH, "Camel Morph DB")
    environment_path = require_exact(args.environment_manifest, ENVIRONMENT_MANIFEST, "environment manifest")
    source_path = require_exact(args.source_manifest, SOURCE_MANIFEST, "source manifest")
    output_dir = require_candidate_path(args.output_dir, OUTPUT_DIR, "full-analysis output")
    summary_path = require_candidate_path(args.summary, SUMMARY_PATH, "full-analysis summary")
    preflight = validate_preflight(token_map, db_path, environment_path, source_path, output_dir)
    if args.preflight_only:
        return {key: value for key, value in preflight.items() if key not in {"environment", "source"}}

    output_dir.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []
    errors: list[str] = []
    completed: list[int] = []
    write_progress(output_dir, "running", completed, 1, warnings, errors)
    analyzer = load_analyzer(db_path)
    shard_stats: list[dict] = []
    try:
        for expected_surah, (surah, records) in enumerate(iter_surah_records(token_map), start=1):
            if surah != expected_surah:
                raise ValueError(f"Expected surah {expected_surah}, found {surah}")
            write_progress(output_dir, "running", completed, surah, warnings, errors)
            shard_path = output_dir / f"surah-{surah:03d}.jsonl.gz"
            if shard_path.exists():
                try:
                    stats = validate_shard(shard_path, records, surah)
                except Exception as exc:
                    warnings.append(f"surah-{surah:03d}: invalid existing shard regenerated: {type(exc).__name__}")
                    stats = write_shard(shard_path, records, analyzer, surah)
            else:
                stats = write_shard(shard_path, records, analyzer, surah)
            shard_stats.append(stats)
            completed.append(surah)
            write_progress(output_dir, "running", completed, None, warnings, errors)
        if len(shard_stats) != EXPECTED_SURAHS:
            raise ValueError(f"Expected {EXPECTED_SURAHS} shards, found {len(shard_stats)}")
        merged = merge_stats(shard_stats)
        if merged["word_count"] != EXPECTED_ANALYSIS_WORDS:
            raise ValueError(f"Expected {EXPECTED_ANALYSIS_WORDS} words, found {merged['word_count']}")
        determinism = run_determinism_check(output_dir, token_map, analyzer)
        script_sha = sha256_file(Path(__file__).resolve())
        manifest = build_manifest(preflight, script_sha, shard_stats, merged, determinism)
        summary = build_summary(manifest, merged, shard_stats, warnings, errors)
        write_json_atomic(output_dir / "run-manifest.json", manifest)
        write_json_atomic(summary_path, summary)
        write_progress(output_dir, "completed", completed, None, warnings, errors)
        return {
            "status": "completed",
            "analysis_words": merged["word_count"],
            "shards": len(shard_stats),
            "compressed_bytes": merged["compressed_bytes"],
            "run_manifest_sha256": sha256_file(output_dir / "run-manifest.json"),
            "summary_sha256": sha256_file(summary_path),
        }
    except Exception as exc:
        errors.append(f"{type(exc).__name__}: {exc}")
        write_progress(output_dir, "failed", completed, None, warnings, errors)
        raise


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-map", type=Path, required=True)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--environment-manifest", type=Path, required=True)
    parser.add_argument("--source-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--summary", type=Path, required=True)
    parser.add_argument("--preflight-only", action="store_true")
    return parser.parse_args(argv)


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
