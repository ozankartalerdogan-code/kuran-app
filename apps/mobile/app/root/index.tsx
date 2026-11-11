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
import { useStrings, getStrings, fmt } from "../../src/i18n";
import rootStrings from "../../src/i18n/strings/root";
import { useTourTarget } from "../../src/tour/AppTourProvider";

type SortKey = "frequency" | "alphabetical" | "meaning";

const SORT_KEYS: Record<SortKey, "sortFrequency" | "sortAlphabetical" | "sortMeaning"> = {
  frequency: "sortFrequency",
  alphabetical: "sortAlphabetical",
  meaning: "sortMeaning",
};

const Separator = () => {
  const c = useColors();
  return <View style={[s.sep, { backgroundColor: c.cardAlt }]} />;
};

const arCollator = new Intl.Collator("ar");
const trCollator = new Intl.Collator("tr");

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
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: c.card }]}
      onPress={() => onPress(item.root)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.rootA11y, { root: item.root })}
      accessibilityHint={fmt(t.rootHint, { meaning: item.meaning_tr, n: item.frequency })}
    >
      <View style={s.cardLeft}>
        <Text style={[s.rootText, { color: c.text }]}>{item.root}</Text>
        <Text style={[s.meaningText, { color: c.textMuted }]} numberOfLines={1}>{item.meaning_tr}</Text>
      </View>
      <View style={[s.freqBadge, { backgroundColor: c.accentLight, borderColor: c.isDark ? "#065f46" : "#a7f3d0" }]}>
        <Text style={[s.freqText, c.isDark && { color: "#6ee7b7" }]}>{item.frequency}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function RootListScreen() {
  const c = useColors();
  const t = useStrings(rootStrings);
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
      const query = rawQuery.toLocaleLowerCase("tr-TR");
      const arQuery = normalizeArabic(rawQuery);
      list = list.filter((item) =>
        normalizeArabic(item.root).includes(arQuery) ||
        item.meaning_tr.toLocaleLowerCase("tr-TR").includes(query),
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
        list.sort((a, b) => trCollator.compare(a.meaning_tr, b.meaning_tr));
        break;
    }
    return list;
  }, [roots, search, sort]);

  const handlePress = useCallback((root: string) => {
    router.push(`/root/${encodeURIComponent(root)}`);
  }, []);

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
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { void fetchRoots(); }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t.retryListA11y}
            accessibilityHint={t.retryListHint}
          >
            <Text style={s.retryBtnText}>{t.retry}</Text>
          </TouchableOpacity>
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
          {(Object.keys(SORT_KEYS) as SortKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[s.sortBtn, { backgroundColor: c.card, borderColor: c.border }, sort === key && s.sortBtnActive]}
              onPress={() => setSort(key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.sortA11y, { label: t[SORT_KEYS[key]] })}
              accessibilityState={{ selected: sort === key }}
            >
              <Text style={[s.sortBtnText, { color: c.text }, sort === key && s.sortBtnTextActive]}>
                {t[SORT_KEYS[key]]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlashList
          data={filtered}
          keyExtractor={(item) => item.root}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyText}>{t.noResults}</Text>
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
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  centerWrap: { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  emptyText: { color: "#78716c", fontSize: 14 },
  retryBtn: { marginTop: 16, backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  searchBar: { margin: 12, backgroundColor: "#fffdf6", borderRadius: 12, borderWidth: 1, borderColor: "#e7dfcc", paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  searchInput: { fontSize: 14, color: "#1c1917", padding: 0 },

  sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  sortBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: "#fffdf6", borderWidth: 1, borderColor: "#e7dfcc", alignItems: "center" },
  sortBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  sortBtnText: { fontSize: 12, fontWeight: "600", color: "#44403c" },
  sortBtnTextActive: { color: "#fff" },

  list: { paddingHorizontal: 12, paddingBottom: 32 },
  sep: { height: 1, backgroundColor: "#f5f5f4", marginLeft: 72 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffdf6",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
  },
  cardLeft: { flex: 1 },
  rootText: { fontSize: 22, color: "#1c1917", marginBottom: 3 },
  meaningText: { fontSize: 12, color: "#78716c" },
  freqBadge: { backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#86efac" },
  freqText: { fontSize: 12, fontWeight: "700", color: "#065f46" },
});