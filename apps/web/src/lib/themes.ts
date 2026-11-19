import taxonomyData from "../data/themeTaxonomy.json";

export type ThemeLang = "tr" | "en";

export interface ThemeGroup {
  code: string;
  tr: string;
  en: string;
}

export interface ThemeLevel1 {
  code: string;
  group: string;
  tr: string;
  en: string;
  descTr?: string;
  descEn?: string;
  sensitive?: boolean;
}

export interface ThemeLevel2 {
  code: string;
  parents: string[];
  tr: string;
  en: string;
  sensitive?: boolean;
}

export interface ThemeMigration {
  level1: Record<string, string | null>;
  level2: Record<string, string | null>;
}

export interface ThemeTaxonomy {
  version: number;
  groups: ThemeGroup[];
  level1: ThemeLevel1[];
  level2: ThemeLevel2[];
  migration: ThemeMigration;
}

const taxonomy = taxonomyData as unknown as ThemeTaxonomy;

function normalize(code: string): string {
  return code.trim().toLocaleLowerCase("tr");
}

const level1ByCode = new Map<string, ThemeLevel1>();
const level1ByNorm = new Map<string, ThemeLevel1>();
for (const theme of taxonomy.level1) {
  level1ByCode.set(theme.code, theme);
  level1ByNorm.set(normalize(theme.code), theme);
}

const level2ByCode = new Map<string, ThemeLevel2>();
const level2ByNorm = new Map<string, ThemeLevel2>();
for (const theme of taxonomy.level2) {
  level2ByCode.set(theme.code, theme);
  level2ByNorm.set(normalize(theme.code), theme);
}

function findMigration(
  table: Record<string, string | null>,
  code: string
): { found: boolean; value: string | null } {
  if (Object.prototype.hasOwnProperty.call(table, code)) {
    return { found: true, value: table[code] };
  }
  const needle = normalize(code);
  for (const [oldCode, newCode] of Object.entries(table)) {
    if (normalize(oldCode) === needle) {
      return { found: true, value: newCode };
    }
  }
  return { found: false, value: null };
}

/**
 * Eski (legacy) tema kodunu güncel koda çevirir.
 * `migration` içinde eşlemesi olmayan kodlar olduğu gibi döner.
 * Eşleme değeri `null` ise etiket silinmiştir, `null` döner.
 */
export function mapLegacyCode(code: string): string | null {
  const level1 = findMigration(taxonomy.migration.level1, code);
  if (level1.found) return level1.value;

  const level2 = findMigration(taxonomy.migration.level2, code);
  if (level2.found) return level2.value;

  return code;
}

const legacyLevel1ByTarget = new Map<string, string[]>();
for (const [oldCode, newCode] of Object.entries(taxonomy.migration.level1)) {
  if (newCode === null) continue;
  const list = legacyLevel1ByTarget.get(newCode) ?? [];
  list.push(oldCode);
  legacyLevel1ByTarget.set(newCode, list);
}

const legacyLevel2ByTarget = new Map<string, string[]>();
for (const [oldCode, newCode] of Object.entries(taxonomy.migration.level2)) {
  if (newCode === null) continue;
  const list = legacyLevel2ByTarget.get(newCode) ?? [];
  list.push(oldCode);
  legacyLevel2ByTarget.set(newCode, list);
}

/**
 * İstenen kodu veritabanında aramak için gereken tüm varyantları döner:
 * güncel kod + bu koda taşınan eski (legacy) kodlar.
 * Silinmiş bir etiketse boş dizi döner.
 */
export function getThemeCodeVariants(code: string): string[] {
  const resolved = mapLegacyCode(code);
  if (resolved === null) return [];

  const canonical =
    level1ByCode.get(resolved)?.code ??
    level2ByCode.get(resolved)?.code ??
    level1ByNorm.get(normalize(resolved))?.code ??
    level2ByNorm.get(normalize(resolved))?.code ??
    resolved;

  const variants = new Set<string>([canonical]);
  for (const legacy of legacyLevel1ByTarget.get(canonical) ?? []) variants.add(legacy);
  for (const legacy of legacyLevel2ByTarget.get(canonical) ?? []) variants.add(legacy);
  return [...variants];
}

function readableFallback(code: string): string {
  const title = code.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
  return title.length > 0 ? title : code;
}

function findTheme(code: string): ThemeLevel1 | ThemeLevel2 | undefined {
  return (
    level1ByCode.get(code) ??
    level2ByCode.get(code) ??
    level1ByNorm.get(normalize(code)) ??
    level2ByNorm.get(normalize(code))
  );
}

/** Kodun TR/EN başlığını döner; kod bulunamazsa ham kod yerine okunur bir yedek üretir. */
export function getThemeTitle(code: string, lang: ThemeLang): string {
  const direct = findTheme(code);
  if (direct) return lang === "en" ? direct.en : direct.tr;

  const migrated = mapLegacyCode(code);
  if (migrated !== null) {
    const resolved = findTheme(migrated);
    if (resolved) return lang === "en" ? resolved.en : resolved.tr;
  }

  return readableFallback(code);
}

export function getGroups(): ThemeGroup[] {
  return taxonomy.groups;
}

export function getLevel1ByGroup(groupCode: string): ThemeLevel1[] {
  return taxonomy.level1.filter((theme) => theme.group === groupCode);
}
