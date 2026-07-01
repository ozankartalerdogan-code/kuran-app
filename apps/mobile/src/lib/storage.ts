/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MMKV as MMKVType } from "react-native-mmkv";

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
  onboarding:      "onboarding_completed",
  appTour:         "app_tour_completed",
} as const;

// ── MMKV — güvenli (build-gated) yükleme ───────────────────────────────────────
// MMKV native modüldür; yeni bir dev/prod build gelene kadar (Expo Go veya
// mmkv'siz build) require başarısız olur. Bu durumda mmkv=null kalır ve tüm
// işlemler eskisi gibi AsyncStorage'a düşer → uygulama çökmez, geri dönüşlüdür.
let mmkv: MMKVType | null = null;
try {
  const { MMKV } = require("react-native-mmkv");
  mmkv = new MMKV();
} catch {
  mmkv = null;
}

export const usingMmkv = mmkv !== null;

// ── AsyncStorage → MMKV tek seferlik migrasyon ─────────────────────────────────
// Kullanıcının favori/not/ilerleme verisi eskiden AsyncStorage'daydı. MMKV ayrı
// bir depo olduğu için ilk açılışta bu anahtarları taşırız (yalnız kullanıcı
// verisi; cache_* anahtarları zaten yeniden çekilir, taşınmaz).
const MIGRATION_FLAG = "__mmkv_migrated_v1";
let migrated = mmkv?.getBoolean(MIGRATION_FLAG) ?? false;
let migrationPromise: Promise<void> | null = null;

export function runMigration(): Promise<void> {
  const m = mmkv;
  if (!m || migrated) return Promise.resolve();
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) {
        if (v != null && !m.contains(k)) m.set(k, v);
      }
    } catch (err) {
      logStorageWarning("migrate", "(all)", err);
    } finally {
      m.set(MIGRATION_FLAG, true);
      migrated = true;
    }
  })();
  return migrationPromise;
}

// Modül yüklenince migrasyonu başlat (fire-and-forget). Async okumalar migrasyon
// bitene kadar ayrıca AsyncStorage'a düşerek boş-ilk-açılış sorununu önler.
runMigration();

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
  // Senkron okuma — yalnız MMKV varken gerçek değer döner (tema/gece modu gibi
  // ilk-boyama anahtarları için). MMKV yoksa null (AsyncStorage sync okuyamaz).
  getStringSync(key: string): string | null {
    if (mmkv) return mmkv.getString(key) ?? null;
    return null;
  },

  getJSONSync<T>(key: string, defaultValue: T | null = null): T | null {
    const raw = this.getStringSync(key);
    if (!raw) return defaultValue;
    return safeParse<T>(raw) ?? defaultValue;
  },

  async getString(key: string): Promise<string | null> {
    if (mmkv) {
      const v = mmkv.getString(key);
      if (v != null) return v;
      // Migrasyon henüz bitmediyse eski veriyi AsyncStorage'dan getir.
      if (!migrated) {
        await runMigration();
        return mmkv.getString(key) ?? null;
      }
      return null;
    }
    return AsyncStorage.getItem(key);
  },

  async setString(key: string, value: string): Promise<void> {
    if (mmkv) { mmkv.set(key, value); return; }
    await AsyncStorage.setItem(key, value);
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
    if (mmkv) { mmkv.remove(key); return; }
    await AsyncStorage.removeItem(key);
  },

  async removeMany(keys: string[]): Promise<void> {
    if (mmkv) { keys.forEach((k) => mmkv!.remove(k)); return; }
    await AsyncStorage.multiRemove(keys);
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
