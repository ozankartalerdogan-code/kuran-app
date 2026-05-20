import type {
  MealComparisonCacheEntry,
  NormalizedAyahTranslations,
  SourceMetadata
} from "@quran-app/types";
import { getRelativeDataPath, readJsonFile } from "../adapters/shared";
import { writeDataJson } from "./shared";

export async function buildMealComparisonCaches(): Promise<void> {
  const [surahs, normalizedTranslations] = await Promise.all([
    readJsonFile<{ surahId: number; verseCount: number | null }[]>("normalized", "surah-meta.json"),
    readJsonFile<NormalizedAyahTranslations[]>("normalized", "translations.json")
  ]);

  const bySurah: Record<number, MealComparisonCacheEntry[]> = {};
  const normalizedTranslationSource = getRelativeDataPath("normalized", "translations.json");
  const translationIndex = new Map(
    normalizedTranslations.map((record) => [`${record.surahId}:${record.ayahNumber}`, record])
  );

  for (const surah of surahs) {
    const entries: MealComparisonCacheEntry[] = [];

    for (let ayahNumber = 1; ayahNumber <= (surah.verseCount ?? 0); ayahNumber += 1) {
      const matched = translationIndex.get(`${surah.surahId}:${ayahNumber}`) ?? null;
      const availableEntries =
        matched?.translations.filter(
          (entry) => entry.text !== null && entry.status === "available"
        ) ?? [];
      const hasPrimaryMeal = availableEntries.some((entry) => entry.source === "diyanet");
      const helperMealCount = availableEntries.filter((entry) => entry.source !== "diyanet").length;

      const sources: SourceMetadata[] = availableEntries.map((item) => ({
        sourceName: item.source,
        sourceType: item.source === "diyanet" ? "official" : "github",
        surahId: surah.surahId,
        ayahStart: ayahNumber,
        ayahEnd: ayahNumber,
        retrievedAt: "2026-04-15",
        originalUrl: normalizedTranslationSource,
        confidence: item.source === "diyanet" ? "high" : "medium",
        dataType: "meal_comparison",
        usageClass: item.source === "diyanet" ? "primary" : "github_verified",
        license: null
      }));

      entries.push({
        surahId: surah.surahId,
        ayahNumber,
        entries: availableEntries.map((item) => ({
          sourceName: item.source,
          text: item.text,
          sourceUrl: normalizedTranslationSource,
          status: item.status
        })),
        status: hasPrimaryMeal && helperMealCount >= 1 ? "available" : "insufficient_data",
        missingReason: hasPrimaryMeal && helperMealCount >= 1 ? null : "insufficient_data",
        sources
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
