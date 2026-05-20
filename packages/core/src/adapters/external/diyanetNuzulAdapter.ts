import type { RevelationContext, SurahRevelationContextCacheEntry } from "@quran-app/types";
import { getRelativeDataPath, readJsonFile, repairText } from "../shared";
const nuzulSource = getRelativeDataPath("revelation-context", "surah", "index.json");

export async function getDiyanetRevelationContext(
  surahId: number,
  ayahNumber: number
): Promise<RevelationContext | null> {
  const records = await readJsonFile<SurahRevelationContextCacheEntry[]>(
    "revelation-context",
    "surah",
    "index.json"
  );
  const record = records.find((item) => item.surahId === surahId) ?? null;

  if (record === null || record.status === "missing") {
    return null;
  }

  return {
    scope: "surah",
    source: nuzulSource,
    summary: repairText(record.summary),
    relatedSurahId: record.surahId,
    relatedAyahId: null,
    methodology: record.methodology,
    sources: record.sources,
    status: record.status
  };
}
