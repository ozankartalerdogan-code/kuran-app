import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../src/hooks/useColors";
import { storage, STORAGE_KEYS } from "../src/lib/storage";
import { logFeature } from "../src/lib/analytics";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import {
  enablePrayerNotificationsFirstRun,
  declinePrayerNotifications,
  rescheduleNotificationsForLanguageChange,
} from "../src/lib/namazNotifications";
import { refreshWidgetNow } from "../src/widgets/widgetRefresh";
import { useStrings, useLang, setLangPreference, type Lang } from "../src/i18n";
import onboardingStrings from "../src/i18n/strings/onboarding";

// İlk açılış akışı — 2 adım: tanıtım + "Namaz vakitlerini hatırlatalım mı?".
// İzinler (bildirim + konum) bağlam içinde, kullanıcı EVET dedikten sonra istenir;
// _layout'taki otomatik ilk-kurulum dalı onboarding bitene kadar devre dışıdır.

const FEATURES = [
  { icon: "book-outline",     key: "feat1" },
  { icon: "search-outline",   key: "feat2" },
  { icon: "time-outline",     key: "feat3" },
  { icon: "school-outline",   key: "feat4" },
] as const;

export default function OnboardingScreen() {
  const c = useColors();
  const t = useStrings(onboardingStrings);
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"intro" | "notif">("intro");
  const [busy, setBusy] = useState(false);

  const finish = async (choice: "enabled" | "denied" | "error" | "declined") => {
    logFeature("onboarding_tamam", { bildirim: choice });
    await storage.setString(STORAGE_KEYS.onboarding, "1").catch(() => {});
    router.replace("/(tabs)");
  };

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    // "error" (ağ vb.) durumunda tercih yazılmaz — bir sonraki açılışta
    // ensureNotificationsFresh aynı kurulumu sessizce tekrar dener.
    const result = await enablePrayerNotificationsFirstRun().catch(() => "error" as const);
    await finish(result);
  };

  const handleDecline = async () => {
    if (busy) return;
    setBusy(true);
    await declinePrayerNotifications().catch(() => {});
    await finish("declined");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        {/* Dil seçici — telefon diline göre seçili gelir; dokununca ekran anında değişir. */}
        <View style={[s.langBar, { backgroundColor: c.card, borderColor: c.border }]} accessibilityRole="radiogroup" accessibilityLabel={t.langA11y}>
          {(["tr", "en"] as const satisfies readonly Lang[]).map((l) => {
            const active = lang === l;
            return (
              <TouchableOpacity
                key={l}
                style={[s.langBtn, active && { backgroundColor: c.accent }]}
                onPress={() => {
                  if (active) return;
                  void setLangPreference(l)
                    .then(() => Promise.all([rescheduleNotificationsForLanguageChange(), refreshWidgetNow()]))
                    .catch(() => {});
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Text style={[s.langText, { color: active ? "#fff" : c.textSecondary }]}>{l === "tr" ? "Türkçe" : "English"}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bounces={false}>
          {step === "intro" ? (
            <>
              <View style={[s.heroCircle, { backgroundColor: c.accentLight }]}>
                <Text style={s.heroEmoji}>🕌</Text>
              </View>
              <Text style={[s.title, { color: c.text }]}>{t.welcome}</Text>
              <Text style={[s.sub, { color: c.textSecondary }]}>
                {t.welcomeSub}
              </Text>

              <View style={[s.featureCard, { backgroundColor: c.card, borderColor: c.border }]}>
                {FEATURES.map((f, i) => (
                  <View key={f.icon} style={[s.featureRow, i > 0 && [s.featureRowBorder, { borderTopColor: c.border }]]}>
                    <View style={[s.featureIcon, { backgroundColor: c.accentLight }]}>
                      <Ionicons name={f.icon} size={20} color={c.accent} />
                    </View>
                    <Text style={[s.featureText, { color: c.textSecondary }]}>{t[f.key]}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={[s.heroCircle, { backgroundColor: c.accentLight }]}>
                <Text style={s.heroEmoji}>🔔</Text>
              </View>
              <Text style={[s.title, { color: c.text }]}>{t.notifTitle}</Text>
              <Text style={[s.sub, { color: c.textSecondary }]}>
                {t.notifSub}
              </Text>

              <View style={[s.infoBox, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="location-outline" size={18} color={c.accent} style={{ marginTop: 1 }} />
                <Text style={[s.infoText, { color: c.textMuted }]}>
                  {t.locInfo}
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Alt aksiyon alanı */}
        <View style={[s.footer, { maxWidth: READING_MAX_WIDTH }]}>
          {/* Adım göstergesi */}
          <View style={s.dots}>
            <View style={[s.dot, { backgroundColor: step === "intro" ? c.accent : c.border }]} />
            <View style={[s.dot, { backgroundColor: step === "notif" ? c.accent : c.border }]} />
          </View>

          {step === "intro" ? (
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: c.accent }]}
              onPress={() => setStep("notif")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t.continueA11y}
            >
              <Text style={s.primaryBtnText}>{t.continueBtn}</Text>
            </TouchableOpacity>
          ) : busy ? (
            <View style={[s.primaryBtn, { backgroundColor: c.accent, flexDirection: "row", gap: 10 }]}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.primaryBtnText}>{t.preparing}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: c.accent }]}
                onPress={handleEnable}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t.enableA11y}
              >
                <Text style={s.primaryBtnText}>{t.enableBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={handleDecline}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t.declineA11y}
              >
                <Text style={[s.secondaryBtnText, { color: c.textMuted }]}>{t.declineBtn}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1 },
  langBar: {
    flexDirection: "row", alignSelf: "flex-end", marginTop: 12, marginRight: 16,
    borderRadius: 18, borderWidth: 1, padding: 3,
  },
  langBtn:  { borderRadius: 15, paddingHorizontal: 14, paddingVertical: 7, minHeight: 32, justifyContent: "center" },
  langText: { fontSize: 13, fontWeight: "700" },
  content: {
    flexGrow: 1, justifyContent: "center", alignItems: "center",
    padding: 24, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center",
  },

  heroCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  heroEmoji: { fontSize: 44 },

  title: { fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  sub:   { fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 10, maxWidth: 320 },

  featureCard: { width: "100%", borderRadius: 16, borderWidth: 1, marginTop: 24, paddingHorizontal: 16 },
  featureRow:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  featureRowBorder: { borderTopWidth: 1 },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 13, lineHeight: 19 },

  infoBox:  { width: "100%", flexDirection: "row", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 24 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  footer: { width: "100%", alignSelf: "center", paddingHorizontal: 24, gap: 10 },
  dots:   { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 4 },
  dot:    { width: 8, height: 8, borderRadius: 4 },

  primaryBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center",
    minHeight: 50,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn:     { alignItems: "center", paddingVertical: 10 },
  secondaryBtnText: { fontSize: 13, fontWeight: "600" },
});
