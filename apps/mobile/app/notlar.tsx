import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotes } from "../src/hooks/useNotes";
import { api, prefetchAyah } from "../src/lib/api";
import { useColors } from "../src/hooks/useColors";
import { SkeletonListItem } from "../src/components/SkeletonLoader";
import { useStrings, fmt } from "../src/i18n";
import personalStrings from "../src/i18n/strings/personal";
import { useSurahNameOf } from "../src/lib/surahNames";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { Badge, Button, space } from "../src/components/ui";

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

  // Yerel notlar hazırsa iskelet göstermeyiz; ayet bilgisi (metaLoading) beklenmez.
  if (!loaded || notesLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (notesError) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.notesErrTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>{notesError}</Text>
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

  if (noteList.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Ionicons name="document-text-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>{t.notesEmptyTitle}</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          {t.notesEmptySub}
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
      data={noteList}
      keyExtractor={(item) => item.verseKey}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.listHeader}>
            <Text style={[styles.count, { color: c.textMuted }]}>{fmt(t.notesCount, { n: noteList.length })}</Text>
            <Button
              variant="ghost"
              tone="danger"
              label={t.deleteAll}
              onPress={handleClearAll}
              accessibilityLabel={t.deleteAllNotesA11y}
            />
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
              <Badge label={item.verseKey} tone="emerald" style={styles.keyBadge} />
              <Text style={[styles.surahText, { color: c.textMuted }]} numberOfLines={1}>
                {formatLabel(item.verseKey)}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteOne(item.verseKey)} hitSlop={12} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t.deleteNoteA11y}>
                <Ionicons name="trash-outline" size={20} color={c.textMuted} accessible={false} />
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
  centered:        { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: 10 },
  loadingContainer:{ flex: 1, paddingHorizontal: space.gutter, paddingTop: space.md, gap: 10, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  emptyTitle:      { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySub:        { fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn:        { marginTop: 6 },
  // Arka plan bilinçli YOK: Stack contentStyle (c.bg) görünür — gece modunda
  // sabit krem kalmasın (boş/hata durumları zaten c.bg override'ı kullanıyor).
  list:            { paddingHorizontal: space.gutter, paddingTop: space.md, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  headerWrap:      { marginBottom: 10 },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count:           { fontSize: 13, fontWeight: "500" },
  infoText:        { fontSize: 12, lineHeight: 18, marginTop: 8 },
  card:            { borderRadius: 14, paddingVertical: 14, paddingHorizontal: space.gutter, borderWidth: 1 },
  cardHeader:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge:        { alignSelf: "center" },
  surahText:       { fontSize: 13, flex: 1 },
  actionBtn:       { padding: 2 },
  noteText:        { fontSize: 14, lineHeight: 22, fontStyle: "italic" },
});
