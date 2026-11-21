/**
 * /root — Kök Listesi
 * 200 en çok geçen Arapça kök, arama + sıralama.
 */
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { router, Stack } from "expo-router";
import { api, type RootItem } from "../../src/lib/api";
import { useColors, type AppColors } from "../../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings, getStrings, fmt, useLang } from "../../src/i18n";
import { rootMeaningEn } from "../../src/lib/wordMeaningsEn";
import rootStrings from "../../src/i18n/strings/root";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { Button, Tabs, type TabItem } from "../../src/components/ui";

type SortKey = "frequency" | "alphabetical" | "meaning";

const SORT_KEYS: Record<SortKey, "sortFrequency" | "sortAlphabetical" | "sortMeaning"> = {
  frequency: "sortFrequency",
  alphabetical: "sortAlphabetical",
  meaning: "sortMeaning",
};

const Separator = () => {
  const c = useColors();
  return <View style={[s.sep, { backgroundColor: c.border }]} />;
};

const arCollator = new Intl.Collator("ar");
const trCollator = new Intl.Collator("tr");
const enCollator = new Intl.Collator("en");

// İngilizce arayüzde İngilizce kök anlamı; yoksa Türkçe (yan yana gösterilmez).
function rootMeaningText(item: RootItem, lang: string): string {
  if (lang === "en") {
    const en = rootMeaningEn(item.root, item.meaning_tr);
    if (en) return en;
  }
  return item.meaning_tr;
}

// Arapça arama normalizasyonu: hemze/elif varyantları, elif maksura, te marbuta
// ve harekeleri sadeleştir → kullanıcı "اله" yazınca "أله" kökünü de bulur.
function normalizeArabic(value: string): string {
  return value
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي")                       // ى → ي
    .replace(/ة/g, "ه")                       // ة → ه
    .replace(/[ً-ٰٟ]/g, "")              // harekeler
    .trim();
}

const RootRow = memo(function RootRow({ item, onPress, c }: { item: RootItem; onPress: (root: string) => void; c: AppColors }) {
  const t = useStrings(rootStrings);
  const lang = useLang();
  const meaning = rootMeaningText(item, lang);
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: c.card }]}
      onPress={() => onPress(item.root)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.rootA11y, { root: item.root })}
      accessibilityHint={fmt(t.rootHint, { meaning, n: item.frequency })}
    >
      <View style={s.cardLeft}>
        <Text style={[s.rootText, { color: c.text }]}>{item.root}</Text>
        <Text style={[s.meaningText, { color: c.textMuted }]} numberOfLines={1}>{meaning}</Text>
      </View>
      <View style={[s.freqBadge, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}>
        <Text style={[s.freqText, { color: c.greenText }]}>{item.frequency}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function RootListScreen() {
  const c = useColors();
  const t = useStrings(rootStrings);
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const listTarget = useTourTarget("root.list");
  const [roots, setRoots] = useState<RootItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("frequency");
  const isMountedRef = useRef(true);

  const fetchRoots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRoots = await api.roots.list();
      if (!isMountedRef.current) return;
      setRoots(nextRoots);
    } catch {
      if (!isMountedRef.current) return;
      setError(getStrings(rootStrings).listError);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoots();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchRoots]);

  const filtered = useMemo(() => {
    let list = [...roots];
    if (search.trim()) {
      const rawQuery = search.trim();
      const locale = lang === "en" ? "en-US" : "tr-TR";
      const query = rawQuery.toLocaleLowerCase(locale);
      const arQuery = normalizeArabic(rawQuery);
      list = list.filter((item) =>
        normalizeArabic(item.root).includes(arQuery) ||
        rootMeaningText(item, lang).toLocaleLowerCase(locale).includes(query),
      );
    }
    switch (sort) {
      case "frequency":
        list.sort((a, b) => b.frequency - a.frequency);
        break;
      case "alphabetical":
        list.sort((a, b) => arCollator.compare(a.root, b.root));
        break;
      case "meaning":
        list.sort((a, b) =>
          (lang === "en" ? enCollator : trCollator).compare(rootMeaningText(a, lang), rootMeaningText(b, lang)),
        );
        break;
    }
    return list;
  }, [roots, search, sort, lang]);

  const handlePress = useCallback((root: string) => {
    router.push(`/root/${encodeURIComponent(root)}`);
  }, []);

  const sortTabs = useMemo<TabItem<SortKey>[]>(
    () => (Object.keys(SORT_KEYS) as SortKey[]).map((key) => ({
      key,
      label: t[SORT_KEYS[key]],
      accessibilityLabel: fmt(t.sortA11y, { label: t[SORT_KEYS[key]] }),
    })),
    [t],
  );

  const renderItem = useCallback(
    ({ item }: { item: RootItem }) => <RootRow item={item} onPress={handlePress} c={c} />,
    [c, handlePress],
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t.title }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: t.title }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <Text style={[s.errorText, { color: c.errorText }]}>{error}</Text>
          <Button
            variant="primary"
            label={t.retry}
            onPress={() => { void fetchRoots(); }}
            accessibilityLabel={t.retryListA11y}
            accessibilityHint={t.retryListHint}
            style={{ marginTop: 16 }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <View style={s.centerWrap}>
        <View {...listTarget} style={[s.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            style={[s.searchInput, { color: c.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchPlaceholder}
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={s.sortRow}>
          <Tabs variant="segmented" items={sortTabs} value={sort} onChange={setSort} />
        </View>

        <FlashList
          data={filtered}
          keyExtractor={(item) => item.root}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={[s.emptyText, { color: c.textMuted }]}>{t.noResults}</Text>
            </View>
          }
          ItemSeparatorComponent={Separator}
          renderItem={renderItem}
        />
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 14, textAlign: "center" },
  emptyText: { fontSize: 14 },

  searchBar: { margin: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { fontSize: 14, padding: 0 },

  sortRow: { paddingHorizontal: 12, marginBottom: 4 },

  list: { paddingHorizontal: 12, paddingBottom: 32 },
  sep: { height: 1, marginLeft: 72 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
  },
  cardLeft: { flex: 1 },
  rootText: { fontSize: 22, marginBottom: 3 },
  meaningText: { fontSize: 12 },
  freqBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  freqText: { fontSize: 12, fontWeight: "700" },
});