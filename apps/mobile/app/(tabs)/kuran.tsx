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
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { SAYFA_SAYISI, sayfaninCuzu, sayfaBasSuresi, ayetinSayfasi } from "../../src/lib/mushafSayfa";
import { parseHatimStore } from "../../src/lib/hatim";
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

type ResumeState = {
  page: number | null;
  hatimDone: number | null;
};

function parseSavedPage(rawPage: string | null, bookmark: string | null): number | null {
  const saved = Number(rawPage);
  if (Number.isInteger(saved) && saved >= 1 && saved <= SAYFA_SAYISI) {
    return saved;
  }
  const [bs, ba] = (bookmark ?? "").split(":").map(Number);
  if (Number.isInteger(bs) && bs >= 1 && bs <= 114 && Number.isInteger(ba) && ba >= 1) {
    return ayetinSayfasi(bs, ba);
  }
  return null;
}

function parseActiveHatimProgress(rawHatim: string | null): number | null {
  const store = parseHatimStore(rawHatim);
  const current = store.hatims.find((h) => h.id === store.currentId) ?? null;
  return current ? current.readJuz.length : null;
}

function readResumeSync(): ResumeState {
  const rawPage = storage.getStringSync(STORAGE_KEYS.mushafPage);
  const bookmark = rawPage ? null : storage.getJSONSync<string>(STORAGE_KEYS.mushafBookmark);
  const rawHatim = storage.getStringSync(STORAGE_KEYS.hatimTracking);
  return {
    page: parseSavedPage(rawPage, bookmark),
    hatimDone: parseActiveHatimProgress(rawHatim),
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
  const [resume, setResume] = useState<ResumeState>(readResumeSync);
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
      setResume(readResumeSync());
      (async () => {
        try {
          const [rawPage, bookmark, rawHatim] = await Promise.all([
            storage.getString(STORAGE_KEYS.mushafPage),
            storage.getJSON<string>(STORAGE_KEYS.mushafBookmark),
            storage.getString(STORAGE_KEYS.hatimTracking),
          ]);
          if (!active) return;
          setResume({
            page: parseSavedPage(rawPage, bookmark),
            hatimDone: parseActiveHatimProgress(rawHatim),
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
    resume.hatimDone !== null ? fmt(t.resumeHatimBadge, { done: resume.hatimDone }) : null;
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  cards: { gap: 10 },
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
