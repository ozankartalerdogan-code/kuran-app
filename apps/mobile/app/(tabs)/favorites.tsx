import { View, Text, StyleSheet } from "react-native";

export default function FavoritesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>❤️</Text>
      <Text style={styles.title}>Favoriler</Text>
      <Text style={styles.sub}>Kaydettiğin ayetler burada görünecek</Text>
      <Text style={styles.badge}>Yakında</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4", alignItems: "center", justifyContent: "center", padding: 24 },
  emoji:     { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 8 },
  sub:       { fontSize: 14, color: "#78716c", textAlign: "center", lineHeight: 20 },
  badge:     { marginTop: 16, backgroundColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, fontSize: 12, fontWeight: "600", color: "#6b7280", overflow: "hidden" },
});
