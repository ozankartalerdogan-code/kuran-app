import { useState, useEffect, useCallback, useRef } from "react";
import { storage, STORAGE_KEYS, StorageQuotaError } from "../lib/storage";

export interface UseFavoritesResult {
  favorites: string[];
  isFavorite: (verseKey: string) => boolean;
  toggle: (verseKey: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** undefined/null güvenli string array validator */
function isValidStringArray(data: unknown): data is string[] {
  if (!Array.isArray(data)) return false;
  return data.every((item) => typeof item === "string");
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const favoritesRef = useRef<string[]>([]);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storage.getJSON<string[]>(STORAGE_KEYS.favorites, []);
      const nextFavorites = isValidStringArray(data) ? data : [];
      favoritesRef.current = nextFavorites;
      setFavorites(nextFavorites);
      setLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Favoriler yüklenemedi";
      setError(msg);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const queuePersist = useCallback((next: string[]) => {
    const queuedWrite = writeQueueRef.current
      .catch(() => {})
      .then(() => storage.setJSON(STORAGE_KEYS.favorites, next));
    writeQueueRef.current = queuedWrite;
    return queuedWrite;
  }, []);

  /** Favori ekle ya da çıkar — yeni favori durumunu döner */
  const toggle = useCallback(async (verseKey: string): Promise<boolean> => {
    setError(null);

    const current = favoritesRef.current;
    const wasFavorite = current.includes(verseKey);
    const next = wasFavorite
      ? current.filter((k) => k !== verseKey)
      : [...current, verseKey];

    favoritesRef.current = next;
    setFavorites(next);

    try {
      await queuePersist(next);
      return !wasFavorite;
    } catch (err) {
      await writeQueueRef.current.catch(() => {});
      await load();
      if (err instanceof StorageQuotaError) {
        setError("Depolama alanı dolu, favori güncellenemedi.");
      } else {
        setError(err instanceof Error ? err.message : "Favori güncellenemedi");
      }
      return wasFavorite;
    }
  }, [load, queuePersist]);

  /** Belirli bir ayet favori mi? */
  const isFavorite = useCallback(
    (verseKey: string) => favorites.includes(verseKey),
    [favorites],
  );

  /** Tüm favorileri tek seferde sil */
  const clearAll = useCallback(async (): Promise<boolean> => {
    setError(null);
    favoritesRef.current = [];
    setFavorites([]);
    try {
      await queuePersist([]);
      return true;
    } catch (err) {
      await writeQueueRef.current.catch(() => {});
      await load();
      setError(err instanceof Error ? err.message : "Favoriler silinemedi");
      return false;
    }
  }, [load, queuePersist]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { favorites, isFavorite, toggle, clearAll, loaded, loading, error, refresh };
}
