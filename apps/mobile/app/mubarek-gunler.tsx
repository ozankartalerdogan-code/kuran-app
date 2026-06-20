import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import rawData from "../src/data/mubarek_gunler.json";

const META  = (rawData as any).mubarek_gunler;
const GUNLER: Gun[] = META.gunler;

interface KuranRef  { sure?: string; ayet?: string; metin?: string; not?: string }
interface Ibadet    { isim: string; durum?: string; aciklama?: string; hadis_kaynagi?: string }
interface Gun {
  id: string; isim: string; tip?: string;
  dayanak: "sahih" | "tartismali" | "zayif" | "kulturel" | "uydurma";
  dayanak_aciklama?: string;
  kuran_referansi?: KuranRef;
  hicri_tarih?: string;
  onem?: string;
  tarihsel_bilgi?: string;
  ibadetler?: Ibadet[];
  ozel_not?: string;
}

// ── Dayanak renk/etiket haritası ─────────────────────────────────────────────

const DAYANAK: Record<string, { label: string; bg: string; border: string; text: string }> = {
  sahih:       { label: "SAHİH",       bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  tartismali:  { label: "TARTIŞMALI",  bg: "#fffbeb", border: "#fcd34d", text: "#b45309" },
  zayif:       { label: "ZAYIF",       bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  kulturel:    { label: "KÜLTÜREL",    bg: "#f0f9ff", border: "#7dd3fc", text: "#0369a1" },
  uydurma:     { label: "UYDURMA",     bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
};

const IBADET_DURUM: Record<string, { bg: string; text: string; label: string }> = {
  farz:   { bg: "#fef2f2", text: "#b91c1c", label: "FARZ"   },
  vacip:  { bg: "#fff7ed", text: "#c2410c", label: "VACİP"  },
  sunnet: { bg: "#f0fdf4", text: "#15803d", label: "SÜNNET" },
  mustehap: { bg: "#eff6ff", text: "#1d4ed8", label: "MÜSTEHAP" },
};

const TIP_EMOJI: Record<string, string> = {
  haftalik: "📅", yillik: "🌙", ramazan: "🌟",
};

// ── Bileşenler ────────────────────────────────────────────────────────────────

function DayanakBadge({ dayanak }: { dayanak: string }) {
  const d = DAYANAK[dayanak];
  if (!d) return null;
  return (
    <View style={[st.badge, { backgroundColor: d.bg, borderColor: d.border }]}>
      <Text style={[st.badgeText, { color: d.text }]}>{d.label}</Text>
    </View>
  );
}

function IbadetCard({ ib }: { ib: Ibadet }) {
  const c = useColors();
  const dur = ib.durum ? IBADET_DURUM[ib.durum] : undefined;
  return (
    <View style={[st.ibadetCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <View style={st.ibadetHeader}>
        <Text style={[st.ibadetIsim, { color: c.text }]}>{ib.isim}</Text>
        {dur && (
          <View style={[st.badge, { backgroundColor: dur.bg }]}>
            <Text style={[st.badgeText, { color: dur.text }]}>{dur.label}</Text>
          </View>
        )}
      </View>
      {ib.aciklama ? <Text style={[st.p, { color: c.textSecondary }]}>{ib.aciklama}</Text> : null}
      {ib.hadis_kaynagi ? <Text style={[st.kaynak, { color: c.textMuted }]}>📚 {ib.hadis_kaynagi}</Text> : null}
    </View>
  );
}

function GunCard({ gun }: { gun: Gun }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const d = DAYANAK[gun.dayanak];

  return (
    <View style={[st.card, { backgroundColor: c.card, borderColor: c.border, borderLeftColor: d?.border ?? c.border }]}>
      <TouchableOpacity style={st.cardHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={st.row}>
            <Text style={[st.isim, { color: c.text }]}>{gun.isim}</Text>
          </View>
          <View style={st.row}>
            <DayanakBadge dayanak={gun.dayanak} />
            {gun.tip && TIP_EMOJI[gun.tip] ? (
              <Text style={[st.tipText, { color: c.textMuted }]}>{TIP_EMOJI[gun.tip]} {gun.tip}</Text>
            ) : null}
            {gun.hicri_tarih ? (
              <Text style={[st.hicri, { color: c.textMuted }]}>{gun.hicri_tarih}</Text>
            ) : null}
          </View>
        </View>
        <Text style={[st.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[st.body, { borderTopColor: c.border }]}>

          {/* Önem */}
          {gun.onem ? (
            <Text style={[st.onem, { color: c.textSecondary }]}>{gun.onem}</Text>
          ) : null}

          {/* Dayanak açıklaması */}
          {gun.dayanak_aciklama ? (
            <View style={[st.dayanakBox, { backgroundColor: d?.bg ?? c.cardAlt, borderColor: d?.border ?? c.border }]}>
              <Text style={[st.dayanakLabel, { color: d?.text ?? c.accent }]}>⚖️ Dayanak</Text>
              <Text style={[st.p, { color: c.textSecondary }]}>{gun.dayanak_aciklama}</Text>
            </View>
          ) : null}

          {/* Kuran referansı */}
          {gun.kuran_referansi && (gun.kuran_referansi.metin || gun.kuran_referansi.not) ? (
            <View style={[st.kuranBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              {gun.kuran_referansi.sure && gun.kuran_referansi.ayet ? (
                <Text style={[st.kuranRef, { color: c.accent }]}>
                  📖 {gun.kuran_referansi.sure} {gun.kuran_referansi.ayet}
                </Text>
              ) : null}
              {gun.kuran_referansi.metin ? (
                <Text style={[st.p, { color: c.text }]}>"{gun.kuran_referansi.metin}"</Text>
              ) : null}
              {gun.kuran_referansi.not ? (
                <Text style={[st.small, { color: c.textMuted }]}>{gun.kuran_referansi.not}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Tarihsel bilgi */}
          {gun.tarihsel_bilgi ? (
            <Text style={[st.p, { color: c.textSecondary }]}>{gun.tarihsel_bilgi}</Text>
          ) : null}

          {/* İbadetler */}
          {gun.ibadetler && gun.ibadetler.length > 0 ? (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>🤲 İbadetler</Text>
              {gun.ibadetler.map((ib, i) => <IbadetCard key={i} ib={ib} />)}
            </View>
          ) : null}

          {/* Özel not */}
          {gun.ozel_not ? (
            <View style={st.notBox}>
              <Text style={st.notText}>ℹ️ {gun.ozel_not}</Text>
            </View>
          ) : null}

        </View>
      )}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function MubarekGunlerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: "Mübarek Gün ve Geceler" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroIcon}>🌙</Text>
          <Text style={s.heroTitle}>{META.baslik}</Text>
          <Text style={s.heroDesc}>{META.aciklama}</Text>
        </View>

        {/* Hızlı Bakış — Özet Tablo */}
        <View style={[s.ozetBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.ozetTitle, { color: c.text }]}>Hızlı Bakış</Text>
          {META.ozet_tablo.map((row: any, i: number) => {
            const d = DAYANAK[row.dayanak];
            return (
              <View key={i} style={[s.ozetRow, { borderBottomColor: c.border }]}>
                <Text style={[s.ozetIsim, { color: c.text }]}>{row.isim}</Text>
                <Text style={[s.ozetHicri, { color: c.textMuted }]}>{row.hicri}</Text>
                {d && (
                  <View style={[s.ozetBadge, { backgroundColor: d.bg, borderColor: d.border }]}>
                    <Text style={[s.ozetBadgeText, { color: d.text }]}>{d.label}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Dayanak açıklamaları */}
        {META.dayanak_seviyeleri && (
          <View style={[s.dayanakLegend, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.ozetTitle, { color: c.text }]}>Dayanak Seviyeleri</Text>
            {Object.entries(META.dayanak_seviyeleri).map(([key, val]: [string, any]) => {
              const d = DAYANAK[key];
              return (
                <View key={key} style={s.legendRow}>
                  {d && (
                    <View style={[s.ozetBadge, { backgroundColor: d.bg, borderColor: d.border }]}>
                      <Text style={[s.ozetBadgeText, { color: d.text }]}>{d.label}</Text>
                    </View>
                  )}
                  <Text style={[s.legendText, { color: c.textSecondary }]}>{val}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>
          Gün ve Geceler ({GUNLER.length})
        </Text>

        {GUNLER.map(g => <GunCard key={g.id} gun={g} />)}

        {META.genel_not ? (
          <View style={st.notBox}>
            <Text style={st.notText}>ℹ️ {META.genel_not}</Text>
          </View>
        ) : null}

        <Text style={[s.kaynak, { color: c.textMuted }]}>{META.kaynak_not}</Text>
      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content:  { padding: 14 },

  hero:     { borderRadius: 16, padding: 18, marginBottom: 12, alignItems: "center", backgroundColor: "#0f172a", gap: 6 },
  heroIcon: { fontSize: 36, marginBottom: 2 },
  heroTitle:{ fontSize: 18, fontWeight: "800", color: "#e2e8f0", textAlign: "center" },
  heroDesc: { fontSize: 12, color: "#64748b", lineHeight: 18, textAlign: "center" },

  ozetBox:   { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  ozetTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  ozetRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1 },
  ozetIsim:  { flex: 1, fontSize: 12.5, fontWeight: "600" },
  ozetHicri: { fontSize: 10.5, flexShrink: 1 },
  ozetBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  ozetBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  dayanakLegend: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendText:{ flex: 1, fontSize: 11.5, lineHeight: 17 },

  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  kaynak:   { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const st = StyleSheet.create({
  card:       { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, marginBottom: 8, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  body:       { borderTopWidth: 1, padding: 14, gap: 12 },

  row:   { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  isim:  { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  chev:  { fontSize: 11, marginTop: 3 },

  tipText: { fontSize: 10.5 },
  hicri:   { fontSize: 10.5 },

  badge:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  onem: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },

  dayanakBox:   { borderRadius: 10, borderWidth: 1, padding: 11, gap: 4 },
  dayanakLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  kuranBox: { borderRadius: 10, borderWidth: 1, padding: 11, gap: 5 },
  kuranRef: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  section:      { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  ibadetCard:   { borderRadius: 10, borderWidth: 1, padding: 11, marginBottom: 4, gap: 4 },
  ibadetHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ibadetIsim:   { fontSize: 13, fontWeight: "700", flex: 1 },

  p:     { fontSize: 12.5, lineHeight: 20 },
  small: { fontSize: 11.5, lineHeight: 17 },
  kaynak:{ fontSize: 10.5, fontStyle: "italic" },

  notBox:  { backgroundColor: "#fff7ed", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#fdba74" },
  notText: { fontSize: 11.5, color: "#9a3412", lineHeight: 17 },
});
