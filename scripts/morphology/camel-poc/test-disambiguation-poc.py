#!/usr/bin/env python3
"""Focused offline tests for contextual ranking and OOV form generation."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import disambiguation_common as common


def load_ranker():
    path = SCRIPT_DIR / "rank-contextual-candidates.py"
    spec = importlib.util.spec_from_file_location("contextual_ranker_test", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load ranker")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def candidate(case: str) -> dict:
    return {
        "diac": "كِتَابِ",
        "lex": "كِتَاب",
        "stem": "كِتَاب",
        "root": "ك.ت.ب",
        "pos": "noun",
        "cas": case,
        "stt": "i",
        "gen": "m",
        "num": "s",
        "vox": "na",
        "prc3": "0",
        "prc2": "0",
        "prc1.5": "0",
        "prc1": "0",
        "prc0": "0",
        "enc0": "0",
        "d3seg": "كِتَابِ",
    }


def full_target(candidates: list[dict]) -> dict:
    return {
        "verse_key": "2:1",
        "word_index": 2,
        "canonical_text": "كِتَابِ",
        "candidate_count_unique": len(candidates),
        "exact_has_analysis": True,
        "normalized_has_analysis": False,
        "normalization_sensitive": False,
        "no_analysis": False,
        "unique_candidates": candidates,
        "analysis_forms": [{
            "form_id": "exact",
            "form": "كِتَابِ",
            "profiles": ["exact"],
            "candidate_count": len(candidates),
            "candidates": candidates,
        }],
    }


def main() -> None:
    ranker = load_ranker()
    parameters = common.load_json(common.EVAL_MANIFEST)["ranker_parameters"]
    eval_record = {
        "verse_key": "2:1",
        "word_index": 2,
        "context_before": [{"verse_key": "2:1", "word_index": 1, "canonical_text": "مِنْ"}],
        "context_after": [],
    }
    prep = {
        "verse_key": "2:1",
        "word_index": 1,
        "canonical_text": "مِنْ",
        "unique_candidates": [{"pos": "prep"}],
    }
    genitive = candidate("g")
    nominative = candidate("n")
    loaded = {"2:1:1": prep}

    first = ranker.rank_record(eval_record, full_target([nominative, genitive]), loaded, parameters)
    second = ranker.rank_record(eval_record, full_target([genitive, nominative]), loaded, parameters)
    assert first["confidence_class"] == "HIGH_CONFIDENCE"
    assert first["margin"] >= 20
    assert first["selected_candidate"]["cas"] == "g"
    assert first["selected_candidate"] == second["selected_candidate"]
    assert [item["candidate_signature_sha256"] for item in first["ranked_candidates"]] == [item["candidate_signature_sha256"] for item in second["ranked_candidates"]]
    assert any(part["rule"] == "post_preposition_case" and part["score"] > 0 for part in first["ranked_candidates"][0]["score_components"])

    forms = ranker.oov_forms("ٱلرَّحْمَـٰن", set())
    assert forms
    assert all(form["form"] != "ٱلرَّحْمَـٰن" for form in forms)
    assert all(form["normalization_trace"] for form in forms)
    assert {form["false_surface_expansion_risk"] for form in forms} <= {"low", "medium", "high"}


if __name__ == "__main__":
    main()
    print("contextual disambiguation tests: PASS")
