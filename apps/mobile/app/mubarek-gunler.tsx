import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import rawData from "../src/data/mubarek_gunler.json";
import { READING_MAX_WIDTH } from "../src/lib/layout";

type DayanakKey = "sahih" | "tartismali" | "zayif" | "kulturel" | "uydurma";
type IbadetDurumKey = "farz" | "vacip" | "sunnet" | "mustehap" | "tavsiye";
type GunTip = "haftalik" | "yillik" | "ramazan";

interface KuranRef {
  sure?: string;
  ayet?: string | number;
  metin?: string;
  not?: string;
}

interface Ibadet {
  isim: string;
  durum?: IbadetDurumKey;
  aciklama?: string;
  hadis_kaynagi?: string;
}

interface Gun {
  id: string;
  isim: string;
  tip?: GunTip;
  dayanak: DayanakKey;
  dayanak_aciklama?: string;
  kuran_referansi?: KuranRef | null;
  hicri_tarih?: string;
  onem?: string;
  tarihsel_bilgi?: string;
  ibadetler?: Ibadet[];
  ozel_not?: string | null;
}

interface OzetRow {
  isim: string;
  dayanak: DayanakKey;
  hicri: string;
}

interface DayanakSeviye {
  kod: DayanakKey;
  etiket?: string;
  aciklama?: string;
}

interface MubarekGunlerRoot {
  baslik?: string;
  aciklama?: string;
  kaynak_not?: string;
  genel_not?: string;
  gunler?: Gun[];
  ozet_tablo?: OzetRow[];
  dayanak_seviyeleri?: {
    aciklama?: string;
    seviyeler?: DayanakSeviye[];
  };
}

const ROOT = ((rawData as { mubarek_gunler?: MubarekGunlerRoot }).mubarek_gunler ?? {});
const GUNLER: Gun[] = Array.isArray(ROOT.gunler)
  ? ROOT.gunler.map(gun => ({
      ...gun,
      ibadetler: Array.isArray(gun.ibadetler) ? gun.ibadetler : [],
      kuran_referansi: gun.kuran_referansi ?? null,
      ozel_not: gun.ozel_not ?? null,
    }))
  : [];
const OZET_TABLO: OzetRow[] = Array.isArray(ROOT.ozet_tablo) ? ROOT.ozet_tablo : [];
const DAYANAK_SEVIYELERI: DayanakSeviye[] = Array.isArray(ROOT.dayanak_seviyeleri?.seviyeler)
  ? ROOT.dayanak_seviyeleri.seviyeler
  : [];

const DAYANAK: Record<DayanakKey, { label: string; bg: string; border: string; text: string }> = {
  sahih: { label: "SAHİH", bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  tartismali: { label: "TARTIŞMALI", bg: "#fffbeb", border: "#fcd34d", text: "#b45309" },
  zayif: { label: "ZAYIF", bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  kulturel: { label: "KÜLTÜREL", bg: "#f0f9ff", border: "#7dd3fc", text: "#0369a1" },
  uydurma: { label: "UYDURMA", bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
};

const IBADET_DURUM: Record<IbadetDurumKey, { bg: string; text: string; label: string }> = {
  farz: { bg: "#fef2f2", text: "#b91c1c", label: "FARZ" },
  vacip: { bg: "#fff7ed", text: "#c2410c", label: "VACİP" },
  sunnet: { bg: "#f0fdf4", text: "#15803d", label: "SÜNNET" },
  mustehap: { bg: "#eff6ff", text: "#1d4ed8", label: "MÜSTEHAP" },
  tavsiye: { bg: "#f5f3ff", text: "#6d28d9", label: "TAVSİYE" },
};

const TIP_EMOJI: Record<GunTip, string> = {
  haftalik: "📅",
  yillik: "🌙",
  ramazan: "🌟",
};

function DayanakBadge({ dayanak }: { dayanak: DayanakKey }) {
  const badge = DAYANAK[dayanak];
  return (
    <View style={[st.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
      <Text style={[st.badgeText, { color: badge.text }]}>{badge.label}</Text>
    </View>
  );
}

function IbadetCard({ ib }: { ib: Ibadet }) {
  const c = useColors();
  const badge = ib.durum ? IBADET_DURUM[ib.durum] : undefined;

  return (
    <View style={[st.ibadetCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <View style={st.ibadetHeader}>
        <Text style={[st.ibadetIsim, { color: c.text }]}>{ib.isim}</Text>
        {badge ? (
          <View style={[st.badge, { backgroundColor: badge.bg }]}>
            <Text style={[st.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        ) : null}
      </View>
      {ib.aciklama ? <Text style={[st.p, { color: c.textSecondary }]}>{ib.aciklama}</Text> : null}
      {ib.hadis_kaynagi ? <Text style={[st.kaynak, { color: c.textMuted }]}>📚 {ib.hadis_kaynagi}</Text> : null}
    </View>
  );
}

function GunCard({ gun }: { gun: Gun }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const badge = DAYANAK[gun.dayanak];
  const gunIsmi = gun.isim || "İsimsiz kayıt";
  const ibadetler = gun.ibadetler ?? [];
  const kuranRef = gun.kuran_referansi;

  async function handleShare() {
    void Haptics.selectionAsync();
    const parts = [`🌙 ${gunIsmi}`];
    if (gun.onem) parts.push(gun.onem);
    parts.push("Kuran Yolu uygulamasından");

    try {
      await Share.share({ message: parts.join("\n\n") });
    } catch {
      // noop
    }
  }

  return (
    <View
      style={[
        st.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderLeftColor: badge?.border ?? c.border,
        },
      ]}
    >
      <View style={st.cardHeader}>
        <TouchableOpacity
          onPress={() => setOpen(current => !current)}
          activeOpacity={0.75}
          style={{ flex: 1, gap: 4 }}
          accessibilityRole="button"
          accessibilityLabel={gunIsmi}
          accessibilityHint={`Gün detayını ${open ? "kapatır" : "açar"}`}
          accessibilityState={{ expanded: open }}
        >
          <View style={st.row}>
            <Text style={[st.isim, { color: c.text }]}>{gunIsmi}</Text>
          </View>
          <View style={st.row}>
            <DayanakBadge dayanak={gun.dayanak} />
            {gun.tip ? (
              <Text style={[st.tipText, { color: c.textMuted }]}>{TIP_EMOJI[gun.tip]} {gun.tip}</Text>
            ) : null}
            {gun.hicri_tarih ? <Text style={[st.hicri, { color: c.textMuted }]}>{gun.hicri_tarih}</Text> : null}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${gunIsmi} bilgisini paylaş`}
            accessibilityHint="Paylaşım menüsünü açar"
          >
            <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOpen(current => !current)}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${gunIsmi} detayını ${open ? "kapat" : "aç"}`}
            accessibilityState={{ expanded: open }}
          >
            <Text style={[st.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {open ? (
        <View style={[st.body, { borderTopColor: c.border }]}>
          {gun.onem ? <Text style={[st.onem, { color: c.textSecondary }]}>{gun.onem}</Text> : null}

          {gun.dayanak_aciklama ? (
            <View style={[st.dayanakBox, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[st.dayanakLabel, { color: badge.text }]}>⚖️ Dayanak</Text>
              <Text style={[st.p, { color: c.textSecondary }]}>{gun.dayanak_aciklama}</Text>
            </View>
          ) : null}

          {kuranRef && (kuranRef.metin || kuranRef.not || (kuranRef.sure && kuranRef.ayet)) ? (
            <View style={[st.kuranBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              {kuranRef.sure && kuranRef.ayet ? (
                <Text style={[st.kuranRef, { color: c.accent }]}>
                  📖 {kuranRef.sure} {String(kuranRef.ayet)}
                </Text>
              ) : null}
              {kuranRef.metin ? <Text style={[st.p, { color: c.text }]}>{`"${kuranRef.metin}"`}</Text> : null}
              {kuranRef.not ? <Text style={[st.small, { color: c.textMuted }]}>{kuranRef.not}</Text> : null}
            </View>
          ) : null}

          {gun.tarihsel_bilgi ? <Text style={[st.p, { color: c.textSecondary }]}>{gun.tarihsel_bilgi}</Text> : null}

          {ibadetler.length > 0 ? (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>🤲 İbadetler</Text>
              {ibadetler.map((ibadet, index) => <IbadetCard key={index} ib={ibadet} />)}
            </View>
          ) : null}

          {gun.ozel_not ? (
            <View style={st.notBox}>
              <Text style={st.notText}>ℹ️ {gun.ozel_not}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function MubarekGunlerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const baslik = ROOT.baslik ?? "Mübarek Gün ve Geceler";
  const aciklama = ROOT.aciklama ?? "";
  const genelNot = ROOT.genel_not ?? "";
  const kaynakNot = ROOT.kaynak_not ?? "";

  return (
    <>
      <Stack.Screen options={{ title: "Mübarek Gün ve Geceler" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.heroIcon}>🌙</Text>
          <Text style={s.heroTitle}>{baslik}</Text>
          {aciklama ? <Text style={s.heroDesc}>{aciklama}</Text> : null}
        </View>

        {OZET_TABLO.length > 0 ? (
          <View style={[s.ozetBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.ozetTitle, { color: c.text }]}>Hızlı Bakış</Text>
            {OZET_TABLO.map((row, index) => {
              const badge = DAYANAK[row.dayanak];
              return (
                <View key={`${row.isim}-${index}`} style={[s.ozetRow, { borderBottomColor: c.border }]}>
                  <Text style={[s.ozetIsim, { color: c.text }]}>{row.isim}</Text>
                  <Text style={[s.ozetHicri, { color: c.textMuted }]}>{row.hicri}</Text>
                  <View style={[s.ozetBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[s.ozetBadgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {DAYANAK_SEVIYELERI.length > 0 ? (
          <View style={[s.dayanakLegend, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.ozetTitle, { color: c.text }]}>Dayanak Seviyeleri</Text>
            {DAYANAK_SEVIYELERI.map(seviye => {
              const badge = DAYANAK[seviye.kod];
              return (
                <View key={seviye.kod} style={s.legendRow}>
                  <View style={[s.ozetBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[s.ozetBadgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                  <Text style={[s.legendText, { color: c.textSecondary }]}>{seviye.aciklama}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>Gün ve Geceler ({GUNLER.length})</Text>

        {GUNLER.length > 0 ? (
          GUNLER.map(gun => <GunCard key={gun.id} gun={gun} />)
        ) : (
          <Text style={[s.emptyText, { color: c.textMuted }]}>Bu bölüm için gösterilecek kayıt bulunamadı.</Text>
        )}

        {genelNot ? (
          <View style={st.notBox}>
            <Text style={st.notText}>ℹ️ {genelNot}</Text>
          </View>
        ) : null}

        {kaynakNot ? <Text style={[s.kaynak, { color: c.textMuted }]}>{kaynakNot}</Text> : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  hero: { borderRadius: 16, padding: 18, marginBottom: 12, alignItems: "center", backgroundColor: "#0f172a", gap: 6 },
  heroIcon: { fontSize: 36, marginBottom: 2 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#e2e8f0", textAlign: "center" },
  heroDesc: { fontSize: 12, color: "#64748b", lineHeight: 18, textAlign: "center" },

  ozetBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  ozetTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  ozetRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1 },
  ozetIsim: { flex: 1, fontSize: 12.5, fontWeight: "600" },
  ozetHicri: { fontSize: 10.5, flexShrink: 1 },
  ozetBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  ozetBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  dayanakLegend: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendText: { flex: 1, fontSize: 11.5, lineHeight: 17 },

  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  emptyText: { fontSize: 12, lineHeight: 18, marginBottom: 12, textAlign: "center" },
  kaynak: { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const st = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, marginBottom: 8, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  body: { borderTopWidth: 1, padding: 14, gap: 12 },

  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  isim: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  chev: { fontSize: 11, marginTop: 3 },

  tipText: { fontSize: 10.5 },
  hicri: { fontSize: 10.5 },

  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  onem: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },

  dayanakBox: { borderRadius: 10, borderWidth: 1, padding: 11, gap: 4 },
  dayanakLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  kuranBox: { borderRadius: 10, borderWidth: 1, padding: 11, gap: 5 },
  kuranRef: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  ibadetCard: { borderRadius: 10, borderWidth: 1, padding: 11, marginBottom: 4, gap: 4 },
  ibadetHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ibadetIsim: { fontSize: 13, fontWeight: "700", flex: 1 },

  p: { fontSize: 12.5, lineHeight: 20 },
  small: { fontSize: 11.5, lineHeight: 17 },
  kaynak: { fontSize: 10.5, fontStyle: "italic" },

  notBox: { backgroundColor: "#fff7ed", borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#fdba74" },
  notText: { fontSize: 11.5, color: "#9a3412", lineHeight: 17 },
});
