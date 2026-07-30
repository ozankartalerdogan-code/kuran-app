#!/usr/bin/env python3
"""Regenerate the full-analysis dump from the HC1-extended token map.

Same shape as `build-full-analysis-ortho-ext-v1.py`: the FROZEN dump builder
(`camel-poc/build-full-camel-analyses.py`) is imported and its `load_analyzer`,
`iter_surah_records` and `write_shard` are reused verbatim, so every shard is
byte-for-byte what the frozen builder would emit. Exactly one input differs from
v1.7:

  * the token map is the HC1-extended one (extra analyzer forms only;
    canonical_text and analysis_forms[0] identical to the frozen map, and the
    v1.7 forms kept at their v1.7 positions);
  * the DB stays the v1.6 paradigm-extended DB, unchanged.

Because analysis_forms are only APPENDED, the builder's `unique_candidates`
dict inserts every prior candidate first and in the prior order, so the new dump
can only be a superset per token. That is asserted here against the FROZEN v1.7
dump rather than assumed.

The original CAMeL DB, the original dump and the frozen v1.6 / v1.7 dumps are
never written.
"""

from __future__ import annotations

import argparse
import gzip
import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"

DERIVED_TOKEN_MAP = CAND_ROOT / "hc1-ext-v1_8" / "token-map-hc1-ext-v1_8.jsonl"
ORIGINAL_DB = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
EXTENDED_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
ORIGINAL_DUMP = CAMEL_ROOT / "full-analysis"
FROZEN_V1_6_DUMP = CAMEL_ROOT / "full-analysis-paradigm-ext-v1"
FROZEN_V1_7_DUMP = CAMEL_ROOT / "full-analysis-ortho-ext-v1"
OUTPUT_DIR = CAMEL_ROOT / "full-analysis-hc1-ext-v1_8"

PROTECTED = (ORIGINAL_DUMP, FROZEN_V1_6_DUMP, FROZEN_V1_7_DUMP)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


BUILDER = load_module(SCRIPT_DIR / "camel-poc" / "build-full-camel-analyses.py",
                      "frozen_full_analysis_builder")


def candidate_key(candidate: dict) -> str:
    return BUILDER.candidate_signature(candidate)


def compare_shard(frozen: Path, produced: Path):
    """Per-token containment check against the frozen v1.7 dump."""
    removed = altered = gained = 0
    with gzip.open(frozen, "rt", encoding="utf-8") as a, \
            gzip.open(produced, "rt", encoding="utf-8") as b:
        for line_a, line_b in zip(a, b):
            old, new = json.loads(line_a), json.loads(line_b)
            if (old["verse_key"], old["word_index"]) != (new["verse_key"], new["word_index"]):
                raise SystemExit("token order diverged between dumps")
            old_keys = [candidate_key(c) for c in old["unique_candidates"]]
            new_keys = [candidate_key(c) for c in new["unique_candidates"]]
            if new_keys[:len(old_keys)] != old_keys:
                # not a prefix: either something was dropped or the order moved
                if set(old_keys) - set(new_keys):
                    removed += 1
                else:
                    altered += 1
            elif len(new_keys) > len(old_keys):
                gained += 1
        if a.readline() or b.readline():
            raise SystemExit("dumps have different token counts")
    return removed, altered, gained


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUTPUT_DIR))
    parser.add_argument("--token-map", default=str(DERIVED_TOKEN_MAP))
    parser.add_argument("--skip-containment", action="store_true",
                        help="skip the per-token containment check against the "
                             "frozen v1.7 dump (determinism re-runs only: the "
                             "property is established by the first run)")
    parser.add_argument("--verify-only", action="store_true",
                        help="do not write shards; re-validate the 114 shards "
                             "already in --out-dir with the FROZEN builder's own "
                             "`validate_shard` (record-by-record against the token "
                             "map, deterministic-gzip header, verse coverage, "
                             "sha256) and then finish the containment check and "
                             "the run manifest. For resuming an interrupted run: "
                             "the shards are not trusted, they are re-checked.")
    args = parser.parse_args()
    output_dir = Path(args.out_dir)
    derived_token_map = Path(args.token_map)

    for path in (derived_token_map, EXTENDED_DB, FROZEN_V1_7_DUMP):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    if output_dir.resolve() in tuple(p.resolve() for p in PROTECTED):
        raise SystemExit("FAIL-CLOSED: refusing to overwrite a frozen dump")
    output_dir.mkdir(parents=True, exist_ok=True)

    analyzer = None if args.verify_only else BUILDER.load_analyzer(EXTENDED_DB)

    shard_hashes = {}
    total_words = 0
    for expected_surah, (surah, records) in enumerate(
            BUILDER.iter_surah_records(derived_token_map), start=1):
        if surah != expected_surah:
            raise SystemExit(f"expected surah {expected_surah}, found {surah}")
        shard_path = output_dir / f"surah-{surah:03d}.jsonl.gz"
        if args.verify_only:
            if not shard_path.exists():
                raise SystemExit(f"--verify-only: missing shard {shard_path}")
            stats = BUILDER.validate_shard(shard_path, records, surah)
        else:
            stats = BUILDER.write_shard(shard_path, records, analyzer, surah)
        shard_hashes[f"surah-{surah:03d}.jsonl.gz"] = stats["sha256"]
        total_words += stats["word_count"]
        print(f"[{'validate' if args.verify_only else 'dump'}] {surah}/114 "
              f"words={stats['word_count']}", file=sys.stderr, flush=True)

    if total_words != BUILDER.EXPECTED_ANALYSIS_WORDS:
        raise SystemExit(f"expected {BUILDER.EXPECTED_ANALYSIS_WORDS} words, "
                         f"found {total_words}")

    removed = altered = gained = None if args.skip_containment else 0
    for name in [] if args.skip_containment else sorted(shard_hashes):
        r, a, g = compare_shard(FROZEN_V1_7_DUMP / name, output_dir / name)
        removed += r
        altered += a
        gained += g
        print(f"[cmp] {name} removed={r} altered={a} gained={g}",
              file=sys.stderr, flush=True)

    manifest = {
        "schema_version": "camel-morph-full-analysis-hc1-ext-v1_8",
        "derived_from_builder": BUILDER.sha256_file(
            SCRIPT_DIR / "camel-poc" / "build-full-camel-analyses.py"),
        "original_db_sha256": BUILDER.sha256_file(ORIGINAL_DB),
        "extended_db_sha256": BUILDER.sha256_file(EXTENDED_DB),
        "token_map_sha256": BUILDER.sha256_file(derived_token_map),
        "analysis_words": total_words,
        "shards": len(shard_hashes),
        "shards_written_this_invocation": not args.verify_only,
        "containment_vs_frozen_v1_7": None if args.skip_containment else {
            "tokens_with_a_candidate_removed": removed,
            "tokens_with_a_candidate_altered_or_reordered": altered,
            "tokens_that_gained_candidates": gained,
            "purely_additive": not (removed or altered),
        },
        "shard_sha256": dict(sorted(shard_hashes.items())),
    }
    (output_dir / "run-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({"analysis_words": total_words, "shards": len(shard_hashes),
                      "containment_vs_frozen_v1_7": manifest["containment_vs_frozen_v1_7"],
                      "output_dir": str(output_dir).replace("\\", "/")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
