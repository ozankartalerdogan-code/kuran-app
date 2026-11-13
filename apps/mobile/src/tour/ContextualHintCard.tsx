import { useEffect } from "react";
import { AccessibilityInfo, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../hooks/useColors";
import { useStrings } from "../i18n";
import tourStrings from "../i18n/strings/tour";
import type { useContextualHint } from "./useContextualHint";

type HintController = ReturnType<typeof useContextualHint>;
export function ContextualHintHelp({ hint }: { hint: HintController }) {
  const c = useColors();
  const t = useStrings(tourStrings);
  return <Pressable ref={hint.helpRef} onPress={hint.openManual} disabled={hint.helpDisabled}
    accessibilityRole="button" accessibilityLabel={t[`${hint.id}Help`]} accessibilityState={{ disabled: hint.helpDisabled }}
    style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center",
      justifyContent: "center", borderRadius: 12, backgroundColor: pressed ? c.accentLight : "transparent" })}>
    <Ionicons name="help-circle-outline" size={22} color={hint.helpDisabled ? c.textMuted : c.actionBg} accessible={false} />
  </Pressable>;
}
export function ContextualHintCard({ hint }: { hint: HintController }) {
  const c = useColors();
  const t = useStrings(tourStrings);
  const body = t[hint.id];
  useEffect(() => {
    if (!hint.display || Platform.OS === "android") return;
    // Canlı bölgeyle ikinci kez duyurulmaz, odak değiştirilmez.
    AccessibilityInfo.announceForAccessibilityWithOptions(body, { queue: true, priority: "low" });
  }, [hint.display, body]);
  if (!hint.display) return null;
  return <View style={{ backgroundColor: c.accentLight, borderRadius: 12, padding: 12,
    flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
    <Ionicons name="information-circle-outline" size={20} color={c.actionBg} accessible={false} style={{ marginTop: 1 }} />
    <Text accessibilityLiveRegion={Platform.OS === "android" ? "polite" : "none"}
      style={{ flex: 1, fontSize: 14, lineHeight: 21, color: c.text }}>{body}</Text>
    <Pressable onPress={hint.dismiss} accessibilityRole="button" accessibilityLabel={t.hintDismiss}
      style={({ pressed }) => ({ width: 48, minHeight: 48, alignItems: "center", justifyContent: "center",
        borderRadius: 12, backgroundColor: pressed ? c.cardAlt : "transparent" })}>
      <Ionicons name="close" size={20} color={c.text} accessible={false} />
    </Pressable>
  </View>;
}
