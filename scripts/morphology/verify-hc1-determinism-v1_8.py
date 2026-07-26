#!/usr/bin/env python3
"""Second, independent HC1 v1.8 run - then a byte comparison against run A.

Every stage is recomputed from scratch in its own OS process, writing into its
own output directories, with no cache and no reuse of run A's files:

    token map  ->  data/candidates/morphology/hc1-ext-v1_8-runB/
    dump       ->  .../camel-morph-msa-v1.0/full-analysis-hc1-ext-v1_8-runB/
    selection  ->  data/candidates/morphology/selector-v1_8-runB/

What is compared: the derived token map, all 114 dump shards, the dump run
manifest, `selection.jsonl` and the acceptance comparison. `trigger-report.json`
is compared with its `outputs` block removed, because that block records the
absolute path the run wrote to and nothing else.

The containment check against the frozen v1.7 dump is skipped in run B: it is a
property of the produced dump, and run B's dump is asserted here to be
byte-identical to the one that check already ran on.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"

A = {"ext": CAND_ROOT / "hc1-ext-v1_8",
     "dump": CAMEL_ROOT / "full-analysis-hc1-ext-v1_8",
     "sel": CAND_ROOT / "selector-v1_8"}
B = {"ext": CAND_ROOT / "hc1-ext-v1_8-runB",
     "dump": CAMEL_ROOT / "full-analysis-hc1-ext-v1_8-runB",
     "sel": CAND_ROOT / "selector-v1_8-runB"}

OUT = CAND_ROOT / "hc1-ext-v1_8" / "determinism-v1_8.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(*args: str) -> None:
    print("[run B] " + " ".join(args), file=sys.stderr, flush=True)
    result = subprocess.run([sys.executable, *args], cwd=str(REPO_ROOT))
    if result.returncode != 0:
        raise SystemExit(f"run B stage failed: {' '.join(args)}")


def trigger_body(path: Path) -> str:
    obj = json.loads(path.read_text(encoding="utf-8"))
    obj.pop("outputs", None)
    return json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True)


def main() -> int:
    if "--compare-only" not in sys.argv:
        run(str(SCRIPT_DIR / "build-hc1-token-map-v1_8.py"),
            "--out-dir", str(B["ext"]))
        run(str(SCRIPT_DIR / "build-full-analysis-hc1-ext-v1_8.py"),
            "--out-dir", str(B["dump"]),
            "--token-map", str(B["ext"] / "token-map-hc1-ext-v1_8.jsonl"),
            "--skip-containment")
        run(str(SCRIPT_DIR / "select-camel-candidate-v1_8.py"), "--force",
            "--out-dir", str(B["sel"]),
            "--dump-dir", str(B["dump"]),
            "--ext-dir", str(B["ext"]))

    compared = {}
    mismatched = []

    def compare(label: str, rel_a: Path, rel_b: Path) -> None:
        if not rel_a.exists() or not rel_b.exists():
            mismatched.append(label)
            compared[label] = {"a": rel_a.exists(), "b": rel_b.exists(),
                               "identical": False}
            return
        ha, hb = sha256_file(rel_a), sha256_file(rel_b)
        compared[label] = {"sha256": ha, "identical": ha == hb}
        if ha != hb:
            mismatched.append(label)

    compare("token-map-hc1-ext-v1_8.jsonl",
            A["ext"] / "token-map-hc1-ext-v1_8.jsonl",
            B["ext"] / "token-map-hc1-ext-v1_8.jsonl")

    shards = sorted(p.name for p in A["dump"].glob("surah-*.jsonl.gz"))
    if len(shards) != 114:
        raise SystemExit(f"expected 114 shards in run A, found {len(shards)}")
    shard_result = {}
    for name in shards:
        ha = sha256_file(A["dump"] / name)
        path_b = B["dump"] / name
        identical = path_b.exists() and sha256_file(path_b) == ha
        shard_result[name] = {"sha256": ha, "identical": identical}
        if not identical:
            mismatched.append(f"dump/{name}")

    compare("run-manifest.json (dump)",
            A["dump"] / "run-manifest.json", B["dump"] / "run-manifest.json")
    compare("selection.jsonl", A["sel"] / "selection.jsonl", B["sel"] / "selection.jsonl")
    compare("v1_8-vs-v1_7-comparison.json",
            A["sel"] / "v1_8-vs-v1_7-comparison.json",
            B["sel"] / "v1_8-vs-v1_7-comparison.json")
    compare("checksums.json (selector)",
            A["sel"] / "checksums.json", B["sel"] / "checksums.json")

    trigger_identical = (trigger_body(A["ext"] / "trigger-report.json")
                         == trigger_body(B["ext"] / "trigger-report.json"))
    if not trigger_identical:
        mismatched.append("trigger-report.json (minus outputs)")

    # run A's manifest carries the containment result and may have been finished
    # by a --verify-only invocation; run B skips containment and always writes.
    # The two manifests are therefore compared with those two bookkeeping fields
    # normalised away - what is compared is the substance: the 114 shard hashes,
    # the token map hash, the DB hashes and the word count.
    manifest_a = json.loads((A["dump"] / "run-manifest.json").read_text(encoding="utf-8"))
    manifest_b = json.loads((B["dump"] / "run-manifest.json").read_text(encoding="utf-8"))
    for manifest in (manifest_a, manifest_b):
        manifest.pop("containment_vs_frozen_v1_7", None)
        manifest.pop("shards_written_this_invocation", None)
    manifests_identical = manifest_a == manifest_b
    if compared["run-manifest.json (dump)"]["identical"] is False and manifests_identical:
        mismatched.remove("run-manifest.json (dump)")
        compared["run-manifest.json (dump)"]["identical"] = \
            "except the containment and shards-written bookkeeping fields"

    report = {
        "schema_version": "hc1-determinism-v1_8",
        "runs": {"A": {k: str(v).replace("\\", "/") for k, v in A.items()},
                 "B": {k: str(v).replace("\\", "/") for k, v in B.items()}},
        "shards_compared": len(shard_result),
        "shards_identical": sum(1 for v in shard_result.values() if v["identical"]),
        "shard_sha256": shard_result,
        "artifacts": compared,
        "trigger_report_identical_minus_outputs": trigger_identical,
        "dump_manifest_identical_minus_containment": manifests_identical,
        "byte_identical": not mismatched,
        "mismatched": mismatched,
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                   encoding="utf-8", newline="\n")
    print(json.dumps({k: v for k, v in report.items() if k != "shard_sha256"},
                     ensure_ascii=False, indent=2))
    return 1 if mismatched else 0


if __name__ == "__main__":
    sys.exit(main())
