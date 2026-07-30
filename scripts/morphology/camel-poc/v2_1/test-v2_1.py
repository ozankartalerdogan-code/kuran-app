#!/usr/bin/env python3
"""Unit tests for the v2.1 echo guard, selection gating, and benchmark denominators."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import v21_common as common  # noqa: E402


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


ranker = load("ranker_v21_test", "rank-contextual-candidates-v2_1.py")
finalize = load("finalize_v21_test", "finalize-v2_1.py")


def candidate(**overrides) -> dict:
    value = {
        "root": "ك.ت.ب", "lex": "كَتَب_1", "pos": "verb", "diac": "كَتَبَ", "stem": "كَتَب",
        "d3seg": "كَتَبَ", "asp": "p", "cas": "0", "gen": "m", "mod": "0", "num": "s", "per": "3",
        "stt": "0", "vox": "a", "prc3": "0", "prc2": "0", "prc1.5": "0", "prc1": "0", "prc0": "0",
        "enc0": "0", "enc1": "0", "enc2": "0", "gloss": "write",
    }
    value.update(overrides)
    return value


def target(candidates: list[dict], canonical: str = "كَتَبَ") -> dict:
    return {
        "verse_key": "1:1", "word_index": 1, "canonical_text": canonical,
        "candidate_count_unique": len(candidates), "exact_has_analysis": True,
        "normalized_has_analysis": True, "normalization_sensitive": False,
        "analysis_forms": [{"form_id": "exact", "form": canonical, "profiles": ["exact"],
                            "candidate_count": len(candidates), "candidates": candidates}],
        "unique_candidates": candidates,
    }


def echo_candidate(canonical: str) -> dict:
    return candidate(root="FOREIGN", lex=canonical, pos="foreign", diac=canonical, stem=canonical, d3seg=canonical)


class EchoGuardTests(unittest.TestCase):
    def test_echo_never_trusted_even_with_exact_evidence(self):
        echo = echo_candidate("كَتَبَ")
        parts, flags = ranker.score_candidate(target([echo]), echo, {"forms": {"exact"}, "profiles": {"exact"}}, [None] * 6)
        guard = next(part["score"] for part in parts if part["rule"] == "foreign_ntws_guard")
        self.assertTrue(flags["echo"])
        self.assertEqual(guard, -30)

    def test_non_echo_ntws_with_exact_evidence_is_neutral(self):
        prep = candidate(root="NTWS", lex="لِ", pos="prep", diac="كَتَبَ", d3seg="كَتَبَ")
        parts, flags = ranker.score_candidate(target([prep]), prep, {"forms": {"exact"}, "profiles": {"exact"}}, [None] * 6)
        guard = next(part["score"] for part in parts if part["rule"] == "foreign_ntws_guard")
        self.assertFalse(flags["echo"])
        self.assertEqual(guard, 0)

    def test_ntws_without_evidence_penalized(self):
        prep = candidate(root="NTWS", lex="لِ", pos="prep", diac="غَرِيبٌ", d3seg="غَرِيبٌ")
        parts, _ = ranker.score_candidate(target([prep]), prep, {"forms": {"exact"}, "profiles": {"exact"}}, [None] * 6)
        guard = next(part["score"] for part in parts if part["rule"] == "foreign_ntws_guard")
        self.assertEqual(guard, -30)


class GatingTests(unittest.TestCase):
    def test_echo_only_word_is_no_usable_analysis_and_unselected(self):
        record = ranker.rank_record(
            {"verse_key": "1:1", "word_index": 1, "context_before": [], "context_after": []},
            target([echo_candidate("كَتَبَ")]), {},
        )
        self.assertEqual(record["confidence_class"], "NO_USABLE_ANALYSIS")
        self.assertIsNone(record["selected_candidate"])

    def test_echo_with_real_alternative_is_never_selected(self):
        record = ranker.rank_record(
            {"verse_key": "1:1", "word_index": 1, "context_before": [], "context_after": []},
            target([echo_candidate("كَتَبَ"), candidate()]), {},
        )
        self.assertNotEqual(record["confidence_class"], "NO_USABLE_ANALYSIS")
        if record["selected_candidate"] is not None:
            self.assertNotEqual(record["selected_candidate"].get("root"), "FOREIGN")

    def test_ntws_with_alternatives_blocked(self):
        prep = candidate(root="NTWS", lex="كَتَبَ_1", pos="prep")
        other = candidate(mod="i", diac="كُتِبَ", d3seg="كُتِبَ")
        record = ranker.rank_record(
            {"verse_key": "1:1", "word_index": 1, "context_before": [], "context_after": []},
            target([prep, other]), {},
        )
        if record["equivalence_clusters"][0]["representative_flags"]["foreign_ntws"]:
            self.assertFalse(record["automatic_selection"])
            self.assertEqual(record["selection_blocked_reason"], "foreign_ntws_top_with_alternative_clusters")

    def test_abbrev_top_never_auto_selected(self):
        abbrev = candidate(root="NTWS", lex="ن", pos="abbrev")
        record = ranker.rank_record(
            {"verse_key": "1:1", "word_index": 1, "context_before": [], "context_after": []},
            target([abbrev]), {},
        )
        self.assertFalse(record["automatic_selection"])


class BenchmarkDenominatorTests(unittest.TestCase):
    def test_empty_vs_empty_root_is_non_comparable_not_match(self):
        comparison = finalize.compare_candidate(candidate(root="NTWS"), {"root": "", "lemma": "", "pos": "P", "role": "", "morphology": ""})
        self.assertEqual(comparison["root"]["status"], "non_comparable")

    def test_buckwalter_legacy_lemma_is_non_comparable(self):
        comparison = finalize.compare_candidate(candidate(), {"root": "كتب", "lemma": "kataba", "pos": "V", "role": "verb", "morphology": ""})
        self.assertEqual(comparison["lemma_normalized"]["status"], "non_comparable")
        self.assertIn("legacy_lemma_buckwalter_not_decoded", comparison["lemma_normalized"]["reasons"])

    def test_real_root_match_still_counts(self):
        comparison = finalize.compare_candidate(candidate(root="كتب"), {"root": "كتب", "lemma": "كَتَبَ", "pos": "V", "role": "verb", "morphology": ""})
        self.assertEqual(comparison["root"]["status"], "matched")


if __name__ == "__main__":
    unittest.main()
