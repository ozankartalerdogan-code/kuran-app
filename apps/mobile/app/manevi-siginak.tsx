import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { api, prefetchAyah, type TagFilterResult } from "../src/lib/api";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import {
  Badge, Button, Callout, MenuCard, SectionHeader,
  radius, space, toneColors,
  type IoniconName, type Tone,
} from "../src/components/ui";

import { useMealOf } from "../src/lib/englishMeal";
import { useSurahNameOf } from "../src/lib/surahNames";
import { useStrings, useLang, fmt } from "../src/i18n";
import { localizedVerseTranslit } from "../src/lib/verseTranslitEn";
import maneviStrings from "../src/i18n/strings/maneviSiginak";
import { localizedData, useLocalizedData } from "../src/i18n/localizedData";
import maneviTr from "../src/data/content/manevi_siginak.json";

interface HadisData { baslik: string; arapca: string; anlam: string; uygulama?: string }
interface UyariData { renk: "red" | "amber"; mesaj: string }
interface ManeviData {
  b1: { adimlar: string[]; hadis: HadisData };
  b2: { not: string; a: string[]; b: string[]; c: string[]; uyari: UyariData };
  b3: { a: string[]; hadis: HadisData; b: string[]; uyari: UyariData };
  b4: { a: string[]; b: string[]; uyari: UyariData };
  b5: { a: string[]; b: string[]; uyari: UyariData };
  b6: { a: string[]; hadis: HadisData; uyari: UyariData; not: string; b: string[] };
  yapYapma: {
    etiket: string; yapBaslik: string; yap: string[];
    yapmaBaslik: string; yapma: { item: string; aciklama: string }[];
  };
  footer: string;
}

// Uzun içerik JSON'da; İngilizce karşılığı <ad>.en.json (çeviri), yoksa Türkçe.
const pickManevi = localizedData(
  maneviTr as unknown as ManeviData,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/content/manevi_siginak.en.json"),
);


// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

const SCORE_TONE: Record<"10/10" | "8/10" | "0/10", Tone | "error"> = {
  "10/10": "emerald",
  "8/10": "amber",
  "0/10": "error",
};

function ScoreBadge({ score }: { score: "10/10" | "8/10" | "0/10" }) {
  return <Badge label={score} tone={SCORE_TONE[score]} />;
}

function StepList({ steps }: { steps: string[] }) {
  const c = useColors();
  return (
    <View style={sc.stepList}>
      {steps.map((step, i) => (
        <View key={i} style={sc.stepRow}>
          <View style={[sc.stepNum, { backgroundColor: c.accent }]}>
            <Text style={[sc.stepNumText, { color: c.actionText }]}>{i + 1}</Text>
          </View>
          <Text style={[sc.stepText, { color: c.text }]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function HadisBox({ baslik, arapca, anlam, uygulama }: { baslik: string; arapca: string; anlam: string; uygulama?: string }) {
  const c = useColors();
  return (
    <View style={[sc.hadisBox, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}>
      <View style={sc.hadisHeadRow}>
        <Ionicons name="book-outline" size={16} color={c.greenText} accessible={false} importantForAccessibility="no" />
        <Text style={[sc.hadisBaslik, { color: c.greenText }]}>{baslik}</Text>
      </View>
      <Text style={[sc.hadisArapca, { color: c.text }]}>{arapca}</Text>
      <Text style={[sc.hadisAnlam, { color: c.textSecondary }]}>"{anlam}"</Text>
      {uygulama && <Text style={[sc.hadisUyg, { color: c.accent }]}>{uygulama}</Text>}
    </View>
  );
}

function UyariBox({ mesaj, renk = "amber" }: { mesaj: string; renk?: "red" | "amber" }) {
  return <Callout tone={renk === "red" ? "error" : "warning"}>{mesaj}</Callout>;
}

function VerseList({ tag }: { tag: string }) {
  const c = useColors();
  const ms = useStrings(maneviStrings);
  const mealOf = useMealOf();
  const lang = useLang();
  const surahNameOf = useSurahNameOf();
  const [verses,  setVerses]  = useState<TagFilterResult[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [open, setOpen]       = useState(false);
  const [error, setError]     = useState(false);

  const fetchVerses = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await api.tags.filter(tag);
      setVerses(r.results.slice(0, 15));
      setTotal(r.total);
    }
    catch { setError(true); }
    setLoading(false);
    setFetched(true);
  }, [tag]);

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) await fetchVerses();
  }, [open, fetched, fetchVerses]);

  return (
    <View style={[sc.verseSection, { borderTopColor: c.border }]}>
      <TouchableOpacity style={sc.verseSectionBtn} onPress={toggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={ms.relatedA11y}>
        <View style={sc.verseSectionTitleRow}>
          <Ionicons name="book-outline" size={16} color={c.accent} accessible={false} importantForAccessibility="no" />
          <Text style={[sc.verseSectionLabel, { color: c.accent }]}>{ms.related}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>
      {open && (
        <View>
          {loading && <ActivityIndicator color={c.accent} style={{ marginVertical: 8 }} />}
          {!loading && error && (
            <View style={sc.verseFeedback}>
              <Text style={[sc.verseErrorText, { color: c.errorText }]}>{ms.versesError}</Text>
              <Button variant="secondary" label={ms.retry} onPress={fetchVerses} accessibilityLabel={ms.retryA11y} />
            </View>
          )}
          {!loading && !error && fetched && verses.length === 0 && (
            <Text style={[sc.verseEmptyText, { color: c.textMuted }]}>{ms.noContent}</Text>
          )}
          {!loading && !error && verses.map(v => (
            <TouchableOpacity key={v.verse_key} style={[sc.verseRow, { borderBottomColor: c.border }]}
              onPressIn={() => prefetchAyah(v.surah_id, v.ayah_number)}
              onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}` as Href)} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel={fmt(ms.openVerseA11y, { name: surahNameOf(v.surah_id, v.surah_name) ?? v.verse_key })}>
              <View style={[sc.verseKey, { backgroundColor: c.accentLight }]}><Text style={[sc.verseKeyText, { color: c.accent }]}>{v.verse_key}</Text></View>
              <View style={{ flex: 1 }}>
                {v.surah_name && <Text style={[sc.verseSurah, { color: c.textMuted }]}>{surahNameOf(v.surah_id, v.surah_name)}</Text>}
                {v.reading_tr && <Text style={[sc.verseReading, { color: c.text }]} numberOfLines={2}>{localizedVerseTranslit(v.verse_key, v.reading_tr, lang)}</Text>}
                {v.meal && <Text style={[sc.verseMeal, { color: c.textSecondary }]} numberOfLines={2}>{mealOf(v.verse_key, v.meal)}</Text>}
              </View>
            </TouchableOpacity>
          ))}
          {!loading && !error && total > verses.length && (
            <Text style={[sc.verseHintText, { color: c.textMuted }]}>{fmt(ms.firstN, { n: verses.length })}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Bolum Accordion ───────────────────────────────────────────────────────────

function Bolum({ icon, tone, baslik, children }: { icon: IoniconName; tone: Tone; baslik: string; children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const tColors = toneColors(c, tone);
  return (
    <View style={[s.bolum, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={s.bolumHeader} onPress={() => setOpen(p => !p)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={baslik}>
        <View style={[s.bolumIconWrap, { backgroundColor: tColors.bg }]}>
          <Ionicons name={icon} size={22} color={tColors.fg} accessible={false} importantForAccessibility="no" />
        </View>
        <Text style={[s.bolumTitle, { color: c.text }]}>{baslik}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>
      {open && <View style={[s.bolumBody, { borderTopColor: c.border }]}>{children}</View>}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function ManeviSiginakScreen() {
  const c = useColors();
  const ms = useStrings(maneviStrings);
  const D = useLocalizedData(pickManevi);
  const insets = useSafeAreaInsets();
  const heroTone = toneColors(c, "emerald");
  return (
    <>
      <Stack.Screen options={{ title: ms.screenTitle }} />
      <ScrollView
        style={[s.container, { backgroundColor: c.bg }]}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Başlık */}
        <View style={s.header}>
          <View style={[s.heroCircle, { backgroundColor: heroTone.bg }]}>
            <Ionicons name="shield-checkmark-outline" size={28} color={heroTone.fg} accessible={false} importantForAccessibility="no" />
          </View>
          <Text style={[s.headerTitle, { color: c.text }]}>{ms.header}</Text>
          <Text style={[s.headerSub, { color: c.textSecondary }]}>{ms.headerSub}</Text>
        </View>

        {/* Güvenilirlik Sistemi */}
        <View style={[s.scoreCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.scoreTitle, { color: c.text }]}>{ms.scoreTitle}</Text>
          <View style={s.scoreRow}><ScoreBadge score="10/10" /><Text style={[s.scoreDesc, { color: c.textSecondary }]}>{ms.score10}</Text></View>
          <View style={s.scoreRow}><ScoreBadge score="8/10"  /><Text style={[s.scoreDesc, { color: c.textSecondary }]}>{ms.score8}</Text></View>
          <View style={s.scoreRow}><ScoreBadge score="0/10"  /><Text style={[s.scoreDesc, { color: c.textSecondary }]}>{ms.score0}</Text></View>
        </View>

        {/* İsm-i Azam linki */}
        <MenuCard
          icon="sparkles-outline"
          iconTone="amber"
          title={ms.featuredTitle}
          subtitle={ms.featuredSub}
          onPress={() => router.push("/manevi-siginak/ismi-azam")}
          accessibilityLabel={ms.featuredA11y}
        />

        <SectionHeader title={ms.guides} />

        {/* Bolum 1: Genel Korunma */}
        <Bolum icon="shield-checkmark-outline" tone="emerald" baslik={ms.b1}>
          <StepList steps={D.b1.adimlar} />
          <HadisBox {...D.b1.hadis} />
          <VerseList tag="korunma-genel" />
        </Bolum>

        {/* Bolum 2: Büyü ve Sihir */}
        <Bolum icon="shield-half-outline" tone="violet" baslik={ms.b2}>
          <View style={s.scoreInline}><ScoreBadge score="8/10" /><Text style={[s.scoreInlineText, { color: c.textSecondary }]}>{D.b2.not}</Text></View>
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b2a}</Text>
          <StepList steps={D.b2.a} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b2b}</Text>
          <StepList steps={D.b2.b} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b2c}</Text>
          <StepList steps={D.b2.c} />
          <UyariBox renk={D.b2.uyari.renk} mesaj={D.b2.uyari.mesaj} />
          <VerseList tag="korunma-sihir" />
        </Bolum>

        {/* Bolum 3: Nazar */}
        <Bolum icon="eye-outline" tone="amber" baslik={ms.b3}>
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b3a}</Text>
          <StepList steps={D.b3.a} />
          <HadisBox {...D.b3.hadis} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b3b}</Text>
          <StepList steps={D.b3.b} />
          <UyariBox renk={D.b3.uyari.renk} mesaj={D.b3.uyari.mesaj} />
          <VerseList tag="korunma-nazar" />
        </Bolum>

        {/* Bolum 4: Hased */}
        <Bolum icon="heart-dislike-outline" tone="amber" baslik={ms.b4}>
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b4a}</Text>
          <StepList steps={D.b4.a} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b4b}</Text>
          <StepList steps={D.b4.b} />
          <UyariBox renk={D.b4.uyari.renk} mesaj={D.b4.uyari.mesaj} />
          <VerseList tag="korunma-hased" />
        </Bolum>

        {/* Bolum 5: Vesvese */}
        <Bolum icon="cloudy-outline" tone="violet" baslik={ms.b5}>
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b5a}</Text>
          <StepList steps={D.b5.a} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b5b}</Text>
          <StepList steps={D.b5.b} />
          <UyariBox renk={D.b5.uyari.renk} mesaj={D.b5.uyari.mesaj} />
          <VerseList tag="korunma-siginma" />
        </Bolum>

        {/* Bolum 6: Şifa */}
        <Bolum icon="medkit-outline" tone="sky" baslik={ms.b6}>
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b6a}</Text>
          <StepList steps={D.b6.a} />
          <HadisBox {...D.b6.hadis} />
          <UyariBox renk={D.b6.uyari.renk} mesaj={D.b6.uyari.mesaj} />
          <View style={s.scoreInline}><ScoreBadge score="8/10" /><Text style={[s.scoreInlineText, { color: c.textSecondary }]}>{D.b6.not}</Text></View>
          <Text style={[s.boxTitle, { color: c.text, marginTop: 8 }]}>{ms.b6b}</Text>
          <StepList steps={D.b6.b} />
          <VerseList tag="korunma-sifa" />
        </Bolum>

        {/* YAP / YAPMA */}
        <SectionHeader title={D.yapYapma.etiket} />
        <View style={[s.mitCard, { backgroundColor: c.card, borderColor: c.greenBorder }]}>
          <Text style={[s.mitTitle, { color: c.greenText }]}>{D.yapYapma.yapBaslik}</Text>
          {D.yapYapma.yap.map((item, idx) => (
            <View key={idx} style={s.mitItemRow}>
              <Ionicons name="checkmark" size={16} color={c.greenText} style={s.mitIcon} accessible={false} importantForAccessibility="no" />
              <Text style={[s.mitItemText, { color: c.text }]}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={[s.mitCard, { backgroundColor: c.card, borderColor: c.errorBorder }]}>
          <Text style={[s.mitTitle, { color: c.errorText }]}>{D.yapYapma.yapmaBaslik}</Text>
          {D.yapYapma.yapma.map((m, idx) => (
            <View key={idx} style={[s.mitDetailRow, { borderTopColor: c.border }]}>
              <View style={s.mitItemRow}>
                <Ionicons name="close" size={16} color={c.errorText} style={s.mitIcon} accessible={false} importantForAccessibility="no" />
                <Text style={[s.mitRed, { color: c.text }]}>{m.item}</Text>
              </View>
              <Text style={[s.mitDetailAciklama, { color: c.textMuted }]}>{m.aciklama}</Text>
            </View>
          ))}
        </View>

        <View style={[s.footer, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}>
          <Text style={[s.footerText, { color: c.greenText }]}>
            {`"${D.footer}"`}
          </Text>
        </View>

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:     { flex: 1 },
  scrollContent: { paddingHorizontal: space.gutter, paddingTop: space.xs, gap: space.sm, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  header:      { alignItems: "center", paddingVertical: space.md, paddingHorizontal: space.sm },
  heroCircle:  { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  headerTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  headerSub:   { fontSize: 13, marginTop: space.xxs, textAlign: "center", lineHeight: 19 },

  scoreCard:  { borderRadius: radius.lg, padding: 14, borderWidth: 1, gap: space.xs },
  scoreTitle: { fontSize: 13, fontWeight: "700", marginBottom: space.xxs },
  scoreRow:   { flexDirection: "row", alignItems: "center", gap: space.xs },
  scoreDesc:  { flex: 1, fontSize: 13 },

  bolum:         { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  bolumHeader:   { flexDirection: "row", alignItems: "center", gap: space.sm, padding: 14, minHeight: 44 },
  bolumIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bolumTitle:    { flex: 1, fontSize: 15, fontWeight: "700" },
  bolumBody:     { borderTopWidth: 1, padding: 14, gap: 10 },

  boxTitle:        { fontSize: 13, fontWeight: "700", marginTop: 4, marginBottom: 2 },
  scoreInline:     { flexDirection: "row", alignItems: "flex-start", gap: space.xs, marginBottom: 4 },
  scoreInlineText: { flex: 1, fontSize: 12, lineHeight: 18 },

  mitCard:           { borderRadius: radius.lg, padding: 14, borderWidth: 1, gap: 6 },
  mitTitle:          { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  mitItemRow:        { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  mitIcon:           { marginTop: 2 },
  mitItemText:       { flex: 1, fontSize: 13, lineHeight: 20 },
  mitRed:            { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  mitDetailRow:      { borderTopWidth: 1, paddingTop: 6, marginTop: 2 },
  mitDetailAciklama: { fontSize: 11, marginTop: 2, marginLeft: 24, lineHeight: 16 },

  footer:     { marginTop: space.xs, padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  footerText: { fontSize: 13, fontStyle: "italic", textAlign: "center", lineHeight: 20 },
});

const sc = StyleSheet.create({
  stepList:    { gap: space.xs, marginVertical: 4 },
  stepRow:     { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  stepNum:     { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: "700" },
  stepText:    { flex: 1, fontSize: 13, lineHeight: 20 },

  hadisBox:     { borderRadius: radius.md, padding: space.sm, borderWidth: 1, gap: 4 },
  hadisHeadRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  hadisBaslik:  { flex: 1, fontSize: 12, fontWeight: "700" },
  hadisArapca:  { fontSize: 16, textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", lineHeight: 28 },
  hadisAnlam:   { fontSize: 12, fontStyle: "italic" },
  hadisUyg:     { fontSize: 11 },

  verseFeedback:       { alignItems: "center", paddingVertical: 10, gap: space.xs },
  verseErrorText:      { fontSize: 12 },
  verseEmptyText:      { fontSize: 12, paddingVertical: 8, textAlign: "center" },
  verseHintText:       { fontSize: 11, paddingTop: 8, textAlign: "center", lineHeight: 16 },
  verseSection:        { borderTopWidth: 1, marginTop: 4 },
  verseSectionBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, minHeight: 44 },
  verseSectionTitleRow:{ flexDirection: "row", alignItems: "center", gap: space.xs, flex: 1 },
  verseSectionLabel:   { fontSize: 12, fontWeight: "700" },
  verseRow:            { flexDirection: "row", alignItems: "flex-start", gap: space.xs, paddingVertical: 8, minHeight: 44, borderBottomWidth: 1 },
  verseKey:            { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  verseKeyText:        { fontSize: 10, fontWeight: "700" },
  verseSurah:          { fontSize: 10 },
  verseReading:        { fontSize: 13, fontStyle: "italic", lineHeight: 20, marginTop: 1 },
  verseMeal:           { fontSize: 11, lineHeight: 17, marginTop: 1 },
});
