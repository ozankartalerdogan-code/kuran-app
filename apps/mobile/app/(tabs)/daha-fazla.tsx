import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";
import { useAppTour, useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings, getLangPreference, setLangPreference, useLang } from "../../src/i18n";
import type { LangPreference } from "../../src/i18n";
import dahaFazlaStrings from "../../src/i18n/strings/dahaFazla";
import { rescheduleNotificationsForLanguageChange } from "../../src/lib/namazNotifications";
import { refreshWidgetNow } from "../../src/widgets/widgetRefresh";

type Strings = Record<string, string>;

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

function buildSections(s: Strings): { title: string; items: Item[] }[] {
  return [
  {
    title: s.secDiscover,
    items: [
      { icon: "sparkles-outline", iconBg: "#fef3c7", iconColor: "#ca8a04", darkIconBg: "#713f12", darkIconColor: "#fde68a", label: s.esmaLabel, sub: s.esmaSub, route: "/esma" },
      { icon: "shield-outline", iconBg: "#dcfce7", iconColor: "#15803d", darkIconBg: "#14532d", darkIconColor: "#86efac", label: s.siginakLabel, sub: s.siginakSub, route: "/manevi-siginak" },
      { icon: "star-outline", iconBg: "#ffedd5", iconColor: "#c2410c", darkIconBg: "#7c2d12", darkIconColor: "#fdba74", label: s.ismiAzamLabel, sub: s.ismiAzamSub, route: "/manevi-siginak/ismi-azam" },
    ],
  },
  {
    title: s.secPersonal,
    items: [
      { icon: "heart-outline", iconBg: "#ffe4e6", iconColor: "#e11d48", darkIconBg: "#881337", darkIconColor: "#fda4af", label: s.favLabel, sub: s.favSub, route: "/favoriler" },
      { icon: "create-outline", iconBg: "#e0f2fe", iconColor: "#0369a1", darkIconBg: "#0c4a6e", darkIconColor: "#7dd3fc", label: s.notesLabel, sub: s.notesSub, route: "/notlar" },
    ],
  },
  {
    title: s.secApp,
    items: [
      { icon: "notifications-outline", iconBg: "#ede9fe", iconColor: "#7c3aed", darkIconBg: "#4c1d95", darkIconColor: "#c4b5fd", label: s.notifLabel, sub: s.notifSub, route: "/bildirimler" },
      // Widget yalnız Android'de var (react-native-android-widget) — iOS'ta
      // olmayan bir özelliği listelemeyelim (App Review 2.1/2.3).
      ...(Platform.OS === "android"
        ? [{ icon: "grid-outline", iconBg: "#fae8ff", iconColor: "#a21caf", darkIconBg: "#701a75", darkIconColor: "#f0abfc", label: s.widgetLabel, sub: s.widgetSub, route: "/widget-ekle" } satisfies Item]
        : []),
      { icon: "information-circle-outline", iconBg: "#dbeafe", iconColor: "#1d4ed8", darkIconBg: "#1e3a8a", darkIconColor: "#93c5fd", label: s.aboutLabel, sub: s.aboutSub, route: "/hakkinda" },
      { icon: "lock-closed-outline", iconBg: "#e5e7eb", iconColor: "#4b5563", darkIconBg: "#292524", darkIconColor: "#d6d3d1", label: s.privacyLabel, sub: s.privacySub, route: "/gizlilik" },
      { icon: "refresh-circle-outline", iconBg: "#cffafe", iconColor: "#0f766e", darkIconBg: "#134e4a", darkIconColor: "#99f6e4", label: s.tourLabel, sub: s.tourSub, action: "restartTour" },
    ],
  },
  ];
}

export default function DahaFazlaTab() {
  const c = useColors();
  const str = useStrings(dahaFazlaStrings);
  useLang();
  const SECTIONS = buildSections(str);
  const langPref = getLangPreference();
  const langOptions: { value: LangPreference; label: string }[] = [
    { value: "system", label: str.langSystem },
    { value: "tr", label: str.langTr },
    { value: "en", label: str.langEn },
  ];
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
        <Text style={[s.heading, { color: c.text }]}>{str.heading}</Text>

        {SECTIONS.map((section, si) => (
          <View key={si} {...(si === 2 ? appSectionTarget : {})} style={si > 0 ? s.section : undefined}>
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

        <View style={s.section}>
          <View style={[s.sectionHeader, { borderBottomColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.textMuted }]}>{str.langLabel}</Text>
          </View>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, flexDirection: "column", alignItems: "stretch", gap: 10 }]}>
            <Text style={[s.sub, { color: c.textMuted, marginTop: 0 }]}>{str.langSub}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {langOptions.map(opt => {
                const active = langPref === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { void setLangPreference(opt.value).then(() => Promise.all([rescheduleNotificationsForLanguageChange(), refreshWidgetNow()])).catch(() => {}); }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${str.langLabel}: ${opt.label}`}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active ? "#c9a84c" : c.border,
                      backgroundColor: active ? (c.isDark ? "#3f2d12" : "#fef3c7") : "transparent",
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: active ? "800" : "600", fontSize: 14 }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
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
