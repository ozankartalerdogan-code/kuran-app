import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";

const CARDS = [
  { label: "Sureler",   emoji: "📖", route: "/surah"     },
  { label: "Keşfet",    emoji: "🔍", route: "/discover"  },
  { label: "Favoriler", emoji: "❤️",  route: "/favorites" },
  { label: "Notlarım",  emoji: "📝", route: "/notes"     },
] as const;

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>📖</Text>
        <Text style={styles.heroTitle}>Kuran Analiz</Text>
        <Text style={styles.heroSub}>Türkçe meal · Kelime analizi · Dua kategorileri</Text>
      </View>

      <View style={styles.grid}>
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={styles.card}
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
  content:   { padding: 20 },

  hero: { alignItems: "center", paddingVertical: 32 },
  heroIcon:  { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: "700", color: "#1c1917", marginBottom: 6 },
  heroSub:   { fontSize: 13, color: "#78716c", textAlign: "center" },

  grid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           12,
    marginTop:     8,
  },
  card: {
    width:           "47%",
    backgroundColor: "#ffffff",
    borderRadius:    16,
    padding:         20,
    alignItems:      "center",
    gap:             8,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  cardEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
});
