import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useStrings } from "../src/i18n";
import misc1Strings from "../src/i18n/strings/misc1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: c.accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function Step({ n, text, c }: { n: number; text: string; c: AppColors }) {
  return (
    <View style={s.stepRow}>
      <View style={[s.stepBadge, { backgroundColor: c.accent }]}>
        <Text style={s.stepBadgeText}>{n}</Text>
      </View>
      <Text style={[s.stepText, { color: c.textSecondary }]}>{text}</Text>
    </View>
  );
}

export default function WidgetEkleScreen() {
  const c = useColors();
  const t = useStrings(misc1Strings);
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.pageTitle, { color: c.text }]}>{t.widgetTitle}</Text>

        <Section title={t.widgetSecAyahs}>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.paragraph, { color: c.textSecondary }]}>
              {t.widgetDesc}
            </Text>
          </View>
        </Section>

        {isAndroid ? (
          <Section title={t.widgetHow}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Step n={1} text={t.widgetStep1} c={c} />
              <Step n={2} text={t.widgetStep2} c={c} />
              <Step n={3} text={t.widgetStep3} c={c} />
              <Step n={4} text={t.widgetStep4} c={c} />
            </View>
          </Section>
        ) : (
          <Section title={t.widgetSoon}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.paragraph, { color: c.textSecondary }]}>
                {t.widgetIos}
              </Text>
            </View>
          </Section>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  pageTitle: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  paragraph: { fontSize: 14, lineHeight: 22 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
