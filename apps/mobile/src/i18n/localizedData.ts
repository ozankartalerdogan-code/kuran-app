// Gömülü içerik JSON'larının dile göre seçimi. Türkçe veri statik import ile
// gelir (değişmez); İngilizce karşılığı (<ad>.en.json, AI destekli çeviri)
// yalnız İngilizce arayüzde tembel yüklenir. Yüklenemezse Türkçe gösterilir.
import { useLang, type Lang } from "./index";

export type LocalizedData<T> = (lang: Lang) => T;

export function localizedData<T>(tr: T, en: () => unknown): LocalizedData<T> {
  let cached: T | null | undefined;
  return (lang) => {
    if (lang !== "en") return tr;
    if (cached === undefined) {
      try {
        cached = (en() as T) ?? null;
      } catch {
        cached = null;
      }
    }
    return cached ?? tr;
  };
}

export function useLocalizedData<T>(pick: LocalizedData<T>): T {
  return pick(useLang());
}
