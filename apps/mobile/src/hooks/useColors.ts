import { Appearance, Platform, useColorScheme } from "react-native";
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
  successText: string;
  accentLight: string;
  actionBg: string;
  actionText: string;
  overlay: string;
  tourOverlay: string;
  goldText: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  noteBg: string;
  noteBorder: string;
  noteText: string;
  greenBg: string;
  greenBorder: string;
  greenText: string;
  emeraldBg: string;
  emeraldBorder: string;
  emeraldText: string;
  amberBg: string;
  amberBorder: string;
  amberText: string;
  orangeBg: string;
  orangeBorder: string;
  orangeText: string;
  skyBg: string;
  skyBorder: string;
  skyText: string;
  blueBg: string;
  blueText: string;
  violetBg: string;
  violetText: string;
  neutralBadgeBg: string;
  neutralBadgeText: string;
  isDark: boolean;
};

// Kart/kenarlık mushafın "kâğıt" tonlarıyla aynı (bkz. mushaf-sayfa kagit):
// beyaz yerine krem kâğıt — tüm ekranlar aynı sıcak dokuyu paylaşır.
const light: AppColors = {
  bg:               "#f5f0e8",
  card:             "#fffdf6",
  cardAlt:          "#f5f0e8",
  border:           "#e7dfcc",
  text:             "#1c1917",
  textSecondary:    "#44403c",
  textMuted:        "#78716c",
  accent:           "#059669",
  successText:      "#166534",
  accentLight:      "#d1fae5",
  actionBg:         "#047857",
  actionText:       "#ffffff",
  overlay:          "rgba(5,10,20,0.65)",
  tourOverlay:      "rgba(5,10,20,0.65)",
  goldText:         "#92400e",
  errorBg:          "#fef2f2",
  errorBorder:      "#fca5a5",
  errorText:        "#b91c1c",
  noteBg:           "#fff7ed",
  noteBorder:       "#fdba74",
  noteText:         "#9a3412",
  greenBg:          "#f0fdf4",
  greenBorder:      "#86efac",
  greenText:        "#15803d",
  emeraldBg:        "#d1fae5",
  emeraldBorder:    "#6ee7b7",
  emeraldText:      "#065f46",
  amberBg:          "#fffbeb",
  amberBorder:      "#fcd34d",
  amberText:        "#b45309",
  orangeBg:         "#fff7ed",
  orangeBorder:     "#fdba74",
  orangeText:       "#c2410c",
  skyBg:            "#f0f9ff",
  skyBorder:        "#7dd3fc",
  skyText:          "#0369a1",
  blueBg:           "#eff6ff",
  blueText:         "#1d4ed8",
  violetBg:         "#ede9fe",
  violetText:       "#6d28d9",
  neutralBadgeBg:   "#f1f5f9",
  neutralBadgeText: "#475569",
  isDark:           false,
};

const dark: AppColors = {
  bg:               "#0f0f0f",
  card:             "#1c1917",
  cardAlt:          "#292524",
  border:           "#44403c",
  text:             "#fafaf9",
  textSecondary:    "#d6d3d1",
  textMuted:        "#a8a29e",
  accent:           "#10b981",
  successText:      "#86efac",
  accentLight:      "#064e3b",
  actionBg:         "#10b981",
  actionText:       "#052e21",
  overlay:          "rgba(0,0,0,0.72)",
  tourOverlay:      "rgba(0,0,0,0.48)",
  goldText:         "#c9a84c",
  errorBg:          "#450a0a",
  errorBorder:      "#7f1d1d",
  errorText:        "#fca5a5",
  noteBg:           "#431407",
  noteBorder:       "#c2410c",
  noteText:         "#fdba74",
  greenBg:          "#052e16",
  greenBorder:      "#16a34a",
  greenText:        "#86efac",
  emeraldBg:        "#064e3b",
  emeraldBorder:    "#059669",
  emeraldText:      "#a7f3d0",
  amberBg:          "#451a03",
  amberBorder:      "#b45309",
  amberText:        "#fcd34d",
  orangeBg:         "#431407",
  orangeBorder:     "#c2410c",
  orangeText:       "#fdba74",
  skyBg:            "#082f49",
  skyBorder:        "#0284c7",
  skyText:          "#7dd3fc",
  blueBg:           "#172554",
  blueText:         "#93c5fd",
  violetBg:         "#2e1065",
  violetText:       "#c4b5fd",
  neutralBadgeBg:   "#334155",
  neutralBadgeText: "#e2e8f0",
  isDark:           true,
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

// Kayıtlı tema paylaşılan depolama katmanından bir kez yüklenir.
function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  // Başlangıçta sistem teması kullanılır; kayıtlı tercih AsyncStorage'dan yüklenir.
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
  storage.setJSON(STORAGE_KEYS.nightMode, next).then(() => {
    if (Platform.OS !== "android") return;
    // Lazy import avoids loading widget modules on iOS or creating import cycles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { refreshWidgetNow, refreshPrayerWidgetsNow } = require("../widgets/widgetRefresh") as typeof import("../widgets/widgetRefresh");
    return Promise.all([refreshWidgetNow(), refreshPrayerWidgetsNow()]);
  }).catch(() => {});
  notify();
}

export function useColors(): AppColors {
  ensureLoaded();
  const system = useColorScheme() ?? "light";
  const ov = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const scheme = ov ?? system;
  return scheme === "dark" ? dark : light;
}
