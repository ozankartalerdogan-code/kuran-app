#!/usr/bin/env python3
"""Paths, freeze expectations, and output guards for disambiguation PoC v2.1."""

from __future__ import annotations

import sys
from pathlib import Path

V21_SCRIPT_DIR = Path(__file__).resolve().parent
POC_DIR = V21_SCRIPT_DIR.parent
V2_SCRIPT_DIR = POC_DIR / "v2"
for entry in (str(POC_DIR), str(V2_SCRIPT_DIR)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

import disambiguation_common as v1_common  # noqa: E402
import v2_common  # noqa: E402


REPO_ROOT = v1_common.REPO_ROOT
CANDIDATE_BASE = v1_common.CANDIDATE_BASE
V21_DIR = CANDIDATE_BASE / "disambiguation-v2.1"
REPORT_DIR = CANDIDATE_BASE / "reports"

V21_RANKED = V21_DIR / "ranked-eval-set.jsonl"
V21_MANIFEST = V21_DIR / "run-manifest.json"
RANKER_REPORT = REPORT_DIR / "disambiguation-v2.1-ranker-summary.json"
VS_V2_REPORT = REPORT_DIR / "disambiguation-v2.1-vs-v2.json"
LEGACY_REPORT = REPORT_DIR / "disambiguation-v2.1-vs-legacy.json"
FINAL_REPORT = REPORT_DIR / "disambiguation-v2.1-summary.json"

EVAL_SET = v2_common.EVAL_SET
V2_RANKED = v2_common.V2_RANKED
V2_MANIFEST = v2_common.V2_MANIFEST
FULL_DIR = v1_common.FULL_DIR
LEGACY_PATH = v2_common.LEGACY_PATH
EXPECTED_LEGACY_SHA256 = "6b375f372acda16173ad78179e31f729eb63229b805661d29802dc2f1c1f573c"

# Frozen v2 artifacts (hashes independently verified during the v2 audit).
FROZEN_V2_EXPECTED = {
    "data/candidates/morphology/disambiguation-v2/ranked-eval-set.jsonl":
        "05f1ff8f903255867e12b184029067dcc9fcba78050d2a71c683f2bcb0fb500e",
    "data/candidates/morphology/disambiguation-v2/gold-review-package.jsonl":
        "702416e4207799ac705398fd84952cf71a0bf455ae34cb8b7ca06eac716ce627",
    "data/candidates/morphology/reports/disambiguation-v2-ranker-summary.json":
        "cc740c85600b2ac008d266bb583b157759ee406410b7743583ead5c818f5c812",
    "data/candidates/morphology/reports/disambiguation-v2-vs-v1.json":
        "1725d4203f1a64699203546bc7028e761a48633755e63d6a18d2236c4b41b60d",
    "data/candidates/morphology/reports/disambiguation-v2-vs-legacy.json":
        "13e235cd9b6d7790a3beed8f1891ddbe82ae2536962cfc6a7c7aaafed056ccb8",
}
# Frozen files whose hashes are captured at run start and must not change during the run.
DYNAMIC_FROZEN_PATHS = (
    "data/candidates/morphology/disambiguation-v2/run-manifest.json",
    "data/candidates/morphology/disambiguation-v2/gold-review-manifest.json",
    "data/candidates/morphology/reports/disambiguation-v2-summary.json",
)

sha256_file = v1_common.sha256_file
load_json = v1_common.load_json
read_jsonl = v1_common.read_jsonl
identity = v1_common.identity
identity_sort = v1_common.identity_sort
json_bytes = v1_common.json_bytes
stable_digest = v2_common.stable_digest
clean_diacritics = v2_common.clean_diacritics
strip_marks = v2_common.strip_marks
normalize_root = v2_common.normalize_root
normalize_lemma = v2_common.normalize_lemma
coarse_pos = v2_common.coarse_pos
candidate_signature = v2_common.candidate_signature
equivalence_payload = v2_common.equivalence_payload


def require_v21_output(path: Path) -> Path:
    resolved = Path(path).resolve(strict=False)
    if V21_DIR.resolve(strict=False) in resolved.parents:
        return resolved
    if resolved.parent == REPORT_DIR.resolve(strict=False) and resolved.name.startswith("disambiguation-v2.1-"):
        return resolved
    raise ValueError(f"V2.1 output is outside the approved paths: {resolved}")


def write_json_atomic(path: Path, value: dict) -> None:
    require_v21_output(path)
    v1_common.write_json_atomic(path, value)


def write_jsonl_atomic(path: Path, records) -> None:
    require_v21_output(path)
    v1_common.write_jsonl_atomic(path, records)


def capture_dynamic(paths) -> dict[str, dict]:
    state: dict[str, dict] = {}
    for relative in paths:
        path = REPO_ROOT / relative
        stat = path.stat()
        state[relative] = {"sha256": sha256_file(path), "bytes": stat.st_size, "mtime_ns": stat.st_mtime_ns}
    return state


def capture_all_frozen() -> dict[str, dict]:
    """Capture every upstream file v2.1 must leave untouched: v1, v2, protected inputs, Camel DB."""
    state = v2_common.capture_state(v2_common.V1_FROZEN_EXPECTED)
    state.update(v2_common.capture_state(v2_common.PROTECTED_EXPECTED))
    state.update(v2_common.capture_state(FROZEN_V2_EXPECTED))
    state.update(capture_dynamic(DYNAMIC_FROZEN_PATHS))
    db_relative = str(v1_common.DB_PATH.relative_to(REPO_ROOT)).replace("\\", "/")
    db_state = capture_dynamic((db_relative,))
    if db_state[db_relative]["sha256"] != v1_common.EXPECTED_DB_SHA256:
        raise ValueError("Camel Morph DB SHA-256 mismatch")
    state.update(db_state)
    return state


def assert_state_unchanged(state: dict[str, dict]) -> None:
    for relative, expected in state.items():
        path = REPO_ROOT / relative
        if sha256_file(path) != expected["sha256"] or path.stat().st_mtime_ns != expected["mtime_ns"]:
            raise ValueError(f"Frozen/protected file changed during v2.1 run: {relative}")


def validate_v21_frozen() -> tuple[dict, list[dict]]:
    manifest = load_json(V21_MANIFEST)
    if manifest.get("freeze_status") != "frozen_before_v2_and_legacy_comparison":
        raise ValueError("V2.1 ranker output is not frozen")
    artifacts = manifest["frozen_ranker_outputs"]
    for path, key in ((V21_RANKED, "ranked_eval_set"), (RANKER_REPORT, "ranker_summary")):
        if sha256_file(path) != artifacts[key]["sha256"]:
            raise ValueError(f"Frozen v2.1 SHA-256 mismatch: {path.name}")
    ranked = list(read_jsonl(V21_RANKED))
    if len(ranked) != 1_000:
        raise ValueError("Frozen v2.1 ranked record count mismatch")
    return manifest, ranked
