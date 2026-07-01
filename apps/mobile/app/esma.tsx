import { useMemo, useState, useCallback } from "react";
import {
  View, Text, TextInput, StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { ESMA_UL_HUSNA, type EsmaItem } from "../src/data/esmaulHusna";

function norm(s: string) {
  return s.toLocaleLowerCase("tr-TR").trim();
}

export default function EsmaScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const q = norm(query);
    if (!q) return ESMA_UL_HUSNA;
    return ESMA_UL_HUSNA.filter(
      (e) => norm(e.isim).includes(q)
        || norm(e.arapca).includes(q)
        || norm(e.anlam).includes(q)
        || norm(e.kok).includes(q)
        || norm(e.kokAnlam).includes(q),
    );
  }, [query]);

  const renderItem = useCallback(({ item }: { item: EsmaItem }) => (
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
        <View style={[s.kokRow, { borderTopColor: c.border }]}>
          <Text style={[s.kokLabel, { color: c.textMuted }]}>KÖK</Text>
          <Text style={[s.kokArapca, { color: c.accent }]}>{item.kok}</Text>
          <Text style={[s.kokAnlam, { color: c.textMuted }]}>{item.kokAnlam}</Text>
        </View>
      </View>
    </View>
  ), [c]);

  return (
    <>
      <Stack.Screen options={{ title: "Esmaül Hüsna" }} />
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={[s.title, { color: c.text }]}>🕌 Esmaül Hüsna</Text>
          <Text style={[s.sub, { color: c.textMuted }]}>Allah&apos;ın 99 güzel ismi</Text>
          <Text style={[s.note, { color: c.textMuted }]}>Bu ekranda yaygın 99 isim tertibi esas alınmıştır; bazı kaynaklarda sıralama ve yazımda küçük farklar görülebilir.</Text>
        </View>

        <TextInput
          style={[s.search, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="İsim, Arapça, anlam veya kök ara…"
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        <FlashList
          data={data}
          keyExtractor={(e) => String(e.sira)}
          renderItem={renderItem}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 40 }]}
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
  note:      { fontSize: 12, color: "#78716c", marginTop: 6, lineHeight: 18 },
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
  kokRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e7e5e4",
  },
  kokLabel:  { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  kokArapca: { fontSize: 15, fontFamily: "Amiri", writingDirection: "rtl" },
  kokAnlam:  { fontSize: 11.5, flexShrink: 1, lineHeight: 16 },
  empty:  { textAlign: "center", marginTop: 40, fontSize: 14 },
});
