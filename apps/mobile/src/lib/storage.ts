import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage tabanlı basit typed storage — @quran-app/storage bağımlılığı olmadan

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
} as const;

/** Kota aşımı durumunda fırlatılan özel hata */
export class StorageQuotaError extends Error {
  constructor(
    message = "Storage quota exceeded",
    public readonly key?: string,
  ) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

/** QuotaExceededError benzeri kalıpları yakala */
function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("storage full") ||
    msg.includes("disk full") ||
    msg.includes("exceeded") ||
    msg.includes("no space") ||
    msg.includes("space left")
  );
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
  /** Ham string oku — null döner, hata fırlatmaz */
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      logStorageWarning("getItem", key, err);
      return null;
    }
  },

  /** Ham string yaz — QuotaExceeded durumunda StorageQuotaError fırlatır */
  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      if (isQuotaError(err)) {
        throw new StorageQuotaError(undefined, key);
      }
      logStorageWarning("setItem", key, err);
    }
  },

  /** JSON olarak oku — parse hatasında defaultValue, null hiç yoksa defaultValue döner */
  async getJSON<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val === null || val === undefined) return defaultValue;
      const parsed = safeParse<T>(val);
      return parsed !== null ? parsed : defaultValue;
    } catch (err) {
      logStorageWarning("getJSON", key, err);
      return defaultValue;
    }
  },

  /** JSON olarak yaz — QuotaExceeded durumunda StorageQuotaError fırlatır, stringify hatasını yutar */
  async setJSON<T>(key: string, value: T): Promise<void> {
    const serialized = safeStringify(value);
    if (serialized === null) {
      logStorageWarning("stringify", key, new Error("JSON.stringify returned null"));
      return;
    }
    try {
      await AsyncStorage.setItem(key, serialized);
    } catch (err) {
      if (isQuotaError(err)) {
        throw new StorageQuotaError(undefined, key);
      }
      logStorageWarning("setJSON", key, err);
    }
  },

  /** Anahtar sil */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      logStorageWarning("removeItem", key, err);
    }
  },

  /** Birden fazla anahtarı aynı anda sil */
  async removeMany(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
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
