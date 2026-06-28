import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

export const STORAGE_KEYS = {
  favorites:       "favoriteVerses",
  notes:           "verseNotes",
  streak:          "readingStreak",
  mushafBookmark:  "mushaf_bookmark",
  nightMode:       "nightMode",
  elifbaProgress:  "elifbaProgress",
  quizScores:      "elifbaQuizScores",
  recentSearches:  "recentSearches",
  prayerCache:     "prayerTimesCache",
  derslerProgress: "derslerProgress",
} as const;

export class StorageQuotaError extends Error {
  constructor(
    message = "Storage quota exceeded",
    public readonly key?: string,
  ) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

function logStorageWarning(op: string, key: string, err: unknown): void {
  if (__DEV__) {
    console.warn(
      `[storage] ${op} failed for key "${key}":`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch (err) {
    logStorageWarning("stringify", "(inline)", err);
    return null;
  }
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    logStorageWarning("parse", "(inline)", err);
    return null;
  }
}

export const storage = {
  // ── Senkron okuma (tema gibi ilk render'da anında çalışır) ──────────────────

  getStringSync(key: string): string | null {
    try {
      return mmkv.getString(key) ?? null;
    } catch (err) {
      logStorageWarning("getString", key, err);
      return null;
    }
  },

  getJSONSync<T>(key: string, defaultValue: T | null = null): T | null {
    const raw = this.getStringSync(key);
    if (!raw) return defaultValue;
    return safeParse<T>(raw) ?? defaultValue;
  },

  // ── Async wrapper'lar (mevcut hook'larla geriye dönük uyumlu) ───────────────

  async getString(key: string): Promise<string | null> {
    return this.getStringSync(key);
  },

  async setString(key: string, value: string): Promise<void> {
    try {
      mmkv.set(key, value);
    } catch (err) {
      logStorageWarning("setString", key, err);
    }
  },

  async getJSON<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
    return this.getJSONSync(key, defaultValue);
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    const serialized = safeStringify(value);
    if (serialized === null) {
      logStorageWarning("stringify", key, new Error("JSON.stringify returned null"));
      return;
    }
    try {
      mmkv.set(key, serialized);
    } catch (err) {
      logStorageWarning("setJSON", key, err);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      mmkv.delete(key);
    } catch (err) {
      logStorageWarning("removeItem", key, err);
    }
  },

  async removeMany(keys: string[]): Promise<void> {
    try {
      keys.forEach(k => mmkv.delete(k));
    } catch (err) {
      logStorageWarning("multiRemove", keys.join(","), err);
    }
  },
};

export async function getFavorites(): Promise<string[]> {
  return (await storage.getJSON<string[]>(STORAGE_KEYS.favorites, [])) ?? [];
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
  return (await storage.getJSON<Record<string, string>>(STORAGE_KEYS.notes, {})) ?? {};
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
