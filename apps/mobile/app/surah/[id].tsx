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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type VerseItem, type VerseListResponse } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";
import { SkeletonListItem } from "../../src/components/SkeletonLoader";
import { logScreen } from "../../src/lib/analytics";

// Tefsir kartı — yerinde durur, tıklayınca ayrı tefsir sayfasına yönlendirir.
// (1.7MB metni tek <Text>'e basmak RN'i kilitlediği için ayrı ekranda pencereli render edilir.)
function TafsirCard({ surahId, surahName }: { surahId: number; surahName: string }) {
  const c = useColors();
  return (
    <View style={[tf.box, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={tf.header}
        onPress={() => router.push({ pathname: "/tafsir/[surahId]", params: { surahId, name: surahName } })}
        activeOpacity={0.75}
      >
        <View>
          <Text style={[tf.title, { color: c.text }]}>📚 Sure Tefsiri</Text>
          <Text style={[tf.sub, { color: c.textMuted }]}>Elmalılı Hamdi Yazır</Text>
        </View>
        <Text style={[tf.chevron, { color: c.accent }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const tf = StyleSheet.create({
  box:     { margin: 12, borderRadius: 14, borderWidth: 1, borderColor: "#e7e5e4", backgroundColor: "#fff", overflow: "hidden" },
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  title:   { fontSize: 14, fontWeight: "700", color: "#1c1917" },
  sub:     { fontSize: 11, color: "#a8a29e", marginTop: 1 },
  chevron: { color: "#059669", fontSize: 16 },
  body:    { paddingHorizontal: 14, paddingBottom: 14 },
  text:    { fontSize: 13, lineHeight: 22, color: "#44403c" },
  empty:   { fontSize: 13, color: "#a8a29e", fontStyle: "italic" },
});


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
  const c = useColors();
  return (
    <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
      <Text style={[styles.headerArabic, { color: c.text }]} numberOfLines={1}>{data.arabicName}</Text>
      <Text style={[styles.headerName, { color: c.accent }]}>{data.name}</Text>
      <View style={styles.headerMeta}>
        <Text style={[styles.headerMetaText, { color: c.textMuted }]}>{data.verseCount} ayet</Text>
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
  const c = useColors();
  const reading = item.reading ? item.reading.slice(0, 110) : null;
  const meal    = item.meal    ? item.meal.slice(0, 80)     : null;
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card }]}
      onPress={() => onPress(item.ayahNumber)}
      activeOpacity={0.7}
    >
      <View style={[styles.numberCircle, { backgroundColor: c.cardAlt }]}>
        <Text style={[styles.numberText, { color: c.textMuted }]}>{item.ayahNumber}</Text>
      </View>
      <View style={styles.rowContent}>
        {reading && (
          <Text style={[styles.readingText, { color: c.text }]} numberOfLines={2}>
            {reading}{(item.reading?.length ?? 0) > 110 ? "…" : ""}
          </Text>
        )}
        {meal && (
          <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={1}>
            {meal}{(item.meal?.length ?? 0) > 80 ? "…" : ""}
          </Text>
        )}
        {!reading && !meal && <Text style={[styles.mealText, { color: c.textMuted }]}>—</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function SurahDetailScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahId = Number(id);

  const [data, setData]         = useState<VerseListResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => { logScreen('SureDetay'); }, []);

  useEffect(() => {
    if (!surahId) return;
    let isMounted = true;
    // Sadece ayetleri bekle — tefsir akordiyon açılınca tembel yüklenir
    api.verses.bySurah(surahId)
      .then((res) => { if (isMounted) setData(res); })
      .catch(() => setError("Ayetler yüklenemedi. Bağlantını kontrol et."))
      .finally(() => setLoading(false));
    return () => { isMounted = false; };
  }, [surahId]);

  // Yer imi MANUEL — sure açmak/ayete tıklamak artık otomatik yer imi koymaz.
  const handleAyahPress = useCallback(
    (ayahNumber: number) => {
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

if (loading) {
    return (
      <View style={[styles.centered, { alignItems: 'stretch', justifyContent: 'flex-start', padding: 12, paddingTop: 60 }]}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
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
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <FlatList
        data={data.verses}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <SurahHeader data={data.surah} />
            <TafsirCard surahId={surahId} surahName={data.surah.name} />
          </>
        }
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border }]} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
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
  container:   { flex: 1, backgroundColor: "#f5f0e8" },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#f5f0e8" },
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
    fontFamily: "Amiri",
    writingDirection: "rtl",
    textAlign: "center",
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
    minHeight:         88,
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
