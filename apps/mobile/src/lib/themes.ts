/* eslint-disable @typescript-eslint/no-require-imports */
// Tema etiketleri — uygulama tarafı. Saf mantık themesCore.ts'te (test edilir);
// burada gömülü veriler bağlanır.
//
// Veri: src/data/themeTaxonomy.json (~10 KB, açılışta yüklenir) ve
// src/data/verseThemes.json (~250 KB, TEMBEL: ilk getVerseThemes / sayım çağrısında
// require edilir, sonra bellekte tutulur). İkisi de scripts/themes/build_bundles.py
// çıktısıdır; şimdilik geçici örnekler (`_placeholder`). Dosyalar değişince kod değişmez.
import taxonomyJson from "../data/themeTaxonomy.json";
import tagStrings from "../i18n/strings/tagLabels";
import {
  createThemeIndex,
  resolveThemeCode as resolveCore,
  getThemeTitle as titleCore,
  getThemeDescription as descCore,
  getThemeKind as kindCore,
  hasThemeTitle as hasTitleCore,
  getGroups as groupsCore,
  getLevel1ByGroup as level1Core,
  getLevel2ForParent as level2Core,
  lookupVerseThemes,
  normalizeVerseThemes as normalizeCore,
  countVersesByMain,
  topSubsForMain as topSubsCore,
  countDuaVerses as countDuaCore,
  type ThemeLang,
  type ThemeTaxonomy,
  type VerseThemesBundle,
  type VerseThemes,
} from "./themesCore";

export { isDuaCode, groupSubtopics, stripDuaPrefix, sortDuaCodes } from "./themesCore";

export type { ThemeLang, ThemeGroup, ThemeLevel1, ThemeLevel2, VerseThemes } from "./themesCore";

/**
 * Tema etiketi arayüzünün TEK anahtarı (ayet kartı, Konular ekranı, Öğren girişi).
 * 2026-11-19: denetim geçti (%94,7 FIT, 0 WRONG), web + Turso canlıda → 1.2.3'ten itibaren açık.
 * Sorun çıkarsa `__DEV__` yapıp yeni sürüm çıkarmak arayüzü gizler.
 */
export const THEME_TAGS_ENABLED: boolean = true;

const taxonomy = taxonomyJson as unknown as ThemeTaxonomy & { _placeholder?: unknown };
const idx = createThemeIndex(taxonomy);

/** Gerçek taksonomi gelene kadar true (EN başlıklar henüz TR kopyası). */
export const TAXONOMY_IS_PLACEHOLDER = !!taxonomy._placeholder;

// Kürasyonlu namaz-/korunma-/ismiazam- etiketleri için mevcut TR/EN adlar (taksonomide yoksa).
const curated: Record<ThemeLang, Record<string, string>> = {
  tr: tagStrings.tr as Record<string, string>,
  en: tagStrings.en as Record<string, string>,
};

let bundle: VerseThemesBundle | null = null;
function loadBundle(): VerseThemesBundle {
  if (!bundle) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      bundle = require("../data/verseThemes.json") as VerseThemesBundle;
    } catch {
      bundle = { v: 1, t: {} };
    }
  }
  return bundle;
}

export const resolveThemeCode = (code: string) => resolveCore(idx, code);
export const getThemeKind = (code: string) => kindCore(idx, code);
export const hasThemeTitle = (code: string) => hasTitleCore(idx, code);
export const getThemeTitle = (code: string, lang: ThemeLang) => titleCore(idx, code, lang, curated[lang]);
export const getThemeDescription = (code: string, lang: ThemeLang) => descCore(idx, code, lang);
export const getGroups = () => groupsCore(idx);
export const getLevel1ByGroup = (group: string) => level1Core(idx, group);
export const getLevel2ForParent = (parent: string) => level2Core(idx, parent);

const verseCache = new Map<string, VerseThemes>();
/** Ayetin etiketleri (çevrimdışı paketten). Etiket yoksa `{ main: null, subs: [] }`. */
export function getVerseThemes(verseKey: string): VerseThemes {
  let v = verseCache.get(verseKey);
  if (!v) {
    v = lookupVerseThemes(idx, loadBundle(), verseKey);
    verseCache.set(verseKey, v);
  }
  return v;
}

/** API'den gelen (eski) ana_tema/alt_taglar değerlerini güncel kodlara çevirir. */
export const normalizeVerseThemes = (main: string | null | undefined, subs: readonly string[] | null | undefined) =>
  normalizeCore(idx, main, subs);

let counts: Record<string, number> | null = null;
/** Level1 → ayet sayısı (paketten, bir kez hesaplanır). */
export function getVerseCountsByMain(): Record<string, number> {
  if (!counts) counts = countVersesByMain(idx, loadBundle());
  return counts;
}

const topSubsCache = new Map<string, { code: string; count: number }[]>();
/** Level1 altındaki alt konular: taksonomideki `parents`, yoksa paketteki en sık alt etiketler. */
export function getSubTopics(main: string, limit = 12): string[] {
  const fromTax = getLevel2ForParent(main).map((t) => t.code);
  if (fromTax.length > 0) return fromTax;
  let top = topSubsCache.get(main);
  if (!top) {
    top = topSubsCore(idx, loadBundle(), main, limit);
    topSubsCache.set(main, top);
  }
  return top.map((t) => t.code);
}

let duaVerses: number | null = null;
/** En az bir `dua-*` alt etiketi olan ayet sayısı (paketten, bir kez hesaplanır). */
export function getDuaVerseCount(): number {
  if (duaVerses === null) duaVerses = countDuaCore(idx, loadBundle());
  return duaVerses;
}
