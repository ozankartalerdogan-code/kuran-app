import { storage, STORAGE_KEYS } from "../lib/storage";

export type WidgetThemePreference = "light" | "dark" | null;

export async function readWidgetThemePreference(): Promise<WidgetThemePreference> {
  try {
    const value = await storage.getJSON<unknown>(STORAGE_KEYS.nightMode);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function applyWidgetTheme<T>(
  pair: { light: T; dark: T },
  pref: WidgetThemePreference,
): { light: T; dark: T } {
  if (pref === "dark") return { light: pair.dark, dark: pair.dark };
  if (pref === "light") return { light: pair.light, dark: pair.light };
  return pair;
}
