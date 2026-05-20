import type { MissingMeaningReportEntry } from "@quran-app/types";
import { readCachedFile } from "../adapters/shared";
import {
  getMissingMeaningReason,
  loadRootExplanationLookup,
  loadWordMeaningLookup,
  matchRootExplanation,
  matchWordMeaning,
  parseMorphologyEntry
} from "../adapters/wordAnalysisShared";
import { writeDataJson } from "./shared";

interface WordMeaningCoverageEntry {
  surahId: number;
  ayahNumber: number;
  totalWords: number;
  matchedWords: number;
  coverageRatio: number;
  hasMorphology: boolean;
}

interface RootExplanationCoverageEntry {
  totalRootTokens: number;
  explainedRootTokens: number;
  rootWithoutExplanationTokens: number;
  tokensWithoutRoot: number;
  coverageRatio: number;
}

export async function buildWordAnalysisReports(): Promise<void> {
  const [morphologyContent, lookup, rootExplanationLookup] = await Promise.all([
    readCachedFile("word-analysis", "quran-morphology.txt"),
    loadWordMeaningLookup(),
    loadRootExplanationLookup()
  ]);

  const missingMeanings: MissingMeaningReportEntry[] = [];
  const rootExplanationCoverage: RootExplanationCoverageEntry = {
    totalRootTokens: 0,
    explainedRootTokens: 0,
    rootWithoutExplanationTokens: 0,
    tokensWithoutRoot: 0,
    coverageRatio: 0
  };
  const coverageByAyah = new Map<string, WordMeaningCoverageEntry>();

  morphologyContent
    .split(/\r?\n/u)
    .map(parseMorphologyEntry)
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .forEach((entry) => {
      const key = `${entry.surahId}:${entry.ayahNumber}`;
      const matched = matchWordMeaning(lookup, entry);
      const coverageEntry = coverageByAyah.get(key) ?? {
        surahId: entry.surahId,
        ayahNumber: entry.ayahNumber,
        totalWords: 0,
        matchedWords: 0,
        coverageRatio: 0,
        hasMorphology: true
      };

      coverageEntry.totalWords += 1;

      if (matched.text !== null) {
        coverageEntry.matchedWords += 1;
      } else {
        missingMeanings.push({
          surahId: entry.surahId,
          ayahNumber: entry.ayahNumber,
          wordIndex: entry.wordIndex,
          lemma: entry.lemma,
          root: entry.root,
          arabic: entry.arabic,
          reason: getMissingMeaningReason(entry)
        });
      }

      if (entry.root === null) {
        rootExplanationCoverage.tokensWithoutRoot += 1;
      } else {
        rootExplanationCoverage.totalRootTokens += 1;

        if (matchRootExplanation(rootExplanationLookup, entry.root).text !== null) {
          rootExplanationCoverage.explainedRootTokens += 1;
        } else {
          rootExplanationCoverage.rootWithoutExplanationTokens += 1;
        }
      }

      coverageByAyah.set(key, coverageEntry);
    });

  const coverageReport = [...coverageByAyah.values()]
    .map((entry) => ({
      ...entry,
      coverageRatio: entry.totalWords === 0 ? 0 : entry.matchedWords / entry.totalWords
    }))
    .sort((left, right) => left.surahId - right.surahId || left.ayahNumber - right.ayahNumber);

  await Promise.all([
    writeDataJson(["word-analysis", "reports", "missing-meanings.json"], missingMeanings),
    writeDataJson(["word-analysis", "reports", "coverage-by-ayah.json"], coverageReport),
    writeDataJson(["word-analysis", "reports", "root-explanations.json"], {
      ...rootExplanationCoverage,
      coverageRatio:
        rootExplanationCoverage.totalRootTokens === 0
          ? 0
          : rootExplanationCoverage.explainedRootTokens / rootExplanationCoverage.totalRootTokens
    })
  ]);
}
