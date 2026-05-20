from __future__ import annotations

import json
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CANONICAL_ENRICHED_PATH = ROOT / "data2" / "processed" / "canonical_word_analysis_enriched.json"
ROOTS_ENRICHED_PATH = ROOT / "data2" / "processed" / "root_explanations_tr_enriched.json"
OUTPUT_PATH = ROOT / "data2" / "processed" / "canonical_word_analysis_v2.json"


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def normalize_arabic(value: Any) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(
        char
        for char in normalized
        if "\u0600" <= char <= "\u06ff" and unicodedata.category(char) != "Mn"
    )
    normalized = normalized.replace("\u0640", "")
    normalized = normalized.replace("\u0671", "\u0627")
    normalized = normalized.replace("\u0622", "\u0627")
    normalized = normalized.replace("\u0623", "\u0627")
    normalized = normalized.replace("\u0625", "\u0627")
    normalized = normalized.replace("\u0649", "\u064a")
    normalized = normalized.replace("\u0629", "\u0647")
    return normalized.strip()


def load_root_map() -> dict[str, dict[str, Any]]:
    roots = json.loads(ROOTS_ENRICHED_PATH.read_text(encoding="utf-8"))
    if not isinstance(roots, list):
        raise TypeError("root_explanations_tr_enriched.json must contain a list")

    root_map: dict[str, dict[str, Any]] = {}
    for entry in roots:
        if not isinstance(entry, dict):
            continue

        key = normalize_arabic(entry.get("root"))
        if key and key not in root_map:
            root_map[key] = entry

    return root_map


def remove_missing_fields(entry: dict[str, Any], fields: set[str]) -> None:
    missing_fields = entry.get("missing_fields")
    if not isinstance(missing_fields, list):
        return

    entry["missing_fields"] = [
        field
        for field in missing_fields
        if field not in fields
    ]


def update_confidence(entry: dict[str, Any]) -> None:
    has_meaning_tr = bool(clean_text(entry.get("meaning_tr")))
    has_gloss_en = bool(clean_text(entry.get("gloss_en")))

    if has_meaning_tr and has_gloss_en:
        entry["confidence"] = "medium"
    elif has_gloss_en:
        entry["confidence"] = "low-enriched"
    elif not has_meaning_tr:
        entry["confidence"] = "low"


def enrich_word(entry: dict[str, Any], root_map: dict[str, dict[str, Any]]) -> None:
    root_entry = root_map.get(normalize_arabic(entry.get("root")))
    filled_fields: set[str] = set()

    if root_entry and not clean_text(entry.get("gloss_en")):
        gloss_en = clean_text(root_entry.get("gloss_en"))
        if gloss_en:
            entry["gloss_en"] = gloss_en
            filled_fields.add("gloss_en")

    if root_entry and not clean_text(entry.get("root_explanation_tr")):
        summary_tr = clean_text(root_entry.get("summary_tr"))
        if summary_tr:
            entry["root_explanation_tr"] = summary_tr
            filled_fields.add("root_explanation_tr")

    if clean_text(entry.get("meaning_tr")):
        filled_fields.add("meaning_tr")
    if clean_text(entry.get("gloss_en")):
        filled_fields.add("gloss_en")
    if clean_text(entry.get("root_explanation_tr")):
        filled_fields.add("root_explanation_tr")

    remove_missing_fields(entry, filled_fields)
    update_confidence(entry)


def main() -> None:
    canonical = json.loads(CANONICAL_ENRICHED_PATH.read_text(encoding="utf-8"))
    if not isinstance(canonical, dict):
        raise TypeError("canonical_word_analysis_enriched.json must contain an object")

    root_map = load_root_map()
    total_word_count = 0
    confidence_distribution: Counter[str] = Counter()
    full_coverage_count = 0
    missing_meaning_tr_count = 0

    for words in canonical.values():
        if not isinstance(words, list):
            continue

        for entry in words:
            if not isinstance(entry, dict):
                continue

            total_word_count += 1
            enrich_word(entry, root_map)

            confidence_distribution[clean_text(entry.get("confidence")) or "unknown"] += 1

            missing_fields = entry.get("missing_fields")
            if isinstance(missing_fields, list) and len(missing_fields) == 0:
                full_coverage_count += 1

            if not clean_text(entry.get("meaning_tr")):
                missing_meaning_tr_count += 1

    OUTPUT_PATH.write_text(
        json.dumps(canonical, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "toplamWordKaydi": total_word_count,
                "confidenceDagilimi": {
                    "high": confidence_distribution.get("high", 0),
                    "medium": confidence_distribution.get("medium", 0),
                    "low-enriched": confidence_distribution.get("low-enriched", 0),
                    "low": confidence_distribution.get("low", 0),
                    "unknown": confidence_distribution.get("unknown", 0),
                },
                "missingFieldsTamamenBosKayitSayisi": full_coverage_count,
                "halaMeaningTrBosKayitSayisi": missing_meaning_tr_count,
                "outputPath": str(OUTPUT_PATH.relative_to(ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
