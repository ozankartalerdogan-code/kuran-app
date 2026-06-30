import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useCallback, useMemo, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotes } from "../src/hooks/useNotes";
import { api } from "../src/lib/api";
import { useColors } from "../src/hooks/useColors";
import { SkeletonListItem } from "../src/components/SkeletonLoader";

export default function NotlarScreen() {
  const c = useColors();
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
  const [surahNames, setSurahNames] = useState<Record<string, string>>({});
  const [metaLoading, setMetaLoading] = useState(false);
  const [surahNamesError, setSurahNamesError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const noteList = useMemo(() => (
    Object.entries(notes)
      .filter(([, text]) => text.trim().length > 0)
      .map(([verseKey, text]) => ({ verseKey, text }))
  ), [notes]);

  const noteKeys = useMemo(() => noteList.map((n) => n.verseKey), [noteList]);

  useEffect(() => {
    let isMounted = true;

    if (!loaded || notesLoading) return () => { isMounted = false; };

    if (noteKeys.length === 0) {
      setSurahNames({});
      setSurahNamesError(null);
      setMetaLoading(false);
      return () => { isMounted = false; };
    }

    setMetaLoading(true);
    setSurahNamesError(null);

    api.favorites.fetch(noteKeys)
      .then((verses) => {
        if (!isMounted) return;
        const map: Record<string, string> = {};
        verses.forEach((v) => { if (v.surah_name) map[v.verse_key] = v.surah_name; });
        setSurahNames(map);
      })
      .catch(() => {
        if (!isMounted) return;
        setSurahNamesError("Bazı sure adları şu anda alınamadı; notlar ayet anahtarlarıyla gösteriliyor.");
      })
      .finally(() => {
        if (isMounted) setMetaLoading(false);
      });

    return () => { isMounted = false; };
  }, [loaded, notesLoading, noteKeys]);

  function parseKey(key: string) {
    const [s, a] = key.split(":").map(Number);
    return { surahId: s || 0, ayahNumber: a || 0 };
  }

  function formatLabel(key: string) {
    const { surahId, ayahNumber } = parseKey(key);
    const surahName = surahNames[key];
    if (surahName) return `${surahName}, ${ayahNumber}. Ayet`;
    return `${surahId}. Sure · ${ayahNumber}. Ayet`;
  }

  async function handleRetry() {
    await refresh();
  }

  function handleClearAll() {
    Alert.alert("Tümünü Sil", "Tüm notları silmek istediğinize emin misiniz?", [
      { text: "Hayır", style: "cancel" },
      {
        text: "Evet",
        style: "destructive",
        onPress: async () => {
          const ok = await clearAll();
          if (!ok) {
            Alert.alert("Notlar silinemedi", "Lütfen tekrar deneyin.");
          }
        },
      },
    ]);
  }

  function handleDeleteOne(verseKey: string) {
    Alert.alert("Notu Sil", "Bu notu silmek istediğinize emin misiniz?", [
      { text: "Hayır", style: "cancel" },
      {
        text: "Evet",
        style: "destructive",
        onPress: async () => {
          const ok = await saveNote(verseKey, "");
          if (!ok) {
            Alert.alert("Not silinemedi", "Lütfen tekrar deneyin.");
          }
        },
      },
    ]);
  }

  if (!loaded || notesLoading || metaLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg, paddingTop: insets.top + 14 }]}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (notesError) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Notlar yüklenemedi</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>{notesError}</Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: "#b45309" }]} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.goBtnText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (noteList.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Henüz not eklemediniz</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          Ayet detay sayfasının altındaki not alanından not ekleyebilirsiniz.
        </Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: "#b45309" }]} onPress={() => router.push("/sure-listesi")} activeOpacity={0.8}>
          <Text style={styles.goBtnText}>Surelere Göz At</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlashList
      data={noteList}
      keyExtractor={(item) => item.verseKey}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 14 }]}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.listHeader}>
            <Text style={[styles.noteCount, { color: c.textMuted }]}>{noteList.length} ayet için not kaydedildi</Text>
            <TouchableOpacity onPress={handleClearAll} hitSlop={8}>
              <Text style={styles.clearAll}>Tümünü Sil</Text>
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
            onPress={() => router.push(`/ayah/${surahId}/${ayahNumber}`)}
            activeOpacity={0.75}
          >
            <View style={styles.cardHeader}>
              <View style={styles.keyBadge}>
                <Text style={styles.keyText}>{item.verseKey}</Text>
              </View>
              <Text style={[styles.verseLabel, { color: c.textMuted }]} numberOfLines={1}>
                {formatLabel(item.verseKey)}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteOne(item.verseKey)} hitSlop={8}>
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
  list:            { padding: 12, paddingBottom: 32, backgroundColor: "#f5f0e8" },
  headerWrap:      { marginBottom: 10 },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteCount:       { fontSize: 13, color: "#78716c", fontWeight: "500" },
  clearAll:        { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  infoText:        { fontSize: 12, lineHeight: 18, marginTop: 8 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#e7e5e4",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge:    { backgroundColor: "#fef9c3", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  keyText:     { fontSize: 11, fontWeight: "700", color: "#854d0e" },
  verseLabel:  { fontSize: 13, color: "#78716c", flex: 1 },
  deleteBtn:   { fontSize: 14, padding: 4 },
  noteText:    { fontSize: 14, lineHeight: 22, color: "#292524", fontStyle: "italic" },
});
