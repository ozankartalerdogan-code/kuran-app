import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FidelityAnalysis,
  MealComparisonEntry,
  RevelationContext,
  TafsirSummary,
  Translation,
  WordRole
} from "@quran-app/types";
import { getCanonicalWordAnalysesAsLegacy, loadRootExplanationsV2Map } from "../adapters/canonicalWordAnalysisAdapter";
import { getMorphologyForAyah } from "../adapters/kuranSorguMorphologyAdapter";
import { getFidelityAnalysis } from "../adapters/fidelityAdapter";
import { getMealComparison } from "../adapters/external/mealComparisonAdapter";
import { readAyahFromLocalData } from "../adapters/quranAdapter";
import { getRevelationContext } from "../adapters/revelationContextAdapter";
import { readJsonFile, dbAll, dbGet } from "../adapters/shared";
import { getTafsirSummary } from "../adapters/tafsirAdapter";
import { getAyahAnalysisEngine } from "./analysisEngineV1";
import {
  readVerseAnalysisContextFromCoreDb,
  type CoreDbFidelitySignal,
  type CoreDbVerseSourceResult,
  type CoreDbVerseWord
} from "./coreDbVerseSource";
import { buildVerseAnalysisSignals } from "./verseAnalysisSignals";
import { getAppDb } from "../adapters/appDb";

interface CanonicalWordAnalysisEntry {
  position: number;
  arabic: string;
  lemma: string;
  root: string;
  pos: string;
  role: string;
  morphology: string;
  meaning_tr: string;
  root_explanation_tr: string;
  gloss_en: string;
  confidence?: string;
  source_gloss?: string;
  sources: Partial<Record<CanonicalWordAnalysisField, string>>;
  missing_fields: string[];
}

type CanonicalWordAnalysisField =
  | "arabic"
  | "lemma"
  | "root"
  | "pos"
  | "role"
  | "morphology"
  | "meaning_tr"
  | "root_explanation_tr"
  | "gloss_en";

type CanonicalWordAnalysisIndex = Record<string, CanonicalWordAnalysisEntry[]>;

interface CoverageReportEntry {
  surahId: number;
  ayahNumber: number;
  totalWords: number;
  matchedWords: number;
  coverageRatio: number;
  hasMorphology: boolean;
}

interface MissingMeaningEntry {
  surahId: number;
  ayahNumber: number;
  wordIndex: number;
  lemma: string | null;
  root: string | null;
  arabic: string | null;
  reason: string;
}

export interface VerseAnalysisWordEntry {
  wordIndex: number;
  arabic: string | null;
  meaning: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  role: WordRole | string | null;
  morphology: string | null;
  glossEn: string | null;
  confidence?: string | null;
  meaningSource?: string | null;
  sourceGloss?: string | null;
  rootMeaning: string | null;
  missingFields: string[];
}

export interface VerseAnalysisTranslationComparison {
  source: string | null;
  availableTranslations: Array<{
    source: string;
    text: string;
  }>;
  comparisonCount: number;
  commonPhrases: string[];
  divergentPhrases: string[];
  divergenceScore: number | null;
}

export interface VerseAnalysisFidelitySignals {
  source: string | null;
  level: FidelityAnalysis["level"] | null;
  coverageRatio: number | null;
  weakOrMissingCorrespondences: Array<{
    wordIndex: number;
    lemma: string | null;
    root: string | null;
    arabic: string | null;
    reason: string;
  }>;
  coveredTerms: string[];
  riskNotes: string[];
}

export interface VerseAnalysisSourceStatus {
  key: string;
  status: "available" | "missing" | "partial";
  detail?: string;
}

export interface VerseAnalysisContext {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  arabicText: string | null;
  primaryTranslation: Translation | null;
  translations: Translation[];
  wordByWord: VerseAnalysisWordEntry[];
  roots: string[];
  lemmas: string[];
  morphology: string[];
  rootMeanings: string[];
  translationComparison: VerseAnalysisTranslationComparison;
  fidelitySignals: VerseAnalysisFidelitySignals;
  keyTerms: string[];
  deterministicNotes: string[];
  signalDebug: {
    suppressedLowConfidenceTerms: string[];
    suppressedLowUsefulnessTerms: string[];
    recoveredCoreTerms: string[];
    suppressedNoisyPhrases: string[];
  };
  contextNuzul: RevelationContext | null;
  tafsirNotes: string[];
  aiMeaningSummary: string | null;
  themesConcepts: string[];
  availableSources: string[];
  missingSources: string[];
  debugSources: VerseAnalysisSourceStatus[];
}

export interface BuildVerseAnalysisContextOptions {
  source?: "json" | "coreDb" | "v2" | "v3" | "v4";
  useRootExplanationsV2?: boolean;
  debug?: {
    includeCoverageReport?: boolean;
  };
}

interface VerseAnalysisBaseData {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  arabicText: string | null;
  primaryTranslation: Translation | null;
  translations: Translation[];
  wordByWord: VerseAnalysisWordEntry[];
  roots: string[];
  lemmas: string[];
  morphology: string[];
  rootMeanings: string[];
  translationComparisonBase: VerseAnalysisTranslationComparison;
  fidelitySignalsBase: VerseAnalysisFidelitySignals;
  contextNuzul: RevelationContext | null;
  tafsirNotes: string[];
  aiMeaningSummary: string | null;
  debugSources: VerseAnalysisSourceStatus[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(currentDirectory, "../../../../data");
const data2Directory = path.resolve(currentDirectory, "../../../../data2");

function loadAiMeaningSummary(verseKey: string): string | null {
  const row = dbGet<{ text: string }>(
    getAppDb().prepare("SELECT text FROM context_notes WHERE verse_key = ? AND type = 'ai_meaning_summary'"),
    verseKey
  );
  return row?.text ?? null;
}

const canonicalWordAnalysisV2Path = path.join(
  data2Directory,
  "processed",
  "canonical_word_analysis_v2.json"
);
const canonicalWordAnalysisV3Path = path.join(
  data2Directory,
  "processed",
  "canonical_word_analysis_v3.json"
);
const canonicalWordAnalysisV4Path = path.join(
  data2Directory,
  "processed",
  "canonical_word_analysis_v4.json"
);

// v2/v3/v4 sadece debug/audit modunda kullanılır — lazy load
let canonicalWordAnalysisV2IndexPromise: Promise<CanonicalWordAnalysisIndex> | null = null;
let canonicalWordAnalysisV3IndexPromise: Promise<CanonicalWordAnalysisIndex> | null = null;
let canonicalWordAnalysisV4IndexPromise: Promise<CanonicalWordAnalysisIndex> | null = null;

function loadCanonicalV2(): Promise<CanonicalWordAnalysisIndex> {
  canonicalWordAnalysisV2IndexPromise ??= readFile(canonicalWordAnalysisV2Path, "utf8").then(
    (content) => JSON.parse(content) as CanonicalWordAnalysisIndex
  );
  return canonicalWordAnalysisV2IndexPromise;
}

function loadCanonicalV3(): Promise<CanonicalWordAnalysisIndex> {
  canonicalWordAnalysisV3IndexPromise ??= readFile(canonicalWordAnalysisV3Path, "utf8").then(
    (content) => JSON.parse(content) as CanonicalWordAnalysisIndex
  );
  return canonicalWordAnalysisV3IndexPromise;
}

function loadCanonicalV4(): Promise<CanonicalWordAnalysisIndex> {
  canonicalWordAnalysisV4IndexPromise ??= readFile(canonicalWordAnalysisV4Path, "utf8").then(
    (content) => JSON.parse(content) as CanonicalWordAnalysisIndex
  );
  return canonicalWordAnalysisV4IndexPromise;
}

interface WordRow {
  word_index: number;
  arabic: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  role: string | null;
  morphology: string | null;
  meaning_tr: string | null;
  gloss_en: string | null;
  confidence: string | null;
  source: string | null;
}

function loadCanonicalWordAnalysisFromDb(surahId: number, ayahNumber: number): CanonicalWordAnalysisEntry[] {
  const rows = dbAll<WordRow>(
    getAppDb().prepare(
      `SELECT word_index, arabic, root, lemma, pos, role, morphology,
              meaning_tr, gloss_en, confidence, source
       FROM words WHERE verse_key = ? ORDER BY word_index ASC`
    ),
    `${surahId}:${ayahNumber}`
  );

  return rows.map((row): CanonicalWordAnalysisEntry => ({
    position: row.word_index,
    arabic: row.arabic ?? "",
    lemma: row.lemma ?? "",
    root: row.root ?? "",
    pos: row.pos ?? "",
    role: row.role ?? "",
    morphology: row.morphology ?? "",
    meaning_tr: row.meaning_tr ?? "",
    root_explanation_tr: "",
    gloss_en: row.gloss_en ?? "",
    confidence: row.confidence ?? undefined,
    sources: { meaning_tr: row.source ?? undefined },
    missing_fields: []
  }));
}
const coverageReportIndexPromise: Promise<Map<string, CoverageReportEntry>> = readJsonFile<
  CoverageReportEntry[]
>("word-analysis", "reports", "coverage-by-ayah.json").then(
  (entries) => new Map(entries.map((entry) => [`${entry.surahId}:${entry.ayahNumber}`, entry]))
);
const missingMeaningIndexPromise: Promise<Map<string, MissingMeaningEntry[]>> = readJsonFile<
  MissingMeaningEntry[]
>("word-analysis", "reports", "missing-meanings.json").then((entries) => {
  const index = new Map<string, MissingMeaningEntry[]>();

  for (const entry of entries) {
    const key = `${entry.surahId}:${entry.ayahNumber}`;
    index.set(key, [...(index.get(key) ?? []), entry]);
  }

  return index;
});

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0)
    )
  );
}

function selectPrimaryTranslation(translations: Translation[]): Translation | null {
  const diyanet = translations.find((translation) => translation.source?.endsWith("#diyanet") || translation.source === "diyanet");
  return diyanet ?? translations[0] ?? null;
}

function deriveRiskNotes(
  fidelityAnalysis: FidelityAnalysis | null,
  coverageEntry: CoverageReportEntry | null,
  missingEntries: MissingMeaningEntry[]
): string[] {
  const notes: string[] = [];

  if (fidelityAnalysis === null) {
    notes.push("fidelity_analysis_missing");
  } else if (fidelityAnalysis.status !== "available") {
    notes.push(`fidelity_status:${fidelityAnalysis.status}`);
  }

  if (coverageEntry === null) {
    notes.push("word_coverage_missing");
  } else {
    if (coverageEntry.coverageRatio < 1) {
      notes.push(`word_coverage_ratio:${coverageEntry.coverageRatio.toFixed(3)}`);
    }

    if (!coverageEntry.hasMorphology) {
      notes.push("morphology_missing");
    }
  }

  if (missingEntries.length > 0) {
    notes.push(`missing_meanings:${missingEntries.length}`);
  }

  return notes;
}

function summarizeTafsir(tafsirSummary: TafsirSummary | null): string[] {
  const summary = tafsirSummary?.summary?.trim() ?? "";
  return summary ? [summary] : [];
}

function buildJsonSourceStatuses(input: {
  canonicalSourceKey?: string;
  canonicalWords: CanonicalWordAnalysisEntry[];
  legacyWordsAvailable: boolean;
  mealComparison: FidelityAnalysis | null;
  fidelityAnalysis: FidelityAnalysis | null;
  contextNuzul: RevelationContext | null;
  tafsirSummary: TafsirSummary | null;
  coverageEntry: CoverageReportEntry | null;
  missingEntries: MissingMeaningEntry[];
  themes: string[];
  includeCoverageReportDebug?: boolean;
}): VerseAnalysisSourceStatus[] {
  return [
    {
      key: input.canonicalSourceKey ?? "canonical_word_analysis",
      status: input.canonicalWords.length > 0 ? "available" : "missing"
    },
    {
      key: "legacy_word_analysis_projection",
      status: input.legacyWordsAvailable ? "available" : "missing"
    },
    {
      key: "meal_comparison",
      status:
        input.mealComparison === null
          ? "missing"
          : input.mealComparison.status === "available"
            ? "available"
            : "partial",
      detail: input.mealComparison?.status ?? "missing"
    },
    {
      key: "fidelity_analysis",
      status:
        input.fidelityAnalysis === null
          ? "missing"
          : input.fidelityAnalysis.status === "available"
            ? "available"
            : "partial",
      detail: input.fidelityAnalysis?.status ?? "missing"
    },
    {
      key: "revelation_context",
      status: input.contextNuzul?.status === "available" ? "available" : "missing",
      detail: input.contextNuzul?.scope ?? undefined
    },
    {
      key: "tafsir_summary",
      status: input.tafsirSummary?.status === "available" ? "available" : "missing"
    },
    {
      key: "word_coverage_report",
      status: input.coverageEntry === null ? "missing" : "available",
      detail:
        input.includeCoverageReportDebug && input.coverageEntry !== null
          ? `coverageRatio=${input.coverageEntry.coverageRatio.toFixed(3)};matchedWords=${input.coverageEntry.matchedWords}/${input.coverageEntry.totalWords};hasMorphology=${input.coverageEntry.hasMorphology}`
          : undefined
    },
    {
      key: "missing_meaning_report",
      status: input.missingEntries.length > 0 ? "partial" : "available",
      detail: `${input.missingEntries.length}`
    },
    {
      key: "analysis_engine_themes",
      status: input.themes.length > 0 ? "available" : "missing"
    }
  ];
}

function buildCoreDbSourceStatuses(input: {
  dbSource: CoreDbVerseSourceResult;
  themes: string[];
}): VerseAnalysisSourceStatus[] {
  const statuses: VerseAnalysisSourceStatus[] = [
    {
      key: "core_db",
      status: "available",
      detail: input.dbSource.sourceStatus.dbPath
    },
    {
      key: "translations",
      status: input.dbSource.translations.length > 0 ? "available" : "missing"
    },
    {
      key: "core_db_words",
      status: input.dbSource.words.length > 0 ? "available" : "missing"
    },
    {
      key: "translation_comparison",
      status: input.dbSource.translationComparison.length > 0 ? "available" : "missing"
    },
    {
      key: "fidelity_signals",
      status: input.dbSource.fidelitySignals.length > 0 ? "available" : "missing"
    },
    {
      key: "context_notes",
      status: input.dbSource.contextNotes.length > 0 ? "available" : "missing"
    },
    {
      key: "analysis_engine_themes",
      status: input.themes.length > 0 ? "available" : "missing"
    }
  ];

  if (!input.dbSource.contextNotes.some((note) => note.type === "tafsir_note")) {
    statuses.push({ key: "tafsir_summary", status: "missing" });
  }

  return statuses;
}

function extractAvailableSources(statuses: VerseAnalysisSourceStatus[]): string[] {
  return statuses.filter((status) => status.status === "available").map((status) => status.key);
}

function extractMissingSources(statuses: VerseAnalysisSourceStatus[]): string[] {
  return statuses.filter((status) => status.status !== "available").map((status) => status.key);
}

function buildTranslationComparison(
  mealComparison: FidelityAnalysis | null
): VerseAnalysisTranslationComparison {
  const availableTranslations =
    mealComparison?.comparisons
      .filter((entry): entry is MealComparisonEntry & { text: string } => typeof entry.text === "string")
      .map((entry) => ({
        source: entry.sourceName,
        text: entry.text
      })) ?? [];

  return {
    source: mealComparison?.source ?? null,
    availableTranslations,
    comparisonCount: availableTranslations.length,
    commonPhrases: [],
    divergentPhrases: [],
    divergenceScore: null
  };
}

async function loadCanonicalWordAnalysis(
  surahId: number,
  ayahNumber: number,
  source: "json" | "v2" | "v3" | "v4" = "json"
): Promise<CanonicalWordAnalysisEntry[]> {
  if (source === "json") {
    return loadCanonicalWordAnalysisFromDb(surahId, ayahNumber);
  }
  const index = await (source === "v4"
    ? loadCanonicalV4()
    : source === "v3"
      ? loadCanonicalV3()
      : loadCanonicalV2());
  return index[`${surahId}:${ayahNumber}`] ?? [];
}

async function loadCoverageEntry(
  surahId: number,
  ayahNumber: number
): Promise<CoverageReportEntry | null> {
  const index = await coverageReportIndexPromise;
  return index.get(`${surahId}:${ayahNumber}`) ?? null;
}

async function loadMissingMeaningEntries(
  surahId: number,
  ayahNumber: number
): Promise<MissingMeaningEntry[]> {
  const index = await missingMeaningIndexPromise;
  return index.get(`${surahId}:${ayahNumber}`) ?? [];
}

function mapCanonicalWordToContextEntry(
  word: CanonicalWordAnalysisEntry
): VerseAnalysisWordEntry {
  const derivedConfidence =
    word.confidence ??
    (word.meaning_tr && !word.missing_fields.includes("meaning_tr")
      ? "medium"
      : word.gloss_en
        ? "low-enriched"
        : "missing");

  return {
    wordIndex: word.position,
    arabic: word.arabic || null,
    meaning: word.meaning_tr || null,
    root: word.root || null,
    lemma: word.lemma || null,
    pos: word.pos || null,
    role: word.role || null,
    morphology: word.morphology || null,
    glossEn: word.gloss_en || null,
    confidence: derivedConfidence,
    meaningSource: word.sources?.meaning_tr ?? null,
    sourceGloss: word.source_gloss ?? null,
    rootMeaning: word.root_explanation_tr || null,
    missingFields: [...word.missing_fields]
  };
}

function mapCoreDbWordToContextEntry(word: CoreDbVerseWord, rootMeaning: string | null): VerseAnalysisWordEntry {
  return {
    wordIndex: word.wordIndex,
    arabic: word.arabic,
    meaning: word.meaningTr,
    root: word.root,
    lemma: word.lemma,
    pos: word.pos,
    role: null,
    morphology: word.morphology,
    glossEn: word.glossEn,
    confidence: null,
    meaningSource: null,
    sourceGloss: null,
    rootMeaning,
    missingFields: []
  };
}

function toTranslation(source: string | null, text: string | null): Translation {
  return {
    language: "tr",
    source,
    text,
    status: text ? "available" : "missing"
  };
}

function mapCoreDbWeakSignals(signals: CoreDbFidelitySignal[]): VerseAnalysisFidelitySignals["weakOrMissingCorrespondences"] {
  return signals
    .filter((signal) => signal.signalType === "missing_meaning")
    .map((signal) => ({
      wordIndex: signal.wordIndex ?? 0,
      lemma: signal.lemma,
      root: signal.root,
      arabic: null,
      reason: signal.note ?? signal.signalType
    }));
}

function extractCoverageRatio(signals: CoreDbFidelitySignal[]): number | null {
  const coverage = signals.find((signal) => signal.signalType === "coverage_ratio");
  if (!coverage?.note) {
    return null;
  }

  const match = coverage.note.match(/coverage_ratio=([0-9.]+)/u);
  return match ? Number(match[1]) : null;
}

function buildCoreDbBaseData(
  surahId: number,
  ayahNumber: number,
  dbSource: CoreDbVerseSourceResult,
  themesConcepts: string[]
): VerseAnalysisBaseData {
  const rootMeaningMap = new Map<string, string>();
  for (const rootMeaning of dbSource.rootMeanings) {
    if (rootMeaning.root && rootMeaning.meaningTr && !rootMeaningMap.has(rootMeaning.root)) {
      rootMeaningMap.set(rootMeaning.root, rootMeaning.meaningTr);
    }
  }

  const translations = dbSource.translations.map((translation) => toTranslation(translation.source, translation.text));
  const wordByWord = dbSource.words.map((word) => mapCoreDbWordToContextEntry(word, word.root ? rootMeaningMap.get(word.root) ?? null : null));
  const weakOrMissingCorrespondences = mapCoreDbWeakSignals(dbSource.fidelitySignals);
  const coveredTerms = uniqueNonEmpty(
    wordByWord
      .filter((word) => word.meaning !== null)
      .flatMap((word) => [word.lemma, word.root, word.arabic])
  );
  const translationComparisonBase: VerseAnalysisTranslationComparison = {
    source: "core_db",
    availableTranslations: dbSource.translations.map((translation) => ({
      source: translation.source,
      text: translation.text
    })),
    comparisonCount: dbSource.translationComparison.length,
    commonPhrases: [],
    divergentPhrases: [],
    divergenceScore: null
  };
  const contextNuzulNote = dbSource.contextNotes.find((note) => note.type === "revelation_context");
  const contextNuzul: RevelationContext | null = contextNuzulNote
    ? {
        scope: "surah",
        source: contextNuzulNote.source,
        summary: contextNuzulNote.text,
        relatedSurahId: surahId,
        relatedAyahId: null,
        methodology: [],
        sources: [],
        status: "available"
      }
    : null;
  const tafsirNotes = dbSource.contextNotes
    .filter((note) => note.type === "tafsir_note")
    .map((note) => note.text)
    .filter((text, index, array) => array.indexOf(text) === index);
  const fidelitySignalsBase: VerseAnalysisFidelitySignals = {
    source: "core_db",
    level: null,
    coverageRatio: extractCoverageRatio(dbSource.fidelitySignals),
    weakOrMissingCorrespondences,
    coveredTerms,
    riskNotes: uniqueNonEmpty(dbSource.fidelitySignals.map((signal) => signal.note))
  };
  const debugSources = buildCoreDbSourceStatuses({
    dbSource,
    themes: themesConcepts
  });

  return {
    verseKey: dbSource.verseKey,
    surahId,
    ayahNumber,
    arabicText: dbSource.arabicText,
    primaryTranslation: selectPrimaryTranslation(translations) ?? toTranslation(null, dbSource.primaryTranslation),
    translations,
    wordByWord,
    roots: dbSource.roots,
    lemmas: dbSource.lemmas,
    morphology: dbSource.morphology,
    rootMeanings: uniqueNonEmpty(dbSource.rootMeanings.map((item) => item.meaningTr)),
    translationComparisonBase,
    fidelitySignalsBase,
    contextNuzul,
    tafsirNotes,
    aiMeaningSummary: loadAiMeaningSummary(dbSource.verseKey),
    debugSources
  };
}

async function buildJsonBaseData(
  surahId: number,
  ayahNumber: number,
  verseKey: string,
  themesConcepts: string[],
  source: "json" | "v2" | "v3" | "v4" = "json",
  options: BuildVerseAnalysisContextOptions = {}
): Promise<VerseAnalysisBaseData> {
  const [
    ayah,
    legacyWords,
    canonicalWords,
    mealComparison,
    fidelityAnalysis,
    contextNuzul,
    tafsirSummary,
    coverageEntry,
    missingEntries
  ] = await Promise.all([
    readAyahFromLocalData(surahId, ayahNumber),
    getCanonicalWordAnalysesAsLegacy(surahId, ayahNumber),
    loadCanonicalWordAnalysis(surahId, ayahNumber, source),
    getMealComparison(surahId, ayahNumber),
    getFidelityAnalysis(surahId, ayahNumber),
    getRevelationContext(surahId, ayahNumber),
    getTafsirSummary(surahId, ayahNumber),
    loadCoverageEntry(surahId, ayahNumber),
    loadMissingMeaningEntries(surahId, ayahNumber)
  ]);

  const primaryTranslation = selectPrimaryTranslation(ayah.translations);
  let wordByWord = canonicalWords.map(mapCanonicalWordToContextEntry);

  // Fallback: kök bilgisi canonical'da eksikse kuran.db morfoloji tablosundan al
  const morphFallback = getMorphologyForAyah(surahId, ayahNumber);

  if (morphFallback.length > 0) {
    const morphByIndex = new Map(morphFallback.map((m) => [m.wordIndex, m]));
    wordByWord = wordByWord.map((entry) => {
      if (entry.root !== null && entry.lemma !== null) {
        return entry;
      }
      const morph = morphByIndex.get(entry.wordIndex);
      if (!morph) return entry;
      return {
        ...entry,
        root: entry.root ?? morph.root,
        lemma: entry.lemma ?? morph.lemma
      };
    });
  }

  if (options.useRootExplanationsV2 === true) {
    const rootV2Map = await loadRootExplanationsV2Map();
    wordByWord = wordByWord.map((entry) => {
      if (entry.rootMeaning !== null || entry.root === null) {
        return entry;
      }
      const v2Meaning = rootV2Map.get(entry.root) ?? null;
      return v2Meaning !== null ? { ...entry, rootMeaning: v2Meaning } : entry;
    });
  }

  const roots = uniqueNonEmpty(wordByWord.map((word) => word.root));
  const lemmas = uniqueNonEmpty(wordByWord.map((word) => word.lemma));
  const morphology = uniqueNonEmpty(wordByWord.map((word) => word.morphology));
  const rootMeanings = uniqueNonEmpty(wordByWord.map((word) => word.rootMeaning));
  const translationComparisonBase = buildTranslationComparison(mealComparison);
  const fidelitySignalsBase: VerseAnalysisFidelitySignals = {
    source: fidelityAnalysis?.source ?? null,
    level: fidelityAnalysis?.level ?? null,
    coverageRatio: coverageEntry?.coverageRatio ?? null,
    weakOrMissingCorrespondences: missingEntries.map((entry) => ({
      wordIndex: entry.wordIndex,
      lemma: entry.lemma,
      root: entry.root,
      arabic: entry.arabic,
      reason: entry.reason
    })),
    coveredTerms: uniqueNonEmpty(
      wordByWord
        .filter((word) => word.meaning !== null)
        .flatMap((word) => [word.lemma, word.root, word.arabic])
    ),
    riskNotes: deriveRiskNotes(fidelityAnalysis, coverageEntry, missingEntries)
  };
  const debugSources = buildJsonSourceStatuses({
    canonicalSourceKey:
      source === "v4"
        ? "canonical_word_analysis_v4"
        : source === "v3"
        ? "canonical_word_analysis_v3"
        : source === "v2"
          ? "canonical_word_analysis_v2"
          : "canonical_word_analysis",
    canonicalWords,
    legacyWordsAvailable: legacyWords.length > 0,
    mealComparison,
    fidelityAnalysis,
    contextNuzul,
    tafsirSummary,
    coverageEntry,
    missingEntries,
    themes: themesConcepts,
    includeCoverageReportDebug: options.debug?.includeCoverageReport === true
  });

  return {
    verseKey,
    surahId,
    ayahNumber,
    arabicText: ayah.arabicText,
    primaryTranslation,
    translations: ayah.translations,
    wordByWord,
    roots,
    lemmas,
    morphology,
    rootMeanings,
    translationComparisonBase,
    fidelitySignalsBase,
    contextNuzul,
    tafsirNotes: summarizeTafsir(tafsirSummary),
    aiMeaningSummary: loadAiMeaningSummary(verseKey),
    debugSources
  };
}

function finalizeContext(baseData: VerseAnalysisBaseData, themesConcepts: string[]): VerseAnalysisContext {
  const signals = buildVerseAnalysisSignals({
    wordByWord: baseData.wordByWord,
    translationComparison: baseData.translationComparisonBase,
    fidelitySignals: baseData.fidelitySignalsBase
  });
  const translationComparison = {
    ...baseData.translationComparisonBase,
    commonPhrases: signals.commonPhrases,
    divergentPhrases: signals.divergentPhrases
  };
  const fidelitySignals: VerseAnalysisFidelitySignals = {
    ...baseData.fidelitySignalsBase,
    coveredTerms: signals.coveredTerms
  };

  return {
    verseKey: baseData.verseKey,
    surahId: baseData.surahId,
    ayahNumber: baseData.ayahNumber,
    arabicText: baseData.arabicText,
    primaryTranslation: baseData.primaryTranslation,
    translations: baseData.translations,
    wordByWord: baseData.wordByWord,
    roots: baseData.roots,
    lemmas: baseData.lemmas,
    morphology: baseData.morphology,
    rootMeanings: baseData.rootMeanings,
    translationComparison,
    fidelitySignals,
    keyTerms: signals.keyTerms,
    deterministicNotes: signals.deterministicNotes,
    signalDebug: {
      suppressedLowConfidenceTerms: signals.suppressedLowConfidenceTerms,
      suppressedLowUsefulnessTerms: signals.suppressedLowUsefulnessTerms,
      recoveredCoreTerms: signals.recoveredCoreTerms,
      suppressedNoisyPhrases: signals.suppressedNoisyPhrases
    },
    contextNuzul: baseData.contextNuzul,
    tafsirNotes: baseData.tafsirNotes,
    aiMeaningSummary: baseData.aiMeaningSummary,
    themesConcepts,
    availableSources: extractAvailableSources(baseData.debugSources),
    missingSources: extractMissingSources(baseData.debugSources),
    debugSources: baseData.debugSources
  };
}

export async function buildVerseAnalysisContext(
  surahId: number,
  ayahNumber: number,
  options: BuildVerseAnalysisContextOptions = {}
): Promise<VerseAnalysisContext> {
  const verseKey = `${surahId}:${ayahNumber}`;
  const source = options.source ?? "json";
  const analysis = await getAyahAnalysisEngine(verseKey);
  const themesConcepts = analysis?.themes ?? [];

  if (source === "coreDb") {
    const dbSource = readVerseAnalysisContextFromCoreDb(verseKey);

    if (!dbSource) {
      const fallback = await buildJsonBaseData(surahId, ayahNumber, verseKey, themesConcepts);
      fallback.debugSources.push({
        key: "core_db",
        status: "missing",
        detail: "verse_not_found"
      });
      return finalizeContext(fallback, themesConcepts);
    }

    return finalizeContext(buildCoreDbBaseData(surahId, ayahNumber, dbSource, themesConcepts), themesConcepts);
  }

  return finalizeContext(
    await buildJsonBaseData(surahId, ayahNumber, verseKey, themesConcepts, source, options),
    themesConcepts
  );
}

export const verseAnalysisContextDataSources = {
  normalizedDataDirectory: path.join(dataDirectory, "normalized"),
  canonicalWordAnalysis: "data/app.db#words",
  canonicalWordAnalysisV2: "data2/processed/canonical_word_analysis_v2.json",
  canonicalWordAnalysisV3: "data2/processed/canonical_word_analysis_v3.json",
  canonicalWordAnalysisV4: "data2/processed/canonical_word_analysis_v4.json",
  rootExplanationsV2: "data2/processed/root_explanations_tr_v2_easy_only.json",
  coverageReport: "data/word-analysis/reports/coverage-by-ayah.json",
  missingMeaningsReport: "data/word-analysis/reports/missing-meanings.json",
  mealComparisonDirectory: "data/meal-comparison/by-surah",
  fidelityCache: "data/fidelity/by-surah/index.json",
  revelationContext: "data/revelation-context/surah/index.json",
  coreDb: "data/kuran_core.db"
} as const;
