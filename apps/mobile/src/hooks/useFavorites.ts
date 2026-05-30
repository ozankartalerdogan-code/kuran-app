import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded]       = useState(false);

  // İlk yüklemede AsyncStorage'dan oku
  useEffect(() => {
    storage
      .getJSON<string[]>(STORAGE_KEYS.favorites)
      .then((data) => {
        setFavorites(data ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  /** Favori ekle ya da çıkar — yeni favori durumunu döner */
  const toggle = useCallback(async (verseKey: string): Promise<boolean> => {
    const current =
      (await storage.getJSON<string[]>(STORAGE_KEYS.favorites)) ?? [];
    const isFav = current.includes(verseKey);
    const next  = isFav
      ? current.filter((k) => k !== verseKey)
      : [...current, verseKey];
    await storage.setJSON(STORAGE_KEYS.favorites, next);
    setFavorites(next);
    return !isFav; // yeni durum
  }, []);

  /** Belirli bir ayet favori mi? */
  const isFavorite = useCallback(
    (verseKey: string) => favorites.includes(verseKey),
    [favorites],
  );

  return { favorites, isFavorite, toggle, loaded };
}
