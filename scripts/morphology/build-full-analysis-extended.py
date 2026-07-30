#!/usr/bin/env python3
"""Regenerate the full-analysis dump from the paradigm-extended CAMeL DB.

This does NOT re-implement the analysis. It imports the FROZEN dump builder
(`camel-poc/build-full-camel-analyses.py`) and reuses its exact per-word
analysis and serialization (`analyze_word`, `json_bytes`, `write_shard`,
`iter_surah_records`, `load_analyzer`), so every shard is byte-for-byte what the
frozen builder would emit - the only intended difference from the original dump
is the candidates the 30 new stem entries add.

Guarantees:
  * the ORIGINAL CAMeL DB and the ORIGINAL full-analysis dir are never written;
  * output goes to a NEW sibling directory keyed to the extension;
  * the same token-map (unchanged) drives the same 77,429 words in the same
    order, so the two dumps are directly comparable token by token;
  * gzip mtime=0 and compresslevel=6 are inherited from the frozen writer, so
    two independent runs are byte-identical.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"

TOKEN_MAP = CAMEL_ROOT / "token-map.jsonl"
ORIGINAL_DB = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
EXTENDED_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
ORIGINAL_DUMP = CAMEL_ROOT / "full-analysis"
OUTPUT_DIR = CAMEL_ROOT / "full-analysis-paradigm-ext-v1"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


BUILDER = load_module(SCRIPT_DIR / "camel-poc" / "build-full-camel-analyses.py",
                      "frozen_full_analysis_builder")


def main() -> int:
    if not EXTENDED_DB.exists():
        raise SystemExit(f"missing extended DB: {EXTENDED_DB}")
    if EXTENDED_DB.resolve() == ORIGINAL_DB.resolve():
        raise SystemExit("FAIL-CLOSED: refusing to point at the original DB")
    if OUTPUT_DIR.resolve() == ORIGINAL_DUMP.resolve():
        raise SystemExit("FAIL-CLOSED: refusing to overwrite the original dump")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    analyzer = BUILDER.load_analyzer(EXTENDED_DB)

    shard_hashes = {}
    total_words = 0
    for expected_surah, (surah, records) in enumerate(
            BUILDER.iter_surah_records(TOKEN_MAP), start=1):
        if surah != expected_surah:
            raise SystemExit(f"expected surah {expected_surah}, found {surah}")
        shard_path = OUTPUT_DIR / f"surah-{surah:03d}.jsonl.gz"
        stats = BUILDER.write_shard(shard_path, records, analyzer, surah)
        shard_hashes[f"surah-{surah:03d}.jsonl.gz"] = stats["sha256"]
        total_words += stats["word_count"]

    if total_words != BUILDER.EXPECTED_ANALYSIS_WORDS:
        raise SystemExit(f"expected {BUILDER.EXPECTED_ANALYSIS_WORDS} words, "
                         f"found {total_words}")

    manifest = {
        "schema_version": "camel-morph-full-analysis-extended-v1",
        "derived_from_builder": BUILDER.sha256_file(
            SCRIPT_DIR / "camel-poc" / "build-full-camel-analyses.py"),
        "original_db_sha256": BUILDER.sha256_file(ORIGINAL_DB),
        "extended_db_sha256": BUILDER.sha256_file(EXTENDED_DB),
        "token_map_sha256": BUILDER.sha256_file(TOKEN_MAP),
        "analysis_words": total_words,
        "shards": len(shard_hashes),
        "shard_sha256": dict(sorted(shard_hashes.items())),
    }
    (OUTPUT_DIR / "run-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({"analysis_words": total_words, "shards": len(shard_hashes),
                      "output_dir": str(OUTPUT_DIR.relative_to(REPO_ROOT))},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
