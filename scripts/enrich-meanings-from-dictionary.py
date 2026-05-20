from __future__ import annotations

import csv
import json
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DICTIONARY_PATH = ROOT / "data2" / "QURAN-NLP" / "data" / "quran" / "corpus" / "quran_dictionary.csv"
CANONICAL_PATH = ROOT / "data2" / "processed" / "canonical_word_analysis.json"
OUTPUT_PATH = ROOT / "data2" / "processed" / "canonical_word_analysis_enriched.json"
SOURCE_GLOSS_LABEL = "quran_dictionary_csv"


def normalize_arabic(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
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


def clean_translation(value: str | None) -> str:
    return " ".join((value or "").strip().split())


def load_dictionary() -> dict[str, str]:
    translations_by_word: dict[str, Counter[str]] = {}

    with DICTIONARY_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            arabic_key = normalize_arabic(row.get("arabic_word"))
            translation = clean_translation(row.get("translation"))

            if not arabic_key or not translation:
                continue

            translations_by_word.setdefault(arabic_key, Counter())[translation] += 1

    dictionary: dict[str, str] = {}
    for arabic_key, counts in translations_by_word.items():
        dictionary[arabic_key] = sorted(
            counts.items(),
            key=lambda item: (-item[1], len(item[0]), item[0].lower()),
        )[0][0]

    return dictionary


def has_meaning_tr(entry: dict[str, Any]) -> bool:
    return bool(str(entry.get("meaning_tr") or "").strip())


def enrich_entry(entry: dict[str, Any], dictionary: dict[str, str]) -> bool:
    if has_meaning_tr(entry):
        return False

    arabic_key = normalize_arabic(entry.get("arabic"))
    gloss_en = dictionary.get(arabic_key)

    if not gloss_en:
        return False

    entry["gloss_en"] = gloss_en
    entry["source_gloss"] = SOURCE_GLOSS_LABEL

    missing_fields = entry.get("missing_fields")
    if isinstance(missing_fields, list) and "gloss_en" in missing_fields:
        entry["missing_fields"] = [field for field in missing_fields if field != "gloss_en"]

    return True


def main() -> None:
    dictionary = load_dictionary()
    canonical = json.loads(CANONICAL_PATH.read_text(encoding="utf-8"))

    total_entries = 0
    missing_meaning_tr_entries = 0
    enriched_entries = 0

    for words in canonical.values():
        if not isinstance(words, list):
            continue

        for entry in words:
            if not isinstance(entry, dict):
                continue

            total_entries += 1
            if not has_meaning_tr(entry):
                missing_meaning_tr_entries += 1

            if enrich_entry(entry, dictionary):
                enriched_entries += 1

    still_empty_entries = missing_meaning_tr_entries - enriched_entries

    OUTPUT_PATH.write_text(
        json.dumps(canonical, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "dictionaryRowsByArabicWord": len(dictionary),
                "toplamWordKaydi": total_entries,
                "eslesmeBulunanKayitSayisi": enriched_entries,
                "halaBosKalanKayitSayisi": still_empty_entries,
                "outputPath": str(OUTPUT_PATH.relative_to(ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
