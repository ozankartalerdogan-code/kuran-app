// Tema etiketleri — saf mantık (React/RN bağımlılığı yok → node --test ile test edilir).
// Veri sözleşmesi: docs/denetim/tema-sozlesme.md. Uygulama içi kullanım için
// src/lib/themes.ts (gömülü JSON'ları bağlar).

export type ThemeLang = "tr" | "en";

export interface ThemeGroup { code: string; tr: string; en: string }
export interface ThemeLevel1 {
  code: string; group: string; tr: string; en: string;
  descTr?: string; descEn?: string; sensitive?: boolean;
}
export interface ThemeLevel2 { code: string; parents: string[]; tr: string; en: string; sensitive?: boolean }
export interface ThemeTaxonomy {
  version: number;
  groups: ThemeGroup[];
  level1: ThemeLevel1[];
  level2: ThemeLevel2[];
  migration?: { level1?: Record<string, string | null>; level2?: Record<string, string | null> };
}
/** verseThemes.json: `t[verseKey] = [level1 | null, ...level2]`. Diğer alanlar (`_placeholder`) yok sayılır. */
export interface VerseThemesBundle { v: number; t: Record<string, (string | null)[]> }
export interface VerseThemes { main: string | null; subs: string[] }

export interface ThemeIndex {
  tax: ThemeTaxonomy;
  groups: Map<string, ThemeGroup>;
  level1: Map<string, ThemeLevel1>;
  level2: Map<string, ThemeLevel2>;
  mig1: Record<string, string | null>;
  mig2: Record<string, string | null>;
}

export function createThemeIndex(tax: ThemeTaxonomy): ThemeIndex {
  return {
    tax,
    groups: new Map((tax.groups ?? []).map((g) => [g.code, g])),
    level1: new Map((tax.level1 ?? []).map((t) => [t.code, t])),
    level2: new Map((tax.level2 ?? []).map((t) => [t.code, t])),
    mig1: tax.migration?.level1 ?? {},
    mig2: tax.migration?.level2 ?? {},
  };
}

const LEVEL1_PREFIX = /^[A-G][0-9]_/;
const has = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** API joker son ekini ("A6_%", "A6%") temizler. */
function stripWildcard(code: string): string {
  return code.trim().replace(/_?%$/, "");
}

/**
 * Eski/yeni kodu güncel koda çevirir (taxonomy.migration). `null` = etiket silinmiş.
 * Bilinmeyen kodlar olduğu gibi döner. Kısa level1 öneki ("A6", "A6_") tek
 * bir level1'e karşılık geliyorsa o koda çözülür.
 */
export function resolveThemeCode(idx: ThemeIndex, raw: string): string | null {
  const code = stripWildcard(raw);
  if (!code) return null;
  if (idx.level1.has(code) || idx.level2.has(code) || idx.groups.has(code)) return code;
  const upper = code.toUpperCase(); // kodlar ASCII: Türkçe I→ı kuralı uygulanmaz
  if (has(idx.mig1, code)) return idx.mig1[code];
  if (has(idx.mig1, upper)) return idx.mig1[upper];
  if (idx.level1.has(upper)) return upper;
  if (has(idx.mig2, code)) return idx.mig2[code];
  const lower = code.toLowerCase();
  if (has(idx.mig2, lower)) return idx.mig2[lower];
  if (idx.level2.has(lower)) return lower;
  const prefix = /^([A-G][0-9])_?$/i.exec(code);
  if (prefix) {
    const p = prefix[1].toUpperCase() + "_";
    const hits = [...idx.level1.keys()].filter((k) => k.startsWith(p));
    if (hits.length === 1) return hits[0];
  }
  return code;
}

export function getThemeKind(idx: ThemeIndex, raw: string): "group" | "level1" | "level2" | null {
  const c = resolveThemeCode(idx, raw);
  if (!c) return null;
  if (idx.level1.has(c)) return "level1";
  if (idx.level2.has(c)) return "level2";
  if (idx.groups.has(c)) return "group";
  return null;
}

/** Okunur yedek başlık: ham kodu asla gösterme ("C2_BIREYSEL_REZILETLER" → "Bireysel reziletler"). */
export function humanizeThemeCode(raw: string, lang: ThemeLang = "tr"): string {
  const locale = lang === "en" ? "en-US" : "tr-TR";
  let s = stripWildcard(raw);
  if (LEVEL1_PREFIX.test(s)) s = s.replace(LEVEL1_PREFIX, "");
  s = s.replace(/[_\-\s]+/g, " ").trim();
  if (!s) return raw.trim();
  s = s.toLowerCase(); // ASCII kod: "I" → "i" (Türkçe "ı" değil)
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
}

/** Taksonomide başlığı var mı (yedek başlığa düşmeden)? */
export function hasThemeTitle(idx: ThemeIndex, raw: string): boolean {
  return getThemeKind(idx, raw) !== null;
}

export function getThemeTitle(
  idx: ThemeIndex, raw: string, lang: ThemeLang, extraLabels?: Record<string, string | undefined>,
): string {
  const c = resolveThemeCode(idx, raw) ?? stripWildcard(raw);
  const item = idx.level1.get(c) ?? idx.level2.get(c) ?? idx.groups.get(c);
  const title = item ? (lang === "en" ? item.en || item.tr : item.tr || item.en) : undefined;
  if (title && title.trim()) return title;
  const extra = extraLabels?.[c] ?? extraLabels?.[stripWildcard(raw)];
  if (extra && extra.trim()) return extra;
  return humanizeThemeCode(c, lang);
}

export function getThemeDescription(idx: ThemeIndex, raw: string, lang: ThemeLang): string | null {
  const c = resolveThemeCode(idx, raw);
  const item = c ? idx.level1.get(c) : undefined;
  if (!item) return null;
  const d = (lang === "en" ? item.descEn || item.descTr : item.descTr || item.descEn) ?? "";
  return d.trim() ? d.trim() : null;
}

export function getGroups(idx: ThemeIndex): ThemeGroup[] {
  return idx.tax.groups ?? [];
}

export function getLevel1ByGroup(idx: ThemeIndex, group: string): ThemeLevel1[] {
  return (idx.tax.level1 ?? []).filter((t) => t.group === group);
}

export function getLevel2ForParent(idx: ThemeIndex, parent: string): ThemeLevel2[] {
  const p = resolveThemeCode(idx, parent);
  if (!p) return [];
  return (idx.tax.level2 ?? []).filter((t) => t.parents.includes(p));
}

/** Kod listesini güncel kodlara çevirir; silinenleri ve tekrarları atar. */
function normalizeSubs(idx: ThemeIndex, subs: readonly (string | null | undefined)[], main: string | null): string[] {
  const out: string[] = [];
  for (const s of subs) {
    if (!s) continue;
    const r = resolveThemeCode(idx, s);
    if (r && r !== main && !out.includes(r)) out.push(r);
  }
  return out;
}

/** Ham (paket veya API) etiketleri sözleşme biçimine getirir; eski kodlar eşlenir. */
export function normalizeVerseThemes(
  idx: ThemeIndex, main: string | null | undefined, subs: readonly (string | null | undefined)[] | null | undefined,
): VerseThemes {
  const m = main ? resolveThemeCode(idx, main) : null;
  return { main: m, subs: normalizeSubs(idx, subs ?? [], m) };
}

export function lookupVerseThemes(idx: ThemeIndex, bundle: VerseThemesBundle, verseKey: string): VerseThemes {
  const row = bundle.t?.[verseKey];
  if (!row || row.length === 0) return { main: null, subs: [] };
  return normalizeVerseThemes(idx, row[0], row.slice(1));
}

/** Level1 kodu → ayet sayısı (paketten; eski kodlar eşlenir). */
export function countVersesByMain(idx: ThemeIndex, bundle: VerseThemesBundle): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of Object.values(bundle.t ?? {})) {
    const m = row?.[0] ? resolveThemeCode(idx, row[0]) : null;
    if (m) out[m] = (out[m] ?? 0) + 1;
  }
  return out;
}

/**
 * Bir level1 altında en sık geçen level2 kodları (paketten). Taksonomide
 * `parents` tanımlı alt konu yoksa Konular ekranı bunu kullanır.
 */
export function topSubsForMain(
  idx: ThemeIndex, bundle: VerseThemesBundle, main: string, limit = 12,
): { code: string; count: number }[] {
  const target = resolveThemeCode(idx, main);
  if (!target) return [];
  const counts = new Map<string, number>();
  for (const row of Object.values(bundle.t ?? {})) {
    if (!row?.[0] || resolveThemeCode(idx, row[0]) !== target) continue;
    for (const s of normalizeSubs(idx, row.slice(1), target)) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, limit);
}

// ── Dualar: `dua-*` alt konuları Konular ekranında tek başlık altında ────────
// (tema-sozlesme.md, Kullanıcı kararları 2026-11-19; kodlar korunur.)

const DUA_PREFIX = "dua-";

/** Kürasyonlu dua alt konusu mu (`dua-` önekli level2)? */
export function isDuaCode(code: string): boolean {
  return code.startsWith(DUA_PREFIX);
}

/** Alt konu kodlarını ayırır: diğerleri (sıra korunur) + dualar. */
export function groupSubtopics(codes: readonly string[]): { regular: string[]; duas: string[] } {
  const regular: string[] = [];
  const duas: string[] = [];
  for (const c of codes) (isDuaCode(c) ? duas : regular).push(c);
  return { regular, duas };
}

/** "Dua: Bağışlanma" → "Bağışlanma" (başlık zaten "Dualar" altında). Önek yoksa aynen. */
export function stripDuaPrefix(title: string): string {
  const s = title.replace(/^\s*dua\s*:\s*/i, "");
  return s.trim() ? s : title;
}

/** Dua kodlarını görünen başlığa göre dil yereline uygun sıralar. */
export function sortDuaCodes(
  codes: readonly string[], titleOf: (code: string) => string, lang: ThemeLang,
): { code: string; title: string }[] {
  const collator = new Intl.Collator(lang === "en" ? "en" : "tr", { sensitivity: "base" });
  return codes
    .map((code) => ({ code, title: stripDuaPrefix(titleOf(code)) }))
    .sort((a, b) => collator.compare(a.title, b.title) || a.code.localeCompare(b.code));
}

/** En az bir `dua-*` alt etiketi olan ayet sayısı (paketten; eski kodlar eşlenir). */
export function countDuaVerses(idx: ThemeIndex, bundle: VerseThemesBundle): number {
  let n = 0;
  for (const row of Object.values(bundle.t ?? {})) {
    if (!row || row.length < 2) continue;
    if (normalizeSubs(idx, row.slice(1), null).some(isDuaCode)) n++;
  }
  return n;
}
