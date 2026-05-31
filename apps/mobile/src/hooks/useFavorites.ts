import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS, StorageQuotaError } from "../lib/storage";

export interface UseFavoritesResult {
  favorites: string[];
  isFavorite: (verseKey: string) => boolean;
  toggle: (verseKey: string) => Promise<boolean>;
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storage.getJSON<string[]>(STORAGE_KEYS.favorites, []);
      setFavorites(isValidStringArray(data) ? data : []);
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

  /** Favori ekle ya da çıkar — yeni favori durumunu döner */
  const toggle = useCallback(async (verseKey: string): Promise<boolean> => {
    setError(null);
    const current =
      (await storage.getJSON<string[]>(STORAGE_KEYS.favorites, [])) ?? [];
    const safe = isValidStringArray(current) ? current : [];
    const isFav = safe.includes(verseKey);
    const next = isFav
      ? safe.filter((k) => k !== verseKey)
      : [...safe, verseKey];
    try {
      await storage.setJSON(STORAGE_KEYS.favorites, next);
      setFavorites(next);
      return !isFav;
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setError("Depolama alanı dolu, favori güncellenemedi.");
      } else {
        const msg = err instanceof Error ? err.message : "Favori güncellenemedi";
        setError(msg);
      }
      return isFav; // değişiklik başarısız, eski durum
    }
  }, []);

  /** Belirli bir ayet favori mi? */
  const isFavorite = useCallback(
    (verseKey: string) => favorites.includes(verseKey),
    [favorites],
  );

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { favorites, isFavorite, toggle, loaded, loading, error, refresh };
}
