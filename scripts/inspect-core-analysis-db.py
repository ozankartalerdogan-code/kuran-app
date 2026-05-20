from __future__ import annotations

import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "kuran_core.db"
TEST_VERSES = ["1:5", "1:7", "2:7", "2:173", "112:1"]


def fetch_value(cursor: sqlite3.Cursor, query: str, params: tuple = ()) -> int:
    row = cursor.execute(query, params).fetchone()
    return int(row[0] if row and row[0] is not None else 0)


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Missing database: {DB_PATH}")

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    counts = {
        "verses_count": fetch_value(cursor, "SELECT COUNT(*) FROM verses"),
        "translations_count": fetch_value(cursor, "SELECT COUNT(*) FROM translations"),
        "words_count": fetch_value(cursor, "SELECT COUNT(*) FROM words"),
        "root_meanings_count": fetch_value(cursor, "SELECT COUNT(*) FROM root_meanings"),
        "translation_comparison_count": fetch_value(cursor, "SELECT COUNT(*) FROM translation_comparison"),
        "fidelity_signals_count": fetch_value(cursor, "SELECT COUNT(*) FROM fidelity_signals"),
        "context_notes_count": fetch_value(cursor, "SELECT COUNT(*) FROM context_notes"),
    }
    print(json.dumps(counts, ensure_ascii=False, indent=2))

    for verse_key in TEST_VERSES:
        root_count = fetch_value(cursor, "SELECT COUNT(DISTINCT root) FROM words WHERE verse_key = ? AND root IS NOT NULL AND root != ''", (verse_key,))
        lemma_count = fetch_value(cursor, "SELECT COUNT(DISTINCT lemma) FROM words WHERE verse_key = ? AND lemma IS NOT NULL AND lemma != ''", (verse_key,))
        payload = {
            "verseKey": verse_key,
            "translationCount": fetch_value(cursor, "SELECT COUNT(*) FROM translations WHERE verse_key = ?", (verse_key,)),
            "wordCount": fetch_value(cursor, "SELECT COUNT(*) FROM words WHERE verse_key = ?", (verse_key,)),
            "rootCount": root_count,
            "lemmaCount": lemma_count,
            "fidelitySignalCount": fetch_value(cursor, "SELECT COUNT(*) FROM fidelity_signals WHERE verse_key = ?", (verse_key,)),
            "mealComparisonCount": fetch_value(cursor, "SELECT COUNT(*) FROM translation_comparison WHERE verse_key = ?", (verse_key,)),
            "contextNoteCount": fetch_value(cursor, "SELECT COUNT(*) FROM context_notes WHERE verse_key = ?", (verse_key,)),
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))

    connection.close()


if __name__ == "__main__":
    main()
