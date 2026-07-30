#!/usr/bin/env python3
"""Run a bounded, independent Camel Morph MSA candidate-coverage smoke test."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import socket
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Callable, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
CANDIDATE_ROOT = REPO_ROOT / "data/candidates/morphology/camel-morph-msa-v1.0"
TOKEN_MAP = CANDIDATE_ROOT / "token-map.jsonl"
DB_PATH = CANDIDATE_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
ENVIRONMENT_MANIFEST = CANDIDATE_ROOT / "environment-manifest.json"
SOURCE_MANIFEST = DB_PATH.parent / "source-manifest.json"
REPORT_PATH = REPO_ROOT / "data/candidates/morphology/reports/camel-morph-smoke-test.json"
ANALYSES_PATH = CANDIDATE_ROOT / "smoke/all-analyses.jsonl"
RUNTIME_HOME = CANDIDATE_ROOT / "runtime/user-profile"
CAMELTOOLS_DATA = CANDIDATE_ROOT / "runtime/camel-tools-data"

EXPECTED_TOKEN_SHA256 = "2f56784c102bec10a6ed58a54cc099631fa740c782c47d9b42a3d77e78348329"
EXPECTED_DB_SHA256 = "110e03baa282874062d076e23d9671e985b6f76520b891d58cba4e55de0b8f60"
EXPECTED_SOURCE_SHA256 = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326"
EXPECTED_ANALYSIS_WORDS = 77_429
MAX_WORDS_LIMIT = 300

FEATURE_FIELDS = (
    "root", "lex", "pos", "cas", "mod", "vox", "asp", "per", "gen",
    "num", "stt", "stem", "prc3", "prc2", "prc1.5", "prc1", "prc0", "enc0",
)
PROCLITIC_FIELDS = ("prc3", "prc2", "prc1.5", "prc1", "prc0")
ENCLITIC_FIELDS = ("enc0",)
UNINFORMATIVE_VALUES = {None, "", "0", "na"}

ORTHOGRAPHIC_ANCHORS = {
    ("2:2", 2): "noun_likely_anchor",
    ("2:2", 3): "particle_likely_anchor",
    ("2:3", 2): "verb_likely_anchor",
    ("2:255", 1): "proper_noun_likely_anchor",
    ("2:255", 2): "particle_likely_anchor",
    ("2:255", 4): "particle_likely_anchor",
    ("112:1", 1): "verb_likely_anchor",
    ("112:1", 3): "proper_noun_likely_anchor",
}


def _resolved(path: Path) -> Path:
    return path.resolve(strict=False)


def _require_exact(actual: Path, expected: Path, label: str) -> Path:
    actual_resolved = _resolved(actual)
    expected_resolved = _resolved(expected)
    if actual_resolved != expected_resolved:
        raise ValueError(f"{label} must be exactly {expected_resolved}")
    return actual_resolved


def _require_candidate_output(path: Path, expected: Path, label: str) -> Path:
    resolved = _require_exact(path, expected, label)
    candidate_data_root = _resolved(REPO_ROOT / "data/candidates/morphology")
    if candidate_data_root not in resolved.parents:
        raise ValueError(f"{label} must remain below {candidate_data_root}")
    if resolved.exists():
        raise FileExistsError(f"Refusing to overwrite existing {label}: {resolved}")
    return resolved


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def _configure_candidate_runtime() -> None:
    catalogue = CAMELTOOLS_DATA / "catalogue.json"
    if not catalogue.is_file():
        raise FileNotFoundError(f"Pinned offline catalogue is missing: {catalogue}")
    RUNTIME_HOME.mkdir(parents=True, exist_ok=True)
    os.environ["USERPROFILE"] = str(RUNTIME_HOME)
    os.environ["CAMELTOOLS_DATA"] = str(CAMELTOOLS_DATA)


def _block_network() -> None:
    def blocked(*_args, **_kwargs):
        raise RuntimeError("Network access is disabled during Camel Morph smoke analysis")

    class OfflineSocket(socket.socket):
        def connect(self, *_args, **_kwargs):
            blocked()

        def connect_ex(self, *_args, **_kwargs):
            blocked()

    socket.socket = OfflineSocket
    socket.create_connection = blocked


def _load_analysis_words(path: Path) -> list[dict]:
    records: list[dict] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        for line_number, line in enumerate(handle, start=1):
            record = json.loads(line)
            if record.get("source_sha256") != EXPECTED_SOURCE_SHA256:
                raise ValueError(f"Token source SHA mismatch at line {line_number}")
            if record.get("tokenization_rule") != "arabic_word":
                continue
            if not isinstance(record.get("word_index"), int):
                raise ValueError(f"Analysis word has invalid word_index at line {line_number}")
            forms = record.get("analysis_forms")
            if not isinstance(forms, list) or not forms or forms[0] != record.get("canonical_text"):
                raise ValueError(f"Analysis forms do not begin with canonical exact form at line {line_number}")
            records.append(record)
    if len(records) != EXPECTED_ANALYSIS_WORDS:
        raise ValueError(f"Expected {EXPECTED_ANALYSIS_WORDS} analysis words, found {len(records)}")
    return records


def _evenly_spaced(records: list[dict], count: int) -> list[dict]:
    if count <= 0 or not records:
        return []
    if len(records) <= count:
        return records
    if count == 1:
        return [records[0]]
    return [records[round(index * (len(records) - 1) / (count - 1))] for index in range(count)]


def _combining_count(text: str) -> int:
    return sum(1 for char in text if unicodedata.combining(char))


def _has_uthmani_mark(text: str) -> bool:
    return any(0x06D6 <= ord(char) <= 0x06ED for char in text)


def _has_alif_hamza_variant(text: str) -> bool:
    return any(char in "اآأإؤئءٱ" for char in text)


def _trace_reasons(record: dict) -> set[str]:
    reasons: set[str] = set()
    for trace in record.get("normalization_traces", []):
        for path in trace.get("paths", []):
            for operation in path.get("operations", []):
                reason = operation.get("reason")
                if isinstance(reason, str):
                    reasons.add(reason)
    return reasons


def _select_sample(records: list[dict], limit: int) -> list[dict]:
    selected: dict[tuple[str, int], dict] = {}
    reasons: dict[tuple[str, int], set[str]] = {}

    def add(record: dict, reason: str) -> None:
        key = (record["verse_key"], record["word_index"])
        selected.setdefault(key, record)
        reasons.setdefault(key, set()).add(reason)

    for record in records[:40]:
        add(record, "post_fatiha_first_lexical")

    by_identity = {(record["verse_key"], record["word_index"]): record for record in records}
    for identity, reason in ORTHOGRAPHIC_ANCHORS.items():
        if identity not in by_identity:
            raise ValueError(f"Missing fixed lexical anchor {identity}")
        add(by_identity[identity], reason)

    buckets: tuple[tuple[str, Callable[[dict], bool]], ...] = (
        ("hamzat_al_wasl", lambda record: "ٱ" in record["canonical_text"]),
        ("dagger_alif", lambda record: "ٰ" in record["canonical_text"]),
        ("alif_hamza_variant", lambda record: _has_alif_hamza_variant(record["canonical_text"])),
        ("heavy_vocalization", lambda record: _combining_count(record["canonical_text"]) >= 4),
        ("uthmani_mark", lambda record: _has_uthmani_mark(record["canonical_text"])),
        ("multiple_analysis_forms", lambda record: len(record["analysis_forms"]) > 1),
        ("normalization_operation", lambda record: bool(_trace_reasons(record))),
    )
    for reason, predicate in buckets:
        matches = [record for record in records if predicate(record)]
        for record in _evenly_spaced(matches, 24):
            add(record, reason)

    for record in _evenly_spaced(records, limit):
        if len(selected) >= limit:
            break
        add(record, "fixed_interval")

    if len(selected) < limit:
        for record in records:
            if len(selected) >= limit:
                break
            add(record, "deterministic_fill")

    ordered = list(selected.items())[:limit]
    sample: list[dict] = []
    for key, record in ordered:
        copied = dict(record)
        copied["selection_reasons"] = sorted(reasons[key])
        sample.append(copied)
    if len(sample) != limit:
        raise ValueError(f"Expected deterministic sample of {limit}, found {len(sample)}")
    return sample


def _form_profiles(record: dict, form_index: int) -> list[str]:
    profiles: set[str] = set()
    for trace in record.get("normalization_traces", []):
        if trace.get("analysis_form_index") == form_index:
            for path in trace.get("paths", []):
                profile = path.get("profile")
                if isinstance(profile, str):
                    profiles.add(profile)
    return sorted(profiles)


def _candidate_signature(candidate: dict) -> str:
    return json.dumps(candidate, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _field_present(candidate: dict, field: str) -> bool:
    return field in candidate and candidate[field] not in (None, "")


def _field_informative(candidate: dict, field: str) -> bool:
    return field in candidate and candidate[field] not in UNINFORMATIVE_VALUES


def _percentage(numerator: int, denominator: int) -> float:
    return round(100.0 * numerator / denominator, 4) if denominator else 0.0


def _analyse(sample: list[dict], analyzer, analyses_path: Path) -> dict:
    token_counts: list[int] = []
    field_present = Counter()
    field_informative = Counter()
    coverage = Counter()
    selection_coverage = Counter()
    total_candidate_instances = 0
    total_unique_candidates = 0
    max_candidate_identity: dict | None = None
    max_candidate_count = -1

    analyses_path.parent.mkdir(parents=True, exist_ok=True)
    with analyses_path.open("x", encoding="utf-8", newline="\n") as output:
        for sample_index, record in enumerate(sample, start=1):
            form_results = []
            union: dict[str, dict] = {}
            signature_sets: list[set[str]] = []
            for form_index, form in enumerate(record["analysis_forms"]):
                candidates = [dict(candidate) for candidate in analyzer.analyze(form)]
                signatures = {_candidate_signature(candidate) for candidate in candidates}
                signature_sets.append(signatures)
                for signature, candidate in zip(
                    (_candidate_signature(candidate) for candidate in candidates), candidates, strict=True
                ):
                    union.setdefault(signature, candidate)
                total_candidate_instances += len(candidates)
                form_results.append({
                    "form_index": form_index,
                    "kind": "exact" if form_index == 0 else "controlled_normalized",
                    "form": form,
                    "profiles": _form_profiles(record, form_index),
                    "candidate_count": len(candidates),
                    "candidates": candidates,
                })

            exact_hit = bool(signature_sets[0])
            normalized_hit = any(signature_sets[1:])
            any_hit = exact_hit or normalized_hit
            changed_set = any(signatures != signature_sets[0] for signatures in signature_sets[1:])
            unique_candidates = list(union.values())
            unique_count = len(unique_candidates)
            token_counts.append(unique_count)
            total_unique_candidates += unique_count

            coverage["exact_found"] += int(exact_hit)
            coverage["normalized_form_found"] += int(normalized_hit)
            coverage["normalize_only_found"] += int(not exact_hit and normalized_hit)
            coverage["any_form_found"] += int(any_hit)
            coverage["no_form_found"] += int(not any_hit)
            coverage["single_candidate"] += int(unique_count == 1)
            coverage["multiple_candidates"] += int(unique_count > 1)
            coverage["zero_candidates"] += int(unique_count == 0)
            coverage["normalization_changed_candidate_set"] += int(changed_set)

            for reason in record["selection_reasons"]:
                selection_coverage[reason] += 1
            for candidate in unique_candidates:
                for field in FEATURE_FIELDS:
                    field_present[field] += int(_field_present(candidate, field))
                    field_informative[field] += int(_field_informative(candidate, field))

            if unique_count > max_candidate_count:
                max_candidate_count = unique_count
                max_candidate_identity = {
                    "verse_key": record["verse_key"],
                    "word_index": record["word_index"],
                    "canonical_text": record["canonical_text"],
                }

            output_record = {
                "sample_index": sample_index,
                "verse_key": record["verse_key"],
                "word_index": record["word_index"],
                "canonical_text": record["canonical_text"],
                "codepoint_start": record["codepoint_start"],
                "codepoint_end": record["codepoint_end"],
                "selection_reasons": record["selection_reasons"],
                "exact_found": exact_hit,
                "normalize_only_found": not exact_hit and normalized_hit,
                "normalization_changed_candidate_set": changed_set,
                "unique_candidate_count_across_forms": unique_count,
                "forms": form_results,
                "correct_candidate_selected": False,
            }
            output.write(json.dumps(output_record, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
            output.write("\n")

    field_coverage = {}
    for field in FEATURE_FIELDS:
        field_coverage[field] = {
            "key_present_count": field_present[field],
            "key_present_percent": _percentage(field_present[field], total_unique_candidates),
            "informative_count": field_informative[field],
            "informative_percent": _percentage(field_informative[field], total_unique_candidates),
        }

    proclitic_any = 0
    enclitic_any = 0
    with analyses_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            for form in json.loads(line)["forms"]:
                for candidate in form["candidates"]:
                    proclitic_any += int(any(_field_informative(candidate, field) for field in PROCLITIC_FIELDS))
                    enclitic_any += int(any(_field_informative(candidate, field) for field in ENCLITIC_FIELDS))

    return {
        "sample_words": len(sample),
        "sample_surahs": len({record["verse_key"].split(":", 1)[0] for record in sample}),
        "selection_reason_counts": dict(sorted(selection_coverage.items())),
        "coverage": {
            **dict(coverage),
            "exact_percent": _percentage(coverage["exact_found"], len(sample)),
            "any_form_percent": _percentage(coverage["any_form_found"], len(sample)),
            "normalize_only_percent": _percentage(coverage["normalize_only_found"], len(sample)),
        },
        "candidates": {
            "candidate_instances_across_all_forms": total_candidate_instances,
            "unique_candidates_across_forms": total_unique_candidates,
            "average_unique_candidates_per_word": round(sum(token_counts) / len(token_counts), 4),
            "maximum_unique_candidates_for_one_word": max_candidate_count,
            "maximum_candidate_word": max_candidate_identity,
        },
        "field_coverage_over_unique_candidates": field_coverage,
        "clitic_informative_instances_over_all_form_candidates": {
            "proclitic_any": proclitic_any,
            "enclitic_any": enclitic_any,
            "denominator": total_candidate_instances,
            "proclitic_any_percent": _percentage(proclitic_any, total_candidate_instances),
            "enclitic_any_percent": _percentage(enclitic_any, total_candidate_instances),
        },
    }


def _write_json_new(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        handle.write("\n")


def run(args: argparse.Namespace) -> dict:
    if not 1 <= args.max_words <= MAX_WORDS_LIMIT:
        raise ValueError(f"--max-words must be between 1 and {MAX_WORDS_LIMIT}")
    token_map = _require_exact(args.token_map, TOKEN_MAP, "token map")
    db_path = _require_exact(args.db, DB_PATH, "morphology DB")
    environment_manifest = _require_exact(args.environment_manifest, ENVIRONMENT_MANIFEST, "environment manifest")
    source_manifest = _require_exact(args.source_manifest, SOURCE_MANIFEST, "source manifest")
    report_path = _require_candidate_output(args.report, REPORT_PATH, "smoke report")
    analyses_path = _require_candidate_output(args.analyses, ANALYSES_PATH, "raw analyses")

    token_sha = _sha256(token_map)
    db_sha = _sha256(db_path)
    if token_sha != EXPECTED_TOKEN_SHA256:
        raise ValueError(f"Token-map SHA mismatch: {token_sha}")
    if db_sha != EXPECTED_DB_SHA256:
        raise ValueError(f"DB SHA mismatch: {db_sha}")

    environment = _json(environment_manifest)
    source = _json(source_manifest)
    if environment.get("status") != "ready_for_smoke":
        raise ValueError("Environment manifest is not ready_for_smoke")
    if environment["token_map"]["sha256"] != token_sha:
        raise ValueError("Environment manifest token SHA mismatch")
    if source["artifact"]["sha256"] != db_sha:
        raise ValueError("Source manifest DB SHA mismatch")
    if source.get("production_approved") is not False:
        raise ValueError("Source manifest production boundary is not explicit")

    records = _load_analysis_words(token_map)
    sample = _select_sample(records, args.max_words)

    _configure_candidate_runtime()
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    _block_network()
    database = MorphologyDB(str(db_path), flags="a")
    analyzer = Analyzer(database)
    analysis_summary = _analyse(sample, analyzer, analyses_path)

    report = {
        "schema_version": "camel-morph-smoke-v1",
        "candidate_only": True,
        "internal_poc_only": True,
        "production_approved": False,
        "disambiguation_used": False,
        "correct_candidate_selected": False,
        "network_allowed_during_analysis": False,
        "sample_policy": "deterministic positional and orthographic sampling; no legacy or analyzer-result-based selection",
        "python_version": sys.version.split()[0],
        "camel_tools_version": importlib.metadata.version("camel-tools"),
        "token_map": {"sha256": token_sha, "analysis_words": len(records)},
        "database": {"sha256": db_sha, "bytes": db_path.stat().st_size, "format": "CAMeL/ALMOR"},
        "outputs": {"all_analyses_jsonl": analyses_path.relative_to(REPO_ROOT).as_posix()},
        **analysis_summary,
    }
    _write_json_new(report_path, report)
    return report


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-map", type=Path, required=True)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--environment-manifest", type=Path, required=True)
    parser.add_argument("--source-manifest", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--analyses", type=Path, required=True)
    parser.add_argument("--max-words", type=int, default=MAX_WORDS_LIMIT)
    return parser.parse_args(argv)


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), ensure_ascii=True, sort_keys=True))
