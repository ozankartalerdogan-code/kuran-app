import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useNotes } from "../../src/hooks/useNotes";
import { api } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";

export default function NotesScreen() {
  const c = useColors();
  const { notes, saveNote } = useNotes();
  const [surahNames, setSurahNames] = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);

  const noteList = Object.entries(notes)
    .filter(([, text]) => text.trim().length > 0)
    .map(([verseKey, text]) => ({ verseKey, text }));

  // Sure adlarını API'den çek
  useFocusEffect(useCallback(() => {
    if (noteList.length === 0) { setLoading(false); return; }
    const keys = noteList.map(n => n.verseKey);
    api.favorites.fetch(keys)
      .then(verses => {
        const map: Record<string, string> = {};
        verses.forEach(v => { if (v.surah_name) map[v.verse_key] = v.surah_name; });
        setSurahNames(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [notes]));

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

  function handleClearAll() {
    Alert.alert("Tümünü Sil", "Tüm notları silmek istediğinize emin misiniz?", [
      { text: "Hayır", style: "cancel" },
      {
        text: "Evet", style: "destructive",
        onPress: () => noteList.forEach(n => saveNote(n.verseKey, "")),
      },
    ]);
  }

  // Yükleniyor
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.skeleton, { backgroundColor: c.border }]} />
        ))}
      </View>
    );
  }

  if (noteList.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Henüz not eklemediniz</Text>
        <Text style={[styles.emptySub, { color: c.textMuted }]}>
          Ayet detay sayfasının altındaki not alanından not ekleyebilirsiniz.
        </Text>
        <TouchableOpacity style={[styles.goBtn, { backgroundColor: "#b45309" }]} onPress={() => router.push("/surah")} activeOpacity={0.8}>
          <Text style={styles.goBtnText}>Surelere Göz At</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={noteList}
      keyExtractor={(item) => item.verseKey}
      contentContainerStyle={[styles.list, { backgroundColor: c.bg }]}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.noteCount, { color: c.textMuted }]}>{noteList.length} ayet için not kaydedildi</Text>
          <TouchableOpacity onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearAll}>Tümünü Sil</Text>
          </TouchableOpacity>
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
              <TouchableOpacity onPress={() => saveNote(item.verseKey, "")} hitSlop={8}>
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
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  loadingContainer:{ flex: 1, padding: 12, gap: 10 },
  skeleton:        { height: 100, borderRadius: 14 },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 18, fontWeight: "700", color: "#1c1917" },
  emptySub:        { fontSize: 13, color: "#78716c", textAlign: "center", lineHeight: 20 },
  goBtn:           { backgroundColor: "#b45309", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 6 },
  goBtnText:       { color: "#fff", fontWeight: "700", fontSize: 14 },
  list:            { padding: 12, paddingBottom: 32, backgroundColor: "#f7f1e4" },
  listHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  noteCount:       { fontSize: 13, color: "#78716c", fontWeight: "500" },
  clearAll:        { fontSize: 13, color: "#ef4444", fontWeight: "600" },
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
