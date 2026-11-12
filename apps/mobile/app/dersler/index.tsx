import { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { DimensionValue } from "react-native";
import type { Href } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "../../src/hooks/useColors";
import { useDersProgress } from "../../src/hooks/useDersProgress";
import { DERSLER_META as DERSLER, getDerslerMeta, getKategoriler } from "../../src/data/Dersler/dersler_registry";
import { useLang, useStrings, fmt, caps } from "../../src/i18n";
import derslerStrings from "../../src/i18n/strings/dersler";
import { useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";

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
  const tourScroll = useTourScroller();

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

    return (
      <TouchableOpacity
        key={item.id}
        {...(item.id === "namaz" ? firstCardTarget : {})}
        style={[s.card, { backgroundColor: c.card, borderColor: done ? "#4ade80" : "#c9a84c" }]}
        onPress={() => { Haptics.selectionAsync(); router.push((item.route ?? "/dersler/" + item.id) as Href); }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={fmt(done ? t.cardA11yDone : t.cardA11y, { title: item.baslik, n: item.sure })}
      >
        {done && !item.route && (
          <View style={s.badge}><Text style={s.badgeText}>✓</Text></View>
        )}
        <Text style={s.ikon}>{item.ikon}</Text>
        <Text style={[s.baslik, { color: c.text }]}>{item.baslik}</Text>
        <Text style={s.kartBilgi}>{fmt(t.cardMinutes, { n: item.sure })}</Text>
        {pct > 0 && !item.route && (
          <View style={[s.progTrack, { backgroundColor: c.border }]}>
            <View style={[s.progFill, { width: `${Math.round(pct * 100)}%` as DimensionValue, backgroundColor: done ? "#4ade80" : "#c9a84c" }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [progress, c, firstCardTarget, t]);

  const renderItem = useCallback(
    ({ item }: { item: Ders }) => renderCard(item),
    [renderCard],
  );

  const footer = (
    <View style={s.kaynak}>
      <Text style={s.kaynakMetin}>
        {t.sources}
      </Text>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t.back}>
          <Text style={s.backText}>{t.backBtn}</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>{t.listTitle}</Text>
        <View style={s.headerSide} />
      </View>

      {/* Sıralama sekmeleri */}
      <View style={[s.tabRow, { borderBottomColor: c.border }]}>
        {TABS.map(tab => {
          const active = sortMode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => { Haptics.selectionAsync(); setSortMode(tab.key); }}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <Text style={[s.tabText, { color: active ? "#0a1628" : c.textMuted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {sortMode === "konu" ? (
        <ScrollView
          {...tourScroll}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle:   { flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  headerSide:    { width: 60 },
  backText:      { fontSize: 16, color: "#c9a84c", fontWeight: "600" },

  tabRow:        {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  tab:           {
    flex: 1, paddingVertical: 7, borderRadius: 20,
    alignItems: "center", backgroundColor: "transparent",
  },
  tabActive:     { backgroundColor: "#c9a84c" },
  tabText:       { fontSize: 12, fontWeight: "700" },

  listContent:   { paddingHorizontal: 12, paddingTop: 12 },
  row:           { flexDirection: "row" },
  card:          {
    flex: 1, margin: 6, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", paddingVertical: 22, paddingHorizontal: 10, gap: 8,
  },
  cardSpacer:    { flex: 1, margin: 6 },

  badge:         { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: "#4ade80", alignItems: "center", justifyContent: "center" },
  badgeText:     { fontSize: 11, color: "#fff", fontWeight: "800" },
  ikon:          { fontSize: 36 },
  baslik:        { fontSize: 14, fontWeight: "700", textAlign: "center" },
  kartBilgi:     { fontSize: 11, color: "#c9a84c", fontWeight: "600" },
  progTrack:     { alignSelf: "stretch", height: 3, borderRadius: 2 },
  progFill:      { height: 3, borderRadius: 2 },

  sectionHeader: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 4, marginHorizontal: 6 },

  kaynak:        { marginTop: 16, marginHorizontal: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#c9a84c22", backgroundColor: "#c9a84c0a" },
  kaynakMetin:   { fontSize: 11, color: "#888", textAlign: "center", lineHeight: 17 },
});
