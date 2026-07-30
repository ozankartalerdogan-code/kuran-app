#!/usr/bin/env python3
"""Targeted unit tests for disambiguation PoC v2 policy helpers."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from copy import deepcopy
from pathlib import Path


HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import v2_common as common  # noqa: E402

SPEC = importlib.util.spec_from_file_location("ranker_v2", HERE / "rank-contextual-candidates-v2.py")
ranker = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(ranker)


def candidate(**overrides) -> dict:
    value = {
        "root": "ك.ت.ب",
        "lex": "كَتَب_1",
        "pos": "verb",
        "diac": "كَتَبَ",
        "stem": "كَتَب",
        "d3seg": "كَتَبَ",
        "asp": "p",
        "cas": "0",
        "gen": "m",
        "mod": "0",
        "num": "s",
        "per": "3",
        "stt": "0",
        "vox": "a",
        "prc3": "0",
        "prc2": "0",
        "prc1.5": "0",
        "prc1": "0",
        "prc0": "0",
        "enc0": "0",
        "enc1": "0",
        "enc2": "0",
        "gloss": "write",
    }
    value.update(overrides)
    return value


def target(candidates: list[dict], canonical: str = "كَتَبَ") -> dict:
    return {
        "verse_key": "1:1",
        "word_index": 1,
        "canonical_text": canonical,
        "candidate_count_unique": len(candidates),
        "exact_has_analysis": True,
        "normalized_has_analysis": True,
        "normalization_sensitive": False,
        "analysis_forms": [{"form_id": "exact", "form": canonical, "profiles": ["exact"], "candidate_count": len(candidates), "candidates": candidates}],
        "unique_candidates": candidates,
    }


class V2PolicyTests(unittest.TestCase):
    def test_lemma_normalization_keeps_raw_separate(self):
        raw = "إِيمَان_2"
        self.assertEqual(common.normalize_lemma(raw), "ايمان")
        self.assertEqual(raw, "إِيمَان_2")

    def test_technical_only_difference_collapses_and_raw_members_remain(self):
        left = candidate(gloss="write", stemcat="X1")
        right = candidate(gloss="inscribe", stemcat="X9")
        clusters = ranker.group_candidates(target([left, right]), [None] * 6)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["raw_candidate_count"], 2)
        self.assertEqual(len(clusters[0]["raw_candidates"]), 2)

    def test_basic_morphology_difference_does_not_collapse(self):
        left = candidate(mod="i")
        right = candidate(mod="j")
        clusters = ranker.group_candidates(target([left, right]), [None] * 6)
        self.assertEqual(len(clusters), 2)

    def test_neighbor_pos_is_bounded_weak_signal(self):
        prep = target([candidate(pos="prep")], canonical="مِنْ")
        parts = ranker.score_candidate(target([candidate()]), candidate(), {"forms": {"exact"}, "profiles": {"exact"}}, [None, None, prep, None, None, None])
        score = next(part["score"] for part in parts if part["rule"] == "neighbor_pos_weak")
        self.assertIn(score, {-1, 0, 1})

    def test_foreign_requires_joint_exact_evidence(self):
        foreign = candidate(root="FOREIGN", lex="FOREIGN")
        exact_parts = ranker.score_candidate(target([foreign]), foreign, {"forms": {"exact"}, "profiles": {"exact"}}, [None] * 6)
        exact_score = next(part["score"] for part in exact_parts if part["rule"] == "foreign_ntws_guard")
        self.assertEqual(exact_score, 2)
        conflict = deepcopy(foreign)
        conflict["diac"] = "غَرِيبٌ"
        conflict_parts = ranker.score_candidate(target([conflict]), conflict, {"forms": {"exact"}, "profiles": {"exact"}}, [None] * 6)
        conflict_score = next(part["score"] for part in conflict_parts if part["rule"] == "foreign_ntws_guard")
        self.assertEqual(conflict_score, -30)


if __name__ == "__main__":
    unittest.main()
