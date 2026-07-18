"""Compare the legacy production words table against the morphology validation candidate.

Read-only tool: both databases are opened with the SQLite URI flag mode=ro; the
only write target is the JSON report (guarded to data/candidates/morphology/).

Compares:
  * data/app.db                                             (legacy reference)
  * data/candidates/morphology/morphology_validation_candidate.db

Report sections:
  * schema diff (sqlite_master SQL for tables/indexes present in either DB)
  * table list and row counts
  * words match analysis per column: arabic, root, lemma, pos, morphology,
    meaning_tr, gloss_en, source (plus role, recorded separately since its
    provenance in app.db is uncertain)
  * rows only in legacy / only in candidate
  * special section for the 62 known U+FFFD source-line locations from
    data/word-analysis/quran-morphology.txt (taken from the baseline manifest)

Join key: NOT assumed. The words table has no unique index and its primary key
(id, AUTOINCREMENT) is insertion-order dependent, so this tool empirically
verifies whether (verse_key, word_index) and (verse_key, word_index,
segment_index) are unique in each DB, picks the smallest empirically-unique
composite, and records the decision plus duplicate counts in the report.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

LEGACY_DB = ROOT / "data" / "app.db"
CANDIDATE_DB = ROOT / "data" / "candidates" / "morphology" / "morphology_validation_candidate.db"
MANIFEST_PATH = ROOT / "docs" / "provenance" / "morphology-production-baseline.json"
ACTIVE_MORPHOLOGY_SOURCE = ROOT / "data" / "word-analysis" / "quran-morphology.txt"

ALLOWED_OUTPUT_ROOT = (ROOT / "data" / "candidates" / "morphology").resolve()
DEFAULT_REPORT = ALLOWED_OUTPUT_ROOT / "reports" / "legacy-vs-candidate.json"

COMPARED_COLUMNS = [
    "arabic",
    "root",
    "lemma",
    "pos",
    "morphology",
    "meaning_tr",
    "gloss_en",
    "source",
]
EXTRA_COLUMNS = ["role", "confidence"]
SAMPLE_LIMIT = 100


def open_readonly(path: Path) -> sqlite3.Connection:
    if not path.exists():
        raise SystemExit(f"Database missing: {path}")
    return sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)


def assert_safe_report_path(raw: str) -> Path:
    resolved = Path(raw).resolve() if Path(raw).is_absolute() else (ROOT / raw).resolve()
    if resolved != ALLOWED_OUTPUT_ROOT and ALLOWED_OUTPUT_ROOT not in resolved.parents:
        raise SystemExit(f"Refusing report outside data/candidates/morphology: {resolved}")
    return resolved


def schema_map(connection: sqlite3.Connection) -> dict[str, str]:
    rows = connection.execute(
        "SELECT type || ':' || name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY 1"
    ).fetchall()
    return {key: re.sub(r"\s+", " ", sql).strip() for key, sql in rows}


def table_row_counts(connection: sqlite3.Connection) -> dict[str, int]:
    tables = [
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
    ]
    return {
        table: connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        for table in tables
    }


def key_uniqueness(connection: sqlite3.Connection) -> dict[str, Any]:
    total = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    two_col = connection.execute(
        "SELECT COUNT(*) FROM (SELECT DISTINCT verse_key, word_index FROM words)"
    ).fetchone()[0]
    three_col = connection.execute(
        "SELECT COUNT(*) FROM (SELECT DISTINCT verse_key, word_index, segment_index FROM words)"
    ).fetchone()[0]
    return {
        "total_rows": total,
        "distinct_verse_key_word_index": two_col,
        "distinct_verse_key_word_index_segment_index": three_col,
        "verse_key_word_index_unique": two_col == total,
        "verse_key_word_index_segment_index_unique": three_col == total,
    }


def choose_join_key(legacy: dict[str, Any], candidate: dict[str, Any]) -> tuple[list[str], str]:
    if legacy["verse_key_word_index_unique"] and candidate["verse_key_word_index_unique"]:
        return ["verse_key", "word_index"], "empirically unique in both databases"
    if (
        legacy["verse_key_word_index_segment_index_unique"]
        and candidate["verse_key_word_index_segment_index_unique"]
    ):
        return (
            ["verse_key", "word_index", "segment_index"],
            "(verse_key, word_index) has duplicates; 3-column composite is empirically unique in both",
        )
    return (
        ["verse_key", "word_index", "segment_index"],
        "WARNING: no composite is unique in both databases; duplicate keys are aligned by sorted occurrence order and counted in duplicate_key_stats",
    )


def fetch_words(connection: sqlite3.Connection, key_columns: list[str]) -> dict[tuple, list[dict[str, Any]]]:
    columns = key_columns + COMPARED_COLUMNS + EXTRA_COLUMNS
    seen: set[str] = set()
    select_columns = [col for col in columns if not (col in seen or seen.add(col))]
    order_sql = ", ".join(f'"{col}"' for col in key_columns)
    sql = (
        "SELECT "
        + ", ".join(f'"{col}"' for col in select_columns)
        + f" FROM words ORDER BY {order_sql}, id"
    )
    grouped: dict[tuple, list[dict[str, Any]]] = {}
    for row in connection.execute(sql):
        record = dict(zip(select_columns, row))
        key = tuple(record[col] for col in key_columns)
        grouped.setdefault(key, []).append(record)
    return grouped


def normalize_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def compare_words(
    legacy_words: dict[tuple, list[dict[str, Any]]],
    candidate_words: dict[tuple, list[dict[str, Any]]],
    key_columns: list[str],
) -> dict[str, Any]:
    legacy_keys = set(legacy_words)
    candidate_keys = set(candidate_words)
    shared_keys = legacy_keys & candidate_keys

    def key_label(key: tuple) -> str:
        return "|".join(str(part) for part in key)

    field_stats = {
        column: {"compared": 0, "equal": 0, "different": 0, "legacy_only_value": 0, "candidate_only_value": 0}
        for column in COMPARED_COLUMNS + EXTRA_COLUMNS
    }
    diff_samples: dict[str, list[dict[str, Any]]] = {column: [] for column in COMPARED_COLUMNS + EXTRA_COLUMNS}
    duplicate_stats = {
        "legacy_keys_with_multiple_rows": sum(1 for rows in legacy_words.values() if len(rows) > 1),
        "candidate_keys_with_multiple_rows": sum(1 for rows in candidate_words.values() if len(rows) > 1),
    }

    fully_equal_rows = 0
    compared_rows = 0

    for key in shared_keys:
        legacy_rows = legacy_words[key]
        candidate_rows = candidate_words[key]
        for legacy_row, candidate_row in zip(legacy_rows, candidate_rows):
            compared_rows += 1
            row_equal = True
            for column in COMPARED_COLUMNS + EXTRA_COLUMNS:
                legacy_value = normalize_value(legacy_row.get(column))
                candidate_value = normalize_value(candidate_row.get(column))
                stats = field_stats[column]
                stats["compared"] += 1
                if legacy_value == candidate_value:
                    stats["equal"] += 1
                else:
                    if column in COMPARED_COLUMNS:
                        row_equal = False
                    stats["different"] += 1
                    if legacy_value and not candidate_value:
                        stats["legacy_only_value"] += 1
                    elif candidate_value and not legacy_value:
                        stats["candidate_only_value"] += 1
                    if len(diff_samples[column]) < SAMPLE_LIMIT:
                        diff_samples[column].append(
                            {
                                "key": key_label(key),
                                "legacy": legacy_value[:300],
                                "candidate": candidate_value[:300],
                            }
                        )
            if row_equal:
                fully_equal_rows += 1

    for column, stats in field_stats.items():
        stats["match_ratio"] = (
            round(stats["equal"] / stats["compared"], 6) if stats["compared"] else None
        )

    only_legacy = sorted(legacy_keys - candidate_keys)
    only_candidate = sorted(candidate_keys - legacy_keys)

    return {
        "join_key": key_columns,
        "legacy_distinct_keys": len(legacy_keys),
        "candidate_distinct_keys": len(candidate_keys),
        "shared_keys": len(shared_keys),
        "compared_row_pairs": compared_rows,
        "row_pairs_fully_equal_on_compared_columns": fully_equal_rows,
        "duplicate_key_stats": duplicate_stats,
        "field_stats": field_stats,
        "field_diff_samples": diff_samples,
        "keys_only_in_legacy": {
            "count": len(only_legacy),
            "sample": [key_label(key) for key in only_legacy[:SAMPLE_LIMIT]],
        },
        "keys_only_in_candidate": {
            "count": len(only_candidate),
            "sample": [key_label(key) for key in only_candidate[:SAMPLE_LIMIT]],
        },
    }


CLEAN_REFERENCE_SOURCE = ROOT / "data2" / "quran-morphology" / "quran-morphology.txt"
UFFFD_FIELDS = ["root", "lemma", "arabic"]
REPLACEMENT = "�"


def _read_feature(features: str, prefix: str) -> str:
    for feature in features.split("|"):
        if feature.startswith(prefix):
            return feature[len(prefix):]
    return ""


def _parse_morphology_line(line: str) -> dict[str, Any] | None:
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 2:
        return None
    raw_location = parts[0]
    loc = re.sub(r"[()]", "", raw_location).strip().split(":")
    if len(loc) < 3 or not all(p.isdigit() for p in loc[:3]):
        return None
    features = parts[3] if len(parts) > 3 else ""
    return {
        "location": raw_location.strip(),
        "verse_key": f"{loc[0]}:{loc[1]}",
        "word_index": int(loc[2]),
        "segment": int(loc[3]) if len(loc) > 3 and loc[3].isdigit() else None,
        "arabic": parts[1].strip() if len(parts) > 1 else "",
        "root": _read_feature(features, "ROOT:"),
        "lemma": _read_feature(features, "LEM:"),
    }


def _nfc(value: Any) -> str:
    import unicodedata

    return unicodedata.normalize("NFC", str(value or "").strip())


def load_ufffd_locations() -> dict[str, Any]:
    """Resolve known U+FFFD source lines, pairing each with its clean reference line."""
    if not MANIFEST_PATH.exists():
        return {"status": "manifest_missing", "locations": []}
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    entry = next(
        (
            item
            for item in manifest.get("morphology_sources", [])
            if item.get("path") == "data/word-analysis/quran-morphology.txt"
        ),
        None,
    )
    if entry is None:
        return {"status": "source_not_in_manifest", "locations": []}

    line_numbers = set(entry.get("ufffd_line_numbers", []))
    if not line_numbers:
        return {"status": "no_ufffd_lines_recorded", "locations": []}

    corrupted: list[dict[str, Any]] = []
    with ACTIVE_MORPHOLOGY_SOURCE.open("r", encoding="utf-8") as handle:
        for number, line in enumerate(handle, start=1):
            if number not in line_numbers:
                continue
            parsed = _parse_morphology_line(line)
            corrupted.append({"source_line": number, "parsed": parsed, "raw": line.rstrip("\n")})

    wanted_locations = {
        item["parsed"]["location"] for item in corrupted if item["parsed"] is not None
    }
    clean_by_location: dict[str, dict[str, Any]] = {}
    with CLEAN_REFERENCE_SOURCE.open("r", encoding="utf-8") as handle:
        for line in handle:
            parsed = _parse_morphology_line(line)
            if parsed is not None and parsed["location"] in wanted_locations:
                clean_by_location.setdefault(parsed["location"], parsed)

    for item in corrupted:
        parsed = item["parsed"]
        item["clean"] = clean_by_location.get(parsed["location"]) if parsed else None

    return {"status": "ok", "recorded_line_count": len(line_numbers), "locations": corrupted}


def _classify_field(corrupted_value: str, clean_value: str, db_value: str, row_present: bool) -> str:
    corrupted_value = _nfc(corrupted_value)
    clean_value = _nfc(clean_value)
    db_value = _nfc(db_value)

    if not corrupted_value and not clean_value:
        return "not_applicable"
    if corrupted_value == clean_value and REPLACEMENT not in corrupted_value:
        # Corruption did not touch this field; DB value is judged elsewhere.
        return "not_applicable"
    if not row_present:
        return "missing"
    if db_value == clean_value and clean_value:
        return "matches_clean_reference"
    if REPLACEMENT in db_value:
        return "contains_replacement_character"
    stripped_corrupted = _nfc(corrupted_value.replace(REPLACEMENT, ""))
    if db_value and db_value == stripped_corrupted and db_value != clean_value:
        return "replacement_character_removed_but_value_incomplete"
    if not db_value:
        return "missing"
    return "differs_from_clean_reference"


def ufffd_section(
    legacy_words: dict[tuple, list[dict[str, Any]]],
    candidate_words: dict[tuple, list[dict[str, Any]]],
    key_columns: list[str],
) -> dict[str, Any]:
    resolved = load_ufffd_locations()
    results: list[dict[str, Any]] = []
    totals: dict[str, Counter] = {
        f"{db}.{field}": Counter()
        for db in ("legacy", "candidate")
        for field in UFFFD_FIELDS
    }

    missing_record_totals: Counter[str] = Counter()

    for item in resolved.get("locations", []):
        parsed = item.get("parsed")
        if parsed is None:
            results.append(
                {"source_line": item["source_line"], "outcome": "unparseable_source_line"}
            )
            continue
        clean = item.get("clean")

        base_key = (parsed["verse_key"], parsed["word_index"])
        lookup_key = base_key if len(key_columns) == 2 else (*base_key, 0)

        db_rows = {
            "legacy": legacy_words.get(lookup_key, []),
            "candidate": candidate_words.get(lookup_key, []),
        }

        detail: dict[str, Any] = {
            "source_line": item["source_line"],
            "location": parsed["location"],
            "verse_key": parsed["verse_key"],
            "word_index": parsed["word_index"],
            "segment": parsed["segment"],
            "corrupted_source": {f: parsed[f] for f in UFFFD_FIELDS},
            "clean_reference": (
                {f: clean[f] for f in UFFFD_FIELDS} if clean else None
            ),
            "clean_reference_found": clean is not None,
        }

        for db_name, rows in db_rows.items():
            row = rows[0] if rows else None
            if row is None:
                missing_record_totals[db_name] += 1
            statuses: dict[str, str] = {}
            values: dict[str, str | None] = {}
            for field in UFFFD_FIELDS:
                db_value = normalize_value(row.get(field)) if row else ""
                values[field] = db_value[:200] or None
                if clean is None:
                    status = "not_applicable" if row else "missing"
                else:
                    status = _classify_field(
                        parsed[field], clean[field], db_value, row is not None
                    )
                statuses[field] = status
                totals[f"{db_name}.{field}"][status] += 1
            detail[db_name] = {"row_found": row is not None, "values": values, "field_status": statuses}

        results.append(detail)

    def aggregate(db_name: str) -> dict[str, Any]:
        return {
            "aggregation_unit": "field",
            "root_matches_clean_reference": totals[f"{db_name}.root"]["matches_clean_reference"],
            "lemma_matches_clean_reference": totals[f"{db_name}.lemma"]["matches_clean_reference"],
            "contains_replacement_character": sum(
                totals[f"{db_name}.{f}"]["contains_replacement_character"] for f in UFFFD_FIELDS
            ),
            "replacement_character_removed_but_value_incomplete": sum(
                totals[f"{db_name}.{f}"]["replacement_character_removed_but_value_incomplete"]
                for f in UFFFD_FIELDS
            ),
            "differs_from_clean_reference": sum(
                totals[f"{db_name}.{f}"]["differs_from_clean_reference"] for f in UFFFD_FIELDS
            ),
            "missing_records": missing_record_totals[db_name],
            "missing_field_classifications": sum(
                totals[f"{db_name}.{f}"]["missing"] for f in UFFFD_FIELDS
            ),
            "per_field": {f: dict(totals[f"{db_name}.{f}"]) for f in UFFFD_FIELDS},
        }

    return {
        "status": resolved.get("status"),
        "note": (
            "Each known U+FFFD line from data/word-analysis/quran-morphology.txt is compared "
            "field-by-field (root, lemma, arabic/form) against the clean reference "
            "data2/quran-morphology/quran-morphology.txt AND the DB values. Absence of a "
            "literal U+FFFD in the DB is NOT treated as clean: values equal to the corrupted "
            "text minus the replacement character are classified as "
            "replacement_character_removed_but_value_incomplete. Note: DB `arabic` comes from "
            "quran-json orthography, so differs_from_clean_reference on the arabic field may "
            "reflect orthographic variance rather than corruption."
        ),
        "recorded_line_count": resolved.get("recorded_line_count"),
        "totals": {"legacy": aggregate("legacy"), "candidate": aggregate("candidate")},
        "details": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--legacy", default=str(LEGACY_DB))
    parser.add_argument("--candidate", default=str(CANDIDATE_DB))
    parser.add_argument("--output", default=str(DEFAULT_REPORT))
    args = parser.parse_args()

    report_path = assert_safe_report_path(args.output)
    legacy_path = Path(args.legacy).resolve() if Path(args.legacy).is_absolute() else (ROOT / args.legacy).resolve()
    candidate_path = Path(args.candidate).resolve() if Path(args.candidate).is_absolute() else (ROOT / args.candidate).resolve()

    legacy_conn = open_readonly(legacy_path)
    candidate_conn = open_readonly(candidate_path)
    try:
        legacy_schema = schema_map(legacy_conn)
        candidate_schema = schema_map(candidate_conn)
        schema_keys = sorted(set(legacy_schema) | set(candidate_schema))
        schema_diff = {
            key: {
                "legacy": legacy_schema.get(key),
                "candidate": candidate_schema.get(key),
                "equal": legacy_schema.get(key) == candidate_schema.get(key),
            }
            for key in schema_keys
        }

        legacy_uniqueness = key_uniqueness(legacy_conn)
        candidate_uniqueness = key_uniqueness(candidate_conn)
        key_columns, key_rationale = choose_join_key(legacy_uniqueness, candidate_uniqueness)

        legacy_words = fetch_words(legacy_conn, key_columns)
        candidate_words = fetch_words(candidate_conn, key_columns)

        report = {
            "legacy_db": legacy_path.relative_to(ROOT).as_posix(),
            "candidate_db": candidate_path.relative_to(ROOT).as_posix(),
            "schema_diff": schema_diff,
            "table_row_counts": {
                "legacy": table_row_counts(legacy_conn),
                "candidate": table_row_counts(candidate_conn),
            },
            "join_key_selection": {
                "chosen": key_columns,
                "rationale": key_rationale,
                "legacy_uniqueness": legacy_uniqueness,
                "candidate_uniqueness": candidate_uniqueness,
            },
            "words_comparison": compare_words(legacy_words, candidate_words, key_columns),
            "known_ufffd_locations": ufffd_section(legacy_words, candidate_words, key_columns),
        }
    finally:
        legacy_conn.close()
        candidate_conn.close()

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    summary = {
        "report": report_path.relative_to(ROOT).as_posix(),
        "shared_keys": report["words_comparison"]["shared_keys"],
        "only_legacy": report["words_comparison"]["keys_only_in_legacy"]["count"],
        "only_candidate": report["words_comparison"]["keys_only_in_candidate"]["count"],
        "fully_equal_rows": report["words_comparison"]["row_pairs_fully_equal_on_compared_columns"],
    }
    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
