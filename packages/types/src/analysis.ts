import type { AvailabilityStatus, Ayah, Surah, Translation } from "./quran";

export type WordRole =
  | "noun"
  | "verb"
  | "particle"
  | "pronoun"
  | "adjective"
  | "adverb"
  | "preposition"
  | "conjunction"
  | "other"
  | "unknown";

export type FidelityLevel = "high" | "medium" | "low" | "unknown";

export type ReferenceScope = "surah" | "ayah";

export type SourceType = "official" | "reference" | "meal_site" | "github";

export type DataType = "tafsir" | "nuzul" | "context" | "meal_comparison";

export type UsageClass = "primary" | "secondary" | "github_verified" | "helper";

export type ConfidenceLevel = "high" | "medium" | "low";

export type TafsirLevel = "surah" | "ayah_range";

export type MissingReason =
  | "source_unavailable"
  | "parser_gap"
  | "matching_gap"
  | "insufficient_data"
  | "not_applicable"
  // Kaynak mevcut ancak production runtime'dan bilinçli olarak çıkarıldı
  // (ör. yalnız Elmalılı meali yayınlanırken kaldırılan karşılaştırma mealleri).
  | "removed_from_runtime";

export interface SourceMetadata {
  sourceName: string;
  sourceType: SourceType;
  surahId: number | null;
  ayahStart: number | null;
  ayahEnd: number | null;
  retrievedAt: string;
  originalUrl: string | null;
  confidence: ConfidenceLevel;
  dataType: DataType;
  usageClass: UsageClass;
  license: string | null;
}

export interface MealComparisonEntry {
  sourceName: string;
  text: string | null;
  sourceUrl: string | null;
  status: AvailabilityStatus;
}

export interface SurahTafsirCacheEntry {
  surahId: number;
  level: "surah";
  text: string | null;
  source: string | null;
  sourceUrl: string | null;
  status: AvailabilityStatus;
  missingReason: MissingReason | null;
  sources: SourceMetadata[];
}

export interface AyahRangeTafsirCacheEntry {
  surahId: number;
  fromAyah: number;
  toAyah: number;
  level: TafsirLevel;
  text: string | null;
  source: string | null;
  sourceUrl: string | null;
  status: AvailabilityStatus;
  missingReason: MissingReason | null;
  sources: SourceMetadata[];
}

export interface SurahRevelationContextCacheEntry {
  surahId: number;
  revelationType: "mekki" | "medeni" | null;
  revelationOrder: number | null;
  summary: string | null;
  source: string | null;
  sourceUrl: string | null;
  status: AvailabilityStatus;
  missingReason: MissingReason | null;
  methodology: string[];
  sources: SourceMetadata[];
}

export interface AyahRevelationContextCacheEntry {
  surahId: number;
  fromAyah: number;
  toAyah: number;
  summary: string | null;
  source: string | null;
  sourceUrl: string | null;
  status: AvailabilityStatus;
  missingReason: MissingReason | null;
  methodology: string[];
  sources: SourceMetadata[];
}

export interface MealComparisonCacheEntry {
  surahId: number;
  ayahNumber: number;
  entries: MealComparisonEntry[];
  status: AvailabilityStatus;
  missingReason: MissingReason | null;
  sources: SourceMetadata[];
}

export interface FidelityCacheEntry {
  surahId: number;
  ayahNumber: number;
  status: AvailabilityStatus;
  missingReason: MissingReason | null;
  comparisons: MealComparisonEntry[];
  sources: SourceMetadata[];
}

export interface MissingMeaningReportEntry {
  surahId: number;
  ayahNumber: number;
  wordIndex: number;
  lemma: string | null;
  root: string | null;
  arabic: string | null;
  reason: MissingReason;
}

export interface CoverageReport {
  surahTafsirCount: number;
  surahContextCount: number;
  ayahRangeTafsirCount: number;
  mealComparisonAyahCount: number;
  fidelityReadyAyahCount: number;
  parserGapCount: number;
  matchingGapCount: number;
  sourceUnavailableCount: number;
}

export interface NormalizedTafsirRange {
  surahId: number;
  fromAyah: number;
  toAyah: number;
  level: TafsirLevel;
  text: string | null;
  source: string | null;
  status: AvailabilityStatus;
}

export interface NormalizationReport {
  arabicAyahCount: number;
  translationAyahCount: number;
  translationSourceCount: number;
  tafsirRangeCount: number;
  encodingFixCount: number;
  transliterationStatus: AvailabilityStatus;
  ayahLevelNuzulStatus: "missing";
}

export type EncodingIssueType =
  | "mojibake"
  | "replacement_character"
  | "control_character"
  | "arabic_latin_mix";

export interface EncodingAuditIssue {
  source: string;
  surahId: number | null;
  ayahNumber: number | null;
  issueType: EncodingIssueType;
  autoFixed: boolean;
  requiresManualReview: boolean;
  excerpt: string | null;
}

export interface EncodingAuditReport {
  generatedAt: string;
  filesScanned: string[];
  issueCount: number;
  issues: EncodingAuditIssue[];
}

export interface WordAnalysis {
  wordIndex: number;
  arabic: string | null;
  lemma?: string | null;
  transliteration: string | null;
  root: string | null;
  rootExplanation: Translation | null;
  rootExplanationStatus: AvailabilityStatus;
  rootExplanationMissingReason: MissingReason | null;
  morphology: WordRole | null;
  meaning: Translation | null;
  status: AvailabilityStatus;
}

export interface TafsirSummary {
  source: string | null;
  summary: string | null;
  sources: SourceMetadata[];
  status: AvailabilityStatus;
}

export interface RevelationContext {
  scope: ReferenceScope;
  source: string | null;
  summary: string | null;
  relatedSurahId: number | null;
  relatedAyahId: number | null;
  methodology: string[];
  sources: SourceMetadata[];
  status: AvailabilityStatus;
}

export interface FidelityAnalysis {
  source: string | null;
  level: FidelityLevel;
  notes: string[];
  comparisons: MealComparisonEntry[];
  sources: SourceMetadata[];
  status: AvailabilityStatus;
}

export interface AyahAnalysisEngineV1 {
  verseKey: string;
  summary: string | null;
  participants: {
    speaker: string | null;
    addressee: string | null;
    mentioned: string[];
  };
  themes: string[];
  source: string;
}

export interface AyahDetailPayload {
  surah: Surah | null;
  ayah: Ayah;
  translations: Translation[];
  wordAnalyses: WordAnalysis[];
  tafsirSummary: TafsirSummary | null;
  revelationContext: RevelationContext | null;
  fidelityAnalysis: FidelityAnalysis | null;
  status: AvailabilityStatus;
}
