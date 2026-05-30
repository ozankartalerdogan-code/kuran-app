/**
 * /root — Kök Listesi
 * 200 en çok geçen Arapça kök, arama + sıralama.
 */
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { router, Stack } from "expo-router";
import { api, type RootItem } from "../../src/lib/api";

type SortKey = "frequency" | "alphabetical" | "meaning";

const SORT_LABELS: Record<SortKey, string> = {
  frequency:    "Frekans",
  alphabetical: "Alfabetik",
  meaning:      "Anlam",
};

export default function RootListScreen() {
  const [roots,   setRoots]   = useState<RootItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState<SortKey>("frequency");

  useEffect(() => {
    api.roots.list()
      .then(setRoots)
      .catch(() => setError("Kökler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...roots];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.root.includes(search.trim()) ||
        r.meaning_tr.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "frequency":    list.sort((a, b) => b.frequency - a.frequency); break;
      case "alphabetical": list.sort((a, b) => a.root.localeCompare(b.root, "ar")); break;
      case "meaning":      list.sort((a, b) => a.meaning_tr.localeCompare(b.meaning_tr, "tr")); break;
    }
    return list;
  }, [roots, search, sort]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Kelime Kökleri" }} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: "Hata" }} />
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Kelime Kökleri" }} />
      <View style={s.container}>
        {/* Arama */}
        <View style={s.searchBar}>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Kök veya anlam ara…"
            placeholderTextColor="#a8a29e"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Sıralama */}
        <View style={s.sortRow}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
            <TouchableOpacity
              key={k}
              style={[s.sortBtn, sort === k && s.sortBtnActive]}
              onPress={() => setSort(k)}
              activeOpacity={0.75}
            >
              <Text style={[s.sortBtnText, sort === k && s.sortBtnTextActive]}>
                {SORT_LABELS[k]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Liste */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.root}
          contentContainerStyle={s.list}
          initialNumToRender={20}
          windowSize={5}
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyText}>Sonuç bulunamadı</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/root/${encodeURIComponent(item.root)}`)}
              activeOpacity={0.75}
            >
              <View style={s.cardLeft}>
                <Text style={s.rootText}>{item.root}</Text>
                <Text style={s.meaningText} numberOfLines={1}>{item.meaning_tr}</Text>
              </View>
              <View style={s.freqBadge}>
                <Text style={s.freqText}>{item.frequency}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#f7f1e4" },
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText:  { color: "#dc2626", fontSize: 14, textAlign: "center" },
  emptyText:  { color: "#78716c", fontSize: 14 },

  searchBar: { margin: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4", paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  searchInput:{ fontSize: 14, color: "#1c1917", padding: 0 },

  sortRow:  { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  sortBtn:  { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e7e5e4", alignItems: "center" },
  sortBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  sortBtnText:   { fontSize: 12, fontWeight: "600", color: "#44403c" },
  sortBtnTextActive: { color: "#fff" },

  list: { paddingHorizontal: 12, paddingBottom: 32 },
  sep:  { height: 1, backgroundColor: "#f5f5f4", marginLeft: 72 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 12,
  },
  cardLeft:   { flex: 1 },
  rootText:   { fontSize: 22, color: "#1c1917", marginBottom: 3 },
  meaningText:{ fontSize: 12, color: "#78716c" },
  freqBadge:  { backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#86efac" },
  freqText:   { fontSize: 12, fontWeight: "700", color: "#065f46" },
});
