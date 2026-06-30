import React, { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, ListRenderItemInfo,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { storage, STORAGE_KEYS } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🕌",
    title: "Kuran Yolu'na Hoş Geldiniz",
    desc: "İslam'ı temelden öğrenmek için ihtiyacınız olan her şey tek bir uygulamada.",
  },
  {
    emoji: "📖",
    title: "Kuran'ı Derinlemesine Öğren",
    desc: "Tecvid renklendirmesi, kelime kökü analizi ve meal karşılaştırmasıyla Kuran'ı daha iyi anlayın.",
  },
  {
    emoji: "🎓",
    title: "Temelden Başla, Derinleşerek İlerle",
    desc: "Elif-Ba'dan başlayın, peygamber kıssalarını ve sahih hadisleri keşfedin, Siyer-i Nebî'yi okuyun.",
  },
  {
    emoji: "🤲",
    title: "İbadeti Hayatının Parçası Yap",
    desc: "Namaz vakitleri, dualar, zikirmatik ve daha fazlasıyla günlük ibadetinizi kolaylaştırın.",
  },
] as const;

async function completeOnboarding() {
  await storage.setString(STORAGE_KEYS.onboarding, "true");
  router.replace("/(tabs)");
}

export default function OnboardingScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={e => {
            setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }: ListRenderItemInfo<typeof SLIDES[number]>) => (
            <View style={[s.slide, { width }]}>
              <Text style={s.emoji}>{item.emoji}</Text>
              <Text style={[s.title, { color: c.text }]}>{item.title}</Text>
              <Text style={[s.desc, { color: c.textMuted }]}>{item.desc}</Text>
            </View>
          )}
        />

        {/* Dot indicators */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: i === activeIndex ? c.accent : c.border },
                i === activeIndex && s.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: c.accent }]}
          onPress={isLast ? completeOnboarding : goNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Başla" : "İleri"}
        >
          <Text style={s.btnText}>{isLast ? "Başla" : "İleri"}</Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={completeOnboarding} activeOpacity={0.6} style={s.skipBtn} accessibilityRole="button" accessibilityLabel="Tanıtımı atla">
            <Text style={[s.skipText, { color: c.textMuted }]}>Atla</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  emoji:   { fontSize: 80, marginBottom: 28 },
  title:   { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 16, lineHeight: 32 },
  desc:    { fontSize: 16, textAlign: "center", lineHeight: 24 },
  dots:    { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 28 },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 20 },
  btn:     { marginHorizontal: 32, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipBtn: { alignItems: "center", marginTop: 14 },
  skipText:{ fontSize: 14 },
});
