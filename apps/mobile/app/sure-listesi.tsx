import {
  View, Text, TouchableOpacity,
  TextInput, StyleSheet, RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SurahListItem } from "../src/lib/api";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { SkeletonListItem } from "../src/components/SkeletonLoader";
import { useTourTarget } from "../src/tour/AppTourProvider";
import { NUZUL } from "../src/constants/nuzul";
import { READING_MAX_WIDTH } from "../src/lib/layout";

function PlaceBadge({ place, c }: { place: "Mekke" | "Medine"; c: AppColors }) {
  const isMekki = place === "Mekke";
  return (
    <View style={[styles.badge, {
      backgroundColor: isMekki
        ? (c.isDark ? "#064e3b" : "#d1fae5")
        : (c.isDark ? "#431407" : "#ffedd5"),
    }]}>
      <Text style={[styles.badgeText, {
        color: isMekki
          ? (c.isDark ? "#6ee7b7" : "#065f46")
          : (c.isDark ? "#fca5a5" : "#9a3412"),
      }]}>
        {place}
      </Text>
    </View>
  );
}

const SurahRow = memo(function SurahRow({ item, c, sortMode }: { item: SurahListItem; c: AppColors; sortMode: "mushaf" | "nuzul" }) {
  const circleNum    = sortMode === "nuzul" ? (NUZUL[item.id] ?? item.id) : item.id;
  const secondaryNum = sortMode === "nuzul" ? item.id : (NUZUL[item.id] ?? null);

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card }]}
      onPress={() => router.push(`/surah/${item.id}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.id}. sure: ${item.name}`}
    >
      <View style={[styles.rowNumber, { backgroundColor: c.isDark ? c.cardAlt : sortMode === "nuzul" ? "#ede9fe" : "#f5f0e8" }]}>
        <Text style={[styles.numberText, { color: sortMode === "nuzul" ? "#7c3aed" : c.textMuted }]} maxFontSizeMultiplier={1.2}>{circleNum}</Text>
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.surahName, { color: c.text }]}>{item.name}</Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.metaText, { color: c.textMuted }]}>{item.verseCount} ayet</Text>
          <PlaceBadge place={item.revelationPlace} c={c} />
          {secondaryNum != null && (
            <Text style={[styles.nuzulText, { color: c.textMuted }]}>
              {sortMode === "nuzul" ? `Mushaf: ${secondaryNum}` : `Nüzul: ${secondaryNum}`}
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.arabicName, { color: c.textSecondary }]}>{item.arabicName}</Text>
    </TouchableOpacity>
  );
});

export default function SureListesiScreen() {
  const c = useColors();
  const searchTarget = useTourTarget("surahList.search");
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs]     = useState<SurahListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState("");
  const [sortMode, setSortMode] = useState<"mushaf" | "nuzul">("mushaf");
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading((prev) => prev || surahs.length === 0);
    setError(null);
    api.surahs.list()
      .then((list) => { if (isMounted) setSurahs(list); })
      .catch(() => { if (isMounted) setError("Sureler yüklenemedi. İnternet bağlantısını kontrol edin."); })
      .finally(() => { if (isMounted) { setLoading(false); setRefreshing(false); } });
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  }, []);

  const filtered = useMemo(() => {
    const list = filter.trim()
      ? surahs.filter(s =>
          s.name.toLocaleLowerCase("tr-TR").includes(filter.toLocaleLowerCase("tr-TR")) ||
          s.translit.toLocaleLowerCase("tr-TR").includes(filter.toLocaleLowerCase("tr-TR")) ||
          String(s.id).startsWith(filter.trim()),
        )
      : [...surahs];
    if (sortMode === "nuzul") {
      list.sort((a, b) => (NUZUL[a.id] ?? 999) - (NUZUL[b.id] ?? 999));
    }
    return list;
  }, [surahs, filter, sortMode]);

  const renderItem = useCallback(
    ({ item }: { item: SurahListItem }) => <SurahRow item={item} c={c} sortMode={sortMode} />,
    [c, sortMode],
  );
  const keyExtractor = useCallback((item: SurahListItem) => String(item.id), []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg, alignItems: "stretch", justifyContent: "flex-start", padding: 12 }]}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.errorText, c.isDark && { color: "#f87171" }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: c.accent }]}
          onPress={() => { setLoading(true); setReloadKey((k) => k + 1); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Tekrar dene"
        >
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.centerWrap}>
      <View {...searchTarget} style={[styles.searchWrapper, { backgroundColor: c.bg }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="Sure ara (ad veya numara)"
          placeholderTextColor={c.textMuted}
          value={filter}
          onChangeText={setFilter}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <View style={[styles.toggleRow, { backgroundColor: c.cardAlt }]}>
          {(["mushaf", "nuzul"] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, sortMode === mode && { backgroundColor: c.accent }]}
              onPress={() => setSortMode(mode)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: sortMode === mode }}
              accessibilityLabel={mode === "mushaf" ? "Mushaf sırası" : "Nüzul sırası"}
            >
              <Text style={[styles.toggleText, { color: sortMode === mode ? "#fff" : c.textMuted }]}>
                {mode === "mushaf" ? "📖 Mushaf Sırası" : "✨ Nüzul Sırası"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border }]} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>Sonuç bulunamadı</Text>
            <Text style={[styles.emptySubText, { color: c.textMuted }]}>Farklı bir sure adı veya numara deneyin</Text>
          </View>
        }
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  centerWrap:   { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  errorText:    { color: "#dc2626", fontSize: 14, textAlign: "center" },
  retryBtn:     { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10, marginTop: 14 },
  retryText:    { color: "#fff", fontSize: 14, fontWeight: "700" },
  searchWrapper:{ paddingHorizontal: 16, paddingVertical: 10 },
  searchInput:  { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, marginBottom: 8 },
  toggleRow:    { flexDirection: "row", borderRadius: 10, padding: 3, gap: 3 },
  toggleBtn:    { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  toggleText:   { fontSize: 12, fontWeight: "600" },
  listContent:  { paddingBottom: 20, flexGrow: 1 },
  emptyState:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8 },
  emptyText:    { fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptySubText: { fontSize: 13, textAlign: "center" },
  separator:    { height: 1, marginLeft: 72 },
  row:          { flexDirection: "row", alignItems: "center", minHeight: 44, paddingVertical: 12, paddingHorizontal: 16 },
  rowNumber:    { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  numberText:   { fontSize: 13, fontWeight: "700" },
  rowCenter:    { flex: 1, gap: 3 },
  surahName:    { fontSize: 15, fontWeight: "600" },
  rowMeta:      { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText:     { fontSize: 12 },
  nuzulText:    { fontSize: 11 },
  arabicName:   { fontSize: 20, fontFamily: "Amiri", writingDirection: "rtl", textAlign: "right", marginLeft: 8 },
  badge:        { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:    { fontSize: 10, fontWeight: "600" },
});
