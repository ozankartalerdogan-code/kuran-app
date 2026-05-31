import { useColorScheme } from "react-native";
import { useState, useEffect } from "react";
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
  bg:            "#f7f1e4",
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

// Modül seviyesinde override — tüm useColors çağrıları bu değeri okur
let override: "light" | "dark" | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export function toggleTheme() {
  const next = override === "dark" ? "light" : "dark";
  override = next;
  storage.setJSON(STORAGE_KEYS.nightMode, next).catch(() => {});
  notify();
}

export function useColors(): AppColors {
  const system = useColorScheme() ?? "light";
  const [, tick] = useState(0);

  // Override'ı AsyncStorage'dan yükle (ilk render)
  useEffect(() => {
    storage.getJSON<"light" | "dark">(STORAGE_KEYS.nightMode)
      .then(v => { if (v && v !== override) { override = v; tick(n => n + 1); } })
      .catch(() => {});
  }, []);

  // Global toggle event'lerini dinle
  useEffect(() => {
    const fn = () => tick(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const scheme = override ?? system;
  return scheme === "dark" ? dark : light;
}
