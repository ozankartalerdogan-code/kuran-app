import { View, ScrollView, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useRef } from "react";
import { useColors } from "../../src/hooks/useColors";
import { openStoreListing } from "../../src/hooks/useStoreReview";
import { useAppTour, useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings, useLangPreference, setLangPreference } from "../../src/i18n";
import { MenuCard, ScreenHeading, SectionHeader, Tabs, space, type IoniconName, type Tone } from "../../src/components/ui";
import type { LangPreference } from "../../src/i18n";
import dahaFazlaStrings from "../../src/i18n/strings/dahaFazla";
import { rescheduleNotificationsForLanguageChange } from "../../src/lib/namazNotifications";
import { refreshWidgetNow, refreshPrayerWidgetsNow } from "../../src/widgets/widgetRefresh";

type Strings = Record<string, string>;

type Item = {
  icon: IoniconName;
  tone: Tone;
  label: string;
  sub: string;
  route?: string;
  action?: "restartTour" | "rateApp";
};

function buildSections(s: Strings): { title: string; items: Item[] }[] {
  return [
  {
    title: s.secDiscover,
    items: [
      { icon: "sparkles-outline", tone: "amber", label: s.esmaLabel, sub: s.esmaSub, route: "/esma" },
      { icon: "shield-outline", tone: "emerald", label: s.siginakLabel, sub: s.siginakSub, route: "/manevi-siginak" },
      { icon: "star-outline", tone: "violet", label: s.ismiAzamLabel, sub: s.ismiAzamSub, route: "/manevi-siginak/ismi-azam" },
    ],
  },
  {
    title: s.secPersonal,
    items: [
      { icon: "heart-outline", tone: "amber", label: s.favLabel, sub: s.favSub, route: "/favoriler" },
      { icon: "create-outline", tone: "sky", label: s.notesLabel, sub: s.notesSub, route: "/notlar" },
    ],
  },
  {
    title: s.secApp,
    items: [
      { icon: "notifications-outline", tone: "violet", label: s.notifLabel, sub: s.notifSub, route: "/bildirimler" },
      // Widget yalnız Android'de var (react-native-android-widget) — iOS'ta
      // olmayan bir özelliği listelemeyelim (App Review 2.1/2.3).
      ...(Platform.OS === "android"
        ? [{ icon: "grid-outline", tone: "emerald", label: s.widgetLabel, sub: s.widgetSub, route: "/widget-ekle" } satisfies Item]
        : []),
      { icon: "information-circle-outline", tone: "sky", label: s.aboutLabel, sub: s.aboutSub, route: "/hakkinda" },
      { icon: "lock-closed-outline", tone: "neutral", label: s.privacyLabel, sub: s.privacySub, route: "/gizlilik" },
      ...(Platform.OS === "android"
        ? [{ icon: "star-outline", tone: "amber", label: s.rateLabel, sub: s.rateSub, action: "rateApp" } satisfies Item]
        : []),
      { icon: "refresh-circle-outline", tone: "emerald", label: s.tourLabel, sub: s.tourSub, action: "restartTour" },
    ],
  },
  ];
}

export default function DahaFazlaTab() {
  const c = useColors();
  const str = useStrings(dahaFazlaStrings);
  const SECTIONS = buildSections(str);
  const langPref = useLangPreference();
  const langOptions: { value: LangPreference; label: string }[] = [
    { value: "system", label: str.langSystem },
    { value: "tr", label: str.langTr },
    { value: "en", label: str.langEn },
  ];
  const { restartTour } = useAppTour();
  const appSectionTarget = useTourTarget("more.appSection");
  const restartTourTarget = useTourTarget("more.restartTour");
  const scrollRef = useRef<ScrollView>(null);

  function handlePress(item: Item) {
    if (item.action === "rateApp") {
      void openStoreListing();
      return;
    }
    if (item.action === "restartTour") {
      void restartTour();
      return;
    }

    if (item.route) router.push(item.route as Href);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={32}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeading>{str.heading}</ScreenHeading>

        {SECTIONS.map((section, si) => (
          <View key={si} {...(si === 2 ? appSectionTarget : {})}>
            <SectionHeader title={section.title} first={si === 0} />
            <View style={s.cards}>
              {section.items.map((item, ii) => (
                <MenuCard
                  key={ii}
                  {...(item.action === "restartTour" ? restartTourTarget : {})}
                  icon={item.icon}
                  iconTone={item.tone}
                  title={item.label}
                  subtitle={item.sub}
                  onPress={() => handlePress(item)}
                />
              ))}
            </View>
          </View>
        ))}

        <SectionHeader title={str.langLabel} />
        <MenuCard title={str.langSub} trailing="none" icon="language-outline" iconTone="sky">
          <Tabs
            style={{ marginTop: 12 }}
            items={langOptions.map(opt => ({ key: opt.value, label: opt.label, accessibilityLabel: `${str.langLabel}: ${opt.label}` }))}
            value={langPref}
            onChange={value => { void setLangPreference(value).then(() => Promise.all([rescheduleNotificationsForLanguageChange(), refreshWidgetNow(), refreshPrayerWidgetsNow()])).catch(() => {}); }}
          />
        </MenuCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: space.gutter, paddingBottom: space.xl, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  cards: { gap: 10 },
});
