import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { router, Stack } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { api, prefetchAyah, type TagFilterResult } from "../src/lib/api";
import { READING_MAX_WIDTH } from "../src/lib/layout";

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

function ScoreBadge({ score }: { score: "10/10" | "8/10" | "0/10" }) {
  const c = useColors();
  const cfg = c.isDark
    ? { "10/10": { emoji: "🟢", bg: "#064e3b", color: "#6ee7b7" },
        "8/10":  { emoji: "🟡", bg: "#451a03", color: "#fcd34d" },
        "0/10":  { emoji: "🔴", bg: "#450a0a", color: "#fca5a5" } }[score]
    : { "10/10": { emoji: "🟢", bg: "#d1fae5", color: "#065f46" },
        "8/10":  { emoji: "🟡", bg: "#fef3c7", color: "#92400e" },
        "0/10":  { emoji: "🔴", bg: "#fee2e2", color: "#991b1b" } }[score];
  return (
    <View style={[sc.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[sc.badgeText, { color: cfg.color }]}>{cfg.emoji} {score}</Text>
    </View>
  );
}

function StepList({ steps }: { steps: string[] }) {
  const c = useColors();
  return (
    <View style={sc.stepList}>
      {steps.map((s, i) => (
        <View key={i} style={sc.stepRow}>
          <View style={[sc.stepNum, { backgroundColor: c.accent }]}><Text style={sc.stepNumText}>{i + 1}</Text></View>
          <Text style={[sc.stepText, { color: c.text }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function HadisBox({ baslik, arapca, anlam, uygulama }: { baslik: string; arapca: string; anlam: string; uygulama?: string }) {
  const c = useColors();
  return (
    <View style={[sc.hadisBox, c.isDark && { backgroundColor: "#052e16", borderColor: "#166534" }]}>
      <Text style={[sc.hadisBaslik, c.isDark && { color: "#6ee7b7" }]}>📖 {baslik}</Text>
      <Text style={[sc.hadisArapca, { color: c.text }]}>{arapca}</Text>
      <Text style={[sc.hadisAnlam, c.isDark && { color: "#86efac" }]}>"{anlam}"</Text>
      {uygulama && <Text style={[sc.hadisUyg, { color: c.accent }]}>{uygulama}</Text>}
    </View>
  );
}

function UyariBox({ mesaj, renk = "amber" }: { mesaj: string; renk?: "red" | "amber" }) {
  const c = useColors();
  const bg    = renk === "red"
    ? (c.isDark ? "#450a0a" : "#fee2e2")
    : (c.isDark ? "#451a03" : "#fef3c7");
  const color = renk === "red"
    ? (c.isDark ? "#fca5a5" : "#991b1b")
    : (c.isDark ? "#fcd34d" : "#92400e");
  return <View style={[sc.uyari, { backgroundColor: bg }]}><Text style={[sc.uyariText, { color }]}>{mesaj}</Text></View>;
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
    <View style={[sc.verseSection, { borderTopColor: c.isDark ? c.border : "#f0fdf4" }]}>
      <TouchableOpacity style={sc.verseSectionBtn} onPress={toggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={ms.relatedA11y}>
        <Text style={[sc.verseSectionLabel, { color: c.accent }]}>{ms.related}</Text>
        <Text style={[sc.verseSectionChev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View>
          {loading && <ActivityIndicator color={c.accent} style={{ marginVertical: 8 }} />}
          {!loading && error && (
            <View style={sc.verseFeedback}>
              <Text style={sc.verseErrorText}>{ms.versesError}</Text>
              <TouchableOpacity style={[sc.verseRetryBtn, { backgroundColor: c.accent }]} onPress={fetchVerses} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={ms.retryA11y}>
                <Text style={sc.verseRetryText}>{ms.retry}</Text>
              </TouchableOpacity>
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

function Bolum({ emoji, baslik, color, children }: { emoji: string; baslik: string; color: string; children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={[s.bolum, { backgroundColor: c.card, borderColor: c.border, borderLeftColor: color }]}>
      <TouchableOpacity style={s.bolumHeader} onPress={() => setOpen(p => !p)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={baslik}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={[s.bolumTitle, { color: c.text }]}>{baslik}</Text>
        <Text style={[s.bolumChev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
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
  return (
    <>
      <Stack.Screen options={{ title: ms.screenTitle }} />
      <ScrollView style={[s.container, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 40 + insets.bottom, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }} showsVerticalScrollIndicator={false}>

        {/* Başlık */}
        <View style={[s.header, { backgroundColor: c.card }]}>
          <Text style={[s.headerTitle, { color: c.text }]}>{ms.header}</Text>
          <Text style={[s.headerSub, { color: c.textMuted }]}>{ms.headerSub}</Text>
        </View>

        {/* Güvenilirlik Sistemi */}
        <View style={[s.scoreCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.scoreTitle, { color: c.text }]}>{ms.scoreTitle}</Text>
          <View style={s.scoreRow}><ScoreBadge score="10/10" /><Text style={[s.scoreDesc, { color: c.textSecondary }]}>{ms.score10}</Text></View>
          <View style={s.scoreRow}><ScoreBadge score="8/10"  /><Text style={[s.scoreDesc, { color: c.textSecondary }]}>{ms.score8}</Text></View>
          <View style={s.scoreRow}><ScoreBadge score="0/10"  /><Text style={[s.scoreDesc, { color: c.textSecondary }]}>{ms.score0}</Text></View>
        </View>

        {/* İsmi Azam linki */}
        <TouchableOpacity style={[s.featuredCard, c.isDark && { backgroundColor: "#422006", borderColor: "#78350f" }]} onPress={() => router.push("/manevi-siginak/ismi-azam")} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={ms.featuredA11y}>

          <Text style={{ fontSize: 32 }}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.featuredTitle, { color: c.text }]}>{ms.featuredTitle}</Text>
            <Text style={[s.featuredSub, { color: c.textMuted }]}>{ms.featuredSub}</Text>
          </View>
          <Text style={[s.featuredArrow, c.isDark && { color: "#fbbf24" }]}>→</Text>
        </TouchableOpacity>

        <Text style={[s.sectionLabel, { color: c.textMuted }]}>{ms.guides}</Text>

        {/* Bolum 1: Genel Korunma */}
        <Bolum emoji="⚔️" baslik={ms.b1} color="#6ee7b7">
          <StepList steps={D.b1.adimlar} />
          <HadisBox {...D.b1.hadis} />
          <VerseList tag="korunma-genel" />
        </Bolum>

        {/* Bolum 2: Büyü ve Sihir */}
        <Bolum emoji="🔱" baslik={ms.b2} color="#93c5fd">
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
        <Bolum emoji="👁️" baslik={ms.b3} color="#fcd34d">
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b3a}</Text>
          <StepList steps={D.b3.a} />
          <HadisBox {...D.b3.hadis} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b3b}</Text>
          <StepList steps={D.b3.b} />
          <UyariBox renk={D.b3.uyari.renk} mesaj={D.b3.uyari.mesaj} />
          <VerseList tag="korunma-nazar" />
        </Bolum>

        {/* Bolum 4: Hased */}
        <Bolum emoji="💚" baslik={ms.b4} color="#86efac">
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b4a}</Text>
          <StepList steps={D.b4.a} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b4b}</Text>
          <StepList steps={D.b4.b} />
          <UyariBox renk={D.b4.uyari.renk} mesaj={D.b4.uyari.mesaj} />
          <VerseList tag="korunma-hased" />
        </Bolum>

        {/* Bolum 5: Vesvese */}
        <Bolum emoji="🌪️" baslik={ms.b5} color="#c4b5fd">
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b5a}</Text>
          <StepList steps={D.b5.a} />
          <Text style={[s.boxTitle, { color: c.text }]}>{ms.b5b}</Text>
          <StepList steps={D.b5.b} />
          <UyariBox renk={D.b5.uyari.renk} mesaj={D.b5.uyari.mesaj} />
          <VerseList tag="korunma-siginma" />
        </Bolum>

        {/* Bolum 6: Şifa */}
        <Bolum emoji="💊" baslik={ms.b6} color="#fca5a5">
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
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>{D.yapYapma.etiket}</Text>
        <View style={[s.mitCard, { backgroundColor: c.card }, c.isDark && { borderColor: "#166534" }]}>
          <Text style={[s.mitTitle, c.isDark && { color: "#6ee7b7" }]}>{D.yapYapma.yapBaslik}</Text>
          {D.yapYapma.yap.map((i, idx) => <Text key={idx} style={[s.mitGreen, c.isDark && { color: "#86efac" }]}>✓ {i}</Text>)}
        </View>
        <View style={[s.mitCard, { backgroundColor: c.card, borderColor: c.isDark ? "#7f1d1d" : "#fca5a5" }]}>
          <Text style={[s.mitTitle, { color: c.isDark ? "#fca5a5" : "#991b1b" }]}>{D.yapYapma.yapmaBaslik}</Text>
          {D.yapYapma.yapma.map((m, idx) => (
            <View key={idx} style={[s.mitDetailRow, c.isDark && { borderTopColor: "#450a0a" }]}>
              <Text style={[s.mitRed, c.isDark && { color: "#fca5a5" }]}>✗ {m.item}</Text>
              <Text style={[s.mitDetailAciklama, { color: c.textMuted }]}>{m.aciklama}</Text>
            </View>
          ))}
        </View>

        <View style={[s.footer, c.isDark && { backgroundColor: "#052e16", borderColor: "#166534" }]}>
          <Text style={[s.footerText, c.isDark && { color: "#86efac" }]}>
            {`"${D.footer}"`}
          </Text>
        </View>

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },

  header:      { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, backgroundColor: "#fffdf6", marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  headerSub:   { fontSize: 12, color: "#78716c", marginTop: 4, textAlign: "center" },

  scoreCard:  { backgroundColor: "#fffdf6", margin: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e7dfcc", gap: 8 },
  scoreTitle: { fontSize: 13, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  scoreRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreDesc:  { fontSize: 13, color: "#44403c" },

  featuredCard:  { backgroundColor: "#fef3c7", margin: 12, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#fcd34d" },
  featuredTitle: { fontSize: 14, fontWeight: "700", color: "#1c1917" },
  featuredSub:   { fontSize: 11, color: "#78716c", marginTop: 2 },
  featuredArrow: { fontSize: 20, color: "#d97706" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#78716c", letterSpacing: 1, textTransform: "uppercase", marginHorizontal: 12, marginTop: 16, marginBottom: 8 },

  bolum:       { margin: 12, marginBottom: 6, borderRadius: 14, borderWidth: 1, borderColor: "#e7dfcc", borderLeftWidth: 4, backgroundColor: "#fffdf6", overflow: "hidden" },
  bolumHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  bolumTitle:  { flex: 1, fontSize: 14, fontWeight: "700", color: "#1c1917" },
  bolumChev:   { fontSize: 14, color: "#059669" },
  bolumBody:   { borderTopWidth: 1, borderTopColor: "#f5f5f4", padding: 12, gap: 10 },

  boxTitle: { fontSize: 13, fontWeight: "700", color: "#1c1917", marginTop: 4, marginBottom: 2 },
  scoreInline: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  scoreInlineText: { flex: 1, fontSize: 12, color: "#57534e", lineHeight: 18 },

  mitCard:  { margin: 12, marginBottom: 6, borderRadius: 14, padding: 14, backgroundColor: "#fffdf6", borderWidth: 1, borderColor: "#86efac", gap: 4 },
  mitTitle: { fontSize: 13, fontWeight: "700", color: "#065f46", marginBottom: 6 },
  mitGreen: { fontSize: 13, color: "#166534", lineHeight: 20 },
  mitRed:   { fontSize: 13, color: "#991b1b", lineHeight: 20, fontWeight: "600" },
  mitDetailRow:    { borderTopWidth: 1, borderTopColor: "#fee2e2", paddingTop: 6, marginTop: 2 },
  mitDetailAciklama: { fontSize: 11, color: "#78716c", marginTop: 1, lineHeight: 16 },

  footer:     { margin: 16, padding: 14, backgroundColor: "#f0fdf4", borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  footerText: { fontSize: 13, color: "#166534", fontStyle: "italic", textAlign: "center", lineHeight: 20 },
});

const sc = StyleSheet.create({
  badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  stepList: { gap: 8, marginVertical: 4 },
  stepRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stepNum:  { width: 20, height: 20, borderRadius: 10, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  stepText: { flex: 1, fontSize: 13, color: "#1c1917", lineHeight: 20 },

  hadisBox:    { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#86efac", gap: 4 },
  hadisBaslik: { fontSize: 12, fontWeight: "700", color: "#065f46" },
  hadisArapca: { fontSize: 16, color: "#1c1917", textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", lineHeight: 28 },
  hadisAnlam:  { fontSize: 12, color: "#166534", fontStyle: "italic" },
  hadisUyg:    { fontSize: 11, color: "#059669" },

  uyari:     { borderRadius: 10, padding: 10 },
  uyariText: { fontSize: 12, lineHeight: 18 },

  verseFeedback:   { alignItems: "center", paddingVertical: 10, gap: 6 },
  verseErrorText:  { fontSize: 12, color: "#dc2626" },
  verseRetryBtn:   { backgroundColor: "#059669", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5 },
  verseRetryText:  { fontSize: 12, fontWeight: "700", color: "#fff" },
  verseEmptyText:  { fontSize: 12, color: "#78716c", paddingVertical: 8, textAlign: "center" },
  verseHintText:   { fontSize: 11, color: "#78716c", paddingTop: 8, textAlign: "center", lineHeight: 16 },
  verseSection:    { borderTopWidth: 1, borderTopColor: "#f0fdf4", marginTop: 4 },
  verseSectionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  verseSectionLabel: { fontSize: 12, fontWeight: "700", color: "#059669" },
  verseSectionChev:  { fontSize: 12, color: "#059669" },
  verseRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  verseKey:  { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  verseKeyText: { fontSize: 10, fontWeight: "700", color: "#065f46" },
  verseSurah:   { fontSize: 10, color: "#78716c" },
  verseReading: { fontSize: 13, color: "#1c1917", fontStyle: "italic", lineHeight: 20, marginTop: 1 },
  verseMeal:    { fontSize: 11, color: "#57534e", lineHeight: 17, marginTop: 1 },
});
