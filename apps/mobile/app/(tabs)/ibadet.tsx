import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";
import { TasbihModal } from "../../src/components/ZikirMatik";
import { useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type Item = {
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  darkIconBg: string;
  darkIconColor: string;
  label: string;
  sub: string;
  route?: string;
  params?: Record<string, string>;
  onPress?: () => void;
};

export default function IbadetTab() {
  const c = useColors();
  const [tasbihOpen, setTasbihOpen] = useState(false);
  const ibadetTarget = useTourTarget("ibadet.main");
  const tourScroll = useTourScroller();

  const SECTIONS: { title: string; items: Item[] }[] = [
    {
      title: "📚 Rehberler",
      items: [
        { icon: "accessibility-outline", iconBg: "#dbeafe", iconColor: "#1d4ed8", darkIconBg: "#1e3a8a", darkIconColor: "#93c5fd", label: "Namaz Rehberi", sub: "Nasıl kılınır, özel namazlar", route: "/namaz-rehberi" },
        { icon: "rose-outline", iconBg: "#cffafe", iconColor: "#0f766e", darkIconBg: "#134e4a", darkIconColor: "#99f6e4", label: "Dualar ve Zikirler", sub: "89 dua, 23 kategori", route: "/dualar" },
        { icon: "reader-outline", iconBg: "#ede9fe", iconColor: "#7c3aed", darkIconBg: "#4c1d95", darkIconColor: "#c4b5fd", label: "İbadet Rehberi", sub: "Namaz, oruç, zekât, abdest", route: "/ibadet-rehberi" },
      ],
    },
    {
      title: "🧰 Araçlar",
      items: [
        { icon: "compass-outline", iconBg: "#ffedd5", iconColor: "#c2410c", darkIconBg: "#7c2d12", darkIconColor: "#fdba74", label: "Kıble", sub: "Kabe yönünü bul", route: "/kible" },
        { icon: "radio-button-on-outline", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac", label: "Tespih", sub: "Dijital zikir matik", onPress: () => setTasbihOpen(true) },
      ],
    },
    {
      title: "🔖 Diğer",
      items: [
        { icon: "body-outline", iconBg: "#fef3c7", iconColor: "#b45309", darkIconBg: "#92400e", darkIconColor: "#fde68a", label: "Özel Namazlar", sub: "Cenaze, teheccüd, teravih...", route: "/namaz-rehberi", params: { tab: "ozel" } },
      ],
    },
  ];

  function handlePress(item: Item) {
    if (item.onPress) {
      item.onPress();
      return;
    }
    if (item.params) {
      router.push({ pathname: item.route, params: item.params } as Href);
      return;
    }
    if (item.route) {
      router.push(item.route as Href);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        {...tourScroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>İbadet</Text>

        {SECTIONS.map((section, si) => (
          <View key={si} {...(si === 0 ? ibadetTarget : {})} style={si > 0 ? s.section : undefined}>
            <View style={[s.sectionHeader, { borderBottomColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.textMuted }]}>{section.title}</Text>
            </View>
            <View style={s.cards}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}: ${item.sub}`}
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

      <TasbihModal visible={tasbihOpen} onClose={() => setTasbihOpen(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
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
});
