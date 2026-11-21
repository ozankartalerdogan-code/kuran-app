import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { Stack, router } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";

import { useLang, useStrings, fmt, caps } from "../src/i18n";
import { localizedData } from "../src/i18n/localizedData";
import kissalarStrings from "../src/i18n/strings/peygamberKissalari";
import { Badge, Callout, radius, space, toneColors, type IoniconName } from "../src/components/ui";

const pickData = localizedData<{ peygamber_kissalari: PeygamberKissalariMeta }>(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/peygamber_kissalari.json"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/peygamber_kissalari.en.json"),
);

interface Kissa {
  baslik: string;
  metin: string;
  kuran_referanslari?: string[];
  not?: string;
}

interface Peygamber {
  id: string;
  isim: string;
  unvan?: string;
  kuranda_gecme_sayisi?: number;
  gondirildigi_yer?: string;
  donem?: string;
  kisa_ozet?: string;
  kissa: Kissa[];
  mucizeler?: string[];
  dersler?: string[];
  ana_sure?: string;
  kuran_referanslari_ozet?: string[];
  ozel_notlar?: string[];
}

interface PeygamberKissalariMeta {
  baslik: string;
  aciklama: string;
  toplam_peygamber: number;
  genel_dersler?: string[];
  kaynak_not: string;
  peygamberler: Peygamber[];
}

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function MetaLine({ icon, text }: { icon: IoniconName; text: string }) {
  const c = useColors();
  return (
    <View style={st.metaLine}>
      <Ionicons name={icon} size={14} color={c.textMuted} style={st.metaIcon} accessible={false} importantForAccessibility="no" />
      <Text style={[st.metaRow, { color: c.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

function RefChip({ refKey }: { refKey: string }) {
  const c = useColors();
  const t = useStrings(kissalarStrings);
  const parts = refKey.split(":");
  const surah = Number(parts[0]);
  const ayah = Number(parts[1]?.split("-")[0]);
  const valid = surah > 0 && ayah > 0;
  if (!valid) return <Text style={[st.chip, { color: c.textMuted }]}>{refKey}</Text>;
  return (
    <TouchableOpacity
      style={[st.refChip, { backgroundColor: c.emeraldBg, borderColor: c.emeraldBorder }]}
      onPress={() => router.push(`/ayah/${surah}/${ayah}` as Href)}
      activeOpacity={0.75}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.refA11y, { ref: refKey })}
      accessibilityHint={t.refHint}
    >
      <Text style={[st.refChipText, { color: c.emeraldText }]}>{refKey}</Text>
    </TouchableOpacity>
  );
}

function KissaCard({ kissa }: { kissa: Kissa }) {
  const c = useColors();
  const t = useStrings(kissalarStrings);
  const [open, setOpen] = useState(false);
  return (
    <View style={[st.kissaCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={st.kissaHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={kissa.baslik}
        accessibilityHint={open ? t.storyHintClose : t.storyHintOpen}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[st.kissaBaslik, { color: c.text }]}>{kissa.baslik}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>
      {open && (
        <View style={[st.kissaBody, { borderTopColor: c.border }]}>
          <Text style={[st.metin, { color: c.textSecondary }]}>{kissa.metin}</Text>
          {kissa.kuran_referanslari && kissa.kuran_referanslari.length > 0 && (
            <View style={st.refRow}>
              {kissa.kuran_referanslari.map(r => <RefChip key={r} refKey={r} />)}
            </View>
          )}
          {kissa.not && <Callout tone="info">{kissa.not}</Callout>}
        </View>
      )}
    </View>
  );
}

function PeygamberCard({ p }: { p: Peygamber }) {
  const c = useColors();
  const t = useStrings(kissalarStrings);
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Başlık satırı */}
      <TouchableOpacity
        style={st.cardHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={p.isim}
        accessibilityHint={open ? t.prophetHintClose : t.prophetHintOpen}
        accessibilityState={{ expanded: open }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={[st.isim, { color: c.text }]}>{p.isim}</Text>
            {p.kuranda_gecme_sayisi != null && (
              <Badge label={`${p.kuranda_gecme_sayisi}×`} tone="violet" style={{ alignSelf: "center" }} />
            )}
          </View>
          {p.unvan ? <Text style={[st.unvan, { color: c.accent }]}>{p.unvan}</Text> : null}
          {p.kisa_ozet ? <Text style={[st.ozet, { color: c.textMuted }]} numberOfLines={open ? undefined : 2}>{p.kisa_ozet}</Text> : null}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} style={{ marginTop: 2 }} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>

      {open && (
        <View style={[st.cardBody, { borderTopColor: c.border }]}>

          {/* Meta bilgi */}
          {(p.gondirildigi_yer || p.donem || p.ana_sure) && (
            <View style={[st.metaBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              {p.gondirildigi_yer ? <MetaLine icon="location-outline" text={p.gondirildigi_yer} /> : null}
              {p.donem ? <MetaLine icon="time-outline" text={p.donem} /> : null}
              {p.ana_sure ? <MetaLine icon="book-outline" text={p.ana_sure} /> : null}
            </View>
          )}

          {/* Kur'an referansları */}
          {p.kuran_referanslari_ozet && p.kuran_referanslari_ozet.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>{caps(t.quranRefs)}</Text>
              <View style={st.refRow}>
                {p.kuran_referanslari_ozet.map(r => <RefChip key={r} refKey={r} />)}
              </View>
            </View>
          )}

          {/* Kıssalar */}
          {p.kissa.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>{caps(t.stories)}</Text>
              {p.kissa.map((k, i) => <KissaCard key={i} kissa={k} />)}
            </View>
          )}

          {/* Mucizeler */}
          {p.mucizeler && p.mucizeler.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>{caps(t.miracles)}</Text>
              {p.mucizeler.map((m, i) => (
                <Text key={i} style={[st.bullet, { color: c.textSecondary }]}>• {m}</Text>
              ))}
            </View>
          )}

          {/* Dersler */}
          {p.dersler && p.dersler.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>{caps(t.lessons)}</Text>
              {p.dersler.map((d, i) => (
                <Text key={i} style={[st.bullet, { color: c.textSecondary }]}>• {d}</Text>
              ))}
            </View>
          )}

          {/* Özel notlar */}
          {p.ozel_notlar && p.ozel_notlar.length > 0 && (
            <View style={st.section}>
              <TouchableOpacity
                style={[st.notesHeader, { backgroundColor: c.cardAlt, borderColor: c.border }]}
                onPress={() => setNotesOpen(prev => !prev)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={fmt(t.notesA11y, { name: p.isim })}
                accessibilityHint={notesOpen ? t.notesHintClose : t.notesHintOpen}
                accessibilityState={{ expanded: notesOpen }}
              >
                <Text style={[st.sectionLabel, { color: c.accent }]}>{caps(t.notes)}</Text>
                <Ionicons name={notesOpen ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
              </TouchableOpacity>
              {notesOpen && p.ozel_notlar.map((n, i) => (
                <Callout key={i} tone="info">{n}</Callout>
              ))}
            </View>
          )}

        </View>
      )}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function PeygamberKissalariScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useStrings(kissalarStrings);
  const lang = useLang();
  const META = pickData(lang).peygamber_kissalari;
  const PEYGAMBERLER: Peygamber[] = META.peygamberler;
  const heroTone = toneColors(c, "violet");

  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[s.heroIconWrap, { backgroundColor: heroTone.bg }]}>
            <Ionicons name="library-outline" size={28} color={heroTone.fg} accessible={false} importantForAccessibility="no" />
          </View>
          <Text style={[s.heroTitle, { color: c.text }]}>{META.baslik}</Text>
          <Text style={[s.heroDesc, { color: c.textSecondary }]}>{META.aciklama}</Text>
          <View style={s.heroStats}>
            <View style={[s.statChip, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.statNum, { color: c.text }]}>{META.toplam_peygamber}</Text>
              <Text style={[s.statLabel, { color: c.textMuted }]}>{t.statProphet}</Text>
            </View>
          </View>
        </View>

        {/* Genel dersler */}
        {META.genel_dersler && META.genel_dersler.length > 0 && (
          <View style={[s.genelBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.genelTitle, { color: c.text }]}>{t.generalLessons}</Text>
            {META.genel_dersler.map((d: string, i: number) => (
              <Text key={i} style={[s.genelItem, { color: c.textSecondary }]}>• {d}</Text>
            ))}
          </View>
        )}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>
          {caps(fmt(t.prophets, { n: PEYGAMBERLER.length }))}
        </Text>

        {PEYGAMBERLER.map(p => <PeygamberCard key={p.id} p={p} />)}

        <Text style={[s.kaynak, { color: c.textMuted }]}>{META.kaynak_not}</Text>
      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content:    { padding: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  hero:         { borderRadius: radius.lg, borderWidth: 1, padding: 18, marginBottom: space.sm, alignItems: "center", gap: 6 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle:    { fontSize: 18, fontWeight: "800", textAlign: "center" },
  heroDesc:     { fontSize: 12, lineHeight: 18, textAlign: "center" },
  heroStats:    { flexDirection: "row", gap: 12, marginTop: 6 },
  statChip:     { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  statNum:      { fontSize: 18, fontWeight: "800" },
  statLabel:    { fontSize: 10 },

  genelBox:   { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: space.sm, gap: 4 },
  genelTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  genelItem:  { fontSize: 12.5, lineHeight: 19 },

  sectionHead:{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  kaynak:     { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const st = StyleSheet.create({
  card:       { borderRadius: radius.lg, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  cardHeader: { minHeight: 44, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  cardBody:   { borderTopWidth: 1, padding: 14, gap: 12 },

  isim:       { fontSize: 15, fontWeight: "800" },
  unvan:      { fontSize: 11, fontWeight: "600" },
  ozet:       { fontSize: 12, lineHeight: 18, marginTop: 2 },

  metaBox:  { borderRadius: radius.md, borderWidth: 1, padding: 10, gap: 4 },
  metaLine: { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  metaIcon: { marginTop: 2 },
  metaRow:  { fontSize: 12, lineHeight: 18 },

  section:      { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  notesHeader:  { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10 },

  refRow:   { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip:     { fontSize: 11 },
  refChip:  { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  refChipText: { fontSize: 12, fontWeight: "700" },

  kissaCard:   { borderRadius: radius.lg, borderWidth: 1, marginBottom: 4, overflow: "hidden" },
  kissaHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", padding: 11, gap: 8 },
  kissaBaslik: { flex: 1, fontSize: 13, fontWeight: "600" },
  kissaBody:   { borderTopWidth: 1, padding: 11, gap: 8 },
  metin:       { fontSize: 12.5, lineHeight: 20 },

  bullet: { fontSize: 12.5, lineHeight: 19 },
});

