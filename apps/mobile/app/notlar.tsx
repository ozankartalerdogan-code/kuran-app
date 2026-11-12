import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotes } from "../src/hooks/useNotes";
import { api, prefetchAyah } from "../src/lib/api";
import { useColors } from "../src/hooks/useColors";
import { SkeletonListItem } from "../src/components/SkeletonLoader";
import { useStrings, getStrings, fmt } from "../src/i18n";
import personalStrings from "../src/i18n/strings/personal";
import { useSurahNameOf } from "../src/lib/surahNames";

export default function NotlarScreen() {
  const c = useColors();
  const t = useStrings(personalStrings);
  const insets = useSafeAreaInsets();
  const {
    notes,
    saveNote,
    clearAll,
    refresh,
    loaded,
    loading: notesLoading,
    error: notesError,
  } = useNotes();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const noteList = useMemo(() => (
    Object.entries(notes)
      .filter(([, text]) => text.trim().length > 0)
      .map(([verseKey, text]) => ({ verseKey, text }))
  ), [notes]);

  const noteKeys = useMemo(() => noteList.map((n) => n.verseKey), [noteList]);

  const {
    data: noteVerses,
    isLoading: metaLoading,
    isError: isSurahNamesError,
  } = useQuery({
    queryKey: ["note-verses", noteKeys],
    queryFn: () => api.favorites.fetch(noteKeys),
    enabled: loaded && !notesLoading && noteKeys.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const surahNameOf = useSurahNameOf();
  const surahNames = useMemo(() => {
    const map: Record<string, string> = {};
    noteVerses?.forEach((v) => { if (v.surah_name) map[v.verse_key] = surahNameOf(v.surah_id, v.surah_name); });
    return map;
  }, [noteVerses, surahNameOf]);

  const surahNamesError = isSurahNamesError
    ? t.surahNamesError
    : null;

  function parseKey(key: string) {
    const [s, a] = key.split(":").map(Number);
    return { surahId: s || 0, ayahNumber: a || 0 };
  }

  function formatLabel(key: string) {
    const { surahId, ayahNumber } = parseKey(key);
    const surahName = surahNames[key];
    if (surahName) return fmt(t.noteLabelNamed, { name: surahName, n: ayahNumber });
    return fmt(t.noteLabelId, { s: surahId, n: ayahNumber });
  }

  async function handleRetry() {
    await refresh();
  }

  function handleClearAll() {
    Alert.alert(t.deleteAllTitle, t.deleteAllBody, [
      { text: t.no, style: "cancel" },
      {
        text: t.yes,
        style: "destructive",
        onPress: async () => {
          const ok = await clearAll();
          if (!ok) {
            Alert.alert(t.notesDeleteFail, t.tryAgain);
          }
        },
      },
    ]);
  }

  function handleDeleteOne(verseKey: string) {
    Alert.alert(t.deleteNoteTitle, t.deleteNoteBody, [
      { text: t.no, style: "cancel" },
      {
        text: t.yes,
        style: "destructive",
        onPress: async () => {
          const ok = await saveNote(verseKey, "");
          if (!ok) {
            Alert.alert(t.noteDeleteFail, t.tryAgain);
          }
        },
      },
    ]);
  }

  if (!loaded || notesLoading || metaLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg, paddingTop: 14 }]}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (notesError) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.notesErrTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>{notesError}</Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: "#b45309" }]} onPress={handleRetry} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t.retryA11y}>
          <Text style={styles.goBtnText}>{t.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (noteList.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.notesEmptyTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          {t.notesEmptySub}
        </Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: "#b45309" }]} onPress={() => router.push("/sure-listesi")} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t.browseA11y}>
          <Text style={styles.goBtnText}>{t.browse}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlashList
      data={noteList}
      keyExtractor={(item) => item.verseKey}
      contentContainerStyle={[styles.list, { paddingTop: 14, paddingBottom: insets.bottom + 32 }]}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.listHeader}>
            <Text style={[styles.noteCount, { color: c.textMuted }]}>{fmt(t.notesCount, { n: noteList.length })}</Text>
            <TouchableOpacity onPress={handleClearAll} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.deleteAllNotesA11y}>
              <Text style={styles.clearAll}>{t.deleteAll}</Text>
            </TouchableOpacity>
          </View>
          {surahNamesError ? (
            <Text style={[styles.infoText, { color: c.textMuted }]}>{surahNamesError}</Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const { surahId, ayahNumber } = parseKey(item.verseKey);
        return (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
            onPressIn={() => prefetchAyah(surahId, ayahNumber)}
            onPress={() => router.push(`/ayah/${surahId}/${ayahNumber}`)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.openNoteA11y, { label: formatLabel(item.verseKey) })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.keyBadge}>
                <Text style={styles.keyText}>{item.verseKey}</Text>
              </View>
              <Text style={[styles.verseLabel, { color: c.textMuted }]} numberOfLines={1}>
                {formatLabel(item.verseKey)}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteOne(item.verseKey)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.deleteNoteA11y}>
                <Text style={styles.deleteBtn}>🗑</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.noteText, { color: c.textSecondary }]} numberOfLines={4}>
              {item.text}
            </Text>
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  loadingContainer:{ flex: 1, padding: 12, gap: 10 },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 18, fontWeight: "700", color: "#1c1917" },
  emptySub:        { fontSize: 13, color: "#78716c", textAlign: "center", lineHeight: 20 },
  goBtn:           { backgroundColor: "#b45309", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 6 },
  goBtnText:       { color: "#fff", fontWeight: "700", fontSize: 14 },
  // Arka plan bilinçli YOK: Stack contentStyle (c.bg) görünür — gece modunda
  // sabit krem kalmasın (boş/hata durumları zaten c.bg override'ı kullanıyor).
  list:            { padding: 12, paddingBottom: 32 },
  headerWrap:      { marginBottom: 10 },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteCount:       { fontSize: 13, color: "#78716c", fontWeight: "500" },
  clearAll:        { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  infoText:        { fontSize: 12, lineHeight: 18, marginTop: 8 },
  card: {
    backgroundColor: "#fffdf6", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#e7dfcc",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge:    { backgroundColor: "#fef9c3", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  keyText:     { fontSize: 11, fontWeight: "700", color: "#854d0e" },
  verseLabel:  { fontSize: 13, color: "#78716c", flex: 1 },
  deleteBtn:   { fontSize: 14, padding: 4 },
  noteText:    { fontSize: 14, lineHeight: 22, color: "#292524", fontStyle: "italic" },
});
