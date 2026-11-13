import React, { useEffect, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useColors } from "../../hooks/useColors";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export const preferenceIcons = { read: "book-outline", understand: "reader-outline", letters: "school-outline" } as const;
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} accessible={false} importantForAccessibility="no" />;
}
export function Entrance({ children, style, active = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; active?: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = active ? withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System }) : 0; }, [active, progress]);
  const animation = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: 6 * (1 - progress.value) }] }));
  return <Animated.View style={[style, animation]}>{children}</Animated.View>;
}
export function SelectionSurface({ selected, disabled, children }: { selected: boolean; disabled: boolean; children: React.ReactNode }) {
  const c = useColors(), progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.value = withTiming(selected ? 1 : 0, { duration: 140, reduceMotion: ReduceMotion.System }); }, [selected, progress]);
  const animation = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], [c.card, c.accentLight]),
    borderColor: interpolateColor(progress.value, [0, 1], [c.border, c.actionBg]) }));
  return <Animated.View style={[{ minHeight: 68, padding: 14, borderRadius: 16, borderWidth: 2, flexDirection: "row", alignItems: "center", gap: 12 },
    animation, disabled && { backgroundColor: c.cardAlt, borderColor: c.border }]}>{children}</Animated.View>;
}
export function PressShade({ pressed, primary = false }: { pressed: boolean; primary?: boolean }) {
  const c = useColors();
  return pressed ? <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { backgroundColor: primary ? c.actionText : c.actionBg, opacity: primary ? 0.1 : 0.08 }]} /> : null;
}
export function PolishButton({ label, onPress, primary = false, textOnly = false, disabled = false, busy = false, icon, trailingIcon, style, accessibilityLabel }: {
  label?: string; onPress: () => void; primary?: boolean; textOnly?: boolean; disabled?: boolean; busy?: boolean;
  icon?: IconName; trailingIcon?: IconName; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const c = useColors(), inactive = disabled && !busy;
  const color = inactive ? c.textMuted : primary ? c.actionText : c.textSecondary;
  return <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: disabled || busy, busy }} style={[{ minWidth: 48, minHeight: primary ? 52 : 48,
      paddingHorizontal: label ? 16 : 0, paddingVertical: primary ? 14 : 12, borderRadius: primary ? 14 : 12,
      backgroundColor: inactive ? c.cardAlt : primary ? c.actionBg : textOnly ? undefined : c.cardAlt,
      borderWidth: !primary && !textOnly ? 1 : 0, borderColor: c.border, overflow: "hidden",
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, style]}>
    {({ pressed }) => <>
      <PressShade pressed={pressed} primary={primary} />
      {busy && <ActivityIndicator color={color} accessible={false} />}
      {icon && <Icon name={icon} size={20} color={color} />}
      {label && <Text style={{ flexShrink: 1, textAlign: "center", color, fontSize: primary ? 16 : 14, lineHeight: primary ? 24 : 20, fontWeight: primary ? "700" : "600" }}>{label}</Text>}
      {trailingIcon && <Icon name={trailingIcon} size={18} color={color} />}
    </>}
  </Pressable>;
}
export function StepIndicator({ step, total, label }: { step: number; total: number; label: string }) {
  const c = useColors();
  return <View accessible accessibilityLabel={label} style={{ height: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
    {Array.from({ length: total }, (_, i) => <View key={i} style={{ width: i + 1 === step ? 24 : 6, height: 6, borderRadius: 3, backgroundColor: i + 1 <= step ? c.actionBg : c.border }} />)}
  </View>;
}
