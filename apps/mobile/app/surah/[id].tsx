import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { api, type VerseItem, type VerseListResponse } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";

// Okunuş + meal → her satır daha yüksek
const ITEM_HEIGHT = 88;

// ── Bileşenler ────────────────────────────────────────────────────────────────

function RevelationBadge({ place }: { place: "Mekke" | "Medine" }) {
  const isMekki = place === "Mekke";
  return (
    <View style={[styles.badge, isMekki ? styles.badgeMekki : styles.badgeMedine]}>
      <Text style={[styles.badgeText, isMekki ? styles.badgeMekkiText : styles.badgeMedineText]}>
        {place}
      </Text>
    </View>
  );
}

function SurahHeader({ data }: { data: VerseListResponse["surah"] }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerArabic} numberOfLines={1}>{data.arabicName}</Text>
      <Text style={styles.headerName}>{data.name}</Text>
      <View style={styles.headerMeta}>
        <Text style={styles.headerMetaText}>{data.verseCount} ayet</Text>
        <RevelationBadge place={data.revelationPlace} />
      </View>
    </View>
  );
}

interface VerseRowProps {
  item: VerseItem;
  onPress: (ayahNumber: number) => void;
}

function VerseRow({ item, onPress }: VerseRowProps) {
  const reading = item.reading ? item.reading.slice(0, 110) : null;
  const meal    = item.meal    ? item.meal.slice(0, 80)     : null;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(item.ayahNumber)}
      activeOpacity={0.7}
    >
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>{item.ayahNumber}</Text>
      </View>
      <View style={styles.rowContent}>
        {reading && (
          <Text style={styles.readingText} numberOfLines={2}>
            {reading}{(item.reading?.length ?? 0) > 110 ? "…" : ""}
          </Text>
        )}
        {meal && (
          <Text style={styles.mealText} numberOfLines={1}>
            {meal}{(item.meal?.length ?? 0) > 80 ? "…" : ""}
          </Text>
        )}
        {!reading && !meal && <Text style={styles.mealText}>—</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function SurahDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahId = Number(id);

  const [data, setData]       = useState<VerseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!surahId) return;
    api.verses
      .bySurah(surahId)
      .then((res) => {
        setData(res);
        // Sure açılınca ilk ayeti son okunan yer olarak kaydet
        storage.setJSON(STORAGE_KEYS.mushafBookmark, `${surahId}:1`).catch(() => {});
      })
      .catch(() => setError("Ayetler yüklenemedi. Bağlantını kontrol et."))
      .finally(() => setLoading(false));
  }, [surahId]);

  const handleAyahPress = useCallback(
    (ayahNumber: number) => {
      // Tıklanan ayeti bookmark'la
      storage.setJSON(STORAGE_KEYS.mushafBookmark, `${surahId}:${ayahNumber}`).catch(() => {});
      router.push(`/ayah/${surahId}/${ayahNumber}`);
    },
    [surahId],
  );

  const renderItem = useCallback(
    ({ item }: { item: VerseItem }) => (
      <VerseRow item={item} onPress={handleAyahPress} />
    ),
    [surahId, handleAyahPress],
  );

  const keyExtractor = useCallback(
    (item: VerseItem) => String(item.ayahNumber),
    [],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Ayetler yükleniyor…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Veri yüklenemedi."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data.verses}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={<SurahHeader data={data.surah} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        windowSize={5}
        maxToRenderPerBatch={15}
        removeClippedSubviews
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

  // ── Header ──
  header: {
    alignItems:       "center",
    backgroundColor:  "#ffffff",
    paddingVertical:  24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    marginBottom:      8,
  },
  headerArabic: {
    fontSize:   32,
    color:      "#1c1917",
    fontFamily: "serif",
    marginBottom: 6,
  },
  headerName: {
    fontSize:   20,
    fontWeight: "700",
    color:      "#1c1917",
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
  },
  headerMetaText: { fontSize: 13, color: "#78716c" },

  badge: {
    borderRadius:      10,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  badgeMekki:      { backgroundColor: "#d1fae5" },
  badgeMedine:     { backgroundColor: "#ffedd5" },
  badgeText:       { fontSize: 11, fontWeight: "600" },
  badgeMekkiText:  { color: "#065f46" },
  badgeMedineText: { color: "#9a3412" },

  // ── Liste ──
  listContent: { paddingBottom: 24 },
  separator:   { height: 1, backgroundColor: "#e7e5e4", marginLeft: 68 },

  row: {
    flexDirection:     "row",
    alignItems:        "center",
    minHeight:         ITEM_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical:   10,
    backgroundColor:   "#ffffff",
  },

  rowContent: {
    flex:  1,
    gap:   3,
  },

  readingText: {
    flex:       1,
    fontSize:   13,
    lineHeight: 19,
    color:      "#1c1917",
    fontStyle:  "italic",
  },

  numberCircle: {
    width:            40,
    height:           40,
    borderRadius:     20,
    backgroundColor:  "#f5f0e8",
    alignItems:       "center",
    justifyContent:   "center",
    marginRight:      12,
    flexShrink:       0,
  },
  numberText: { fontSize: 12, fontWeight: "700", color: "#78716c" },

  mealText: {
    fontSize:   11,
    lineHeight: 20,
    color:      "#44403c",
  },
});
