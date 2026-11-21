import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useState, useEffect, useCallback, memo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, prefetchAyah, type VerseItem, type VerseListResponse } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";
import { SkeletonListItem } from "../../src/components/SkeletonLoader";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { logScreen } from "../../src/lib/analytics";
import { useContextualHint } from "../../src/tour/useContextualHint";
import { ContextualHintCard, ContextualHintHelp } from "../../src/tour/ContextualHintCard";
import { useMealOf } from "../../src/lib/englishMeal";
import { useSurahNameOf } from "../../src/lib/surahNames";
import { useStrings, getStrings, useLang, fmt } from "../../src/i18n";
import { localizedVerseTranslit } from "../../src/lib/verseTranslitEn";
import { arabicVerseText } from "../../src/lib/quranArabic";
import { mushafMetniHazirla } from "../../src/lib/mushafText";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import surahStrings from "../../src/i18n/strings/surahs";
import { Badge, Button, MenuCard, radius, space, toneColors } from "../../src/components/ui";

// Uzun metni kelime sınırında kısaltır; performans için kısaltma korunur.
function clipWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

// Tefsir kartı — yerinde durur, tıklayınca ayrı tefsir sayfasına yönlendirir.
// (1.7MB metni tek <Text>'e basmak RN'i kilitlediği için ayrı ekranda pencereli render edilir.)
function TafsirCard({ surahId, surahName }: { surahId: number; surahName: string }) {
  const t = useStrings(surahStrings);
  return (
    <MenuCard
      title={t.tafsirTitle}
      subtitle="Elmalılı Hamdi Yazır"
      icon="library-outline"
      iconTone="emerald"
      onPress={() => router.push({ pathname: "/tafsir/[surahId]", params: { surahId, name: surahName } })}
      accessibilityLabel={t.tafsirA11y}
      style={styles.tafsirCard}
    />
  );
}


// ── Bileşenler ────────────────────────────────────────────────────────────────

function RevelationBadge({ place }: { place: "Mekke" | "Medine" }) {
  const t = useStrings(surahStrings);
  const isMekki = place === "Mekke";
  return <Badge label={isMekki ? t.mekke : t.medine} tone={isMekki ? "amber" : "emerald"} style={{ alignSelf: "center" }} />;
}

function SurahHeader({
  data,
  showArabic,
  onToggleArabic,
}: {
  data: VerseListResponse["surah"];
  showArabic: boolean;
  onToggleArabic: () => void;
}) {
  const surahNameOf = useSurahNameOf();
  const t = useStrings(surahStrings);
  const c = useColors();
  const emerald = toneColors(c, "emerald");
  return (
    <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
      <Text style={[styles.headerArabic, { color: c.text }]} numberOfLines={1}>{data.arabicName}</Text>
      <Text style={[styles.headerName, { color: c.accent }]}>{surahNameOf(data.id, data.name)}</Text>
      <View style={styles.headerMeta}>
        <Text style={[styles.headerMetaText, { color: c.textMuted }]}>{fmt(t.verseCount, { n: data.verseCount })}</Text>
        <RevelationBadge place={data.revelationPlace} />
        <TouchableOpacity
          style={[
            styles.arabicToggleBtn,
            {
              backgroundColor: showArabic ? emerald.bg : c.cardAlt,
              borderColor: showArabic ? c.greenBorder : c.border,
            },
          ]}
          onPress={onToggleArabic}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t.arabicToggleA11y}
          accessibilityState={{ selected: showArabic }}
        >
          <Text
            style={[
              styles.arabicToggleText,
              { color: showArabic ? emerald.fg : c.textSecondary },
            ]}
          >
            {t.arabicToggle}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface VerseRowProps {
  item: VerseItem;
  surahId: number;
  showArabic: boolean;
  onPress: (ayahNumber: number) => void;
  onPressIn?: (ayahNumber: number) => void;
}

const VerseRow = memo(function VerseRow({ item, surahId, showArabic, onPress, onPressIn }: VerseRowProps) {
  const c = useColors();
  const t = useStrings(surahStrings);
  const mealOf = useMealOf();
  const lang = useLang();
  const rawArabic = showArabic ? arabicVerseText(surahId, item.ayahNumber) : null;
  // Önce kelime sınırında kısalt, sonra KFGQPC uyumu ve vakıf öncesi NBSP uygula
  const arabic  = rawArabic    ? mushafMetniHazirla(clipWords(rawArabic, 120)) : null;
  const fullMeal = mealOf({ surah: surahId, ayah: item.ayahNumber }, item.meal);
  const readingSrc = localizedVerseTranslit({ surah: surahId, ayah: item.ayahNumber }, item.reading, lang);
  const reading = readingSrc ? clipWords(readingSrc, 140) : null;
  const meal    = fullMeal     ? clipWords(fullMeal, 120)  : null;
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card }]}
      onPressIn={() => onPressIn?.(item.ayahNumber)}
      onPress={() => onPress(item.ayahNumber)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.openVerseA11y, { n: item.ayahNumber })}
    >
      <View style={[styles.numberCircle, { backgroundColor: c.cardAlt }]}>
        <Text style={[styles.numberText, { color: c.textMuted }]}>{item.ayahNumber}</Text>
      </View>
      <View style={styles.rowContent}>
        {arabic && (
          <Text style={[styles.arabicText, { color: c.text }]} numberOfLines={1} ellipsizeMode="tail">
            {arabic}
          </Text>
        )}
        {reading && (
          <Text style={[styles.readingText, { color: c.text }]} numberOfLines={2} ellipsizeMode="tail">
            {reading}
          </Text>
        )}
        {meal && (
          <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={2} ellipsizeMode="tail">
            {meal}
          </Text>
        )}
        {!arabic && !reading && !meal && <Text style={[styles.mealText, { color: c.textMuted }]}>—</Text>}
      </View>
    </TouchableOpacity>
  );
});

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function SurahDetailScreen() {
  const surahNameOf = useSurahNameOf();
  const t = useStrings(surahStrings);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahId = Number(id);

  const [data, setData]         = useState<VerseListResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Arapça ayet satırı tercihi: "0" = kapalı, varsayılan açık
  const [showArabic, setShowArabic] = useState(
    () => storage.getStringSync(STORAGE_KEYS.surahArabic) !== "0",
  );
  const hint = useContextualHint("surahInteraction", !loading && !error && !!data?.verses.length, String(surahId));

  useEffect(() => { logScreen('SureDetay'); }, []);

  useEffect(() => {
    let active = true;
    storage.getString(STORAGE_KEYS.surahArabic).then((v) => {
      if (active && v !== null) setShowArabic(v !== "0");
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleToggleArabic = useCallback(() => {
    setShowArabic((prev) => {
      const next = !prev;
      storage.setString(STORAGE_KEYS.surahArabic, next ? "1" : "0").catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    if (!surahId) {
      setError(getStrings(surahStrings).invalidLink);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);
    // Sadece ayetleri bekle — tefsir akordiyon açılınca tembel yüklenir
    api.verses.bySurah(surahId)
      .then((res) => { if (isMounted) setData(res); })
      .catch(() => setError(getStrings(surahStrings).versesError))
      .finally(() => setLoading(false));
    return () => { isMounted = false; };
  }, [surahId, reloadKey]);

  // Yer imi MANUEL — sure açmak/ayete tıklamak artık otomatik yer imi koymaz.
  const handleAyahPress = useCallback(
    (ayahNumber: number) => {
      hint.targetAction();
      router.push(`/ayah/${surahId}/${ayahNumber}`);
    },
    [surahId, hint.targetAction],
  );

  const handleAyahPrefetch = useCallback(
    (ayahNumber: number) => prefetchAyah(surahId, ayahNumber),
    [surahId],
  );

  const renderItem = useCallback(
    ({ item }: { item: VerseItem }) => (
      <VerseRow
        item={item}
        surahId={surahId}
        showArabic={showArabic}
        onPress={handleAyahPress}
        onPressIn={handleAyahPrefetch}
      />
    ),
    [surahId, showArabic, handleAyahPress, handleAyahPrefetch],
  );

  const keyExtractor = useCallback(
    (item: VerseItem) => String(item.ayahNumber),
    [],
  );

if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg, alignItems: "stretch", justifyContent: "flex-start", padding: space.gutter, paddingTop: space.gutter }]}>
        <Stack.Screen options={{ title: t.surahTitle }} />
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title: t.surahTitle }} />
        <Text style={[styles.errorText, { color: c.errorText }]}>{error ?? t.dataError}</Text>
        {surahId ? (
          <Button
            variant="primary"
            label={t.retry}
            onPress={() => setReloadKey((k) => k + 1)}
            accessibilityLabel={t.retryA11y}
            style={{ marginTop: 14 }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View {...hint.targetProps} style={[styles.container, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: surahNameOf(data.surah.id, data.surah.name),
        headerRight: () => <ContextualHintHelp hint={hint} /> }} />
      {hint.display && <View style={[styles.hintCard, { borderColor: c.greenBorder }]}>
        <ContextualHintCard hint={hint} />
      </View>}
      <FlatList
        ref={hint.viewportRef}
        {...hint.scrollProps}
        data={data.verses}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <SurahHeader
              data={data.surah}
              showArabic={showArabic}
              onToggleArabic={handleToggleArabic}
            />
            <TafsirCard surahId={surahId} surahName={surahNameOf(data.surah.id, data.surah.name)} />
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
  container:  { flex: 1 },
  hintCard:   { marginHorizontal: space.gutter, marginTop: space.xs, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  tafsirCard: { marginHorizontal: space.gutter, marginTop: space.sm, marginBottom: space.xs },
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  errorText:  { fontSize: 14, textAlign: "center" },

  // ── Header ──
  header: {
    alignItems:        "center",
    paddingVertical:   space.lg,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom:      space.xs,
  },
  headerArabic: {
    fontSize:         32,
    fontFamily:       "Amiri",
    writingDirection: "rtl",
    textAlign:        "center",
    marginBottom:     6,
  },
  headerName: {
    fontSize:     20,
    fontWeight:   "700",
    marginBottom: space.xs,
  },
  headerMeta: {
    flexDirection:  "row",
    alignItems:     "center",
    flexWrap:       "wrap",
    justifyContent: "center",
    gap:            space.xs,
  },
  headerMetaText: { fontSize: 13 },
  arabicToggleBtn: {
    minHeight:         44,
    minWidth:          44,
    paddingHorizontal: space.sm,
    paddingVertical:   6,
    borderRadius:      radius.md,
    borderWidth:       1,
    alignItems:        "center",
    justifyContent:    "center",
  },
  arabicToggleText: {
    fontSize:   12,
    fontWeight: "600",
  },

  // ── Liste ──
  listContent: { paddingBottom: space.lg, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  separator:   { height: 1, marginLeft: 68 },

  row: {
    flexDirection:     "row",
    alignItems:        "center",
    minHeight:         64,
    paddingHorizontal: space.gutter,
    paddingVertical:   10,
  },

  rowContent: {
    flex: 1,
    gap:  3,
  },

  arabicText: {
    fontFamily:       "UthmanicHafs",
    fontSize:         20,
    lineHeight:       34,
    writingDirection: "rtl",
    textAlign:        "right",
  },

  readingText: {
    fontSize:   13,
    lineHeight: 19,
    fontStyle:  "italic",
  },

  numberCircle: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    marginRight:    space.sm,
    flexShrink:     0,
  },
  numberText: { fontSize: 12, fontWeight: "700" },

  mealText: {
    fontSize:   11,
    lineHeight: 20,
  },
});
