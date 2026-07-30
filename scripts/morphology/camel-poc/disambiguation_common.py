#!/usr/bin/env python3
"""Shared deterministic helpers for the candidate-only disambiguation PoC."""

from __future__ import annotations

import hashlib
import json
import os
import socket
import sys
import types
import unicodedata
from pathlib import Path
from typing import Iterable, Iterator


REPO_ROOT = Path(__file__).resolve().parents[3]
CANDIDATE_BASE = REPO_ROOT / "data/candidates/morphology"
CAMEL_BASE = CANDIDATE_BASE / "camel-morph-msa-v1.0"
TOKEN_MAP = CAMEL_BASE / "token-map.jsonl"
FULL_DIR = CAMEL_BASE / "full-analysis"
RUN_MANIFEST = FULL_DIR / "run-manifest.json"
FULL_SUMMARY = CANDIDATE_BASE / "reports/camel-morph-full-analysis-summary.json"
DB_PATH = CAMEL_BASE / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
DISAMBIG_DIR = CANDIDATE_BASE / "disambiguation"
REPORT_DIR = CANDIDATE_BASE / "reports"
EVAL_SET = DISAMBIG_DIR / "eval-set.jsonl"
EVAL_MANIFEST = DISAMBIG_DIR / "eval-set-manifest.json"
RANKED_SET = DISAMBIG_DIR / "ranked-eval-set.jsonl"
OOV_RECOVERY = DISAMBIG_DIR / "oov-recovery.jsonl"
POC_SUMMARY = REPORT_DIR / "disambiguation-poc-summary.json"
VS_LEGACY = REPORT_DIR / "disambiguation-vs-legacy.json"

EXPECTED_TOKEN_SHA256 = "2f56784c102bec10a6ed58a54cc099631fa740c782c47d9b42a3d77e78348329"
EXPECTED_RUN_MANIFEST_SHA256 = "e3dba192f81c3fe2c2a13c5f4066177b7e3d7aa0194d04a5c8ea60580c4a7ca8"
EXPECTED_FULL_SUMMARY_SHA256 = "962b3c80403b34241637fa24b75974e744639acf79063f29f363ee7371ed32f6"
EXPECTED_DB_SHA256 = "110e03baa282874062d076e23d9671e985b6f76520b891d58cba4e55de0b8f60"
EXPECTED_WORDS = 77_429
EXPECTED_SHARDS = 114
EXPECTED_UNIQUE_CANDIDATES = 3_300_899
EXPECTED_OOV = 1_211
SEED = "camel-contextual-eval-v1"

QURAN_MARKS = frozenset(chr(cp) for cp in range(0x06D6, 0x06EE))
ALIF_FOLD = str.maketrans({"آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ى": "ي"})


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(json_bytes(value))
    os.replace(tmp, path)


def write_jsonl_atomic(path: Path, records: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with tmp.open("xb") as handle:
        for record in records:
            handle.write(json_bytes(record))
    os.replace(tmp, path)


def read_jsonl(path: Path) -> Iterator[dict]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        for line in handle:
            yield json.loads(line)


def require_exact(path: Path, expected: Path, label: str) -> Path:
    actual = path.resolve(strict=False)
    wanted = expected.resolve(strict=False)
    if actual != wanted:
        raise ValueError(f"{label} must be exactly {wanted}")
    return actual


def require_candidate_output(path: Path, expected: Path, label: str) -> Path:
    actual = require_exact(path, expected, label)
    root = CANDIDATE_BASE.resolve()
    if root not in actual.parents:
        raise ValueError(f"{label} must remain below {root}")
    return actual


def validate_full_inputs(check_shard_hashes: bool = True) -> dict:
    if sha256_file(TOKEN_MAP) != EXPECTED_TOKEN_SHA256:
        raise ValueError("Token-map SHA-256 mismatch")
    if sha256_file(RUN_MANIFEST) != EXPECTED_RUN_MANIFEST_SHA256:
        raise ValueError("Run-manifest SHA-256 mismatch")
    if sha256_file(FULL_SUMMARY) != EXPECTED_FULL_SUMMARY_SHA256:
        raise ValueError("Full-analysis summary SHA-256 mismatch")
    manifest = load_json(RUN_MANIFEST)
    summary = load_json(FULL_SUMMARY)
    totals = manifest.get("global_totals", {})
    if len(manifest.get("shards", [])) != EXPECTED_SHARDS:
        raise ValueError("Expected 114 full-analysis shards")
    if totals.get("analysis_words") != EXPECTED_WORDS:
        raise ValueError("Expected 77,429 analysis words")
    if totals.get("unique_candidates") != EXPECTED_UNIQUE_CANDIDATES:
        raise ValueError("Expected 3,300,899 unique candidates")
    if totals.get("no_analysis") != EXPECTED_OOV:
        raise ValueError("Expected 1,211 OOV words")
    if manifest.get("disambiguated") is not False or manifest.get("production_approved") is not False:
        raise ValueError("Full-analysis safety flags mismatch")
    if summary.get("all_77429_words_processed") is not True:
        raise ValueError("Full-analysis summary is incomplete")
    if check_shard_hashes:
        for entry in manifest["shards"]:
            shard = FULL_DIR / entry["filename"]
            if sha256_file(shard) != entry["sha256"]:
                raise ValueError(f"Shard SHA mismatch: {entry['filename']}")
    return manifest


def identity(record: dict) -> str:
    return f"{record['verse_key']}:{record['word_index']}"


def identity_sort(record: dict) -> tuple[int, int, int]:
    surah, ayah = (int(part) for part in record["verse_key"].split(":", 1))
    return surah, ayah, int(record["word_index"])


def stable_hash(record_or_identity: dict | str, namespace: str = SEED) -> str:
    value = record_or_identity if isinstance(record_or_identity, str) else identity(record_or_identity)
    return hashlib.sha256(f"{namespace}|{value}".encode("utf-8")).hexdigest()


def candidate_signature(candidate: dict) -> str:
    return json.dumps(candidate, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def strip_marks(value: str, *, fold_alif: bool = True) -> str:
    output = []
    for char in value or "":
        if char == "ـ" or char in QURAN_MARKS or unicodedata.category(char).startswith("M"):
            continue
        output.append(char)
    result = "".join(output)
    return result.translate(ALIF_FOLD) if fold_alif else result


def has_harakat(value: str) -> bool:
    return any(unicodedata.category(char).startswith("M") for char in value)


def has_uthmani_mark(value: str) -> bool:
    return any(char in QURAN_MARKS or char in {"ٱ", "ٰ", "ـ"} or 0x06D6 <= ord(char) <= 0x06ED for char in value)


def coarse_pos(value: str | None) -> str:
    text = (value or "").lower()
    if "verb" in text:
        return "verb"
    if "noun_prop" in text or "proper" in text:
        return "proper_noun"
    if "pron" in text:
        return "pronoun"
    if any(marker in text for marker in ("part", "prep", "conj", "interj", "adv_rel", "adv_interrog")):
        return "particle"
    if any(marker in text for marker in ("noun", "adj", "adv", "num")):
        return "noun"
    return "other"


def candidate_bucket(count: int) -> str:
    if count == 0:
        return "oov"
    if count == 1:
        return "single"
    if count <= 9:
        return "low"
    if count <= 99:
        return "medium"
    return "high"


def block_network() -> None:
    def blocked(*_args, **_kwargs):
        raise RuntimeError("Network access is disabled for the disambiguation PoC")

    class OfflineSocket(socket.socket):
        def connect(self, *_args, **_kwargs):
            blocked()

        def connect_ex(self, *_args, **_kwargs):
            blocked()

    socket.socket = OfflineSocket
    socket.create_connection = blocked


def load_camel_analyzer():
    if sha256_file(DB_PATH) != EXPECTED_DB_SHA256:
        raise ValueError("Camel Morph DB SHA-256 mismatch")
    if "camel_tools.data" not in sys.modules:
        stub = types.ModuleType("camel_tools.data")
        stub.CATALOGUE = None
        sys.modules["camel_tools.data"] = stub
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    block_network()
    return Analyzer(MorphologyDB(str(DB_PATH), flags="a"))
