import React, { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { router, Stack } from "expo-router";
import type { Href } from "expo-router";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { BackButton, radius, toneColors, type IoniconName, type Tone } from "../src/components/ui";
import { logScreen } from "../src/lib/analytics";
import { useStrings } from "../src/i18n";
import misc1Strings from "../src/i18n/strings/misc1";

const GAP = 12;
const PAD = 16;
// Kart min. genişliği ~150dp — geniş (tablet) ekranda sabit 2 sütun yerine
// daha fazla sütun kullanılır, dar telefonda 2'de kalır.
const CARD_MIN_WIDTH = 150;
const GRID_MAX_WIDTH = 960;

type LearnItem = {
  icon: IoniconName;
  title: string;
  route: string;
  desc: string;
  tone: Tone;
};

const ITEMS: LearnItem[] = [
  { icon: "library-outline", title: "lessonsTitle", route: "/dersler", desc: "lessonsDesc", tone: "emerald" },
  { icon: "list-outline", title: "quranTitle", route: "/sure-listesi", desc: "quranDesc", tone: "sky" },
  { icon: "book-outline", title: "mushafTitle", route: "/mushaf-sayfa", desc: "mushafDesc", tone: "amber" },
  { icon: "git-network-outline", title: "rootTitle", route: "/root", desc: "rootDesc", tone: "violet" },
  { icon: "accessibility-outline", title: "prayerTitle", route: "/namaz-rehberi", desc: "prayerDesc", tone: "sky" },
  { icon: "reader-outline", title: "worshipTitle", route: "/ibadet-rehberi", desc: "worshipDesc", tone: "violet" },
  { icon: "rose-outline", title: "duasTitle", route: "/dualar", desc: "duasDesc", tone: "emerald" },
  { icon: "shield-outline", title: "refugeTitle", route: "/manevi-siginak", desc: "refugeDesc", tone: "emerald" },
  { icon: "sparkles-outline", title: "namesTitle", route: "/esma", desc: "namesDesc", tone: "amber" },
  { icon: "people-outline", title: "storiesTitle", route: "/peygamber-kissalari", desc: "storiesDesc", tone: "emerald" },
  { icon: "moon-outline", title: "siyerTitle", route: "/siyer", desc: "siyerDesc", tone: "violet" },
  { icon: "chatbubble-ellipses-outline", title: "hadithTitle", route: "/hadisler", desc: "hadithDesc", tone: "amber" },
  { icon: "calendar-outline", title: "blessedTitle", route: "/mubarek-gunler", desc: "blessedDesc", tone: "sky" },
];

export default function NeOgreneyimScreen() {
  const c = useColors();
  const t = useStrings(misc1Strings) as Record<string, string>;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // HorizontalSafeArea yan inset'leri düştüğü için kullanılabilir genişlikten çıkar.
  const containerW = Math.min(Math.max(0, width - insets.left - insets.right), GRID_MAX_WIDTH);
  const columns = Math.min(4, Math.max(2, Math.floor((containerW - PAD * 2) / CARD_MIN_WIDTH)));
  const cardW = (containerW - PAD * 2 - GAP * (columns - 1)) / columns;
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
        <BackButton onPress={goBack} accessibilityLabel={t.backA11y} />
      </View>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: PAD, paddingTop: 8, paddingBottom: 32 + insets.bottom, maxWidth: GRID_MAX_WIDTH, width: "100%", alignSelf: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: c.text }]}>{t.learnTitle}</Text>
        <Text style={[s.subtitle, { color: c.textMuted }]}>{t.learnSub}</Text>
        <View style={s.grid}>
          {ITEMS.map((item) => {
            const tone = toneColors(c, item.tone);
            return (
              <TouchableOpacity
                key={item.route}
                style={[s.card, { backgroundColor: c.card, borderColor: c.border, width: cardW }]}
                onPress={() => { Haptics.selectionAsync(); router.push(item.route as Href); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t[item.title]}: ${t[item.desc]}`}
              >
                <View style={[s.iconWrap, { backgroundColor: tone.bg }]}>
                  <Ionicons name={item.icon} size={22} color={tone.fg} />
                </View>
                <Text style={[s.cardTitle, { color: c.text }]}>{t[item.title]}</Text>
                <Text style={[s.cardDesc, { color: c.textMuted }]}>{t[item.desc]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 4 },
  title:     { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle:  { fontSize: 14, marginBottom: 20 },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card:      { borderRadius: radius.lg, borderWidth: 1, padding: 14, minHeight: 120 },
  iconWrap:  { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  cardDesc:  { fontSize: 12, lineHeight: 17 },
});
