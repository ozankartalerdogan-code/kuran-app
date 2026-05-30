import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useFavorites } from "../../src/hooks/useFavorites";
import { api, type FavoriteVerse } from "../../src/lib/api";

export default function FavoritesScreen() {
  const { favorites, loaded, toggle } = useFavorites();
  const [verses, setVerses]   = useState<FavoriteVerse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVerses = useCallback(async (keys: string[]) => {
    if (keys.length === 0) { setVerses([]); return; }
    setLoading(true);
    try {
      const data = await api.favorites.fetch(keys);
      setVerses(data);
    } catch { setVerses([]); }
    finally  { setLoading(false); }
  }, []);

  // Sekmeye her dönüşte yenile
  useFocusEffect(
    useCallback(() => {
      if (loaded) fetchVerses(favorites);
    }, [loaded, favorites, fetchVerses]),
  );

  if (!loaded || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Favoriler yükleniyor…</Text>
      </View>
    );
  }

  if (verses.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🤍</Text>
        <Text style={styles.emptyTitle}>Henüz favori yok</Text>
        <Text style={styles.emptySub}>
          Ayet sayfasındaki ❤️ butonu ile ayet ekleyebilirsin.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={verses}
      keyExtractor={(v) => v.verse_key}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)}
          activeOpacity={0.75}
        >
          <View style={styles.cardHeader}>
            <View style={styles.keyBadge}>
              <Text style={styles.keyText}>{item.verse_key}</Text>
            </View>
            {item.surah_name && (
              <Text style={styles.surahText}>{item.surah_name} · {item.ayah_number}. ayet</Text>
            )}
            <TouchableOpacity
              onPress={() => toggle(item.verse_key)}
              hitSlop={8}
              style={styles.heartBtn}
            >
              <Text style={{ fontSize: 18 }}>❤️</Text>
            </TouchableOpacity>
          </View>
          {item.meal ? (
            <Text style={styles.mealText} numberOfLines={3}>{item.meal}</Text>
          ) : null}
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  centered:    { flex:1, alignItems:"center", justifyContent:"center", padding:32, backgroundColor:"#f7f1e4", gap:10 },
  loadingText: { color:"#78716c", fontSize:14 },
  emptyIcon:   { fontSize:48 },
  emptyTitle:  { fontSize:18, fontWeight:"700", color:"#1c1917" },
  emptySub:    { fontSize:13, color:"#78716c", textAlign:"center", lineHeight:20 },
  list:        { padding:12, paddingBottom:32, backgroundColor:"#f7f1e4" },
  card: {
    backgroundColor:"#fff", borderRadius:14, padding:14,
    borderWidth:1, borderColor:"#e7e5e4",
    shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:3, elevation:1,
  },
  cardHeader:  { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8 },
  keyBadge:    { backgroundColor:"#d1fae5", borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  keyText:     { fontSize:11, fontWeight:"700", color:"#065f46" },
  surahText:   { fontSize:13, color:"#78716c", flex:1 },
  heartBtn:    { padding:2 },
  mealText:    { fontSize:14, lineHeight:22, color:"#292524" },
});
