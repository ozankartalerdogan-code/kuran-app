import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../src/hooks/useColors";
import { logFeature } from "../../src/lib/analytics";

type KuranCardRoute = "/mushaf" | "/surah-list" | "/hatim";
type KuranCard = {
  id: "mushaf" | "surah_list" | "hatim";
  emoji: string;
  label: string;
  sub: string;
  route: KuranCardRoute;
  bg: string;
  border: string;
};

const CARDS: KuranCard[] = [
  { id: "mushaf", emoji: "📜", label: "Mushaf Modu",  sub: "Sayfa sayfa oku, yer imi bırak",  route: "/mushaf", bg: "#f0fdf4", border: "#86efac" },
  { id: "surah_list", emoji: "📋", label: "Sure Listesi", sub: "114 sure, ayet ayet incele",        route: "/surah-list", bg: "#eff6ff", border: "#93c5fd" },
  { id: "hatim", emoji: "📑", label: "Hatim Takibi", sub: "30 cüz, kaldığın yerden devam",    route: "/hatim",  bg: "#fef3c7", border: "#fcd34d" },
];

export default function KuranTab() {
  const c = useColors();

  const handleSearchPress = () => {
    logFeature("kuran_tab_search");
    router.push("/search" as any);
  };

  const handleCardPress = (card: KuranCard) => {
    logFeature("kuran_tab_card", { card: card.id });
    router.push(card.route as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>Kur'an</Text>

        <TouchableOpacity
          style={[s.searchBar, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={handleSearchPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Ayet veya sure ara"
        >
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <Text style={[s.searchText, { color: c.textMuted }]}>Ayet veya sure ara...</Text>
        </TouchableOpacity>

        <View style={s.cards}>
          {CARDS.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[s.card, { backgroundColor: card.bg, borderColor: card.border }]}
              onPress={() => handleCardPress(card)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={card.label}
              accessibilityHint={card.sub}
            >
              <Text style={s.emoji}>{card.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: c.text }]}>{card.label}</Text>
                <Text style={[s.sub, { color: c.textMuted }]}>{card.sub}</Text>
              </View>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content:    { padding: 16, paddingBottom: 32 },
  heading:    { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  searchBar:  { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14,
                borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 20 },
  searchText: { fontSize: 14, flex: 1 },
  cards:      { gap: 10 },
  card:       { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16,
                borderWidth: 1.5, paddingVertical: 18, paddingHorizontal: 16 },
  emoji:      { fontSize: 30 },
  label:      { fontSize: 16, fontWeight: "700" },
  sub:        { fontSize: 12, marginTop: 2 },
  chev:       { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
});
