/* eslint-disable @typescript-eslint/no-require-imports */
// İngilizce meal: M. M. Pickthall, "The Meaning of the Glorious Koran" (1930,
// kamu malı). Uygulamaya gömülü; çevrimdışı çalışır. Veri:
// src/data/meal_en_pickthall.json ← scripts/build-mobile-meal-en.mjs
// Arayüz dili İngilizceyken Türkçe (Elmalılı) mealin yerine gösterilir.
import { useCallback } from "react";
import { useLang, getLang, type Lang } from "../i18n";
import { lookupMeal, parseVerseKey, type MealTable } from "./mealLookup";

export const EN_MEAL_SOURCE = "M. M. Pickthall (1930)";

let table: MealTable | null = null;
function load(): MealTable {
  // Tembel yükleme: Türkçe kullanıcı ~840 KB JSON'u hiç parse etmez.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  if (!table) table = require("../data/meal_en_pickthall.json") as MealTable;
  return table;
}

export type VerseRef = string | { surah: number; ayah: number } | null | undefined;

function toPair(ref: VerseRef): [number, number] | null {
  if (!ref) return null;
  if (typeof ref === "string") return parseVerseKey(ref);
  return Number.isInteger(ref.surah) && Number.isInteger(ref.ayah) ? [ref.surah, ref.ayah] : null;
}

export function englishMeal(ref: VerseRef): string | null {
  const p = toPair(ref);
  return p ? lookupMeal(load(), p[0], p[1]) : null;
}

/** Dil İngilizceyse Pickthall, değilse (veya ayet bulunamazsa) verilen Türkçe meal. */
export function localizedMeal<T extends string | null | undefined>(
  ref: VerseRef,
  trMeal: T,
  lang: Lang = getLang(),
): string | T {
  if (lang !== "en") return trMeal;
  return englishMeal(ref) ?? trMeal;
}

/** Bileşenlerde: const mealOf = useMealOf(); mealOf(verseKey, item.meal) */
export function useMealOf(): <T extends string | null | undefined>(ref: VerseRef, trMeal: T) => string | T {
  const lang = useLang();
  // Dil değişmedikçe aynı referans — FlatList renderItem memo'ları bozulmasın.
  return useCallback((ref, trMeal) => localizedMeal(ref, trMeal, lang), [lang]) as ReturnType<typeof useMealOf>;
}

/** Arama için tüm tablo (tembel yüklenir; yalnız İngilizce modda çağır). */
export function getEnglishMealTable(): MealTable {
  return load();
}
