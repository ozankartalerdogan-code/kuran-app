import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Pressable,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useStrings, fmt } from "../src/i18n";
import ibadetStrings from "../src/i18n/strings/ibadetRehberi";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { localizedData, useLocalizedData } from "../src/i18n/localizedData";
import ibadetTr from "../src/data/content/ibadet_rehberi.json";

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


// ── YARDIMCI BİLEŞENLER ───────────────────────────────────────────────────────

const TIP_RENK: Record<MaddeTip, { bg: string; text: string; label: string }> = {
  farz:   { bg:"#fee2e2", text:"#991b1b", label:"tipFarz"   },
  sunnet: { bg:"#d1fae5", text:"#065f46", label:"tipSunnet" },
  vacip:  { bg:"#fef3c7", text:"#92400e", label:"tipVacip"  },
  info:   { bg:"#dbeafe", text:"#1e40af", label:"tipInfo"  },
};

const TIP_RENK_DARK: Record<MaddeTip, { bg: string; text: string }> = {
  farz:   { bg:"#450a0a", text:"#fca5a5" },
  sunnet: { bg:"#064e3b", text:"#6ee7b7" },
  vacip:  { bg:"#451a03", text:"#fcd34d" },
  info:   { bg:"#1e3a8a", text:"#bfdbfe" },
};

function tipRenk(tip: MaddeTip, isDark: boolean) {
  return isDark ? { ...TIP_RENK[tip], ...TIP_RENK_DARK[tip] } : TIP_RENK[tip];
}

// Sabit pastel kutuların (ayet/nisap/bozan) karanlık karşılıkları
const ayetBoxBg   = (c: AppColors) => (c.isDark ? "#052e16" : "#f0fdf4");

function AyetListesi({ ayetler }: { ayetler: AyetRef[] }) {
  const c = useColors();
  const ib = useStrings(ibadetStrings);
  if (!ayetler.length) return null;
  return (
    <View style={[s.ayetBox, { backgroundColor: ayetBoxBg(c) }]}>
      <Text style={[s.ayetBoxTitle, { color: c.accent }]}>{ib.relatedVerses}</Text>
      {ayetler.map((a, i) => (
        <TouchableOpacity key={i} style={s.ayetRow}
          onPress={() => router.push(`/ayah/${a.sureId}/${a.ayetNo}` as Href)} activeOpacity={0.75}
          accessibilityRole="button" accessibilityLabel={fmt(ib.openVerseA11y, { name: a.sureAdi, n: a.ayetNo })}>
          <View style={[s.keyBadge, { backgroundColor: c.accentLight }]}><Text style={[s.keyText, { color: c.accent }]}>{a.sureId}:{a.ayetNo}</Text></View>
          <View style={{ flex:1 }}>
            <Text style={[s.ayetSure, { color: c.textMuted }]}>{fmt(ib.verseLine, { name: a.sureAdi, n: a.ayetNo })}</Text>
            <Text style={[s.ayetMetin, { color: c.text }]} numberOfLines={2}>{a.kisaMetin}</Text>
          </View>
          <Text style={[s.chevronSm, { color: c.textMuted }]}>›</Text>
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
        const r = tipRenk(m.tip, c.isDark);
        return (
          <View key={i} style={[s.maddeRow, { borderBottomColor: c.border }]}>
            <View style={[s.maddeBadge, { backgroundColor: r.bg }]}>
              <Text style={[s.maddeBadgeText, { color: r.text }]}>{ib[r.label]}</Text>
            </View>
            <View style={{ flex:1 }}>
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
      <Text style={[s.tabloBaslik, { color: c.text, backgroundColor: ayetBoxBg(c) }]}>{baslik}</Text>
      {satirlar.map((r, i) => (
        <View key={i} style={[s.tabloRow, i % 2 === 0 && { backgroundColor: c.isDark ? c.cardAlt : "#f9fafb" }]}>
          <Text style={[s.tabloOrgan, { color: c.text }]}>{r.organ}</Text>
          <Text style={[s.tabloMiktar, { color: c.accent }]}>{r.miktar === "—" ? "—" : `${r.miktar}×`}</Text>
          <Text style={[s.tabloAciklama, { color: c.textSecondary }]} numberOfLines={2}>{r.aciklama}</Text>
        </View>
      ))}
    </View>
  );
}

// ── ANA KARTI ─────────────────────────────────────────────────────────────────

const BolumCard = React.memo(function BolumCard({ ikon, baslik, children }: { ikon: string; baslik: string; children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = React.useState(false);
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable style={s.cardHeader} onPress={() => setOpen(p => !p)}
        accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={baslik}>
        <Text style={s.cardIkon}>{ikon}</Text>
        <Text style={[s.cardBaslik, { color: c.text }]}>{baslik}</Text>
        <Text style={[s.chevron, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
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
      <View style={s.dividerLabel}><Text style={[s.dividerText, { color: c.textMuted }]}>{ib.pillars5}</Text></View>
      {D.islamSartlari.map(b => (
        <BolumCard key={b.id} ikon={b.ikon} baslik={b.baslik}>
          <Text style={[s.aciklama, { color: c.textSecondary }]}>{b.aciklama}</Text>
          <AyetListesi ayetler={b.ayetler} />
        </BolumCard>
      ))}
      <View style={s.dividerLabel}><Text style={[s.dividerText, { color: c.textMuted }]}>{ib.pillars6}</Text></View>
      {D.imanSartlari.map(b => (
        <BolumCard key={b.id} ikon={b.ikon} baslik={b.baslik}>
          <Text style={[s.aciklama, { color: c.textSecondary }]}>{b.aciklama}</Text>
          <AyetListesi ayetler={b.ayetler} />
        </BolumCard>
      ))}
    </>
  );
}

function IbadetlerSekme() {
  const c = useColors();
  const ib = useStrings(ibadetStrings) as Record<string, string>;
  const D = useLocalizedData(pickIbadet);
  const nisapVurgu = c.isDark ? "#fbbf24" : "#92400e";
  return (
    <>
      {/* NAMAZ */}
      <BolumCard ikon="🕌" baslik={ib.prayer}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.namaz.aciklama1}</Text>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.namaz.aciklama2}</Text>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.rakatCounts}</Text>
        <View style={[s.rekatTablo, { borderColor: c.border }]}>
          <View style={s.rekatHeader}>
            {[ib.colTime, ib.colFirstSunnah, ib.colFard, ib.colLastSunnah, ib.colWitr, ib.colTotal].map(h => (
              <Text key={h} style={s.rekatHeaderCell}>{h}</Text>
            ))}
          </View>
          {D.namaz.vakitler.map((v, i) => (
            <View key={i} style={[s.rekatRow, i % 2 === 0 && { backgroundColor: c.isDark ? c.cardAlt : "#f9fafb" }]}>
              <Text style={[s.rekatCell, { color: c.text }]}>{v.ikon}{v.vakit}</Text>
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
      </BolumCard>

      {/* ORUÇ */}
      <BolumCard ikon="🌙" baslik={ib.fasting}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.oruc.aciklama}</Text>
        <MaddeListe maddeler={D.oruc.maddeler} />
        <AyetListesi ayetler={D.oruc.ayetler} />
      </BolumCard>

      {/* ZEKÂT */}
      <BolumCard ikon="💛" baslik={ib.zakat}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.zekat.aciklama}</Text>
        <View style={[s.nisapBox, { backgroundColor: c.isDark ? "#422006" : "#fef9c3" }]}>
          <Text style={[s.nisapTitle, { color: nisapVurgu }]}>{ib.nisabAmount}</Text>
          {D.zekat.nisap.map((n, i) => (
            <Text key={i} style={[s.nisapRow, { color: c.textSecondary }]}>{n.ikon} {n.etiket}: <Text style={[s.nisapDeger, { color: nisapVurgu }]}>{n.deger}</Text> {n.son}</Text>
          ))}
        </View>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.zakatClasses}</Text>
        {D.zekat.siniflar.map(z => (
          <View key={z.no} style={[s.zekatRow, { borderBottomColor: c.border }]}>
            <View style={[s.zekatNo, { backgroundColor: c.accent }]}><Text style={s.zekatNoText}>{z.no}</Text></View>
            <View style={{ flex:1 }}>
              <Text style={[s.zekatSinif, { color: c.text }]}>{z.sinif}</Text>
              <Text style={[s.zekatAciklama, { color: c.textMuted }]}>{z.aciklama}</Text>
            </View>
          </View>
        ))}
        <AyetListesi ayetler={D.zekat.ayetler} />
      </BolumCard>

      {/* HAC */}
      <BolumCard ikon="🕋" baslik={ib.hajj}>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.hac.aciklama1}</Text>
        <Text style={[s.aciklama, { color: c.textSecondary }]}>{D.hac.aciklama2}</Text>
        <Text style={[s.altBaslik, { color: c.text }]}>{ib.hajjSteps}</Text>
        {D.hac.adimlar.map(h => {
          const r = tipRenk(h.tip === "farz" ? "farz" : h.tip === "vacip" ? "vacip" : "sunnet", c.isDark);
          return (
            <View key={h.no} style={[s.hacRow, { borderBottomColor: c.border }]}>
              <View style={[s.maddeBadge, { backgroundColor: r.bg, minWidth: 50 }]}>
                <Text style={[s.maddeBadgeText, { color: r.text }]}>{h.no}. {ib[r.label]}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={[s.maddeBaslik, { color: c.text }]}>{h.baslik}</Text>
                <Text style={[s.maddeDetay, { color: c.textMuted }]}>{h.aciklama}</Text>
              </View>
            </View>
          );
        })}
        <AyetListesi ayetler={D.hac.ayetler} />
      </BolumCard>

      {/* KURBAN */}
      <BolumCard ikon="🐑" baslik={ib.qurbani}>
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
      {D.abdestBolumler.map(b => (
        <BolumCard key={b.id} ikon={b.ikon} baslik={`${b.baslik} (${b.altBaslik})`}>
          <Text style={[s.aciklama, { color: c.textSecondary }]}>{b.aciklama}</Text>
          <AbdestTablo satirlar={b.farzlar} baslik={ib.fards} />
          <AbdestTablo satirlar={b.sunnetler} baslik={ib.sunnahs} />
          {b.bozanlar && b.bozanlar.length > 0 && (
            <View style={[s.bozanBox, { backgroundColor: c.isDark ? "#450a0a" : "#fee2e2" }]}>
              <Text style={[s.bozanTitle, { color: c.isDark ? "#fca5a5" : "#991b1b" }]}>⚡ {b.id === "abdest" ? ib.breaksWudu : b.id === "gusul" ? ib.requiresGhusl : ib.breaksTayammum}</Text>
              {b.bozanlar.map((bz, i) => <Text key={i} style={[s.bozanText, { color: c.isDark ? "#fecaca" : "#7f1d1d" }]}>• {bz}</Text>)}
            </View>
          )}
          <AyetListesi ayetler={b.ayetler} />
        </BolumCard>
      ))}
    </>
  );
}

// ── ANA EKRAN ─────────────────────────────────────────────────────────────────

type Tab = "inanc" | "ibadetler" | "abdest";
const TABS: { id: Tab; label: string; ikon: string }[] = [
  { id:"inanc",     label:"tabFaith",   ikon:"✨" },
  { id:"ibadetler", label:"tabWorship", ikon:"🕌" },
  { id:"abdest",    label:"tabWudu",    ikon:"💧" },
];

export default function IbadetRehberiScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const ib = useStrings(ibadetStrings) as Record<string, string>;
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = React.useState<Tab>(
    tabParam === "ibadetler" || tabParam === "abdest" ? tabParam : "inanc"
  );
  return (
    <>
      <Stack.Screen options={{ title: ib.screenTitle }} />
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <View style={[s.tabBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} style={[s.tab, tab === t.id && [s.tabActive, { borderBottomColor: c.accent }]]}
              onPress={() => setTab(t.id)} activeOpacity={0.75}
              accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} accessibilityLabel={ib[t.label]}>
              <Text style={s.tabIkon}>{t.ikon}</Text>
              <Text style={[s.tabLabel, { color: tab === t.id ? c.accent : c.textMuted }]}>{ib[t.label]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:10, paddingBottom: 40 + insets.bottom, gap:8, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}
          showsVerticalScrollIndicator={false}>
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
  container: { flex:1, backgroundColor:"#f5f0e8" },
  tabBar:    { flexDirection:"row", backgroundColor:"#fffdf6", borderBottomWidth:1, borderBottomColor:"#e7dfcc" },
  tab:       { flex:1, alignItems:"center", paddingVertical:10, gap:2 },
  tabActive: { borderBottomWidth:2, borderBottomColor:"#059669" },
  tabIkon:   { fontSize:18 },
  tabLabel:  { fontSize:11, color:"#78716c", fontWeight:"600" },

  dividerLabel: { alignItems:"center", marginVertical:8 },
  dividerText:  { fontSize:11, fontWeight:"700", color:"#78716c", letterSpacing:1 },

  card:       { backgroundColor:"#fffdf6", borderRadius:14, borderWidth:1, borderColor:"#e7dfcc", overflow:"hidden" },
  cardHeader: { flexDirection:"row", alignItems:"center", padding:14, gap:10 },
  cardIkon:   { fontSize:22 },
  cardBaslik: { flex:1, fontSize:14, fontWeight:"700", color:"#1c1917" },
  chevron:    { fontSize:14, color:"#059669" },
  cardBody:   { borderTopWidth:1, borderTopColor:"#f5f5f4", padding:14, gap:10 },

  aciklama:  { fontSize:13, color:"#44403c", lineHeight:20 },
  altBaslik: { fontSize:12, fontWeight:"700", color:"#1c1917", marginTop:4 },

  ayetBox:      { backgroundColor:"#f0fdf4", borderRadius:10, padding:10, gap:6 },
  ayetBoxTitle: { fontSize:12, fontWeight:"700", color:"#059669", marginBottom:2 },
  ayetRow:      { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:4 },
  keyBadge:     { backgroundColor:"#d1fae5", borderRadius:6, paddingHorizontal:6, paddingVertical:2, marginTop:1 },
  keyText:      { fontSize:10, fontWeight:"700", color:"#065f46" },
  ayetSure:     { fontSize:10, color:"#78716c" },
  ayetMetin:    { fontSize:12, color:"#1c1917", lineHeight:17 },
  chevronSm:    { fontSize:16, color:"#86efac", marginTop:2 },

  maddeBox:       { gap:6 },
  maddeRow:       { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:4, borderBottomWidth:1, borderBottomColor:"#f5f5f4" },
  maddeBadge:     { borderRadius:6, paddingHorizontal:6, paddingVertical:2, marginTop:1 },
  maddeBadgeText: { fontSize:10, fontWeight:"700" },
  maddeBaslik:    { fontSize:12, fontWeight:"600", color:"#1c1917" },
  maddeDetay:     { fontSize:11, color:"#78716c", lineHeight:16, marginTop:1 },

  rekatTablo:    { borderRadius:8, overflow:"hidden", borderWidth:1, borderColor:"#e7dfcc" },
  rekatHeader:   { flexDirection:"row", backgroundColor:"#059669", padding:6 },
  rekatHeaderCell:{ flex:1, fontSize:9, fontWeight:"700", color:"#fff", textAlign:"center" },
  rekatRow:      { flexDirection:"row", padding:6 },
  rekatCell:     { flex:1, fontSize:11, color:"#1c1917", textAlign:"center" },
  rekatFarz:     { fontWeight:"700", color:"#059669" },
  rekatToplam:   { fontWeight:"700", color:"#1c1917" },
  rekatNot:      { fontSize:10, color:"#78716c", padding:6, fontStyle:"italic" },

  nisapBox:   { backgroundColor:"#fef9c3", borderRadius:8, padding:10, gap:4 },
  nisapTitle: { fontSize:12, fontWeight:"700", color:"#92400e", marginBottom:2 },
  nisapRow:   { fontSize:12, color:"#44403c", lineHeight:18 },
  nisapDeger: { fontWeight:"700", color:"#92400e" },

  zekatRow:      { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:4, borderBottomWidth:1, borderBottomColor:"#f5f5f4" },
  zekatNo:       { width:22, height:22, borderRadius:11, backgroundColor:"#059669", alignItems:"center", justifyContent:"center", marginTop:1 },
  zekatNoText:   { fontSize:10, fontWeight:"700", color:"#fff" },
  zekatSinif:    { fontSize:12, fontWeight:"600", color:"#1c1917" },
  zekatAciklama: { fontSize:11, color:"#78716c", lineHeight:16 },

  hacRow: { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:5, borderBottomWidth:1, borderBottomColor:"#f5f5f4" },

  tablo:        { borderRadius:8, overflow:"hidden", borderWidth:1, borderColor:"#e7dfcc", marginVertical:4 },
  tabloBaslik:  { fontSize:12, fontWeight:"700", color:"#1c1917", backgroundColor:"#f0fdf4", padding:8 },
  tabloRow:     { flexDirection:"row", paddingHorizontal:8, paddingVertical:5 },
  tabloOrgan:   { width:110, fontSize:11, fontWeight:"600", color:"#1c1917" },
  tabloMiktar:  { width:28, fontSize:11, color:"#059669", fontWeight:"700", textAlign:"center" },
  tabloAciklama:{ flex:1, fontSize:11, color:"#44403c", lineHeight:16 },

  bozanBox:   { backgroundColor:"#fee2e2", borderRadius:8, padding:10, gap:3 },
  bozanTitle: { fontSize:12, fontWeight:"700", color:"#991b1b", marginBottom:2 },
  bozanText:  { fontSize:12, color:"#7f1d1d", lineHeight:18 },
});

