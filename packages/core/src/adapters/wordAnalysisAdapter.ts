import type { Translation, WordAnalysis } from "@quran-app/types";
import { getRelativeDataPath, readCachedFile, repairText } from "./shared";
import {
  loadRootExplanationLookup,
  loadWordMeaningLookup,
  matchRootExplanation,
  matchWordMeaning,
  parseMorphologyEntry,
  type ParsedMorphologyEntry
} from "./wordAnalysisShared";

const morphologySource = getRelativeDataPath("word-analysis", "quran-morphology.txt");
const wordTranslationSource = getRelativeDataPath("word-analysis", "word-translations-tr.json");
const rootSource = getRelativeDataPath("word-analysis", "extended-roots.json");

// 6MB metin dosyası bir kez parse edilip verseKey → entries[] olarak indexleniyor
const morphologyIndexPromise: Promise<Map<string, ParsedMorphologyEntry[]>> = readCachedFile(
  "word-analysis",
  "quran-morphology.txt"
).then((content) => {
  const index = new Map<string, ParsedMorphologyEntry[]>();
  const lines = content.split(/\r?\n/u);

  for (const line of lines) {
    const entry = parseMorphologyEntry(line);
    if (!entry) continue;
    const key = `${entry.surahId}:${entry.ayahNumber}`;
    const list = index.get(key);
    if (list) {
      list.push(entry);
    } else {
      index.set(key, [entry]);
    }
  }

  return index;
});

export async function getWordAnalyses(
  surahId: number,
  ayahNumber: number
): Promise<WordAnalysis[]> {
  let morphologyIndex: Awaited<typeof morphologyIndexPromise>;
  let lookup: Awaited<ReturnType<typeof loadWordMeaningLookup>>;
  let rootExplanationLookup: Awaited<ReturnType<typeof loadRootExplanationLookup>>;
  try {
    [morphologyIndex, lookup, rootExplanationLookup] = await Promise.all([
      morphologyIndexPromise,
      loadWordMeaningLookup(),
      loadRootExplanationLookup()
    ]);
  } catch (err) {
    console.error(`[getWordAnalyses] ${surahId}:${ayahNumber} yüklenemedi:`, err);
    return [];
  }

  const entries = morphologyIndex.get(`${surahId}:${ayahNumber}`) ?? [];

  return entries.map((entry) => {
    const match = matchWordMeaning(lookup, entry);
    const rootExplanationMatch = matchRootExplanation(rootExplanationLookup, entry.root);
    const meaningText = repairText(match.text);
    const rootExplanationText = repairText(rootExplanationMatch.text);
    const meaning: Translation | null =
      meaningText === null
        ? null
        : {
            language: "tr",
            source: `${wordTranslationSource}#${match.strategy}`,
            text: meaningText,
            status: "available"
          };
    const rootExplanation: Translation | null =
      rootExplanationText === null
        ? null
        : {
            language: "tr",
            source: `${rootSource}#root`,
            text: rootExplanationText,
            status: "available"
          };

    return {
      wordIndex: entry.wordIndex,
      arabic: entry.arabic,
      transliteration: null,
      root: entry.root,
      rootExplanation,
      rootExplanationStatus:
        rootExplanation !== null ? "available" : entry.root !== null ? "missing" : "missing",
      rootExplanationMissingReason:
        rootExplanation !== null ? null : entry.root !== null ? "matching_gap" : "source_unavailable",
      morphology: entry.role,
      meaning,
      status: entry.arabic !== null ? "available" : "missing"
    };
  });
}

export const wordAnalysisDataSources = {
  morphologySource,
  wordTranslationSource,
  rootSource
} as const;
