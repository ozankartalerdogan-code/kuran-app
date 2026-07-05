import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { Stack, router } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import rawData from "../src/data/peygamber_kissalari.json";
import { READING_MAX_WIDTH } from "../src/lib/layout";

const META        = (rawData as { peygamber_kissalari: PeygamberKissalariMeta }).peygamber_kissalari;
const PEYGAMBERLER: Peygamber[] = META.peygamberler;

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

function RefChip({ refKey }: { refKey: string }) {
  const parts = refKey.split(":");
  const surah = Number(parts[0]);
  const ayah = Number(parts[1]?.split("-")[0]);
  const valid = surah > 0 && ayah > 0;
  if (!valid) return <Text style={st.chip}>{refKey}</Text>;
  return (
    <TouchableOpacity
      style={st.refChip}
      onPress={() => router.push(`/ayah/${surah}/${ayah}` as Href)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${refKey} ayet referansı`}
      accessibilityHint="Ayet detayını açar"
    >
      <Text style={st.refChipText}>{refKey}</Text>
    </TouchableOpacity>
  );
}

function KissaCard({ kissa }: { kissa: Kissa }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={[st.kissaCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <TouchableOpacity
        style={st.kissaHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={kissa.baslik}
        accessibilityHint={`Kıssa detayını ${open ? "kapatır" : "açar"}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[st.kissaBaslik, { color: c.text }]}>{kissa.baslik}</Text>
        <Text style={[st.chev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={[st.kissaBody, { borderTopColor: c.border }]}>
          <Text style={[st.metin, { color: c.textSecondary }]}>{kissa.metin}</Text>
          {kissa.kuran_referanslari && kissa.kuran_referanslari.length > 0 && (
            <View style={st.refRow}>
              {kissa.kuran_referanslari.map(r => <RefChip key={r} refKey={r} />)}
            </View>
          )}
          {kissa.not && (
            <View style={st.notBox}>
              <Text style={st.notText}>ℹ️ {kissa.not}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PeygamberCard({ p }: { p: Peygamber }) {
  const c = useColors();
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
        accessibilityHint={`Peygamber detayını ${open ? "kapatır" : "açar"}`}
        accessibilityState={{ expanded: open }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[st.isim, { color: c.text }]}>{p.isim}</Text>
            {p.kuranda_gecme_sayisi != null && (
              <View style={st.sayiBadge}>
                <Text style={st.sayiBadgeText}>{p.kuranda_gecme_sayisi}×</Text>
              </View>
            )}
          </View>
          {p.unvan ? <Text style={[st.unvan, { color: c.accent }]}>{p.unvan}</Text> : null}
          {p.kisa_ozet ? <Text style={[st.ozet, { color: c.textMuted }]} numberOfLines={open ? undefined : 2}>{p.kisa_ozet}</Text> : null}
        </View>
        <Text style={[st.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[st.cardBody, { borderTopColor: c.border }]}>

          {/* Meta bilgi */}
          {(p.gondirildigi_yer || p.donem || p.ana_sure) && (
            <View style={[st.metaBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              {p.gondirildigi_yer ? <Text style={[st.metaRow, { color: c.textSecondary }]}>📍 {p.gondirildigi_yer}</Text> : null}
              {p.donem ? <Text style={[st.metaRow, { color: c.textSecondary }]}>🕐 {p.donem}</Text> : null}
              {p.ana_sure ? <Text style={[st.metaRow, { color: c.textSecondary }]}>📖 {p.ana_sure}</Text> : null}
            </View>
          )}

          {/* Kuran referansları */}
          {p.kuran_referanslari_ozet && p.kuran_referanslari_ozet.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>📖 Kuran Referansları</Text>
              <View style={st.refRow}>
                {p.kuran_referanslari_ozet.map(r => <RefChip key={r} refKey={r} />)}
              </View>
            </View>
          )}

          {/* Kıssalar */}
          {p.kissa.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>📜 Kıssalar</Text>
              {p.kissa.map((k, i) => <KissaCard key={i} kissa={k} />)}
            </View>
          )}

          {/* Mucizeler */}
          {p.mucizeler && p.mucizeler.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>✨ Mucizeler</Text>
              {p.mucizeler.map((m, i) => (
                <Text key={i} style={[st.bullet, { color: c.textSecondary }]}>• {m}</Text>
              ))}
            </View>
          )}

          {/* Dersler */}
          {p.dersler && p.dersler.length > 0 && (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>💎 Dersler</Text>
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
                accessibilityLabel={`${p.isim} özel notları`}
                accessibilityHint={`Özel notları ${notesOpen ? "kapatır" : "açar"}`}
                accessibilityState={{ expanded: notesOpen }}
              >
                <Text style={[st.sectionLabel, { color: c.accent }]}>ℹ️ Özel Notlar</Text>
                <Text style={[st.chev, { color: c.textMuted }]}>{notesOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              {notesOpen && p.ozel_notlar.map((n, i) => (
                <View key={i} style={st.notBox}>
                  <Text style={st.notText}>ℹ️ {n}</Text>
                </View>
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

  return (
    <>
      <Stack.Screen options={{ title: "Peygamber Kıssaları" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroIcon}>🕌</Text>
          <Text style={s.heroTitle}>{META.baslik}</Text>
          <Text style={s.heroDesc}>{META.aciklama}</Text>
          <View style={s.heroStats}>
            <View style={s.statChip}>
              <Text style={s.statNum}>{META.toplam_peygamber}</Text>
              <Text style={s.statLabel}>Peygamber</Text>
            </View>
          </View>
        </View>

        {/* Genel dersler */}
        {META.genel_dersler && META.genel_dersler.length > 0 && (
          <View style={[s.genelBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.genelTitle, { color: c.text }]}>💎 Genel Dersler</Text>
            {META.genel_dersler.map((d: string, i: number) => (
              <Text key={i} style={[s.genelItem, { color: c.textSecondary }]}>• {d}</Text>
            ))}
          </View>
        )}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>
          Peygamberler ({PEYGAMBERLER.length})
        </Text>

        {PEYGAMBERLER.map(p => <PeygamberCard key={p.id} p={p} />)}

        <Text style={[s.kaynak, { color: c.textMuted }]}>{META.kaynak_not}</Text>
      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content:    { padding: 14, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  hero:       { borderRadius: 16, padding: 18, marginBottom: 12, alignItems: "center", backgroundColor: "#1e1b4b", gap: 6 },
  heroIcon:   { fontSize: 36, marginBottom: 2 },
  heroTitle:  { fontSize: 18, fontWeight: "800", color: "#e0e7ff", textAlign: "center" },
  heroDesc:   { fontSize: 12, color: "#818cf8", lineHeight: 18, textAlign: "center" },
  heroStats:  { flexDirection: "row", gap: 12, marginTop: 6 },
  statChip:   { backgroundColor: "#312e81", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  statNum:    { fontSize: 18, fontWeight: "800", color: "#e0e7ff" },
  statLabel:  { fontSize: 10, color: "#a5b4fc" },

  genelBox:   { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12, gap: 4 },
  genelTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  genelItem:  { fontSize: 12.5, lineHeight: 19 },

  sectionHead:{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  kaynak:     { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const st = StyleSheet.create({
  card:       { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  cardBody:   { borderTopWidth: 1, padding: 14, gap: 12 },

  isim:       { fontSize: 15, fontWeight: "800" },
  unvan:      { fontSize: 11, fontWeight: "600" },
  ozet:       { fontSize: 12, lineHeight: 18, marginTop: 2 },
  chev:       { fontSize: 11, marginTop: 3 },

  sayiBadge:     { backgroundColor: "#ede9fe", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  sayiBadgeText: { fontSize: 10, fontWeight: "700", color: "#6d28d9" },

  metaBox:  { borderRadius: 10, borderWidth: 1, padding: 10, gap: 4 },
  metaRow:  { fontSize: 12, lineHeight: 18 },

  section:      { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  notesHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10 },

  refRow:   { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip:     { fontSize: 11, color: "#64748b" },
  refChip:  { backgroundColor: "#d1fae5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#6ee7b7" },
  refChipText: { fontSize: 12, fontWeight: "700", color: "#065f46" },

  kissaCard:   { borderRadius: 10, borderWidth: 1, marginBottom: 4, overflow: "hidden" },
  kissaHeader: { flexDirection: "row", alignItems: "center", padding: 11, gap: 8 },
  kissaBaslik: { flex: 1, fontSize: 13, fontWeight: "600" },
  kissaBody:   { borderTopWidth: 1, padding: 11, gap: 8 },
  metin:       { fontSize: 12.5, lineHeight: 20 },

  bullet: { fontSize: 12.5, lineHeight: 19 },

  notBox:  { backgroundColor: "#fff7ed", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#fdba74" },
  notText: { fontSize: 11.5, color: "#9a3412", lineHeight: 17 },
});

