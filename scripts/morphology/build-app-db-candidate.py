"""Build a morphology validation candidate SQLite DB from the candidate canonical JSON.

Scope: this produces data/candidates/morphology/morphology_validation_candidate.db,
a `words`-only database intended SOLELY for comparing morphology data against the
legacy production reference (data/app.db). It is NOT a production application DB
and cannot back the mobile/web runtime (verses, translations, FTS, elifba, etc.
tables are absent by design).

Inputs (explicit, no fallback):
  * data/candidates/morphology/canonical_legacy_candidate.json  (--input)
  * docs/provenance/morphology-production-baseline.json — the `words` schema is
    replayed verbatim from the CREATE SQL recorded there, never hand-written.

Output (--output, guarded):
  * data/candidates/morphology/morphology_validation_candidate.db (default)
  * any other path must still resolve inside data/candidates/morphology/.

Determinism:
  * Rows are inserted in sorted (surah, ayah, position) order; `id` follows
    insertion order via AUTOINCREMENT.
  * No timestamps, random values, or environment-dependent data are written.

Safety:
  * Writing to data/app.db, its backup, or data/kuran_core.db is rejected at
    code level before any connection is opened.
  * No data is read or copied from the production databases.

Row semantics mirror the last sound tracked builder (c0d671d:scripts/
build-core-analysis-db.py): segment_index=0, source='canonical_word_analysis',
confidence derived from meaning/gloss availability, suppressed visible roots.
Manual meaning overrides and Turso patches are intentionally NOT applied.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

ALLOWED_OUTPUT_ROOT = (ROOT / "data" / "candidates" / "morphology").resolve()
DEFAULT_INPUT = ALLOWED_OUTPUT_ROOT / "canonical_legacy_candidate.json"
DEFAULT_OUTPUT = ALLOWED_OUTPUT_ROOT / "morphology_validation_candidate.db"
MANIFEST_PATH = ROOT / "docs" / "provenance" / "morphology-production-baseline.json"

FORBIDDEN_OUTPUTS = [
    (ROOT / "data" / "app.db").resolve(),
    (ROOT / "data" / "app.db.yedek_20260521_164049").resolve(),
    (ROOT / "data" / "kuran_core.db").resolve(),
]

# Mirrors c0d671d:scripts/build-core-analysis-db.py (SUPPRESSED_VISIBLE_ROOTS).
SUPPRESSED_VISIBLE_ROOTS = {"Any", "أني", "فأي", "ياس", "كيف"}


def normalize_text(value: Any) -> str:
    if not value:
        return ""
    return " ".join(str(value).strip().split())


def normalize_visible_root(value: Any, morphology: Any = None) -> str:
    normalized = normalize_text(value)
    if not normalized or normalized in SUPPRESSED_VISIBLE_ROOTS:
        return ""
    parts = set(normalize_text(morphology).split("|")) if morphology else set()
    if "INTG" in parts or "POS:INTG" in parts:
        return ""
    return normalized


def choose_word_confidence(entry: dict[str, Any], meaning_tr: str | None) -> str:
    missing_fields = set(entry.get("missing_fields") or [])
    if meaning_tr and "meaning_tr" not in missing_fields:
        return "high"
    if meaning_tr:
        return "medium"
    if normalize_text(entry.get("gloss_en")) or normalize_text(entry.get("root_explanation_tr")):
        return "medium"
    return "low"


def assert_safe_output(raw: str) -> Path:
    resolved = Path(raw).resolve() if Path(raw).is_absolute() else (ROOT / raw).resolve()

    for forbidden in FORBIDDEN_OUTPUTS:
        if resolved == forbidden:
            raise SystemExit(f"Refusing to write production database path: {resolved}")

    if resolved != ALLOWED_OUTPUT_ROOT and ALLOWED_OUTPUT_ROOT not in resolved.parents:
        raise SystemExit(
            f"Refusing output outside data/candidates/morphology: {resolved}"
        )

    if resolved.is_dir():
        raise SystemExit(f"Output path is a directory, expected a file: {resolved}")

    return resolved


def load_words_schema_sql() -> list[str]:
    if not MANIFEST_PATH.exists():
        raise SystemExit(
            "Baseline manifest missing; run scripts/morphology/capture-production-baseline.py first: "
            f"{MANIFEST_PATH}"
        )
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    create_entries = (
        manifest.get("production_db", {}).get("words_schema", {}).get("create_sql", [])
    )
    statements = [entry["sql"] for entry in create_entries if entry.get("sql")]
    if not statements:
        raise SystemExit("Manifest contains no CREATE SQL for the words table.")
    return statements


def load_canonical(input_path: Path) -> dict[str, list[dict[str, Any]]]:
    if not input_path.exists():
        raise SystemExit(
            "Candidate canonical JSON missing (no fallback); run "
            "scripts/morphology/build-legacy-canonical-candidate.js first: "
            f"{input_path}"
        )
    with input_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or not data:
        raise SystemExit(f"Candidate canonical JSON is empty or malformed: {input_path}")
    return data


def sort_key(verse_key: str) -> tuple[int, int]:
    surah, ayah = verse_key.split(":", 1)
    return int(surah), int(ayah)


def build_rows(canonical: dict[str, list[dict[str, Any]]]) -> list[tuple[Any, ...]]:
    rows: list[tuple[Any, ...]] = []
    for verse_key in sorted(canonical, key=sort_key):
        entries = canonical[verse_key]
        for entry in sorted(entries, key=lambda item: int(item.get("position") or 0)):
            meaning_tr = normalize_text(entry.get("meaning_tr")) or None
            rows.append(
                (
                    verse_key,
                    int(entry.get("position") or 0),
                    0,
                    normalize_text(entry.get("arabic")) or None,
                    normalize_visible_root(entry.get("root"), entry.get("morphology")) or None,
                    normalize_text(entry.get("lemma")) or None,
                    normalize_text(entry.get("pos")) or None,
                    normalize_text(entry.get("morphology")) or None,
                    meaning_tr,
                    normalize_text(entry.get("gloss_en")) or None,
                    choose_word_confidence(entry, meaning_tr),
                    "canonical_word_analysis",
                    normalize_text(entry.get("role")) or None,
                )
            )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    output_path = assert_safe_output(args.output)
    input_path = Path(args.input).resolve() if Path(args.input).is_absolute() else (ROOT / args.input).resolve()

    canonical = load_canonical(input_path)
    schema_sql = load_words_schema_sql()
    rows = build_rows(canonical)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    connection = sqlite3.connect(output_path)
    try:
        cursor = connection.cursor()
        for statement in schema_sql:
            cursor.execute(statement)
        cursor.executemany(
            """
            INSERT INTO words (
              verse_key, word_index, segment_index, arabic, root, lemma, pos,
              morphology, meaning_tr, gloss_en, confidence, source, role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        connection.commit()
    finally:
        connection.close()

    print(
        json.dumps(
            {
                "output": output_path.relative_to(ROOT).as_posix(),
                "words_rows": len(rows),
                "verse_keys": len(canonical),
            },
            ensure_ascii=True,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
