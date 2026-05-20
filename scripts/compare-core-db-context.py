from __future__ import annotations

import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "kuran_core.db"
SNAPSHOT_PATH = ROOT / "data" / "analysis-snapshots" / "verse-analysis-context.sample.json"
OUTPUT_PATH = ROOT / "data" / "analysis-snapshots" / "core-db-context-comparison.sample.json"
TEST_VERSES = ["1:5", "1:7", "2:7", "2:173", "112:1"]


def fetch_value(cursor: sqlite3.Cursor, query: str, params: tuple = ()) -> int:
    row = cursor.execute(query, params).fetchone()
    return int(row[0] if row and row[0] is not None else 0)


def build_db_summary(cursor: sqlite3.Cursor, verse_key: str) -> dict[str, int]:
    return {
        "translationCount": fetch_value(cursor, "SELECT COUNT(*) FROM translations WHERE verse_key = ?", (verse_key,)),
        "wordCount": fetch_value(cursor, "SELECT COUNT(*) FROM words WHERE verse_key = ?", (verse_key,)),
        "rootCount": fetch_value(
            cursor,
            "SELECT COUNT(DISTINCT root) FROM words WHERE verse_key = ? AND root IS NOT NULL AND root != ''",
            (verse_key,),
        ),
        "lemmaCount": fetch_value(
            cursor,
            "SELECT COUNT(DISTINCT lemma) FROM words WHERE verse_key = ? AND lemma IS NOT NULL AND lemma != ''",
            (verse_key,),
        ),
        "fidelityCount": fetch_value(cursor, "SELECT COUNT(*) FROM fidelity_signals WHERE verse_key = ?", (verse_key,)),
        "contextNoteCount": fetch_value(cursor, "SELECT COUNT(*) FROM context_notes WHERE verse_key = ?", (verse_key,)),
    }


def build_snapshot_summary(snapshot_item: dict[str, object]) -> dict[str, int]:
    translation_count = len(snapshot_item.get("translations") or [])
    word_count = len(snapshot_item.get("wordByWord") or [])
    root_count = len(snapshot_item.get("roots") or [])
    lemma_count = len(snapshot_item.get("lemmas") or [])
    weak_count = len(((snapshot_item.get("fidelitySignals") or {}).get("weakOrMissingCorrespondences") or []))
    context_count = len(snapshot_item.get("tafsirNotes") or [])
    if snapshot_item.get("contextNuzul"):
        context_count += 1

    return {
        "translationCount": translation_count,
        "wordCount": word_count,
        "rootCount": root_count,
        "lemmaCount": lemma_count,
        "fidelityCount": weak_count,
        "contextNoteCount": context_count,
    }


def build_risk_notes(db_summary: dict[str, int], snapshot_summary: dict[str, int]) -> list[str]:
    risks: list[str] = []
    for key in ["translationCount", "wordCount", "rootCount", "lemmaCount"]:
        if db_summary[key] != snapshot_summary[key]:
            risks.append(f"count_mismatch:{key}")

    if db_summary["fidelityCount"] < snapshot_summary["fidelityCount"]:
        risks.append("db_fidelity_lower_than_snapshot")
    elif db_summary["fidelityCount"] > snapshot_summary["fidelityCount"]:
        risks.append("db_fidelity_is_broader_than_snapshot")

    if db_summary["contextNoteCount"] > snapshot_summary["contextNoteCount"]:
        risks.append("db_context_includes_surah_scope_notes")

    return risks


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Missing database: {DB_PATH}")
    if not SNAPSHOT_PATH.exists():
        raise SystemExit(f"Missing snapshot: {SNAPSHOT_PATH}")

    with SNAPSHOT_PATH.open("r", encoding="utf-8") as handle:
        snapshot_data = json.load(handle)
    snapshot_map = {item["verseKey"]: item for item in snapshot_data}

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    comparisons: list[dict[str, object]] = []

    for verse_key in TEST_VERSES:
        snapshot_item = snapshot_map.get(verse_key)
        if snapshot_item is None:
            comparisons.append({"verseKey": verse_key, "risk": ["snapshot_missing"]})
            continue

        db_summary = build_db_summary(cursor, verse_key)
        snapshot_summary = build_snapshot_summary(snapshot_item)
        risks = build_risk_notes(db_summary, snapshot_summary)

        row = {
            "verseKey": verse_key,
            "db": db_summary,
            "snapshot": snapshot_summary,
            "risk": risks,
        }
        comparisons.append(row)
        print(json.dumps(row, ensure_ascii=False, indent=2))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(comparisons, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    connection.close()
    print(json.dumps({"outputPath": str(OUTPUT_PATH)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
