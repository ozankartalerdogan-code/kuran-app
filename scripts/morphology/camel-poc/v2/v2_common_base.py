#!/usr/bin/env python3
"""Shared paths, invariants, and normalization for disambiguation PoC v2."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Iterable, Iterator


V2_SCRIPT_DIR = Path(__file__).resolve().parent
POC_DIR = V2_SCRIPT_DIR.parent
if str(POC_DIR) not in sys.path:
    sys.path.insert(0, str(POC_DIR))

import disambiguation_common as v1_common  # noqa: E402


REPO_ROOT = v1_common.REPO_ROOT
CANDIDATE_BASE = v1_common.CANDIDATE_BASE
V1_DIR = v1_common.DISAMBIG_DIR
V2_DIR = CANDIDATE_BASE / "disambiguation-v2"
REPORT_DIR = CANDIDATE_BASE / "reports"

EVAL_SET = V1_DIR / "eval-set.jsonl"
EVAL_MANIFEST = V1_DIR / "eval-set-manifest.json"
V1_RANKED = V1_DIR / "ranked-eval-set.jsonl"
V1_SUMMARY = REPORT_DIR / "disambiguation-poc-summary.json"
FULL_DIR = v1_common.FULL_DIR
FULL_MANIFEST = v1_common.RUN_MANIFEST

V2_RANKED = V2_DIR / "ranked-eval-set.jsonl"
V2_MANIFEST = V2_DIR / "run-manifest.json"
GOLD_PACKAGE = V2_DIR / "gold-review-package.jsonl"
GOLD_MANIFEST = V2_DIR / "gold-review-manifest.json"
RANKER_REPORT = REPORT_DIR / "disambiguation-v2-ranker-summary.json"
V1_DIFF_REPORT = REPORT_DIR / "disambiguation-v2-vs-v1.json"
LEGACY_REPORT = REPORT_DIR / "disambiguation-v2-vs-legacy.json"
FINAL_REPORT = REPORT_DIR / "disambiguation-v2-summary.json"

LEGACY_PATH = REPO_ROOT / "data2/processed/canonical_word_analysis_v4.json"

EXPECTED_EVAL_SHA256 = "f1744952a551ff5a5c22be974ba66c93cd6653b72e690b554ac7257bc451ea76"
EXPECTED_V1_RANKED_SHA256 = "d754eb6abf5f0065ff9c69e2e375979c637cf23a690ed799d073d595bfdfa06c"
EXPECTED_V1_SUMMARY_SHA256 = "d83e6ee419b3d6f9169fc02b02dc54e8ed32bc65eb0d6507605bbc6c3e3b7b"

V1_FROZEN_EXPECTED = {
    "scripts/morphology/camel-poc/disambiguation_common.py": "ded0fcc9a7aba4125c0bc74685d086050d0aa9f75f83170bdb0697ff0d558b79",
    "scripts/morphology/camel-poc/build-disambiguation-eval-set.py": "5f68a709e85e375d2cf9a8c63d9c9b8ea394c7e41fb57b991638caa171023193",
    "scripts/morphology/camel-poc/rank-contextual-candidates.py": "09740dcffcf7b34b10ede680d51ce5376d6ddb33b5b77f48289d96913a21d39d",
    "scripts/morphology/camel-poc/compare-disambiguation-with-legacy.py": "6a9a5410b8758d8b86aad2c6deae8a5c263eb63df47ba1e1e170b68bfe085dd8",
    "scripts/morphology/camel-poc/validate-disambiguation-poc.py": "801f18533f185a14fc7b0ea465a6173f5dac32110d409d208acecd2774b6ded8",
    "scripts/morphology/camel-poc/test-disambiguation-poc.py": "794ead5f5de33ff1dcb562c882f5045a6d5b02610f5323f62e087b3f4e295c58",
    "data/candidates/morphology/disambiguation/eval-set.jsonl": EXPECTED_EVAL_SHA256,
    "data/candidates/morphology/disambiguation/eval-set-manifest.json": "892e372777cd550108e3785ee5eab2ba81d3bff6a69fe033048e60534f2f8774",
    "data/candidates/morphology/disambiguation/ranked-eval-set.jsonl": EXPECTED_V1_RANKED_SHA256,
    "data/candidates/morphology/disambiguation/oov-recovery.jsonl": "ea6c3d2814f984519f2bb3ab9c558e39cbadb9cbd320cf5486ca9389b50cbd14",
    "data/candidates/morphology/reports/disambiguation-poc-summary.json": EXPECTED_V1_SUMMARY_SHA256,
    "data/candidates/morphology/reports/disambiguation-vs-legacy.json": "b1de3c8ae3cea16b27340f0edf800f2bb54ddad362a750b12c8a8f2e1a527255",
}

PROTECTED_EXPECTED = {
    "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt": "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326",
    "data/vendor/tanzil/uthmani-1.1/manifest.json": "f9a7f5db706736746c49e71c67c82af886bd45c6ff735d1676708d8429ad5efb",
    "data/app.db": "f00a0e64b32708554436effca748c91ed74016fa8f610b9339604f7c1d9e7208",
    "data/candidates/morphology/camel-morph-msa-v1.0/token-map.jsonl": v1_common.EXPECTED_TOKEN_SHA256,
    "data/candidates/morphology/camel-morph-msa-v1.0/full-analysis/run-manifest.json": v1_common.EXPECTED_RUN_MANIFEST_SHA256,
    "data/candidates/morphology/reports/camel-morph-full-analysis-summary.json": v1_common.EXPECTED_FULL_SUMMARY_SHA256,
}

ARABIC_LETTERS = re.compile(r"[^\u0621-\u064a]")
QURAN_MARKS = frozenset(chr(cp) for cp in range(0x06D6, 0x06EE))
ALIF_FOLD = str.maketrans({"آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ى": "ي"})
TECHNICAL_FIELDS = frozenset({
    "atbseg", "atbtok", "bw", "bwtok", "caphi", "catib6", "cm_stem_ids",
    "d1seg", "d1tok", "d2seg", "d2tok", "d3seg", "d3tok", "gloss",
    "lex_logprob", "mid_root_diac", "pattern", "pattern_abstract",
    "pos_lex_logprob", "pos_logprob", "source", "stemcat", "stemgloss", "ud",
})
BASIC_FEATURE_FIELDS = (
    "asp", "cas", "gen", "mod", "num", "per", "stt", "vox",
    "prc3", "prc2", "prc1.5", "prc1", "prc0", "enc0", "enc1", "enc2",
)


def sha256_file(path: Path) -> str:
    return v1_common.sha256_file(path)


def json_bytes(value: object) -> bytes:
    return v1_common.json_bytes(value)


def load_json(path: Path) -> dict:
    return v1_common.load_json(path)


def read_jsonl(path: Path) -> Iterator[dict]:
    return v1_common.read_jsonl(path)


def write_json_atomic(path: Path, value: dict) -> None:
    require_v2_output(path)
    v1_common.write_json_atomic(path, value)


def write_jsonl_atomic(path: Path, records: Iterable[dict]) -> None:
    require_v2_output(path)
    v1_common.write_jsonl_atomic(path, records)


def require_exact(path: Path, expected: Path, label: str) -> Path:
    return v1_common.require_exact(path, expected, label)


def require_v2_output(path: Path) -> Path:
    resolved = path.resolve(strict=False)
    allowed_dir = V2_DIR.resolve(strict=False)
    report_dir = REPORT_DIR.resolve(strict=False)
    if allowed_dir in resolved.parents:
        return resolved
    if report_dir == resolved.parent and resolved.name.startswith("disambiguation-v2-"):
        return resolved
    raise ValueError(f"V2 output is outside the approved paths: {resolved}")


def identity(record: dict) -> str:
    return v1_common.identity(record)


def identity_sort(record: dict) -> tuple[int, int, int]:
    return v1_common.identity_sort(record)


def stable_digest(value: object, namespace: str) -> str:
    serialized = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(f"{namespace}|{serialized}".encode("utf-8")).hexdigest()


def clean_diacritics(value: str) -> str:
    return "".join(
        char for char in value or ""
        if char != "ـ" and char not in QURAN_MARKS
    ).replace("ٱ", "ا")


def strip_marks(value: str, *, fold_alif: bool = True) -> str:
    output = "".join(
        char for char in value or ""
        if char != "ـ" and char not in QURAN_MARKS and not unicodedata.category(char).startswith("M")
    )
    return output.translate(ALIF_FOLD) if fold_alif else output


def normalize_root(value: str | None) -> str:
    return ARABIC_LETTERS.sub("", strip_marks(value or ""))


def normalize_lemma(value: str | None) -> str:
    raw = re.sub(r"_\d+$", "", value or "")
    return ARABIC_LETTERS.sub("", strip_marks(raw))


def coarse_pos(value: str | None) -> str:
    return v1_common.coarse_pos(value)


def candidate_signature(candidate: dict) -> str:
    return v1_common.candidate_signature(candidate)


def equivalence_payload(candidate: dict) -> dict:
    """Keep lexical, vocalic, clitic and core morph features; omit CAMeL plumbing."""
    return {
        "root_normalized": normalize_root(candidate.get("root")),
        "lemma_normalized": normalize_lemma(candidate.get("lex")),
        "pos_coarse": coarse_pos(candidate.get("pos")),
        "pos_raw": str(candidate.get("pos") or ""),
        "diac": clean_diacritics(str(candidate.get("diac") or "")),
        "stem": clean_diacritics(str(candidate.get("stem") or candidate.get("cm_stem") or "")),
        "basic_features": {field: str(candidate.get(field) or "0") for field in BASIC_FEATURE_FIELDS},
    }


def capture_state(expected: dict[str, str]) -> dict[str, dict]:
    state: dict[str, dict] = {}
    for relative, digest in expected.items():
        path = REPO_ROOT / relative
        actual = sha256_file(path)
        if actual != digest:
            raise ValueError(f"Frozen/protected SHA-256 mismatch: {relative}")
        stat = path.stat()
        state[relative] = {
            "sha256": actual,
            "bytes": stat.st_size,
            "mtime_ns": stat.st_mtime_ns,
        }
    return state


def assert_state_unchanged(state: dict[str, dict]) -> None:
    for relative, expected in state.items():
        path = REPO_ROOT / relative
        if sha256_file(path) != expected["sha256"] or path.stat().st_mtime_ns != expected["mtime_ns"]:
            raise ValueError(f"Frozen/protected file changed: {relative}")


def validate_frozen_v1() -> dict[str, dict]:
    v1_common.validate_full_inputs(check_shard_hashes=False)
    state = capture_state(V1_FROZEN_EXPECTED)
    if sha256_file(EVAL_SET) != EXPECTED_EVAL_SHA256 or sha256_file(V1_RANKED) != EXPECTED_V1_RANKED_SHA256:
        raise ValueError("Frozen v1 eval/ranking mismatch")
    return state


def validate_v2_frozen() -> tuple[dict, list[dict], dict[str, dict]]:
    manifest = load_json(V2_MANIFEST)
    if manifest.get("freeze_status") != "frozen_before_v1_and_legacy_comparison":
        raise ValueError("V2 ranker output is not frozen")
    artifacts = manifest["frozen_ranker_outputs"]
    for path, key in ((V2_RANKED, "ranked_eval_set"), (RANKER_REPORT, "ranker_summary")):
        if sha256_file(path) != artifacts[key]["sha256"]:
            raise ValueError(f"Frozen v2 SHA-256 mismatch: {path.name}")
    ranked = list(read_jsonl(V2_RANKED))
    if len(ranked) != 1_000:
        raise ValueError("Frozen v2 ranked record count mismatch")
    state = {**manifest["frozen_v1_state"], **manifest["protected_state"]}
    assert_state_unchanged(state)
    return manifest, ranked, state

