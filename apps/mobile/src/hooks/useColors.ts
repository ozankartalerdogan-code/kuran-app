import { Appearance, useColorScheme } from "react-native";
import { useSyncExternalStore } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

export type AppColors = {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  isDark: boolean;
};

const light: AppColors = {
  bg:            "#f5f0e8",
  card:          "#ffffff",
  cardAlt:       "#f5f0e8",
  border:        "#e7e5e4",
  text:          "#1c1917",
  textSecondary: "#44403c",
  textMuted:     "#78716c",
  accent:        "#059669",
  accentLight:   "#d1fae5",
  isDark:        false,
};

const dark: AppColors = {
  bg:            "#0f0f0f",
  card:          "#1c1917",
  cardAlt:       "#292524",
  border:        "#44403c",
  text:          "#fafaf9",
  textSecondary: "#d6d3d1",
  textMuted:     "#a8a29e",
  accent:        "#10b981",
  accentLight:   "#064e3b",
  isDark:        true,
};

// Modül seviyesinde override — tüm useColors çağrıları bu değeri okur.
// useSyncExternalStore ile paylaşılan store: her bileşen kendi AsyncStorage
// okumasını/effect'ini kurmaz; tema bir kez yüklenir, değişimler yayınlanır.
let override: "light" | "dark" | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

// Persisted theme is loaded once through the shared storage adapter.
function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  // Önce senkron dene (MMKV) — tema İLK boyamadan önce hazır olsun. Async'e
  // kalırsa ilk kareler açık temayla çizilir: karanlık modda skeleton/yükleme
  // ekranı beyaz yanıp söner.
  const sync = storage.getJSONSync<"light" | "dark">(STORAGE_KEYS.nightMode);
  if (sync) {
    override = sync;
    return;
  }
  // MMKV yoksa (Expo Go / eski build) AsyncStorage'dan asenkron yükle.
  storage
    .getJSON<"light" | "dark">(STORAGE_KEYS.nightMode)
    .then((value) => {
      if (value && value !== override) {
        override = value;
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
  return override;
}

export function toggleTheme() {
  // Görünen (efektif) temayı çevir — yalnız override'a bakılsaydı, sistem teması
  // karanlık + override yokken ilk basış override="dark" yapar ve hiçbir şey
  // değişmezdi (düğme "bozuk" hissederdi).
  const effective = override ?? (Appearance.getColorScheme() ?? "light");
  const next = effective === "dark" ? "light" : "dark";
  override = next;
  storage.setJSON(STORAGE_KEYS.nightMode, next).catch(() => {});
  notify();
}

export function useColors(): AppColors {
  ensureLoaded();
  const system = useColorScheme() ?? "light";
  const ov = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const scheme = ov ?? system;
  return scheme === "dark" ? dark : light;
}
