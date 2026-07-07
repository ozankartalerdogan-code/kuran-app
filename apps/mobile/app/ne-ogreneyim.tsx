import React, { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { router, Stack } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { logScreen } from "../src/lib/analytics";

const GAP = 12;
const PAD = 16;
// Kart min. genişliği ~150dp — geniş (tablet) ekranda sabit 2 sütun yerine
// daha fazla sütun kullanılır, dar telefonda 2'de kalır.
const CARD_MIN_WIDTH = 150;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type LearnItem = {
  icon: IoniconName;
  title: string;
  route: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  darkIconBg: string;
  darkIconColor: string;
};

const ITEMS: LearnItem[] = [
  { icon: "library-outline", title: "Dersler", route: "/dersler", desc: "Kart kart öğren, kendini test et", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac" },
  { icon: "list-outline", title: "Kuran", route: "/sure-listesi", desc: "Ayet oku, meal incele", iconBg: "#dbeafe", iconColor: "#1d4ed8", darkIconBg: "#1e3a8a", darkIconColor: "#93c5fd" },
  { icon: "book-outline", title: "Mushaf", route: "/mushaf", desc: "Mushaf formatında oku", iconBg: "#fef3c7", iconColor: "#b45309", darkIconBg: "#92400e", darkIconColor: "#fde68a" },
  { icon: "git-network-outline", title: "Kelime Kökü", route: "/root", desc: "Kelimelerin anlamını keşfet", iconBg: "#ffe4e6", iconColor: "#e11d48", darkIconBg: "#881337", darkIconColor: "#fda4af" },
  { icon: "accessibility-outline", title: "Namaz", route: "/namaz-rehberi", desc: "Nasıl kılınır, özel namazlar", iconBg: "#e0f2fe", iconColor: "#0369a1", darkIconBg: "#0c4a6e", darkIconColor: "#7dd3fc" },
  { icon: "reader-outline", title: "İbadet Rehberi", route: "/ibadet-rehberi", desc: "İslam'ın ve imanın şartları, abdest, oruç, zekât", iconBg: "#ede9fe", iconColor: "#7c3aed", darkIconBg: "#4c1d95", darkIconColor: "#c4b5fd" },
  { icon: "rose-outline", title: "Dualar", route: "/dualar", desc: "89 dua, 23 kategori", iconBg: "#cffafe", iconColor: "#0f766e", darkIconBg: "#134e4a", darkIconColor: "#99f6e4" },
  { icon: "shield-outline", title: "Manevi Sığınak", route: "/manevi-siginak", desc: "Korunma ve şifa duaları", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac" },
  { icon: "sparkles-outline", title: "Esmaül Hüsna", route: "/esma", desc: "Allah'ın 99 ismi", iconBg: "#fef3c7", iconColor: "#ca8a04", darkIconBg: "#713f12", darkIconColor: "#fde68a" },
  { icon: "people-outline", title: "Peygamber Kıssaları", route: "/peygamber-kissalari", desc: "25 peygamberin kıssası", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac" },
  { icon: "moon-outline", title: "Siyer-i Nebî", route: "/siyer", desc: "Hz. Muhammed'in hayatı", iconBg: "#ede9fe", iconColor: "#7c3aed", darkIconBg: "#4c1d95", darkIconColor: "#c4b5fd" },
  { icon: "chatbubble-ellipses-outline", title: "Hadisler", route: "/hadisler", desc: "114 seçme sahih hadis", iconBg: "#fef3c7", iconColor: "#b45309", darkIconBg: "#92400e", darkIconColor: "#fde68a" },
  { icon: "calendar-outline", title: "Mübarek Günler", route: "/mubarek-gunler", desc: "Kandiller ve fazileti", iconBg: "#dbeafe", iconColor: "#1d4ed8", darkIconBg: "#1e3a8a", darkIconColor: "#93c5fd" },
];

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
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as Href); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.desc}`}
            >
              <View style={[s.iconWrap, { backgroundColor: c.isDark ? item.darkIconBg : item.iconBg }]}>
                <Ionicons name={item.icon} size={22} color={c.isDark ? item.darkIconColor : item.iconColor} />
              </View>
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
  iconWrap:  { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  cardDesc:  { fontSize: 12, lineHeight: 17 },
});
