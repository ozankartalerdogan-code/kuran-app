import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useColors } from "../../src/hooks/useColors";
import { useAppTour, useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";

type Item = {
  emoji: string;
  label: string;
  sub: string;
  route?: string;
  action?: "restartTour";
};


const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "🔍 Keşfet",
    items: [
      { emoji: "✨", label: "Esmaül Hüsna",   sub: "Allah'ın 99 ismi",            route: "/esma"                     },
      { emoji: "🛡️", label: "Manevi Sığınak", sub: "Korunma ve şifa duaları",     route: "/manevi-siginak"           },
      { emoji: "🌟", label: "İsmi Azam",      sub: "Sekine ve korunma duaları", route: "/manevi-siginak/ismi-azam" },
    ],
  },
  {
    title: "👤 Kişisel",
    items: [
      { emoji: "❤️", label: "Favorilerim", sub: "Kaydettiğin ayetler", route: "/favoriler" },
      { emoji: "📝", label: "Notlarım",    sub: "Kendi notların",      route: "/notlar"    },
    ],
  },
  {
    title: "⚙️ Uygulama",
    items: [
      { emoji: "🔔", label: "Bildirimler", sub: "Namaz vakti ve günlük ayet bildirimleri", route: "/bildirimler" },
      { emoji: "ℹ️", label: "Hakkında & Kaynaklar", sub: "Referanslar, versiyon bilgisi", route: "/hakkinda" },
      { emoji: "🔒", label: "Gizlilik Politikası", sub: "Verileriniz nasıl korunuyor", route: "/gizlilik" },
      { emoji: "🧭", label: "Tanıtımı Tekrar Göster", sub: "Uygulama rehberini baştan başlat", action: "restartTour" },
    ],
  },
];

export default function DahaFazlaTab() {
  const c = useColors();
  const { restartTour } = useAppTour();
  const appSectionTarget = useTourTarget("more.appSection");
  const restartTourTarget = useTourTarget("more.restartTour");
  const tourScroll = useTourScroller();

  function handlePress(item: Item) {
    if (item.action === "restartTour") { void restartTour(); return; }
    if (item.route) router.push(item.route as Href);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        {...tourScroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.heading, { color: c.text }]}>Daha Fazla</Text>

        {SECTIONS.map((section, si) => (
          <View key={si} {...(section.title.includes("Uygulama") ? appSectionTarget : {})} style={si > 0 ? s.section : undefined}>
            <View style={[s.sectionHeader, { borderBottomColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.textMuted }]}>{section.title}</Text>
            </View>
            <View style={s.cards}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  {...(item.action === "restartTour" ? restartTourTarget : {})}
                  style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}: ${item.sub}`}
                >
                  <Text style={s.emoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: c.text }]}>{item.label}</Text>
                    <Text style={[s.sub, { color: c.textMuted }]}>{item.sub}</Text>
                  </View>
                  <Text style={s.chev}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content:       { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading:       { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  section:       { marginTop: 24 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cards:         { gap: 8 },
  card:          { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14,
                   borderWidth: 1, paddingVertical: 16, paddingHorizontal: 14 },
  emoji:         { fontSize: 26 },
  label:         { fontSize: 15, fontWeight: "700" },
  sub:           { fontSize: 12, marginTop: 2 },
  chev:          { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
});
