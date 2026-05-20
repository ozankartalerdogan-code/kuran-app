import type { AvailabilityStatus, FidelityAnalysis, MealComparisonEntry } from "@quran-app/types";
import { getRelativeDataPath } from "./shared";
import { getAppDb } from "./appDb";

const fidelitySource = getRelativeDataPath("fidelity", "by-surah");

interface ComparisonRow {
  source_name: string;
  text: string | null;
  source_url: string | null;
  status: string;
  ayah_status: string | null;
}

export async function getFidelityAnalysis(
  surahId: number,
  ayahNumber: number
): Promise<FidelityAnalysis | null> {
  const rows = getAppDb()
    .prepare(
      `SELECT source_name, text, source_url, status, ayah_status
       FROM fidelity_comparisons
       WHERE verse_key = ?`
    )
    .all(`${surahId}:${ayahNumber}`) as unknown as ComparisonRow[];

  if (rows.length === 0) {
    return null;
  }

  const ayahStatus = (rows[0].ayah_status ?? "available") as AvailabilityStatus;
  const comparisons: MealComparisonEntry[] = rows.map((row) => ({
    sourceName: row.source_name,
    text: row.text,
    sourceUrl: row.source_url,
    status: (row.status ?? "available") as AvailabilityStatus
  }));

  return {
    source: fidelitySource,
    level: ayahStatus === "available" ? "medium" : "unknown",
    notes: [],
    comparisons,
    sources: [],
    status: ayahStatus
  };
}
