import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useNotes } from "../../src/hooks/useNotes";

export default function NotesScreen() {
  const { notes, saveNote } = useNotes();

  // Notları [{verseKey, text}] formatına çevir
  const noteList = Object.entries(notes)
    .filter(([, text]) => text.trim().length > 0)
    .map(([verseKey, text]) => ({ verseKey, text }));

  // verse_key → surah_id:ayah_number parse
  function parseKey(key: string) {
    const [s, a] = key.split(":").map(Number);
    return { surahId: s || 0, ayahNumber: a || 0 };
  }

  function formatKey(key: string) {
    const { surahId, ayahNumber } = parseKey(key);
    return `${surahId}. Sure · ${ayahNumber}. Ayet`;
  }

  if (noteList.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>Henüz not yok</Text>
        <Text style={styles.emptySub}>
          Ayet sayfasındaki 📝 butonu ile not ekleyebilirsin.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={noteList}
      keyExtractor={(item) => item.verseKey}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const { surahId, ayahNumber } = parseKey(item.verseKey);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/ayah/${surahId}/${ayahNumber}`)}
            activeOpacity={0.75}
          >
            <View style={styles.cardHeader}>
              <View style={styles.keyBadge}>
                <Text style={styles.keyText}>{item.verseKey}</Text>
              </View>
              <Text style={styles.verseLabel} numberOfLines={1}>
                {formatKey(item.verseKey)}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  saveNote(item.verseKey, "")
                }
                hitSlop={8}
              >
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.noteText} numberOfLines={4}>
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
  centered:    { flex:1, alignItems:"center", justifyContent:"center", padding:32, backgroundColor:"#f7f1e4", gap:10 },
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
  keyBadge:    { backgroundColor:"#fef9c3", borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  keyText:     { fontSize:11, fontWeight:"700", color:"#854d0e" },
  verseLabel:  { fontSize:13, color:"#78716c", flex:1 },
  deleteBtn:   { fontSize:13, color:"#a8a29e", padding:4 },
  noteText:    { fontSize:14, lineHeight:22, color:"#292524", fontStyle:"italic" },
});
