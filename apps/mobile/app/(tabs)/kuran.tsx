import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { useColors } from "../../src/hooks/useColors";
import { logFeature } from "../../src/lib/analytics";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings, fmt } from "../../src/i18n";
import kuranStrings from "../../src/i18n/strings/kuranTab";
import { Badge, MenuCard, ScreenHeading, SectionHeader, space, toneColors, type IoniconName } from "../../src/components/ui";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { sayfaninCuzu, sayfaBasSuresi, ayetinSayfasi } from "../../src/lib/mushafSayfa";
import { parseSavedPage } from "../../src/lib/resumeReading";
import { JUZ_DATA, summarizeHatim, countFavorites, type HatimSummary } from "../../src/lib/hatim";
import { useSurahNameOf } from "../../src/lib/surahNames";
import { api, type SurahListItem } from "../../src/lib/api";

type KuranCardRoute = "/mushaf-sayfa" | "/sure-listesi";
type KuranCard = {
  id: "mushaf_page" | "surah_list";
  icon: IoniconName;
  labelKey: "mushafLabel" | "surahLabel";
  subKey: "mushafSub" | "surahSub";
  route: KuranCardRoute;
  highlight?: "emerald";
  tone: "emerald" | "sky";
};

// Mushaf Modu ve Hatim Takibi ayrı kart olmaktan çıktı: ikisi de sayfa
// görünümünün içinde (yer imi sayfaya çevrilir, hatim paneli başlıktan açılır).
const CARDS: KuranCard[] = [
  {
    id: "mushaf_page",
    icon: "book-outline",
    labelKey: "mushafLabel",
    subKey: "mushafSub",
    route: "/mushaf-sayfa",
    highlight: "emerald",
    tone: "emerald",
  },
  {
    id: "surah_list",
    icon: "list-outline",
    labelKey: "surahLabel",
    subKey: "surahSub",
    route: "/sure-listesi",
    tone: "sky",
  },
];

type KuranTabState = {
  page: number | null;
  hatim: HatimSummary | null;
  favCount: number;
};

function readKuranTabSync(): KuranTabState {
  return {
    page: parseSavedPage(null, null, ayetinSayfasi),
    hatim: summarizeHatim(null),
    favCount: countFavorites(null),
  };
}

export default function KuranTab() {
  const c = useColors();
  const t = useStrings(kuranStrings);
  const emerald = toneColors(c, "emerald"), amber = toneColors(c, "amber");
  const surahNameOf = useSurahNameOf();
  const surahListTarget = useTourTarget("kuran.surahList");
  const [resume, setResume] = useState<KuranTabState>(readKuranTabSync);
  const [surahList, setSurahList] = useState<SurahListItem[]>([]);

  useEffect(() => {
    let active = true;
    api.surahs.list().then((list) => {
      if (active) setSurahList(list);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Sekme odaklandığında son okunan sayfa ve hatim durumunu yeniden oku
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const applyResume = (next: KuranTabState) => setResume(next);
      (async () => {
        try {
          const [rawPage, bookmark, rawHatim, favorites] = await Promise.all([
            storage.getString(STORAGE_KEYS.mushafPage),
            storage.getJSON<string>(STORAGE_KEYS.mushafBookmark),
            storage.getString(STORAGE_KEYS.hatimTracking),
            storage.getJSON<unknown>(STORAGE_KEYS.favorites),
          ]);
          if (!active) return;
          applyResume({
            page: parseSavedPage(rawPage, bookmark, ayetinSayfasi),
            hatim: summarizeHatim(rawHatim),
            favCount: countFavorites(favorites),
          });
        } catch {
          // Depolama okuma hatasında mevcut durumu koru
        }
      })();
      return () => { active = false; };
    }, []),
  );

  const handleCardPress = (card: KuranCard) => {
    logFeature("kuran_tab_card", { card: card.id });
    router.push(card.route as Href);
  };

  const handleResumePress = () => {
    if (!resume.page) return;
    logFeature("kuran_tab_card", { card: "resume_mushaf", page: String(resume.page) });
    // mushaf-sayfa parametresiz açıldığında kayıtlı mushafPage / mushafBookmark sayfasından başlar
    router.push("/mushaf-sayfa");
  };

  const resumeSurahId = resume.page ? sayfaBasSuresi(resume.page) : null;
  const resumeTrName = resumeSurahId
    ? (surahList.find((x) => x.id === resumeSurahId)?.name ?? "")
    : "";
  const resumeSurahName = resumeSurahId ? surahNameOf(resumeSurahId, resumeTrName) : "";
  const resumeJuz = resume.page ? sayfaninCuzu(resume.page) : 1;
  const resumeMetaText = resume.page
    ? (resumeSurahName
        ? fmt(t.resumeMeta, { surah: resumeSurahName, page: resume.page, juz: resumeJuz })
        : fmt(t.resumeMetaNoSurah, { page: resume.page, juz: resumeJuz }))
    : "";
  const resumeHatimText =
    resume.hatim !== null ? fmt(t.resumeHatimBadge, { done: resume.hatim.done }) : null;
  const currentJuz = resume.page ? sayfaninCuzu(resume.page) : null;
  const hatimSubtitle = resume.hatim ? fmt(t.hatimProgress, { done: resume.hatim.done }) : t.hatimEmpty;
  const favoritesSubtitle = resume.favCount ? fmt(t.favoritesCount, { n: resume.favCount }) : t.favoritesEmpty;
  const resumeA11yMeta = resumeHatimText
    ? `${resumeMetaText} · ${resumeHatimText}`
    : resumeMetaText;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeading>{t.heading}</ScreenHeading>

        <View style={s.cards}>
          {resume.page !== null && (
            <MenuCard
              highlight="gold"
              icon="bookmark"
              title={t.resumeLabel}
              subtitle={resumeMetaText}
              accessibilityLabel={fmt(t.resumeA11y, { meta: resumeA11yMeta })}
              onPress={handleResumePress}
            >
              {resumeHatimText !== null && <Badge label={resumeHatimText} tone="amber" style={{ marginTop: 8, marginLeft: 52 }} />}
            </MenuCard>
          )}

          {CARDS.map(card => (
            <MenuCard
              key={card.id}
              {...(card.id === "surah_list" ? surahListTarget : {})}
              highlight={card.highlight}
              icon={card.icon}
              iconTone={card.tone}
              title={t[card.labelKey]}
              subtitle={t[card.subKey]}
              accessibilityLabel={t[card.labelKey]}
              accessibilityHint={t[card.subKey]}
              onPress={() => handleCardPress(card)}
            />
          ))}
          <View style={s.quickRow}>
            <TouchableOpacity
              style={[s.card, s.quickCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push("/mushaf-sayfa?hatim=1")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${t.hatimTitle}, ${hatimSubtitle}`}
            >
              <View style={[s.iconWrap, { backgroundColor: emerald.bg }]}>
                <Ionicons name="checkmark-done-outline" size={20} color={emerald.fg} />
              </View>
              <Text style={[s.label, { color: c.text }]}>{t.hatimTitle}</Text>
              <Text style={[s.sub, { color: c.textMuted }]}>{hatimSubtitle}</Text>
              {resume.hatim !== null && (
                <View style={[s.progressTrack, { backgroundColor: c.accentLight }]}>
                  <View style={[s.progressFill, { backgroundColor: c.accent, width: `${resume.hatim.done / 30 * 100}%` }]} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.card, s.quickCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push("/favoriler")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${t.favoritesTitle}, ${favoritesSubtitle}`}
            >
              <View style={[s.iconWrap, { backgroundColor: amber.bg }]}>
                <Ionicons name="heart-outline" size={20} color={amber.fg} />
              </View>
              <Text style={[s.label, { color: c.text }]}>{t.favoritesTitle}</Text>
              <Text style={[s.sub, { color: c.textMuted }]}>{favoritesSubtitle}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SectionHeader title={t.juzTitle} />
        <View style={s.juzGrid}>
          {Array.from({ length: 5 }, (_, row) => (
            <View key={row} style={s.juzRow}>
              {JUZ_DATA.slice(row * 6, row * 6 + 6).map(j => {
                const read = resume.hatim?.readJuz.has(j.juz) ?? false;
                return (
                  <TouchableOpacity
                    key={j.juz}
                    style={[s.juzButton, {
                      backgroundColor: read ? c.accentLight : c.card,
                      borderColor: currentJuz === j.juz ? c.accent : "transparent",
                    }]}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/mushaf-sayfa?sayfa=${ayetinSayfasi(j.startSurah, j.startAyah)}`)}
                    accessibilityRole="button"
                    accessibilityLabel={fmt(t.juzA11y, { n: j.juz, surah: surahNameOf(j.startSurah, j.startName) }) + (read ? t.juzRead : "")}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.3} style={[s.juzNumber, { color: read ? c.emeraldText : c.text }]}>{j.juz}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: space.gutter, paddingBottom: space.xl, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  cards: { gap: 10 },
  quickRow: { flexDirection: "row", gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: space.md },
  quickCard: { flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 4 },
  progressTrack: { height: 4, width: "100%", borderRadius: 2, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
  juzGrid: { gap: 6 },
  juzRow: { flexDirection: "row", gap: 4 },
  juzButton: { flex: 1, aspectRatio: 1, minWidth: 44, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  juzNumber: { fontSize: 22, fontWeight: "700" },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  sub: { fontSize: 12, lineHeight: 17 },
});
