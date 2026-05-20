import type { getAyahDetail } from "@quran-app/core";
import type { AvailabilityStatus, WordAnalysis } from "@quran-app/types";
import meaningOverridesData from "../../../../../../../../data2/processed/meaning_overrides_tr.json";

interface MeaningOverrideRecord {
  arabic_key: string;
  meaning_tr: string;
}

export interface ValidatorCopyPayload {
  id: string | number;
  arabicTokens: string[];
  analysisTokens: Array<{
    index: number;
    sourceIndex: number;
    arabic: string | null;
    morphology: string | null;
    status: AvailabilityStatus;
  }>;
  roots: Array<{
    index: number;
    sourceIndex: number;
    root: string | null;
    status: AvailabilityStatus;
  }>;
  meanings: Array<{
    index: number;
    sourceIndex: number;
    text: string | null;
    status: AvailabilityStatus;
  }>;
}

const meaningOverridesByArabic = new Map<string, string>(
  (meaningOverridesData.items as MeaningOverrideRecord[]).map((item) => [
    item.arabic_key,
    item.meaning_tr
  ])
);

function normalizeArabicLookupKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/\u0640/gu, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .trim();
}

export function getMeaningOverride(word: WordAnalysis): string | null {
  return meaningOverridesByArabic.get(normalizeArabicLookupKey(word.arabic)) ?? null;
}

function cleanupMeaningText(value: string): string {
  return value
    .replace(/^the \(belirteç\)$/i, "belirlilik takısı")
    .replace(/^the \(belirtec\)$/i, "belirlilik takısı")
    .replace(/\bthe \(belirteç\)/gi, "belirlilik takısı")
    .replace(/\bthe \(belirtec\)/gi, "belirlilik takısı");
}

export function getWordMeaningDisplayText(word: WordAnalysis): string | null {
  const override = getMeaningOverride(word);

  if (override) {
    return override;
  }

  return word.meaning?.text ? cleanupMeaningText(word.meaning.text) : null;
}

export function buildValidatorCopyPayload(
  detail: Awaited<ReturnType<typeof getAyahDetail>>
): ValidatorCopyPayload {
  return {
    id: detail.ayah.id,
    arabicTokens: detail.wordAnalyses.map((word) => word.arabic ?? ""),
    analysisTokens: detail.wordAnalyses.map((word, index) => ({
      index,
      sourceIndex: word.wordIndex,
      arabic: word.arabic,
      morphology: word.morphology,
      status: word.status
    })),
    roots: detail.wordAnalyses.map((word, index) => ({
      index,
      sourceIndex: word.wordIndex,
      root: word.root,
      status: word.root ? "available" : "missing"
    })),
    meanings: detail.wordAnalyses.map((word, index) => {
      const text = getWordMeaningDisplayText(word);

      return {
        index,
        sourceIndex: word.wordIndex,
        text,
        status: text ? "available" : "missing"
      };
    })
  };
}
