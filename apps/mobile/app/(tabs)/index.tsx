import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useStreak } from "../../src/hooks/useStreak";

const NAV_CARDS = [
  { label: "Sureler",         emoji: "📖", route: "/surah",           bg: "#d1fae5", border: "#6ee7b7" },
  { label: "Arama",           emoji: "🔍", route: "/discover",        bg: "#dbeafe", border: "#93c5fd" },
  { label: "Elif-Ba Öğren",   emoji: "🔤", route: "/ogren",           bg: "#fef3c7", border: "#fcd34d" },
  { label: "Namaz",           emoji: "🕌", route: "/namaz",           bg: "#e0e7ff", border: "#a5b4fc" },
  { label: "İbadet Rehberi",  emoji: "📿", route: "/ibadet-rehberi", bg: "#f0fdf4", border: "#86efac" },
  { label: "Manevi Sığınak",  emoji: "🛡️", route: "/manevi-siginak", bg: "#fce7f3", border: "#f9a8d4" },
  { label: "Kelime Kökü",     emoji: "🌿", route: "/root",            bg: "#fef3c7", border: "#fcd34d" },
  { label: "Mushaf",          emoji: "📜", route: "/mushaf",          bg: "#ede9fe", border: "#c4b5fd" },
  { label: "Favorilerim",     emoji: "❤️", route: "/favorites",       bg: "#fff1f2", border: "#fca5a5" },
] as const;

export default function HomeScreen() {
  const streak = useStreak();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>📖</Text>
        <Text style={styles.heroTitle}>Kuran Analiz</Text>
        <Text style={styles.heroSub}>Türkçe meal · Kelime analizi · Dua kategorileri</Text>
      </View>

      {/* Streak */}
      {streak.current > 0 && (
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>
              {streak.current} günlük seri!
            </Text>
            <Text style={styles.streakSub}>
              Rekor: {streak.longest} gün
            </Text>
          </View>
        </View>
      )}

      {/* Navigasyon kartları */}
      <View style={styles.grid}>
        {NAV_CARDS.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={[styles.card, { backgroundColor: card.bg, borderColor: card.border }]}
            onPress={() => router.push(card.route)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  content:   { padding: 20, paddingBottom: 32 },

  hero:       { alignItems:"center", paddingVertical:28 },
  heroIcon:   { fontSize:52, marginBottom:12 },
  heroTitle:  { fontSize:28, fontWeight:"700", color:"#1c1917", marginBottom:6 },
  heroSub:    { fontSize:13, color:"#78716c", textAlign:"center", lineHeight:20 },

  streakCard: {
    flexDirection:"row", alignItems:"center", gap:12,
    backgroundColor:"#fff7ed", borderRadius:14, padding:14,
    borderWidth:1, borderColor:"#fed7aa", marginBottom:16,
  },
  streakEmoji: { fontSize:28 },
  streakTitle: { fontSize:15, fontWeight:"700", color:"#9a3412" },
  streakSub:   { fontSize:12, color:"#c2410c", marginTop:2 },

  grid: { flexDirection:"row", flexWrap:"wrap", gap:12 },
  card: {
    width:"47%",
    borderRadius:16, borderWidth:1.5,
    padding:20, alignItems:"center", gap:8,
    shadowColor:"#000", shadowOffset:{width:0,height:1},
    shadowOpacity:0.06, shadowRadius:4, elevation:2,
  },
  cardEmoji: { fontSize:28 },
  cardLabel: { fontSize:13, fontWeight:"600", color:"#1c1917", textAlign:"center" },
});
