import { useState, useEffect, useCallback } from "react";
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

    // Functional update: React'in en güncel state'ini kullanır, hızlı çift tıklamada
    // her çağrı kendi snapshot'ını alır — storage race condition önlenir.
    let resolvedNext: string[] = [];
    let resolvedNewIsFav = false;

    setFavorites((prev) => {
      const isFav = prev.includes(verseKey);
      resolvedNewIsFav = !isFav;
      resolvedNext = isFav ? prev.filter((k) => k !== verseKey) : [...prev, verseKey];
      return resolvedNext;
    });

    try {
      await storage.setJSON(STORAGE_KEYS.favorites, resolvedNext);
      return resolvedNewIsFav;
    } catch (err) {
      // Storage yazma başarısız → state'i storage'dan geri yükle
      await load();
      if (err instanceof StorageQuotaError) {
        setError("Depolama alanı dolu, favori güncellenemedi.");
      } else {
        setError(err instanceof Error ? err.message : "Favori güncellenemedi");
      }
      return !resolvedNewIsFav;
    }
  }, [load]);

  /** Belirli bir ayet favori mi? */
  const isFavorite = useCallback(
    (verseKey: string) => favorites.includes(verseKey),
    [favorites],
  );

  /** Tüm favorileri tek seferde sil (forEach yarış koşulu olmadan) */
  const clearAll = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      await storage.setJSON(STORAGE_KEYS.favorites, []);
      setFavorites([]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Favoriler silinemedi");
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { favorites, isFavorite, toggle, clearAll, loaded, loading, error, refresh };
}
