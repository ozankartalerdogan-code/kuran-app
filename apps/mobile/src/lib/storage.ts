import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeAdapter, createTypedStorage } from "@quran-app/storage";

export const storage = createTypedStorage(createNativeAdapter(AsyncStorage));

// ── Anahtar sabitleri — web'deki storageUtils.ts ile senkron ─────────────────

export const STORAGE_KEYS = {
  favorites:      "favoriteVerses",
  notes:          "verseNotes",
  streak:         "readingStreak",
  mushafBookmark: "mushaf_bookmark",
  nightMode:      "nightMode",
  elifbaProgress: "elifbaProgress",
  quizScores:     "elifbaQuizScores",
} as const;

// ── Tipli yardımcılar ─────────────────────────────────────────────────────────

export async function getFavorites(): Promise<string[]> {
  return (await storage.getJSON<string[]>(STORAGE_KEYS.favorites)) ?? [];
}

export async function toggleFavorite(verseKey: string): Promise<boolean> {
  const favs = await getFavorites();
  const next = favs.includes(verseKey)
    ? favs.filter((k) => k !== verseKey)
    : [...favs, verseKey];
  await storage.setJSON(STORAGE_KEYS.favorites, next);
  return next.includes(verseKey);
}

export async function getNotes(): Promise<Record<string, string>> {
  return (await storage.getJSON<Record<string, string>>(STORAGE_KEYS.notes)) ?? {};
}

export async function setNote(verseKey: string, text: string): Promise<void> {
  const notes = await getNotes();
  if (text.trim()) {
    notes[verseKey] = text.trim();
  } else {
    delete notes[verseKey];
  }
  await storage.setJSON(STORAGE_KEYS.notes, notes);
}
