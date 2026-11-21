import React, { useEffect, useRef, useState } from "react";
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
import { useTourTarget } from "../src/tour/AppTourProvider";
import { useLang, useStrings, fmt, type Lang, caps } from "../src/i18n";
import { localizedData } from "../src/i18n/localizedData";
import hadislerStrings from "../src/i18n/strings/hadisler";
import { Badge, Callout, radius, space, toneColors } from "../src/components/ui";

const pickData = localizedData<HadithData>(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/hadisler_v2.json"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/hadisler_v2.en.json"),
);

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
    <View style={[hd.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={hd.header}>
        <TouchableOpacity
          onPress={() => setOpen(current => !current)}
          activeOpacity={0.75}
          style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
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
            hitSlop={14}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.shareA11y, { n: narrator })}
            accessibilityHint={t.shareHint}
          >
            <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOpen(current => !current)}
            hitSlop={14}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={open ? t.detailClose : t.detailOpen}
            accessibilityState={{ expanded: open }}
          >
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
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
            <Callout tone="success" icon="diamond-outline">
              {hadith.key_lesson}
            </Callout>
          ) : null}
          {hadith.info_note ? (
            <Callout tone="info">
              {hadith.info_note}
            </Callout>
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
          <Badge label={String(topic.hadiths.length)} tone="violet" style={{ alignSelf: "center" }} />
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
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
          <Badge label={fmt(t.hadithCount, { n: total })} tone="neutral" style={{ alignSelf: "center" }} />
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
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
  const scrollRef = useRef<ScrollView>(null);
  const t = useStrings(hadislerStrings);
  const lang = useLang();
  const { META, TOPICS, HADITHS, GROUPED } = buildHadithData(lang);
  const sources = ensureStringArray(META.sources);
  const heroTone = toneColors(c, "emerald");

  useEffect(() => {
    logScreen("Hadisler");
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={32}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.hero, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[s.heroIconWrap, { backgroundColor: heroTone.bg }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={heroTone.fg} accessible={false} importantForAccessibility="no" />
          </View>
          <Text style={[s.heroTitle, { color: c.text }]}>{META.title ?? t.defaultTitle}</Text>
          {META.subtitle ? <Text style={[s.heroSub, { color: c.textSecondary }]}>{META.subtitle}</Text> : null}
          {META.description ? <Text style={[s.heroDesc, { color: c.textSecondary }]}>{META.description}</Text> : null}
          <View style={s.stats}>
            <View style={[s.statChip, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.statNum, { color: c.text }]}>{HADITHS.length}</Text>
              <Text style={[s.statLbl, { color: c.textMuted }]}>{t.statHadith}</Text>
            </View>
            <View style={[s.statChip, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.statNum, { color: c.text }]}>{TOPICS.length}</Text>
              <Text style={[s.statLbl, { color: c.textMuted }]}>{t.statTopic}</Text>
            </View>
            <View style={[s.statChip, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.statNum, { color: c.text }]}>{GROUPED.length}</Text>
              <Text style={[s.statLbl, { color: c.textMuted }]}>{t.statGroup}</Text>
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
  content: { padding: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  hero: { borderRadius: radius.lg, borderWidth: 1, padding: 18, marginBottom: space.sm, alignItems: "center", gap: 6 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  heroSub: { fontSize: 12, textAlign: "center" },
  heroDesc: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 2 },
  stats: { flexDirection: "row", gap: 10, marginTop: 8 },
  statChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLbl: { fontSize: 10 },

  stdBox: { borderRadius: radius.lg, borderWidth: 1, padding: 12, marginBottom: 10, gap: 4 },
  stdLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  stdText: { fontSize: 13, lineHeight: 20 },

  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  empty: { fontSize: 12, lineHeight: 18, marginBottom: 12, textAlign: "center" },
  kaynak: { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const gr = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  header: { minHeight: 48, flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  name: { flex: 1, fontSize: 14, fontWeight: "700" },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  body: { borderTopWidth: 1, padding: 10, gap: 6 },
});

const tp = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  header: { minHeight: 44, flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  name: { flex: 1, fontSize: 13, fontWeight: "600" },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  body: { borderTopWidth: 1, padding: 10, gap: 8 },
  intro: { fontSize: 12, lineHeight: 18, fontStyle: "italic", marginBottom: 4 },
  empty: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
});

const hd = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden", marginBottom: 2 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  text: { flex: 1, fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  foot: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, paddingBottom: 9, flexWrap: "wrap" },
  narrator: { fontSize: 11, fontWeight: "700" },
  source: { fontSize: 10.5 },
  body: { borderTopWidth: 1, padding: 10, gap: 6 },
});
