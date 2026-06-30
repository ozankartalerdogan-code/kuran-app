import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "../../src/hooks/useColors";
import { TasbihModal } from "../../src/components/ZikirMatik";

type Item = {
  emoji: string; label: string; sub: string;
  route?: string; params?: Record<string, string>; onPress?: () => void;
};

export default function IbadetTab() {
  const c = useColors();
  const [tasbihOpen, setTasbihOpen] = useState(false);

  const SECTIONS: { title: string; items: Item[] }[] = [
    {
      title: "📚 Rehberler",
      items: [
        { emoji: "🕌", label: "Namaz Rehberi",      sub: "Nasıl kılınır, özel namazlar",  route: "/namaz-rehberi"  },
        { emoji: "🤲", label: "Dualar ve Zikirler", sub: "89 dua, 23 kategori",            route: "/dualar"         },
        { emoji: "📿", label: "İbadet Rehberi",     sub: "Namaz, oruç, zekât, abdest",    route: "/ibadet-rehberi" },
      ],
    },
    {
      title: "🧰 Araçlar",
      items: [
        { emoji: "🧭", label: "Kıble",  sub: "Kabe yönünü bul",     route: "/kible"                           },
        { emoji: "📿", label: "Tespih", sub: "Dijital zikir matik",  onPress: () => setTasbihOpen(true) },
      ],
    },
    {
      title: "🔖 Diğer",
      items: [
        { emoji: "🧎", label: "Özel Namazlar", sub: "Cenaze, teheccüd, teravih...", route: "/namaz-rehberi", params: { tab: "ozel" } },
      ],
    },
  ];

  function handlePress(item: Item) {
    if (item.onPress) { item.onPress(); return; }
    if (item.params) { router.push({ pathname: item.route as any, params: item.params }); return; }
    if (item.route)  { router.push(item.route as any); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>İbadet</Text>

        {SECTIONS.map((section, si) => (
          <View key={si} style={si > 0 ? s.section : undefined}>
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

      <TasbihModal visible={tasbihOpen} onClose={() => setTasbihOpen(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content:       { padding: 16, paddingBottom: 32 },
  heading:       { fontSize: 28, fontWeight: "800", marginBottom: 20 },
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
});
