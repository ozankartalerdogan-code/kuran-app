import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { useState, useEffect, useCallback, type ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";
import { logFeature } from "../../src/lib/analytics";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useStrings, fmt } from "../../src/i18n";
import kuranStrings from "../../src/i18n/strings/kuranTab";
import { storage, STORAGE_KEYS, usingMmkv } from "../../src/lib/storage";
import { sayfaninCuzu, sayfaBasSuresi, ayetinSayfasi } from "../../src/lib/mushafSayfa";
import { parseSavedPage } from "../../src/lib/resumeReading";
import { JUZ_DATA, summarizeHatim, countFavorites, type HatimSummary } from "../../src/lib/hatim";
import { useSurahNameOf } from "../../src/lib/surahNames";
import { api, type SurahListItem } from "../../src/lib/api";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type KuranCardRoute = "/mushaf-sayfa" | "/sure-listesi";
type KuranCard = {
  id: "mushaf_page" | "surah_list";
  icon: IoniconName;
  labelKey: "mushafLabel" | "surahLabel";
  subKey: "mushafSub" | "surahSub";
  route: KuranCardRoute;
  bg: string;
  border: string;
  darkBg: string;
  darkBorder: string;
  iconBg: string;
  iconColor: string;
  darkIconBg: string;
  darkIconColor: string;
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
    bg: "#f0fdf4",
    border: "#86efac",
    darkBg: "#052e16",
    darkBorder: "#166534",
    iconBg: "#dcfce7",
    iconColor: "#15803d",
    darkIconBg: "#14532d",
    darkIconColor: "#86efac",
  },
  {
    id: "surah_list",
    icon: "list-outline",
    labelKey: "surahLabel",
    subKey: "surahSub",
    route: "/sure-listesi",
    bg: "#eff6ff",
    border: "#93c5fd",
    darkBg: "#172554",
    darkBorder: "#1e40af",
    iconBg: "#dbeafe",
    iconColor: "#1d4ed8",
    darkIconBg: "#1e3a8a",
    darkIconColor: "#93c5fd",
  },
];

type KuranTabState = {
  page: number | null;
  hatim: HatimSummary | null;
  favCount: number;
};

function readKuranTabSync(): KuranTabState {
  const rawPage = storage.getStringSync(STORAGE_KEYS.mushafPage);
  const bookmark = rawPage ? null : storage.getJSONSync<string>(STORAGE_KEYS.mushafBookmark);
  const rawHatim = storage.getStringSync(STORAGE_KEYS.hatimTracking);
  return {
    page: parseSavedPage(rawPage, bookmark, ayetinSayfasi),
    hatim: summarizeHatim(rawHatim),
    favCount: countFavorites(storage.getJSONSync<unknown>(STORAGE_KEYS.favorites)),
  };
}

const RESUME_THEME = {
  bg: "#fffbeb",
  border: "#fcd34d",
  darkBg: "#1c1405",
  darkBorder: "#78350f",
  iconBg: "#fef3c7",
  iconColor: "#b45309",
  darkIconBg: "#451a03",
  darkIconColor: "#fcd34d",
} as const;

export default function KuranTab() {
  const c = useColors();
  const t = useStrings(kuranStrings);
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
      if (usingMmkv) applyResume(readKuranTabSync());
      if (usingMmkv) return;
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
          // Depolama okuma hatasında senkron durumu koru
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
        <Text style={[s.heading, { color: c.text }]}>{t.heading}</Text>

        <View style={s.cards}>
          {resume.page !== null && (
            <TouchableOpacity
              style={[
                s.card,
                {
                  backgroundColor: c.isDark ? RESUME_THEME.darkBg : RESUME_THEME.bg,
                  borderColor: c.isDark ? RESUME_THEME.darkBorder : RESUME_THEME.border,
                },
              ]}
              onPress={handleResumePress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.resumeA11y, { meta: resumeA11yMeta })}
            >
              <View
                style={[
                  s.iconWrap,
                  { backgroundColor: c.isDark ? RESUME_THEME.darkIconBg : RESUME_THEME.iconBg },
                ]}
              >
                <Ionicons
                  name="bookmark"
                  size={20}
                  color={c.isDark ? RESUME_THEME.darkIconColor : RESUME_THEME.iconColor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.resumeTopRow}>
                  <Text style={[s.label, { color: c.text, flexShrink: 1 }]}>{t.resumeLabel}</Text>
                  {resumeHatimText !== null && (
                    <View
                      style={[
                        s.hatimBadge,
                        {
                          backgroundColor: c.isDark ? RESUME_THEME.darkIconBg : RESUME_THEME.iconBg,
                          borderColor: c.isDark ? RESUME_THEME.darkBorder : RESUME_THEME.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.hatimBadgeText,
                          { color: c.isDark ? RESUME_THEME.darkIconColor : RESUME_THEME.iconColor },
                        ]}
                      >
                        {resumeHatimText}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[s.sub, { color: c.textMuted }]}>{resumeMetaText}</Text>
              </View>
              <Text style={[s.chev, { color: c.textMuted }]}>›</Text>
            </TouchableOpacity>
          )}

          {CARDS.map(card => (
            <TouchableOpacity
              key={card.id}
              {...(card.id === "surah_list" ? surahListTarget : {})}
              style={[s.card, { backgroundColor: c.isDark ? card.darkBg : card.bg, borderColor: c.isDark ? card.darkBorder : card.border }]}
              onPress={() => handleCardPress(card)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t[card.labelKey]}
              accessibilityHint={t[card.subKey]}
            >
              <View style={[s.iconWrap, { backgroundColor: c.isDark ? card.darkIconBg : card.iconBg }]}>
                <Ionicons name={card.icon} size={22} color={c.isDark ? card.darkIconColor : card.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: c.text }]}>{t[card.labelKey]}</Text>
                <Text style={[s.sub, { color: c.textMuted }]}>{t[card.subKey]}</Text>
              </View>
              <Text style={[s.chev, { color: c.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={s.quickRow}>
            <TouchableOpacity
              style={[s.card, s.quickCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push("/mushaf-sayfa?hatim=1")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${t.hatimTitle}, ${hatimSubtitle}`}
            >
              <View style={[s.iconWrap, { backgroundColor: c.accentLight }]}>
                <Ionicons name="checkmark-done-outline" size={22} color={c.accent} />
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
              <View style={[s.iconWrap, { backgroundColor: c.isDark ? "#451a03" : "#fef3c7" }]}>
                <Ionicons name="heart-outline" size={22} color={c.isDark ? "#fcd34d" : "#b45309"} />
              </View>
              <Text style={[s.label, { color: c.text }]}>{t.favoritesTitle}</Text>
              <Text style={[s.sub, { color: c.textMuted }]}>{favoritesSubtitle}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text accessibilityRole="header" style={[s.sectionTitle, { color: c.textMuted }]}>{t.juzTitle}</Text>
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
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.3} style={[s.juzNumber, { color: read ? (c.isDark ? "#a7f3d0" : "#065f46") : c.text }]}>{j.juz}</Text>
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
  content: { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  cards: { gap: 10 },
  quickRow: { flexDirection: "row", gap: 10 },
  quickCard: { flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 4, paddingHorizontal: 12 },
  progressTrack: { height: 4, width: "100%", borderRadius: 2, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 24, marginBottom: 12 },
  juzGrid: { gap: 6 },
  juzRow: { flexDirection: "row", gap: 4 },
  juzButton: { flex: 1, aspectRatio: 1, minWidth: 44, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  juzNumber: { fontSize: 22, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 24, color: "#a8a29e", fontWeight: "600" },
  resumeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  hatimBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  hatimBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
