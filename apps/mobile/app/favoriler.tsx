import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert,
} from "react-native";
import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
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
import { useStrings, useLang, fmt } from "../src/i18n";
import personalStrings from "../src/i18n/strings/personal";
import { Badge, Button, space } from "../src/components/ui";
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
        <Badge label={item.verse_key} tone="emerald" style={styles.keyBadge} />
        {item.surah_name && (
          <Text style={[styles.surahText, { color: c.textMuted }]} numberOfLines={1}>
            {fmt(t.favSurahLine, { name: surahNameOf(item.surah_id, item.surah_name) ?? "", n: item.ayah_number })}
          </Text>
        )}
        <TouchableOpacity onPress={() => handleRemoveOne(item.verse_key)} hitSlop={12} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t.removeFavA11y}>
          <Ionicons name="heart" size={20} color={c.errorText} accessible={false} />
        </TouchableOpacity>
      </View>
      {item.meal && (
        <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={3}>{mealOf(item.verse_key, item.meal)}</Text>
      )}
      {!isEn && (item.ana_tema || item.alt_taglar?.length > 0) && (
        <View style={styles.tagRow}>
          {item.ana_tema && (
            <TouchableOpacity
              onPress={() => { if (item.ana_tema) router.push(`/search?tag=${encodeURIComponent(item.ana_tema)}&page=1`); }}
              activeOpacity={0.7}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.searchTagA11y, { tag: item.ana_tema })}
            >
              <Badge label={item.ana_tema} tone="emerald" />
            </TouchableOpacity>
          )}
          {item.alt_taglar?.slice(0, 3).map(tag => (
            <TouchableOpacity
              key={tag}
              onPress={() => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
              activeOpacity={0.7}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.searchTagA11y, { tag })}
            >
              <Badge label={tag} tone="neutral" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  ), [c, handleRemoveOne, isEn, mealOf, surahNameOf, t]);

  // Yerel favori yoksa ağ isteğini beklemeden doğrudan boş durumu göster.
  if (!loaded || (favorites.length > 0 && loading)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (requestError && favorites.length > 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.favErrTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>{requestError}</Text>
        <Button
          variant="primary"
          label={t.retry}
          onPress={handleRetry}
          accessibilityLabel={t.retryA11y}
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Ionicons name="heart-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.favEmptyTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          {t.favEmptySub}
        </Text>
        <Button
          variant="primary"
          label={t.browse}
          onPress={() => router.push("/sure-listesi")}
          accessibilityLabel={t.browseA11y}
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  return (
    <FlashList
      data={verses}
      keyExtractor={(v) => v.verse_key}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.count, { color: c.textMuted }]}>{fmt(t.favCount, { n: favorites.length })}</Text>
          <Button
            variant="ghost"
            tone="danger"
            label={t.clearAllTitle}
            onPress={handleClearAll}
            accessibilityLabel={t.clearAllFavA11y}
          />
        </View>
      }
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: 10 },
  loadingContainer:{ flex: 1, paddingHorizontal: space.gutter, paddingTop: space.md, gap: 10, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  emptyTitle:      { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySub:        { fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn:        { marginTop: 6 },
  // Arka plan bilinçli YOK: Stack contentStyle (c.bg) görünür — gece modunda
  // sabit krem kalmasın (boş/hata durumları zaten c.bg override'ı kullanıyor).
  list:            { paddingHorizontal: space.gutter, paddingTop: space.md, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  count:           { fontSize: 13, fontWeight: "500" },
  card:            { borderRadius: 14, paddingVertical: 14, paddingHorizontal: space.gutter, borderWidth: 1 },
  cardHeader:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge:        { alignSelf: "center" },
  surahText:       { fontSize: 13, flex: 1 },
  actionBtn:       { padding: 2 },
  mealText:        { fontSize: 14, lineHeight: 22 },
  tagRow:          { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
});
