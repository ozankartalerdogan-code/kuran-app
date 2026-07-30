#!/usr/bin/env python3
"""Public v2 ranker with deterministic rule-ablation tie handling."""

from __future__ import annotations

import json
from pathlib import Path

from rank_contextual_candidates_v2_base import *  # noqa: F401,F403
from rank_contextual_candidates_v2_overlay import base, confidence_without_rule, group_candidates


base.group_candidates = group_candidates
base.confidence_without_rule = confidence_without_rule
base.__file__ = str(Path(__file__).resolve())


if __name__ == "__main__":
    print(json.dumps(base.run(base.parse_args()), ensure_ascii=True, sort_keys=True))
