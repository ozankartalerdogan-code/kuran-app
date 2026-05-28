import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { api, type SurahListItem } from "../../src/lib/api";

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function PlaceBadge({ place }: { place: "Mekke" | "Medine" }) {
  const isMekki = place === "Mekke";
  return (
    <View style={[styles.badge, isMekki ? styles.badgeMekki : styles.badgeMedine]}>
      <Text style={[styles.badgeText, isMekki ? styles.badgeMekkiText : styles.badgeMedineText]}>
        {place}
      </Text>
    </View>
  );
}

function SurahRow({ item }: { item: SurahListItem }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/surah/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.rowNumber}>
        <Text style={styles.numberText}>{item.id}</Text>
      </View>

      <View style={styles.rowCenter}>
        <Text style={styles.surahName}>{item.name}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.metaText}>{item.verseCount} ayet</Text>
          <PlaceBadge place={item.revelationPlace} />
        </View>
      </View>

      <Text style={styles.arabicName}>{item.arabicName}</Text>
    </TouchableOpacity>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function SurahScreen() {
  const [surahs, setSurahs]   = useState<SurahListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    api.surahs
      .list()
      .then(setSurahs)
      .catch(() => setError("Sureler yüklenemedi. İnternet bağlantısını kontrol edin."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter.trim()
    ? surahs.filter(
        (s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.translit.toLowerCase().includes(filter.toLowerCase()) ||
          String(s.id).startsWith(filter.trim()),
      )
    : surahs;

  const renderItem = useCallback(
    ({ item }: { item: SurahListItem }) => <SurahRow item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: SurahListItem) => String(item.id), []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Sureler yükleniyor…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Arama */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Sure ara (ad veya numara)"
          placeholderTextColor="#a8a29e"
          value={filter}
          onChangeText={setFilter}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
            <Text style={styles.emptySubText}>Farklı bir sure adı veya numara deneyin</Text>
          </View>
        }
      />
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#f7f1e4" },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#f7f1e4" },
  loadingText: { marginTop: 12, color: "#78716c", fontSize: 14 },
  errorText:   { color: "#dc2626", fontSize: 14, textAlign: "center" },

  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical:   10,
    backgroundColor:   "#f7f1e4",
  },
  searchInput: {
    backgroundColor:  "#ffffff",
    borderRadius:     10,
    borderWidth:      1,
    borderColor:      "#e7e5e4",
    paddingHorizontal: 14,
    paddingVertical:   9,
    fontSize:          14,
    color:             "#1c1917",
  },

  listContent: { paddingBottom: 20, flexGrow: 1 },
  emptyState:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8 },
  emptyText:   { fontSize: 15, fontWeight: "600", color: "#44403c", textAlign: "center" },
  emptySubText:{ fontSize: 13, color: "#a8a29e", textAlign: "center" },
  separator:   { height: 1, backgroundColor: "#e7e5e4", marginLeft: 72 },

  row: {
    flexDirection:  "row",
    alignItems:     "center",
    minHeight:      44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor:   "#ffffff",
  },

  rowNumber: {
    width:          40,
    height:         40,
    borderRadius:   20,
    backgroundColor: "#f5f0e8",
    alignItems:     "center",
    justifyContent: "center",
    marginRight:    12,
  },
  numberText: { fontSize: 13, fontWeight: "700", color: "#78716c" },

  rowCenter: { flex: 1, gap: 3 },
  surahName: { fontSize: 15, fontWeight: "600", color: "#1c1917" },

  rowMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#78716c" },

  arabicName: {
    fontSize:   20,
    color:      "#1c1917",
    fontFamily: "serif",
    marginLeft: 8,
  },

  badge: {
    borderRadius:      10,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  badgeMekki:      { backgroundColor: "#d1fae5" },
  badgeMedine:     { backgroundColor: "#ffedd5" },
  badgeText:       { fontSize: 10, fontWeight: "600" },
  badgeMekkiText:  { color: "#065f46" },
  badgeMedineText: { color: "#9a3412" },
});
