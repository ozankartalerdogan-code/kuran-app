import { buildMushafVerse } from "../../../../packages/core/src/mushafCompat";
import type { SurahListItem, VerseListResponse } from "./api";

// Positional records store independent inputs only, never duplicated API fields.
export type CompactVerses = [string | null, string | null, string | null][];
export type CompactVerse = [
  [number, number, number][],
  ["ayah" | "prefix", number, number, number] | null,
  string | null,
  ...([] | [string | null]),
];
export type CompactPages = Record<string, CompactVerse[]>;
export type RuleTable = [string, string][];

export function decodeVerses(surah: SurahListItem, rows: CompactVerses): VerseListResponse {
  const { id, name, arabicName, verseCount, revelationPlace } = surah;
  return {
    surah: { id, name, arabicName, verseCount, revelationPlace },
    verses: rows.map(([meal, reading, literal], i) => ({ ayahNumber: i + 1, meal, reading, literal })),
  };
}

export function decodeMushafPage(
  page: number, juz: number, start: number[], rows: CompactVerse[],
  surahs: SurahListItem[], arabic: string[][], rules: RuleTable,
) {
  let [surahId, ayahNumber] = start;
  const firstSurah = surahId;
  const verses = rows.map((row) => {
    const [spans, range, arabicTajweed] = row;
    const verse = buildMushafVerse({
      surahId, ayahNumber,
      arabicText: row.length === 4 ? row[3]! : arabic[surahId - 1][ayahNumber - 1],
      arabicTajweed,
      basmalaRange: range && { kind: range[0], startCp: range[1], endCp: range[2], bodyStartCp: range[3] },
      spans: spans.map(([startCp, endCp, ruleIndex]) => ({
        startCp, endCp, rule: rules[ruleIndex][0], color: rules[ruleIndex][1],
      })),
    });
    if (++ayahNumber > surahs[surahId - 1].verseCount) { surahId++; ayahNumber = 1; }
    return verse;
  });
  return {
    schemaVersion: 5 as const, page, juz, verses,
    surahs: surahs.slice(firstSurah - 1, verses[verses.length - 1].surahId)
      .map(({ id, name, arabicName }) => ({ id, name, arabicName })),
  };
}
