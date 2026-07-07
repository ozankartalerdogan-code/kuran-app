import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import * as Haptics from "expo-haptics";
import { useColors } from "../../src/hooks/useColors";
import { useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type LearnItem = {
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  darkIconBg: string;
  darkIconColor: string;
  label: string;
  sub: string;
  route: string;
};

const SECTIONS = [
  {
    title: "📗 Orta",
    items: [
      { icon: "people-outline", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac", label: "Peygamber Kıssaları", sub: "25 peygamberin kıssası", route: "/peygamber-kissalari" },
      { icon: "moon-outline", iconBg: "#ede9fe", iconColor: "#7c3aed", darkIconBg: "#4c1d95", darkIconColor: "#c4b5fd", label: "Siyer-i Nebî", sub: "Hz. Peygamber'in hayatı", route: "/siyer" },
      { icon: "calendar-outline", iconBg: "#dbeafe", iconColor: "#1d4ed8", darkIconBg: "#1e3a8a", darkIconColor: "#93c5fd", label: "Mübarek Günler", sub: "13 gün ve gecenin fazileti", route: "/mubarek-gunler" },
      { icon: "chatbubble-ellipses-outline", iconBg: "#fef3c7", iconColor: "#b45309", darkIconBg: "#92400e", darkIconColor: "#fde68a", label: "Hadisler", sub: "106 seçme hadis, 27 konu", route: "/hadisler" },
    ],
  },
  {
    title: "🔬 İleri",
    items: [
      { icon: "git-network-outline", iconBg: "#ffe4e6", iconColor: "#e11d48", darkIconBg: "#881337", darkIconColor: "#fda4af", label: "Kelime Kökü Analizi", sub: "Ayetleri kök bazında incele", route: "/root" },
    ],
  },
] satisfies { title: string; items: LearnItem[] }[];

export default function OgrenTab() {
  const c = useColors();
  const derslerTarget = useTourTarget("learn.dersler");
  const hadithTarget = useTourTarget("learn.hadith");
  const tourScroll = useTourScroller();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        {...tourScroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>Öğren</Text>

        {/* Dersler — featured kart */}
        <TouchableOpacity
          {...derslerTarget}
          style={[s.derslerCard, { backgroundColor: c.card, borderColor: "#c9a84c" }]}
          onPress={() => { Haptics.selectionAsync(); router.push("/dersler" as Href); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Dersler"
          accessibilityHint="Dersler ekranını açar"
        >
          <View style={[s.derslerIconWrap, { backgroundColor: c.isDark ? "#3f2d12" : "#fef3c7" }]}>
            <Ionicons name="library-outline" size={20} color={c.isDark ? "#fde68a" : "#c9a84c"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.derslerTitle}>Dersler</Text>
            <Text style={[s.derslerSub, { color: c.textMuted }]}>12 konu · Kartlarla öğren · Kendini test et</Text>
          </View>
          <Text style={s.chev}>›</Text>
        </TouchableOpacity>

        {SECTIONS.map((section, si) => (
          <View key={si} style={si > 0 ? s.section : s.firstSection}>
            <View style={[s.sectionHeader, { borderBottomColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.textMuted }]}>{section.title}</Text>
            </View>
            <View style={s.cards}>
              {section.items.map(item => (
                <TouchableOpacity
                  key={item.route}
                  {...(item.route === "/hadisler" ? hadithTarget : {})}
                  style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => router.push(item.route as Href)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.sub}
                >
                  <View style={[s.iconWrap, { backgroundColor: c.isDark ? item.darkIconBg : item.iconBg }]}>
                    <Ionicons name={item.icon} size={20} color={c.isDark ? item.darkIconColor : item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: c.text }]}>{item.label}</Text>
                    <Text style={[s.sub, { color: c.textMuted }]}>{item.sub}</Text>
                  </View>
                  <Text style={s.chev}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  firstSection: { marginTop: 0 },
  section: { marginTop: 24 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cards: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
  derslerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  derslerIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  derslerTitle: { fontSize: 16, fontWeight: "800", color: "#c9a84c", marginBottom: 4 },
  derslerSub: { fontSize: 12 },
});
