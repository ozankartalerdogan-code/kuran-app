import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useRef } from "react";
import * as Haptics from "expo-haptics";
import { useColors } from "../../src/hooks/useColors";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings } from "../../src/i18n";
import { MenuCard, ScreenHeading, SectionHeader, space, type IoniconName, type Tone } from "../../src/components/ui";
import ogrenStrings from "../../src/i18n/strings/ogrenTab";
import { THEME_TAGS_ENABLED } from "../../src/lib/themes";

type LearnItem = {
  icon: IoniconName;
  tone: Tone;
  label: string;
  sub: string;
  route: string;
};

const buildSections = (t: Record<string, string>) => [
  {
    title: t.secMid,
    items: [
      // Konular (tema etiketleri): doğrulama bitene kadar yalnız geliştirme build'inde.
      ...(THEME_TAGS_ENABLED
        ? [{ icon: "pricetags-outline", tone: "sky", label: t.topicsLabel, sub: t.topicsSub, route: "/konular" } satisfies LearnItem]
        : []),
      { icon: "people-outline", tone: "emerald", label: t.kissalarLabel, sub: t.kissalarSub, route: "/peygamber-kissalari" },
      { icon: "moon-outline", tone: "violet", label: t.siyerLabel, sub: t.siyerSub, route: "/siyer" },
      { icon: "calendar-outline", tone: "sky", label: t.mubarekLabel, sub: t.mubarekSub, route: "/mubarek-gunler" },
      { icon: "chatbubble-ellipses-outline", tone: "amber", label: t.hadisLabel, sub: t.hadisSub, route: "/hadisler" },
    ],
  },
  {
    title: t.secAdv,
    items: [
      { icon: "git-network-outline", tone: "violet", label: t.rootLabel, sub: t.rootSub, route: "/root" },
    ],
  },
] satisfies { title: string; items: LearnItem[] }[];

export default function OgrenTab() {
  const c = useColors();
  const t = useStrings(ogrenStrings);
  const SECTIONS = buildSections(t);
  const derslerTarget = useTourTarget("learn.dersler");
  const hadithTarget = useTourTarget("learn.hadith");
  const scrollRef = useRef<ScrollView>(null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={32}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeading>{t.heading}</ScreenHeading>

        {/* Dersler — öne çıkan kart */}
        <MenuCard
          {...derslerTarget}
          highlight="gold"
          icon="library-outline"
          title={t.derslerTitle}
          subtitle={t.derslerSub}
          accessibilityLabel={t.derslerTitle}
          accessibilityHint={t.derslerHint}
          onPress={() => { Haptics.selectionAsync(); router.push("/dersler" as Href); }}
        />

        {SECTIONS.map((section, si) => (
          <View key={si}>
            <SectionHeader title={section.title} />
            <View style={s.cards}>
              {section.items.map(item => (
                <MenuCard
                  key={item.route}
                  {...(item.route === "/hadisler" ? hadithTarget : {})}
                  icon={item.icon}
                  iconTone={item.tone}
                  title={item.label}
                  subtitle={item.sub}
                  accessibilityLabel={item.label}
                  accessibilityHint={item.sub}
                  onPress={() => router.push(item.route as Href)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: space.gutter, paddingBottom: space.xl, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  cards: { gap: 10 },
});
