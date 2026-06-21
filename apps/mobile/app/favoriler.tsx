import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { useFavorites } from "../src/hooks/useFavorites";
import { api, type FavoriteVerse } from "../src/lib/api";

export default function FavorilerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, loaded, toggle, clearAll, refresh } = useFavorites();
  const [verses, setVerses]   = useState<FavoriteVerse[]>([]);
  const [loading, setLoading] = useState(false);

  // Her odaklanmada storage'dan yeniden yükle — başka ekranda (ayet sayfası)
  // eklenen/silinen favori burada da görünsün (eskiden yenilenmiyordu).
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const fetchVerses = useCallback(async (keys: string[]) => {
    if (keys.length === 0) { setVerses([]); return; }
    setLoading(true);
    try   { setVerses(await api.favorites.fetch(keys)); }
    catch { setVerses([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    if (loaded) fetchVerses(favorites);
  }, [loaded, favorites, fetchVerses]));

  function handleClearAll() {
    Alert.alert("Tümünü Temizle", "Tüm favori ayetleri kaldırmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Temizle", style: "destructive", onPress: () => clearAll() },
    ]);
  }

  const handleRemoveOne = useCallback((verseKey: string) => {
    Alert.alert("Favoriden Kaldır", "Bu ayeti favorilerden kaldırmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Kaldır", style: "destructive", onPress: () => toggle(verseKey) },
    ]);
  }, [toggle]);

  const renderItem = useCallback(({ item }: { item: FavoriteVerse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={styles.keyBadge}>
          <Text style={styles.keyText}>{item.verse_key}</Text>
        </View>
        {item.surah_name && (
          <Text style={[styles.surahText, { color: c.textMuted }]} numberOfLines={1}>
            {item.surah_name} · {item.ayah_number}. ayet
          </Text>
        )}
        <TouchableOpacity onPress={() => handleRemoveOne(item.verse_key)} hitSlop={8} style={styles.heartBtn}>
          <Text style={{ fontSize: 18 }}>❤️</Text>
        </TouchableOpacity>
      </View>
      {item.meal && (
        <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={3}>{item.meal}</Text>
      )}
      {(item.ana_tema || item.alt_taglar?.length > 0) && (
        <View style={styles.tagRow}>
          {item.ana_tema && (
            <TouchableOpacity
              style={[styles.tag, styles.tagPrimary]}
              onPress={() => router.push(`/search?tag=${encodeURIComponent(item.ana_tema!)}&page=1`)}
              activeOpacity={0.7}
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
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  ), [c, handleRemoveOne]);

  if (!loaded || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg, paddingTop: insets.top + 14 }]}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.skeleton, { backgroundColor: c.border }]} />
        ))}
      </View>
    );
  }

  if (verses.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>🤍</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Henüz favori ayet yok</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          Ayet sayfasındaki 🤍 butonuna dokunarak favori ekleyebilirsin.
        </Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: c.accent }]} onPress={() => router.push("/surah")} activeOpacity={0.8}>
          <Text style={styles.goBtnText}>Surelere Göz At</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={verses}
      keyExtractor={(v) => v.verse_key}
      contentContainerStyle={[styles.list, { backgroundColor: c.bg, paddingTop: insets.top + 14 }]}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={styles.count}>{verses.length} ayet kaydedildi</Text>
          <TouchableOpacity onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearAll}>Tümünü Temizle</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#f5f0e8", gap: 10 },
  loadingContainer:{ flex: 1, padding: 12, gap: 10, backgroundColor: "#f5f0e8" },
  skeleton:        { height: 110, borderRadius: 14, backgroundColor: "#e7e5e4" },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 18, fontWeight: "700", color: "#1c1917" },
  emptySub:        { fontSize: 13, color: "#78716c", textAlign: "center", lineHeight: 20 },
  goBtn:           { backgroundColor: "#059669", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 6 },
  goBtnText:       { color: "#fff", fontWeight: "700", fontSize: 14 },
  list:            { padding: 12, paddingBottom: 32, backgroundColor: "#f5f0e8" },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  count:           { fontSize: 13, color: "#78716c", fontWeight: "500" },
  clearAll:        { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#e7e5e4",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge:    { backgroundColor: "#d1fae5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  keyText:     { fontSize: 11, fontWeight: "700", color: "#065f46" },
  surahText:   { fontSize: 13, color: "#78716c", flex: 1 },
  heartBtn:    { padding: 2 },
  mealText:    { fontSize: 14, lineHeight: 22, color: "#292524", marginBottom: 8 },
  tagRow:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: "#f5f0e8", borderWidth: 1, borderColor: "#e7e5e4" },
  tagPrimary:  { backgroundColor: "#d1fae5", borderColor: "#6ee7b7" },
  tagText:     { fontSize: 11, color: "#78716c", fontWeight: "500" },
  tagTextPrimary: { fontSize: 11, color: "#065f46", fontWeight: "600" },
});
