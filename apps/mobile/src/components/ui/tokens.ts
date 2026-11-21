import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { AppColors } from "../../hooks/useColors";

/** Tasarım sistemi (denetim G paketi, 21 Kasım 2026): boşluk, yazı ve kategori tonları. */
export type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** 4'ün katı boşluk ölçeği. Ekran kenar boşluğu her yerde `space.gutter` (16). */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, gutter: 16 } as const;

/** Köşe yarıçapları. */
export const radius = { sm: 8, md: 12, lg: 14, pill: 999 } as const;

/** Arayüz yazı ölçeği (Arapça metinler kullanıcının yazı boyutu ayarına bağlı kalır). */
export const type = {
  display: { fontSize: 26, lineHeight: 32, fontWeight: "800" },
  title: { fontSize: 19, lineHeight: 24, fontWeight: "700" },
  cardTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "400" },
  label: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 0.6 },
} as const;

/** Kategori tonları — en fazla 5. İkon dairesi zemini + ikon rengi. */
export type Tone = "emerald" | "amber" | "sky" | "violet" | "neutral";

const TONES: Record<Tone, { light: [string, string]; dark: [string, string] }> = {
  emerald: { light: ["#dcfce7", "#15803d"], dark: ["#14532d", "#86efac"] },
  amber: { light: ["#fef3c7", "#b45309"], dark: ["#78350f", "#fde68a"] },
  sky: { light: ["#dbeafe", "#1d4ed8"], dark: ["#1e3a8a", "#93c5fd"] },
  violet: { light: ["#ede9fe", "#6d28d9"], dark: ["#4c1d95", "#c4b5fd"] },
  neutral: { light: ["#e7e5e4", "#44403c"], dark: ["#44403c", "#e7e5e4"] },
};

export function toneColors(c: AppColors, tone: Tone): { bg: string; fg: string } {
  const [bg, fg] = TONES[tone][c.isDark ? "dark" : "light"];
  return { bg, fg };
}

/** Bilgi kutusu tonları → mevcut useColors üçlüleri. */
export type CalloutTone = "info" | "warning" | "success" | "error" | "neutral";

export function calloutColors(c: AppColors, tone: CalloutTone): { bg: string; border: string; text: string; icon: IoniconName } {
  switch (tone) {
    case "info": return { bg: c.skyBg, border: c.skyBorder, text: c.skyText, icon: "information-circle-outline" };
    case "warning": return { bg: c.amberBg, border: c.amberBorder, text: c.amberText, icon: "warning-outline" };
    case "success": return { bg: c.greenBg, border: c.greenBorder, text: c.greenText, icon: "checkmark-circle-outline" };
    case "error": return { bg: c.errorBg, border: c.errorBorder, text: c.errorText, icon: "alert-circle-outline" };
    default: return { bg: c.cardAlt, border: c.border, text: c.textSecondary, icon: "information-circle-outline" };
  }
}

/**
 * Ana Sayfa'nın öne çıkan kartları (seri, Günün Ayeti, namaz vakitleri, Günün Duası).
 * Renkler ekranlara dağılmasın diye tek yerde; her biri açık/koyu temada AA kontrastlı.
 */
const FEATURE = {
  streak: {
    light: { bg: "#fff7ed", border: "#fed7aa", badge: "#ffedd5", title: "#9a3412", sub: "#c2410c", icon: "#f97316" },
    dark: { bg: "#431407", border: "#7c2d12", badge: "#7c2d12", title: "#fb923c", sub: "#fdba74", icon: "#f97316" },
  },
  verse: {
    light: { bg: "#fffbeb", border: "#fcd34d", label: "#92400e", ref: "#a16207", arabic: "#78350f", body: "#451a03" },
    dark: { bg: "#1c1405", border: "#78350f", label: "#fbbf24", ref: "#d97706", arabic: "#fde68a", body: "#fef3c7" },
  },
  prayer: {
    light: { bg: "#eef2ff", border: "#a5b4fc", label: "#3730a3", icon: "#4338ca", strong: "#3730a3", chipBg: "#ffffff", chipBorder: "#e0e7ff",
      chipLabel: "#4f46e5", chipTime: "#312e81", active: "#4f46e5", body: "#4338ca" },
    dark: { bg: "#0f0a2a", border: "#3730a3", label: "#818cf8", icon: "#818cf8", strong: "#c7d2fe", chipBg: "#1e1b4b", chipBorder: "#3730a3",
      chipLabel: "#a5b4fc", chipTime: "#c7d2fe", active: "#4f46e5", body: "#c7d2fe" },
  },
  dua: {
    light: { bg: "#f0fdfa", border: "#5eead4", label: "#0f766e", ref: "#0f766e", arabic: "#134e4a", body: "#134e4a" },
    dark: { bg: "#042f2e", border: "#0f766e", label: "#2dd4bf", ref: "#14b8a6", arabic: "#99f6e4", body: "#ccfbf1" },
  },
} as const;

export function featureColors(c: AppColors) {
  const k = c.isDark ? "dark" : "light";
  return { streak: FEATURE.streak[k], verse: FEATURE.verse[k], prayer: FEATURE.prayer[k], dua: FEATURE.dua[k] };
}
