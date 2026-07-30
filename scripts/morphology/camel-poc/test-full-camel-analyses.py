#!/usr/bin/env python3
"""Focused offline tests for the full Camel Morph candidate builder."""

from __future__ import annotations

import importlib.util
import shutil
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
BUILDER_PATH = SCRIPT_DIR / "build-full-camel-analyses.py"
TEST_ROOT = Path(__file__).resolve().parents[3] / "data/candidates/morphology/camel-morph-msa-v1.0/.full-analysis-test"


def load_builder():
    spec = importlib.util.spec_from_file_location("camel_full_builder_test", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load builder")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeAnalyzer:
    def analyze(self, form: str) -> list[dict]:
        if form == "كتابٌ":
            return [
                {"lex": "كِتاب", "root": "ك.ت.ب", "pos": "noun", "cas": "n"},
                {"lex": "كَتَب", "root": "ك.ت.ب", "pos": "verb", "asp": "p"},
            ]
        if form == "كتاب":
            return [{"lex": "كِتاب", "root": "ك.ت.ب", "pos": "noun", "cas": "n"}]
        return []


def token(word_index: int, canonical: str, forms: list[str]) -> dict:
    return {
        "verse_key": "1:1",
        "word_index": word_index,
        "canonical_text": canonical,
        "analysis_forms": forms,
        "normalization_traces": [
            {"analysis_form_index": index, "paths": [{"profile": "exact" if index == 0 else "undia"}]}
            for index in range(len(forms))
        ],
    }


def main() -> None:
    builder = load_builder()
    analyzer = FakeAnalyzer()
    records = [token(1, "كتابٌ", ["كتابٌ", "كتاب"]), token(2, "غريب", ["غريب"])]
    first = builder.analyze_word(records[0], analyzer)
    assert first["candidate_count_total"] == 3
    assert first["candidate_count_unique"] == 2
    assert first["exact_has_analysis"] and first["normalized_has_analysis"]
    assert first["normalization_sensitive"] and not first["no_analysis"]

    if TEST_ROOT.exists():
        shutil.rmtree(TEST_ROOT)
    first_dir = TEST_ROOT / "first"
    second_dir = TEST_ROOT / "second"
    try:
        first_path = first_dir / "surah-001.jsonl.gz"
        second_path = second_dir / "surah-001.jsonl.gz"
        first_stats = builder.write_shard(first_path, records, analyzer, 1)
        second_stats = builder.write_shard(second_path, records, analyzer, 1)
        assert first_path.read_bytes() == second_path.read_bytes()
        assert first_stats["sha256"] == second_stats["sha256"]
        assert first_path.read_bytes()[4:8] == b"\x00\x00\x00\x00"
        validated = builder.validate_shard(first_path, records, 1)
        assert validated["word_count"] == 2
        assert validated["coverage"]["no_analysis"] == 1
        assert not list(TEST_ROOT.rglob("*.tmp"))
        estimate = builder.preflight_estimate()
        assert estimate["required_free_bytes"] == estimate["estimated_uncompressed_bytes"] * 2 + builder.SAFETY_BYTES
    finally:
        if TEST_ROOT.exists():
            shutil.rmtree(TEST_ROOT)


if __name__ == "__main__":
    main()
    print("full Camel Morph builder tests: PASS")
