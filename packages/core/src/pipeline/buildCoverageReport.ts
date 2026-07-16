import type {
  AyahRangeTafsirCacheEntry,
  CoverageReport,
  FidelityCacheEntry,
  MealComparisonCacheEntry,
  NormalizedArabicAyah,
  SurahRevelationContextCacheEntry,
  SurahTafsirCacheEntry
} from "@quran-app/types";
import { readJsonFile } from "../adapters/shared";
import { writeDataJson } from "./shared";

interface WordMeaningCoverageEntry {
  surahId: number;
  ayahNumber: number;
  totalWords: number;
  matchedWords: number;
  coverageRatio: number;
  hasMorphology: boolean;
}

const MIN_WORD_MEANING_COVERAGE = 0.6;

export async function buildCoverageReport(): Promise<CoverageReport> {
  const [surahTafsir, surahContext, ayahRangeTafsir, arabicAyahs, wordMeaningCoverage] =
    await Promise.all([
    readJsonFile<SurahTafsirCacheEntry[]>("tafsir", "surah", "index.json"),
    readJsonFile<SurahRevelationContextCacheEntry[]>("revelation-context", "surah", "index.json"),
    readJsonFile<AyahRangeTafsirCacheEntry[]>("tafsir", "ayah-ranges", "index.json"),
    readJsonFile<NormalizedArabicAyah[]>("generated", "quran", "verses.json"),
    readJsonFile<WordMeaningCoverageEntry[]>(
      "word-analysis",
      "reports",
      "coverage-by-ayah.json"
    )
  ]);

  const mealComparisonFiles = Array.from({ length: 114 }, (_, index) =>
    `${index + 1}`.padStart(3, "0") + ".json"
  );
  const mealComparisonGroups = await Promise.all(
    mealComparisonFiles.map((file) =>
      readJsonFile<MealComparisonCacheEntry[]>("meal-comparison", "by-surah", file)
    )
  );

  const mealComparisonEntries = mealComparisonGroups.flat();
  const arabicIndex = new Map(
    arabicAyahs.map((entry) => [`${entry.surahId}:${entry.ayahNumber}`, entry])
  );
  const wordCoverageIndex = new Map(
    wordMeaningCoverage.map((entry) => [`${entry.surahId}:${entry.ayahNumber}`, entry])
  );

  const fidelityEntries: FidelityCacheEntry[] = mealComparisonEntries.map((entry) => {
    const ayahKey = `${entry.surahId}:${entry.ayahNumber}`;
    const arabicEntry = arabicIndex.get(ayahKey) ?? null;
    const wordCoverage = wordCoverageIndex.get(ayahKey) ?? null;
    const hasCleanPrimaryMeal = entry.entries.some((item) => item.sourceName === "diyanet");
    const cleanHelperMealCount = entry.entries.filter((item) => item.sourceName !== "diyanet").length;
    const hasValidArabic = arabicEntry?.status === "available" && arabicEntry.arabicText !== null;
    const hasMorphology = wordCoverage?.hasMorphology === true && (wordCoverage?.totalWords ?? 0) > 0;
    const hasMeaningCoverage =
      (wordCoverage?.coverageRatio ?? 0) >= MIN_WORD_MEANING_COVERAGE &&
      (wordCoverage?.matchedWords ?? 0) > 0;
    const isReady =
      hasCleanPrimaryMeal &&
      cleanHelperMealCount >= 1 &&
      hasValidArabic &&
      hasMorphology &&
      hasMeaningCoverage;

    return {
      surahId: entry.surahId,
      ayahNumber: entry.ayahNumber,
      status: isReady ? "available" : "insufficient_data",
      missingReason: isReady ? null : "insufficient_data",
      comparisons: entry.entries,
      sources: entry.sources
    };
  });

  await writeDataJson(["fidelity", "by-surah", "index.json"], fidelityEntries);

  const report: CoverageReport = {
    surahTafsirCount: surahTafsir.filter((item) => item.status === "available").length,
    surahContextCount: surahContext.filter((item) => item.status === "available").length,
    ayahRangeTafsirCount: ayahRangeTafsir.filter(
      (item) => item.level === "ayah_range" && item.status === "available"
    ).length,
    mealComparisonAyahCount: mealComparisonEntries.filter((item) => item.status === "available").length,
    fidelityReadyAyahCount: fidelityEntries.filter((item) => item.status === "available").length,
    parserGapCount: [...surahTafsir, ...surahContext, ...ayahRangeTafsir].filter(
      (item) => item.missingReason === "parser_gap"
    ).length,
    matchingGapCount: wordMeaningCoverage.filter(
      (entry) => entry.hasMorphology && entry.coverageRatio < MIN_WORD_MEANING_COVERAGE
    ).length,
    sourceUnavailableCount: [...surahTafsir, ...surahContext, ...ayahRangeTafsir].filter(
      (item) => item.missingReason === "source_unavailable"
    ).length
  };

  await writeDataJson(["source-metadata", "coverage-report.json"], report);

  return report;
}
