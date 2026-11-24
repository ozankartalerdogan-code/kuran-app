/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- Metro: tembel statik require (literalEn.ts deseni) */
import { loadSurahs, verseLoaders, juzLoaders, pageJuz } from "../data/offlineTr";
import { decodeVerses, decodeMushafPage, type RuleTable } from "./offlineTrCodec";
import type { AyahDetailResponse, DailyResponse } from "./api";

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

/** Temel ayet metni gömülüdür; çevrimiçi sözcük analizi alanları uydurulmaz. */
export function offlineAyah(surahId: number, ayahNumber: number): AyahDetailResponse | null {
  const data = offlineVerses(surahId);
  if (!data || !Number.isInteger(ayahNumber) || ayahNumber < 1) return null;
  const verse = data.verses[ayahNumber - 1];
  if (!verse) return null;
  const { surah } = data;
  return {
    verseKey: `${surahId}:${ayahNumber}`, surahId, ayahNumber,
    surahName: surah.name, arabicName: surah.arabicName, verseCount: surah.verseCount,
    arabicText: require("../data/quran_arabic.json")[surahId - 1][ayahNumber - 1],
    arabicTajweed: null, readingTr: verse.reading, meal: verse.meal,
    literalCeviri: verse.literal, farkAnalizi: null, anaTema: null, altTaglar: [],
    translations: [], rootMeanings: {}, words: [],
    prevAyah: ayahNumber > 1 ? { surahId, ayahNumber: ayahNumber - 1 }
      : surahId > 1 ? { surahId: surahId - 1, ayahNumber: loadSurahs()[surahId - 2].verseCount } : null,
    nextAyah: ayahNumber < surah.verseCount ? { surahId, ayahNumber: ayahNumber + 1 }
      : surahId < 114 ? { surahId: surahId + 1, ayahNumber: 1 } : null,
  };
}

export function offlineDaily(): DailyResponse | null {
  const now = new Date();
  const verse = offlineAyah(89, (now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()) % 30 + 1);
  const dua = offlineAyah(2, 201);
  const daily = (item: AyahDetailResponse | null) => item && ({
    verse_key: item.verseKey, surah_id: item.surahId, ayah_number: item.ayahNumber,
    surah_name: item.surahName, arabic_text: item.arabicText, reading_tr: item.readingTr, meal: item.meal,
  });
  return verse && dua ? { verse: daily(verse), dua: daily(dua) } : null;
}
