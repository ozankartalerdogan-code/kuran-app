import { useSyncExternalStore } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

// Okuma yazı boyutu (A− / A+) — ayet detayı ve mushaf AYNI anahtarı paylaşır:
// kullanıcı bir ekranda büyütünce diğerinde de büyük görür (tek tercih).
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.15;

// Modül düzeyinde paylaşılan store (useColors ile aynı desen). Yerel useState
// olsaydı her bileşen kendi kopyasını tutardı: mushafta A−/A+ düğmeleri üst
// barda, metin ayrı (memo'lu) sayfa bileşeninde — düğme yalnız kendi kopyasını
// günceller, açık sayfa hiç yeniden çizilmezdi.
let scale = (() => {
  const v = Number(storage.getStringSync(STORAGE_KEYS.ayahFontScale));
  return v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX ? v : 1;
})();
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

// AsyncStorage fallback'inde senkron okuma boş döner → asenkron tamamla.
function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  storage
    .getString(STORAGE_KEYS.ayahFontScale)
    .then((raw) => {
      const v = Number(raw);
      if (v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX && v !== scale) {
        scale = v;
        notify();
      }
    })
    .catch(() => {});
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function getSnapshot() {
  return scale;
}

export function changeFontScale(delta: number) {
  const next =
    Math.round(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale + delta)) * 100) / 100;
  if (next === scale) return;
  scale = next;
  storage.setString(STORAGE_KEYS.ayahFontScale, String(next)).catch(() => {});
  notify();
}

export function useFontScale() {
  ensureLoaded();
  const fontScale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { fontScale, changeFontScale };
}
