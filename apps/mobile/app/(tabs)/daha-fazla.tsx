import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";
import { useAppTour, useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type Item = {
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  darkIconBg: string;
  darkIconColor: string;
  label: string;
  sub: string;
  route?: string;
  action?: "restartTour";
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "🔍 Keşfet",
    items: [
      { icon: "sparkles-outline", iconBg: "#fef3c7", iconColor: "#ca8a04", darkIconBg: "#713f12", darkIconColor: "#fde68a", label: "Esmaül Hüsna", sub: "Allah'ın 99 ismi", route: "/esma" },
      { icon: "shield-outline", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac", label: "Manevi Sığınak", sub: "Korunma ve şifa duaları", route: "/manevi-siginak" },
      { icon: "star-outline", iconBg: "#ffedd5", iconColor: "#c2410c", darkIconBg: "#7c2d12", darkIconColor: "#fdba74", label: "İsmi Azam", sub: "Sekine ve korunma duaları", route: "/manevi-siginak/ismi-azam" },
    ],
  },
  {
    title: "👤 Kişisel",
    items: [
      { icon: "heart-outline", iconBg: "#ffe4e6", iconColor: "#e11d48", darkIconBg: "#881337", darkIconColor: "#fda4af", label: "Favorilerim", sub: "Kaydettiğin ayetler", route: "/favoriler" },
      { icon: "create-outline", iconBg: "#e0f2fe", iconColor: "#0369a1", darkIconBg: "#0c4a6e", darkIconColor: "#7dd3fc", label: "Notlarım", sub: "Kendi notların", route: "/notlar" },
    ],
  },
  {
    title: "⚙️ Uygulama",
    items: [
      { icon: "notifications-outline", iconBg: "#ede9fe", iconColor: "#7c3aed", darkIconBg: "#4c1d95", darkIconColor: "#c4b5fd", label: "Bildirimler", sub: "Namaz vakti ve günlük ayet bildirimleri", route: "/bildirimler" },
      { icon: "grid-outline", iconBg: "#fae8ff", iconColor: "#a21caf", darkIconBg: "#701a75", darkIconColor: "#f0abfc", label: "Ana Ekran Widget'ı", sub: "Emir ayetlerini ana ekranından takip et", route: "/widget-ekle" },
      { icon: "information-circle-outline", iconBg: "#dbeafe", iconColor: "#1d4ed8", darkIconBg: "#1e3a8a", darkIconColor: "#93c5fd", label: "Kaynaklar ve Açıklamalar", sub: "Kaynaklar, açıklamalar, versiyon bilgisi", route: "/hakkinda" },
      { icon: "lock-closed-outline", iconBg: "#e5e7eb", iconColor: "#4b5563", darkIconBg: "#292524", darkIconColor: "#d6d3d1", label: "Gizlilik Politikası", sub: "Verileriniz nasıl korunuyor", route: "/gizlilik" },
      { icon: "refresh-circle-outline", iconBg: "#cffafe", iconColor: "#0f766e", darkIconBg: "#134e4a", darkIconColor: "#99f6e4", label: "Tanıtımı Tekrar Göster", sub: "Uygulama rehberini baştan başlat", action: "restartTour" },
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
    if (item.action === "restartTour") {
      void restartTour();
      return;
    }

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
                  <View style={[s.iconWrap, { backgroundColor: c.isDark ? item.darkIconBg : item.iconBg }]}>
                    <Ionicons name={item.icon} size={20} color={c.isDark ? item.darkIconColor : item.iconColor} />
                  </View>
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
  content: { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  section: { marginTop: 24 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cards: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
});
