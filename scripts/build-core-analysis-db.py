from __future__ import annotations

import json
import os
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA2_DIR = ROOT / "data2"
DB_PATH = DATA_DIR / "kuran_core.db"
SUPPRESSED_VISIBLE_ROOTS = {"Any", "أني", "فأي", "ياس", "كيف"}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(str(value).strip().split())


def normalize_arabic_key(value: str | None) -> str:
    if not value:
        return ""
    return "".join(ch for ch in value if ("\u0600" <= ch <= "\u06ff"))


def normalize_visible_root(value: str | None, morphology: str | None = None) -> str:
    normalized = normalize_text(value)
    if not normalized or normalized in SUPPRESSED_VISIBLE_ROOTS:
        return ""
    parts = set(normalize_text(morphology).split("|")) if morphology else set()
    if "INTG" in parts or "POS:INTG" in parts:
        return ""
    return normalized


def safe_json_load(path: Path) -> tuple[Any | None, str]:
    if not path.exists():
        return None, "missing"
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle), "available"
    except Exception as exc:  # pragma: no cover - defensive
        return {"error": str(exc)}, "error"


def pick_primary_translation(translations: list[dict[str, Any]]) -> str | None:
    available = [item for item in translations if item.get("status") == "available" and normalize_text(item.get("text"))]
    if not available:
        return None
    diyanet = next((item for item in available if item.get("source") == "diyanet"), None)
    chosen = diyanet or available[0]
    return normalize_text(chosen.get("text"))


def choose_word_confidence(entry: dict[str, Any], meaning_tr: str | None) -> str:
    missing_fields = set(entry.get("missing_fields") or [])
    if meaning_tr and "meaning_tr" not in missing_fields:
        return "high"
    if meaning_tr:
        return "medium"
    if normalize_text(entry.get("gloss_en")) or normalize_text(entry.get("root_explanation_tr")):
        return "medium"
    return "low"


def compact_json(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def build_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;

        DROP TABLE IF EXISTS verses;
        DROP TABLE IF EXISTS translations;
        DROP TABLE IF EXISTS words;
        DROP TABLE IF EXISTS root_meanings;
        DROP TABLE IF EXISTS translation_comparison;
        DROP TABLE IF EXISTS fidelity_signals;
        DROP TABLE IF EXISTS context_notes;
        DROP TABLE IF EXISTS build_meta;

        CREATE TABLE verses (
          verse_key TEXT PRIMARY KEY,
          surah_id INTEGER,
          ayah_number INTEGER,
          arabic_text TEXT,
          primary_translation TEXT
        );

        CREATE TABLE translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          verse_key TEXT,
          source TEXT,
          text TEXT
        );

        CREATE TABLE words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          verse_key TEXT,
          word_index INTEGER,
          segment_index INTEGER,
          arabic TEXT,
          root TEXT,
          lemma TEXT,
          pos TEXT,
          morphology TEXT,
          meaning_tr TEXT,
          gloss_en TEXT,
          confidence TEXT,
          source TEXT
        );

        CREATE TABLE root_meanings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          root TEXT,
          meaning_tr TEXT,
          source TEXT
        );

        CREATE TABLE translation_comparison (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          verse_key TEXT,
          source TEXT,
          normalized_text TEXT,
          raw_json TEXT
        );

        CREATE TABLE fidelity_signals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          verse_key TEXT,
          word_index INTEGER,
          root TEXT,
          lemma TEXT,
          signal_type TEXT,
          label_tr TEXT,
          confidence TEXT,
          note TEXT,
          raw_json TEXT
        );

        CREATE TABLE context_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          verse_key TEXT,
          scope TEXT,
          type TEXT,
          source TEXT,
          text TEXT
        );

        CREATE TABLE build_meta (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE INDEX idx_translations_verse_key ON translations (verse_key);
        CREATE INDEX idx_words_verse_key ON words (verse_key);
        CREATE INDEX idx_words_root ON words (root);
        CREATE INDEX idx_translation_comparison_verse_key ON translation_comparison (verse_key);
        CREATE INDEX idx_fidelity_signals_verse_key ON fidelity_signals (verse_key);
        CREATE INDEX idx_context_notes_verse_key ON context_notes (verse_key);
        """
    )


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()

    source_meta: dict[str, str] = {}
    partial_sources: list[str] = []

    arabic_data, arabic_status = safe_json_load(DATA_DIR / "normalized" / "arabic.json")
    translations_data, translations_status = safe_json_load(DATA_DIR / "normalized" / "translations.json")
    canonical_data, canonical_status = safe_json_load(DATA2_DIR / "processed" / "canonical_word_analysis.json")
    overrides_data, overrides_status = safe_json_load(DATA2_DIR / "processed" / "meaning_overrides_tr.json")
    root_seed_data, root_seed_status = safe_json_load(DATA2_DIR / "processed" / "root_explanations_tr.seed.json")
    word_translations_data, word_translations_status = safe_json_load(DATA_DIR / "word-analysis" / "word-translations-tr.json")
    coverage_data, coverage_status = safe_json_load(DATA_DIR / "word-analysis" / "reports" / "coverage-by-ayah.json")
    missing_meanings_data, missing_meanings_status = safe_json_load(DATA_DIR / "word-analysis" / "reports" / "missing-meanings.json")
    fidelity_data, fidelity_status = safe_json_load(DATA_DIR / "fidelity" / "by-surah" / "index.json")
    revelation_data, revelation_status = safe_json_load(DATA_DIR / "revelation-context" / "surah" / "index.json")
    tafsir_data, tafsir_status = safe_json_load(DATA_DIR / "tafsir" / "surah" / "index.json")

    for key, status in [
        ("arabic", arabic_status),
        ("translations", translations_status),
        ("canonical_word_analysis", canonical_status),
        ("meaning_overrides", overrides_status),
        ("root_explanations_seed", root_seed_status),
        ("word_translations_tr", word_translations_status),
        ("coverage_by_ayah", coverage_status),
        ("missing_meanings", missing_meanings_status),
        ("fidelity_index", fidelity_status),
        ("revelation_context", revelation_status),
        ("tafsir_surah", tafsir_status),
    ]:
        source_meta[f"source:{key}"] = status
        if status != "available":
            partial_sources.append(key)

    override_map: dict[str, str] = {}
    if overrides_status == "available" and isinstance(overrides_data, dict):
        for item in overrides_data.get("items", []):
            meaning = normalize_text(item.get("meaning_tr"))
            if not meaning:
                continue
            for candidate in [item.get("arabic_key"), item.get("arabic")]:
                normalized = normalize_arabic_key(candidate)
                if normalized:
                    override_map[normalized] = meaning

    root_seed_map: dict[str, str] = {}
    if root_seed_status == "available" and isinstance(root_seed_data, list):
        for item in root_seed_data:
            root = normalize_text(item.get("root"))
            meaning = normalize_text(item.get("short_tr") or item.get("summary_tr"))
            if root and meaning:
                root_seed_map[root] = meaning

    word_root_meanings: dict[str, str] = {}
    if word_translations_status == "available" and isinstance(word_translations_data, dict):
        for root, meaning in (word_translations_data.get("rootMeanings") or {}).items():
            cleaned_root = normalize_text(root)
            cleaned_meaning = normalize_text(meaning)
            if cleaned_root and cleaned_meaning:
                word_root_meanings[cleaned_root] = cleaned_meaning

    coverage_map: dict[str, dict[str, Any]] = {}
    if coverage_status == "available" and isinstance(coverage_data, list):
        for item in coverage_data:
            verse_key = f"{item['surahId']}:{item['ayahNumber']}"
            coverage_map[verse_key] = item

    missing_map: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if missing_meanings_status == "available" and isinstance(missing_meanings_data, list):
        for item in missing_meanings_data:
            verse_key = f"{item['surahId']}:{item['ayahNumber']}"
            missing_map[verse_key].append(item)

    fidelity_map: dict[str, dict[str, Any]] = {}
    if fidelity_status == "available" and isinstance(fidelity_data, list):
        for item in fidelity_data:
            verse_key = f"{item['surahId']}:{item['ayahNumber']}"
            fidelity_map[verse_key] = item

    revelation_map: dict[int, dict[str, Any]] = {}
    if revelation_status == "available" and isinstance(revelation_data, list):
        for item in revelation_data:
            revelation_map[int(item["surahId"])] = item

    tafsir_map: dict[int, dict[str, Any]] = {}
    if tafsir_status == "available" and isinstance(tafsir_data, list):
        for item in tafsir_data:
            tafsir_map[int(item["surahId"])] = item

    verse_index: dict[str, dict[str, Any]] = {}
    if arabic_status == "available" and isinstance(arabic_data, list):
        for item in arabic_data:
            verse_key = f"{item['surahId']}:{item['ayahNumber']}"
            verse_index[verse_key] = {
                "surah_id": int(item["surahId"]),
                "ayah_number": int(item["ayahNumber"]),
                "arabic_text": normalize_text(item.get("arabicText")),
                "translations": [],
            }

    if translations_status == "available" and isinstance(translations_data, list):
        for item in translations_data:
            verse_key = f"{item['surahId']}:{item['ayahNumber']}"
            verse_index.setdefault(
                verse_key,
                {
                    "surah_id": int(item["surahId"]),
                    "ayah_number": int(item["ayahNumber"]),
                    "arabic_text": "",
                    "translations": [],
                },
            )
            verse_index[verse_key]["translations"] = item.get("translations") or []

    connection = sqlite3.connect(DB_PATH)
    build_schema(connection)
    cursor = connection.cursor()

    verses_rows: list[tuple[Any, ...]] = []
    translation_rows: list[tuple[Any, ...]] = []

    for verse_key, payload in sorted(
        verse_index.items(),
        key=lambda item: (item[1]["surah_id"], item[1]["ayah_number"]),
    ):
        primary_translation = pick_primary_translation(payload.get("translations") or [])
        verses_rows.append(
            (
                verse_key,
                payload["surah_id"],
                payload["ayah_number"],
                payload.get("arabic_text") or None,
                primary_translation,
            )
        )
        for translation in payload.get("translations") or []:
            text = normalize_text(translation.get("text"))
            if translation.get("status") != "available" or not text:
                continue
            translation_rows.append((verse_key, normalize_text(translation.get("source")), text))

    cursor.executemany(
        "INSERT INTO verses (verse_key, surah_id, ayah_number, arabic_text, primary_translation) VALUES (?, ?, ?, ?, ?)",
        verses_rows,
    )
    cursor.executemany(
        "INSERT INTO translations (verse_key, source, text) VALUES (?, ?, ?)",
        translation_rows,
    )

    words_rows: list[tuple[Any, ...]] = []
    root_rows_seen: set[tuple[str, str, str]] = set()
    root_rows: list[tuple[Any, ...]] = []

    if canonical_status == "available" and isinstance(canonical_data, dict):
        for verse_key, entries in canonical_data.items():
            for entry in entries:
                normalized_arabic = normalize_arabic_key(entry.get("arabic"))
                override_meaning = override_map.get(normalized_arabic)
                meaning_tr = normalize_text(override_meaning or entry.get("meaning_tr")) or None
                confidence = choose_word_confidence(entry, meaning_tr)
                source = "meaning_override" if override_meaning else "canonical_word_analysis"
                words_rows.append(
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
                        confidence,
                        source,
                    )
                )

                root = normalize_visible_root(entry.get("root"), entry.get("morphology"))
                canonical_root_meaning = normalize_text(entry.get("root_explanation_tr"))
                if root:
                    for meaning, row_source in [
                        (root_seed_map.get(root), "root_explanations_seed"),
                        (word_root_meanings.get(root), "word_translations_tr"),
                        (canonical_root_meaning or None, "canonical_word_analysis"),
                    ]:
                        if meaning:
                            row_key = (root, meaning, row_source)
                            if row_key not in root_rows_seen:
                                root_rows_seen.add(row_key)
                                root_rows.append(row_key)

    cursor.executemany(
        """
        INSERT INTO words (
          verse_key, word_index, segment_index, arabic, root, lemma, pos, morphology,
          meaning_tr, gloss_en, confidence, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        words_rows,
    )
    cursor.executemany(
        "INSERT INTO root_meanings (root, meaning_tr, source) VALUES (?, ?, ?)",
        root_rows,
    )

    comparison_rows: list[tuple[Any, ...]] = []
    meal_dir = DATA_DIR / "meal-comparison" / "by-surah"
    if meal_dir.exists():
        for path in sorted(meal_dir.glob("*.json")):
            data, status = safe_json_load(path)
            if status != "available" or not isinstance(data, list):
                partial_sources.append(f"meal_comparison:{path.name}")
                continue
            for verse in data:
                verse_key = f"{verse['surahId']}:{verse['ayahNumber']}"
                for entry in verse.get("entries") or []:
                    text = normalize_text(entry.get("text"))
                    if entry.get("status") != "available" or not text:
                        continue
                    comparison_rows.append(
                        (
                            verse_key,
                            normalize_text(entry.get("sourceName")) or "meal_comparison",
                            normalize_text(text.lower()),
                            compact_json({"status": entry.get("status"), "sourceUrl": entry.get("sourceUrl")}),
                        )
                    )

    cursor.executemany(
        "INSERT INTO translation_comparison (verse_key, source, normalized_text, raw_json) VALUES (?, ?, ?, ?)",
        comparison_rows,
    )

    fidelity_rows: list[tuple[Any, ...]] = []
    for verse_key in verse_index.keys():
        coverage = coverage_map.get(verse_key)
        if coverage:
            ratio = coverage.get("coverageRatio")
            note = f"coverage_ratio={ratio:.3f}; matched={coverage.get('matchedWords')}/{coverage.get('totalWords')}"
            if coverage.get("hasMorphology") is False:
                note += "; morphology_missing=true"
            fidelity_rows.append(
                (
                    verse_key,
                    None,
                    None,
                    None,
                    "coverage_ratio",
                    "kelime kapsama oranı",
                    "high" if ratio == 1 else "medium",
                    note,
                    compact_json(
                        {
                            "totalWords": coverage.get("totalWords"),
                            "matchedWords": coverage.get("matchedWords"),
                            "coverageRatio": ratio,
                            "hasMorphology": coverage.get("hasMorphology"),
                        }
                    ),
                )
            )

        fidelity_item = fidelity_map.get(verse_key)
        if fidelity_item:
            fidelity_rows.append(
                (
                    verse_key,
                    None,
                    None,
                    None,
                    "fidelity_status",
                    "fidelity karşılaştırma durumu",
                    "high" if fidelity_item.get("status") == "available" else "low",
                    normalize_text(fidelity_item.get("missingReason")) or "available",
                    compact_json(
                        {
                            "status": fidelity_item.get("status"),
                            "sources": fidelity_item.get("sources"),
                            "comparisonCount": len(fidelity_item.get("comparisons") or []),
                        }
                    ),
                )
            )

        for missing in missing_map.get(verse_key, []):
            raw_candidates = [missing.get("arabic"), missing.get("lemma"), missing.get("root")]
            label = None
            for candidate in raw_candidates:
                normalized = normalize_arabic_key(candidate)
                if normalized and normalized in override_map:
                    label = override_map[normalized]
                    break
            if label is None:
                root = normalize_text(missing.get("root"))
                if root and root in root_seed_map:
                    label = root_seed_map[root]
            fidelity_rows.append(
                (
                    verse_key,
                    int(missing.get("wordIndex") or 0),
                    normalize_text(missing.get("root")) or None,
                    normalize_text(missing.get("lemma")) or None,
                    "missing_meaning",
                    label or normalize_text(missing.get("reason")) or "eşleşme boşluğu",
                    "medium",
                    normalize_text(missing.get("reason")),
                    compact_json(
                        {
                            "arabic": missing.get("arabic"),
                            "reason": missing.get("reason"),
                        }
                    ),
                )
            )

    cursor.executemany(
        """
        INSERT INTO fidelity_signals (
          verse_key, word_index, root, lemma, signal_type, label_tr, confidence, note, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        fidelity_rows,
    )

    context_rows: list[tuple[Any, ...]] = []
    for verse_key, payload in verse_index.items():
        surah_id = payload["surah_id"]
        revelation_item = revelation_map.get(surah_id)
        if revelation_item:
            text_parts = []
            revelation_type = normalize_text(revelation_item.get("revelationType"))
            if revelation_type:
                text_parts.append(f"Vahiy türü: {revelation_type}.")
            order = revelation_item.get("revelationOrder")
            if order:
                text_parts.append(f"Nüzul sırası: {order}.")
            summary = normalize_text(revelation_item.get("summary"))
            if summary:
                text_parts.append(summary)
            if text_parts:
                context_rows.append(
                    (
                        verse_key,
                        "surah",
                        "revelation_context",
                        normalize_text(revelation_item.get("source")) or "revelation_context",
                        " ".join(text_parts),
                    )
                )

        tafsir_item = tafsir_map.get(surah_id)
        if tafsir_item and tafsir_item.get("status") == "available":
            text = normalize_text(tafsir_item.get("text"))
            if text:
                snippet = text[:1200]
                context_rows.append(
                    (
                        verse_key,
                        "surah",
                        "tafsir_note",
                        normalize_text(tafsir_item.get("source")) or "tafsir",
                        snippet,
                    )
                )

    cursor.executemany(
        "INSERT INTO context_notes (verse_key, scope, type, source, text) VALUES (?, ?, ?, ?, ?)",
        context_rows,
    )

    build_meta = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "db_path": str(DB_PATH),
        "source_count": str(len(source_meta)),
        "partial_sources": json.dumps(sorted(set(partial_sources)), ensure_ascii=False),
    }
    build_meta.update(source_meta)

    table_counts = {
        "count:verses": cursor.execute("SELECT COUNT(*) FROM verses").fetchone()[0],
        "count:translations": cursor.execute("SELECT COUNT(*) FROM translations").fetchone()[0],
        "count:words": cursor.execute("SELECT COUNT(*) FROM words").fetchone()[0],
        "count:root_meanings": cursor.execute("SELECT COUNT(*) FROM root_meanings").fetchone()[0],
        "count:translation_comparison": cursor.execute("SELECT COUNT(*) FROM translation_comparison").fetchone()[0],
        "count:fidelity_signals": cursor.execute("SELECT COUNT(*) FROM fidelity_signals").fetchone()[0],
        "count:context_notes": cursor.execute("SELECT COUNT(*) FROM context_notes").fetchone()[0],
    }

    for key, value in table_counts.items():
        build_meta[key] = str(value)

    cursor.executemany(
        "INSERT INTO build_meta (key, value) VALUES (?, ?)",
        [(key, str(value)) for key, value in build_meta.items()],
    )

    connection.commit()
    connection.close()

    size_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print(json.dumps({"db_path": str(DB_PATH), "size_mb": round(size_mb, 2), **table_counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
