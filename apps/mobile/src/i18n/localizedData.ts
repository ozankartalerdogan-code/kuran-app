// Gömülü içerik JSON'larının dile göre seçimi. Türkçe veri statik import ile
// gelir (değişmez); İngilizce karşılığı (<ad>.en.json, AI destekli çeviri)
// yalnız İngilizce arayüzde tembel yüklenir. Yüklenemezse Türkçe gösterilir.
import { useLang, type Lang } from "./index";

export type LocalizedData<T> = (lang: Lang) => T;

export function localizedData<T>(tr: T | (() => T), en: () => unknown): LocalizedData<T> {
  let cachedTr: T | undefined;
  let cachedEn: T | null | undefined;
  const getTr = (): T => {
    if (cachedTr === undefined) {
      cachedTr = typeof tr === "function" ? (tr as () => T)() : tr;
    }
    return cachedTr;
  };
  return (lang) => {
    if (lang !== "en") return getTr();
    if (cachedEn === undefined) {
      try {
        cachedEn = (en() as T) ?? null;
      } catch {
        cachedEn = null;
      }
    }
    return cachedEn ?? getTr();
  };
}

export function useLocalizedData<T>(pick: LocalizedData<T>): T {
  return pick(useLang());
}
