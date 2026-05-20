from __future__ import annotations

import csv
import json
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
VERBS_PATH = ROOT / "data2" / "QURAN-NLP" / "data" / "quran" / "corpus" / "quran_verbs.csv"
SEED_PATH = ROOT / "data2" / "processed" / "root_explanations_tr.seed.json"
OUTPUT_PATH = ROOT / "data2" / "processed" / "root_explanations_tr_enriched.json"
SOURCE_LABEL = "quran_verbs_csv"


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


def clean_text(value: str | None) -> str:
    return " ".join((value or "").strip().split())


def parse_frequency(value: str | None) -> int:
    try:
        return int(float((value or "").strip()))
    except ValueError:
        return 0


def load_verb_root_candidates() -> dict[str, dict[str, Any]]:
    by_root: dict[str, dict[str, Any]] = {}
    translation_weights: dict[str, defaultdict[str, int]] = defaultdict(lambda: defaultdict(int))

    with VERBS_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            root = normalize_arabic(row.get("root"))
            translation = clean_text(row.get("translation"))
            frequency = parse_frequency(row.get("frequency"))

            if not root:
                continue

            current = by_root.setdefault(
                root,
                {
                    "root": root,
                    "frequency": 0,
                    "gloss_en": "",
                },
            )
            current["frequency"] += frequency

            if translation:
                translation_weights[root][translation] += frequency

    for root, weights in translation_weights.items():
        if not weights:
            continue

        by_root[root]["gloss_en"] = sorted(
            weights.items(),
            key=lambda item: (-item[1], len(item[0]), item[0].lower()),
        )[0][0]

    return by_root


def root_key(entry: dict[str, Any]) -> str:
    return normalize_arabic(str(entry.get("root") or ""))


def main() -> None:
    seed_entries = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    if not isinstance(seed_entries, list):
        raise TypeError("root_explanations_tr.seed.json must contain a list")

    existing_roots = {
        root_key(entry)
        for entry in seed_entries
        if isinstance(entry, dict) and root_key(entry)
    }
    verb_roots = load_verb_root_candidates()

    new_entries = []
    for root, candidate in sorted(
        verb_roots.items(),
        key=lambda item: (-int(item[1]["frequency"]), item[0]),
    ):
        if root in existing_roots:
            continue

        new_entries.append(
            {
                "root": root,
                "frequency": candidate["frequency"],
                "gloss_en": candidate["gloss_en"],
                "short_tr": "",
                "summary_tr": "",
                "source": SOURCE_LABEL,
            }
        )

    enriched_entries = [*seed_entries, *new_entries]
    short_tr_empty_count = sum(
        1
        for entry in enriched_entries
        if isinstance(entry, dict) and not clean_text(str(entry.get("short_tr") or ""))
    )

    OUTPUT_PATH.write_text(
        json.dumps(enriched_entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "oncekiKokSayisi": len(seed_entries),
                "eklenenYeniKokSayisi": len(new_entries),
                "toplamKokSayisi": len(enriched_entries),
                "shortTrBosKalanKayitSayisi": short_tr_empty_count,
                "outputPath": str(OUTPUT_PATH.relative_to(ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
