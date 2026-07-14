function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parseRecentSearches(raw: string | null): string[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export interface SavedZikirStorage {
  isim: string;
  hedef: number;
}

export function parseSavedZikirList(raw: string | null): SavedZikirStorage[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SavedZikirStorage => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.isim === "string" &&
      record.isim.trim().length > 0 &&
      typeof record.hedef === "number" &&
      Number.isFinite(record.hedef) &&
      record.hedef > 0
    );
  });
}

export function parseZikirPresetTargets(raw: string | null): Record<string, number> {
  const value = parseJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [name, target] of Object.entries(value)) {
    if (typeof target === "number" && Number.isFinite(target) && target > 0) result[name] = target;
  }
  return result;
}

export interface ZikirStateStorage {
  zikirIdx?: number;
  count?: number;
  tur?: number;
  customName?: string;
  customTarget?: number;
}

export function parseZikirState(raw: string | null): ZikirStateStorage | null {
  const value = parseJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const state: ZikirStateStorage = {};
  if (typeof record.zikirIdx === "number" && Number.isFinite(record.zikirIdx)) state.zikirIdx = record.zikirIdx;
  if (typeof record.count === "number" && Number.isFinite(record.count)) state.count = record.count;
  if (typeof record.tur === "number" && Number.isFinite(record.tur)) state.tur = record.tur;
  if (typeof record.customName === "string") state.customName = record.customName;
  if (typeof record.customTarget === "number" && Number.isFinite(record.customTarget)) state.customTarget = record.customTarget;
  return state;
}
