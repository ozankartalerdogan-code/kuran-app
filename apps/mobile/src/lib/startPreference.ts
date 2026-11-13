import { storage, STORAGE_KEYS } from "./storage";
export type StartPreference = "read" | "understand" | "letters";
// "read" doğrudan mushaf okuma ekranını açar (param yok → kaldığı sayfadan devam eder).
export const START_ROUTES = { read: "/mushaf-sayfa", understand: "/sure-listesi", letters: "/elifba" } as const;
export async function loadStartPreference(): Promise<StartPreference | null> {
  const value = await storage.getString(STORAGE_KEYS.startPreference);
  return value === "read" || value === "understand" || value === "letters" ? value : null;
}
export async function saveStartPreference(value: StartPreference | null): Promise<void> {
  if (value) await storage.setString(STORAGE_KEYS.startPreference, value);
  else await storage.remove(STORAGE_KEYS.startPreference);
}
