import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "../../hooks/useColors";
import { caps, getLang } from "../../i18n";
import { radius, space, toneColors, type IoniconName, type Tone } from "./tokens";

/* ── Rozet ─────────────────────────────────────────────────────────────── */
export function Badge({ label, tone = "neutral", style }: { label: string; tone?: Tone | "error"; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const k = tone === "error" ? { bg: c.errorBg, fg: c.errorText } : toneColors(c, tone);
  return (
    <View style={[s.badge, { backgroundColor: k.bg }, style]}>
      <Text style={[s.badgeText, { color: k.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ── Sekme / filtre ────────────────────────────────────────────────────── */
export type TabItem<T extends string> = { key: T; label: string; icon?: IoniconName; accessibilityLabel?: string };

/** segmented: 2–3 seçenekli ekran içi geçiş · pill: 4+ seçenek veya kaydırmalı filtre */
export function Tabs<T extends string>({ items, value, onChange, variant = "segmented", style }: {
  items: TabItem<T>[]; value: T; onChange: (key: T) => void; variant?: "segmented" | "pill"; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const segmented = variant === "segmented";
  return (
    <View accessibilityRole="tablist" style={[segmented ? [s.segWrap, { backgroundColor: c.cardAlt, borderColor: c.border }] : s.pillWrap, style]}>
      {items.map(item => {
        const active = item.key === value;
        const fg = active ? c.actionText : c.textSecondary;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} accessibilityRole="tab"
            accessibilityState={{ selected: active }} accessibilityLabel={item.accessibilityLabel ?? item.label}
            hitSlop={segmented ? undefined : { top: 2, bottom: 2 }}
            style={[segmented ? s.seg : [s.pill, { borderColor: active ? c.actionBg : c.border, backgroundColor: c.card }],
              active && { backgroundColor: c.actionBg }]}>
            {item.icon && <Ionicons name={item.icon} size={16} color={fg} accessible={false} importantForAccessibility="no" />}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}
              style={{ color: fg, fontSize: 13, fontWeight: active ? "700" : "600", flexShrink: 1 }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Geri ve Kapat ─────────────────────────────────────────────────────── */
/** Tek tip Geri (Seçenek A: yalnız ok, 48×48 dokunma alanı). */
export function BackButton({ onPress, accessibilityLabel, color }: { onPress?: () => void; accessibilityLabel?: string; color?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (getLang() === "en" ? "Back" : "Geri")} style={({ pressed }) => [s.round48, pressed && { backgroundColor: c.cardAlt }]}>
      <Ionicons name="arrow-back" size={24} color={color ?? c.text} accessible={false} importantForAccessibility="no" />
    </Pressable>
  );
}

/** Tek tip Kapat (Seçenek A: 36 dp hafif daire içinde ×, 48×48 dokunma alanı). */
export function CloseButton({ onPress, accessibilityLabel, style }: { onPress: () => void; accessibilityLabel?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (getLang() === "en" ? "Close" : "Kapat")}
      style={[s.round48, style]}>
      {({ pressed }) => (
        <View style={[s.closeCircle, { backgroundColor: c.cardAlt, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="close" size={20} color={c.textSecondary} accessible={false} importantForAccessibility="no" />
        </View>
      )}
    </Pressable>
  );
}

/* ── Başlıklar ─────────────────────────────────────────────────────────── */
export function ScreenHeading({ children }: { children: string }) {
  const c = useColors();
  return <Text accessibilityRole="header" style={[s.heading, { color: c.text }]}>{children}</Text>;
}

export function SectionHeader({ title, first = false }: { title: string; first?: boolean }) {
  const c = useColors();
  return (
    <View style={[s.sectionHeader, { borderBottomColor: c.border, marginTop: first ? 0 : space.lg }]}>
      <Text accessibilityRole="header" style={[s.sectionTitle, { color: c.textMuted }]}>{caps(title)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  segWrap: { flexDirection: "row", borderRadius: radius.md, borderWidth: 1, padding: 4, gap: 4 },
  seg: { flex: 1, minHeight: 40, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  pill: { minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6 },
  round48: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  closeCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 26, lineHeight: 32, fontWeight: "800", marginBottom: 20 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: space.xs, marginBottom: 10 },
  sectionTitle: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.6 },
});
