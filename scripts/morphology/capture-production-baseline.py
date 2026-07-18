"""Capture a reproducible provenance manifest for the legacy morphology baseline.

Reads production databases and morphology sources STRICTLY read-only and writes
a single JSON manifest to docs/provenance/morphology-production-baseline.json.

The manifest classifies data/app.db as `legacy_unreproducible_baseline`: the
original build chain that produced it is not fully known and is NOT claimed to
be reproducible. This script only records what exists today (hashes, sizes,
schema, row counts, U+FFFD locations) so that future candidate builds can be
compared against a pinned reference.

Safety:
  * Every SQLite connection is opened with the read-only URI flag (mode=ro).
  * The only write target is the manifest path below; nothing else is touched.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

MANIFEST_PATH = ROOT / "docs" / "provenance" / "morphology-production-baseline.json"

PRODUCTION_DB = ROOT / "data" / "app.db"
BACKUP_DB = ROOT / "data" / "app.db.yedek_20260521_164049"
CORE_DB = ROOT / "data" / "kuran_core.db"

MORPHOLOGY_SOURCES = [
    ROOT / "data" / "word-analysis" / "quran-morphology.txt",
    ROOT / "data2" / "corpus-morphology.txt",
    ROOT / "data2" / "quran-morphology" / "quran-morphology.txt",
]

CANONICAL_OUTPUTS = [
    ROOT / "data2" / "processed" / "canonical_word_analysis_v2.json",
    ROOT / "data2" / "processed" / "canonical_word_analysis_v3.json",
    ROOT / "data2" / "processed" / "canonical_word_analysis_v4.json",
    ROOT / "data2" / "processed" / "canonical_word_analysis_enriched.json",
]

LEGACY_BUILDER = ROOT / "data2" / "scripts" / "build_canonical_word_analysis.js"

WORDS_COMPARED_COLUMNS = [
    "arabic",
    "root",
    "lemma",
    "pos",
    "morphology",
    "meaning_tr",
    "gloss_en",
    "source",
]

REPLACEMENT_CHAR = "�"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def open_readonly(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def text_file_stats(path: Path) -> dict[str, Any]:
    line_count = 0
    fffd_lines = 0
    fffd_line_numbers: list[int] = []
    with path.open("r", encoding="utf-8", errors="strict") as handle:
        for number, line in enumerate(handle, start=1):
            line_count += 1
            if REPLACEMENT_CHAR in line:
                fffd_lines += 1
                fffd_line_numbers.append(number)
    return {
        "path": rel(path),
        "sha256": sha256_of(path),
        "size_bytes": path.stat().st_size,
        "line_count": line_count,
        "ufffd_line_count": fffd_lines,
        "ufffd_line_numbers": fffd_line_numbers,
    }


def canonical_file_stats(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise SystemExit(f"Unexpected canonical structure (not an object): {path}")
    word_entries = sum(len(entries) for entries in data.values())
    stats: dict[str, Any] = {
        "path": rel(path),
        "sha256": sha256_of(path),
        "size_bytes": path.stat().st_size,
        "verse_key_count": len(data),
        "word_entry_count": word_entries,
    }
    if path.name == "canonical_word_analysis_v4.json":
        stats["classification"] = "latest_surviving_canonical_derivative"
        stats["note"] = (
            "Most recent surviving canonical output; used as the static input for the "
            "morphology validation candidate DB. It is a DERIVATIVE of the lost raw "
            "inputs (quran-json chapters, quran_dictionary.csv, base canonical v1) and "
            "does NOT substitute for them as provenance."
        )
    return stats


def capture_db(path: Path, *, full_schema: bool) -> dict[str, Any]:
    info: dict[str, Any] = {
        "path": rel(path),
        "sha256": sha256_of(path),
        "size_bytes": path.stat().st_size,
    }
    connection = open_readonly(path)
    try:
        cursor = connection.cursor()
        info["pragma_schema_version"] = cursor.execute("PRAGMA schema_version").fetchone()[0]
        info["pragma_user_version"] = cursor.execute("PRAGMA user_version").fetchone()[0]

        tables = [
            row[0]
            for row in cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
        ]
        info["tables"] = tables

        table_counts: dict[str, int] = {}
        for table in tables:
            if table.startswith("sqlite_"):
                continue
            table_counts[table] = cursor.execute(
                f'SELECT COUNT(*) FROM "{table}"'
            ).fetchone()[0]
        info["table_row_counts"] = table_counts
        info["words_row_count"] = table_counts.get("words")

        if full_schema:
            info["words_schema"] = capture_words_schema(cursor)
            info["words_ufffd_column_counts"] = capture_words_ufffd(cursor)
    finally:
        connection.close()
    return info


def capture_db_identity(path: Path) -> dict[str, Any]:
    info: dict[str, Any] = {
        "path": rel(path),
        "sha256": sha256_of(path),
        "size_bytes": path.stat().st_size,
    }
    connection = open_readonly(path)
    try:
        cursor = connection.cursor()
        info["pragma_schema_version"] = cursor.execute("PRAGMA schema_version").fetchone()[0]
        info["table_count"] = cursor.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
        ).fetchone()[0]
    finally:
        connection.close()
    return info


def capture_words_schema(cursor: sqlite3.Cursor) -> dict[str, Any]:
    table_info = [
        {
            "cid": row[0],
            "name": row[1],
            "type": row[2],
            "notnull": row[3],
            "dflt_value": row[4],
            "pk": row[5],
        }
        for row in cursor.execute("PRAGMA table_info(words)")
    ]

    index_list = []
    index_rows = cursor.execute("PRAGMA index_list(words)").fetchall()
    for row in index_rows:
        index_name = row[1]
        columns = [
            info_row[2]
            for info_row in cursor.execute(f'PRAGMA index_info("{index_name}")').fetchall()
        ]
        index_list.append(
            {
                "name": index_name,
                "unique": bool(row[2]),
                "origin": row[3],
                "partial": bool(row[4]),
                "columns": columns,
            }
        )

    create_sql_rows = cursor.execute(
        "SELECT type, name, sql FROM sqlite_master"
        " WHERE tbl_name='words' AND sql IS NOT NULL ORDER BY type DESC, name"
    ).fetchall()
    create_sql = [
        {"type": row[0], "name": row[1], "sql": row[2]} for row in create_sql_rows
    ]

    return {
        "table_info": table_info,
        "index_list": index_list,
        "create_sql": create_sql,
    }


def capture_words_ufffd(cursor: sqlite3.Cursor) -> dict[str, Any]:
    per_column: dict[str, int] = {}
    for column in WORDS_COMPARED_COLUMNS:
        per_column[column] = cursor.execute(
            f'SELECT COUNT(*) FROM words WHERE instr("{column}", ?) > 0',
            (REPLACEMENT_CHAR,),
        ).fetchone()[0]

    any_clause = " OR ".join(
        f'instr("{column}", ?) > 0' for column in WORDS_COMPARED_COLUMNS
    )
    params = tuple(REPLACEMENT_CHAR for _ in WORDS_COMPARED_COLUMNS)
    any_count = cursor.execute(
        f"SELECT COUNT(*) FROM words WHERE {any_clause}", params
    ).fetchone()[0]

    sample_rows = cursor.execute(
        "SELECT verse_key, word_index, segment_index FROM words"
        f" WHERE {any_clause} ORDER BY verse_key, word_index, segment_index LIMIT 200",
        params,
    ).fetchall()

    return {
        "per_column_row_counts": per_column,
        "rows_with_any_ufffd": any_count,
        "row_locations_sample": [
            {"verse_key": row[0], "word_index": row[1], "segment_index": row[2]}
            for row in sample_rows
        ],
    }


def build_manifest() -> dict[str, Any]:
    for required in [PRODUCTION_DB, BACKUP_DB, CORE_DB, LEGACY_BUILDER, *MORPHOLOGY_SOURCES, *CANONICAL_OUTPUTS]:
        if not required.exists():
            raise SystemExit(f"Required baseline input missing: {rel(required)}")

    return {
        "manifest_version": 1,
        "classification": "legacy_unreproducible_baseline",
        "LEGACY_PIPELINE_REPRODUCIBILITY": "NOT_REPRODUCIBLE",
        "generated_by": "scripts/morphology/capture-production-baseline.py",
        "statement": (
            "data/app.db is a legacy production reference whose original build chain "
            "is not fully known. This manifest records its current state for comparison "
            "purposes only and does NOT claim the database can be reproduced from the "
            "sources listed here."
        ),
        "production_db": capture_db(PRODUCTION_DB, full_schema=True),
        "backup_db": capture_db(BACKUP_DB, full_schema=False),
        "core_db": capture_db_identity(CORE_DB),
        "morphology_sources": [text_file_stats(path) for path in MORPHOLOGY_SOURCES],
        "canonical_outputs": [canonical_file_stats(path) for path in CANONICAL_OUTPUTS],
        "legacy_builder": {
            "path": rel(LEGACY_BUILDER),
            "sha256": sha256_of(LEGACY_BUILDER),
            "size_bytes": LEGACY_BUILDER.stat().st_size,
            "note": (
                "Only surviving copy of the canonical word-analysis builder; it lives "
                "under git-ignored data2/ and has no Git history. A byte-identical "
                "tracked snapshot exists at "
                "scripts/morphology/legacy-canonical-builder.snapshot.js "
                "(see legacy-canonical-builder.snapshot.meta.json)."
            ),
            "currently_runnable": False,
            "runnable_note": (
                "The snapshot (and the original) cannot currently be executed: its "
                "required inputs data2/quran-json/dist/chapters/ and "
                "data2/QURAN-NLP/data/quran/corpus/quran_dictionary.csv no longer "
                "exist on disk (see known_provenance_gaps)."
            ),
        },
        "known_provenance_gaps": [
            "The builder that originally produced data/app.db is lost; the last syntactically sound tracked builder (c0d671d:scripts/build-core-analysis-db.py) targeted data/kuran_core.db, not app.db.",
            "data2/processed/canonical_word_analysis.json (the v1/base canonical output consumed by that builder) no longer exists on disk; only v2/v3/v4/enriched derivatives survive.",
            "Manual Turso and local patch commands applied to production data were not logged and cannot be replayed.",
            "data/app.db cannot be reproduced byte-for-byte or row-for-row from any known input chain.",
            "data2/quran-json/dist/chapters/ — the Arabic word input of the legacy canonical builder — is missing from disk. It was git-ignored, so it cannot be recovered from Git history, and no hash of its former content is known. It may have still existed when canonical_word_analysis_v4.json was produced, but the exact date it disappeared is unknown.",
            "data2/QURAN-NLP/data/quran/corpus/quran_dictionary.csv — the gloss_en input of the legacy canonical builder — is missing from disk. It was git-ignored, so it cannot be recovered from Git history, and no hash of its former content is known.",
        ],
    }


def main() -> None:
    manifest_resolved = MANIFEST_PATH.resolve()
    allowed_parent = (ROOT / "docs" / "provenance").resolve()
    if manifest_resolved.parent != allowed_parent:
        raise SystemExit(f"Refusing to write outside docs/provenance: {manifest_resolved}")

    manifest = build_manifest()

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    summary = {
        "manifest": rel(MANIFEST_PATH),
        "production_words": manifest["production_db"]["words_row_count"],
        "backup_words": manifest["backup_db"]["words_row_count"],
        "ufffd_rows_in_words": manifest["production_db"]["words_ufffd_column_counts"][
            "rows_with_any_ufffd"
        ],
    }
    sys.stdout.write(json.dumps(summary, ensure_ascii=True, indent=2) + "\n")


if __name__ == "__main__":
    main()
