import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "../../src/hooks/useColors";

const SECTIONS = [
  {
    title: "📗 Orta",
    items: [
      { emoji: "📜", label: "Peygamber Kıssaları", sub: "25 peygamberin kıssası",      route: "/peygamber-kissalari" },
      { emoji: "☪️", label: "Siyer-i Nebî",         sub: "Hz. Peygamber'in hayatı",     route: "/siyer"               },
      { emoji: "🌙", label: "Mübarek Günler",       sub: "13 gün ve gecenin fazileti",  route: "/mubarek-gunler"      },
      { emoji: "📖", label: "Hadisler",             sub: "106 seçme hadis, 27 konu",    route: "/hadisler"            },
    ],
  },
  {
    title: "🔬 İleri",
    items: [
      { emoji: "🧬", label: "Kelime Kökü Analizi", sub: "Ayetleri kök bazında incele", route: "/root" },
    ],
  },
];

export default function OgrenTab() {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>Öğren</Text>

        {/* Dersler — featured kart */}
        <TouchableOpacity
          style={[s.derslerCard, { backgroundColor: c.card, borderColor: "#c9a84c" }]}
          onPress={() => { Haptics.selectionAsync(); router.push("/dersler" as any); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Dersler"
          accessibilityHint="Dersler ekranını açar"
        >
          <View style={{ flex: 1 }}>
            <Text style={s.derslerTitle}>📚 Dersler</Text>
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
                  style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.sub}
                >
                  <Text style={s.emoji}>{item.emoji}</Text>
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
  content:       { padding: 16, paddingBottom: 32 },
  heading:       { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  firstSection:  { marginTop: 0 },
  section:       { marginTop: 24 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cards:         { gap: 8 },
  card:          { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14,
                   borderWidth: 1, paddingVertical: 16, paddingHorizontal: 14 },
  emoji:         { fontSize: 26 },
  label:         { fontSize: 15, fontWeight: "700" },
  sub:           { fontSize: 12, marginTop: 2 },
  chev:          { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
  derslerCard:   { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1.5,
                   paddingVertical: 16, paddingHorizontal: 14, marginBottom: 20 },
  derslerTitle:  { fontSize: 16, fontWeight: "800", color: "#c9a84c", marginBottom: 4 },
  derslerSub:    { fontSize: 12 },
});
