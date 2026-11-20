/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- Metro: tembel statik require (literalEn.ts deseni) */
import { loadSurahs, verseLoaders, juzLoaders, pageJuz } from "../data/offlineTr";
import { decodeVerses, decodeMushafPage, type RuleTable } from "./offlineTrCodec";

export function offlineSurahs() {
  try { return loadSurahs(); } catch { return null; }
}

export function offlineVerses(surahId: number) {
  try {
    if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) return null;
    return decodeVerses(loadSurahs()[surahId - 1], verseLoaders[surahId]());
  } catch { return null; }
}

export function offlineMushafPage(page: number) {
  try {
    if (!Number.isInteger(page) || page < 1 || page > 604) return null;
    const juz = pageJuz[page - 1];
    return decodeMushafPage(
      page, juz, require("../data/mushaf_sayfalari.json").sayfaBaslangiclari[page - 1],
      juzLoaders[juz]()[page], loadSurahs(), require("../data/quran_arabic.json"),
      require("../data/offlineTr/rules.json") as RuleTable,
    );
  } catch { return null; }
}
