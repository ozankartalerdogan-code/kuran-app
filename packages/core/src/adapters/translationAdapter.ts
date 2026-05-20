import type { NormalizedAyahTranslations, Translation } from "@quran-app/types";
import { getRelativeDataPath, readJsonFile } from "./shared";

const translationSource = getRelativeDataPath("normalized", "translations.json");
const transliterationSource = translationSource;

const translationIndexPromise: Promise<Map<string, NormalizedAyahTranslations>> = readJsonFile<
  NormalizedAyahTranslations[]
>("normalized", "translations.json").then(
  (records) =>
    new Map(records.map((record) => [`${record.surahId}:${record.ayahNumber}`, record]))
);

async function loadTranslationIndex(): Promise<Map<string, NormalizedAyahTranslations>> {
  return translationIndexPromise;
}

export async function getAyahTranslations(
  surahId: number,
  ayahNumber: number
): Promise<Translation[]> {
  const translationIndex = await loadTranslationIndex();
  const record = translationIndex.get(`${surahId}:${ayahNumber}`) ?? null;

  if (record === null) {
    return [];
  }

  return record.translations
    .filter((translation) => translation.text !== null && translation.status === "available")
    .map((translation) => ({
      language: "tr",
      source: `${translationSource}#${translation.source}`,
      text: translation.text,
      status: translation.status
    }));
}

export async function getAyahTransliteration(
  surahId: number,
  ayahNumber: number
): Promise<string | null> {
  const translationIndex = await loadTranslationIndex();
  const record = translationIndex.get(`${surahId}:${ayahNumber}`) ?? null;

  if (record === null || record.transliterationStatus !== "available") {
    return null;
  }

  return record.transliteration;
}

export const translationDataSources = {
  translationSource,
  transliterationSource
} as const;
