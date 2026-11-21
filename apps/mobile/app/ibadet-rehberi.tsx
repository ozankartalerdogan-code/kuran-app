import React, { useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useStrings, fmt } from "../src/i18n";
import ibadetStrings from "../src/i18n/strings/ibadetRehberi";
import { useColors } from "../src/hooks/useColors";
import { localizedData, useLocalizedData } from "../src/i18n/localizedData";
import ibadetTr from "../src/data/content/ibadet_rehberi.json";
import {
  Badge, Button, Callout, SectionHeader, Tabs,
  radius, space, toneColors,
  type IoniconName, type TabItem, type Tone,
} from "../src/components/ui";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface AyetRef { sureId: number; sureAdi: string; ayetNo: number; kisaMetin: string }
type MaddeTip = "farz" | "sunnet" | "vacip" | "info";
interface Madde { tip: MaddeTip; metin: string; detay: string }
interface AbdestSatiri { organ: string; miktar: number | "—"; aciklama: string }
interface InancBolum { id: string; ikon: string; baslik: string; aciklama: string; ayetler: AyetRef[] }
interface AbdestBolum {
  id: string; ikon: string; baslik: string; altBaslik: string; aciklama: string;
  farzlar: AbdestSatiri[]; sunnetler: AbdestSatiri[]; ayetler: AyetRef[]; bozanlar: string[];
}
interface IbadetData {
  islamSartlari: InancBolum[];
  imanSartlari: InancBolum[];
  namaz: {
    aciklama1: string; aciklama2: string; rekatNot: string;
    vakitler: { vakit: string; ikon: string; ilkSunnet: number; farz: number; sonSunnet: number; vitir: number; toplam: number; not?: string }[];
    maddeler: Madde[]; ayetler: AyetRef[];
  };
  oruc: { aciklama: string; maddeler: Madde[]; ayetler: AyetRef[] };
  zekat: {
    aciklama: string;
    nisap: { ikon: string; etiket: string; deger: string; son: string }[];
    siniflar: { no: number; sinif: string; aciklama: string }[];
    ayetler: AyetRef[];
  };
  hac: {
    aciklama1: string; aciklama2: string;
    adimlar: { no: number; tip: MaddeTip; baslik: string; aciklama: string }[];
    ayetler: AyetRef[];
  };
  kurban: { aciklama: string; maddeler: Madde[]; ayetler: AyetRef[] };
  abdestBolumler: AbdestBolum[];
}

// Uzun içerik JSON'da; İngilizce karşılığı <ad>.en.json (çeviri), yoksa Türkçe.
const pickIbadet = localizedData(
  ibadetTr as unknown as IbadetData,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/content/ibadet_rehberi.en.json"),
);

// ── İKON & TON EŞLEMELERİ ─────────────────────────────────────────────────────

type BolumVisual = { icon: IoniconName; tone: Tone };

const BOLUM_VISUAL: Record<string, BolumVisual> = {
  // islamSartlari
  "sehadet":     { tone: "emerald", icon: "chatbubble-outline" },
  "namaz-inanc": { tone: "emerald", icon: "accessibility-outline" },
  "oruc-inanc":  { tone: "amber",   icon: "moon-outline" },
  "zekat-inanc": { tone: "amber",   icon: "hand-left-outline" },
  "hac-inanc":   { tone: "sky",     icon: "cube-outline" },
  // imanSartlari
  "allah":       { tone: "emerald", icon: "sparkles-outline" },
  "melek":       { tone: "sky",     icon: "cloud-outline" },
  "kitap":       { tone: "sky",     icon: "library-outline" },
  "peygamber":   { tone: "violet",  icon: "people-outline" },
  "ahiret":      { tone: "violet",  icon: "scale-outline" },
  "kader":       { tone: "amber",   icon: "infinite-outline" },
  // abdestBolumler
  "abdest":      { tone: "sky",     icon: "water-outline" },
  "gusul":       { tone: "sky",     icon: "rainy-outline" },
  "teyemmum":    { tone: "amber",   icon: "leaf-outline" },
};

const DEFAULT_BOLUM_VISUAL: BolumVisual = { tone: "neutral", icon: "ellipse-outline" };

function bolumVisual(id: string): BolumVisual {
  return BOLUM_VISUAL[id] ?? DEFAULT_BOLUM_VISUAL;
}

const TIP_BADGE: Record<MaddeTip, { tone: Tone | "error"; label: string }> = {
  farz:   { tone: "error",   label: "tipFarz" },
  sunnet: { tone: "emerald", label: "tipSunnet" },
  vacip:  { tone: "amber",   label: "tipVacip" },
  info:   { tone: "sky",     label: "tipInfo" },
};

// ── YARDIMCI BİLEŞENLER ───────────────────────────────────────────────────────

function AyetListesi({ ayetler }: { ayetler: AyetRef[] }) {
  const c = useColors();
  const ib = useStrings(ibadetStrings);
  if (!ayetler.length) return null;
  return (
    <View style={[s.ayetBox, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}>
      <View style={s.ayetHeaderRow}>
        <Ionicons name="book-outline" size={14} color={c.greenText} accessible={false} importantForAccessibility="no" />
        <Text style={[s.ayetBoxTitle, { color: c.greenText }]}>{ib.relatedVerses}</Text>
      </View>
      {ayetler.map((a, i) => (
        <TouchableOpacity key={i} style={s.ayetRow}
          onPress={() => router.push(`/ayah/${a.sureId}/${a.ayetNo}` as Href)} activeOpacity={0.75}
          accessibilityRole="button" accessibilityLabel={fmt(ib.openVerseA11y, { name: a.sureAdi, n: a.ayetNo })}>
          <View style={[s.keyBadge, { backgroundColor: c.accentLight }]}>
            <Text style={[s.keyText, { color: c.accent }]}>{a.sureId}:{a.ayetNo}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.ayetSure, { color: c.textMuted }]}>{fmt(ib.verseLine, { name: a.sureAdi, n: a.ayetNo })}</Text>
            <Text style={[s.ayetMetin, { color: c.text }]} numberOfLines={2}>{a.kisaMetin}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginTop: 2 }} accessible={false} importantForAccessibility="no" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MaddeListe({ maddeler }: { maddeler: Madde[] }) {
  const c = useColors();
  const ib = useStrings(ibadetStrings) as Record<string, string>;
  return (
    <View style={s.maddeBox}>
      {maddeler.map((m, i) => {
        const meta = TIP_BADGE[m.tip];
        return (
          <View key={i} style={[s.maddeRow, { borderBottomColor: c.border }]}>
            <Badge label={ib[meta.label]} tone={meta.tone} />
            <View style={{ flex: 1 }}>
              <Text style={[s.maddeBaslik, { color: c.text }]}>{m.metin}</Text>
              {m.detay ? <Text style={[s.maddeDetay, { color: c.textMuted }]}>{m.detay}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AbdestTablo({ satirlar, baslik }: { satirlar: AbdestSatiri[]; baslik: string }) {
  const c = useColors();
  return (
    <View style={[s.tablo, { borderColor: c.border }]}>
      <Text style={[s.tabloBaslik, { color: c.greenText, backgroundColor: c.greenBg }]}>{baslik}</Text>
      {satirlar.map((r, i) => (
        <View key={i} style={[s.tabloRow, i % 2 === 0 && { backgroundColor: c.cardAlt }]}>
          <Text style={[s.tabloOrgan, { color: c.text }]}>{r.organ}</Text>
          <Text style={[s.tabloMiktar, { color: c.accent }]}>{r.miktar === "—" ? "—" : `${r.miktar}×`}</Text>
          <Text style={[s.tabloAciklama, { color: c.textSecondary }]} numberOfLines={2}>{r.aciklama}</Text>
        </View>
      ))}
    </View>
  );
}

// ── ANA KARTI ─────────────────────────────────────────────────────────────────

const BolumCard = React.memo(function BolumCard({
  icon, tone, baslik, children,
}: { icon: IoniconName; tone: Tone; baslik: string; children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = React.useState(false);
  const tColors = toneColors(c, tone);
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable style={s.cardHeader} onPress={() => setOpen(p => !p)}
        accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={baslik}>
        <View style={[s.cardIkonWrap, { backgroundColor: tColors.bg }]}>
          <Ionicons name={icon} size={22} color={tColors.fg} accessible={false} importantForAccessibility="no" />
        </View>
        <Text style={[s.cardBaslik, { color: c.text }]}>{baslik}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
      </Pressable>
      {open && <View style={[s.cardBody, { borderTopColor: c.border }]}>{children}</View>}
    </View>
  );
});

// ── SEKME BİLEŞENLERİ ─────────────────────────────────────────────────────────

function InancSekme() {
  const c = useColors();
  const ib = useStrings(ibadetStrings);
  const D = useLocalizedData(pickIbadet);
  return (
    <>
      <SectionHeader title={ib.pillars5} first />
      {D.islamSartlari.map(b => {
        const v = bolumVisual(b.id);
        return (
          <BolumCard key={b.id} icon={v.icon} tone={v.tone} baslik={b.baslik}>
            <Text style={[s.aciklama, { color: c.textSecondary }]}>{b.aciklama}</Text>
            <AyetListesi ayetler={b.ayetler} />
          </BolumCard>
        );
      })}
      <SectionHeader title={ib.pillars6} />
      {D.imanSartlari.map(b => {
        const v = bolumVisual(b.id);
        return (
          <BolumCard key={b.id} icon={v.icon} tone={v.tone} baslik={b.baslik}>
            <Text style={[s.aciklama, { color: c.textSecondary }]}>{b.aciklama}</Text>
            <AyetListesi ayetler={b.ayetler} />
          </BolumCard>
        );
      })}
    </>
  );
}

function IbadetlerSekme() {
  const c = useColors();
  const ib = useStrings(ibadetStrings) as Record<string, string>;
  const D = useLocalizedData(pickIbadet);
  return (
    <>
      {/* NAMAZ */}
      <BolumCard icon="accessibility-outline" tone="emerald" baslik={ib.prayer}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.namaz.aciklama1}</Text>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.namaz.aciklama2}</Text>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.rakatCounts}</Text>
        <View style={[s.rekatTablo, { borderColor: c.border }]}>
          <View style={[s.rekatHeader, { backgroundColor: c.actionBg }]}>
            {[ib.colTime, ib.colFirstSunnah, ib.colFard, ib.colLastSunnah, ib.colWitr, ib.colTotal].map(h => (
              <Text key={h} style={[s.rekatHeaderCell, { color: c.actionText }]}>{h}</Text>
            ))}
          </View>
          {D.namaz.vakitler.map((v, i) => (
            <View key={i} style={[s.rekatRow, i % 2 === 0 && { backgroundColor: c.cardAlt }]}>
              <Text style={[s.rekatCell, { color: c.text }]}>{v.vakit}</Text>
              <Text style={[s.rekatCell, { color: c.text }]}>{v.ilkSunnet || "—"}</Text>
              <Text style={[s.rekatCell, s.rekatFarz, { color: c.accent }]}>{v.farz}</Text>
              <Text style={[s.rekatCell, { color: c.text }]}>{v.sonSunnet || "—"}</Text>
              <Text style={[s.rekatCell, { color: c.text }]}>{v.vitir || "—"}</Text>
              <Text style={[s.rekatCell, s.rekatToplam, { color: c.text }]}>{v.toplam}{v.not ? `*` : ""}</Text>
            </View>
          ))}
          <Text style={[s.rekatNot, { color: c.textMuted }]}>* {D.namaz.rekatNot}</Text>
        </View>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.basicsAndSunnahs}</Text>
        <MaddeListe maddeler={D.namaz.maddeler} />
        <AyetListesi ayetler={D.namaz.ayetler} />
        <View style={s.guideFooter}>
          <Text style={[s.maddeDetay, { color: c.textMuted }]}>{ib.prayerSummaryNote}</Text>
          <Button
            variant="secondary"
            fullWidth
            label={ib.prayerGuideLink}
            onPress={() => router.push("/namaz-rehberi" as Href)}
            accessibilityLabel={ib.prayerGuideLink}
          />
        </View>
      </BolumCard>

      {/* ORUÇ */}
      <BolumCard icon="moon-outline" tone="amber" baslik={ib.fasting}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.oruc.aciklama}</Text>
        <MaddeListe maddeler={D.oruc.maddeler} />
        <AyetListesi ayetler={D.oruc.ayetler} />
      </BolumCard>

      {/* ZEKÂT */}
      <BolumCard icon="hand-left-outline" tone="amber" baslik={ib.zakat}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.zekat.aciklama}</Text>
        <Callout tone="warning" icon="scale-outline" title={ib.nisabAmount}>
          <View style={{ gap: space.xxs }}>
            {D.zekat.nisap.map((n, i) => (
              <Text key={i} style={[s.nisapRow, { color: c.textSecondary }]}>
                {n.etiket}: <Text style={[s.nisapDeger, { color: c.goldText }]}>{n.deger}</Text> {n.son}
              </Text>
            ))}
          </View>
        </Callout>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.zakatClasses}</Text>
        {D.zekat.siniflar.map(z => (
          <View key={z.no} style={[s.zekatRow, { borderBottomColor: c.border }]}>
            <View style={[s.zekatNo, { backgroundColor: c.actionBg }]}>
              <Text style={[s.zekatNoText, { color: c.actionText }]}>{z.no}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.zekatSinif, { color: c.text }]}>{z.sinif}</Text>
              <Text style={[s.zekatAciklama, { color: c.textMuted }]}>{z.aciklama}</Text>
            </View>
          </View>
        ))}
        <AyetListesi ayetler={D.zekat.ayetler} />
      </BolumCard>

      {/* HAC */}
      <BolumCard icon="cube-outline" tone="sky" baslik={ib.hajj}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.hac.aciklama1}</Text>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.hac.aciklama2}</Text>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.hajjSteps}</Text>
        {D.hac.adimlar.map(h => {
          const tipKey: MaddeTip = h.tip === "farz" ? "farz" : h.tip === "vacip" ? "vacip" : "sunnet";
          const meta = TIP_BADGE[tipKey];
          return (
            <View key={h.no} style={[s.hacRow, { borderBottomColor: c.border }]}>
              <Badge label={`${h.no}. ${ib[meta.label]}`} tone={meta.tone} style={{ minWidth: 50, alignItems: "center" }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.maddeBaslik, { color: c.text }]}>{h.baslik}</Text>
                <Text style={[s.maddeDetay, { color: c.textMuted }]}>{h.aciklama}</Text>
              </View>
            </View>
          );
        })}
        <AyetListesi ayetler={D.hac.ayetler} />
      </BolumCard>

      {/* KURBAN */}
      <BolumCard icon="paw-outline" tone="amber" baslik={ib.qurbani}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.kurban.aciklama}</Text>
        <MaddeListe maddeler={D.kurban.maddeler} />
        <AyetListesi ayetler={D.kurban.ayetler} />
      </BolumCard>
    </>
  );
}

function AbdestSekme() {
  const c = useColors();
  const ib = useStrings(ibadetStrings);
  const D = useLocalizedData(pickIbadet);
  return (
    <>
      {D.abdestBolumler.map(b => {
        const v = bolumVisual(b.id);
        return (
          <BolumCard key={b.id} icon={v.icon} tone={v.tone} baslik={`${b.baslik} (${b.altBaslik})`}>
            <Text style={[s.aciklama, { color: c.textSecondary }]}>{b.aciklama}</Text>
            <AbdestTablo satirlar={b.farzlar} baslik={ib.fards} />
            <AbdestTablo satirlar={b.sunnetler} baslik={ib.sunnahs} />
            {b.bozanlar && b.bozanlar.length > 0 && (
              <Callout
                tone="error"
                icon="flash-outline"
                title={b.id === "abdest" ? ib.breaksWudu : b.id === "gusul" ? ib.requiresGhusl : ib.breaksTayammum}
              >
                <View style={{ gap: 3 }}>
                  {b.bozanlar.map((bz, i) => (
                    <Text key={i} style={[s.bozanText, { color: c.errorText }]}>• {bz}</Text>
                  ))}
                </View>
              </Callout>
            )}
            <AyetListesi ayetler={b.ayetler} />
          </BolumCard>
        );
      })}
    </>
  );
}

// ── ANA EKRAN ─────────────────────────────────────────────────────────────────

type Tab = "inanc" | "ibadetler" | "abdest";

export default function IbadetRehberiScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const ib = useStrings(ibadetStrings) as Record<string, string>;
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = React.useState<Tab>(
    tabParam === "ibadetler" || tabParam === "abdest" ? tabParam : "inanc"
  );

  const tabItems = useMemo<TabItem<Tab>[]>(() => [
    { key: "inanc",     label: ib.tabFaith,   icon: "sparkles-outline" },
    { key: "ibadetler", label: ib.tabWorship, icon: "accessibility-outline" },
    { key: "abdest",    label: ib.tabWudu,    icon: "water-outline" },
  ], [ib.tabFaith, ib.tabWorship, ib.tabWudu]);

  return (
    <>
      <Stack.Screen options={{ title: ib.screenTitle }} />
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <View style={s.tabsWrap}>
          <Tabs items={tabItems} value={tab} onChange={setTab} variant="segmented" />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {tab === "inanc"     && <InancSekme />}
          {tab === "ibadetler" && <IbadetlerSekme />}
          {tab === "abdest"    && <AbdestSekme />}
        </ScrollView>
      </View>
    </>
  );
}

// ── STİLLER ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:     { flex: 1 },
  tabsWrap:      { paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.xs, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  scrollContent: { paddingHorizontal: space.gutter, paddingTop: space.xs, gap: space.xs, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  card:         { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  cardHeader:   { flexDirection: "row", alignItems: "center", padding: 14, gap: space.sm },
  cardIkonWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardBaslik:   { flex: 1, fontSize: 15, fontWeight: "700" },
  cardBody:     { borderTopWidth: 1, padding: 14, gap: 10 },

  aciklama:  { fontSize: 13, lineHeight: 20 },
  altBaslik: { fontSize: 12, fontWeight: "700", marginTop: space.xxs },

  ayetBox:       { borderRadius: radius.md, borderWidth: 1, padding: 10, gap: 6 },
  ayetHeaderRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: 2 },
  ayetBoxTitle:  { fontSize: 12, fontWeight: "700" },
  ayetRow:       { flexDirection: "row", alignItems: "flex-start", gap: space.xs, paddingVertical: space.xxs },
  keyBadge:      { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 },
  keyText:       { fontSize: 10, fontWeight: "700" },
  ayetSure:      { fontSize: 10 },
  ayetMetin:     { fontSize: 12, lineHeight: 17 },

  maddeBox:    { gap: 6 },
  maddeRow:    { flexDirection: "row", alignItems: "flex-start", gap: space.xs, paddingVertical: space.xxs, borderBottomWidth: 1 },
  maddeBaslik: { fontSize: 12, fontWeight: "600" },
  maddeDetay:  { fontSize: 11, lineHeight: 16, marginTop: 1 },

  rekatTablo:      { borderRadius: radius.sm, overflow: "hidden", borderWidth: 1 },
  rekatHeader:     { flexDirection: "row", padding: 6 },
  rekatHeaderCell: { flex: 1, fontSize: 9, fontWeight: "700", textAlign: "center" },
  rekatRow:        { flexDirection: "row", padding: 6 },
  rekatCell:       { flex: 1, fontSize: 11, textAlign: "center" },
  rekatFarz:       { fontWeight: "700" },
  rekatToplam:     { fontWeight: "700" },
  rekatNot:        { fontSize: 10, padding: 6, fontStyle: "italic" },

  nisapRow:   { fontSize: 12, lineHeight: 18 },
  nisapDeger: { fontWeight: "700" },

  zekatRow:      { flexDirection: "row", alignItems: "flex-start", gap: space.xs, paddingVertical: space.xxs, borderBottomWidth: 1 },
  zekatNo:       { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  zekatNoText:   { fontSize: 10, fontWeight: "700" },
  zekatSinif:    { fontSize: 12, fontWeight: "600" },
  zekatAciklama: { fontSize: 11, lineHeight: 16 },

  hacRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xs, paddingVertical: 5, borderBottomWidth: 1 },

  tablo:         { borderRadius: radius.sm, overflow: "hidden", borderWidth: 1, marginVertical: space.xxs },
  tabloBaslik:   { fontSize: 12, fontWeight: "700", padding: space.xs },
  tabloRow:      { flexDirection: "row", paddingHorizontal: space.xs, paddingVertical: 5 },
  tabloOrgan:    { width: 110, fontSize: 11, fontWeight: "600" },
  tabloMiktar:   { width: 28, fontSize: 11, fontWeight: "700", textAlign: "center" },
  tabloAciklama: { flex: 1, fontSize: 11, lineHeight: 16 },

  bozanText: { fontSize: 12, lineHeight: 18 },

  guideFooter: { gap: 6, marginTop: 2 },
});
