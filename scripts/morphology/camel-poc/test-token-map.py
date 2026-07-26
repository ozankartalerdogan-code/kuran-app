#!/usr/bin/env python3
"""Hermetic tests for the independent Tanzil token-map builder and validator."""

from __future__ import annotations

import ast
import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
REAL_SOURCE = REPO_ROOT / "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt"
REAL_MANIFEST = REPO_ROOT / "data/vendor/tanzil/uthmani-1.1/manifest.json"
REAL_CANDIDATE_ROOT = REPO_ROOT / "data/candidates/morphology"


def _load_module(name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPT_DIR / file_name)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {file_name}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


BUILDER = _load_module("camel_token_builder", "build-token-map.py")
VALIDATOR = _load_module("camel_token_validator", "validate-token-map.py")


class TokenMapTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        REAL_CANDIDATE_ROOT.mkdir(parents=True, exist_ok=True)
        cls.sandbox = REAL_CANDIDATE_ROOT / "camel-token-test-sandbox"
        if cls.sandbox.exists():
            raise RuntimeError(f"Refusing to reuse test sandbox: {cls.sandbox}")
        cls.sandbox.mkdir()
        cls.addClassCleanup(shutil.rmtree, cls.sandbox, True)
        cls.hermetic_root = cls.sandbox / "hermetic-repo"
        cls.source = cls.hermetic_root / BUILDER.SOURCE_RELATIVE
        cls.manifest = cls.hermetic_root / BUILDER.MANIFEST_RELATIVE
        cls.source.parent.mkdir(parents=True)
        shutil.copy2(REAL_SOURCE, cls.source)
        shutil.copy2(REAL_MANIFEST, cls.manifest)

        cls.output_a = cls.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "run-a/token-map.jsonl"
        cls.report_a = cls.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "run-a/policy.json"
        read_paths: list[Path] = []
        original_read_bytes = Path.read_bytes

        def audited_read_bytes(path: Path) -> bytes:
            read_paths.append(path.resolve())
            return original_read_bytes(path)

        with mock.patch.object(Path, "read_bytes", audited_read_bytes):
            cls.policy = BUILDER.build_token_map(
                cls.source,
                cls.manifest,
                cls.output_a,
                cls.report_a,
                repo_root=cls.hermetic_root,
            )
        cls.builder_read_paths = set(read_paths)
        cls.validation = VALIDATOR.validate_token_map(
            cls.source,
            cls.manifest,
            cls.output_a,
            cls.report_a,
            repo_root=cls.hermetic_root,
        )

        cls.selected: dict[str, list[dict]] = {key: [] for key in ("1:1", "9:1", "27:30", "95:1", "97:1")}
        cls.first_standalone: dict | None = None
        cls.attached_06dc: list[dict] = []
        with cls.output_a.open("r", encoding="utf-8", newline="") as handle:
            for line in handle:
                record = json.loads(line)
                if record["verse_key"] in cls.selected:
                    cls.selected[record["verse_key"]].append(record)
                if record["tokenization_rule"] == "standalone_quran_sign" and cls.first_standalone is None:
                    cls.first_standalone = record
                if "\u06dc" in record["canonical_text"] and len(record["canonical_text"]) > 1:
                    cls.attached_06dc.append(record)

    def test_approved_counts_and_validator(self) -> None:
        self.assertEqual(self.policy["counts"], BUILDER._policy_report(
            self.policy["source"]["sha256"], self.policy["token_map_sha256"], self.policy["counts"]
        )["counts"])
        self.assertEqual(self.validation["counts"], {
            "total_spans": 82_459,
            "standalone_quran_signs": 4_578,
            "opening_basmala_words": 448,
            "analysis_words": 77_433,
        })

    def test_fatiha_has_four_dense_analysis_words(self) -> None:
        records = self.selected["1:1"]
        self.assertEqual(len(records), 4)
        self.assertEqual([record["word_index"] for record in records], [1, 2, 3, 4])
        self.assertTrue(all(record["tokenization_rule"] == "arabic_word" for record in records))
        self.assertTrue(all(record["basmala_classification"] == "opening_fatiha" for record in records))
        self.assertTrue(all(record["analysis_forms"][0] == record["canonical_text"] for record in records))

    def test_tawbah_has_no_opening_basmala(self) -> None:
        records = self.selected["9:1"]
        self.assertGreater(len(records), 4)
        self.assertFalse(any(record["tokenization_rule"] == "opening_basmala_excluded" for record in records))
        self.assertEqual(records[0]["word_index"], 1)

    def test_surahs_95_and_97_accept_vocalization_variant(self) -> None:
        for verse_key in ("95:1", "97:1"):
            opening = self.selected[verse_key][:4]
            self.assertEqual(len(opening), 4)
            self.assertTrue(all(record["tokenization_rule"] == "opening_basmala_excluded" for record in opening))
            self.assertTrue(all(record["basmala_classification"] == "opening_embedded" for record in opening))

    def test_in_verse_basmala_in_naml_remains_lexical(self) -> None:
        records = [record for record in self.selected["27:30"] if record["basmala_classification"] == "in_verse_lexical"]
        self.assertEqual(len(records), 4)
        self.assertTrue(all(record["tokenization_rule"] == "arabic_word" for record in records))
        self.assertTrue(all(isinstance(record["word_index"], int) for record in records))

    def test_standalone_waqf_is_structural(self) -> None:
        self.assertIsNotNone(self.first_standalone)
        record = self.first_standalone
        assert record is not None
        self.assertIsNone(record["word_index"])
        self.assertEqual(record["analysis_forms"], [])
        self.assertEqual(len(record["canonical_text"]), 1)

    def test_attached_06dc_remains_inside_arabic_word_span(self) -> None:
        self.assertEqual(len(self.attached_06dc), 2)
        self.assertTrue(all(record["tokenization_rule"] == "arabic_word" for record in self.attached_06dc))
        self.assertTrue(all(record["analysis_forms"][0] == record["canonical_text"] for record in self.attached_06dc))

    def test_offsets_are_unicode_code_points_not_utf16_units(self) -> None:
        astral_token = "\U00010a55\u0628"
        spans = list(BUILDER.iter_canonical_spans(f"\u0627 {astral_token}"))
        self.assertEqual(spans[1], (2, 4, astral_token))
        self.assertEqual(len(astral_token), 2)
        self.assertEqual(len(astral_token.encode("utf-16-le")) // 2, 3)

    def test_builder_reads_only_two_allowlisted_inputs_in_hermetic_repo(self) -> None:
        self.assertEqual(self.builder_read_paths, {self.source.resolve(), self.manifest.resolve()})
        self.assertEqual(
            sorted(path.relative_to(self.hermetic_root).as_posix() for path in self.builder_read_paths),
            [BUILDER.MANIFEST_RELATIVE.as_posix(), BUILDER.SOURCE_RELATIVE.as_posix()],
        )

    def test_forbidden_imports_are_absent(self) -> None:
        forbidden = {"glob", "requests", "socket", "sqlite3", "subprocess", "urllib"}
        for file_name in ("build-token-map.py", "validate-token-map.py"):
            tree = ast.parse((SCRIPT_DIR / file_name).read_text(encoding="utf-8"), filename=file_name)
            imported: set[str] = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imported.update(alias.name.split(".")[0] for alias in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imported.add(node.module.split(".")[0])
            self.assertFalse(imported & forbidden, f"{file_name}: forbidden imports {sorted(imported & forbidden)}")

    def test_deterministic_byte_identical_outputs_in_two_directories(self) -> None:
        output_b = self.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "run-b/token-map.jsonl"
        report_b = self.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "run-b/policy.json"
        BUILDER.build_token_map(self.source, self.manifest, output_b, report_b, repo_root=self.hermetic_root)
        self.assertEqual(self.output_a.read_bytes(), output_b.read_bytes())
        self.assertEqual(self.report_a.read_bytes(), report_b.read_bytes())

    def test_existing_candidate_is_never_overwritten(self) -> None:
        output = self.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "existing/token-map.jsonl"
        report = self.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "existing/policy.json"
        output.parent.mkdir(parents=True)
        output.write_bytes(b"sentinel\n")
        with self.assertRaises(FileExistsError):
            BUILDER.build_token_map(self.source, self.manifest, output, report, repo_root=self.hermetic_root)
        self.assertEqual(output.read_bytes(), b"sentinel\n")
        self.assertFalse(report.exists())

    def test_output_path_traversal_is_rejected(self) -> None:
        outside = self.hermetic_root / "production-token-map.jsonl"
        report = self.hermetic_root / BUILDER.CANDIDATE_RELATIVE / "traversal/policy.json"
        with self.assertRaises(ValueError):
            BUILDER.build_token_map(self.source, self.manifest, outside, report, repo_root=self.hermetic_root)
        self.assertFalse(outside.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
