import React from "react";
import { View } from "react-native";
import { fmt, useStrings } from "../../i18n";
import strings from "../../i18n/strings/onboarding";
import { PolishButton, StepIndicator } from "./Polish";
export function OnboardingFooter({ step, busy, primaryLabel, onPrimary, onSecondary, reserveSecondary = false }: {
  step: number; busy: boolean; primaryLabel: string; onPrimary: () => void; onSecondary?: () => void;
  reserveSecondary?: boolean;
}) {
  const t = useStrings(strings);
  return <View style={{ width: "100%", maxWidth: 440, alignSelf: "center", gap: 8 }}>
    <View style={{ marginBottom: 8 }}><StepIndicator step={step} total={2} label={fmt(t.stepProgress, { step, total: 2 })} /></View>
    <PolishButton primary busy={busy} label={busy ? t.preparing : primaryLabel} onPress={onPrimary} />
    {onSecondary && <PolishButton textOnly disabled={busy} label={t.declineBtn} onPress={onSecondary} />}
    {!onSecondary && reserveSecondary && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 48 }} />}
  </View>;
}
