/* eslint-disable @typescript-eslint/no-require-imports */
// Kanonik Tanzil Uthmani 1.1 Arapça ayet metinleri (1. ve 9. sure hariç 1. ayetlerde
// besmele öneki ayrılmış gövde). Uygulamaya gömülü; çevrimdışı çalışır.
// Veri: src/data/quran_arabic.json ← scripts/build-mobile-arabic.mjs
import { lookupMeal, type MealTable } from "./mealLookup";

let table: MealTable | null = null;
function load(): MealTable {
  // Tembel yükleme: ilk çağrıda JSON belleğe alınır.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  if (!table) table = require("../data/quran_arabic.json") as MealTable;
  return table;
}

/** Verilen sure ve ayet numarası için Arapça ayet metnini döner; geçersiz aralıkta null. */
export function arabicVerseText(surahId: number, ayahNumber: number): string | null {
  if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber) || surahId < 1 || ayahNumber < 1) {
    return null;
  }
  return lookupMeal(load(), surahId, ayahNumber);
}
