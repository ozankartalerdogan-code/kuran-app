import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import type { DimensionValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ElifbaDers, type ElifbaQuizSoru } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { useStrings, useLang, fmt, caps } from "../../src/i18n";
import { localizeDersler } from "../../src/lib/elifbaEn";
import elifbaStrings from "../../src/i18n/strings/elifba";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import {
  ELIFBA_QUIZ_PASS,
  getLessonStatus as getStatus,
  type ElifbaLessonStatus as LessonStatus,
  parseElifbaProgress,
  parseElifbaQuizScores,
  parseElifbaSrs,
  computeLessonBadge,
  type ElifbaLessonBadge,
  type ElifbaProgress,
  type ElifbaQuizScore,
  type ElifbaSrsMap,
} from "../../src/lib/elifbaProgress";
import {
  countLessonWrong,
  indexLessonQuestions,
  resolveLessonBadge,
} from "../../src/lib/elifbaReview";
import { HarfITarifContent } from "../../src/components/HarfITarifContent";
import {
  Badge,
  Button,
  Callout,
  CloseButton,
  Tabs,
  radius,
  space,
  type TabItem,
  type Tone,
} from "../../src/components/ui";

type TabKey = "elifba" | "harfi-tarif";
const TABS: { key: TabKey; label: string }[] = [
  { key: "elifba",      label: "tabElifba" },
  { key: "harfi-tarif", label: "tabTarif" },
];

const NODE_W   = 72;
const COLS     = 3;

const BADGE_ICON = {
  pass: "ribbon-outline",
  master: "medal",
  crown: "trophy",
} as const;

type QuizScore    = ElifbaQuizScore;

const SEVIYE_TONE: Record<string, Tone> = {
  "başlangıç": "sky",
  temel:       "amber",
  orta:        "violet",
};

function shortBaslik(b: string) {
  return b.replace(/^\d+\.\s*(KONU|LESSON):\s*/i, "");
}

function LessonPopup({ ders, status, seenCount, quizScore, onClose, onFlashcard, onQuiz, onBypassQuiz }: {
  ders: ElifbaDers; status: LessonStatus; seenCount: number;
  quizScore: QuizScore | null; onClose: () => void;
  onFlashcard: () => void; onQuiz: () => void; onBypassQuiz: () => void;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const pct = ders.harf_sayisi > 0 ? Math.round((seenCount / ders.harf_sayisi) * 100) : 0;
  const seviyeTone = SEVIYE_TONE[ders.seviye] ?? "amber";
  const seviyeLabel = ({ "başlangıç": ep.levelBaslangic, temel: ep.levelTemel, orta: ep.levelOrta } as Record<string, string>)[ders.seviye] ?? ders.seviye;
  const dersAdi = shortBaslik(ders.baslik);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[pp.overlay, { backgroundColor: c.overlay }]} onPress={onClose} activeOpacity={1} accessibilityRole="button" accessibilityLabel={ep.close}>
        <TouchableOpacity style={[pp.card, { backgroundColor: c.card, borderColor: c.border }]} activeOpacity={1} accessible={false}>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.xs, marginBottom: space.sm }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xxs, marginBottom: 6 }}>
                <Badge label={fmt(ep.lessonN, { n: ders.konu_sirasi })} tone="neutral" />
                <Badge label={seviyeLabel} tone={seviyeTone} />
                {status === "completed" && (
                  <Badge label={ep.completed} tone="emerald" />
                )}
              </View>
              <Text style={[pp.title, { color: c.text }]}>{dersAdi}</Text>
            </View>
            <CloseButton
              onPress={onClose}
              accessibilityLabel={fmt(ep.closeLessonA11y, { name: dersAdi })}
              style={{ marginTop: -8, marginRight: -8 }}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={[pp.label, { color: c.textMuted }]}>{fmt(ep.cards, { a: seenCount, b: ders.harf_sayisi })}</Text>
            {pct === 100 && <Text style={[pp.label, { color: c.greenText, fontWeight: "700" }]}>✓</Text>}
          </View>
          <View style={[pp.bar, { backgroundColor: c.cardAlt }]}>
            <View style={[pp.fill, { width: `${pct}%` as DimensionValue, backgroundColor: c.accent }]} />
          </View>

          {quizScore ? (
            <Callout tone="info" style={{ marginTop: space.xs }}>
              <Text style={{ fontSize: 13, lineHeight: 19, color: c.text }}>
                {ep.quizPrefix}{quizScore.score}/{quizScore.total}
                {quizScore.score >= ELIFBA_QUIZ_PASS
                  ? <Text style={{ color: c.greenText, fontWeight: "700" }}>{ep.passed}</Text>
                  : <Text style={{ color: c.textMuted }}>{ep.tryAgainDash}</Text>}
              </Text>
            </Callout>
          ) : status !== "locked" ? (
            <Callout tone="warning" style={{ marginTop: space.xs }}>
              {fmt(ep.passHint, { n: ELIFBA_QUIZ_PASS })}
            </Callout>
          ) : null}

          {status === "locked" && (
            <Callout tone="neutral" style={{ marginTop: space.xs }}>
              {ep.lockedHint}
            </Callout>
          )}

          {status === "locked" && (
            <Button
              variant="secondary"
              icon="school-outline"
              fullWidth
              label={ep.bypassBtn}
              onPress={onBypassQuiz}
              accessibilityLabel={fmt(ep.bypassA11y, { name: dersAdi })}
              style={{ marginTop: 14 }}
            />
          )}

          {status !== "locked" && (
            <View style={{ flexDirection: "row", gap: space.xs, marginTop: 14 }}>
              <Button
                variant="primary"
                label={ep.cardsBtn}
                onPress={onFlashcard}
                accessibilityLabel={fmt(ep.openCardsA11y, { name: dersAdi })}
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                label={ep.quizBtn}
                onPress={onQuiz}
                accessibilityLabel={fmt(ep.openQuizA11y, { name: dersAdi })}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Path Node ─────────────────────────────────────────────────────────────────

function PathNode({ ders, status, pct, badge, onPress }: {
  ders: ElifbaDers; status: LessonStatus; pct: number;
  badge: ElifbaLessonBadge; onPress: () => void;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const isComp   = status === "completed";
  const lang = useLang();
  const isActive = status === "active";
  const isLocked = status === "locked";
  const bg        = isComp ? c.actionBg    : isActive ? c.goldText    : c.cardAlt;
  const border    = isComp ? c.greenBorder : isActive ? c.amberBorder : c.border;
  const iconColor = isComp ? c.actionText  : isActive ? c.bg          : c.textMuted;
  const statusLabel = isComp ? ep.stCompleted : isActive ? ep.stActive : ep.stLocked;
  const dersAdi = shortBaslik(ders.baslik);
  const badgeLabel = badge === "pass" ? ep.badgePass : badge === "master" ? ep.badgeMaster : badge === "crown" ? ep.badgeCrown : null;
  const nodeLabel = fmt(ep.nodeA11y, { name: dersAdi, status: statusLabel, pct })
    + (badgeLabel ? ` · ${fmt(ep.badgeSuffix, { badge: badgeLabel })}` : "");

  return (
    <TouchableOpacity
      style={nd.wrap}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={nodeLabel}
      accessibilityHint={isLocked ? ep.nodeHintLocked : ep.nodeHint}
    >
      <View style={nd.circleWrap}>
        <View style={[nd.circle, { backgroundColor: bg, borderColor: border }]}>
          <Ionicons
            name={isComp ? "star" : isActive ? "play" : "lock-closed"}
            size={20}
            color={iconColor}
          />
        </View>
        {badge !== "none" && (
          <View style={[nd.badge, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name={BADGE_ICON[badge]} size={12} color={c.accent} />
          </View>
        )}
      </View>
      {!isLocked && (
        <View style={[nd.barBg, { backgroundColor: c.cardAlt }]}>
          <View style={[nd.barFill, {
            width: `${pct}%` as DimensionValue,
            backgroundColor: isComp ? c.accent : c.goldText,
          }]} />
        </View>
      )}
      {/* Etiket ekran zemininde (c.bg) durur — sabit koyu gri gece modunda okunmuyordu.
          Taşmayı numberOfLines={3} yönetir; başlığı ayrıca ilk 3 kelimeye kesmek
          "ASAR, MED ve KASR"ı "ASAR, MED ve" yapıp bağlaçla bitiriyordu (9 dersten
          yalnız o 3 kelimeden uzun olduğu için hata tek satırda görünür kalmıştı). */}
      <Text style={[nd.label, { color: isLocked ? c.textMuted : c.textSecondary }]} numberOfLines={3}>
        {lang === "tr" ? dersAdi.toLocaleUpperCase("tr-TR") : caps(dersAdi)}
      </Text>
    </TouchableOpacity>
  );
}

// ── VLine ─────────────────────────────────────────────────────────────────────

function VLineRow({ side, color }: { side: "left" | "right"; color: string }) {
  const line = (
    <View style={{ width: NODE_W, alignItems: "center" }}>
      <View style={{ width: 3, height: 36, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
  const empty = (w: number) => <View style={{ width: w }} />;
  const flex  = () => <View style={{ flex: 1 }} />;

  return (
    <View style={{ flexDirection: "row" }}>
      {side === "right"
        ? <>{empty(NODE_W)}{flex()}{empty(NODE_W)}{flex()}{line}</>
        : <>{line}{empty(NODE_W)}{flex()}{empty(NODE_W)}{flex()}</>}
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function OgrenScreen() {
  const c = useColors();
  const ep = useStrings(elifbaStrings) as Record<string, string>;
  const insets = useSafeAreaInsets();
  const [tab, setTab]               = useState<TabKey>("elifba");
  const lang = useLang();
  const { data: derslerRaw, isLoading: loading, isError: error, refetch: loadDersler } = useQuery({
    queryKey: ["elifba-dersler"],
    queryFn: () => api.elifba.dersler(),
    retry: false, // API istemcisi zaten sınırlı tekrar yapar.
    staleTime: 60 * 60 * 1000,
  });
  const dersler = useMemo(() => localizeDersler(derslerRaw ?? [], lang), [derslerRaw, lang]);

  const [progress, setProgress]     = useState<ElifbaProgress>({});
  const [quizScores, setQuizScores] = useState<Record<string, QuizScore>>({});
  const [srs, setSrs]               = useState<ElifbaSrsMap>({});
  const [popupId, setPopupId]       = useState<number | null>(null);
  const [quizPools, setQuizPools]   = useState<Record<number, ElifbaQuizSoru[]>>({});
  const [quizFailed, setQuizFailed] = useState<number[]>([]);
  const quizRequestRef              = useRef(0);

  const loadProgress = useCallback(() => {
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaProgress)
      .then(p => setProgress(parseElifbaProgress(p))).catch(() => {});
    storage.getJSON<unknown>(STORAGE_KEYS.quizScores)
      .then(q => setQuizScores(parseElifbaQuizScores(q))).catch(() => {});
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then(raw => setSrs(parseElifbaSrs(raw))).catch(() => setSrs({}));
  }, []);

  useFocusEffect(loadProgress);

  const lessonIds = useMemo(() => dersler.map(d => d.id), [dersler]);

  const fetchQuizPools = useCallback((ids: number[], merge: boolean) => {
    if (ids.length === 0) return;
    const requestId = quizRequestRef.current + 1;
    quizRequestRef.current = requestId;
    void Promise.all(ids.map(async (id) => {
      try {
        return { id, pool: await api.elifba.quiz(id) };
      } catch {
        return { id, pool: null };
      }
    })).then((results) => {
      if (quizRequestRef.current !== requestId) return;
      setQuizPools(prev => {
        const next: Record<number, ElifbaQuizSoru[]> = merge ? { ...prev } : {};
        for (const result of results) if (result.pool) next[result.id] = result.pool;
        return next;
      });
      setQuizFailed(prev => {
        const next = merge ? new Set(prev) : new Set<number>();
        for (const result of results) {
          if (result.pool) next.delete(result.id);
          else next.add(result.id);
        }
        return [...next];
      });
    });
  }, []);

  useEffect(() => {
    setQuizPools({});
    setQuizFailed([]);
    fetchQuizPools(lessonIds, false);
  }, [lessonIds, fetchQuizPools]);

  const statuses = dersler.map((d, i) => getStatus(d, i, dersler, progress, quizScores));
  const completedCount = statuses.filter(st => st === "completed").length;
  const overallPct = dersler.length > 0 ? Math.round((completedCount / dersler.length) * 100) : 0;

  const catalog = useMemo(() => indexLessonQuestions(Object.values(quizPools)), [quizPools]);
  const failedQuizLessons = useMemo(() => new Set(quizFailed), [quizFailed]);
  const wrongCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const d of dersler) counts[d.id] = countLessonWrong(srs, catalog, d.id);
    return counts;
  }, [dersler, srs, catalog]);
  const badges: ElifbaLessonBadge[] = dersler.map((d) => {
    const lessonPool = quizPools[d.id];
    // Havuz henüz yüklenmediyse yanlış sayısı bilinmez; taç gösterme.
    const catalogComplete = lessonPool !== undefined && !failedQuizLessons.has(d.id)
      && lessonPool.every((q) => catalog[`q:${q.quiz_id}`] === d.id);
    return resolveLessonBadge(
      quizScores[String(d.id)],
      wrongCounts[d.id] ?? 0,
      catalogComplete,
      computeLessonBadge,
    );
  });
  const reviewableLessonIds = dersler
    .filter((d, i) => statuses[i] !== "locked" && !failedQuizLessons.has(d.id))
    .map(d => d.id);
  const reviewCount = reviewableLessonIds.reduce((sum, id) => sum + (wrongCounts[id] ?? 0), 0);

  type RowNode = { ders: ElifbaDers; origIdx: number };
  const rows: RowNode[][] = [];
  for (let i = 0; i < dersler.length; i += COLS) {
    const chunk: RowNode[] = dersler.slice(i, i + COLS).map((d, j) => ({ ders: d, origIdx: i + j }));
    rows.push(rows.length % 2 === 1 ? [...chunk].reverse() : chunk);
  }

  function getPct(ders: ElifbaDers) {
    const seen = progress[String(ders.id)]?.length ?? 0;
    return ders.harf_sayisi > 0 ? Math.round((seen / ders.harf_sayisi) * 100) : 0;
  }

  function renderRow(nodes: RowNode[]) {
    return (
      <View style={s.row}>
        {nodes.map(({ ders, origIdx }, i) => (
          <React.Fragment key={ders.id}>
            <PathNode
              ders={ders}
              status={statuses[origIdx]}
              pct={getPct(ders)}
              badge={badges[origIdx]}
              onPress={() => setPopupId(ders.id)}
            />
            {i < nodes.length - 1 && (
              <View style={[s.hLine, {
                backgroundColor: statuses[origIdx] === "completed" ? c.accent : c.border,
              }]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  }

  const popupDers = dersler.find(d => d.id === popupId) ?? null;
  const tabItems: TabItem<TabKey>[] = TABS.map(t => ({
    key: t.key,
    label: ep[t.label],
    accessibilityLabel: fmt(ep.tabA11y, { label: ep[t.label] }),
  }));

  return (
    <>
      <Stack.Screen options={{ title: ep.screenTitle }} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>

        {/* Üst sekme bar — her zaman görünür */}
        <View style={[s.tabWrap, { paddingTop: insets.top + space.xs }]}>
          <Tabs variant="segmented" items={tabItems} value={tab} onChange={setTab} />
        </View>

        {/* Elif-Ba içeriği */}
        {tab === "elifba" && (
          loading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={c.accent} />
            </View>
          ) : (error || dersler.length === 0) ? (
            <View style={s.centered}>
              <Ionicons name="book-outline" size={44} color={c.textMuted} style={{ marginBottom: space.sm }} accessible={false} importantForAccessibility="no" />
              <Text style={[s.errText, { color: c.text }]}>
                {error ? ep.loadError : ep.noLessons}
              </Text>
              <Button
                variant="primary"
                label={ep.retry}
                onPress={() => { void loadDersler(); }}
                accessibilityLabel={ep.reloadA11y}
              />
            </View>
          ) : (
            <>
              <ScrollView style={[s.scroll, { backgroundColor: c.bg }]} contentContainerStyle={[s.content, { paddingBottom: 48 + insets.bottom }]}>

                {/* Genel ilerleme */}
                <View style={[s.overallCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                      <Ionicons name="trophy-outline" size={18} color={c.goldText} accessible={false} importantForAccessibility="no" />
                      <Text style={[s.overallTitle, { color: c.text }]}>{ep.progress}</Text>
                    </View>
                    <Text style={[s.overallCount, { color: c.accent }]}>{fmt(ep.lessonsCount, { a: completedCount, b: dersler.length })}</Text>
                  </View>
                  <View style={[s.overallBar, { backgroundColor: c.cardAlt }]}>
                    <View style={[s.overallFill, { width: `${overallPct}%` as DimensionValue, backgroundColor: c.accent }]} />
                  </View>
                  {overallPct === 100 && (
                    <Text style={[s.overallDone, { color: c.greenText }]}>{ep.allDone}</Text>
                  )}
                </View>

                {reviewCount > 0 && (
                  <TouchableOpacity
                    style={[s.reviewBtn, { backgroundColor: c.card, borderColor: c.border }]}
                    onPress={() => router.push({
                      pathname: "/elifba/tekrar",
                      params: { lessons: reviewableLessonIds.join(",") },
                    })}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={fmt(ep.reviewButtonA11y, { n: reviewCount })}
                  >
                    <Ionicons name="refresh" size={18} color={c.accent} />
                    <Text style={[s.reviewBtnText, { color: c.accent }]}>
                      {fmt(ep.reviewButton, { n: reviewCount })}
                    </Text>
                  </TouchableOpacity>
                )}

                {quizFailed.length > 0 && (
                  <View style={[s.catalogNotice, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={[s.catalogNoticeText, { color: c.textMuted }]}>{ep.catalogIncomplete}</Text>
                    <TouchableOpacity
                      onPress={() => fetchQuizPools(quizFailed, true)}
                      accessibilityRole="button"
                      accessibilityLabel={ep.catalogRetryA11y}
                    >
                      <Text style={[s.catalogRetryText, { color: c.accent }]}>{ep.retry}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Yol haritası — dinamik, yılan şeklinde */}
                <View style={s.path}>
                  {rows.map((row, rowIdx) => (
                    <React.Fragment key={rowIdx}>
                      {renderRow(row)}
                      {rowIdx < rows.length - 1 && (
                        <VLineRow
                          side={rowIdx % 2 === 0 ? "right" : "left"}
                          color={statuses[Math.min((rowIdx + 1) * COLS - 1, dersler.length - 1)] === "completed" ? c.accent : c.border}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </View>

              </ScrollView>

              {/* Ders popup */}
              {popupDers && (
                <LessonPopup
                  ders={popupDers}
                  status={statuses[dersler.indexOf(popupDers)]}
                  seenCount={progress[String(popupDers.id)]?.length ?? 0}
                  quizScore={quizScores[String(popupDers.id)] ?? null}
                  onClose={() => setPopupId(null)}
                  onFlashcard={() => {
                    setPopupId(null);
                    router.push({
                      pathname: "/elifba/[dersId]",
                      params: { dersId: String(popupDers.id), baslik: shortBaslik(popupDers.baslik) },
                    });
                  }}
                  onBypassQuiz={() => {
                    setPopupId(null);
                    router.push({
                      pathname: "/elifba/[dersId]",
                      params: { dersId: String(popupDers.id), mode: "quiz", bypass: "1", baslik: shortBaslik(popupDers.baslik) },
                    });
                  }}
                  onQuiz={() => {
                    setPopupId(null);
                    router.push({
                      pathname: "/elifba/[dersId]",
                      params: { dersId: String(popupDers.id), mode: "quiz", baslik: shortBaslik(popupDers.baslik) },
                    });
                  }}
                />
              )}
            </>
          )
        )}

        {/* Harf-i Tarif içeriği */}
        {tab === "harfi-tarif" && (
          <HarfITarifContent paddingTop={16} paddingBottom={insets.bottom + 40} />
        )}
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  tabWrap:     { paddingHorizontal: space.gutter, paddingBottom: space.xs, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  errText:     { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 20 },
  scroll:      { flex: 1 },
  content:     { padding: space.gutter, paddingBottom: 48, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  overallCard: { borderRadius: radius.lg, padding: 14, marginBottom: space.lg, borderWidth: 1 },
  overallTitle: { fontSize: 14, fontWeight: "700" },
  overallCount: { fontSize: 13, fontWeight: "600" },
  overallBar:   { height: 10, borderRadius: 5, overflow: "hidden" },
  overallFill:  { height: "100%", borderRadius: 5 },
  overallDone:  { textAlign: "center", fontSize: 12, fontWeight: "700", marginTop: 6 },
  reviewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs,
    borderRadius: radius.lg, borderWidth: 1, paddingVertical: space.sm, marginBottom: space.md,
  },
  reviewBtnText: { fontSize: 14, fontWeight: "700" },
  catalogNotice: {
    borderRadius: radius.lg, borderWidth: 1, padding: space.sm, marginBottom: space.md, gap: 6,
  },
  catalogNoticeText: { fontSize: 12, lineHeight: 18 },
  catalogRetryText: { fontSize: 12, fontWeight: "700" },
  path:  { paddingVertical: space.xxs },
  row:   { flexDirection: "row", alignItems: "flex-start" },
  hLine: { flex: 1, height: 3, marginTop: 25, borderRadius: 2 },
});

const nd = StyleSheet.create({
  wrap:    { width: NODE_W, alignItems: "center", paddingVertical: space.xxs },
  circleWrap: { position: "relative" },
  circle:  {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  badge:   {
    position: "absolute", top: -4, right: -4,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  barBg:   { width: 44, height: 3, borderRadius: 2, marginTop: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  label:   { fontSize: 9, fontWeight: "600", textAlign: "center", marginTop: space.xxs, lineHeight: 13, paddingHorizontal: 2 },
});

const pp = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.gutter },
  card:    {
    width: "100%", maxWidth: 360,
    borderRadius: radius.lg, padding: 18, borderWidth: 1,
  },
  title:     { fontSize: 15, fontWeight: "700" },
  label:     { fontSize: 12, marginBottom: 4 },
  bar:       { height: 6, borderRadius: 3, overflow: "hidden" },
  fill:      { height: "100%", borderRadius: 3 },
});
