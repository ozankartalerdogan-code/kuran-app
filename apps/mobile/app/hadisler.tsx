import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import rawData from "../src/data/hadisler_v2.json";

const META    = rawData.meta;
const TOPICS  = rawData.topics  as Topic[];
const HADITHS = rawData.hadiths as Hadith[];

interface Topic {
  id: string; name: string; group: string;
  group_order: number; order: number; intro?: string;
}
interface Hadith {
  id: string; topic_id: string; turkish_text: string;
  narrator: string; source_bukhari: string;
  source_muslim?: string; sunnah_url?: string;
  key_lesson: string; tags: string[]; info_note?: string;
}

// ── Veriyi önceden grupla (render dışında) ───────────────────────────────────

interface GroupData {
  name: string; order: number;
  topics: (Topic & { hadiths: Hadith[] })[];
}

const _hadithsByTopic: Record<string, Hadith[]> = {};
for (const h of HADITHS) {
  if (!_hadithsByTopic[h.topic_id]) _hadithsByTopic[h.topic_id] = [];
  _hadithsByTopic[h.topic_id].push(h);
}

const _groupMap: Record<string, GroupData> = {};
for (const t of TOPICS) {
  if (!_groupMap[t.group]) _groupMap[t.group] = { name: t.group, order: t.group_order, topics: [] };
  _groupMap[t.group].topics.push({ ...t, hadiths: _hadithsByTopic[t.id] ?? [] });
}
const GROUPED: GroupData[] = Object.values(_groupMap).sort((a, b) => a.order - b.order);

// ── Bileşenler ────────────────────────────────────────────────────────────────

function HadithCard({ h }: { h: Hadith }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const sources = [h.source_bukhari, h.source_muslim].filter(Boolean).join(" · ");

  return (
    <View style={[hd.card, { backgroundColor: c.bg, borderColor: c.border }]}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} activeOpacity={0.75} style={hd.header}>
        <Text style={[hd.text, { color: c.text }]} numberOfLines={open ? undefined : 3}>
          "{h.turkish_text}"
        </Text>
        <Text style={[hd.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      <View style={hd.foot}>
        <Text style={[hd.narrator, { color: c.accent }]}>{h.narrator}</Text>
        <Text style={[hd.source, { color: c.textMuted }]}>{sources}</Text>
      </View>

      {open && (
        <View style={[hd.body, { borderTopColor: c.border }]}>
          {h.key_lesson ? (
            <View style={hd.lessonBox}>
              <Text style={hd.lessonText}>💎 {h.key_lesson}</Text>
            </View>
          ) : null}
          {h.info_note ? (
            <View style={hd.noteBox}>
              <Text style={hd.noteText}>ℹ️ {h.info_note}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function TopicAccordion({ topic }: { topic: Topic & { hadiths: Hadith[] } }) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={[tp.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={tp.header} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
        <Text style={[tp.name, { color: c.text }]}>{topic.name}</Text>
        <View style={tp.right}>
          <View style={tp.badge}>
            <Text style={tp.badgeText}>{topic.hadiths.length}</Text>
          </View>
          <Text style={[tp.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[tp.body, { borderTopColor: c.border }]}>
          {topic.intro ? (
            <Text style={[tp.intro, { color: c.textSecondary }]}>{topic.intro}</Text>
          ) : null}
          {topic.hadiths.map(h => <HadithCard key={h.id} h={h} />)}
        </View>
      )}
    </View>
  );
}

function GroupAccordion({ group }: { group: GroupData }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const total = group.topics.reduce((s, t) => s + t.hadiths.length, 0);

  return (
    <View style={[gr.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={gr.header} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
        <Text style={[gr.name, { color: c.text }]}>{group.name}</Text>
        <View style={gr.right}>
          <View style={gr.badge}>
            <Text style={gr.badgeText}>{total} hadis</Text>
          </View>
          <Text style={[gr.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[gr.body, { borderTopColor: c.border }]}>
          {group.topics.map(t => <TopicAccordion key={t.id} topic={t} />)}
        </View>
      )}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function HadislerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: "Hadisler" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroIcon}>📿</Text>
          <Text style={s.heroTitle}>{META.title}</Text>
          <Text style={s.heroSub}>{META.subtitle}</Text>
          <Text style={s.heroDesc}>{META.description}</Text>
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

        {/* Güvenilirlik standardı */}
        <View style={[s.stdBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.stdLabel, { color: c.accent }]}>⚖️ Güvenilirlik Standardı</Text>
          <Text style={[s.stdText, { color: c.textSecondary }]}>{META.reliability_standard}</Text>
        </View>

        <Text style={[s.sectionHead, { color: c.textMuted }]}>Konular</Text>

        {GROUPED.map(g => <GroupAccordion key={g.name} group={g} />)}

        <Text style={[s.kaynak, { color: c.textMuted }]}>
          Kaynaklar: {META.sources.join(" · ")}
        </Text>
      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content: { padding: 14 },

  hero:     { borderRadius: 16, padding: 18, marginBottom: 12, alignItems: "center", backgroundColor: "#1a1a2e", gap: 5 },
  heroIcon: { fontSize: 34, marginBottom: 2 },
  heroTitle:{ fontSize: 18, fontWeight: "800", color: "#e2e8f0", textAlign: "center" },
  heroSub:  { fontSize: 12, color: "#94a3b8", textAlign: "center" },
  heroDesc: { fontSize: 11.5, color: "#64748b", lineHeight: 17, textAlign: "center", marginTop: 2 },
  stats:    { flexDirection: "row", gap: 10, marginTop: 8 },
  statChip: { backgroundColor: "#16213e", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  statNum:  { fontSize: 18, fontWeight: "800", color: "#e2e8f0" },
  statLbl:  { fontSize: 10, color: "#94a3b8" },

  stdBox:   { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, gap: 4 },
  stdLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  stdText:  { fontSize: 12, lineHeight: 18 },

  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  kaynak:   { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const gr = StyleSheet.create({
  card:   { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  name:   { flex: 1, fontSize: 14, fontWeight: "700" },
  right:  { flexDirection: "row", alignItems: "center", gap: 8 },
  badge:  { backgroundColor: "#f1f5f9", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  chev:   { fontSize: 11 },
  body:   { borderTopWidth: 1, padding: 10, gap: 6 },
});

const tp = StyleSheet.create({
  card:   { borderRadius: 11, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  name:   { flex: 1, fontSize: 13, fontWeight: "600" },
  right:  { flexDirection: "row", alignItems: "center", gap: 6 },
  badge:  { backgroundColor: "#ede9fe", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#6d28d9" },
  chev:   { fontSize: 10 },
  body:   { borderTopWidth: 1, padding: 10, gap: 8 },
  intro:  { fontSize: 12, lineHeight: 18, fontStyle: "italic", marginBottom: 4 },
});

const hd = StyleSheet.create({
  card:     { borderRadius: 10, borderWidth: 1, overflow: "hidden", marginBottom: 2 },
  header:   { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  text:     { flex: 1, fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  chev:     { fontSize: 10, marginTop: 4 },
  foot:     { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, paddingBottom: 9, flexWrap: "wrap" },
  narrator: { fontSize: 11, fontWeight: "700" },
  source:   { fontSize: 10.5 },
  body:     { borderTopWidth: 1, padding: 10, gap: 6 },
  lessonBox:{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#86efac" },
  lessonText:{ fontSize: 12, color: "#15803d", lineHeight: 18 },
  noteBox:  { backgroundColor: "#fff7ed", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#fdba74" },
  noteText: { fontSize: 11.5, color: "#9a3412", lineHeight: 17 },
});
