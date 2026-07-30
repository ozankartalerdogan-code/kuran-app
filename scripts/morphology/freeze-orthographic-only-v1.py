#!/usr/bin/env python3
"""Freeze the ORTHOGRAPHIC_ONLY v1 round as a DIAGNOSTIC artefact.

v1 answered "which named codepoint transform reaches the teacher reading for the
120 tokens in the bucket". Its emission was gated per token by the teacher, so
its `analysis-form-extension.jsonl` is a *finding*, not a production input. It is
frozen here so the finding cannot drift, and explicitly marked non-production.

The verdicts this freeze pins:
  O1 / O2 / O3 / O5   -> promoted to the teacher-free production round (v1.7)
  O4X                 -> REJECTED (12 triggers in the bucket, 0 closures; the
                         جَآءُو family is a CAMeL paradigm gap, not orthography)
  O6X                 -> DEFERRED, not applied
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
OUT_DIR = CAND_ROOT / "orthographic-only-v1"
CHAIN = SCRIPT_DIR / "resources" / "frozen-v1_6-manifest.json"
MANIFEST = SCRIPT_DIR / "resources" / "frozen-orthographic-only-v1-manifest.json"

SCHEMA_VERSION = "orthographic-only-freeze-v1"

ARTIFACTS = {
    "data/candidates/morphology/orthographic-only-v1/classification.jsonl":
        "frozen v1 diagnostic: per-token transform measurement over the 120 tokens",
    "data/candidates/morphology/orthographic-only-v1/analysis-form-extension.jsonl":
        "frozen v1 diagnostic: teacher-gated emission - NOT a production input",
    "data/candidates/morphology/orthographic-only-v1/report.json":
        "frozen v1 diagnostic report",
    "data/candidates/morphology/orthographic-only-v1/checksums.json":
        "frozen v1 diagnostic checksums",
    "scripts/morphology/analyze-orthographic-only-v1.py":
        "frozen v1 diagnostic script",
    "docs/morfoloji-orthographic-only-v1.md":
        "frozen v1 diagnostic write-up",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    missing = [rel for rel in ARTIFACTS if not (REPO_ROOT / rel).exists()]
    if missing:
        raise SystemExit("missing artefacts: " + ", ".join(missing))
    if not CHAIN.exists():
        raise SystemExit(f"missing chain manifest: {CHAIN}")

    chain_manifest = json.loads(CHAIN.read_text(encoding="utf-8"))
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "status": "DIAGNOSTIC_ONLY",
        "status_note": (
            "This round's extension was emitted only where the teacher confirmed a "
            "gain, so it must never be fed to a dump regeneration. The teacher-free "
            "corpus-wide application of O1/O3/O5 is a separate round (v1.7)."),
        "chains_from": {
            "path": str(CHAIN.relative_to(REPO_ROOT)).replace("\\", "/"),
            "schema_version": chain_manifest["schema_version"],
            "sha256": sha256_file(CHAIN),
        },
        "transform_verdicts": {
            "O1_SMALL_WAW_TO_WAW": "PROMOTED_TO_TEACHER_FREE_ROUND",
            "O2_SMALL_YEH_TO_YEH": "PROMOTED_TO_TEACHER_FREE_ROUND",
            "O3_SILENT_LETTER_DROP": "PROMOTED_TO_TEACHER_FREE_ROUND",
            "O5_SMALL_SEEN_SAD_TO_SEEN": "PROMOTED_TO_TEACHER_FREE_ROUND",
            "O4X_PLURAL_WAW_OTIOSE_ALEF": "REJECTED",
            "O6X_FINAL_ALEF_TO_MAQSURA": "DEFERRED",
        },
        "transform_verdict_reasons": {
            "O4X_PLURAL_WAW_OTIOSE_ALEF": (
                "12 triggers inside the bucket, 0 closures: CAMeL returns no "
                "analysis at all for جاءوا / جَآءُوا / جاءوك / جاءوكم, so restoring the "
                "otiose alef reaches nothing on its own. Rejected. CORRECTION to "
                "this round's write-up: the ~25-token جَآءُو family is NOT a "
                "paradigm gap. The residual reclassification shows CAMeL does "
                "carry the lexeme, spelled with a waw carrier - جاءو -> جاؤو "
                "(U+0621 -> U+0624) reaches root ج.ي.أ - so the family belongs to "
                "HAMZA_CARRIER. That does not revive O4X: the alef is not what "
                "was missing."),
            "O6X_FINAL_ALEF_TO_MAQSURA": (
                "closes 14 tokens but no source notation licenses it and its added "
                "candidates are majority noise (+41 teacher-matching / +87 not, and "
                "+108 / +297 on وَرَءَا). Not applied this round."),
        },
        "artifacts": {
            rel: {"note": note, "sha256": sha256_file(REPO_ROOT / rel)}
            for rel, note in sorted(ARTIFACTS.items())
        },
    }
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({"manifest": str(MANIFEST.relative_to(REPO_ROOT)).replace("\\", "/"),
                      "status": manifest["status"],
                      "artifacts": len(manifest["artifacts"]),
                      "sha256": sha256_file(MANIFEST)},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
