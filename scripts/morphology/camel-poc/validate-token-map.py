#!/usr/bin/env python3
"""Validate a Camel Morph PoC token map against the immutable Tanzil source."""

from __future__ import annotations

import argparse
import hashlib
import json
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Sequence


REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_RELATIVE = Path("data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt")
MANIFEST_RELATIVE = Path("data/vendor/tanzil/uthmani-1.1/manifest.json")
CANDIDATE_RELATIVE = Path("data/candidates/morphology")

EXPECTED_COUNTS = {
    "total_spans": 82_459,
    "standalone_quran_signs": 4_578,
    "opening_basmala_words": 448,
    "analysis_words": 77_433,
}
EXPECTED_VERSES = 6_236
EXPECTED_PROFILES = (
    "exact",
    "quran_marks_conservative",
    "wasl_standardized",
    "alif_folded",
    "undia",
    "dagger_alif_expanded",
)
STANDALONE_QURAN_SIGNS = frozenset("\u06d6\u06d7\u06d8\u06d9\u06da\u06db\u06dc\u06de\u06e9")
BASMALA_SIGNATURE = ("\u0628\u0633\u0645", "\u0627\u0644\u0644\u0647", "\u0627\u0644\u0631\u062d\u0645\u0646", "\u0627\u0644\u0631\u062d\u064a\u0645")
FORBIDDEN_OUTPUT_MARKERS = (
    "canonical_word_analysis",
    "data/app.db",
    "quran-morphology",
    "mustafa0x",
    "eqtb",
    "qul",
    "qac",
)


@dataclass(frozen=True)
class Verse:
    surah: int
    ayah: int
    text: str

    @property
    def key(self) -> str:
        return f"{self.surah}:{self.ayah}"


def _resolved(path: Path) -> Path:
    return path.expanduser().resolve(strict=False)


def _assert_exact(path: Path, expected: Path, label: str) -> Path:
    resolved = _resolved(path)
    if resolved != _resolved(expected):
        raise ValueError(f"{label} must be exactly {expected}")
    return resolved


def _assert_candidate(path: Path, repo_root: Path, label: str) -> Path:
    resolved = _resolved(path)
    candidate_root = _resolved(repo_root / CANDIDATE_RELATIVE)
    if resolved == candidate_root or candidate_root not in resolved.parents:
        raise ValueError(f"{label} must be below {candidate_root}")
    return resolved


def _load_source(source_path: Path, manifest_path: Path) -> tuple[list[Verse], str]:
    manifest = json.loads(manifest_path.read_bytes().decode("utf-8"))
    source_bytes = source_path.read_bytes()
    source_sha256 = hashlib.sha256(source_bytes).hexdigest()
    if manifest.get("sha256") != source_sha256 or manifest.get("verseCount") != EXPECTED_VERSES:
        raise ValueError("Source hash or verse count does not match manifest")
    verses: list[Verse] = []
    for physical_line, line in enumerate(source_bytes.decode("utf-8").splitlines(), start=1):
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 2)
        if len(parts) != 3 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError(f"Invalid source line {physical_line}")
        text = parts[2]
        if not text or text != text.strip() or "  " in text or any(character.isspace() and character != " " for character in text):
            raise ValueError(f"Invalid canonical whitespace at {parts[0]}:{parts[1]}")
        verses.append(Verse(int(parts[0]), int(parts[1]), text))
    if len(verses) != EXPECTED_VERSES:
        raise ValueError("Canonical source does not contain 6,236 verses")
    return verses, source_sha256


def _spans(text: str) -> Iterator[tuple[int, int, str]]:
    start = 0
    for index, character in enumerate(text):
        if character == " ":
            if index == start:
                raise ValueError("Empty canonical span")
            yield start, index, text[start:index]
            start = index + 1
    if start >= len(text):
        raise ValueError("Trailing canonical whitespace")
    yield start, len(text), text[start:]


def _fold_basmala(value: str) -> str:
    output: list[str] = []
    for character in value:
        if character == "\u0640" or unicodedata.category(character).startswith("M"):
            continue
        output.append("\u0627" if character in {"\u0622", "\u0623", "\u0625", "\u0671"} else character)
    return "".join(output)


def _windows(parts: Sequence[str]) -> set[int]:
    return {
        index
        for index in range(max(0, len(parts) - 3))
        if tuple(_fold_basmala(part) for part in parts[index:index + 4]) == BASMALA_SIGNATURE
    }


def _expected_records(verses: Sequence[Verse]) -> Iterator[dict]:
    opening_count = 0
    excluded_opening_count = 0
    for verse in verses:
        spans = list(_spans(verse.text))
        parts = [part for _, _, part in spans]
        windows = _windows(parts)
        expected_opening = verse.ayah == 1 and verse.surah != 9
        if expected_opening != (0 in windows):
            raise ValueError(f"Opening basmala classification mismatch at {verse.key}")
        opening_start = 0 if expected_opening else None
        if expected_opening:
            opening_count += 1
        excluded_opening = opening_start == 0 and verse.surah != 1
        if excluded_opening:
            excluded_opening_count += 1
        internal_positions = {position for start in windows if start != opening_start for position in range(start, start + 4)}
        word_index = 0
        for zero_index, (start, end, canonical_text) in enumerate(spans):
            if excluded_opening and zero_index < 4:
                rule = "opening_basmala_excluded"
                classification = "opening_embedded"
                expected_word_index = None
            elif len(canonical_text) == 1 and canonical_text in STANDALONE_QURAN_SIGNS:
                rule = "standalone_quran_sign"
                classification = "none"
                expected_word_index = None
            else:
                rule = "arabic_word"
                if opening_start == 0 and verse.surah == 1 and zero_index < 4:
                    classification = "opening_fatiha"
                else:
                    classification = "in_verse_lexical" if zero_index in internal_positions else "none"
                word_index += 1
                expected_word_index = word_index
            yield {
                "verse_key": verse.key,
                "span_index": zero_index + 1,
                "word_index": expected_word_index,
                "canonical_text": canonical_text,
                "codepoint_start": start,
                "codepoint_end": end,
                "tokenization_rule": rule,
                "basmala_classification": classification,
            }
    if opening_count != 113:
        raise ValueError(f"Expected 113 opening basmalas, found {opening_count}")
    if excluded_opening_count != 112:
        raise ValueError(f"Expected 112 excluded opening basmalas, found {excluded_opening_count}")


def _validate_trace(record: dict) -> None:
    forms = record["analysis_forms"]
    traces = record["normalization_traces"]
    canonical = record["canonical_text"]
    if not isinstance(forms, list) or any(not isinstance(form, str) or not form for form in forms):
        raise ValueError("analysis_forms must be a non-empty-string array")
    if len(forms) != len(set(forms)):
        raise ValueError("analysis_forms must be deduplicated")
    if record["tokenization_rule"] != "arabic_word":
        if forms or traces:
            raise ValueError("Structural and excluded spans must not have analysis forms")
        return
    if not forms or forms[0] != canonical or not isinstance(traces, list) or len(traces) != len(forms):
        raise ValueError("Arabic word must retain canonical exact form and aligned traces")

    observed_profiles: list[str] = []
    for form_index, trace in enumerate(traces):
        if trace.get("analysis_form_index") != form_index or not isinstance(trace.get("paths"), list) or not trace["paths"]:
            raise ValueError("Invalid normalization trace index or paths")
        form = forms[form_index]
        for path in trace["paths"]:
            profile = path.get("profile")
            if profile not in EXPECTED_PROFILES or profile in observed_profiles:
                raise ValueError("Missing, duplicate, or unknown normalization profile")
            observed_profiles.append(profile)
            mapping = path.get("output_to_input")
            if not isinstance(mapping, list) or len(mapping) != len(form):
                raise ValueError("output_to_input must map every output code point")
            for source_range in mapping:
                if (
                    not isinstance(source_range, list)
                    or len(source_range) != 2
                    or not all(isinstance(value, int) for value in source_range)
                    or not (0 <= source_range[0] < source_range[1] <= len(canonical))
                ):
                    raise ValueError("Invalid output-to-canonical range")
            operations = path.get("operations")
            if not isinstance(operations, list):
                raise ValueError("Trace operations must be an array")
            for operation in operations:
                start = operation.get("input_cp_start")
                end = operation.get("input_cp_end")
                expected_hex = [f"U+{ord(character):04X}" for character in canonical[start:end]] if isinstance(start, int) and isinstance(end, int) else []
                if (
                    not isinstance(start, int)
                    or not isinstance(end, int)
                    or not (0 <= start < end <= len(canonical))
                    or operation.get("input_hex") != expected_hex
                    or operation.get("op") not in {"delete", "replace"}
                    or not isinstance(operation.get("output"), str)
                    or not isinstance(operation.get("reason"), str)
                    or not operation["reason"]
                ):
                    raise ValueError("Invalid code-point normalization operation")
    if observed_profiles != list(EXPECTED_PROFILES):
        raise ValueError(f"Normalization profile order mismatch: {observed_profiles!r}")


def validate_token_map(
    source: Path,
    manifest: Path,
    token_map: Path,
    policy_report: Path,
    *,
    repo_root: Path = REPO_ROOT,
) -> dict:
    repo_root = _resolved(repo_root)
    source_path = _assert_exact(source, repo_root / SOURCE_RELATIVE, "source")
    manifest_path = _assert_exact(manifest, repo_root / MANIFEST_RELATIVE, "manifest")
    token_path = _assert_candidate(token_map, repo_root, "token map")
    report_path = _assert_candidate(policy_report, repo_root, "policy report")
    verses, source_sha256 = _load_source(source_path, manifest_path)

    counts = {key: 0 for key in EXPECTED_COUNTS}
    expected = _expected_records(verses)
    forbidden_hits: set[str] = set()
    digest = hashlib.sha256()
    with token_path.open("rb") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            digest.update(raw_line)
            lowered = raw_line.lower()
            forbidden_hits.update(marker for marker in FORBIDDEN_OUTPUT_MARKERS if marker.encode("ascii") in lowered)
            if not raw_line.endswith(b"\n"):
                raise ValueError(f"JSONL line {line_number} does not use a final LF")
            try:
                record = json.loads(raw_line.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise ValueError(f"Invalid JSONL at line {line_number}: {error}") from error
            try:
                expected_record = next(expected)
            except StopIteration as error:
                raise ValueError("Token map contains more canonical spans than the source") from error
            for key, expected_value in expected_record.items():
                if record.get(key) != expected_value:
                    raise ValueError(f"{record.get('verse_key')} span {record.get('span_index')}: {key} mismatch")
            if record.get("source_sha256") != source_sha256:
                raise ValueError("Record source_sha256 mismatch")
            if record["canonical_text"] != expected_record["canonical_text"]:
                raise ValueError("canonical_text is not an exact source substring")
            _validate_trace(record)
            counts["total_spans"] += 1
            if record["tokenization_rule"] == "standalone_quran_sign":
                counts["standalone_quran_signs"] += 1
            elif record["tokenization_rule"] == "opening_basmala_excluded":
                counts["opening_basmala_words"] += 1
            else:
                counts["analysis_words"] += 1
    try:
        next(expected)
    except StopIteration:
        pass
    else:
        raise ValueError("Token map does not cover every canonical non-whitespace span")

    if forbidden_hits:
        raise ValueError(f"Forbidden provenance marker in token output: {sorted(forbidden_hits)!r}")
    if counts != EXPECTED_COUNTS:
        raise ValueError(f"Validated counts differ from policy: {counts!r}")

    report_bytes = report_path.read_bytes()
    lowered_report = report_bytes.lower()
    report_hits = [marker for marker in FORBIDDEN_OUTPUT_MARKERS if marker.encode("ascii") in lowered_report]
    if report_hits:
        raise ValueError(f"Forbidden provenance marker in policy report: {report_hits!r}")
    report = json.loads(report_bytes.decode("utf-8"))
    if (
        report.get("schema_version") != "camel-token-map-v1.1"
        or report.get("coordinate_system") != "unicode-code-point-zero-based-half-open-per-verse-text"
        or report.get("counts") != counts
        or report.get("source", {}).get("sha256") != source_sha256
        or report.get("source", {}).get("verse_count") != EXPECTED_VERSES
        or report.get("token_map_sha256") != digest.hexdigest()
        or report.get("normalization_profiles") != list(EXPECTED_PROFILES)
    ):
        raise ValueError("Policy report does not match validated token map")
    return {"counts": counts, "source_sha256": source_sha256, "token_map_sha256": digest.hexdigest()}


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--token-map", type=Path, required=True)
    parser.add_argument("--policy-report", type=Path, required=True)
    return parser


def main() -> int:
    args = _parser().parse_args()
    result = validate_token_map(args.source, args.manifest, args.token_map, args.policy_report)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
