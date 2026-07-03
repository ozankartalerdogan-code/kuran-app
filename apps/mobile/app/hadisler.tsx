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
import { useTourTarget } from "../src/tour/AppTourProvider";
import rawData from "../src/data/hadisler_v2.json";

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
  return /bağlamsal/i.test(value);
}

function parseSunnahSource(url?: string): string {
  if (!url) return "";

  const match = url.match(/sunnah\.com\/([^:]+):(\d+)/i);
  if (!match) return "";

  const [, rawCollection, rawNumber] = match;
  const collectionNames: Record<string, string> = {
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

function buildSourceText(hadith: Hadith): string {
  const exactSources = ensureStringArray([hadith.source_bukhari, hadith.source_muslim])
    .filter(source => !hasContextualSource(source));

  if (exactSources.length > 0) return exactSources.join(" · ");

  const parsedSource = parseSunnahSource(hadith.sunnah_url);
  if (parsedSource) return parsedSource;

  return ensureStringArray([hadith.source_bukhari, hadith.source_muslim]).join(" · ");
}

const ROOT = rawData as HadithData;
const META: Meta = ROOT.meta ?? {};
const TOPICS: Topic[] = Array.isArray(ROOT.topics)
  ? [...ROOT.topics]
      .map(topic => ({
        ...topic,
        intro: topic.intro ?? "",
      }))
      .sort((a, b) => (a.group_order - b.group_order) || (a.order - b.order) || a.name.localeCompare(b.name, "tr"))
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
    topics: [...group.topics].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "tr")),
  }))
  .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "tr"));

function HadithCard({ hadith }: { hadith: Hadith }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const narrator = hadith.narrator || "Rivayet";
  const hadithText = hadith.turkish_text || "Hadis metni eklenmedi.";
  const sources = buildSourceText(hadith);

  async function handleShare() {
    void Haptics.selectionAsync();
    const message = [`"${hadithText}"`, `— ${narrator}`];
    if (sources) message.push(`Kaynak: ${sources}`);
    message.push("Kuran Yolu uygulamasından");

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
          accessibilityHint={`Hadis detayını ${open ? "kapatır" : "açar"}`}
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
            accessibilityLabel={`${narrator} hadisini paylaş`}
            accessibilityHint="Paylaşım menüsünü açar"
          >
            <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOpen(current => !current)}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Hadis detayını ${open ? "kapat" : "aç"}`}
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
  const [open, setOpen] = useState(false);

  return (
    <View style={[tp.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={tp.header}
        onPress={() => setOpen(current => !current)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={topic.name}
        accessibilityHint={`Konu detayını ${open ? "kapatır" : "açar"}`}
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
            <Text style={[tp.empty, { color: c.textMuted }]}>Bu konu için hadis kaydı bulunamadı.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function GroupAccordion({ group }: { group: GroupData }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const total = group.topics.reduce((sum, topic) => sum + topic.hadiths.length, 0);

  return (
    <View style={[gr.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={gr.header}
        onPress={() => setOpen(current => !current)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={group.name}
        accessibilityHint={`Hadis grubunu ${open ? "kapatır" : "açar"}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[gr.name, { color: c.text }]}>{group.name}</Text>
        <View style={gr.right}>
          <View style={gr.badge}>
            <Text style={gr.badgeText}>{`${total} hadis`}</Text>
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
  const sources = ensureStringArray(META.sources);

  useEffect(() => {
    logScreen("Hadisler");
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Hadisler" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.heroIcon}>📿</Text>
          <Text style={s.heroTitle}>{META.title ?? "Sahih Hadisler"}</Text>
          {META.subtitle ? <Text style={s.heroSub}>{META.subtitle}</Text> : null}
          {META.description ? <Text style={s.heroDesc}>{META.description}</Text> : null}
          <View style={s.stats}>
            <View style={s.statChip}>
              <Text style={s.statNum}>{HADITHS.length}</Text>
              <Text style={s.statLbl}>Hadis</Text>
            </View>
            <View style={s.statChip}>
              <Text style={s.statNum}>{TOPICS.length}</Text>
              <Text style={s.statLbl}>Konu</Text>
            </View>
            <View style={s.statChip}>
              <Text style={s.statNum}>{GROUPED.length}</Text>
              <Text style={s.statLbl}>Grup</Text>
            </View>
          </View>
        </View>

        {META.reliability_standard ? (
          <View style={[s.stdBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.stdLabel, { color: c.accent }]}>⚖️ Güvenilirlik Standardı</Text>
            <Text style={[s.stdText, { color: c.textSecondary }]}>{META.reliability_standard}</Text>
          </View>
        ) : null}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>Konular</Text>

        {GROUPED.length > 0 ? (
          GROUPED.map((group, index) => (
            <View key={group.name} {...(index === 0 ? topicsTarget : {})}>
              <GroupAccordion group={group} />
            </View>
          ))
        ) : (
          <Text style={[s.empty, { color: c.textMuted }]}>Bu bölüm için gösterilecek hadis kaydı bulunamadı.</Text>
        )}

        {sources.length > 0 ? (
          <Text style={[s.kaynak, { color: c.textMuted }]}>{`Kaynaklar: ${sources.join(" · ")}`}</Text>
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
  heroSub: { fontSize: 12, color: "#94a3b8", textAlign: "center" },
  heroDesc: { fontSize: 11.5, color: "#64748b", lineHeight: 17, textAlign: "center", marginTop: 2 },
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
