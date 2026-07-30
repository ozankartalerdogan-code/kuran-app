#!/usr/bin/env python3
"""Hermetic tests for the provenance manifest revision-chain verification."""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent


def _load_module(name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPT_DIR / file_name)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {file_name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


VALIDATOR = _load_module("camel_full_validator_revision_test", "validate-full-camel-analyses.py")
BUILDER = _load_module("camel_full_builder_revision_test", "build-full-camel-analyses.py")

RECORDED = "a" * 64
OTHER = "b" * 64
THIRD = "c" * 64


def write_manifest(directory: Path, payload: dict) -> tuple[Path, str]:
    path = directory / "manifest.json"
    data = (json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    path.write_bytes(data)
    return path, hashlib.sha256(data).hexdigest()


class RevisionChainTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)

    def verify(self, payload: dict, recorded: object) -> str:
        path, _current = write_manifest(self.dir, payload)
        return VALIDATOR.verify_provenance_manifest_hash(path, recorded, "test manifest")

    def test_current_sha_matches_directly(self) -> None:
        path, current = write_manifest(self.dir, {"artifact": {"sha256": RECORDED}})
        status = VALIDATOR.verify_provenance_manifest_hash(path, current, "test manifest")
        self.assertEqual(status, "MANIFEST_HASH_CURRENT_VERIFIED")

    def test_single_revision_verifies_recorded_sha(self) -> None:
        status = self.verify(
            {"manifest_revision": {"revision": 2, "previous_sha256": RECORDED}}, RECORDED
        )
        self.assertEqual(status, "MANIFEST_REVISION_VERIFIED")

    def test_multi_revision_chain_verifies_older_sha(self) -> None:
        status = self.verify(
            {
                "manifest_revision": {
                    "revision": 4,
                    "previous_sha256": OTHER,
                    "previous_revisions": [THIRD, RECORDED],
                }
            },
            RECORDED,
        )
        self.assertEqual(status, "MANIFEST_REVISION_VERIFIED")

    def test_wrong_previous_sha_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "not reachable"):
            self.verify({"manifest_revision": {"revision": 2, "previous_sha256": OTHER}}, RECORDED)

    def test_broken_chain_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "not reachable"):
            self.verify(
                {
                    "manifest_revision": {
                        "revision": 3,
                        "previous_sha256": OTHER,
                        "previous_revisions": [THIRD],
                    }
                },
                RECORDED,
            )

    def test_self_reference_cycle_fails(self) -> None:
        # A chain entry equal to the current file hash is a self-reference; a
        # real file cannot embed its own SHA-256, so pin the computed hash.
        payload = {
            "manifest_revision": {
                "revision": 2,
                "previous_sha256": OTHER,
                "previous_revisions": [RECORDED],
            }
        }
        path, _current = write_manifest(self.dir, payload)
        original = VALIDATOR._sha256_file
        VALIDATOR._sha256_file = lambda _path: OTHER
        try:
            with self.assertRaisesRegex(ValueError, "cycle or self-reference"):
                VALIDATOR.verify_provenance_manifest_hash(path, RECORDED, "test manifest")
        finally:
            VALIDATOR._sha256_file = original

    def test_duplicate_chain_entry_is_a_cycle(self) -> None:
        with self.assertRaisesRegex(ValueError, "cycle"):
            self.verify(
                {
                    "manifest_revision": {
                        "revision": 3,
                        "previous_sha256": OTHER,
                        "previous_revisions": [OTHER, RECORDED],
                    }
                },
                RECORDED,
            )

    def test_invalid_sha_format_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "not a lowercase hex SHA-256"):
            self.verify({"manifest_revision": {"revision": 2, "previous_sha256": "XYZ"}}, RECORDED)
        with self.assertRaisesRegex(ValueError, "not a lowercase hex SHA-256"):
            self.verify({}, "not-a-sha")

    def test_missing_revision_field_with_mismatch_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "no manifest_revision chain"):
            self.verify({"artifact": {"sha256": RECORDED}}, RECORDED)

    def test_invalid_revision_number_fails(self) -> None:
        for bad in (1, 0, True, "2", None):
            with self.assertRaisesRegex(ValueError, "revision must be an integer >= 2"):
                self.verify(
                    {"manifest_revision": {"revision": bad, "previous_sha256": RECORDED}}, RECORDED
                )


class ValidatorScriptHashTests(unittest.TestCase):
    def test_current_hash_verifies(self) -> None:
        current = VALIDATOR._sha256_file(SCRIPT_DIR / "validate-full-camel-analyses.py")
        self.assertEqual(
            VALIDATOR.verify_validator_script_hash(current), "VALIDATOR_SCRIPT_HASH_CURRENT_VERIFIED"
        )

    def test_predecessor_hash_verifies_as_revision(self) -> None:
        predecessor = VALIDATOR.VALIDATOR_SCRIPT_PREDECESSOR_SHA256S[0]
        current = VALIDATOR._sha256_file(SCRIPT_DIR / "validate-full-camel-analyses.py")
        self.assertNotEqual(predecessor, current)
        self.assertEqual(
            VALIDATOR.verify_validator_script_hash(predecessor), "VALIDATOR_SCRIPT_REVISION_VERIFIED"
        )

    def test_unknown_hash_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "validator SHA mismatch"):
            VALIDATOR.verify_validator_script_hash(OTHER)


class FakeAnalyzer:
    def analyze(self, form: str) -> list[dict]:
        if form.startswith("كتاب"):
            return [{"lex": "كِتاب", "root": "ك.ت.ب", "pos": "noun"}]
        return []


class ShardIntegrityUnaffectedByRevisionTests(unittest.TestCase):
    """Shard content validation stays byte/content-based; a manifest_revision
    block inside shard data must not let a tampered shard pass."""

    def test_tampered_shard_fails_even_with_revision_block(self) -> None:
        token = {
            "verse_key": "1:1",
            "word_index": 1,
            "canonical_text": "كتابٌ",
            "analysis_forms": ["كتابٌ", "كتاب"],
            "normalization_traces": [
                {"analysis_form_index": 0, "paths": [{"profile": "exact"}]},
                {"analysis_form_index": 1, "paths": [{"profile": "undia"}]},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            shard = Path(tmp) / "surah-001.jsonl.gz"
            BUILDER.write_shard(shard, [token], FakeAnalyzer(), 1)
            self.assertEqual(BUILDER.validate_shard(shard, [token], 1)["word_count"], 1)

            with gzip.open(shard, "rt", encoding="utf-8") as handle:
                record = json.loads(handle.readline())
            record["analysis_forms"][0]["candidates"][0]["lex"] = "tampered"
            record["manifest_revision"] = {"revision": 2, "previous_sha256": RECORDED}
            buffer = io.BytesIO()
            with gzip.GzipFile(filename="", mode="wb", fileobj=buffer, mtime=0) as out:
                out.write((json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8"))
            shard.write_bytes(buffer.getvalue())

            with self.assertRaises(ValueError):
                BUILDER.validate_shard(shard, [token], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
