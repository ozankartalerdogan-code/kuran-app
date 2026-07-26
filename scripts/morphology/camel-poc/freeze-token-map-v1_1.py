#!/usr/bin/env python3
"""Freeze the Fatiha-inclusive canonical token map without overwriting v1.0."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import shutil
import sys
import uuid
from itertools import zip_longest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
CANDIDATE_ROOT = REPO_ROOT / "data/candidates/morphology"
SOURCE = REPO_ROOT / "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt"
SOURCE_MANIFEST = REPO_ROOT / "data/vendor/tanzil/uthmani-1.1/manifest.json"
OLD_MAP = CANDIDATE_ROOT / "camel-morph-msa-v1.0/token-map.jsonl"
OLD_POLICY = CANDIDATE_ROOT / "reports/camel-token-policy.json"
DEFAULT_OUTPUT = CANDIDATE_ROOT / "camel-token-map-v1_1-fatiha"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


BUILDER = _load_module("camel_token_builder_v1_1", SCRIPT_DIR / "build-token-map.py")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _relative(path: Path) -> str:
    return path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()


def _json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _changed_records(old_path: Path, new_path: Path) -> list[dict]:
    changes: list[dict] = []
    with old_path.open("rb") as old_handle, new_path.open("rb") as new_handle:
        for line_number, pair in enumerate(zip_longest(old_handle, new_handle), start=1):
            old_raw, new_raw = pair
            if old_raw is None or new_raw is None:
                raise RuntimeError("Old and new maps have different canonical span counts")
            if old_raw == new_raw:
                continue
            old = json.loads(old_raw.decode("utf-8"))
            new = json.loads(new_raw.decode("utf-8"))
            stable = ("verse_key", "span_index", "canonical_text", "codepoint_start", "codepoint_end", "source_sha256")
            if any(old[field] != new[field] for field in stable):
                raise RuntimeError(f"Canonical identity changed at JSONL line {line_number}")
            changes.append({
                "canonical_text": new["canonical_text"],
                "current": {key: new[key] for key in ("basmala_classification", "tokenization_rule", "word_index")},
                "previous": {key: old[key] for key in ("basmala_classification", "tokenization_rule", "word_index")},
                "span_index": new["span_index"],
                "verse_key": new["verse_key"],
            })
    if [(row["verse_key"], row["span_index"]) for row in changes] != [("1:1", i) for i in range(1, 5)]:
        raise RuntimeError(f"Expected only the four Fatiha spans to change, got {changes!r}")
    if [row["current"]["word_index"] for row in changes] != [1, 2, 3, 4]:
        raise RuntimeError("Fatiha word_index values are not dense 1..4")
    if any(row["current"]["tokenization_rule"] != "arabic_word" for row in changes):
        raise RuntimeError("Fatiha spans are not analysis words")
    return changes


def _new_work_dir(prefix: str) -> Path:
    path = CANDIDATE_ROOT / f"{prefix}{uuid.uuid4().hex}"
    path.mkdir()
    return path




def freeze(output_dir: Path) -> dict:
    output_dir = output_dir.resolve()
    candidate_root = CANDIDATE_ROOT.resolve()
    if output_dir == candidate_root or candidate_root not in output_dir.parents:
        raise ValueError(f"Output must be below {candidate_root}")
    if output_dir.exists():
        raise FileExistsError(f"Refusing to overwrite existing freeze: {output_dir}")
    for required in (SOURCE, SOURCE_MANIFEST, OLD_MAP, OLD_POLICY):
        if not required.is_file():
            raise FileNotFoundError(required)

    stage = _new_work_dir("camel-token-map-v1_1-stage-")
    second = _new_work_dir("camel-token-map-v1_1-repeat-")
    try:
        map_path, policy_path = stage / "token-map.jsonl", stage / "policy.json"
        second_map, second_policy = second / "token-map.jsonl", second / "policy.json"
        policy = BUILDER.build_token_map(SOURCE, SOURCE_MANIFEST, map_path, policy_path)
        BUILDER.build_token_map(SOURCE, SOURCE_MANIFEST, second_map, second_policy)
        map_hash, repeat_hash = _sha256(map_path), _sha256(second_map)
        if map_hash != repeat_hash or policy_path.read_bytes() != second_policy.read_bytes():
            raise RuntimeError("Second generation is not byte-identical")
        if policy["counts"]["analysis_words"] != 77_433 or policy["source"]["verse_count"] != 6_236:
            raise RuntimeError("New policy does not contain 77,433 tokens and 6,236 verses")

        changes = _changed_records(OLD_MAP, map_path)
        manifest = {
            "basmala_policy": {
                "fatiha_1_1": "included_as_four_canonical_analysis_words",
                "surahs_2_to_114": "opening_basmala_excluded",
                "tawbah_9": "no_opening_basmala_exception_preserved",
            },
            "changed_canonical_spans": changes,
            "current_freeze": {
                "analysis_token_count": 77_433,
                "path": f"{_relative(output_dir)}/token-map.jsonl",
                "policy_path": f"{_relative(output_dir)}/policy.json",
                "policy_sha256": _sha256(policy_path),
                "sha256": map_hash,
                "verse_count": 6_236,
            },
            "delta": {"analysis_tokens": 4, "changed_canonical_spans": 4},
            "determinism": {
                "byte_identical": True,
                "first_generation_sha256": map_hash,
                "second_generation_sha256": repeat_hash,
            },
            "previous_freeze": {
                "analysis_token_count": 77_429,
                "path": _relative(OLD_MAP),
                "policy_path": _relative(OLD_POLICY),
                "policy_sha256": _sha256(OLD_POLICY),
                "sha256": _sha256(OLD_MAP),
                "verse_count": 6_236,
            },
            "schema_version": "camel-token-map-freeze-v1.1",
            "source_hashes": {
                "builder_sha256": _sha256(SCRIPT_DIR / "build-token-map.py"),
                "canonical_manifest_sha256": _sha256(SOURCE_MANIFEST),
                "canonical_text_sha256": _sha256(SOURCE),
                "validator_sha256": _sha256(SCRIPT_DIR / "validate-token-map.py"),
            },
            "status": "frozen",
        }
        (stage / "manifest.json").write_bytes(_json_bytes(manifest))
        os.rename(stage, output_dir)
        stage = None
        return manifest
    finally:
        if stage is not None:
            shutil.rmtree(stage, ignore_errors=True)
        shutil.rmtree(second, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest = freeze(args.output_dir)
    print(json.dumps({
        "new_sha256": manifest["current_freeze"]["sha256"],
        "old_sha256": manifest["previous_freeze"]["sha256"],
        "status": manifest["status"],
        "tokens": manifest["current_freeze"]["analysis_token_count"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
