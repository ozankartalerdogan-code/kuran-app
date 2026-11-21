import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, prefetchAyah, type TagFilterResult } from "../src/lib/api";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useColors } from "../src/hooks/useColors";
import { Button, radius, space, toneColors, type IoniconName, type Tone } from "../src/components/ui";

import { useMealOf } from "../src/lib/englishMeal";
import { useSurahNameOf } from "../src/lib/surahNames";
import { useStrings, useLang, fmt, caps } from "../src/i18n";
import { localizedVerseTranslit } from "../src/lib/verseTranslitEn";
import namazStrings from "../src/i18n/strings/namaz";
// ── Namaz Vakitleri Tablosu ───────────────────────────────────────────────────

const VAKIT_KEYS: Record<string, { surahId: number; ayahNumber: number; label: string }[]> = {
  sabah:   [
    { surahId: 17, ayahNumber: 78,  label: "78"  },
    { surahId: 20, ayahNumber: 130, label: "130" },
    { surahId: 50, ayahNumber: 39,  label: "39"  },
  ],
  ogle:    [
    { surahId: 30, ayahNumber: 18,  label: "18"  },
    { surahId: 17, ayahNumber: 78,  label: "78"  },
  ],
  ikindi:  [
    { surahId: 2,  ayahNumber: 238, label: "238"  },
    { surahId: 20, ayahNumber: 130, label: "130" },
    { surahId: 50, ayahNumber: 39,  label: "39"  },
  ],
  aksam:   [
    { surahId: 11, ayahNumber: 114, label: "114" },
    { surahId: 30, ayahNumber: 17,  label: "17"  },
  ],
  yatsi:   [
    { surahId: 24, ayahNumber: 58,  label: "58"  },
    { surahId: 17, ayahNumber: 78,  label: "78"  },
    { surahId: 11, ayahNumber: 114, label: "114" },
  ],
  teheccud: [
    { surahId: 17, ayahNumber: 79,  label: "79"    },
    { surahId: 73, ayahNumber: 2,   label: "2-3"   },
    { surahId: 25, ayahNumber: 64,  label: "64"    },
    { surahId: 51, ayahNumber: 17,  label: "17-18" },
  ],
};

// Üst motto ayeti — Nisâ 4:103 (Arapça + meal)
const MOTTO = {
  surahId: 4,
  ayahNumber: 103,
  arabic: "فَإِذَا قَضَيْتُمُ ٱلصَّلَوٰةَ فَٱذْكُرُوا۟ ٱللَّهَ قِيَـٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِكُمْ ۚ فَإِذَا ٱطْمَأْنَنتُمْ فَأَقِيمُوا۟ ٱلصَّلَوٰةَ ۚ إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا",
  meal: "Namazı kıldıktan sonra; ayakta, otururken ve yan yatarken Allah'ı anın. Güvene kavuştuğunuzda namazı gereğince kılın. Şüphesiz namaz, müminlere belirli vakitlerde farz kılınmıştır.",
};

const VAKIT_META: Array<{ id: string; icon: IoniconName; tone: Tone; ad: string }> = [
  { id: "sabah",    icon: "partly-sunny-outline", tone: "sky",    ad: "vSabah"    },
  { id: "ogle",     icon: "sunny-outline",        tone: "amber",  ad: "vOgle"     },
  { id: "ikindi",   icon: "partly-sunny-outline", tone: "amber",  ad: "vIkindi"   },
  { id: "aksam",    icon: "cloudy-night-outline", tone: "violet", ad: "vAksam"    },
  { id: "yatsi",    icon: "moon-outline",         tone: "violet", ad: "vYatsi"    },
  { id: "teheccud", icon: "star-outline",         tone: "sky",    ad: "vTeheccud" },
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
        style={[vt.motto, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: "/ayah/[surahId]/[ayahNumber]", params: { surahId: MOTTO.surahId, ayahNumber: MOTTO.ayahNumber } })}
        accessibilityRole="button"
        accessibilityLabel={fmt(t.openVerseNamedA11y, { name: sureAdi(MOTTO.surahId), label: MOTTO.ayahNumber })}
      >
        <View style={vt.mottoHead}>
          <Text style={[vt.mottoEtiket, { color: c.accent }]}>{caps(t.mottoLabel)}</Text>
          <View style={[vt.mottoKey, { backgroundColor: c.accentLight }]}>
            <Text style={[vt.mottoKeyText, { color: c.accent }]}>{sureAdi(MOTTO.surahId)} {MOTTO.ayahNumber}</Text>
          </View>
        </View>
        <Text style={[vt.mottoArabic, { color: c.text }]}>{MOTTO.arabic}</Text>
        <Text style={[vt.mottoMeal, { color: c.textSecondary }]}>“{mealOf({ surah: MOTTO.surahId, ayah: MOTTO.ayahNumber }, MOTTO.meal)}”</Text>
      </TouchableOpacity>

      <View style={[vt.kapsam, { backgroundColor: c.card, borderColor: c.border }]}>
        {/* Başlık */}
        <View style={[vt.baslik, { borderBottomColor: c.border }]}>
          <Ionicons name="time-outline" size={16} color={c.textMuted} accessible={false} importantForAccessibility="no" />
          <Text style={[vt.baslikMetin, { color: c.textMuted }]}>{caps(t.tableTitle)}</Text>
          <View style={[vt.adetBadge, { backgroundColor: c.accentLight }]}>
            <Text style={[vt.adetText, { color: c.accent }]}>
              {fmt(t.verseCount, { n: Object.values(allVakitVerse).reduce((acc, a) => acc + a.length, 0) })}
            </Text>
          </View>
        </View>
        {/* Her vakit */}
        {VAKIT_META.map((m, i) => {
          const verses = allVakitVerse[m.id] ?? [];
          if (verses.length === 0) return null;
          const tone = toneColors(c, m.tone);
          return (
            <View key={m.id} style={[vt.vakitSatir, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
              {/* Sol — 40 dp ton dairesi + ikon + vakit adı */}
              <View style={vt.vakitSol}>
                <View style={[vt.toneCircle, { backgroundColor: tone.bg }]}>
                  <Ionicons name={m.icon} size={20} color={tone.fg} accessible={false} importantForAccessibility="no" />
                </View>
                <Text
                  style={[vt.vakitAd, { color: c.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >{t[m.ad]}</Text>
                <Text style={[vt.vakitAdet, { color: c.textMuted }]}>{fmt(t.verseCount, { n: verses.length })}</Text>
              </View>
              {/* Sağ — ayet çipleri */}
              <View style={vt.vakitSag}>
                {verses.map((v) => (
                  <TouchableOpacity
                    key={`${v.surahId}:${v.ayahNumber}`}
                    style={[vt.vtChip, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={() => router.push({ pathname: "/ayah/[surahId]/[ayahNumber]", params: { surahId: v.surahId, ayahNumber: v.ayahNumber } })}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={fmt(t.openVerseNamedA11y, { name: sureAdi(v.surahId), label: v.label })}
                  >
                    <Text style={[vt.vtChipText, { color: c.greenText }]}>{sureAdi(v.surahId)} {v.label}</Text>
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

const NAMAZ_TAGS: Array<{ tag: string; label: string; icon: IoniconName; tone: Tone; desc: string }> = [
  { tag: "namaz-genel",    label: "tGenel",    icon: "accessibility-outline", tone: "emerald", desc: "tGenelDesc"    },
  { tag: "namaz-vakit",    label: "tVakit",    icon: "alarm-outline",         tone: "amber",   desc: "tVakitDesc"    },
  { tag: "namaz-husu",     label: "tHusu",     icon: "leaf-outline",          tone: "emerald", desc: "tHusuDesc"     },
  { tag: "namaz-teheccud", label: "tTeheccud", icon: "star-outline",          tone: "violet",  desc: "tTeheccudDesc" },
  { tag: "namaz-cuma",     label: "tCuma",     icon: "calendar-outline",      tone: "sky",     desc: "tCumaDesc"     },
  { tag: "namaz-abdest",   label: "tAbdest",   icon: "water-outline",         tone: "sky",     desc: "tAbdestDesc"   },
  { tag: "namaz-korku",    label: "tKorku",    icon: "shield-outline",        tone: "amber",   desc: "tKorkuDesc"    },
  { tag: "namaz-sefer",    label: "tSefer",    icon: "walk-outline",          tone: "sky",     desc: "tSeferDesc"    },
];

const NamazAccordion = memo(function NamazAccordion({ tag, label, icon, tone, desc }: {
  tag: string; label: string; icon: IoniconName; tone: Tone; desc: string;
}) {
  const c = useColors();
  const t = useStrings(namazStrings) as Record<string, string>;
  const mealOf = useMealOf();
  const lang = useLang();
  const surahNameOf = useSurahNameOf();
  const tn = toneColors(c, tone);
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
        <View style={[vt.toneCircle, { backgroundColor: tn.bg }]}>
          <Ionicons name={icon} size={20} color={tn.fg} accessible={false} importantForAccessibility="no" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.accordionTitle, { color: c.text }]}>{t[label]}</Text>
          <Text style={[styles.accordionDesc, { color: c.textMuted }]}>{t[desc]}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>
      {open && (
        <View style={[styles.accordionBody, { borderTopColor: c.border }]}>
          {loading ? (
            <ActivityIndicator color={c.accent} style={{ marginVertical: 10 }} />
          ) : error ? (
            <View style={styles.accordionError}>
              <Text style={[styles.accordionErrorText, { color: c.errorText }]}>{t.loadError}</Text>
              <Button variant="secondary" label={t.retry} onPress={fetchVerses} accessibilityLabel={t.retryA11y} />
            </View>
          ) : fetched && verses.length === 0 ? (
            <Text style={[styles.accordionEmpty, { color: c.textMuted }]}>{t.noContent}</Text>
          ) : verses.map((item) => {
            const name = surahNameOf(item.surah_id, item.surah_name || SURE_ADI[item.surah_id] || fmt(t.surahFallback, { n: item.surah_id }));
            const ayah = item.verse_key.split(":")[1] || item.ayah_number;
            return (
              <TouchableOpacity key={item.verse_key} style={[styles.verseCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}
                onPressIn={() => prefetchAyah(item.surah_id, item.ayah_number)}
                onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)} activeOpacity={0.75}
                accessibilityRole="button" accessibilityLabel={fmt(t.openVerseNamedA11y, { name, label: ayah })}>
                <View style={styles.verseHeader}>
                  <View style={[styles.keyBadge, { backgroundColor: c.accentLight }]}><Text style={[styles.keyText, { color: c.accent }]}>{name} {ayah}</Text></View>
                </View>
                {item.reading_tr && <Text style={[styles.readingText, { color: c.text }]} numberOfLines={2}>{localizedVerseTranslit(item.verse_key, item.reading_tr, lang)}</Text>}
                {item.meal && <Text style={[styles.mealText, { color: c.textSecondary }]} numberOfLines={2}>{mealOf(item.verse_key, item.meal)}</Text>}
              </TouchableOpacity>
            );
          })}
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
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: space.xl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Namaz Vakitleri Tablosu */}
        <VakitTablosu />

        {/* Accordion kategoriler */}
        <View style={styles.accordionList}>
          {NAMAZ_TAGS.map((tg) => (
            <NamazAccordion key={tg.tag} tag={tg.tag} label={tg.label} icon={tg.icon} tone={tg.tone} desc={tg.desc} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  scrollContent:      { padding: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center", gap: space.sm },
  verseCard:          { borderRadius: radius.md, padding: 14, borderWidth: 1 },
  verseHeader:        { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: space.xs },
  keyBadge:           { borderRadius: radius.sm, paddingHorizontal: space.xs, paddingVertical: 3 },
  keyText:            { fontSize: 11, fontWeight: "700" },
  readingText:        { fontSize: 13, fontStyle: "italic", lineHeight: 20, marginTop: 2 },
  mealText:           { fontSize: 11, lineHeight: 17, marginTop: 1 },

  accordionList:      { gap: space.xs },
  accordion:          { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  accordionHeader:    { flexDirection: "row", alignItems: "center", gap: space.sm, padding: 14, minHeight: 44 },
  accordionTitle:     { fontSize: 14, fontWeight: "700" },
  accordionDesc:      { fontSize: 11.5, marginTop: 2 },
  accordionBody:      { borderTopWidth: 1, padding: 10, gap: 6 },
  accordionError:     { alignItems: "center", paddingVertical: space.sm, gap: space.xs },
  accordionErrorText: { fontSize: 12, textAlign: "center" },
  accordionEmpty:     { fontSize: 12, textAlign: "center", paddingVertical: 10 },
});

// ── Vakit Tablosu Stilleri ────────────────────────────────────────────────────
const vt = StyleSheet.create({
  motto:         { borderRadius: radius.lg, borderWidth: 1, padding: 14 },
  mottoHead:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.xs },
  mottoEtiket:   { flex: 1, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  mottoKey:      { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mottoKeyText:  { fontSize: 10, fontWeight: "700" },
  mottoArabic:   { fontSize: 20, lineHeight: 36, textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", marginBottom: space.xs },
  mottoMeal:     { fontSize: 13, lineHeight: 20, fontStyle: "italic" },

  kapsam:        { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  baslik:        { flexDirection: "row", alignItems: "center", gap: 6, padding: space.sm, borderBottomWidth: 1 },
  baslikMetin:   { flex: 1, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  adetBadge:     { borderRadius: radius.pill, paddingHorizontal: space.xs, paddingVertical: 2 },
  adetText:      { fontSize: 10, fontWeight: "700" },

  vakitSatir:    { flexDirection: "row" },
  vakitSol:      { width: 92, alignItems: "center", justifyContent: "center", paddingVertical: space.sm, paddingHorizontal: 6, gap: space.xxs },
  toneCircle:    { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  vakitAd:       { fontSize: 11, fontWeight: "700", textAlign: "center" },
  vakitAdet:     { fontSize: 10 },
  vakitSag:      { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10, alignContent: "center" },
  vtChip:        { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  vtChipText:    { fontSize: 12, fontWeight: "600" },
});
