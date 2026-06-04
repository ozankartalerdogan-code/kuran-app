import { useMemo, useState } from "react";
import {
  View, Text, FlatList, TextInput, StyleSheet,
} from "react-native";
import { Stack } from "expo-router";
import { useColors } from "../src/hooks/useColors";
import { ESMA_UL_HUSNA, type EsmaItem } from "../src/data/esmaulHusna";

function norm(s: string) {
  return s.toLocaleLowerCase("tr-TR").trim();
}

export default function EsmaScreen() {
  const c = useColors();
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const q = norm(query);
    if (!q) return ESMA_UL_HUSNA;
    return ESMA_UL_HUSNA.filter(
      (e) => norm(e.isim).includes(q) || norm(e.anlam).includes(q),
    );
  }, [query]);

  const renderItem = ({ item }: { item: EsmaItem }) => (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[s.numBadge, { backgroundColor: c.accentLight ?? "#d1fae5" }]}>
        <Text style={[s.numText, { color: c.accent }]}>{item.sira}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.topRow}>
          <Text style={[s.isim, { color: c.text }]}>{item.isim}</Text>
          <Text style={[s.arapca, { color: c.text }]}>{item.arapca}</Text>
        </View>
        <Text style={[s.anlam, { color: c.textSecondary ?? c.textMuted }]}>{item.anlam}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Esmaül Hüsna" }} />
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <View style={s.header}>
          <Text style={[s.title, { color: c.text }]}>🕌 Esmaül Hüsna</Text>
          <Text style={[s.sub, { color: c.textMuted }]}>Allah&apos;ın 99 güzel ismi</Text>
        </View>

        <TextInput
          style={[s.search, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="İsim veya anlam ara…"
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        <FlatList
          data={data}
          keyExtractor={(e) => String(e.sira)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[s.empty, { color: c.textMuted }]}>Sonuç bulunamadı.</Text>
          }
        />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  header:    { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title:     { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  sub:       { fontSize: 13, color: "#78716c", marginTop: 2 },
  search: {
    marginHorizontal: 16, marginVertical: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 40, gap: 8 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  numBadge: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  numText: { fontSize: 13, fontWeight: "700", color: "#059669" },
  topRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 8,
  },
  isim:   { fontSize: 16, fontWeight: "700", color: "#1c1917", flexShrink: 1 },
  arapca: { fontSize: 22, fontFamily: "Amiri", writingDirection: "rtl", color: "#1c1917" },
  anlam:  { fontSize: 13, color: "#44403c", marginTop: 3, lineHeight: 19 },
  empty:  { textAlign: "center", marginTop: 40, fontSize: 14 },
});
