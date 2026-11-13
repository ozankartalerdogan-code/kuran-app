import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState, memo } from "react";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, prefetchAyah, type TagFilterResult } from "../src/lib/api";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useColors } from "../src/hooks/useColors";

import { useMealOf } from "../src/lib/englishMeal";
import { useSurahNameOf } from "../src/lib/surahNames";
import { useStrings, useLang, fmt, caps } from "../src/i18n";
import { localizedVerseTranslit } from "../src/lib/verseTranslitEn";
import namazStrings from "../src/i18n/strings/namaz";
// ── Namaz Vakitleri Tablosu ───────────────────────────────────────────────────

const VAKIT_KEYS: Record<string, { surahId: number; ayahNumber: number; label: string }[]> = {
  sabah:   [
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
    { surahId: 20, ayahNumber: 130, label: "20:130" },
    { surahId: 50, ayahNumber: 39,  label: "50:39"  },
  ],
  ogle:    [
    { surahId: 30, ayahNumber: 18,  label: "30:18"  },
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
  ],
  ikindi:  [
    { surahId: 2,  ayahNumber: 238, label: "2:238"  },
    { surahId: 20, ayahNumber: 130, label: "20:130" },
    { surahId: 50, ayahNumber: 39,  label: "50:39"  },
  ],
  aksam:   [
    { surahId: 11, ayahNumber: 114, label: "11:114" },
    { surahId: 30, ayahNumber: 17,  label: "30:17"  },
  ],
  yatsi:   [
    { surahId: 24, ayahNumber: 58,  label: "24:58"  },
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
    { surahId: 11, ayahNumber: 114, label: "11:114" },
  ],
  teheccud: [
    { surahId: 17, ayahNumber: 79,  label: "17:79"    },
    { surahId: 73, ayahNumber: 2,   label: "73:2-3"   },
    { surahId: 25, ayahNumber: 64,  label: "25:64"    },
    { surahId: 51, ayahNumber: 17,  label: "51:17-18" },
  ],
};

// Üst motto ayeti — Nisâ 4:103 (Arapça + meal)
const MOTTO = {
  surahId: 4,
  ayahNumber: 103,
  label: "Nisâ 4:103",
  arabic: "فَإِذَا قَضَيْتُمُ ٱلصَّلَوٰةَ فَٱذْكُرُوا۟ ٱللَّهَ قِيَـٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِكُمْ ۚ فَإِذَا ٱطْمَأْنَنتُمْ فَأَقِيمُوا۟ ٱلصَّلَوٰةَ ۚ إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا",
  meal: "Namazı kıldıktan sonra; ayakta, otururken ve yan yatarken Allah'ı anın. Güvene kavuştuğunuzda namazı gereğince kılın. Şüphesiz namaz, müminlere belirli vakitlerde farz kılınmıştır.",
};

const VAKIT_META = [
  { id: "sabah",    ikon: "🌅", ad: "vSabah",    bg: "#f0f9ff", border: "#38bdf8", badge: "#bae6fd", badgeText: "#0c4a6e" },
  { id: "ogle",     ikon: "☀️", ad: "vOgle",     bg: "#fffbeb", border: "#fbbf24", badge: "#fde68a", badgeText: "#78350f" },
  { id: "ikindi",   ikon: "🌤️", ad: "vIkindi",   bg: "#fff7ed", border: "#fb923c", badge: "#fed7aa", badgeText: "#7c2d12" },
  { id: "aksam",    ikon: "🌆", ad: "vAksam",    bg: "#fff1f2", border: "#f87171", badge: "#fecaca", badgeText: "#7f1d1d" },
  { id: "yatsi",    ikon: "🌙", ad: "vYatsi",    bg: "#eef2ff", border: "#818cf8", badge: "#c7d2fe", badgeText: "#3730a3" },
  { id: "teheccud", ikon: "🌌", ad: "vTeheccud", bg: "#f5f3ff", border: "#a78bfa", badge: "#ddd6fe", badgeText: "#4c1d95" },
];

const SURE_ADI: Record<number, string> = {
  2:"Bakara", 4:"Nisâ", 11:"Hûd", 17:"İsrâ", 20:"Tâhâ",
  24:"Nûr", 25:"Furkân", 30:"Rûm", 40:"Mü'min", 50:"Kâf",
  51:"Zâriyât", 52:"Tûr", 73:"Müzzemmil", 76:"İnsân", 78:"Nebe",
};

function VakitTablosu() {
  const c = useColors();
  const t = useStrings(namazStrings) as Record<string, string>;
  const surahNameOf = useSurahNameOf();
  const sureAdi = (id: number) => surahNameOf(id, SURE_ADI[id] ?? fmt(t.surahFallback, { n: id }));
  const mealOf = useMealOf();
  const allVakitVerse = VAKIT_KEYS;

  return (
    <>
    {/* Üst Motto — Nisâ 4:103 ayet + meal */}
    <TouchableOpacity
      style={[vt.motto, { backgroundColor: c.isDark ? "#022c22" : "#ecfdf5", borderColor: c.isDark ? "#065f46" : "#a7f3d0" }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: "/ayah/[surahId]/[ayahNumber]", params: { surahId: MOTTO.surahId, ayahNumber: MOTTO.ayahNumber } })}
      accessibilityRole="button"
      accessibilityLabel={fmt(t.openVerseA11y, { label: `${sureAdi(MOTTO.surahId)} ${MOTTO.surahId}:${MOTTO.ayahNumber}` })}
    >
      <View style={vt.mottoHead}>
        <Text style={[vt.mottoEtiket, { color: c.accent }]}>{caps(t.mottoLabel)}</Text>
        <View style={[vt.mottoKey, { backgroundColor: c.accentLight }]}><Text style={[vt.mottoKeyText, { color: c.accent }]}>{sureAdi(MOTTO.surahId)} {MOTTO.surahId}:{MOTTO.ayahNumber}</Text></View>
      </View>
      <Text style={[vt.mottoArabic, { color: c.text }]}>{MOTTO.arabic}</Text>
      <Text style={[vt.mottoMeal, { color: c.textSecondary }]}>“{mealOf({ surah: MOTTO.surahId, ayah: MOTTO.ayahNumber }, MOTTO.meal)}”</Text>
    </TouchableOpacity>

    <View style={[vt.kapsam, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Başlık */}
      <View style={[vt.baslik, { backgroundColor: c.cardAlt, borderBottomColor: c.border }]}>
        <Text style={vt.baslikIkon}>🕐</Text>
        <Text style={[vt.baslikMetin, { color: c.textMuted }]}>{caps(t.tableTitle)}</Text>
        <View style={[vt.adetBadge, { backgroundColor: c.accentLight }]}>
          <Text style={[vt.adetText, { color: c.accent }]}>
            {fmt(t.verseCount, { n: Object.values(allVakitVerse).reduce((s, a) => s + a.length, 0) })}
          </Text>
        </View>
      </View>
      {/* Her vakit */}
      {VAKIT_META.map((m, i) => {
        const verses = allVakitVerse[m.id] ?? [];
        if (verses.length === 0) return null;
        return (
          <View key={m.id} style={[vt.vakitSatir, i > 0 && [vt.vakitSatirBorder, { borderTopColor: c.border }]]}>
            {/* Sol — vakit adı */}
            <View style={[vt.vakitSol, { backgroundColor: c.isDark ? c.cardAlt : m.bg, borderLeftColor: m.border }]}>
              <Text style={{ fontSize: 22 }}>{m.ikon}</Text>
              {/* Koyu temada parlak pastel yerine düşük doygunluklu koyu zemin + açık vurgu metni */}
              <View style={[vt.vakitBadge, { backgroundColor: c.isDark ? `${m.border}33` : m.badge }]}>
                <Text
                  style={[vt.vakitBadgeText, { color: c.isDark ? m.border : m.badgeText }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >{t[m.ad]}</Text>
              </View>
              <Text style={[vt.vakitAdet, { color: c.textMuted }]}>{fmt(t.verseCount, { n: verses.length })}</Text>
            </View>
            {/* Sağ — ayetler */}
            <View style={vt.vakitSag}>
              {verses.map((v: { surahId: number; ayahNumber: number; label: string }) => (
                <TouchableOpacity key={v.label} style={vt.ayetRow}
                  onPress={() => router.push({ pathname: "/ayah/[surahId]/[ayahNumber]", params: { surahId: v.surahId, ayahNumber: v.ayahNumber } })} activeOpacity={0.7}
                  accessibilityRole="button" accessibilityLabel={fmt(t.openVerseNamedA11y, { name: sureAdi(v.surahId), label: v.label })}>
                  <View style={[vt.keyBadge, { backgroundColor: c.cardAlt }]}><Text style={[vt.keyText, { color: c.textMuted }]}>{v.label}</Text></View>
                  <Text style={[vt.sureName, { color: c.text }]}>{sureAdi(v.surahId)}</Text>
                  <Text style={[vt.arrow, { color: c.textMuted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </View>
    </>
  );
}

const NAMAZ_TAGS = [
  { tag: "namaz-genel",    label: "tGenel", emoji: "🕌", desc: "tGenelDesc" },
  { tag: "namaz-vakit",    label: "tVakit",       emoji: "🕐", desc: "tVakitDesc" },
  { tag: "namaz-husu",     label: "tHusu",                  emoji: "🤲", desc: "tHusuDesc" },
  { tag: "namaz-teheccud", label: "tTeheccud",       emoji: "🌙", desc: "tTeheccudDesc" },
  { tag: "namaz-cuma",     label: "tCuma",           emoji: "📿", desc: "tCumaDesc" },
  { tag: "namaz-abdest",   label: "tAbdest",                emoji: "💧", desc: "tAbdestDesc" },
  { tag: "namaz-korku",    label: "tKorku",          emoji: "⚔️", desc: "tKorkuDesc" },
  { tag: "namaz-sefer",    label: "tSefer",          emoji: "🚶", desc: "tSeferDesc" },
] as const;

const NamazAccordion = memo(function NamazAccordion({ tag, label, emoji, desc }: { tag: string; label: string; emoji: string; desc: string }) {
  const c = useColors();
  const t = useStrings(namazStrings) as Record<string, string>;
  const mealOf = useMealOf();
  const lang = useLang();
  const surahNameOf = useSurahNameOf();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses]   = useState<TagFilterResult[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError]     = useState(false);

  const fetchVerses = async () => {
    setLoading(true);
    setError(false);
    try { const r = await api.tags.filter(tag); setVerses(r.results); }
    catch { setError(true); }
    setLoading(false);
    setFetched(true);
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) await fetchVerses();
  };

  return (
    <View style={[styles.accordion, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={t[label]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.accordionTitle, { color: c.text }]}>{t[label]}</Text>
          <Text style={[styles.accordionDesc, { color: c.textMuted }]}>{t[desc]}</Text>
        </View>
        <Text style={[styles.accordionChev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={[styles.accordionBody, { borderTopColor: c.border }]}>
          {loading ? (
            <ActivityIndicator color={c.accent} style={{ marginVertical: 10 }} />
          ) : error ? (
            <View style={styles.accordionError}>
              <Text style={styles.accordionErrorText}>{t.loadError}</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: c.accent }]} onPress={fetchVerses} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={t.retryA11y}>
                <Text style={styles.retryBtnText}>{t.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : fetched && verses.length === 0 ? (
            <Text style={[styles.accordionEmpty, { color: c.textMuted }]}>{t.noContent}</Text>
          ) : verses.map((item) => (
            <TouchableOpacity key={item.verse_key} style={[styles.verseCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}
              onPressIn={() => prefetchAyah(item.surah_id, item.ayah_number)}
              onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)} activeOpacity={0.75}
              accessibilityRole="button" accessibilityLabel={fmt(t.openVerseShortA11y, { name: surahNameOf(item.surah_id, item.surah_name) ?? item.verse_key })}>
              <View style={styles.verseHeader}>
                <View style={[styles.keyBadge, { backgroundColor: c.accentLight }]}><Text style={[styles.keyText, { color: c.accent }]}>{item.verse_key}</Text></View>
                {item.surah_name && <Text style={[styles.surahLabel, { color: c.textMuted }]}>{surahNameOf(item.surah_id, item.surah_name)}</Text>}
              </View>
              {item.reading_tr && <Text style={[styles.readingText, { color: c.text }]} numberOfLines={2}>{localizedVerseTranslit(item.verse_key, item.reading_tr, lang)}</Text>}
              {item.meal && <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={2}>{mealOf(item.verse_key, item.meal)}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

export default function NamazScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const ns = useStrings(namazStrings);

  return (
    <>
      <Stack.Screen options={{ title: ns.screenTitle }} />
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 32 + insets.bottom, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}>
        {/* Namaz Vakitleri Tablosu */}
        <VakitTablosu />

        {/* Accordion kategoriler */}
        <View style={styles.accordionList}>
          {NAMAZ_TAGS.map((tg) => (
            <NamazAccordion key={tg.tag} tag={tg.tag} label={tg.label} emoji={tg.emoji} desc={tg.desc} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f5f0e8" },
  grid:      { flexDirection:"row", flexWrap:"wrap", gap:10, padding:12 },
  catCard:   {
    width:"30.5%", backgroundColor:"#fffdf6", borderRadius:12, padding:12,
    alignItems:"center", gap:6, borderWidth:1.5, borderColor:"#e7dfcc",
  },
  catCardActive: { backgroundColor:"#f0fdf4", borderColor:"#059669" },
  catEmoji:  { fontSize:24 },
  catLabel:  { fontSize:11, fontWeight:"600", color:"#1c1917", textAlign:"center" },
  catDesc:   { fontSize:9, color:"#78716c", textAlign:"center", lineHeight:13, marginTop:1 },
  centered:  { flex:1, alignItems:"center", justifyContent:"center", padding:32 },
  noResult:  { color:"#78716c", fontSize:14 },
  verseList: { paddingHorizontal:12, paddingBottom:32 },
  verseCard: {
    backgroundColor:"#fffdf6", borderRadius:12, padding:14,
    borderWidth:1, borderColor:"#e7dfcc",
  },
  verseHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8 },
  keyBadge:    { backgroundColor:"#d1fae5", borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  keyText:     { fontSize:11, fontWeight:"700", color:"#065f46" },
  surahLabel:  { fontSize:12, color:"#78716c" },
  readingText: { fontSize:13, color:"#1c1917", fontStyle:"italic", lineHeight:20, marginTop:2 },
  mealText:    { fontSize:11, lineHeight:17, color:"#57534e", marginTop:1 },

  accordionList:   { margin:12, marginTop:8, gap:8 },
  accordion:       { backgroundColor:"#fffdf6", borderRadius:14, borderWidth:1, borderColor:"#e7dfcc", overflow:"hidden" },
  accordionHeader: { flexDirection:"row", alignItems:"center", gap:10, padding:14 },
  accordionTitle:  { fontSize:13, fontWeight:"700", color:"#1c1917" },
  accordionDesc:   { fontSize:11, color:"#78716c", marginTop:1 },
  accordionChev:   { fontSize:14, color:"#059669" },
  accordionBody:   { borderTopWidth:1, borderTopColor:"#f5f5f4", padding:10, gap:6 },
  accordionError:     { alignItems:"center", paddingVertical:12, gap:8 },
  accordionErrorText: { fontSize:12, color:"#dc2626", textAlign:"center" },
  accordionEmpty:     { fontSize:12, color:"#78716c", textAlign:"center", paddingVertical:10 },
  retryBtn:           { backgroundColor:"#059669", borderRadius:8, paddingHorizontal:16, paddingVertical:7 },
  retryBtnText:       { fontSize:12, fontWeight:"600", color:"#fff" },
});

// ── Vakit Tablosu Stilleri ────────────────────────────────────────────────────
const vt = StyleSheet.create({
  // Üst motto kartı
  motto:         { margin:12, marginBottom:0, borderRadius:16, borderWidth:1, borderColor:"#a7f3d0", backgroundColor:"#ecfdf5", padding:14 },
  mottoHead:     { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:8 },
  mottoEtiket:   { flex:1, fontSize:10, fontWeight:"700", color:"#059669", textTransform:"uppercase", letterSpacing:0.5 },
  mottoKey:      { backgroundColor:"#d1fae5", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  mottoKeyText:  { fontSize:10, fontWeight:"700", color:"#047857" },
  mottoArabic:   { fontSize:20, lineHeight:36, color:"#1c1917", textAlign:"right", writingDirection:"rtl", fontFamily:"Amiri", marginBottom:8 },
  mottoMeal:     { fontSize:13, lineHeight:20, color:"#57534e", fontStyle:"italic" },
  kapsam:        { margin:12, marginBottom:0, borderRadius:16, borderWidth:1, borderColor:"#e7dfcc", overflow:"hidden", backgroundColor:"#fafaf9" },
  baslik:        { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#fffdf6", paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#e7dfcc" },
  baslikIkon:    { fontSize:16 },
  baslikMetin:   { flex:1, fontSize:11, fontWeight:"700", color:"#78716c", textTransform:"uppercase", letterSpacing:0.5 },
  adetBadge:     { backgroundColor:"#f0fdf4", borderRadius:12, paddingHorizontal:8, paddingVertical:2 },
  adetText:      { fontSize:10, fontWeight:"600", color:"#059669" },
  vakitSatir:    { flexDirection:"row" },
  vakitSatirBorder: { borderTopWidth:1, borderTopColor:"#e7dfcc" },
  vakitSol:      { width:84, borderLeftWidth:4, paddingHorizontal:8, paddingVertical:10, alignItems:"center", gap:4 },
  vakitBadge:    { borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  vakitBadgeText:{ fontSize:10, fontWeight:"700" },
  vakitAdet:     { fontSize:9, color:"#a8a29e" },
  vakitSag:      { flex:1, paddingVertical:6, paddingRight:8 },
  ayetRow:       { flexDirection:"row", alignItems:"center", gap:6, paddingVertical:5, paddingHorizontal:4 },
  keyBadge:      { backgroundColor:"#f5f5f4", borderRadius:5, paddingHorizontal:5, paddingVertical:2 },
  keyText:       { fontSize:9, fontWeight:"700", color:"#78716c", fontFamily:"monospace" },
  sureName:      { flex:1, fontSize:12, color:"#1c1917" },
  arrow:         { fontSize:14, color:"#d1d5db" },
});
