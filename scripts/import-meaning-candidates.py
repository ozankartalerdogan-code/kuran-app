import csv
import json
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
BATCH_JSON_PATH = WORKSPACE_ROOT / "data2" / "processed" / "meaning_candidates_batch.json"
CSV_PATH = WORKSPACE_ROOT / "data2" / "processed" / "meaning_candidates.csv"
OVERRIDES_PATH = WORKSPACE_ROOT / "data2" / "processed" / "meaning_overrides_from_candidates.json"
CANONICAL_V2_PATH = WORKSPACE_ROOT / "data2" / "processed" / "canonical_word_analysis_v2.json"
CANONICAL_V3_PATH = WORKSPACE_ROOT / "data2" / "processed" / "canonical_word_analysis_v3.json"


def clean(value):
    return str(value or "").strip()


def iter_word_records(canonical_data):
    if isinstance(canonical_data, dict):
        for words in canonical_data.values():
            if isinstance(words, list):
                for word in words:
                    if isinstance(word, dict):
                        yield word
    elif isinstance(canonical_data, list):
        for record in canonical_data:
            if isinstance(record, dict) and isinstance(record.get("words"), list):
                for word in record["words"]:
                    if isinstance(word, dict):
                        yield word


def count_empty_meaning_tr(canonical_data):
    return sum(1 for word in iter_word_records(canonical_data) if not clean(word.get("meaning_tr")))


def apply_overrides_to_canonical(canonical_data, overrides):
    matched_word_records = 0
    filled_word_records = 0
    skipped_existing_meaning = 0

    for word in iter_word_records(canonical_data):
        lemma = clean(word.get("lemma"))
        candidate = clean(overrides.get(lemma))

        if not candidate:
            continue

        matched_word_records += 1

        if clean(word.get("meaning_tr")):
            skipped_existing_meaning += 1
            continue

        word["meaning_tr"] = candidate
        word["confidence"] = "medium" if clean(word.get("gloss_en")) else "low"

        sources = word.get("sources")
        if not isinstance(sources, dict):
            sources = {}
        sources["meaning_tr"] = "meaning_overrides_from_candidates"
        word["sources"] = sources

        missing_fields = word.get("missing_fields")
        if isinstance(missing_fields, list):
            word["missing_fields"] = [field for field in missing_fields if field != "meaning_tr"]

        filled_word_records += 1

    return {
        "matchedWordRecords": matched_word_records,
        "filledMeaningTrRecords": filled_word_records,
        "skippedExistingMeaningRecords": skipped_existing_meaning,
    }


def main():
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    with BATCH_JSON_PATH.open("r", encoding="utf-8") as file:
        batch = json.load(file)

    batch_by_lemma = {clean(item.get("lemma")): item for item in batch if isinstance(item, dict)}
    csv_rows_read = 0
    reviewed_count = 0
    skipped_count = 0

    for row in rows:
        csv_rows_read += 1
        lemma = clean(row.get("lemma"))
        candidate = clean(row.get("meaning_tr_candidate"))
        batch_item = batch_by_lemma.get(lemma)

        if not lemma or batch_item is None or not candidate:
            continue

        if candidate == "?":
            batch_item["meaning_tr_candidate"] = ""
            batch_item["reviewed"] = False
            batch_item["skip"] = True
            skipped_count += 1
            continue

        batch_item["meaning_tr_candidate"] = candidate
        batch_item["reviewed"] = True
        batch_item["skip"] = False
        reviewed_count += 1

    with BATCH_JSON_PATH.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(batch, file, ensure_ascii=False, indent=2)
        file.write("\n")

    overrides = {
        clean(item.get("lemma")): clean(item.get("meaning_tr_candidate"))
        for item in batch
        if isinstance(item, dict)
        and clean(item.get("lemma"))
        and item.get("reviewed") is True
        and item.get("skip") is not True
        and clean(item.get("meaning_tr_candidate"))
    }

    with OVERRIDES_PATH.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(overrides, file, ensure_ascii=False, indent=2, sort_keys=True)
        file.write("\n")

    with CANONICAL_V2_PATH.open("r", encoding="utf-8") as file:
        canonical_data = json.load(file)

    empty_meaning_before = count_empty_meaning_tr(canonical_data)
    apply_metrics = apply_overrides_to_canonical(canonical_data, overrides)
    empty_meaning_after = count_empty_meaning_tr(canonical_data)

    with CANONICAL_V3_PATH.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(canonical_data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(
        json.dumps(
            {
                "csvRowsRead": csv_rows_read,
                "reviewedTrueCount": reviewed_count,
                "skipTrueCount": skipped_count,
                "writtenOverridesCount": len(overrides),
                "matchedWordRecords": apply_metrics["matchedWordRecords"],
                "filledMeaningTrRecords": apply_metrics["filledMeaningTrRecords"],
                "skippedExistingMeaningRecords": apply_metrics["skippedExistingMeaningRecords"],
                "emptyMeaningTrBefore": empty_meaning_before,
                "emptyMeaningTrAfter": empty_meaning_after,
                "batchJsonPath": str(BATCH_JSON_PATH),
                "overridesPath": str(OVERRIDES_PATH),
                "canonicalV3Path": str(CANONICAL_V3_PATH),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
