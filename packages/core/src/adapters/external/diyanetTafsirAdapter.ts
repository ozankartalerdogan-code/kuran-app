import type { AyahRangeTafsirCacheEntry, TafsirSummary } from "@quran-app/types";
import { getRelativeDataPath, readJsonFile, repairText } from "../shared";
const tafsirSource = getRelativeDataPath("tafsir", "ayah-ranges", "index.json");

export async function getDiyanetTafsirSummary(
  surahId: number,
  ayahNumber: number
): Promise<TafsirSummary | null> {
  const records = await readJsonFile<AyahRangeTafsirCacheEntry[]>(
    "tafsir",
    "ayah-ranges",
    "index.json"
  );
  const record =
    records.find(
      (item) =>
        item.surahId === surahId && ayahNumber >= item.fromAyah && ayahNumber <= item.toAyah
    ) ?? null;

  if (record === null || record.status !== "available") {
    return null;
  }

  return {
    source: tafsirSource,
    summary: repairText(record.text),
    sources: record.sources,
    status: "available"
  };
}
