import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { router, Stack } from "expo-router";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { logScreen } from "../src/lib/analytics";

const GAP = 12;
const PAD = 16;
// Kart min. genişliği ~150dp — geniş (tablet) ekranda sabit 2 sütun yerine
// daha fazla sütun kullanılır, dar telefonda 2'de kalır.
const CARD_MIN_WIDTH = 150;

const ITEMS = [
  { emoji: "🎓",  title: "Dersler",             route: "/dersler",             desc: "Kart kart öğren, kendini test et" },
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
  { emoji: "📚",  title: "Hadisler",            route: "/hadisler",            desc: "114 seçme sahih hadis" },
  { emoji: "🌙",  title: "Mübarek Günler",      route: "/mubarek-gunler",      desc: "Kandiller ve fazileti" },
] as const;

export default function NeOgreneyimScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.floor((width - PAD * 2) / CARD_MIN_WIDTH));
  const cardW = (width - PAD * 2 - GAP * (columns - 1)) / columns;
  useEffect(() => { logScreen('NeOgreneyim'); }, []);

  const goBack = () => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={goBack} hitSlop={10} style={s.backBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Geri">
          <Text style={[s.backText, { color: c.accent }]}>‹ Geri</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: PAD, paddingTop: 8, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: c.text }]}>Ne öğrenmek istiyorsunuz?</Text>
        <Text style={[s.subtitle, { color: c.textMuted }]}>Bir konu seçin</Text>
        <View style={s.grid}>
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[s.card, { backgroundColor: c.card, width: cardW }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.desc}`}
            >
              <Text style={s.emoji}>{item.emoji}</Text>
              <Text style={[s.cardTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[s.cardDesc, { color: c.textMuted }]}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 4 },
  backBtn:   { padding: 8 },
  backText:  { fontSize: 16, fontWeight: "600" },
  title:     { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle:  { fontSize: 14, marginBottom: 20 },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card:      { borderRadius: 12, padding: 14, minHeight: 120 },
  emoji:     { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  cardDesc:  { fontSize: 12, lineHeight: 17 },
});
