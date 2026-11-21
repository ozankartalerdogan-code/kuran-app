import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import rawData from "../src/data/mubarek_gunler.json";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { getEvidenceLabel } from "../src/lib/sourceLabels";
import { useLang, useStrings, fmt, type Lang, caps } from "../src/i18n";
import { localizedData } from "../src/i18n/localizedData";
import mubarekStrings from "../src/i18n/strings/mubarekGunler";
import { Badge, Callout, radius, space, toneColors, type IoniconName, type Tone } from "../src/components/ui";

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

type MubarekFile = { mubarek_gunler?: MubarekGunlerRoot };

const pickData = localizedData<MubarekFile>(
  rawData as MubarekFile,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/mubarek_gunler.en.json"),
);

interface PreparedData {
  ROOT: MubarekGunlerRoot;
  GUNLER: Gun[];
  OZET_TABLO: OzetRow[];
  DAYANAK_SEVIYELERI: DayanakSeviye[];
}

const DATA_CACHE: Partial<Record<Lang, PreparedData>> = {};

function buildData(lang: Lang): PreparedData {
  const cached = DATA_CACHE[lang];
  if (cached) return cached;
  const ROOT = pickData(lang).mubarek_gunler ?? {};
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
  const result = { ROOT, GUNLER, OZET_TABLO, DAYANAK_SEVIYELERI };
  DATA_CACHE[lang] = result;
  return result;
}

function getDayanakColors(c: AppColors): Record<DayanakKey, { bg: string; border: string; text: string }> {
  return {
    sahih:      { bg: c.greenBg,  border: c.greenBorder,  text: c.greenText },
    tartismali: { bg: c.amberBg,  border: c.amberBorder,  text: c.amberText },
    zayif:      { bg: c.orangeBg, border: c.orangeBorder, text: c.orangeText },
    kulturel:   { bg: c.skyBg,    border: c.skyBorder,    text: c.skyText },
    uydurma:    { bg: c.errorBg,  border: c.errorBorder,  text: c.errorText },
  };
}

const DAYANAK_BADGE_TONE: Record<DayanakKey, Tone | "error"> = {
  sahih:      "emerald",
  tartismali: "amber",
  zayif:      "amber",
  kulturel:   "sky",
  uydurma:    "error",
};

const IBADET_DURUM_TONE: Record<IbadetDurumKey, Tone | "error"> = {
  farz:     "error",
  vacip:    "amber",
  sunnet:   "emerald",
  mustehap: "sky",
  tavsiye:  "violet",
};

const DAYANAK_LABEL_KEY = {
  sahih: "dsSahih", tartismali: "dsTartismali", zayif: "dsZayif", kulturel: "dsKulturel", uydurma: "dsUydurma",
} as const;
const DURUM_LABEL_KEY = {
  farz: "stFarz", vacip: "stVacip", sunnet: "stSunnet", mustehap: "stMustehap", tavsiye: "stTavsiye",
} as const;
const TIP_LABEL_KEY = { haftalik: "tipHaftalik", yillik: "tipYillik", ramazan: "tipRamazan" } as const;

const TIP_VISUAL: Record<GunTip, { icon: IoniconName; tone: Tone }> = {
  haftalik: { icon: "calendar-outline", tone: "sky" },
  yillik:   { icon: "moon-outline",     tone: "violet" },
  ramazan:  { icon: "star-outline",     tone: "amber" },
};

function DayanakBadge({ dayanak }: { dayanak: DayanakKey }) {
  const t = useStrings(mubarekStrings);
  return <Badge label={t[DAYANAK_LABEL_KEY[dayanak]]} tone={DAYANAK_BADGE_TONE[dayanak]} style={{ alignSelf: "center" }} />;
}

function IbadetCard({ ib }: { ib: Ibadet }) {
  const c = useColors();
  const t = useStrings(mubarekStrings);
  const evidenceLabel = getEvidenceLabel(ib.hadis_kaynagi);

  return (
    <View style={[st.ibadetCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={st.ibadetHeader}>
        <Text style={[st.ibadetIsim, { color: c.text }]}>{ib.isim}</Text>
        {ib.durum ? (
          <Badge label={t[DURUM_LABEL_KEY[ib.durum]]} tone={IBADET_DURUM_TONE[ib.durum]} style={{ alignSelf: "center" }} />
        ) : null}
      </View>
      {ib.aciklama ? <Text style={[st.p, { color: c.textSecondary }]}>{ib.aciklama}</Text> : null}
      {ib.hadis_kaynagi ? (
        <View style={st.metaRow}>
          <Ionicons name="library-outline" size={14} color={c.textMuted} style={st.metaIcon} accessible={false} importantForAccessibility="no" />
          <Text style={[st.kaynak, { color: c.textMuted, flex: 1 }]}>{evidenceLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function GunCard({ gun }: { gun: Gun }) {
  const c = useColors();
  const t = useStrings(mubarekStrings);
  const [open, setOpen] = useState(false);
  const badge = getDayanakColors(c)[gun.dayanak];
  const gunIsmi = gun.isim || t.unnamed;
  const ibadetler = gun.ibadetler ?? [];
  const kuranRef = gun.kuran_referansi;

  async function handleShare() {
    void Haptics.selectionAsync();
    const parts = [`🌙 ${gunIsmi}`];
    if (gun.onem) parts.push(gun.onem);
    parts.push(t.shareFooter);

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
          style={{ flex: 1, gap: 4, minHeight: 44, justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel={gunIsmi}
          accessibilityHint={open ? t.dayHintClose : t.dayHintOpen}
          accessibilityState={{ expanded: open }}
        >
          <View style={st.row}>
            <Text style={[st.isim, { color: c.text }]}>{gunIsmi}</Text>
          </View>
          <View style={st.row}>
            <DayanakBadge dayanak={gun.dayanak} />
            {gun.tip ? (() => {
              const tipVis = TIP_VISUAL[gun.tip];
              return (
                <View style={st.tipRow}>
                  <Ionicons name={tipVis.icon} size={18} color={toneColors(c, tipVis.tone).fg} accessible={false} importantForAccessibility="no" />
                  <Text style={[st.tipText, { color: c.textMuted }]}>{t[TIP_LABEL_KEY[gun.tip]] ?? gun.tip}</Text>
                </View>
              );
            })() : null}
            {gun.hicri_tarih ? <Text style={[st.hicri, { color: c.textMuted }]}>{gun.hicri_tarih}</Text> : null}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={14}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.shareA11y, { name: gunIsmi })}
            accessibilityHint={t.shareHint}
          >
            <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOpen(current => !current)}
            hitSlop={14}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={fmt(open ? t.detailA11yClose : t.detailA11yOpen, { name: gunIsmi })}
            accessibilityState={{ expanded: open }}
          >
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
          </TouchableOpacity>
        </View>
      </View>

      {open ? (
        <View style={[st.body, { borderTopColor: c.border }]}>
          {gun.onem ? <Text style={[st.onem, { color: c.textSecondary }]}>{gun.onem}</Text> : null}

          {gun.dayanak_aciklama ? (
            <View style={[st.dayanakBox, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[st.dayanakLabel, { color: badge.text }]}>{caps(t.basis)}</Text>
              <Text style={[st.p, { color: c.textSecondary }]}>{gun.dayanak_aciklama}</Text>
            </View>
          ) : null}

          {kuranRef && (kuranRef.metin || kuranRef.not || (kuranRef.sure && kuranRef.ayet)) ? (
            <View style={[st.kuranBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              {kuranRef.sure && kuranRef.ayet ? (
                <View style={st.metaRow}>
                  <Ionicons name="book-outline" size={14} color={c.textMuted} style={st.metaIcon} accessible={false} importantForAccessibility="no" />
                  <Text style={[st.kuranRef, { color: c.accent, flex: 1 }]}>
                    {caps(kuranRef.sure)} {caps(String(kuranRef.ayet))}
                  </Text>
                </View>
              ) : null}
              {kuranRef.metin ? <Text style={[st.p, { color: c.text }]}>{`"${kuranRef.metin}"`}</Text> : null}
              {kuranRef.not ? <Text style={[st.small, { color: c.textMuted }]}>{kuranRef.not}</Text> : null}
            </View>
          ) : null}

          {gun.tarihsel_bilgi ? <Text style={[st.p, { color: c.textSecondary }]}>{gun.tarihsel_bilgi}</Text> : null}

          {ibadetler.length > 0 ? (
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: c.accent }]}>{caps(t.worships)}</Text>
              {ibadetler.map((ibadet, index) => <IbadetCard key={index} ib={ibadet} />)}
            </View>
          ) : null}

          {gun.ozel_not ? <Callout tone="info">{gun.ozel_not}</Callout> : null}
        </View>
      ) : null}
    </View>
  );
}

export default function MubarekGunlerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useStrings(mubarekStrings);
  const lang = useLang();
  const { ROOT, GUNLER, OZET_TABLO, DAYANAK_SEVIYELERI } = buildData(lang);
  const baslik = ROOT.baslik ?? t.title;
  const aciklama = ROOT.aciklama ?? "";
  const genelNot = ROOT.genel_not ?? "";
  const kaynakNot = ROOT.kaynak_not ?? "";
  const heroTone = toneColors(c, "violet");

  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.hero, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[s.heroIconWrap, { backgroundColor: heroTone.bg }]}>
            <Ionicons name="moon-outline" size={28} color={heroTone.fg} accessible={false} importantForAccessibility="no" />
          </View>
          <Text style={[s.heroTitle, { color: c.text }]}>{baslik}</Text>
          {aciklama ? <Text style={[s.heroDesc, { color: c.textSecondary }]}>{aciklama}</Text> : null}
        </View>

        {OZET_TABLO.length > 0 ? (
          <View style={[s.ozetBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.ozetTitle, { color: c.text }]}>{t.quickLook}</Text>
            {OZET_TABLO.map((row, index) => (
              <View key={`${row.isim}-${index}`} style={[s.ozetRow, { borderBottomColor: c.border }]}>
                <Text style={[s.ozetIsim, { color: c.text }]}>{row.isim}</Text>
                <Text style={[s.ozetHicri, { color: c.textMuted }]}>{row.hicri}</Text>
                <DayanakBadge dayanak={row.dayanak} />
              </View>
            ))}
          </View>
        ) : null}

        {DAYANAK_SEVIYELERI.length > 0 ? (
          <View style={[s.dayanakLegend, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.ozetTitle, { color: c.text }]}>{t.basisLevels}</Text>
            {DAYANAK_SEVIYELERI.map(seviye => (
              <View key={seviye.kod} style={s.legendRow}>
                <DayanakBadge dayanak={seviye.kod} />
                <Text style={[s.legendText, { color: c.textSecondary }]}>{seviye.aciklama}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[s.sectionHead, { color: c.textMuted }]}>{caps(fmt(t.daysAndNights, { n: GUNLER.length }))}</Text>

        {GUNLER.length > 0 ? (
          GUNLER.map(gun => <GunCard key={gun.id} gun={gun} />)
        ) : (
          <Text style={[s.emptyText, { color: c.textMuted }]}>{t.empty}</Text>
        )}

        {genelNot ? <Callout tone="info" style={{ marginTop: space.xs }}>{genelNot}</Callout> : null}

        {kaynakNot ? <Text style={[s.kaynak, { color: c.textMuted }]}>{kaynakNot}</Text> : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  hero: { borderRadius: radius.lg, borderWidth: 1, padding: 18, marginBottom: space.sm, alignItems: "center", gap: 6 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  heroDesc: { fontSize: 12, lineHeight: 18, textAlign: "center" },

  ozetBox: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 10 },
  ozetTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  ozetRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1 },
  ozetIsim: { flex: 1, fontSize: 12.5, fontWeight: "600" },
  ozetHicri: { fontSize: 10.5, flexShrink: 1 },

  dayanakLegend: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendText: { flex: 1, fontSize: 11.5, lineHeight: 17 },

  sectionHead: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  emptyText: { fontSize: 12, lineHeight: 18, marginBottom: 12, textAlign: "center" },
  kaynak: { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 18, lineHeight: 16 },
});

const st = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderLeftWidth: 4, marginBottom: 8, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  body: { borderTopWidth: 1, padding: 14, gap: 12 },

  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  isim: { fontSize: 14, fontWeight: "700", flexShrink: 1 },

  tipRow: { flexDirection: "row", alignItems: "center", gap: space.xxs },
  tipText: { fontSize: 10.5 },
  hicri: { fontSize: 10.5 },

  onem: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },

  dayanakBox: { borderRadius: radius.md, borderWidth: 1, padding: 11, gap: 4 },
  dayanakLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  kuranBox: { borderRadius: radius.md, borderWidth: 1, padding: 11, gap: 5 },
  kuranRef: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  ibadetCard: { borderRadius: radius.lg, borderWidth: 1, padding: 11, marginBottom: 4, gap: 4 },
  ibadetHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ibadetIsim: { fontSize: 13, fontWeight: "700", flex: 1 },

  metaRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  metaIcon: { marginTop: 2 },
  p: { fontSize: 12.5, lineHeight: 20 },
  small: { fontSize: 11.5, lineHeight: 17 },
  kaynak: { fontSize: 10.5, fontStyle: "italic" },
});
