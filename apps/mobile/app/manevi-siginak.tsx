import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState } from "react";
import { router, Stack } from "expo-router";
import { api, type TagFilterResult } from "../src/lib/api";

const KORUMA_TAGS = [
  { tag: "korunma-nazar",   label: "Nazar & Kötülük",  emoji: "👁️", color: "#dbeafe" },
  { tag: "korunma-seytan",  label: "Şeytan'dan Sığınma",emoji: "🛡️", color: "#fce7f3" },
  { tag: "dua-korunma",     label: "Korunma Duaları",  emoji: "🤲", color: "#f0fdf4" },
  { tag: "korunma-genel",   label: "Genel Korunma",    emoji: "⚔️", color: "#fef3c7" },
  { tag: "dua-sifa",        label: "Şifa Duaları",     emoji: "💚", color: "#ecfdf5" },
  { tag: "ismiazam",        label: "İsmi Azam",        emoji: "✨", color: "#fdf4ff" },
  { tag: "sekine",          label: "Sekine",           emoji: "🌙", color: "#eff6ff" },
] as const;

// ── Öne çıkan kartlar (sayfa yönlendirmesi olan) ───────────────────────────
const FEATURED_CARDS = [
  {
    id: "ismi-azam",
    label: "İsmi Azam & Korunma Duaları",
    emoji: "✨",
    subtitle: "Allah'ın en büyük ismi, Sekine ve sahih korunma duaları — Arapça metinleriyle",
    route: "/manevi-siginak/ismi-azam",
    color: "#fef3c7",
  },
] as const;

export default function ManeviSiginakScreen() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [verses, setVerses]       = useState<TagFilterResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [total, setTotal]         = useState(0);

  async function loadTag(tag: string) {
    if (activeTag === tag) { setActiveTag(null); setVerses([]); setTotal(0); return; }
    setActiveTag(tag);
    setLoading(true);
    try {
      const res = await api.tags.filter(tag);
      setVerses(res.results);
      setTotal(res.total);
    } catch { setVerses([]); }
    finally  { setLoading(false); }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Manevi Sığınak" }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🛡️ Manevi Sığınak</Text>
          <Text style={styles.headerSub}>Korunma, şifa ve istiaze ayetleri</Text>
        </View>

        {/* Öne çıkan kartlar */}
        <View style={styles.featuredContainer}>
          {FEATURED_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.featuredCard, { backgroundColor: card.color }]}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.featuredEmoji}>{card.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredLabel}>{card.label}</Text>
                <Text style={styles.featuredSub} numberOfLines={2}>{card.subtitle}</Text>
              </View>
              <Text style={styles.featuredArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Kategori listesi */}
        <View style={styles.cats}>
          {KORUMA_TAGS.map((t) => (
            <TouchableOpacity
              key={t.tag}
              style={[styles.catRow, activeTag === t.tag && styles.catRowActive, { backgroundColor: activeTag === t.tag ? t.color : "#fff" }]}
              onPress={() => loadTag(t.tag)}
              activeOpacity={0.75}
            >
              <Text style={styles.catEmoji}>{t.emoji}</Text>
              <Text style={[styles.catLabel, activeTag === t.tag && { color: "#059669" }]}>{t.label}</Text>
              <Text style={styles.catChevron}>{activeTag === t.tag ? "▲" : "▼"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Yükleniyor */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        )}

        {/* Ayet listesi */}
        {!loading && verses.length > 0 && (
          <FlatList
            data={verses}
            keyExtractor={(v) => v.verse_key}
            contentContainerStyle={styles.verseList}
            ListHeaderComponent={
              total > verses.length ? (
                <Text style={styles.countHint}>{total} ayetten ilk {verses.length} gösteriliyor</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.verseCard}
                onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)}
                activeOpacity={0.75}
              >
                <View style={styles.verseHeader}>
                  <View style={styles.keyBadge}>
                    <Text style={styles.keyText}>{item.verse_key}</Text>
                  </View>
                  {item.surah_name && (
                    <Text style={styles.surahLabel} numberOfLines={1}>{item.surah_name}</Text>
                  )}
                </View>
                {item.meal && (
                  <Text style={styles.mealText} numberOfLines={3}>{item.meal}</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container:  { flex:1, backgroundColor:"#f7f1e4" },
  header:     { alignItems:"center", paddingVertical:20, paddingHorizontal:16 },
  headerTitle:{ fontSize:20, fontWeight:"700", color:"#1c1917" },
  headerSub:  { fontSize:13, color:"#78716c", marginTop:4, textAlign:"center" },
  cats:       { paddingHorizontal:12, gap:6 },
  catRow: {
    flexDirection:"row", alignItems:"center", gap:10,
    backgroundColor:"#fff", borderRadius:12, padding:14,
    borderWidth:1, borderColor:"#e7e5e4",
  },
  catRowActive: { borderColor:"#059669" },
  catEmoji:  { fontSize:20 },
  catLabel:  { flex:1, fontSize:14, fontWeight:"600", color:"#1c1917" },
  catChevron:{ fontSize:12, color:"#a8a29e" },
  centered:  { padding:32, alignItems:"center" },
  verseList: { padding:12, paddingBottom:32 },
  countHint: { fontSize:11, color:"#a8a29e", textAlign:"center", marginBottom:8 },
  verseCard: {
    backgroundColor:"#fff", borderRadius:12, padding:14,
    borderWidth:1, borderColor:"#e7e5e4",
  },
  verseHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8 },
  keyBadge:    { backgroundColor:"#fce7f3", borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  keyText:     { fontSize:11, fontWeight:"700", color:"#9d174d" },
  surahLabel:  { fontSize:12, color:"#78716c", flex:1 },
  mealText:    { fontSize:13, lineHeight:21, color:"#292524" },

  // Featured cards
  featuredContainer: { paddingHorizontal: 12, marginBottom: 8 },
  featuredCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#fde68a",
  },
  featuredEmoji: { fontSize: 28 },
  featuredLabel: { fontSize: 14, fontWeight: "700", color: "#1c1917", marginBottom: 2 },
  featuredSub:   { fontSize: 11, color: "#78716c", lineHeight: 16 },
  featuredArrow: { fontSize: 18, color: "#a8a29e", fontWeight: "700" },
});
