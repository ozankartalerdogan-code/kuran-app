import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useRef } from "react";
import { useColors } from "../../src/hooks/useColors";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings } from "../../src/i18n";
import { MenuCard, ScreenHeading, SectionHeader, space, type IoniconName, type Tone } from "../../src/components/ui";
import ibadetStrings from "../../src/i18n/strings/ibadetTab";

type Item = {
  icon: IoniconName;
  tone: Tone;
  label: string;
  sub: string;
  route?: string;
  onPress?: () => void;
};

export default function IbadetTab() {
  const c = useColors();
  const t = useStrings(ibadetStrings);
  const ibadetTarget = useTourTarget("ibadet.main");
  const scrollRef = useRef<ScrollView>(null);

  const SECTIONS: { title: string; items: Item[] }[] = [
    {
      title: t.secGuides,
      items: [
        { icon: "accessibility-outline", tone: "sky", label: t.namazRehberiLabel, sub: t.namazRehberiSub, route: "/namaz-rehberi" },
        { icon: "rose-outline", tone: "emerald", label: t.dualarLabel, sub: t.dualarSub, route: "/dualar" },
        { icon: "reader-outline", tone: "violet", label: t.ibadetRehberiLabel, sub: t.ibadetRehberiSub, route: "/ibadet-rehberi" },
      ],
    },
    {
      title: t.secTools,
      items: [
        { icon: "compass-outline", tone: "amber", label: t.kibleLabel, sub: t.kibleSub, route: "/kible" },
        { icon: "radio-button-on-outline", tone: "emerald", label: t.tasbihLabel, sub: t.tasbihSub, onPress: () => router.push("/tespih") },
      ],
    },
  ];

  function handlePress(item: Item) {
    if (item.onPress) {
      item.onPress();
      return;
    }
    if (item.route) {
      router.push(item.route as Href);
    }
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
        <ScreenHeading>{t.heading}</ScreenHeading>

        {SECTIONS.map((section, si) => (
          <View key={si} {...(si === 0 ? ibadetTarget : {})}>
            <SectionHeader title={section.title} first={si === 0} />
            <View style={s.cards}>
              {section.items.map((item, ii) => (
                <MenuCard key={ii} icon={item.icon} iconTone={item.tone} title={item.label} subtitle={item.sub} onPress={() => handlePress(item)} />
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
