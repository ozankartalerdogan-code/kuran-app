import type { MissingReason, WordRole } from "@quran-app/types";
import {
  normalizeLookupKey,
  readCachedFile,
  repairText,
  repairTextDetailed
} from "./shared";

export interface WordTranslationDictionaryFile {
  translations: Record<string, string>;
  rootMeanings?: Record<string, string>;
}

export interface WordMeaningLookup {
  translations: Map<string, string>;
  rootMeanings: Map<string, string>;
}

export interface RootExplanationLookup {
  rootExplanations: Map<string, string>;
}

export type WordMeaningMatchStrategy = "lemma" | "root" | "arabic" | "unmatched";

export interface WordMeaningMatchResult {
  text: string | null;
  strategy: WordMeaningMatchStrategy;
}

export interface ParsedMorphologyEntry {
  surahId: number;
  ayahNumber: number;
  wordIndex: number;
  arabic: string | null;
  lemma: string | null;
  root: string | null;
  role: WordRole | null;
}

function toWordRole(pos: string, features: string[]): WordRole | null {
  if (pos === "V") {
    return "verb";
  }

  if (pos === "P") {
    return "particle";
  }

  if (pos !== "N") {
    return "unknown";
  }

  if (features.includes("PRON") || features.includes("REL")) {
    return "pronoun";
  }

  if (features.includes("ADJ")) {
    return "adjective";
  }

  if (features.includes("ADV")) {
    return "adverb";
  }

  return "noun";
}

function addLookupVariants(map: Map<string, string>, rawKey: string, rawValue: string): void {
  const repairedKey = repairText(rawKey);
  const repairedValue = repairTextDetailed(rawValue).text;

  if (repairedKey === null || repairedValue === null) {
    return;
  }

  const normalizedKey = normalizeLookupKey(repairedKey);

  if (normalizedKey !== null && !map.has(normalizedKey)) {
    map.set(normalizedKey, repairedValue);
  }
}

export function parseMorphologyEntry(line: string): ParsedMorphologyEntry | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const [location, arabicToken, pos, rawFeatures] = trimmed.split("\t");

  if (!location || !arabicToken || !pos || !rawFeatures) {
    return null;
  }

  const locationParts = location.split(":");

  if (locationParts.length < 4) {
    return null;
  }

  const surahId = Number(locationParts[0]);
  const ayahNumber = Number(locationParts[1]);
  const wordIndex = Number(locationParts[2]);

  if (!Number.isFinite(surahId) || !Number.isFinite(ayahNumber) || !Number.isFinite(wordIndex)) {
    return null;
  }

  const features = rawFeatures.split("|");
  const lemma = features.find((feature) => feature.startsWith("LEM:"))?.slice(4) ?? null;
  const root = features.find((feature) => feature.startsWith("ROOT:"))?.slice(5) ?? null;

  return {
    surahId,
    ayahNumber,
    wordIndex,
    arabic: repairText(arabicToken),
    lemma: repairText(lemma),
    root: repairText(root),
    role: toWordRole(pos, features)
  };
}

export function buildWordMeaningLookup(dictionary: WordTranslationDictionaryFile): WordMeaningLookup {
  const translations = new Map<string, string>();
  const rootMeanings = new Map<string, string>();

  for (const [key, value] of Object.entries(dictionary.translations)) {
    addLookupVariants(translations, key, value);
  }

  for (const [key, value] of Object.entries(dictionary.rootMeanings ?? {})) {
    addLookupVariants(rootMeanings, key, value);
  }

  return {
    translations,
    rootMeanings
  };
}

export function buildRootExplanationLookup(dictionary: Record<string, string>): RootExplanationLookup {
  const rootExplanations = new Map<string, string>();

  for (const [key, value] of Object.entries(dictionary)) {
    addLookupVariants(rootExplanations, key, value);
  }

  return {
    rootExplanations
  };
}

export function matchWordMeaning(
  lookup: WordMeaningLookup,
  entry: Pick<ParsedMorphologyEntry, "lemma" | "root" | "arabic">
): WordMeaningMatchResult {
  const normalizedLemma = normalizeLookupKey(entry.lemma);
  const normalizedRoot = normalizeLookupKey(entry.root);
  const normalizedArabic = normalizeLookupKey(entry.arabic);

  const lemmaMatch =
    (normalizedLemma ? lookup.translations.get(normalizedLemma) : undefined) ??
    (normalizedLemma ? lookup.rootMeanings.get(normalizedLemma) : undefined);

  if (lemmaMatch) {
    return {
      text: lemmaMatch,
      strategy: "lemma"
    };
  }

  const rootMatch =
    (normalizedRoot ? lookup.rootMeanings.get(normalizedRoot) : undefined) ??
    (normalizedRoot ? lookup.translations.get(normalizedRoot) : undefined);

  if (rootMatch) {
    return {
      text: rootMatch,
      strategy: "root"
    };
  }

  const arabicMatch =
    (normalizedArabic ? lookup.translations.get(normalizedArabic) : undefined) ??
    (normalizedArabic ? lookup.rootMeanings.get(normalizedArabic) : undefined);

  if (arabicMatch) {
    return {
      text: arabicMatch,
      strategy: "arabic"
    };
  }

  return {
    text: null,
    strategy: "unmatched"
  };
}

export function getMissingMeaningReason(
  entry: Pick<ParsedMorphologyEntry, "lemma" | "root" | "arabic">
): MissingReason {
  if (entry.lemma !== null || entry.root !== null || entry.arabic !== null) {
    return "matching_gap";
  }

  return "source_unavailable";
}

export function matchRootExplanation(
  lookup: RootExplanationLookup,
  root: string | null
): WordMeaningMatchResult {
  const normalizedRoot = normalizeLookupKey(root);
  const rootMatch = normalizedRoot ? lookup.rootExplanations.get(normalizedRoot) : undefined;

  if (rootMatch) {
    return {
      text: rootMatch,
      strategy: "root"
    };
  }

  return {
    text: null,
    strategy: "unmatched"
  };
}

const wordTranslationLookupPromise: Promise<WordMeaningLookup> = readCachedFile(
  "word-analysis",
  "word-translations-tr.json"
)
  .then((content) => JSON.parse(content) as WordTranslationDictionaryFile)
  .then(buildWordMeaningLookup);

export async function loadWordMeaningLookup(): Promise<WordMeaningLookup> {
  return wordTranslationLookupPromise;
}

const rootExplanationLookupPromise: Promise<RootExplanationLookup> = readCachedFile(
  "word-analysis",
  "extended-roots.json"
)
  .then((content) => JSON.parse(content) as Record<string, string>)
  .then(buildRootExplanationLookup);

export async function loadRootExplanationLookup(): Promise<RootExplanationLookup> {
  return rootExplanationLookupPromise;
}
