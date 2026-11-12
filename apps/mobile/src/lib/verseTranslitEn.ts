/* eslint-disable @typescript-eslint/no-require-imports */
// İngilizce ayet okunuşu: Quran.com tarzı (telaffuza göre) transliterasyon,
// kaynak AlQuran Cloud `en.transliteration`. Uygulamaya gömülü; çevrimdışı çalışır.
// Veri: src/data/translit_en.json ← scripts/build-mobile-translit-en.mjs
// Kaynak/atıf: data/translations/en.transliteration/SOURCE.md
// Arayüz dili İngilizceyken Türkçe okunuşun yerine gösterilir; ayet bulunamazsa
// Türkçe okunuş harf dönüşümüyle (localizedTranslit) gösterilir.
import { getLang, type Lang } from "../i18n";
import { lookupMeal, type MealTable } from "./mealLookup";
import { localizedTranslit } from "./translitEn";
import type { VerseRef } from "./englishMeal";

export const EN_TRANSLIT_SOURCE = "AlQuran Cloud / Quran.com";

let table: MealTable | null = null;
function load(): MealTable {
  // Tembel yükleme: Türkçe kullanıcı ~650 KB JSON'u hiç parse etmez.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (!table) table = require("../data/translit_en.json") as MealTable;
  return table;
}

function toPair(ref: VerseRef): [number, number] | null {
  if (!ref) return null;
  if (typeof ref === "string") {
    const m = /^(\d{1,3}):(\d{1,3})$/.exec(ref.trim());
    return m ? [Number(m[1]), Number(m[2])] : null;
  }
  return Number.isInteger(ref.surah) && Number.isInteger(ref.ayah) ? [ref.surah, ref.ayah] : null;
}

export function englishVerseTranslit(ref: VerseRef): string | null {
  const p = toPair(ref);
  return p ? lookupMeal(load(), p[0], p[1]) : null;
}

/** Dil İngilizceyse gömülü İngilizce okunuş; değilse verilen Türkçe okunuş. */
export function localizedVerseTranslit<T extends string | null | undefined>(
  ref: VerseRef,
  trReading: T,
  lang: Lang = getLang(),
): string | T {
  if (lang !== "en") return trReading;
  return englishVerseTranslit(ref) ?? (localizedTranslit(trReading, lang) as T);
}
