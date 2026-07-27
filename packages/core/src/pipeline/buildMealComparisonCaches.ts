import type { MealComparisonCacheEntry } from "@quran-app/types";
import { readJsonFile } from "../adapters/shared";
import { writeDataJson } from "./shared";

export async function buildMealComparisonCaches(): Promise<void> {
  const surahs = await readJsonFile<{ surahId: number; verseCount: number | null }[]>(
    "normalized", "surah-meta.json"
  );
  const bySurah: Record<number, MealComparisonCacheEntry[]> = {};

  for (const surah of surahs) {
    const entries: MealComparisonCacheEntry[] = [];

    for (let ayahNumber = 1; ayahNumber <= (surah.verseCount ?? 0); ayahNumber += 1) {
      entries.push({
        surahId: surah.surahId,
        ayahNumber,
        entries: [],
        status: "insufficient_data",
        missingReason: "removed_from_runtime",
        sources: []
      });
    }

    bySurah[surah.surahId] = entries;
  }

  await Promise.all(
    Object.entries(bySurah).map(([surahId, entries]) =>
      writeDataJson(["meal-comparison", "by-surah", `${surahId.padStart(3, "0")}.json`], entries)
    )
  );
}
