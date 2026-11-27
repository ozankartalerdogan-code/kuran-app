/**
 * /root/[root] — Kök Detayı
 * 114 sure dağılımı (renkli grid) + türev kelimeler listesi.
 */
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, FlatList, Platform,
} from "react-native";
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, prefetchAyah, type RootDetail } from "../../../src/lib/api";
import { useColors, type AppColors } from "../../../src/hooks/useColors";
import { Button } from "../../../src/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../../../src/lib/layout";
import { useContextualHint } from "../../../src/tour/useContextualHint";
import { ContextualHintCard, ContextualHintHelp } from "../../../src/tour/ContextualHintCard";
import { beginOverlay } from "../../../src/tour/overlayBusy";
import { rootMeaningEn, meaningTextEn } from "../../../src/lib/wordMeaningsEn";
import { groupRootMeanings, type Verse } from "../../../src/lib/rootMeaningGroups";
import { useStrings, getStrings, fmt, useLang, caps } from "../../../src/i18n";
import rootStrings from "../../../src/i18n/strings/root";
import { offlineSurahs } from "../../../src/lib/offlineTr";
import { useSurahNameOf } from "../../../src/lib/surahNames";

const SURAH_TR_NAMES: Record<number, string> = Object.fromEntries(
  (offlineSurahs() ?? []).map((item) => [item.id, item.name]),
);

function lerpHex(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

const HEAT_LIGHT = { from: "#d1fae5", to: "#059669", textHigh: "#ffffff", textLow: "#065f46" } as const;
const HEAT_DARK  = { from: "#0d3b2e", to: "#10b981", textHigh: "#022c22", textLow: "#a7f3d0" } as const;

// Tema zümrütüne oturan ısı rampası: boş hücre c.cardAlt / c.textMuted, dolu hücreler
// açık zümrütten accent'e. sqrt ile düşük geçişler de seçilebilir kalır.
function heatCell(count: number, max: number, c: AppColors): { bg: string; text: string } {
  if (count === 0) {
    return { bg: c.cardAlt, text: c.textMuted };
  }
  const t = Math.sqrt(Math.min(count / Math.max(max, 1), 1));
  const palette = c.isDark ? HEAT_DARK : HEAT_LIGHT;
  return {
    bg: lerpHex(palette.from, palette.to, t),
    text: t > 0.6 ? palette.textHigh : palette.textLow,
  };
}

const HeatGrid = memo(function HeatGrid({
  distribution,
  maxCount,
  c, targetProps, targetAction,
}: {
  targetProps: ReturnType<typeof useContextualHint>["targetProps"];
  targetAction: () => void;
  distribution: Record<number, number>;
  maxCount: number;
  c: AppColors;
}) {
  const t = useStrings(rootStrings);
  const surahNameOf = useSurahNameOf();
  const [modalInfo, setModalInfo] = useState<{ surahId: number; count: number } | null>(null);
  useEffect(() => { if (modalInfo) return beginOverlay(); }, [modalInfo]);

  return (
    <>
      <View {...targetProps} style={hg.grid}>
        {Array.from({ length: 114 }, (_, i) => i + 1).map((id) => {
          const count = distribution[id] ?? 0;
          const cell = heatCell(count, maxCount, c);
          const isDisabled = count === 0;
          const fullName = surahNameOf(id, SURAH_TR_NAMES[id] ?? String(id));
          const a11yLabel = count > 0
            ? fmt(t.surahFullOccA11y, { n: id, name: fullName, count })
            : fmt(t.surahFullA11y, { n: id, name: fullName });

          return (
            <TouchableOpacity
              key={id}
              style={[hg.cell, { backgroundColor: cell.bg }]}
              onPress={() => { targetAction(); if (count > 0) setModalInfo({ surahId: id, count }); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityHint={isDisabled ? t.notInSurah : fmt(t.occurrencesHint, { n: count })}
              accessibilityState={{ disabled: isDisabled }}
            >
              <Text style={[hg.cellNum, { color: cell.text }]} maxFontSizeMultiplier={1.2}>
                {id}
              </Text>
              <Text
                style={[hg.cellText, { color: cell.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.2}
              >
                {fullName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={!!modalInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfo(null)}
      >
        <TouchableOpacity
          style={[hg.modalOverlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setModalInfo(null)}
          accessibilityRole="button"
          accessibilityLabel={t.closeInfoA11y}
        >
          <View style={[hg.modalCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {modalInfo && (
              <>
                <Text style={[hg.modalSurah, { color: c.text }]}>{fmt(t.surahN, { n: modalInfo.surahId })}</Text>
                <Text style={[hg.modalCount, { color: c.textMuted }]}>{fmt(t.occurrences, { n: modalInfo.count })}</Text>
                <Button
                  variant="primary"
                  label={t.goToSurah}
                  onPress={() => {
                    setModalInfo(null);
                    router.push(`/surah/${modalInfo.surahId}`);
                  }}
                  accessibilityLabel={fmt(t.goToSurahA11y, { n: modalInfo.surahId })}
                />
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

const MeaningGroup = memo(function MeaningGroup({
  meaning,
  forms,
  verses,
  isOpen,
  onToggle,
  c,
}: {
  meaning: string;
  forms: string[];
  verses: Verse[];
  isOpen: boolean;
  onToggle: (meaning: string) => void;
  c: AppColors;
}) {
  const t = useStrings(rootStrings);
  const lang = useLang();
  // Grup anahtarı Türkçe kalır (toggle/gruplama); yalnız görünen metin İngilizceye çevrilir.
  const shown = (lang === "en" ? meaningTextEn(meaning) : null) ?? meaning;
  return (
    <View style={[s.accordionCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={s.accordionHeader}
        onPress={() => onToggle(meaning)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={fmt(t.meaningGroupA11y, { meaning: shown })}
        accessibilityHint={fmt(t.groupHint, { n: verses.length, action: isOpen ? t.actionClose : t.actionOpen })}
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.accordionTitle, { color: c.text }]}>
            {shown}
            <Text style={[s.accordionCount, { color: c.accent }]}>{fmt(t.versesCount, { n: verses.length })}</Text>
          </Text>
          <Text style={[s.accordionForms, { color: c.textMuted }]} numberOfLines={1}>
            {forms.join(" · ")}
          </Text>
        </View>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>

      {isOpen && (
        <View style={[s.versesWrap, { borderTopColor: c.border }]}>
          {verses.slice(0, 80).map((verse, index) => (
            <TouchableOpacity
              key={index}
              style={[s.verseChip, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}
              onPressIn={() => prefetchAyah(verse.surahId, verse.ayahNumber)}
              onPress={() => router.push(`/ayah/${verse.surahId}/${verse.ayahNumber}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.verseA11y, { s: verse.surahId, a: verse.ayahNumber })}
              accessibilityHint={t.opensVerse}
            >
              <Text style={[s.verseChipText, { color: c.greenText }]}>{verse.surahId}:{verse.ayahNumber}</Text>
            </TouchableOpacity>
          ))}
          {verses.length > 80 && (
            <View style={s.verseMore}>
              <Text style={[s.verseMoreText, { color: c.textMuted }]}>{fmt(t.moreVerses, { n: verses.length - 80 })}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

export default function RootDetailScreen() {
  const c = useColors();
  const t = useStrings(rootStrings);
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { root: encodedRoot } = useLocalSearchParams<{ root: string | string[] }>();
  const rawRoot = Array.isArray(encodedRoot) ? encodedRoot[0] : encodedRoot;
  const root = rawRoot ? decodeURIComponent(rawRoot) : "";

  const [data, setData] = useState<RootDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const autoAnchor = useRef<View>(null);
  const hint = useContextualHint("rootMap", !loading && !!data && Object.values(data.distribution).some(count => count > 0), root, undefined, autoAnchor);
  const [error, setError] = useState<string | null>(null);
  const [openMeaning, setOpenMeaning] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchDetail = useCallback(async (nextRoot: string) => {
    if (!nextRoot) {
      setData(null);
      setOpenMeaning(null);
      setOthersOpen(false);
      setError(getStrings(rootStrings).invalidLink);
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setData(null);
    setOpenMeaning(null);
    setOthersOpen(false);

    try {
      const detail = await api.roots.detail(nextRoot);
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) return;
      setData(detail);
    } catch {
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) return;
      setError(getStrings(rootStrings).detailError);
    } finally {
      if (isMountedRef.current && requestIdRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, []);

  // Gruplama + baskın/nadir ayrımı saf modülde (rootMeaningGroups.ts) — test edilir.
  const groups = useMemo(
    () => groupRootMeanings(data?.derivedWords),
    [data?.derivedWords],
  );

  // Akordiyonlar varsayılan kapalı — kullanıcı dokununca açılır/kapanır.

  useEffect(() => {
    void fetchDetail(root);
  }, [fetchDetail, root]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleToggle = useCallback((meaning: string) => {
    setOpenMeaning((previous) => (previous === meaning ? null : meaning));
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: root || t.title }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: root || t.title }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <Text style={[s.errorText, { color: c.errorText }]}>{error ?? t.dataError}</Text>
          <View style={s.errorActions}>
            <Button
              variant="primary"
              label={t.retry}
              onPress={() => { void fetchDetail(root); }}
              accessibilityLabel={t.retryDetailA11y}
            />
            <Button
              variant="secondary"
              label={t.back}
              onPress={() => router.back()}
              accessibilityLabel={t.backA11y}
            />
          </View>
        </View>
      </>
    );
  }

  const maxCount = Math.max(...Object.values(data.distribution), 1);
  const totalOccurrences = Object.values(data.distribution).reduce((sum, count) => sum + count, 0);
  const surahCount = Object.values(data.distribution).filter((count) => count > 0).length;
  const uniqueForms = new Set(data.derivedWords.map((item) => item.word)).size;

  // Başlık daima kökün sözlük anlamı (liste kartıyla aynı kaynak). Boşsa,
  // kelime düzeyi anlamına DÜŞMÜYORUZ — aksi halde başlık listeyle çelişir.
  const displayMeaning =
    (lang === "en" ? rootMeaningEn(root, data.meaningTr) : null) ?? data.meaningTr;

  return (
    <>
      <Stack.Screen options={{ title: root }} />
      <FlatList
        ref={hint.viewportRef}
        {...hint.scrollProps}
        style={[s.container, { backgroundColor: c.bg }]}
        contentContainerStyle={[s.content, { paddingBottom: 40 + insets.bottom }]}
        data={groups.primary}
        keyExtractor={(item) => item[0]}
        extraData={`${openMeaning ?? ""}|${othersOpen}`}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={
          <>
            <View style={[s.header, { backgroundColor: c.card }]}>
              <Text style={[s.rootTitle, { color: c.text }]}>{data.root}</Text>
              {displayMeaning ? (
                <>
                  <Text style={[s.meaningLabel, { color: c.textMuted }]}>{caps(t.rootMeaning)}</Text>
                  <Text style={[s.meaning, { color: c.textSecondary }]}>{displayMeaning}</Text>
                </>
              ) : null}
              <View style={s.statsRow}>
                {([[totalOccurrences, t.statOcc], [surahCount, t.statSurah], [uniqueForms, t.statDerived]] as const).map(([num, label]) => (
                  <View key={label} style={[s.statBadge, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}>
                    <Text style={[s.statNum, { color: c.greenText }]}>{num}</Text>
                    <Text style={[s.statLabel, { color: c.greenText }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
              <View ref={autoAnchor} collapsable={false} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>{t.distribution}</Text>
                  <Text style={[s.sectionHint, { color: c.textMuted }]}>{t.distributionHint}</Text>
                </View>
                <ContextualHintHelp hint={hint} />
              </View>
              {hint.display && <View style={{ marginVertical: 8 }}><ContextualHintCard hint={hint} /></View>}
              <HeatGrid distribution={data.distribution} maxCount={maxCount} c={c} targetProps={hint.targetProps} targetAction={hint.targetAction} />
            </View>

            {groups.primary.length > 0 && (
              <>
                <Text style={[s.groupsTitle, { color: c.text }]}>{fmt(t.contexts, { n: groups.primary.length })}</Text>
                <Text style={[s.groupsHint, { color: c.textMuted }]}>
                  {t.contextsHint}
                </Text>
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <MeaningGroup
            meaning={item[0]}
            forms={item[1].forms}
            verses={item[1].verses}
            isOpen={openMeaning === item[0]}
            onToggle={handleToggle}
            c={c}
          />
        )}
        ListFooterComponent={
          <>
            {groups.others.length > 0 ? (
              <View style={[s.otherWrap, { borderTopColor: c.border }]}>
                <TouchableOpacity
                  style={s.otherToggle}
                  onPress={() => setOthersOpen((o) => !o)}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel={fmt(t.othersA11y, { n: groups.others.length })}
                  accessibilityHint={t.othersHint}
                  accessibilityState={{ expanded: othersOpen }}
                >
                  <Text style={[s.otherToggleText, { color: c.textMuted }]}>
                    {fmt(t.others, { n: groups.others.length })}
                  </Text>
                  <Ionicons name={othersOpen ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
                </TouchableOpacity>

                {othersOpen &&
                  groups.others.map(([meaning, group]) => (
                    <MeaningGroup
                      key={meaning}
                      meaning={meaning}
                      forms={group.forms}
                      verses={group.verses}
                      isOpen={openMeaning === meaning}
                      onToggle={handleToggle}
                      c={c}
                    />
                  ))}
              </View>
            ) : null}
            <Text style={[s.aiNote, { color: c.textMuted }]}>{t.aiNote}</Text>
          </>
        }
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 14, textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 16 },

  header: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, marginBottom: 8 },
  rootTitle: { fontSize: 40, marginBottom: 8 },
  meaningLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  meaning: { fontSize: 16, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 16 },
  statBadge: { alignItems: "center", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  statNum: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 10, marginTop: 1 },

  section: { marginHorizontal: 12, marginBottom: 16, borderRadius: 14, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  sectionHint: { fontSize: 11, marginBottom: 12 },
  groupsTitle: { fontSize: 13, fontWeight: "700", marginHorizontal: 12, marginTop: 4, marginBottom: 2 },
  groupsHint: { fontSize: 11, marginHorizontal: 12, marginBottom: 8, lineHeight: 15 },

  otherWrap: { marginTop: 10, marginHorizontal: 12, paddingTop: 4, borderTopWidth: 1 },
  otherToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  otherToggleText: { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.2 },

  accordionCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden", marginHorizontal: 12, marginBottom: 6 },
  accordionHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  accordionTitle: { fontSize: 14, fontWeight: "700" },
  accordionCount: { fontSize: 13, fontWeight: "400" },
  accordionForms: { fontSize: 12, marginTop: 2, textAlign: "right" },
  versesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4, borderTopWidth: 1 },
  verseChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  verseChipText: { fontSize: 12, fontWeight: "600" },
  verseMore: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, justifyContent: "center" },
  verseMoreText: { fontSize: 12, fontStyle: "italic" },
  aiNote: { fontSize: 10.5, fontStyle: "italic", textAlign: "center", marginTop: 14, marginHorizontal: 12, lineHeight: 16 },
});

const hg = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cell: {
    width: "15.6%",
    minWidth: 48,
    minHeight: 48,
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cellNum: { fontSize: 9, fontWeight: "700", opacity: 0.85 },
  cellText: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalCard: { borderRadius: 16, padding: 24, alignItems: "center", minWidth: 200, borderWidth: 1 },
  modalSurah: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalCount: { fontSize: 14, marginBottom: 16 },
});
