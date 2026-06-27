import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "../../src/hooks/useColors";

const DERSLER = [
  { id: "namaz",          baslik: "Namaz",             ikon: "🕌", kartSayisi: 30 },
  { id: "namaz-dualar",  baslik: "Namaz Duaları",     ikon: "📿", kartSayisi: 14 },
  { id: "oruc",           baslik: "Oruç",              ikon: "🌙", kartSayisi: 14 },
  { id: "hac-umre",       baslik: "Hac & Umre",        ikon: "🕋", kartSayisi: 15 },
  { id: "iman-esaslari",  baslik: "İman Esasları",     ikon: "📖", kartSayisi: 8  },
  { id: "peygamberler",   baslik: "Peygamberler",      ikon: "⭐", kartSayisi: 10 },
  { id: "siyer",          baslik: "Siyer-i Nebi",      ikon: "🌿", kartSayisi: 18 },
  { id: "tecvid",         baslik: "Tecvid",            ikon: "📜", kartSayisi: 10 },
  { id: "abdest-gusul",   baslik: "Abdest & Gusül",    ikon: "💧", kartSayisi: 8  },
  { id: "ezan-kamet",     baslik: "Ezan & Kamet",      ikon: "🔊", kartSayisi: 6  },
  { id: "allah-sifatlari",baslik: "Allah'ın Sıfatları",ikon: "✨", kartSayisi: 8  },
  { id: "zekat",          baslik: "Zekat",             ikon: "🤲", kartSayisi: 6  },
];

type Ders = (typeof DERSLER)[number];

export default function DerslerScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();

  const renderItem = ({ item }: { item: Ders }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: c.card, borderColor: "#c9a84c" }]}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(("/dersler/" + item.id) as any);
      }}
      activeOpacity={0.8}
    >
      <Text style={s.ikon}>{item.ikon}</Text>
      <Text style={[s.baslik, { color: c.text }]}>{item.baslik}</Text>
      <Text style={s.kartBilgi}>{item.kartSayisi} kart</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>Dersler</Text>
        <View style={s.headerSide} />
      </View>

      <FlatList
        data={DERSLER}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  header:      {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  headerSide:  { width: 60 },
  backText:    { fontSize: 16, color: "#c9a84c", fontWeight: "600" },
  listContent: { paddingHorizontal: 12, paddingTop: 12 },
  card:        {
    flex: 1, margin: 6, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", paddingVertical: 22, paddingHorizontal: 10, gap: 8,
  },
  ikon:        { fontSize: 36 },
  baslik:      { fontSize: 14, fontWeight: "700", textAlign: "center" },
  kartBilgi:   { fontSize: 11, color: "#c9a84c", fontWeight: "600" },
});
