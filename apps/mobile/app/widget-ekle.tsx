import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";

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
        <Text style={[s.pageTitle, { color: c.text }]}>Ana Ekran Widget'ı</Text>

        <Section title="Emir Ayetleri">
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.paragraph, { color: c.textSecondary }]}>
              Kur'an'dan emir kipiyle gelen ayetleri (Allah'ın emirleri) ana ekranında gösteren bir widget. İçerik günde 6 kez
              otomatik değişir; ayete dokununca uygulamada açılır, widget üstündeki ↻ ile de anında farklı bir ayet
              gösterebilirsin.
            </Text>
          </View>
        </Section>

        {isAndroid ? (
          <Section title="Nasıl Eklerim?">
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Step n={1} text="Telefonunun ana ekranında boş bir alana basılı tut." c={c} />
              <Step n={2} text="Açılan menüden “Widget'lar” (veya “Bileşenler”) seçeneğine dokun." c={c} />
              <Step n={3} text="Listede “Kuran Yolu” uygulamasını bul." c={c} />
              <Step n={4} text="“Emir Ayetleri” widget'ını ana ekrana sürükle." c={c} />
            </View>
          </Section>
        ) : (
          <Section title="Yakında">
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.paragraph, { color: c.textSecondary }]}>
                Ana ekran widget'ı şu an yalnızca Android'de mevcut. iOS desteği ayrı bir güncellemede planlanıyor.
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
