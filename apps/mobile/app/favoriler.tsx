import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert,
} from "react-native";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { useFavorites } from "../src/hooks/useFavorites";
import { api, prefetchAyah, type FavoriteVerse } from "../src/lib/api";
import { SkeletonListItem } from "../src/components/SkeletonLoader";
import * as Haptics from "expo-haptics";
import { READING_MAX_WIDTH } from "../src/lib/layout";

import { useMealOf } from "../src/lib/englishMeal";
import { useSurahNameOf } from "../src/lib/surahNames";
import { useStrings, getStrings, useLang, fmt } from "../src/i18n";
import personalStrings from "../src/i18n/strings/personal";
export default function FavorilerScreen() {
  const c = useColors();
  const t = useStrings(personalStrings);
  const mealOf = useMealOf();
  const isEn = useLang() === "en";
  const surahNameOf = useSurahNameOf();
  const insets = useSafeAreaInsets();
  const {
    favorites,
    loaded,
    toggle,
    clearAll,
    refresh,
    error: storageError,
  } = useFavorites();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const {
    data: verses = [],
    isLoading: loading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["favorite-verses", favorites],
    queryFn: () => api.favorites.fetch(favorites),
    enabled: loaded && favorites.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const requestError = storageError
    ?? (isError ? (queryError instanceof Error ? queryError.message : t.favLoadFail) : null);

  const handleRetry = useCallback(async () => {
    await refresh();
    if (favorites.length > 0) await refetch();
  }, [favorites.length, refetch, refresh]);

  function handleClearAll() {
    Alert.alert(t.clearAllTitle, t.clearAllBody, [
      { text: t.cancel, style: "cancel" },
      { text: t.clear, style: "destructive", onPress: () => clearAll() },
    ]);
  }

  const handleRemoveOne = useCallback((verseKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.removeFavTitle, t.removeFavBody, [
      { text: t.cancel, style: "cancel" },
      { text: t.remove, style: "destructive", onPress: () => toggle(verseKey) },
    ]);
  }, [toggle, t]);

  const renderItem = useCallback(({ item }: { item: FavoriteVerse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
      onPressIn={() => prefetchAyah(item.surah_id, item.ayah_number)}
      onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.favOpenA11y, { name: surahNameOf(item.surah_id, item.surah_name) ?? item.verse_key, n: item.ayah_number })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.keyBadge}>
          <Text style={styles.keyText}>{item.verse_key}</Text>
        </View>
        {item.surah_name && (
          <Text style={[styles.surahText, { color: c.textMuted }]} numberOfLines={1}>
            {fmt(t.favSurahLine, { name: surahNameOf(item.surah_id, item.surah_name) ?? "", n: item.ayah_number })}
          </Text>
        )}
        <TouchableOpacity onPress={() => handleRemoveOne(item.verse_key)} hitSlop={8} style={styles.heartBtn} accessibilityRole="button" accessibilityLabel={t.removeFavA11y}>
          <Text style={{ fontSize: 18 }}>❤️</Text>
        </TouchableOpacity>
      </View>
      {item.meal && (
        <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={3}>{mealOf(item.verse_key, item.meal)}</Text>
      )}
      {!isEn && (item.ana_tema || item.alt_taglar?.length > 0) && (
        <View style={styles.tagRow}>
          {item.ana_tema && (
            <TouchableOpacity
              style={[styles.tag, styles.tagPrimary]}
              onPress={() => { if (item.ana_tema) router.push(`/search?tag=${encodeURIComponent(item.ana_tema)}&page=1`); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.searchTagA11y, { tag: item.ana_tema })}
            >
              <Text style={styles.tagTextPrimary}>{item.ana_tema}</Text>
            </TouchableOpacity>
          )}
          {item.alt_taglar?.slice(0, 3).map(tag => (
            <TouchableOpacity
              key={tag}
              style={styles.tag}
              onPress={() => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.searchTagA11y, { tag })}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  ), [c, handleRemoveOne, isEn, mealOf, surahNameOf, t]);

  if (!loaded || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg, paddingTop: 14 }]}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (requestError && favorites.length > 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.favErrTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>{requestError}</Text>
        <TouchableOpacity
          style={[styles.goBtn, { backgroundColor: c.accent }]}
          onPress={handleRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t.retryA11y}
        >
          <Text style={styles.goBtnText}>{t.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>🤍</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.favEmptyTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          {t.favEmptySub}
        </Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: c.accent }]} onPress={() => router.push("/sure-listesi")} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t.browseA11y}>
          <Text style={styles.goBtnText}>{t.browse}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlashList
      data={verses}
      keyExtractor={(v) => v.verse_key}
      contentContainerStyle={[styles.list, { paddingTop: 14, paddingBottom: insets.bottom + 32 }]}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.count, { color: c.textMuted }]}>{fmt(t.favCount, { n: favorites.length })}</Text>
          <TouchableOpacity onPress={handleClearAll} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.clearAllFavA11y}>
            <Text style={styles.clearAll}>{t.clearAllTitle}</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#f5f0e8", gap: 10 },
  loadingContainer:{ flex: 1, padding: 12, gap: 10, backgroundColor: "#f5f0e8" },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 18, fontWeight: "700", color: "#1c1917" },
  emptySub:        { fontSize: 13, color: "#78716c", textAlign: "center", lineHeight: 20 },
  goBtn:           { backgroundColor: "#059669", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 6 },
  goBtnText:       { color: "#fff", fontWeight: "700", fontSize: 14 },
  // Arka plan bilinçli YOK: Stack contentStyle (c.bg) görünür — gece modunda
  // sabit krem kalmasın (boş/hata durumları zaten c.bg override'ı kullanıyor).
  list:            { padding: 12, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  count:           { fontSize: 13, color: "#78716c", fontWeight: "500" },
  clearAll:        { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  card: {
    backgroundColor: "#fffdf6", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#e7dfcc",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge:    { backgroundColor: "#d1fae5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  keyText:     { fontSize: 11, fontWeight: "700", color: "#065f46" },
  surahText:   { fontSize: 13, color: "#78716c", flex: 1 },
  heartBtn:    { padding: 2 },
  mealText:    { fontSize: 14, lineHeight: 22, color: "#292524", marginBottom: 8 },
  tagRow:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: "#f5f0e8", borderWidth: 1, borderColor: "#e7dfcc" },
  tagPrimary:  { backgroundColor: "#d1fae5", borderColor: "#6ee7b7" },
  tagText:     { fontSize: 11, color: "#78716c", fontWeight: "500" },
  tagTextPrimary: { fontSize: 11, color: "#065f46", fontWeight: "600" },
});
