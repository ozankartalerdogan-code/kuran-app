/* eslint-disable @typescript-eslint/no-require-imports */
// Arayüz dili (tr | en). Yalnız UI metinleri çevrilir; dini içerik (meal, dua,
// hadis, ders, tefsir) Türkçe kalır.
//
// Kullanım — her ekran kendi metin dosyasını tanımlar (paralel çalışmada çakışma
// olmasın diye merkezi sözlük yok):
//
//   // src/i18n/strings/namaz.ts
//   export default defineStrings({
//     tr: { title: "Namaz Vakitleri", next: "Sonraki vakit: {name}" },
//     en: { title: "Prayer Times",    next: "Next prayer: {name}" },
//   });
//
//   // ekran
//   const s = useStrings(namazStrings);
//   <Text>{s.title}</Text>
//   <Text>{fmt(s.next, { name })}</Text>
//
// React dışı (bildirim, widget, util) kodda: getStrings(namazStrings).
import { useSyncExternalStore } from "react";
import { storage } from "../lib/storage";
import { updateLanguageState, type Lang, type LangPreference, type LanguageState } from "./languageState";

export type { Lang, LangPreference } from "./languageState";

const PREF_KEY = "uiLanguage";

function detectSystemLang(): Lang {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- eski build'de native modül yoksa çökmesin
    const { getLocales } = require("expo-localization") as typeof import("expo-localization");
    const code = getLocales()?.[0]?.languageCode?.toLowerCase();
    return code === "tr" || code == null ? "tr" : "en";
  } catch {
    // Native modül yoksa (eski build) mevcut davranış: Türkçe.
    return "tr";
  }
}

function readPref(): LangPreference {
  const v = storage.getStringSync(PREF_KEY);
  return v === "tr" || v === "en" ? v : "system";
}

const initialPreference = readPref();
let languageState: LanguageState = {
  preference: initialPreference,
  current: initialPreference === "system" ? detectSystemLang() : initialPreference,
};
const listeners = new Set<() => void>();
let prefGeneration = 0;
const startupGeneration = prefGeneration;

// MMKV yoksa senkron okuma null döner; tercihi async olarak bir kez yükle.
export const languageReady: Promise<void> = languageState.preference === "system"
  ? storage.getString(PREF_KEY).then((v) => {
    if (prefGeneration !== startupGeneration) return;
    if (v === "tr" || v === "en") {
      const next = updateLanguageState(languageState, v, languageState.current);
      if (next !== languageState) {
        languageState = next;
        listeners.forEach((l) => l());
      }
    }
  }).catch(() => {})
  : Promise.resolve();

export function getLang(): Lang {
  return languageState.current;
}

export function getLangPreference(): LangPreference {
  return languageState.preference;
}

export async function setLangPreference(pref: LangPreference): Promise<void> {
  prefGeneration++;
  languageState = updateLanguageState(languageState, pref, pref === "system" ? detectSystemLang() : pref);
  if (pref === "system") await storage.remove(PREF_KEY);
  else await storage.setString(PREF_KEY, pref);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

export function useLangPreference(): LangPreference {
  return useSyncExternalStore(subscribe, getLangPreference, getLangPreference);
}

type Widen<T> = { [K in keyof T]: T[K] extends readonly unknown[] ? readonly string[] : string };

export interface StringTable<T> {
  tr: T;
  en: Widen<T>;
}

/** tr ve en aynı anahtarlara sahip olmak zorunda (tip kontrolü). */
export function defineStrings<const T extends Record<string, string | readonly string[]>>(
  table: { tr: T; en: Widen<T> },
): StringTable<T> {
  return table;
}

export function getStrings<T>(table: StringTable<T>): Widen<T> {
  return (getLang() === "en" ? table.en : table.tr) as Widen<T>;
}

export function useStrings<T>(table: StringTable<T>): Widen<T> {
  const lang = useLang();
  return (lang === "en" ? table.en : table.tr) as Widen<T>;
}

export { fmt } from "./fmt";

/**
 * textTransform:"uppercase" olan metinler için: Android büyük harfe çevirirken cihaz
 * dilini kullanır; Türkçe telefonda İngilizce "i" → "İ" olur (GUİDES). İngilizcede
 * metni JS'de önceden büyütürüz ("I" Türkçe kuralda da "I" kalır). Türkçede değişmez.
 */
export function caps<T>(value: T): T {
  return getLang() === "en" && typeof value === "string" ? (value.toUpperCase() as T) : value;
}

/** Tarih/sayı biçimlendirme için locale etiketi. */
export function localeTag(lang: Lang = getLang()): string {
  return lang === "en" ? "en-US" : "tr-TR";
}
