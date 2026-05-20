import csv
import json
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_V2_PATH = WORKSPACE_ROOT / "data2" / "processed" / "canonical_word_analysis_v2.json"
BATCH_JSON_PATH = WORKSPACE_ROOT / "data2" / "processed" / "meaning_candidates_batch.json"
CSV_PATH = WORKSPACE_ROOT / "data2" / "processed" / "meaning_candidates.csv"
MAX_EXPORT_COUNT = 3000


def clean(value):
    return str(value or "").strip()


def iter_words(canonical_data):
    if isinstance(canonical_data, dict):
        for verse_key, words in canonical_data.items():
            if not isinstance(words, list):
                continue
            for word in words:
                if isinstance(word, dict):
                    yield verse_key, word
    elif isinstance(canonical_data, list):
        for record in canonical_data:
            if not isinstance(record, dict):
                continue
            verse_key = clean(record.get("verseKey") or record.get("verse_key"))
            words = record.get("words")
            if isinstance(words, list):
                for word in words:
                    if isinstance(word, dict):
                        yield verse_key, word


def main():
    with CANONICAL_V2_PATH.open("r", encoding="utf-8") as file:
        canonical_data = json.load(file)

    lemma_groups = {}
    skipped_empty_gloss_word_count = 0

    for _verse_key, word in iter_words(canonical_data):
        meaning_tr = clean(word.get("meaning_tr"))
        if meaning_tr:
            continue

        gloss_en = clean(word.get("gloss_en"))
        if not gloss_en:
            skipped_empty_gloss_word_count += 1
            continue

        lemma = clean(word.get("lemma"))
        if not lemma:
            continue

        group = lemma_groups.setdefault(
            lemma,
            {
                "lemma": lemma,
                "arabic": clean(word.get("arabic")),
                "root": clean(word.get("root")),
                "gloss_en": gloss_en,
                "frequency": 0,
                "confidence": clean(word.get("confidence")) or "unknown",
                "meaning_tr_candidate": "",
                "reviewed": False,
                "skip": False,
            },
        )

        group["frequency"] += 1

        if group["confidence"] == "unknown" and clean(word.get("confidence")):
            group["confidence"] = clean(word.get("confidence"))

    candidates = sorted(
        lemma_groups.values(),
        key=lambda item: (-item["frequency"], item["lemma"]),
    )
    selected_candidates = candidates[:MAX_EXPORT_COUNT]

    BATCH_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with BATCH_JSON_PATH.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(selected_candidates, file, ensure_ascii=False, indent=2)
        file.write("\n")

    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "lemma",
                "arabic",
                "root",
                "gloss_en",
                "frequency",
                "meaning_tr_candidate",
            ],
        )
        writer.writeheader()
        for candidate in selected_candidates:
            writer.writerow(
                {
                    "lemma": candidate["lemma"],
                    "arabic": candidate["arabic"],
                    "root": candidate["root"],
                    "gloss_en": candidate["gloss_en"],
                    "frequency": candidate["frequency"],
                    "meaning_tr_candidate": "",
                }
            )

    print(
        json.dumps(
            {
                "uniqueLemmaWithMissingMeaningAndGloss": len(candidates),
                "writtenToCsv": len(selected_candidates),
                "skippedWordRecordsBecauseGlossEnEmpty": skipped_empty_gloss_word_count,
                "batchJsonPath": str(BATCH_JSON_PATH),
                "csvPath": str(CSV_PATH),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
