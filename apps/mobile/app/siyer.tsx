import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { Stack, router } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import rawData from "../src/data/siyer_i_nebi.json";
import { READING_MAX_WIDTH } from "../src/lib/layout";

interface Period {
  id: string; order: number; name: string;
  date_range: string; summary: string; icon: string;
}
interface Meta {
  title: string; subtitle: string; description: string;
  sources: string[];
}
interface SiyerEvent {
  id: string; period_id: string; title: string;
  date_miladi: string | null; date_hijri: string | null;
  description: string;
  quran_refs: string[];
  hadith_sources: string[];
  key_lessons: string[];
  reliability_note: string | null;
  tags: string[];
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

const META: Meta = {
  title: rawData.meta?.title ?? "Siyer-i Nebi",
  subtitle: rawData.meta?.subtitle ?? "",
  description: rawData.meta?.description ?? "",
  sources: ensureStringArray(rawData.meta?.sources),
};

const PERIODS = [...((rawData.periods ?? []) as Period[])].sort((a, b) => a.order - b.order);

const EVENTS = ((rawData.events ?? []) as SiyerEvent[]).map(event => ({
  ...event,
  title: event.title ?? "",
  description: event.description ?? "",
  date_miladi: event.date_miladi ?? null,
  date_hijri: event.date_hijri ?? null,
  quran_refs: ensureStringArray(event.quran_refs),
  hadith_sources: ensureStringArray(event.hadith_sources),
  key_lessons: ensureStringArray(event.key_lessons),
  tags: ensureStringArray(event.tags),
  reliability_note: event.reliability_note ?? null,
}));

const eventsByPeriod: Record<string, SiyerEvent[]> = {};
for (const e of EVENTS) {
  if (!eventsByPeriod[e.period_id]) eventsByPeriod[e.period_id] = [];
  eventsByPeriod[e.period_id].push(e);
}

function QuranRefChip({ refKey }: { refKey: string }) {
  const [surah, ayah] = refKey.split(":").map(Number);
  if (!surah || !ayah) return <Text style={ev.chip}>{refKey}</Text>;
  return (
    <TouchableOpacity
      style={ev.refChip}
      onPress={() => router.push(`/ayah/${surah}/${ayah}` as Href)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${refKey} ayet referansı`}
      accessibilityHint="Ayet detayını açar"
    >
      <Text style={ev.refChipText}>{refKey}</Text>
    </TouchableOpacity>
  );
}

function EventCard({ event }: { event: SiyerEvent }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const eventTitle = event.title || "Başlıksız olay";
  const eventDescription = event.description || "Açıklama eklenmedi.";

  return (
    <View style={[ev.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={ev.header}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={eventTitle}
        accessibilityHint={`Olay detayını ${open ? "kapatır" : "açar"}`}
        accessibilityState={{ expanded: open }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[ev.title, { color: c.text }]}>{eventTitle}</Text>
          {(event.date_miladi || event.date_hijri) ? (
            <Text style={[ev.date, { color: c.textMuted }]}>
              {[event.date_miladi, event.date_hijri].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
        <Text style={[ev.chev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[ev.body, { borderTopColor: c.border }]}>
          <Text style={[ev.desc, { color: c.textSecondary }]}>{eventDescription}</Text>

          {event.quran_refs.length > 0 && (
            <View style={ev.section}>
              <Text style={[ev.sectionLabel, { color: c.accent }]}>📖 Kur'an Referansları</Text>
              <View style={ev.chipRow}>
                {event.quran_refs.map(r => <QuranRefChip key={r} refKey={r} />)}
              </View>
            </View>
          )}

          {event.key_lessons.length > 0 && (
            <View style={ev.section}>
              <Text style={[ev.sectionLabel, { color: c.accent }]}>💎 Öğretiler</Text>
              {event.key_lessons.map((lesson, index) => (
                <Text key={index} style={[ev.lesson, { color: c.textSecondary }]}>• {lesson}</Text>
              ))}
            </View>
          )}

          {event.hadith_sources.length > 0 && (
            <Text style={[ev.sources, { color: c.textMuted }]}>📚 {event.hadith_sources.join(", ")}</Text>
          )}

          {event.reliability_note ? (
            <View style={ev.reliabilityBox}>
              <Text style={ev.reliabilityText}>⚠️ {event.reliability_note}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function PeriodAccordion({ period }: { period: Period }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const events = eventsByPeriod[period.id] ?? [];

  return (
    <View style={[pd.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={pd.header}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={period.name}
        accessibilityHint={`Dönem detayını ${open ? "kapatır" : "açar"}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={{ fontSize: 22 }}>{period.icon}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[pd.name, { color: c.text }]}>{period.name}</Text>
          <Text style={[pd.range, { color: c.textMuted }]}>{period.date_range}</Text>
        </View>
        <View style={pd.badge}>
          <Text style={pd.badgeText}>{events.length}</Text>
        </View>
        <Text style={[pd.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[pd.body, { borderTopColor: c.border }]}>
          <Text style={[pd.summary, { color: c.textSecondary }]}>{period.summary}</Text>
          {events.length > 0 ? (
            events.map(e => <EventCard key={e.id} event={e} />)
          ) : (
            <Text style={[pd.empty, { color: c.textMuted }]}>Bu döneme ait kayıt bulunamadı.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function SiyerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: "Siyer-i Nebî" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.heroCard, { backgroundColor: "#0f172a" }]}>
          <Text style={s.heroIcon}>☪️</Text>
          <Text style={s.heroTitle}>{META.title}</Text>
          <Text style={s.heroSub}>{META.subtitle}</Text>
          <Text style={s.heroDesc}>{META.description}</Text>
          <View style={s.stats}>
            <View style={s.statChip}>
              <Text style={s.statNum}>{PERIODS.length}</Text>
              <Text style={s.statLbl}>Dönem</Text>
            </View>
            <View style={s.statChip}>
              <Text style={s.statNum}>{EVENTS.length}</Text>
              <Text style={s.statLbl}>Olay</Text>
            </View>
          </View>
        </View>

        <Text style={[s.sectionHead, { color: c.textMuted }]}>Dönemler</Text>

        {PERIODS.map(period => <PeriodAccordion key={period.id} period={period} />)}

        {META.sources.length > 0 ? (
          <Text style={[s.sources, { color: c.textMuted }]}>Kaynaklar: {META.sources.join(" · ")}</Text>
        ) : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content:     { padding: 14, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  heroCard:    { borderRadius: 16, padding: 18, marginBottom: 14, gap: 6, alignItems: "center" },
  heroIcon:    { fontSize: 36, marginBottom: 4 },
  heroTitle:   { fontSize: 22, fontWeight: "800", color: "#f8fafc", textAlign: "center" },
  heroSub:     { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  heroDesc:    { fontSize: 12, color: "#64748b", lineHeight: 18, textAlign: "center", marginTop: 4 },
  stats:    { flexDirection: "row", gap: 10, marginTop: 8 },
  statChip: { backgroundColor: "#16213e", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  statNum:  { fontSize: 18, fontWeight: "800", color: "#e2e8f0" },
  statLbl:  { fontSize: 10, color: "#94a3b8" },
  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  sources:     { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const pd = StyleSheet.create({
  card:    { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  header:  { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  name:    { fontSize: 14, fontWeight: "700" },
  range:   { fontSize: 11, marginTop: 1 },
  badge:   { backgroundColor: "#f1f5f9", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  chev:    { fontSize: 11 },
  body:    { borderTopWidth: 1, padding: 12, gap: 8 },
  empty:   { fontSize: 12, fontStyle: "italic" },
  summary: { fontSize: 12.5, lineHeight: 19, marginBottom: 4, fontStyle: "italic" },
});

const ev = StyleSheet.create({
  card:    { borderRadius: 12, borderWidth: 1, marginBottom: 6, overflow: "hidden" },
  header:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  title:   { fontSize: 13.5, fontWeight: "700" },
  date:    { fontSize: 11 },
  chev:    { fontSize: 11 },
  body:    { borderTopWidth: 1, padding: 12, gap: 10 },
  desc:    { fontSize: 12.5, lineHeight: 20 },

  section:      { gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  chipRow:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip:     { fontSize: 11, color: "#64748b" },
  refChip:  { backgroundColor: "#d1fae5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#6ee7b7" },
  refChipText: { fontSize: 12, fontWeight: "700", color: "#065f46" },

  lesson:  { fontSize: 12.5, lineHeight: 19 },
  sources: { fontSize: 10.5, fontStyle: "italic" },

  reliabilityBox:  { backgroundColor: "#fff7ed", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#fdba74" },
  reliabilityText: { fontSize: 11.5, color: "#9a3412", lineHeight: 17 },
});
