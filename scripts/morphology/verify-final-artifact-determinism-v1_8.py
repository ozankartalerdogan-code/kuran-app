#!/usr/bin/env python3
"""Prove the final v1.8 artifact rebuilds byte-identically from scratch.

Run A's outputs are moved aside, the builder is re-executed in a separate
process against an empty output directory, and every produced file is compared
byte for byte. The evidence is written to determinism.json; on any mismatch the
run B outputs are kept for inspection and the script exits non-zero.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
OUT_DIR = REPO_ROOT / "data" / "candidates" / "morphology" / "final-v1_8"
STASH_DIR = OUT_DIR.parent / "final-v1_8-runA-stash"
BUILDER = SCRIPT_DIR / "build-final-morphology-artifact-v1_8.py"

TRACKED = (
    "final-morphology-v1_8.jsonl",
    "final-morphology-v1_8.sqlite",
    "summary.json",
    "checksums.json",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    missing = [name for name in TRACKED if not (OUT_DIR / name).exists()]
    if missing:
        raise SystemExit(f"run A outputs missing, build first: {missing}")

    run_a = {name: sha256_file(OUT_DIR / name) for name in TRACKED}

    if STASH_DIR.exists():
        shutil.rmtree(STASH_DIR)
    STASH_DIR.mkdir(parents=True)
    for name in TRACKED:
        shutil.move(str(OUT_DIR / name), str(STASH_DIR / name))

    result = subprocess.run(
        [sys.executable, str(BUILDER)],
        cwd=str(REPO_ROOT), capture_output=True, text=True, encoding="utf-8",
    )
    if result.returncode != 0:
        raise SystemExit(f"run B failed:\n{result.stdout}\n{result.stderr}")

    run_b = {name: sha256_file(OUT_DIR / name) for name in TRACKED}
    mismatched = sorted(name for name in TRACKED if run_a[name] != run_b[name])

    report = {
        "schema_version": "final-morphology-v1_8-determinism",
        "builder": str(BUILDER.relative_to(REPO_ROOT)).replace("\\", "/"),
        "byte_identical": not mismatched,
        "mismatched": mismatched,
        "artifacts": {
            name: {"sha256": run_a[name], "identical": run_a[name] == run_b[name]}
            for name in TRACKED
        },
        "method": "run A outputs moved aside; builder re-executed in a fresh "
                  "process against an empty output directory; every file compared "
                  "byte for byte.",
    }
    with (OUT_DIR / "determinism.json").open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")

    if mismatched:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    shutil.rmtree(STASH_DIR)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
