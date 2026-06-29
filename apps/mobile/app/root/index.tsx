/**
 * /root — Kök Listesi
 * 200 en çok geçen Arapça kök, arama + sıralama.
 */
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { router, Stack } from "expo-router";
import { api, type RootItem } from "../../src/lib/api";
import { useColors, type AppColors } from "../../src/hooks/useColors";

type SortKey = "frequency" | "alphabetical" | "meaning";

const SORT_LABELS: Record<SortKey, string> = {
  frequency: "Frekans",
  alphabetical: "Alfabetik",
  meaning: "Anlam",
};

const Separator = () => <View style={s.sep} />;

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
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: c.card }]}
      onPress={() => onPress(item.root)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.root} kökü`}
      accessibilityHint={`${item.meaning_tr} anlamı ve ${item.frequency} geçiş detayını açar`}
    >
      <View style={s.cardLeft}>
        <Text style={[s.rootText, { color: c.text }]}>{item.root}</Text>
        <Text style={[s.meaningText, { color: c.textMuted }]} numberOfLines={1}>{item.meaning_tr}</Text>
      </View>
      <View style={[s.freqBadge, c.isDark && { backgroundColor: "#064e3b", borderColor: "#065f46" }]}>
        <Text style={[s.freqText, c.isDark && { color: "#6ee7b7" }]}>{item.frequency}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function RootListScreen() {
  const c = useColors();
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
      setError("Kökler yüklenemedi.");
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
      const query = rawQuery.toLowerCase();
      const arQuery = normalizeArabic(rawQuery);
      list = list.filter((item) =>
        normalizeArabic(item.root).includes(arQuery) ||
        item.meaning_tr.toLowerCase().includes(query),
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
        <Stack.Screen options={{ title: "Kelime Kökleri" }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: "Kelime Kökleri" }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { void fetchRoots(); }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Kök listesini yeniden dene"
            accessibilityHint="Liste yükleme işlemini tekrar başlatır"
          >
            <Text style={s.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Kelime Kökleri" }} />
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <View style={[s.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            style={[s.searchInput, { color: c.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Kök veya anlam ara…"
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={s.sortRow}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[s.sortBtn, { backgroundColor: c.card, borderColor: c.border }, sort === key && s.sortBtnActive]}
              onPress={() => setSort(key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${SORT_LABELS[key]} sıralaması`}
              accessibilityState={{ selected: sort === key }}
            >
              <Text style={[s.sortBtnText, { color: c.text }, sort === key && s.sortBtnTextActive]}>
                {SORT_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlashList
          data={filtered}
          keyExtractor={(item) => item.root}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyText}>Sonuç bulunamadı</Text>
            </View>
          }
          ItemSeparatorComponent={Separator}
          renderItem={renderItem}
        />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  emptyText: { color: "#78716c", fontSize: 14 },
  retryBtn: { marginTop: 16, backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  searchBar: { margin: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4", paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  searchInput: { fontSize: 14, color: "#1c1917", padding: 0 },

  sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  sortBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e7e5e4", alignItems: "center" },
  sortBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  sortBtnText: { fontSize: 12, fontWeight: "600", color: "#44403c" },
  sortBtnTextActive: { color: "#fff" },

  list: { paddingHorizontal: 12, paddingBottom: 32 },
  sep: { height: 1, backgroundColor: "#f5f5f4", marginLeft: 72 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
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