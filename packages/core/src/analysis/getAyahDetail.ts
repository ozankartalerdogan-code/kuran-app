import type { AyahDetailPayload } from "@quran-app/types";
import { getFidelityAnalysis } from "../adapters/fidelityAdapter";
import { readSurahByIdFromLocalData } from "../adapters/quranAdapter";
import { getRevelationContext } from "../adapters/revelationContextAdapter";
import { getTafsirSummary } from "../adapters/tafsirAdapter";
import { getCanonicalWordAnalysesAsLegacy } from "../adapters/canonicalWordAnalysisAdapter";
import { getWordAnalyses } from "../adapters/wordAnalysisAdapter";
import { getAyah } from "../quran/getAyah";

export type WordAnalysisSource = "legacy" | "canonical";

interface GetAyahDetailOptions {
  wordAnalysisSource?: WordAnalysisSource;
}

export async function getAyahDetail(
  surahId: number,
  verseNumber: number,
  options: GetAyahDetailOptions = {}
): Promise<AyahDetailPayload> {
  const getSelectedWordAnalyses =
    options.wordAnalysisSource === "canonical"
      ? getCanonicalWordAnalysesAsLegacy
      : getWordAnalyses;

  let surah: Awaited<ReturnType<typeof readSurahByIdFromLocalData>>;
  let ayah: Awaited<ReturnType<typeof getAyah>>;
  let wordAnalyses: Awaited<ReturnType<typeof getSelectedWordAnalyses>>;
  let tafsirSummary: Awaited<ReturnType<typeof getTafsirSummary>>;
  let revelationContext: Awaited<ReturnType<typeof getRevelationContext>>;
  let fidelityAnalysis: Awaited<ReturnType<typeof getFidelityAnalysis>>;

  try {
    [surah, ayah, wordAnalyses, tafsirSummary, revelationContext, fidelityAnalysis] =
      await Promise.all([
        readSurahByIdFromLocalData(surahId),
        getAyah(surahId, verseNumber),
        getSelectedWordAnalyses(surahId, verseNumber),
        getTafsirSummary(surahId, verseNumber),
        getRevelationContext(surahId, verseNumber),
        getFidelityAnalysis(surahId, verseNumber)
      ]);
  } catch (err) {
    console.error(`[getAyahDetail] ${surahId}:${verseNumber} yüklenemedi:`, err);
    throw err;
  }

  return {
    surah,
    ayah,
    translations: ayah.translations,
    wordAnalyses,
    tafsirSummary,
    revelationContext,
    fidelityAnalysis,
    status: surah !== null && ayah.status === "available" ? "available" : "missing"
  };
}
