import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "../../hooks/useColors";
import { useStrings } from "../../i18n";
import strings from "../../i18n/strings/onboarding";
import type { StartPreference } from "../../lib/startPreference";
import { Icon, preferenceIcons, PressShade, SelectionSurface } from "./Polish";
export function StartPreferenceOptions({ value, onChange, disabled = false }: {
  value: StartPreference | null; onChange: (value: StartPreference | null) => void; disabled?: boolean;
}) {
  const c = useColors(), t = useStrings(strings);
  return <View accessibilityRole="radiogroup" accessibilityLabel={t.startQuestion} style={{ width: "100%", gap: 10, marginTop: 24 }}>
    {(["read", "understand", "letters"] as const).map(key => <Pressable key={key}
      disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: value === key, disabled }}
      onPress={() => { if (value === key) return; onChange(key); void Haptics.selectionAsync().catch(() => {}); }} style={{ borderRadius: 16, overflow: "hidden" }}>
      {({ pressed }) => <SelectionSurface selected={value === key} disabled={disabled}>
        <PressShade pressed={pressed} />
        <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name={preferenceIcons[key]} color={disabled ? c.textMuted : c.actionBg} /></View>
        <Text style={{ flex: 1, fontSize: 16, lineHeight: 24, fontWeight: value === key ? "600" : "400", color: disabled ? c.textMuted : c.text }}>{t[key]}</Text>
        <Icon name={value === key ? "checkmark-circle" : "ellipse-outline"} color={disabled ? c.textMuted : value === key ? c.actionBg : c.textSecondary} />
      </SelectionSurface>}
    </Pressable>)}
  </View>;
}
