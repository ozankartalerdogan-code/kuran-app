#!/usr/bin/env python3
"""Validate the complete candidate-only Camel Morph shard set without analysis."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
BUILDER_PATH = SCRIPT_DIR / "build-full-camel-analyses.py"

SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}\Z")
# SHA-256 values of prior revisions of THIS validator script. run-manifest.json
# records the hash of the validator that ran at build time; later validator
# revisions must list every superseded hash here so the recorded value stays
# reachable through an explicit, auditable chain.
VALIDATOR_SCRIPT_PREDECESSOR_SHA256S = (
    "4e6dc7e4d8d87fbd1df9d528728f2c051862e17bcf47b531ef47ef9cebf15c6e",
)


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _require_sha256(value: object, label: str) -> str:
    if not isinstance(value, str) or not SHA256_PATTERN.match(value):
        raise ValueError(f"{label} is not a lowercase hex SHA-256: {value!r}")
    return value


def verify_provenance_manifest_hash(manifest_path: Path, recorded_sha: object, label: str) -> str:
    """Verify a provenance manifest against the SHA-256 recorded in run-manifest.

    The current file hash is always computed from the file bytes. If it does not
    match the recorded value, the recorded value must be reachable through the
    manifest's own `manifest_revision` chain (`previous_sha256` plus optional
    `previous_revisions`, newest first). Cycles, self-references, malformed
    hashes, or an unreachable recorded hash fail validation. This applies only
    to provenance manifests, never to token-map, DB, or shard hashes.
    """
    recorded = _require_sha256(recorded_sha, f"{label}: recorded sha256")
    current_sha = _sha256_file(manifest_path)
    if current_sha == recorded:
        return "MANIFEST_HASH_CURRENT_VERIFIED"

    data = json.loads(manifest_path.read_bytes().decode("utf-8-sig"))
    revision = data.get("manifest_revision")
    if not isinstance(revision, dict):
        raise ValueError(f"{label}: hash differs from run manifest and no manifest_revision chain is declared")
    revision_number = revision.get("revision")
    if not isinstance(revision_number, int) or isinstance(revision_number, bool) or revision_number < 2:
        raise ValueError(f"{label}: manifest_revision.revision must be an integer >= 2 when a chain is declared")
    chain: list[object] = [revision.get("previous_sha256")]
    previous_revisions = revision.get("previous_revisions", [])
    if not isinstance(previous_revisions, list):
        raise ValueError(f"{label}: manifest_revision.previous_revisions must be a list")
    chain.extend(previous_revisions)

    seen = {current_sha}
    for entry in chain:
        entry_sha = _require_sha256(entry, f"{label}: manifest_revision chain entry")
        if entry_sha in seen:
            raise ValueError(f"{label}: manifest_revision chain contains a cycle or self-reference")
        seen.add(entry_sha)
        if entry_sha == recorded:
            return "MANIFEST_REVISION_VERIFIED"
    raise ValueError(f"{label}: recorded sha256 is not reachable through the manifest_revision chain")


def verify_validator_script_hash(recorded_sha: object) -> str:
    recorded = _require_sha256(recorded_sha, "run manifest validator_script_sha256")
    current_sha = _sha256_file(Path(__file__).resolve())
    if recorded == current_sha:
        return "VALIDATOR_SCRIPT_HASH_CURRENT_VERIFIED"
    if recorded in VALIDATOR_SCRIPT_PREDECESSOR_SHA256S:
        return "VALIDATOR_SCRIPT_REVISION_VERIFIED"
    raise ValueError("Run manifest validator SHA mismatch")


def load_builder():
    spec = importlib.util.spec_from_file_location("camel_full_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load builder: {BUILDER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate(args: argparse.Namespace) -> dict:
    builder = load_builder()
    token_map = builder.require_exact(args.token_map, builder.TOKEN_MAP, "token map")
    db_path = builder.require_exact(args.db, builder.DB_PATH, "Camel Morph DB")
    environment_path = builder.require_exact(
        args.environment_manifest, builder.ENVIRONMENT_MANIFEST, "environment manifest"
    )
    source_path = builder.require_exact(args.source_manifest, builder.SOURCE_MANIFEST, "source manifest")
    output_dir = builder.require_candidate_path(args.output_dir, builder.OUTPUT_DIR, "full-analysis output")
    summary_path = builder.require_candidate_path(args.summary, builder.SUMMARY_PATH, "full-analysis summary")
    builder.validate_preflight(token_map, db_path, environment_path, source_path, output_dir)

    manifest_path = output_dir / "run-manifest.json"
    progress_path = output_dir / "progress.json"
    if not manifest_path.is_file() or not summary_path.is_file() or not progress_path.is_file():
        raise ValueError("Final manifest, summary, or progress file is missing")
    manifest = builder.load_json(manifest_path)
    summary = builder.load_json(summary_path)
    progress = builder.load_json(progress_path)

    if manifest.get("schema_version") != "camel-morph-full-analysis-v1":
        raise ValueError("Unexpected run manifest schema")
    if manifest.get("token_map_sha256") != builder.EXPECTED_TOKEN_SHA256:
        raise ValueError("Run manifest token-map SHA mismatch")
    if manifest.get("db_sha256") != builder.EXPECTED_DB_SHA256:
        raise ValueError("Run manifest DB SHA mismatch")
    if manifest.get("analysis_script_sha256") != builder.sha256_file(BUILDER_PATH):
        raise ValueError("Run manifest builder SHA mismatch")
    validator_script_status = verify_validator_script_hash(manifest.get("validator_script_sha256"))
    environment_manifest_status = verify_provenance_manifest_hash(
        environment_path, manifest.get("environment_manifest_sha256"), "environment manifest"
    )
    source_manifest_status = verify_provenance_manifest_hash(
        source_path, manifest.get("source_manifest_sha256"), "source manifest"
    )
    if not manifest.get("candidate_only") or manifest.get("disambiguated") or manifest.get("production_approved"):
        raise ValueError("Candidate-only safety flags are invalid")

    manifest_shards = manifest.get("shards")
    if not isinstance(manifest_shards, list) or len(manifest_shards) != builder.EXPECTED_SURAHS:
        raise ValueError("Run manifest must list exactly 114 shards")
    expected_filenames = {f"surah-{surah:03d}.jsonl.gz" for surah in range(1, 115)}
    actual_filenames = {path.name for path in output_dir.glob("surah-*.jsonl.gz")}
    if actual_filenames != expected_filenames:
        raise ValueError("Shard filename set is incomplete or contains unexpected files")

    shard_stats = []
    manifest_by_surah = {entry["surah"]: entry for entry in manifest_shards}
    for expected_surah, (surah, records) in enumerate(builder.iter_surah_records(token_map), start=1):
        if surah != expected_surah:
            raise ValueError(f"Expected surah {expected_surah}, found {surah}")
        shard_path = output_dir / f"surah-{surah:03d}.jsonl.gz"
        stats = builder.validate_shard(shard_path, records, surah)
        if builder.shard_manifest_entry(stats) != manifest_by_surah.get(surah):
            raise ValueError(f"Shard manifest entry mismatch for surah {surah}")
        shard_stats.append(stats)

    merged = builder.merge_stats(shard_stats)
    if builder.global_totals(merged) != manifest.get("global_totals"):
        raise ValueError("Global totals mismatch")
    if builder.finalized_field_coverage(merged) != manifest.get("field_coverage_over_unique_candidates"):
        raise ValueError("Field coverage mismatch")
    if builder.finalized_form_contribution(merged) != manifest.get("analysis_form_contribution"):
        raise ValueError("Analysis form contribution mismatch")
    if summary.get("surah_coverage") != [builder.shard_manifest_entry(stats) for stats in shard_stats]:
        raise ValueError("Summary surah coverage mismatch")
    if summary.get("coverage") != {
        key: manifest["global_totals"][key]
        for key in (
            "exact_has_analysis", "exact_coverage_percent", "any_form_has_analysis",
            "any_form_coverage_percent", "normalize_only", "normalize_only_percent",
            "no_analysis", "no_analysis_percent", "normalization_sensitive",
        )
    }:
        raise ValueError("Summary coverage mismatch")
    if progress.get("status") != "completed" or progress.get("completed_surahs") != list(range(1, 115)):
        raise ValueError("Progress file does not report all 114 completed surahs")
    if list(output_dir.glob("*.tmp")) or (output_dir / ".determinism-check").exists():
        raise ValueError("Temporary analysis artifacts remain")

    return {
        "status": "valid",
        "analysis_words": merged["word_count"],
        "shards": len(shard_stats),
        "compressed_bytes": merged["compressed_bytes"],
        "manifest_sha256": builder.sha256_file(manifest_path),
        "summary_sha256": builder.sha256_file(summary_path),
        "validator_script_hash_status": validator_script_status,
        "environment_manifest_hash_status": environment_manifest_status,
        "source_manifest_hash_status": source_manifest_status,
    }


def parse_args() -> argparse.Namespace:
    builder = load_builder()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-map", type=Path, default=builder.TOKEN_MAP)
    parser.add_argument("--db", type=Path, default=builder.DB_PATH)
    parser.add_argument("--environment-manifest", type=Path, default=builder.ENVIRONMENT_MANIFEST)
    parser.add_argument("--source-manifest", type=Path, default=builder.SOURCE_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=builder.OUTPUT_DIR)
    parser.add_argument("--summary", type=Path, default=builder.SUMMARY_PATH)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(validate(parse_args()), ensure_ascii=True, sort_keys=True))
