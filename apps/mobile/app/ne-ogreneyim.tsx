import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { router, Stack } from "expo-router";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { logScreen } from "../src/lib/analytics";

const { width } = Dimensions.get("window");
const GAP = 12;
const PAD = 16;
const CARD_W = (width - PAD * 2 - GAP) / 2;

const ITEMS = [
  { emoji: "✍️",  title: "Elif-Ba",             route: "/ogren",               desc: "Arapça okumayı öğren" },
  { emoji: "📖",  title: "Kuran",               route: "/sure-listesi",        desc: "Ayet oku, meal incele" },
  { emoji: "📜",  title: "Mushaf",              route: "/mushaf",              desc: "Mushaf formatında oku" },
  { emoji: "🌳",  title: "Kelime Kökü",         route: "/root",                desc: "Kelimelerin anlamını keşfet" },
  { emoji: "🕌",  title: "Namaz",               route: "/namaz-rehberi",       desc: "Nasıl kılınır, özel namazlar" },
  { emoji: "🚿",  title: "İbadet Rehberi",      route: "/ibadet-rehberi",      desc: "İslam'ın ve imanın şartları, abdest, oruç, zekât" },
  { emoji: "🤲",  title: "Dualar",              route: "/dualar",              desc: "89 dua, 23 kategori" },
  { emoji: "🛡️", title: "Manevi Sığınak",      route: "/manevi-siginak",      desc: "Korunma ve şifa duaları" },
  { emoji: "✨",  title: "Esmaül Hüsna",        route: "/esma",                desc: "Allah'ın 99 ismi" },
  { emoji: "👳",  title: "Peygamber Kıssaları", route: "/peygamber-kissalari", desc: "25 peygamberin kıssası" },
  { emoji: "⭐",  title: "Siyer-i Nebî",        route: "/siyer",               desc: "Hz. Muhammed'in hayatı" },
  { emoji: "📚",  title: "Hadisler",            route: "/hadisler",            desc: "112 seçme sahih hadis" },
  { emoji: "🌙",  title: "Mübarek Günler",      route: "/mubarek-gunler",      desc: "Kandiller ve fazileti" },
] as const;

export default function NeOgreneyimScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => { logScreen('NeOgreneyim'); }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: PAD, paddingTop: insets.top + 20, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: c.text }]}>Ne öğrenmek istiyorsunuz?</Text>
        <Text style={[s.subtitle, { color: c.textMuted }]}>Bir konu seçin</Text>
        <View style={s.grid}>
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[s.card, { backgroundColor: c.card, width: CARD_W }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
              activeOpacity={0.7}
            >
              <Text style={s.emoji}>{item.emoji}</Text>
              <Text style={[s.cardTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[s.cardDesc, { color: c.textMuted }]}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  title:     { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle:  { fontSize: 14, marginBottom: 20 },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card:      { borderRadius: 12, padding: 14, minHeight: 120 },
  emoji:     { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  cardDesc:  { fontSize: 12, lineHeight: 17 },
});
