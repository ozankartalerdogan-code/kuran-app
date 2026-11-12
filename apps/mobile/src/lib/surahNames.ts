// Sure adları: API Türkçe ad döndürür ("Bakara"). Arayüz dili İngilizceyken
// gömülü tablodan transliterasyon gösterilir ("Al-Baqarah"). Yalnız görüntü metni.
// Veri: src/data/surahNamesEn.json ← scripts/build-mobile-surah-names.mjs
import { useCallback } from "react";
import { useLang, getLang, type Lang } from "../i18n";
import table from "../data/surahNamesEn.json";

type Entry = { name: string; meaning: string };
const TABLE = table as Entry[];

export function englishSurah(surahId: number | null | undefined): Entry | null {
  if (!Number.isInteger(surahId)) return null;
  return TABLE[(surahId as number) - 1] ?? null;
}

/** Dil İngilizceyse transliterasyon, değilse (veya sure bulunamazsa) verilen Türkçe ad. */
export function localizedSurahName<T extends string | null | undefined>(
  surahId: number | null | undefined,
  trName: T,
  lang: Lang = getLang(),
): string | T {
  if (lang !== "en") return trName;
  return englishSurah(surahId)?.name ?? trName;
}

/** Bileşenlerde: const surahNameOf = useSurahNameOf(); surahNameOf(id, item.name) */
export function useSurahNameOf(): <T extends string | null | undefined>(surahId: number | null | undefined, trName: T) => string | T {
  const lang = useLang();
  // Dil değişmedikçe aynı referans — FlatList renderItem memo'ları bozulmasın.
  return useCallback((id, trName) => localizedSurahName(id, trName, lang), [lang]) as ReturnType<typeof useSurahNameOf>;
}
