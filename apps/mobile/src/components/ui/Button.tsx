import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../hooks/useColors";
import { radius, type IoniconName } from "./tokens";

export type ButtonProps = {
  label?: string;
  onPress: () => void;
  /** primary: dolgulu yeşil · secondary: hafif zemin + ince çerçeve · ghost: yalnız metin */
  variant?: "primary" | "secondary" | "ghost";
  /** ghost için: default (ikincil metin), accent (yeşil bağlantı), danger (kırmızı) */
  tone?: "default" | "accent" | "danger";
  icon?: IoniconName;
  trailingIcon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/** Uygulamanın tek düğmesi (Seçenek A: 14 dp köşeli birincil, çerçeveli ikincil, renkli metin düğmesi). */
export function Button({ label, onPress, variant = "primary", tone = "default", icon, trailingIcon, disabled = false, loading = false,
  fullWidth = false, accessibilityLabel, accessibilityHint, style }: ButtonProps) {
  const c = useColors();
  const primary = variant === "primary", ghost = variant === "ghost", inactive = disabled && !loading;
  const color = inactive ? c.textMuted
    : primary ? c.actionText
    : tone === "danger" ? c.errorText
    : tone === "accent" ? (c.isDark ? c.accent : c.actionBg)
    : ghost ? c.textSecondary : c.text;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint} accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[s.base, {
        minHeight: primary ? 52 : 48,
        paddingHorizontal: label ? (primary ? 20 : ghost ? 12 : 16) : 0,
        borderRadius: primary ? radius.lg : ghost ? 10 : radius.md,
        backgroundColor: inactive && !ghost ? c.cardAlt : primary ? c.actionBg : ghost ? undefined : c.cardAlt,
        borderWidth: variant === "secondary" || (primary && inactive) ? 1 : 0, borderColor: c.border,
        opacity: inactive && !primary ? 0.55 : 1,
      }, fullWidth && { alignSelf: "stretch" }, style]}>
      {({ pressed }) => <>
        {pressed && <View pointerEvents="none" style={[StyleSheet.absoluteFill,
          { backgroundColor: primary ? c.actionText : c.actionBg, opacity: primary ? 0.1 : 0.08 }]} />}
        {loading && <ActivityIndicator color={color} accessible={false} />}
        {icon && <Ionicons name={icon} size={primary ? 20 : 18} color={color} accessible={false} importantForAccessibility="no" />}
        {label != null && <Text style={{ flexShrink: 1, textAlign: "center", color, fontSize: primary ? 16 : 14,
          lineHeight: primary ? 24 : 20, fontWeight: primary ? "700" : "600" }}>{label}</Text>}
        {trailingIcon && <Ionicons name={trailingIcon} size={18} color={color} accessible={false} importantForAccessibility="no" />}
      </>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minWidth: 48, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
