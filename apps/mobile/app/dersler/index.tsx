import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { DimensionValue } from "react-native";
import type { Href } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../src/hooks/useColors";
import { useDersProgress } from "../../src/hooks/useDersProgress";
import { DERSLER_META as DERSLER, getDerslerMeta, getKategoriler } from "../../src/data/Dersler/dersler_registry";
import { useLang, useStrings, fmt, caps } from "../../src/i18n";
import derslerStrings from "../../src/i18n/strings/dersler";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { BackButton, Callout, Tabs, radius, space, toneColors } from "../../src/components/ui";

type SortMode = "tumu" | "sure" | "konu";

const TAB_KEYS: SortMode[] = ["tumu", "sure", "konu"];

type Ders = typeof DERSLER[number];

// Kart min. genişliği ~170dp — geniş (tablet) ekranda 2 yerine daha fazla
// sütun kullanılır, dar telefonda 2'de kalır.
const CARD_MIN_WIDTH = 170;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default function DerslerScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { width } = useWindowDimensions();
  const numColumns = Math.max(2, Math.floor(width / CARD_MIN_WIDTH));
  const { progress, load } = useDersProgress();
  const [sortMode, setSortMode] = useState<SortMode>("tumu");
  const firstCardTarget = useTourTarget("dersler.firstCard");
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const lang = useLang();
  const t = useStrings(derslerStrings);
  const TABS = TAB_KEYS.map((key) => ({ key, label: key === "tumu" ? t.tabAll : key === "sure" ? t.tabEasy : t.tabTopic }));
  const derslerL = useMemo(() => getDerslerMeta(lang), [lang]);
  const kategorilerL = useMemo(() => getKategoriler(lang), [lang]);
  const sortedData = useMemo(
    () => sortMode === "sure" ? [...derslerL].sort((a, b) => a.sure - b.sure) : derslerL,
    [sortMode, derslerL],
  );

  const renderCard = useCallback((item: Ders) => {
    const p = progress[item.id];
    const pct = p && !item.route ? Math.min(1, (p.gorülen + 1) / item.kartSayisi) : 0;
    const done = (!item.route && p?.quizBitti) ?? false;
    const tone = toneColors(c, item.ton);

    return (
      <TouchableOpacity
        key={item.id}
        {...(item.id === "namaz" ? firstCardTarget : {})}
        style={[s.card, { backgroundColor: c.card, borderColor: done ? c.greenBorder : c.border }]}
        onPress={() => { Haptics.selectionAsync(); router.push((item.route ?? "/dersler/" + item.id) as Href); }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={fmt(done ? t.cardA11yDone : t.cardA11y, { title: item.baslik, n: item.sure })}
      >
        {done && !item.route && (
          <View style={[s.badge, { backgroundColor: c.greenText }]}>
            <Text style={[s.badgeText, { color: c.bg }]}>✓</Text>
          </View>
        )}
        <View style={[s.ikonCircle, { backgroundColor: tone.bg }]}>
          <Ionicons name={item.ikon} size={28} color={tone.fg} accessible={false} importantForAccessibility="no" />
        </View>
        <Text style={[s.baslik, { color: c.text }]} numberOfLines={2}>{item.baslik}</Text>
        <Text style={[s.kartBilgi, { color: c.textMuted }]}>
          {fmt(t.cardMinutes, { n: item.sure })}{item.hasQuiz ? t.cardQuizSuffix : ""}
        </Text>
        {/* Çubuk her kartta yer tutar; yan yana kartların boyu eşit kalsın */}
        <View style={[s.progTrack, { backgroundColor: c.cardAlt, opacity: pct > 0 && !item.route ? 1 : 0 }]}>
          <View style={[s.progFill, { width: `${Math.round(pct * 100)}%` as DimensionValue, backgroundColor: done ? c.greenText : c.accent }]} />
        </View>
      </TouchableOpacity>
    );
  }, [progress, c, firstCardTarget, t]);

  const renderItem = useCallback(
    ({ item }: { item: Ders }) => renderCard(item),
    [renderCard],
  );

  const footer = (
    <Callout tone="neutral" style={s.kaynak}>
      {t.sources}
    </Callout>
  );

  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.headerSide}>
          <BackButton accessibilityLabel={t.back} />
        </View>
        <Text style={[s.headerTitle, { color: c.text }]}>{t.listTitle}</Text>
        <View style={s.headerSide} />
      </View>

      {/* Sıralama sekmeleri */}
      <View style={[s.tabRow, { borderBottomColor: c.border }]}>
        <Tabs
          items={TABS}
          value={sortMode}
          onChange={(key) => { Haptics.selectionAsync(); setSortMode(key); }}
          variant="segmented"
        />
      </View>

      {sortMode === "konu" ? (
        <ScrollView
          ref={scrollRef}
          scrollEventThrottle={32}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {kategorilerL.map(kat => {
            const katDersler = kat.ids
              .map(id => derslerL.find(d => d.id === id))
              .filter(Boolean) as Ders[];
            const pairs = chunk(katDersler, numColumns);
            return (
              <View key={kat.label}>
                <Text style={[s.sectionHeader, { color: c.textMuted }]}>{caps(kat.label)}</Text>
                {pairs.map((pair, i) => (
                  <View key={i} style={s.row}>
                    {pair.map(item => renderCard(item))}
                    {Array.from({ length: numColumns - pair.length }).map((_, j) => (
                      <View key={`spacer-${j}`} style={s.cardSpacer} />
                    ))}
                  </View>
                ))}
              </View>
            );
          })}
          {footer}
        </ScrollView>
      ) : (
        <FlashList
          data={sortedData}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={footer}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1 },
  header:        {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: space.gutter, paddingVertical: space.xs, borderBottomWidth: 1,
  },
  headerTitle:   { flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  headerSide:    { width: 48 },

  tabRow:        {
    paddingHorizontal: space.gutter, paddingVertical: space.sm, borderBottomWidth: 1,
  },

  listContent:   { paddingHorizontal: space.gutter - 6, paddingTop: space.sm },
  row:           { flexDirection: "row" },
  card:          {
    flex: 1, margin: 6, borderRadius: radius.lg, borderWidth: 1,
    alignItems: "center", paddingVertical: 22, paddingHorizontal: 10, gap: space.xs,
  },
  cardSpacer:    { flex: 1, margin: 6 },

  badge:         { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badgeText:     { fontSize: 11, fontWeight: "800" },
  ikonCircle:    { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  baslik:        { fontSize: 14, fontWeight: "700", textAlign: "center", lineHeight: 18, minHeight: 36 },
  kartBilgi:     { fontSize: 11, fontWeight: "600" },
  progTrack:     { alignSelf: "stretch", height: 3, borderRadius: 2 },
  progFill:      { height: 3, borderRadius: 2 },

  sectionHeader: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: space.md, marginBottom: space.xxs, marginHorizontal: 6 },

  kaynak:        { marginTop: space.md, marginHorizontal: 6 },
});
