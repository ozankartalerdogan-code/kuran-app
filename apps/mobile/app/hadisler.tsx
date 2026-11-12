import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { logScreen } from "../src/lib/analytics";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useTourTarget, useTourScroller } from "../src/tour/AppTourProvider";
import rawData from "../src/data/hadisler_v2.json";
import { useLang, useStrings, fmt, type Lang, caps } from "../src/i18n";
import { localizedData } from "../src/i18n/localizedData";
import hadislerStrings from "../src/i18n/strings/hadisler";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pickData = localizedData<HadithData>(rawData as HadithData, () => require("../src/data/hadisler_v2.en.json"));

// `group` alanı çevrilmedi (anahtar); İngilizce görünen adlar:
const GROUP_NAMES_EN: Record<string, string> = {
  "İbadet": "Worship",
  "Ahlak & Karakter": "Morals & Character",
  "Aile & İlişkiler": "Family & Relationships",
  "Toplum & Muamelat": "Society & Dealings",
  "Manevî Hayat": "Spiritual Life",
  "Bilgi": "Knowledge",
  "Merak Edilen": "Frequently Asked",
};

interface Meta {
  title?: string;
  subtitle?: string;
  description?: string;
  reliability_standard?: string;
  sources?: string[];
}

interface Topic {
  id: string;
  name: string;
  group: string;
  group_order: number;
  order: number;
  intro?: string;
}

interface Hadith {
  id: string;
  topic_id: string;
  turkish_text: string;
  narrator: string;
  source_bukhari: string;
  source_muslim?: string;
  sunnah_url?: string;
  key_lesson: string;
  tags: string[];
  info_note?: string;
}

interface HadithData {
  meta?: Meta;
  topics?: Topic[];
  hadiths?: Hadith[];
}

interface TopicWithHadiths extends Topic {
  hadiths: Hadith[];
}

interface GroupData {
  name: string;
  order: number;
  topics: TopicWithHadiths[];
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hasContextualSource(value: string): boolean {
  return /bağlamsal|contextual/i.test(value);
}

function parseSunnahSource(url: string | undefined, lang: Lang): string {
  if (!url) return "";

  const match = url.match(/sunnah\.com\/([^:]+):(\d+)/i);
  if (!match) return "";

  const [, rawCollection, rawNumber] = match;
  const collectionNames: Record<string, string> = lang === "en" ? {
    bukhari: "Bukhari",
    muslim: "Muslim",
    tirmidhi: "Tirmidhi",
    ibnmajah: "Ibn Majah",
    abudawud: "Abu Dawud",
    ahmad: "Ahmad ibn Hanbal",
  } : {
    bukhari: "Buhârî",
    muslim: "Müslim",
    tirmidhi: "Tirmizî",
    ibnmajah: "İbn Mâce",
    abudawud: "Ebû Dâvûd",
    ahmad: "Ahmed b. Hanbel",
  };

  const collection = collectionNames[rawCollection.toLowerCase()] ?? rawCollection;
  return `${collection}, ${rawNumber}`;
}

function buildSourceText(hadith: Hadith, lang: Lang): string {
  const exactSources = ensureStringArray([hadith.source_bukhari, hadith.source_muslim])
    .filter(source => !hasContextualSource(source));

  if (exactSources.length > 0) return exactSources.join(" · ");

  const parsedSource = parseSunnahSource(hadith.sunnah_url, lang);
  if (parsedSource) return parsedSource;

  return ensureStringArray([hadith.source_bukhari, hadith.source_muslim]).join(" · ");
}

interface PreparedData {
  META: Meta;
  TOPICS: Topic[];
  HADITHS: Hadith[];
  GROUPED: GroupData[];
}

const DATA_CACHE: Partial<Record<Lang, PreparedData>> = {};

function buildHadithData(lang: Lang): PreparedData {
  const cached = DATA_CACHE[lang];
  if (cached) return cached;
  const ROOT = pickData(lang);
  const loc = lang === "en" ? "en" : "tr";
  const META: Meta = ROOT.meta ?? {};
  const TOPICS: Topic[] = Array.isArray(ROOT.topics)
    ? [...ROOT.topics]
        .map(topic => ({
          ...topic,
          intro: topic.intro ?? "",
        }))
        .sort((a, b) => (a.group_order - b.group_order) || (a.order - b.order) || a.name.localeCompare(b.name, loc))
    : [];
  const HADITHS: Hadith[] = Array.isArray(ROOT.hadiths)
    ? ROOT.hadiths.map(hadith => ({
        ...hadith,
        source_muslim: hadith.source_muslim ?? "",
        sunnah_url: hadith.sunnah_url ?? "",
        tags: ensureStringArray(hadith.tags),
        info_note: hadith.info_note ?? "",
      }))
    : [];

  const HADITHS_BY_TOPIC: Record<string, Hadith[]> = {};
  for (const hadith of HADITHS) {
    if (!HADITHS_BY_TOPIC[hadith.topic_id]) HADITHS_BY_TOPIC[hadith.topic_id] = [];
    HADITHS_BY_TOPIC[hadith.topic_id].push(hadith);
  }

  const GROUP_MAP: Record<string, GroupData> = {};
  for (const topic of TOPICS) {
    if (!GROUP_MAP[topic.group]) {
      GROUP_MAP[topic.group] = { name: topic.group, order: topic.group_order, topics: [] };
    }

    GROUP_MAP[topic.group].topics.push({
      ...topic,
      hadiths: HADITHS_BY_TOPIC[topic.id] ?? [],
    });
  }

  const GROUPED: GroupData[] = Object.values(GROUP_MAP)
    .map(group => ({
      ...group,
      topics: [...group.topics].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, loc)),
    }))
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, loc));

  const result = { META, TOPICS, HADITHS, GROUPED };
  DATA_CACHE[lang] = result;
  return result;
}

function HadithCard({ hadith }: { hadith: Hadith }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const t = useStrings(hadislerStrings);
  const lang = useLang();
  const narrator = hadith.narrator || t.narratorFallback;
  const hadithText = hadith.turkish_text || t.textMissing;
  const sources = buildSourceText(hadith, lang);

  async function handleShare() {
    void Haptics.selectionAsync();
    const message = [`"${hadithText}"`, `— ${narrator}`];
    if (sources) message.push(fmt(t.sourcePrefix, { s: sources }));
    message.push(t.shareFooter);

    try {
      await Share.share({ message: message.join("\n\n") });
    } catch {
      // noop
    }
  }

  return (
    <View style={[hd.card, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={hd.header}>
        <TouchableOpacity
          onPress={() => setOpen(current => !current)}
          activeOpacity={0.75}
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel={narrator}
          accessibilityHint={open ? t.detailHintClose : t.detailHintOpen}
          accessibilityState={{ expanded: open }}
        >
          <Text style={[hd.text, { color: c.text }]} numberOfLines={open ? undefined : 3}>
            {`"${hadithText}"`}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.shareA11y, { n: narrator })}
            accessibilityHint={t.shareHint}
          >
            <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOpen(current => !current)}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={open ? t.detailClose : t.detailOpen}
            accessibilityState={{ expanded: open }}
          >
            <Text style={[hd.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={hd.foot}>
        <Text style={[hd.narrator, { color: c.accent }]}>{narrator}</Text>
        {sources ? <Text style={[hd.source, { color: c.textMuted }]}>{sources}</Text> : null}
      </View>

      {open ? (
        <View style={[hd.body, { borderTopColor: c.border }]}>
          {hadith.key_lesson ? (
            <View style={hd.lessonBox}>
              <Text style={hd.lessonText}>💎 {hadith.key_lesson}</Text>
            </View>
          ) : null}
          {hadith.info_note ? (
            <View style={hd.noteBox}>
              <Text style={hd.noteText}>ℹ️ {hadith.info_note}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TopicAccordion({ topic }: { topic: TopicWithHadiths }) {
  const c = useColors();
  const t = useStrings(hadislerStrings);
  const [open, setOpen] = useState(false);

  return (
    <View style={[tp.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={tp.header}
        onPress={() => setOpen(current => !current)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={topic.name}
        accessibilityHint={open ? t.topicHintClose : t.topicHintOpen}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[tp.name, { color: c.text }]}>{topic.name}</Text>
        <View style={tp.right}>
          <View style={tp.badge}>
            <Text style={tp.badgeText}>{topic.hadiths.length}</Text>
          </View>
          <Text style={[tp.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {open ? (
        <View style={[tp.body, { borderTopColor: c.border }]}>
          {topic.intro ? <Text style={[tp.intro, { color: c.textSecondary }]}>{topic.intro}</Text> : null}
          {topic.hadiths.length > 0 ? (
            topic.hadiths.map(hadith => <HadithCard key={hadith.id} hadith={hadith} />)
          ) : (
            <Text style={[tp.empty, { color: c.textMuted }]}>{t.topicEmpty}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function GroupAccordion({ group }: { group: GroupData }) {
  const c = useColors();
  const t = useStrings(hadislerStrings);
  const lang = useLang();
  const groupName = lang === "en" ? (GROUP_NAMES_EN[group.name] ?? group.name) : group.name;
  const [open, setOpen] = useState(false);
  const total = group.topics.reduce((sum, topic) => sum + topic.hadiths.length, 0);

  return (
    <View style={[gr.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={gr.header}
        onPress={() => setOpen(current => !current)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={groupName}
        accessibilityHint={open ? t.groupHintClose : t.groupHintOpen}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[gr.name, { color: c.text }]}>{groupName}</Text>
        <View style={gr.right}>
          <View style={gr.badge}>
            <Text style={gr.badgeText}>{fmt(t.hadithCount, { n: total })}</Text>
          </View>
          <Text style={[gr.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {open ? (
        <View style={[gr.body, { borderTopColor: c.border }]}>
          {group.topics.map(topic => <TopicAccordion key={topic.id} topic={topic} />)}
        </View>
      ) : null}
    </View>
  );
}

export default function HadislerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const topicsTarget = useTourTarget("hadith.topics");
  const tourScroll = useTourScroller();
  const t = useStrings(hadislerStrings);
  const lang = useLang();
  const { META, TOPICS, HADITHS, GROUPED } = buildHadithData(lang);
  const sources = ensureStringArray(META.sources);

  useEffect(() => {
    logScreen("Hadisler");
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView
        {...tourScroll}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.heroIcon}>📿</Text>
          <Text style={s.heroTitle}>{META.title ?? t.defaultTitle}</Text>
          {META.subtitle ? <Text style={s.heroSub}>{META.subtitle}</Text> : null}
          {META.description ? <Text style={s.heroDesc}>{META.description}</Text> : null}
          <View style={s.stats}>
            <View style={s.statChip}>
              <Text style={s.statNum}>{HADITHS.length}</Text>
              <Text style={s.statLbl}>{t.statHadith}</Text>
            </View>
            <View style={s.statChip}>
              <Text style={s.statNum}>{TOPICS.length}</Text>
              <Text style={s.statLbl}>{t.statTopic}</Text>
            </View>
            <View style={s.statChip}>
              <Text style={s.statNum}>{GROUPED.length}</Text>
              <Text style={s.statLbl}>{t.statGroup}</Text>
            </View>
          </View>
        </View>

        {META.reliability_standard ? (
          <View style={[s.stdBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.stdLabel, { color: c.accent }]}>{caps(t.reliability)}</Text>
            <Text style={[s.stdText, { color: c.textSecondary }]}>{META.reliability_standard}</Text>
          </View>
        ) : null}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>{caps(t.topics)}</Text>

        {GROUPED.length > 0 ? (
          GROUPED.map((group, index) => (
            <View key={group.name} {...(index === 0 ? topicsTarget : {})}>
              <GroupAccordion group={group} />
            </View>
          ))
        ) : (
          <Text style={[s.empty, { color: c.textMuted }]}>{t.empty}</Text>
        )}

        {sources.length > 0 ? (
          <Text style={[s.kaynak, { color: c.textMuted }]}>{fmt(t.sources, { s: sources.join(" · ") })}</Text>
        ) : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  hero: { borderRadius: 16, padding: 18, marginBottom: 12, alignItems: "center", backgroundColor: "#1a1a2e", gap: 5 },
  heroIcon: { fontSize: 34, marginBottom: 2 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#e2e8f0", textAlign: "center" },
  // Kontrast: #64748b koyu hero zemininde (#1a1a2e) 3.58:1 kalıyordu, WCAG AA
  // normal metin eşiği 4.5:1. heroDesc #94a3b8'e (6.65:1) çekildi; hiyerarşi
  // korunsun diye heroSub bir ton açıldı (#cbd5e1, 11.49:1).
  heroSub: { fontSize: 12, color: "#cbd5e1", textAlign: "center" },
  heroDesc: { fontSize: 11.5, color: "#94a3b8", lineHeight: 17, textAlign: "center", marginTop: 2 },
  stats: { flexDirection: "row", gap: 10, marginTop: 8 },
  statChip: { backgroundColor: "#16213e", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "800", color: "#e2e8f0" },
  statLbl: { fontSize: 10, color: "#94a3b8" },

  stdBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, gap: 4 },
  stdLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  stdText: { fontSize: 13, lineHeight: 20 },

  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  empty: { fontSize: 12, lineHeight: 18, marginBottom: 12, textAlign: "center" },
  kaynak: { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const gr = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  name: { flex: 1, fontSize: 14, fontWeight: "700" },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { backgroundColor: "#f1f5f9", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  chev: { fontSize: 11 },
  body: { borderTopWidth: 1, padding: 10, gap: 6 },
});

const tp = StyleSheet.create({
  card: { borderRadius: 11, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  name: { flex: 1, fontSize: 13, fontWeight: "600" },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { backgroundColor: "#ede9fe", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#6d28d9" },
  chev: { fontSize: 10 },
  body: { borderTopWidth: 1, padding: 10, gap: 8 },
  intro: { fontSize: 12, lineHeight: 18, fontStyle: "italic", marginBottom: 4 },
  empty: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
});

const hd = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: "hidden", marginBottom: 2 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  text: { flex: 1, fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  chev: { fontSize: 10, marginTop: 4 },
  foot: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, paddingBottom: 9, flexWrap: "wrap" },
  narrator: { fontSize: 11, fontWeight: "700" },
  source: { fontSize: 10.5 },
  body: { borderTopWidth: 1, padding: 10, gap: 6 },
  lessonBox: { backgroundColor: "#f0fdf4", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#86efac" },
  lessonText: { fontSize: 12, color: "#15803d", lineHeight: 18 },
  noteBox: { backgroundColor: "#fff7ed", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#fdba74" },
  noteText: { fontSize: 11.5, color: "#9a3412", lineHeight: 17 },
});
