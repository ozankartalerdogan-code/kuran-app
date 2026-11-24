import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  favorites:       "favoriteVerses",
  notes:           "verseNotes",
  streak:          "readingStreak",
  mushafBookmark:  "mushaf_bookmark",
  mushafPage:      "mushaf_son_sayfa",
  nightMode:       "nightMode",
  elifbaProgress:  "elifbaProgress",
  quizScores:      "elifbaQuizScores",
  elifbaSrs:       "elifbaSrs",
  recentSearches:  "recentSearches",
  prayerCache:     "prayerTimesCache",
  derslerProgress: "derslerProgress",
  onboarding:      "onboarding_completed",
  onboardingStarted: "onboarding_started",
  appTour:         "app_tour_completed",
  guideState:      "app_guide_state",
  startPreference: "start_preference",
  contextualHints: "contextual_hints_seen",
  hatimTracking:   "hatimTakibi",
  tajweed:         "tajweedEnabled",
  ayahFontScale:   "ayahFontScale",
  surahArabic:     "surahArabicEnabled",
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

// ── Değişiklik dinleyicisi (bulut yedek tetikleyicisi) ────────────────────────
// cloudBackup.ts kendini buraya kaydeder; storage bu modülü import ETMEZ
// (dairesel bağımlılık olmasın). Dinleyici hatası yazmayı asla engellemez.
type StorageChangeListener = (key: string) => void;
let changeListener: StorageChangeListener | null = null;
export function setStorageChangeListener(fn: StorageChangeListener | null): void {
  changeListener = fn;
}
function notifyChange(key: string): void {
  try { changeListener?.(key); } catch (err) { logStorageWarning("notify", key, err); }
}

export const storage = {
  async getString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
    notifyChange(key);
  },

  async getJSON<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const raw = await this.getString(key);
    if (!raw) return defaultValue;
    return safeParse<T>(raw) ?? defaultValue;
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    const serialized = safeStringify(value);
    if (serialized === null) {
      logStorageWarning("stringify", key, new Error("JSON.stringify returned null"));
      return;
    }
    await this.setString(key, serialized);
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    notifyChange(key);
  },

  async removeMany(keys: string[]): Promise<void> {
    await AsyncStorage.multiRemove(keys);
    keys.forEach(notifyChange);
  },
};

