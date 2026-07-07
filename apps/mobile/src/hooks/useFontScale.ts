import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

// Okuma yazı boyutu (A− / A+) — ayet detayı ve mushaf AYNI anahtarı paylaşır:
// kullanıcı bir ekranda büyütünce diğerinde de büyük görür (tek tercih).
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.15;

export function useFontScale() {
  const [fontScale, setFontScale] = useState(() => {
    const v = Number(storage.getStringSync(STORAGE_KEYS.ayahFontScale));
    return v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX ? v : 1;
  });

  // AsyncStorage fallback'inde senkron okuma boş dönebilir → asenkron tamamla.
  useEffect(() => {
    let alive = true;
    storage.getString(STORAGE_KEYS.ayahFontScale).then((raw) => {
      const v = Number(raw);
      if (alive && v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX) setFontScale(v);
    });
    return () => { alive = false; };
  }, []);

  const changeFontScale = useCallback((delta: number) => {
    setFontScale((prev) => {
      const next = Math.round(
        Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, prev + delta)) * 100,
      ) / 100;
      storage.setString(STORAGE_KEYS.ayahFontScale, String(next));
      return next;
    });
  }, []);

  return { fontScale, changeFontScale };
}
