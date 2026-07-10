import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";
import { logFeature } from "../../src/lib/analytics";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type KuranCardRoute = "/mushaf-sayfa" | "/sure-listesi";
type KuranCard = {
  id: "mushaf_page" | "surah_list";
  icon: IoniconName;
  label: string;
  sub: string;
  route: KuranCardRoute;
  bg: string;
  border: string;
  darkBg: string;
  darkBorder: string;
  iconBg: string;
  iconColor: string;
  darkIconBg: string;
  darkIconColor: string;
};

// Mushaf Modu ve Hatim Takibi ayrı kart olmaktan çıktı: ikisi de sayfa
// görünümünün içinde (yer imi sayfaya çevrilir, hatim paneli başlıktan açılır).
const CARDS: KuranCard[] = [
  {
    id: "mushaf_page",
    icon: "book-outline",
    label: "Kur'an Oku",
    sub: "604 sayfalık mushaf · kaldığın yerden devam · hatim takibi",
    route: "/mushaf-sayfa",
    bg: "#f0fdf4",
    border: "#86efac",
    darkBg: "#052e16",
    darkBorder: "#166534",
    iconBg: "#dcfce7",
    iconColor: "#15803d",
    darkIconBg: "#14532d",
    darkIconColor: "#86efac",
  },
  {
    id: "surah_list",
    icon: "list-outline",
    label: "Sure Listesi",
    sub: "114 sure, ayet ayet incele",
    route: "/sure-listesi",
    bg: "#eff6ff",
    border: "#93c5fd",
    darkBg: "#172554",
    darkBorder: "#1e40af",
    iconBg: "#dbeafe",
    iconColor: "#1d4ed8",
    darkIconBg: "#1e3a8a",
    darkIconColor: "#93c5fd",
  },
];

export default function KuranTab() {
  const c = useColors();
  const surahListTarget = useTourTarget("kuran.surahList");

  const handleCardPress = (card: KuranCard) => {
    logFeature("kuran_tab_card", { card: card.id });
    router.push(card.route as Href);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>Kur'an-ı Kerim</Text>

        <View style={s.cards}>
          {CARDS.map(card => (
            <TouchableOpacity
              key={card.id}
              {...(card.id === "surah_list" ? surahListTarget : {})}
              style={[s.card, { backgroundColor: c.isDark ? card.darkBg : card.bg, borderColor: c.isDark ? card.darkBorder : card.border }]}
              onPress={() => handleCardPress(card)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={card.label}
              accessibilityHint={card.sub}
            >
              <View style={[s.iconWrap, { backgroundColor: c.isDark ? card.darkIconBg : card.iconBg }]}>
                <Ionicons name={card.icon} size={22} color={c.isDark ? card.darkIconColor : card.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: c.text }]}>{card.label}</Text>
                <Text style={[s.sub, { color: c.textMuted }]}>{card.sub}</Text>
              </View>
              <Text style={[s.chev, { color: c.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  cards: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
});
