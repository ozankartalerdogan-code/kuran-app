// Konular / Topics — tema taksonomisinden gezinme.
//   /konular            → gruplar → ana konular (başlık, kısa açıklama, ayet sayısı)
//   /konular?tema=KOD   → ana konu: alt konular (çip → /search?tag=) + sayfalı ayet listesi
// Başlıklar/sayılar çevrimdışı paketten (src/lib/themes.ts); ayet listesi
// /api/tags/filter (7 gün AsyncStorage cache, api.tags.filter).
import {
  View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, StyleSheet,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useLang, useStrings, fmt, caps } from "../src/i18n";
import konularStrings from "../src/i18n/strings/konular";
import { api, prefetchAyah, type TagFilterResult } from "../src/lib/api";
import { useMealOf } from "../src/lib/englishMeal";
import { useSurahNameOf } from "../src/lib/surahNames";
import {
  getGroups, getLevel1ByGroup, getThemeTitle, getThemeDescription, getThemeKind,
  getVerseCountsByMain, getSubTopics, resolveThemeCode, THEME_TAGS_ENABLED,
} from "../src/lib/themes";

export default function KonularScreen() {
  const params = useLocalSearchParams<{ tema?: string }>();
  const t = useStrings(konularStrings);
  const lang = useLang();
  const tema = typeof params.tema === "string" && params.tema ? params.tema : null;
  const code = tema ? resolveThemeCode(tema) : null;
  const title = code ? getThemeTitle(code, lang) : t.title;
  // Bayrak kapalıyken (release) doğrudan bağlantıyla gelinse de içerik gösterilmez.
  return (
    <>
      <Stack.Screen options={{ title }} />
      {!THEME_TAGS_ENABLED ? <TopicDetail code={null} /> : tema ? <TopicDetail code={code} /> : <TopicList />}
    </>
  );
}

// ── Liste: gruplar → ana konular ──────────────────────────────────────────────

function TopicList() {
  const c = useColors();
  const t = useStrings(konularStrings);
  const lang = useLang();
  const insets = useSafeAreaInsets();
  // İlk açılışta paket tembel yüklenir; sayım bir kez hesaplanıp bellekte kalır.
  const counts = useMemo(() => getVerseCountsByMain(), []);
  const sections = useMemo(
    () => getGroups()
      .map((g) => ({ group: g, items: getLevel1ByGroup(g.code) }))
      .filter((s) => s.items.length > 0),
    [],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}
    >
      <Text style={[s.intro, { color: c.textSecondary }]}>{t.intro}</Text>
      {sections.map(({ group, items }) => (
        <View key={group.code} style={s.section}>
          <View style={[s.sectionHeader, { borderBottomColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.textMuted }]} accessibilityRole="header">
              {caps(getThemeTitle(group.code, lang))}
            </Text>
          </View>
          <View style={s.cards}>
            {items.map((item) => {
              const name = getThemeTitle(item.code, lang);
              const desc = getThemeDescription(item.code, lang);
              const n = counts[item.code];
              const countText = n ? fmt(t.verseCount, { n }) : null;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => router.push(`/konular?tema=${encodeURIComponent(item.code)}` as Href)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={fmt(t.openTopicA11y, { name })}
                  accessibilityHint={[desc, countText].filter(Boolean).join(". ") || undefined}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: c.text }]}>{name}</Text>
                    {desc ? <Text style={[s.sub, { color: c.textMuted }]} numberOfLines={2}>{desc}</Text> : null}
                    {countText ? <Text style={[s.count, { color: c.accent }]}>{countText}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Detay: alt konular + ayetler ──────────────────────────────────────────────

type ListState = {
  results: TagFilterResult[];
  page: number;
  pages: number;
  total: number;
  loading: boolean;
  error: boolean;
};

const INITIAL: ListState = { results: [], page: 0, pages: 1, total: 0, loading: true, error: false };

function TopicDetail({ code }: { code: string | null }) {
  const c = useColors();
  const t = useStrings(konularStrings);
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const valid = !!code && getThemeKind(code) !== null;
  const desc = code ? getThemeDescription(code, lang) : null;
  const subs = useMemo(() => (code && getThemeKind(code) === "level1" ? getSubTopics(code) : []), [code]);
  const [st, setSt] = useState<ListState>(INITIAL);
  const reqId = useRef(0);

  const load = useCallback(async (page: number) => {
    if (!code) return;
    const id = ++reqId.current;
    setSt((p) => ({ ...p, loading: true, error: false }));
    try {
      const res = await api.tags.filter(code, page);
      if (id !== reqId.current) return;
      setSt((p) => {
        const seen = new Set(page === 1 ? [] : p.results.map((r) => r.verse_key));
        const merged = page === 1 ? res.results : [...p.results, ...res.results.filter((r) => !seen.has(r.verse_key))];
        return { results: merged, page: res.page, pages: res.pages, total: res.total, loading: false, error: false };
      });
    } catch {
      if (id !== reqId.current) return;
      setSt((p) => ({ ...p, loading: false, error: true }));
    }
  }, [code]);

  useEffect(() => {
    setSt(INITIAL);
    if (valid) load(1);
  }, [valid, load]);

  if (!valid) {
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <Text style={[s.intro, { color: c.textMuted }]}>{t.notFound}</Text>
      </View>
    );
  }

  const header = (
    <View>
      {desc ? <Text style={[s.intro, { color: c.textSecondary }]}>{desc}</Text> : null}
      {subs.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textMuted }]} accessibilityRole="header">{caps(t.subTopics)}</Text>
          <View style={s.chipRow}>
            {subs.map((sub) => {
              const name = getThemeTitle(sub, lang);
              return (
                <TouchableOpacity
                  key={sub}
                  style={[s.chip, { backgroundColor: c.isDark ? "#082f49" : "#f0f9ff", borderColor: c.isDark ? "#075985" : "#bae6fd" }]}
                  onPress={() => router.push(`/search?tag=${encodeURIComponent(sub)}&page=1` as Href)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={fmt(t.searchSubA11y, { name })}
                >
                  <Text style={[s.chipText, { color: c.isDark ? "#7dd3fc" : "#0369a1" }]}>{name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      <Text style={[s.sectionTitle, s.versesTitle, { color: c.textMuted }]} accessibilityRole="header">
        {caps(st.total > 0 ? fmt(t.versesTotal, { n: st.total }) : t.versesInTopic)}
      </Text>
    </View>
  );

  const footer = (
    <View style={s.footer}>
      {st.loading ? (
        <ActivityIndicator color={c.accent} />
      ) : st.error ? (
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={[s.sub, { color: c.textMuted, textAlign: "center" }]}>{t.loadError}</Text>
          <TouchableOpacity
            style={[s.moreBtn, { borderColor: c.border, backgroundColor: c.card }]}
            onPress={() => load(st.page + 1)}
            accessibilityRole="button"
            accessibilityLabel={t.retryA11y}
          >
            <Text style={[s.moreText, { color: c.accent }]}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : st.results.length === 0 ? (
        <Text style={[s.sub, { color: c.textMuted, textAlign: "center" }]}>{t.empty}</Text>
      ) : st.page < st.pages ? (
        <TouchableOpacity
          style={[s.moreBtn, { borderColor: c.border, backgroundColor: c.card }]}
          onPress={() => load(st.page + 1)}
          accessibilityRole="button"
          accessibilityLabel={t.loadMoreA11y}
        >
          <Text style={[s.moreText, { color: c.accent }]}>{t.loadMore}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}
      data={st.results}
      keyExtractor={(r) => r.verse_key}
      renderItem={({ item }) => <VerseRow item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
    />
  );
}

function VerseRow({ item }: { item: TagFilterResult }) {
  const c = useColors();
  const t = useStrings(konularStrings);
  const meal = useMealOf()(item.verse_key, item.meal);
  const surahNameOf = useSurahNameOf();
  const surah = surahNameOf(item.surah_id, item.surah_name);
  const label = surah ? `${surah}${fmt(t.ayahSuffix, { a: item.ayah_number })}` : item.verse_key;
  return (
    <TouchableOpacity
      style={[s.verseCard, { backgroundColor: c.card, borderColor: c.border }]}
      onPressIn={() => prefetchAyah(item.surah_id, item.ayah_number)}
      onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}` as Href)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.openVerseA11y, { name: label })}
    >
      <View style={s.verseHeader}>
        <View style={[s.keyBadge, { backgroundColor: c.accentLight }]}>
          <Text style={[s.keyText, { color: c.accent }]}>{item.verse_key}</Text>
        </View>
        {surah ? <Text style={[s.surah, { color: c.textMuted }]} numberOfLines={1}>{surah}</Text> : null}
      </View>
      <Text style={[s.meal, { color: meal ? c.textSecondary : c.textMuted }]} numberOfLines={3}>
        {meal || t.noMeal}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  section: { marginTop: 16 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.6 },
  versesTitle: { marginTop: 20, marginBottom: 10 },
  cards: { gap: 8 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56,
    borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14,
  },
  label: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  count: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { minHeight: 44, justifyContent: "center", borderRadius: 22, borderWidth: 1, paddingHorizontal: 14 },
  chipText: { fontSize: 14, fontWeight: "600" },
  footer: { paddingVertical: 20, alignItems: "center" },
  moreBtn: { minHeight: 44, minWidth: 160, borderRadius: 22, borderWidth: 1, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 14, fontWeight: "700" },
  verseCard: { borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 44 },
  verseHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  keyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  keyText: { fontSize: 12, fontWeight: "700" },
  surah: { fontSize: 12, flex: 1 },
  meal: { fontSize: 14, lineHeight: 20 },
});
