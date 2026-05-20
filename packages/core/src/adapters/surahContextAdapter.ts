import type { SurahContextData } from "@quran-app/types";
import { getRelativeDataPath, readJsonFile } from "./shared";

const surahContextSource = getRelativeDataPath("context", "normalized", "surah-context.json");

const surahContextIndexPromise: Promise<Map<number, SurahContextData>> =
  loadSurahContextData().then((records) => {
    return new Map(records.map((record) => [record.surahId, record]));
  });

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number";
}

function hasOptionalNullableString(record: Record<string, unknown>, key: string): boolean {
  return !(key in record) || isNullableString(record[key]);
}

function hasOptionalNullableNumber(record: Record<string, unknown>, key: string): boolean {
  return !(key in record) || isNullableNumber(record[key]);
}

function hasOptionalString(record: Record<string, unknown>, key: string): boolean {
  return !(key in record) || typeof record[key] === "string";
}

export function isValidSurahId(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 114;
}

export function isValidSurahContextData(value: unknown): value is SurahContextData {
  if (!isPlainRecord(value)) {
    return false;
  }

  return (
    typeof value.surahId === "number" &&
    isValidSurahId(value.surahId) &&
    hasOptionalNullableString(value, "revelationPlace") &&
    hasOptionalNullableNumber(value, "revelationOrder") &&
    hasOptionalNullableString(value, "shortIntroduction") &&
    hasOptionalString(value, "source")
  );
}

export async function loadSurahContextData(): Promise<SurahContextData[]> {
  const records = await readJsonFile<unknown>("context", "normalized", "surah-context.json");

  if (!Array.isArray(records)) {
    throw new Error(`${surahContextSource} must contain an array`);
  }

  const seenSurahIds = new Set<number>();

  records.forEach((record, index) => {
    if (!isValidSurahContextData(record)) {
      throw new Error(`${surahContextSource} has an invalid record at index ${index}`);
    }

    if (seenSurahIds.has(record.surahId)) {
      throw new Error(`${surahContextSource} has a duplicate surahId: ${record.surahId}`);
    }

    seenSurahIds.add(record.surahId);
  });

  return records;
}

export async function readSurahContextFromLocalData(
  surahId: number
): Promise<SurahContextData | null> {
  if (!isValidSurahId(surahId)) {
    return null;
  }

  const index = await surahContextIndexPromise;

  return index.get(surahId) ?? null;
}

export const surahContextDataSources = {
  surahContextSource
} as const;
