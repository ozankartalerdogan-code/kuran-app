#!/usr/bin/env python3
"""Build an independent canonical token map from the allowlisted Tanzil source."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Sequence


REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_RELATIVE = Path("data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt")
MANIFEST_RELATIVE = Path("data/vendor/tanzil/uthmani-1.1/manifest.json")
CANDIDATE_RELATIVE = Path("data/candidates/morphology")

EXPECTED_VERSES = 6_236
EXPECTED_SPANS = 82_459
EXPECTED_SIGNS = 4_578
EXPECTED_BASMALA_WORDS = 448
EXPECTED_ANALYSIS_WORDS = 77_433

PROFILE_ORDER = (
    "exact",
    "quran_marks_conservative",
    "wasl_standardized",
    "alif_folded",
    "undia",
    "dagger_alif_expanded",
)

STANDALONE_QURAN_SIGNS = frozenset("\u06d6\u06d7\u06d8\u06d9\u06da\u06db\u06dc\u06de\u06e9")
CONSERVATIVE_REMOVALS = STANDALONE_QURAN_SIGNS
LETTERLIKE_SMALL_MARKS = frozenset({"\u06e5", "\u06e6", "\u06e7"})
ALIF_FOLD = {"\u0622": "\u0627", "\u0623": "\u0627", "\u0625": "\u0627"}
BASMALA_SIGNATURE = ("\u0628\u0633\u0645", "\u0627\u0644\u0644\u0647", "\u0627\u0644\u0631\u062d\u0645\u0646", "\u0627\u0644\u0631\u062d\u064a\u0645")


@dataclass(frozen=True)
class Verse:
    surah: int
    ayah: int
    text: str

    @property
    def key(self) -> str:
        return f"{self.surah}:{self.ayah}"


@dataclass(frozen=True)
class Unit:
    text: str
    source_start: int
    source_end: int


def _resolved(path: Path) -> Path:
    return path.expanduser().resolve(strict=False)


def _assert_exact_path(path: Path, expected: Path, label: str) -> Path:
    resolved = _resolved(path)
    if resolved != _resolved(expected):
        raise ValueError(f"{label} must be exactly {expected}")
    return resolved


def _assert_candidate_path(path: Path, repo_root: Path, label: str) -> Path:
    resolved = _resolved(path)
    candidate_root = _resolved(repo_root / CANDIDATE_RELATIVE)
    if resolved == candidate_root or candidate_root not in resolved.parents:
        raise ValueError(f"{label} must be a file below {candidate_root}")
    return resolved


def _load_inputs(source_path: Path, manifest_path: Path) -> tuple[list[Verse], dict, str]:
    manifest_bytes = manifest_path.read_bytes()
    source_bytes = source_path.read_bytes()
    try:
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        source_text = source_bytes.decode("utf-8")
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"Invalid UTF-8 or manifest JSON: {error}") from error

    source_sha256 = hashlib.sha256(source_bytes).hexdigest()
    if source_sha256 != manifest.get("sha256"):
        raise ValueError("Canonical source SHA-256 does not match the manifest")
    if manifest.get("file") != source_path.name:
        raise ValueError("Manifest file name does not match the canonical source")
    if manifest.get("verseCount") != EXPECTED_VERSES:
        raise ValueError("Manifest verseCount is not 6,236")

    verses: list[Verse] = []
    seen: set[str] = set()
    for physical_line, line in enumerate(source_text.splitlines(), start=1):
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 2)
        if len(parts) != 3 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError(f"Invalid canonical line format at physical line {physical_line}")
        surah, ayah, text = int(parts[0]), int(parts[1]), parts[2]
        if not text or text != text.strip() or "  " in text or "\t" in text or "\u00a0" in text:
            raise ValueError(f"Non-canonical whitespace in {surah}:{ayah}")
        verse = Verse(surah, ayah, text)
        if verse.key in seen:
            raise ValueError(f"Duplicate verse key {verse.key}")
        seen.add(verse.key)
        verses.append(verse)

    if len(verses) != EXPECTED_VERSES or verses[0].key != "1:1" or verses[-1].key != "114:6":
        raise ValueError("Canonical verse sequence is incomplete")
    previous: Verse | None = None
    for verse in verses:
        if previous is None:
            if verse.surah != 1 or verse.ayah != 1:
                raise ValueError("Canonical verse sequence must begin at 1:1")
        elif verse.surah == previous.surah:
            if verse.ayah != previous.ayah + 1:
                raise ValueError(f"Non-consecutive ayah before {verse.key}")
        elif verse.surah == previous.surah + 1:
            if verse.ayah != 1:
                raise ValueError(f"Surah {verse.surah} does not begin at ayah 1")
        else:
            raise ValueError(f"Non-consecutive surah before {verse.key}")
        previous = verse
    return verses, manifest, source_sha256


def iter_canonical_spans(text: str) -> Iterator[tuple[int, int, str]]:
    start = 0
    for index, character in enumerate(text):
        if character != " ":
            continue
        if index == start:
            raise ValueError("Empty canonical whitespace run")
        yield start, index, text[start:index]
        start = index + 1
    if start >= len(text):
        raise ValueError("Trailing canonical whitespace")
    yield start, len(text), text[start:]


def _basmala_fold(value: str) -> str:
    folded: list[str] = []
    for character in value:
        if character == "\u0640" or unicodedata.category(character).startswith("M"):
            continue
        if character in {"\u0622", "\u0623", "\u0625", "\u0671"}:
            folded.append("\u0627")
        else:
            folded.append(character)
    return "".join(folded)


def _basmala_windows(parts: Sequence[str]) -> set[int]:
    starts: set[int] = set()
    for index in range(max(0, len(parts) - 3)):
        if tuple(_basmala_fold(part) for part in parts[index:index + 4]) == BASMALA_SIGNATURE:
            starts.add(index)
    return starts


def _initial_units(canonical_text: str) -> list[Unit]:
    return [Unit(character, index, index + 1) for index, character in enumerate(canonical_text)]


def _operation(name: str, units: Sequence[Unit], output: str, reason: str) -> dict:
    return {
        "op": name,
        "input_cp_start": min(unit.source_start for unit in units),
        "input_cp_end": max(unit.source_end for unit in units),
        "input_hex": [f"U+{ord(character):04X}" for unit in units for character in unit.text],
        "output": output,
        "reason": reason,
    }


def _remove_characters(units: Sequence[Unit], removed: frozenset[str], reason: str) -> tuple[list[Unit], list[dict]]:
    output: list[Unit] = []
    operations: list[dict] = []
    for unit in units:
        if unit.text in removed:
            operations.append(_operation("delete", [unit], "", reason))
        else:
            output.append(unit)
    return output, operations


def _replace_characters(units: Sequence[Unit], replacements: dict[str, str], reason: str) -> tuple[list[Unit], list[dict]]:
    output: list[Unit] = []
    operations: list[dict] = []
    for unit in units:
        replacement = replacements.get(unit.text)
        if replacement is None:
            output.append(unit)
            continue
        output.append(Unit(replacement, unit.source_start, unit.source_end))
        operations.append(_operation("replace", [unit], replacement, reason))
    return output, operations


def _prepare_undia(units: Sequence[Unit], expand_dagger_alif: bool) -> tuple[list[Unit], list[dict]]:
    output: list[Unit] = []
    operations: list[dict] = []
    index = 0
    carrier_map = {"\u0627": "\u0623", "\u0648": "\u0624", "\u064a": "\u0626", "\u0649": "\u0626"}
    while index < len(units):
        unit = units[index]
        following = units[index + 1] if index + 1 < len(units) else None
        if following is not None and following.text == "\u0654":
            pair = [unit, following]
            if unit.text == "\u0640":
                replacement = "\u0621"
                reason = "preserve_hamza_before_tatweel_removal"
            elif unit.text == "\u0670":
                replacement = "\u0623" if expand_dagger_alif else "\u0621"
                reason = "preserve_hamza_on_dagger_alif_sequence"
            elif unit.text in carrier_map:
                replacement = carrier_map[unit.text]
                reason = "explicit_hamza_carrier_composition_without_unicode_normalization"
            else:
                replacement = None
            if replacement is not None:
                output.append(Unit(replacement, unit.source_start, following.source_end))
                operations.append(_operation("replace", pair, replacement, reason))
                index += 2
                continue
        if unit.text == "\u0654":
            output.append(Unit("\u0621", unit.source_start, unit.source_end))
            operations.append(_operation("replace", [unit], "\u0621", "preserve_combining_hamza_as_spacing_hamza"))
        elif unit.text == "\u0670" and expand_dagger_alif:
            output.append(Unit("\u0627", unit.source_start, unit.source_end))
            operations.append(_operation("replace", [unit], "\u0627", "controlled_dagger_alif_expansion"))
        elif unit.text == "\u0640":
            operations.append(_operation("delete", [unit], "", "remove_tatweel_after_attached_mark_handling"))
        elif unicodedata.category(unit.text).startswith("M") and unit.text not in LETTERLIKE_SMALL_MARKS:
            operations.append(_operation("delete", [unit], "", "remove_harakat_or_nonletter_combining_mark"))
        else:
            output.append(unit)
        index += 1
    return output, operations


def _render(units: Sequence[Unit]) -> tuple[str, list[list[int]]]:
    text_parts: list[str] = []
    mapping: list[list[int]] = []
    for unit in units:
        text_parts.append(unit.text)
        mapping.extend([[unit.source_start, unit.source_end] for _ in unit.text])
    return "".join(text_parts), mapping


def build_analysis_forms(canonical_text: str) -> tuple[list[str], list[dict]]:
    exact_units = _initial_units(canonical_text)
    profiles: list[tuple[str, list[Unit], list[dict]]] = [("exact", exact_units, [])]

    conservative, operations = _remove_characters(exact_units, CONSERVATIVE_REMOVALS, "remove_allowlisted_quran_pause_or_structure_mark")
    profiles.append(("quran_marks_conservative", conservative, operations))

    wasl, wasl_operations = _replace_characters(conservative, {"\u0671": "\u0627"}, "standardize_hamzat_al_wasl")
    profiles.append(("wasl_standardized", wasl, operations + wasl_operations))

    alif, alif_operations = _replace_characters(wasl, ALIF_FOLD, "fold_alif_hamza_variant_for_analysis")
    profiles.append(("alif_folded", alif, operations + wasl_operations + alif_operations))

    undia, undia_operations = _prepare_undia(alif, expand_dagger_alif=False)
    profiles.append(("undia", undia, operations + wasl_operations + alif_operations + undia_operations))

    expanded, expanded_operations = _prepare_undia(alif, expand_dagger_alif=True)
    profiles.append(("dagger_alif_expanded", expanded, operations + wasl_operations + alif_operations + expanded_operations))

    forms: list[str] = []
    traces: list[dict] = []
    by_text: dict[str, int] = {}
    for profile, units, profile_operations in profiles:
        text, mapping = _render(units)
        if not text:
            continue
        form_index = by_text.get(text)
        path = {"profile": profile, "operations": profile_operations, "output_to_input": mapping}
        if form_index is None:
            form_index = len(forms)
            by_text[text] = form_index
            forms.append(text)
            traces.append({"analysis_form_index": form_index, "paths": [path]})
        else:
            traces[form_index]["paths"].append(path)
    return forms, traces


def _json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode("utf-8")


def _record_stream(verses: Sequence[Verse], source_sha256: str) -> Iterator[dict]:
    for verse in verses:
        spans = list(iter_canonical_spans(verse.text))
        parts = [part for _, _, part in spans]
        windows = _basmala_windows(parts)
        opening_start = 0 if verse.ayah == 1 and verse.surah != 9 and 0 in windows else None
        excluded_opening = opening_start == 0 and verse.surah != 1
        internal_positions = {position for start in windows if start != opening_start for position in range(start, start + 4)}
        word_index = 0
        for zero_index, (start, end, canonical_text) in enumerate(spans):
            span_index = zero_index + 1
            if excluded_opening and zero_index < 4:
                tokenization_rule = "opening_basmala_excluded"
                basmala_classification = "opening_embedded"
                analysis_forms: list[str] = []
                normalization_traces: list[dict] = []
                assigned_word_index = None
            elif len(canonical_text) == 1 and canonical_text in STANDALONE_QURAN_SIGNS:
                tokenization_rule = "standalone_quran_sign"
                basmala_classification = "none"
                analysis_forms = []
                normalization_traces = []
                assigned_word_index = None
            else:
                tokenization_rule = "arabic_word"
                if opening_start == 0 and verse.surah == 1 and zero_index < 4:
                    basmala_classification = "opening_fatiha"
                else:
                    basmala_classification = "in_verse_lexical" if zero_index in internal_positions else "none"
                word_index += 1
                assigned_word_index = word_index
                analysis_forms, normalization_traces = build_analysis_forms(canonical_text)
            yield {
                "analysis_forms": analysis_forms,
                "basmala_classification": basmala_classification,
                "canonical_text": canonical_text,
                "codepoint_end": end,
                "codepoint_start": start,
                "normalization_traces": normalization_traces,
                "source_sha256": source_sha256,
                "span_index": span_index,
                "tokenization_rule": tokenization_rule,
                "verse_key": verse.key,
                "word_index": assigned_word_index,
            }


def _write_temp_token_map(output_path: Path, records: Iterable[dict]) -> tuple[Path, dict, str]:
    counts = {"total_spans": 0, "standalone_quran_signs": 0, "opening_basmala_words": 0, "analysis_words": 0}
    digest = hashlib.sha256()
    handle = tempfile.NamedTemporaryFile(mode="wb", prefix=f".{output_path.name}.", suffix=".tmp", dir=output_path.parent, delete=False)
    temp_path = Path(handle.name)
    try:
        with handle:
            for record in records:
                encoded = _json_bytes(record)
                handle.write(encoded)
                digest.update(encoded)
                counts["total_spans"] += 1
                if record["tokenization_rule"] == "standalone_quran_sign":
                    counts["standalone_quran_signs"] += 1
                elif record["tokenization_rule"] == "opening_basmala_excluded":
                    counts["opening_basmala_words"] += 1
                else:
                    counts["analysis_words"] += 1
    except BaseException:
        temp_path.unlink(missing_ok=True)
        raise
    return temp_path, counts, digest.hexdigest()


def _policy_report(source_sha256: str, token_map_sha256: str, counts: dict) -> dict:
    return {
        "basmala_policy": {
            "excluded_openings": 112,
            "fatiha_1_1": "canonical_spans_included_as_analysis_words",
            "in_verse_basmala": "ordinary_arabic_words",
            "tawbah_9_1": "no_opening_basmala",
        },
        "coordinate_system": "unicode-code-point-zero-based-half-open-per-verse-text",
        "counts": counts,
        "normalization_profiles": list(PROFILE_ORDER),
        "schema_version": "camel-token-map-v1.1",
        "source": {"id": "tanzil-quran-text-uthmani-1.1", "sha256": source_sha256, "verse_count": EXPECTED_VERSES},
        "token_map_sha256": token_map_sha256,
        "word_index_policy": "one_based_per_verse_for_arabic_word_null_for_structural_or_excluded",
    }


def _assert_counts(counts: dict) -> None:
    expected = {
        "total_spans": EXPECTED_SPANS,
        "standalone_quran_signs": EXPECTED_SIGNS,
        "opening_basmala_words": EXPECTED_BASMALA_WORDS,
        "analysis_words": EXPECTED_ANALYSIS_WORDS,
    }
    if counts != expected:
        raise ValueError(f"Token class counts differ from the approved policy: {counts!r}")


def build_token_map(source: Path, manifest: Path, output: Path, policy_report: Path, *, repo_root: Path = REPO_ROOT) -> dict:
    repo_root = _resolved(repo_root)
    source_path = _assert_exact_path(source, repo_root / SOURCE_RELATIVE, "source")
    manifest_path = _assert_exact_path(manifest, repo_root / MANIFEST_RELATIVE, "manifest")
    output_path = _assert_candidate_path(output, repo_root, "output")
    report_path = _assert_candidate_path(policy_report, repo_root, "policy report")
    if output_path == report_path:
        raise ValueError("Token map and policy report paths must differ")
    if output_path.exists() or report_path.exists():
        raise FileExistsError("Refusing to overwrite an existing candidate output")

    # The two allowlisted inputs are fully read and verified before output directories exist.
    verses, _manifest_data, source_sha256 = _load_inputs(source_path, manifest_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    token_temp: Path | None = None
    report_temp: Path | None = None
    committed: list[Path] = []
    try:
        token_temp, counts, token_map_sha256 = _write_temp_token_map(output_path, _record_stream(verses, source_sha256))
        _assert_counts(counts)
        report_data = _policy_report(source_sha256, token_map_sha256, counts)
        report_handle = tempfile.NamedTemporaryFile(mode="wb", prefix=f".{report_path.name}.", suffix=".tmp", dir=report_path.parent, delete=False)
        report_temp = Path(report_handle.name)
        with report_handle:
            report_handle.write(_json_bytes(report_data))
        if output_path.exists() or report_path.exists():
            raise FileExistsError("Candidate output appeared during generation; refusing to overwrite it")
        os.rename(token_temp, output_path)
        committed.append(output_path)
        token_temp = None
        os.rename(report_temp, report_path)
        committed.append(report_path)
        report_temp = None
        return report_data
    except BaseException:
        for path in committed:
            path.unlink(missing_ok=True)
        if token_temp is not None:
            token_temp.unlink(missing_ok=True)
        if report_temp is not None:
            report_temp.unlink(missing_ok=True)
        raise


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--policy-report", type=Path, required=True)
    return parser


def main() -> int:
    args = _parser().parse_args()
    report = build_token_map(args.source, args.manifest, args.output, args.policy_report)
    print(json.dumps(report["counts"], ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
