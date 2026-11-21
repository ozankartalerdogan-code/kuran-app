import type { ReactNode, Ref } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../hooks/useColors";
import { calloutColors, radius, space, toneColors, type CalloutTone, type IoniconName, type Tone } from "./tokens";

/** Tur hedefi (useTourTarget) gibi ref taşıyan sarmalayıcılar için. */
type TargetProps = { ref?: Ref<View>; collapsable?: false };

export type MenuCardProps = TargetProps & {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
  iconTone?: Tone;
  /** Öne çıkan kart: altın (Dersler, Günün Ayeti) veya yeşil */
  highlight?: "gold" | "emerald";
  trailing?: "chevron" | "none" | ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Menü / içerik kartı (Seçenek A: 14 dp köşe, 1 dp kenarlık, gölgesiz). */
export function MenuCard({ ref, collapsable, title, subtitle, icon, iconTone = "neutral", highlight, trailing = "chevron", onPress,
  accessibilityLabel, accessibilityHint, children, style }: MenuCardProps) {
  const c = useColors();
  const tone = toneColors(c, highlight === "gold" ? "amber" : highlight === "emerald" ? "emerald" : iconTone);
  const bg = highlight === "gold" ? c.amberBg : highlight === "emerald" ? c.greenBg : c.card;
  const border = highlight === "gold" ? c.amberBorder : highlight === "emerald" ? c.greenBorder : c.border;
  const titleColor = highlight === "gold" ? c.goldText : highlight === "emerald" ? c.greenText : c.text;
  const body = <>
    <View style={s.row}>
      {icon && <View style={[s.iconWrap, { backgroundColor: tone.bg }]}>
        <Ionicons name={icon} size={20} color={tone.fg} accessible={false} importantForAccessibility="no" />
      </View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.title, { color: titleColor }]}>{title}</Text>
        {subtitle ? <Text style={[s.sub, { color: c.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {trailing === "chevron" ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
        : trailing === "none" ? null : trailing}
    </View>
    {children}
  </>;
  const boxStyle = [s.card, { backgroundColor: bg, borderColor: border }, style];
  if (!onPress) return <View ref={ref} collapsable={collapsable} style={boxStyle}>{body}</View>;
  return (
    <Pressable ref={ref} collapsable={collapsable} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}: ${subtitle}` : title)} accessibilityHint={accessibilityHint}
      style={boxStyle}>
      {({ pressed }) => <>
        {pressed && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.actionBg, opacity: 0.08 }]} />}
        {body}
      </>}
    </Pressable>
  );
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Son satırda ayırıcı çizgi çizilmez */
  last?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Liste satırı (Seçenek A: düz satır + ince ayırıcı). */
export function ListRow({ title, subtitle, leading, trailing, onPress, accessibilityLabel, last, style }: ListRowProps) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}: ${subtitle}` : title)}
      style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? c.cardAlt : c.card },
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }, style]}>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowTitle, { color: c.text }]}>{title}</Text>
        {subtitle ? <Text style={[s.sub, { color: c.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export type CalloutProps = {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
  icon?: IoniconName | false;
  style?: StyleProp<ViewStyle>;
};

/** Bilgi / uyarı kutusu (Seçenek A: tonlu zemin + ince çerçeve). */
export function Callout({ tone = "info", title, children, icon, style }: CalloutProps) {
  const c = useColors();
  const k = calloutColors(c, tone);
  return (
    <View style={[s.callout, { backgroundColor: k.bg, borderColor: k.border }, style]}>
      {icon !== false && <Ionicons name={icon ?? k.icon} size={18} color={k.text} style={{ marginTop: 1 }} accessible={false} importantForAccessibility="no" />}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        {title ? <Text style={[s.calloutTitle, { color: k.text }]}>{title}</Text> : null}
        {typeof children === "string" ? <Text style={[s.calloutBody, { color: c.text }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, paddingVertical: 14, paddingHorizontal: space.md, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  listRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md },
  rowTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  callout: { flexDirection: "row", gap: 10, borderRadius: radius.md, borderWidth: 1, paddingVertical: space.sm, paddingHorizontal: 14 },
  calloutTitle: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  calloutBody: { fontSize: 13, lineHeight: 20 },
});
