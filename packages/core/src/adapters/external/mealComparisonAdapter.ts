import type { AvailabilityStatus, FidelityAnalysis, MealComparisonEntry } from "@quran-app/types";
import { getRelativeDataPath, repairText, dbAll } from "../shared";
import { getAppDb } from "../appDb";

const comparisonSource = getRelativeDataPath("meal-comparison", "by-surah");

interface ComparisonRow {
  source_name: string;
  text: string | null;
  source_url: string | null;
  status: string;
}

export async function getMealComparison(
  surahId: number,
  ayahNumber: number
): Promise<FidelityAnalysis | null> {
  const rows = dbAll<ComparisonRow>(
    getAppDb().prepare(
      `SELECT source_name, text, source_url, status
       FROM fidelity_comparisons
       WHERE verse_key = ?`
    ),
    `${surahId}:${ayahNumber}`
  );

  if (rows.length === 0) {
    return null;
  }

  const comparisons: MealComparisonEntry[] = rows.map((row) => ({
    sourceName: row.source_name,
    text: repairText(row.text),
    sourceUrl: row.source_url,
    status: (row.status ?? "available") as AvailabilityStatus
  }));

  return {
    source: comparisonSource,
    level: comparisons.length >= 2 ? "medium" : "unknown",
    notes: [],
    comparisons,
    sources: [],
    status: (comparisons.length >= 2 ? "available" : "insufficient_data") as AvailabilityStatus
  };
}
