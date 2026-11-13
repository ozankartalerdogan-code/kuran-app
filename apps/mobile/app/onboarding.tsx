import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, BackHandler, findNodeHandle, ScrollView, Text, Pressable, useWindowDimensions, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { storage, STORAGE_KEYS } from "../src/lib/storage";
import { Entrance, Icon, PolishButton, PressShade } from "../src/components/onboarding/Polish";
import { enablePrayerNotificationsFirstRun, declinePrayerNotifications } from "../src/lib/namazNotifications";
import { useStrings, useLang, setLangPreference } from "../src/i18n";
import strings from "../src/i18n/strings/onboarding";
import { StartPreferenceOptions } from "../src/components/onboarding/StartPreferenceOptions";
import { OnboardingFooter } from "../src/components/onboarding/OnboardingFooter";
import { loadStartPreference, saveStartPreference, type StartPreference } from "../src/lib/startPreference";
import { useAppTour } from "../src/tour/AppTourProvider";

export default function OnboardingScreen() {
  const c = useColors(), t = useStrings(strings), lang = useLang(), insets = useSafeAreaInsets();
  const { completeOnboarding } = useAppTour();
  const [step, setStep] = useState(1), [busy, setBusy] = useState(false);
  const [preference, setPreference] = useState<StartPreference | null>(null);
  const [result, setResult] = useState<"denied" | "error" | null>(null);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const preferenceWrites = useRef(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    void loadStartPreference().then(value => { if (!cancelled) setPreference(value); })
      .finally(() => { if (!cancelled) setPreferenceReady(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const choosePreference = (value: StartPreference | null) => {
    setPreference(value);
    preferenceWrites.current = preferenceWrites.current.then(() => saveStartPreference(value)).catch(() => {});
  };
  const locked = useRef(false), title = useRef<Text>(null);
  const scroll = useRef<ScrollView>(null);
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    const task = requestAnimationFrame(() => { const node = findNodeHandle(title.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); });
    return () => cancelAnimationFrame(task);
  }, [step, result]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!locked.current && step === 2 && !result) setStep(1);
      return true;
    });
    return () => sub.remove();
  }, [step, result]);
  const finish = async () => {
    await preferenceWrites.current;
    await storage.setString(STORAGE_KEYS.onboarding, "1").catch(() => {});
    completeOnboarding();
  };
  const enable = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    await preferenceWrites.current;
    const outcome = await enablePrayerNotificationsFirstRun().catch(() => "error" as const);
    if (outcome === "enabled") { await finish(); return; }
    setResult(outcome); setBusy(false); locked.current = false;
  };
  const decline = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    await declinePrayerNotifications().catch(() => {});
    await finish();
  };
  const primary = () => {
    if (locked.current || !preferenceReady) return;
    if (step === 1) { setStep(2); return; }
    if (result) { locked.current = true; setBusy(true); void finish(); return; }
    void enable();
  };
  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
        <View style={{ width: "100%", maxWidth: 488, alignSelf: "center", paddingHorizontal: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          {step === 2 && !result && <PolishButton disabled={busy} icon="chevron-back" label={t.back} onPress={() => setStep(1)} />}
          <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 4, borderRadius: 16, backgroundColor: c.cardAlt, marginLeft: "auto" }} accessibilityRole="radiogroup" accessibilityLabel={t.langA11y}>
            {(["tr", "en"] as const).map(l => <Pressable key={l} disabled={busy} accessibilityRole="radio"
              accessibilityState={{ checked: lang === l, disabled: busy }}
              onPress={() => { if (!locked.current && lang !== l) void setLangPreference(l).catch(() => {}); }}
              style={{ minHeight: 48, minWidth: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, overflow: "hidden", justifyContent: "center", backgroundColor: busy ? c.cardAlt : lang === l ? c.actionBg : undefined }}>
              {({ pressed }) => <><PressShade pressed={pressed} primary={lang === l} /><Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: busy ? c.textMuted : lang === l ? c.actionText : c.textSecondary }}>{l === "tr" ? "Türkçe" : "English"}</Text></>}
            </Pressable>)}
          </View>
        </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, width: "100%", maxWidth: 488, alignSelf: "center" }}>
        <Entrance key={`${step}:${result}`} style={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
          <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 32, backgroundColor: c.accentLight, marginBottom: 16 }}>
            <Icon name={step === 1 ? "book-outline" : "notifications-outline"} size={30} color={c.actionBg} />
          </View>
          <Text ref={title} accessible accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "800", textAlign: "center", color: c.text }}>{step === 1 ? t.welcome : t.notifTitle}</Text>
          <Text style={{ fontSize: 16, lineHeight: 24, textAlign: "center", marginTop: 10, color: c.textSecondary }}>{step === 1 ? t.startQuestion : t.notifSummary}</Text>
          {step === 1 ? <StartPreferenceOptions value={preference} onChange={choosePreference} disabled={busy || !preferenceReady} /> :
            <View style={{ width: "100%", flexDirection: "row", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginTop: 24 }}>
              <Icon name={result ? "information-circle-outline" : "location-outline"} color={c.actionBg} />
              <Text accessibilityLiveRegion={result ? "polite" : "none"} style={{ flex: 1, fontSize: 14, lineHeight: 22, color: c.textSecondary }}>{result ? result === "denied" ? t.permissionDenied : t.setupFailed : t.locationNote}</Text>
            </View>}
        </Entrance>
        {fontScale >= 1.3 && <OnboardingFooter step={step} busy={busy || !preferenceReady} primaryLabel={step === 1 || result ? t.continueBtn : t.enableBtn}
          onPrimary={primary} onSecondary={step === 2 && !result ? () => { void decline(); } : undefined} />}
      </ScrollView>
      {fontScale < 1.3 && <View style={{ paddingHorizontal: 24 }}><OnboardingFooter reserveSecondary step={step} busy={busy || !preferenceReady} primaryLabel={step === 1 || result ? t.continueBtn : t.enableBtn}
        onPrimary={primary} onSecondary={step === 2 && !result ? () => { void decline(); } : undefined} /></View>}
    </View>
  </>;
}
