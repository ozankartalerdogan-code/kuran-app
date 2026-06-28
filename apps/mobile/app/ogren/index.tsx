import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ElifbaDers } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { HarfITarifContent } from "../../src/components/HarfITarifContent";

type TabKey = "elifba" | "harfi-tarif";
const TABS: { key: TabKey; label: string }[] = [
  { key: "elifba",      label: "Elif-Ba" },
  { key: "harfi-tarif", label: "Harf-i Tarif" },
];

const QUIZ_PASS = 10;
const NODE_W   = 72;
const COLS     = 3;

type LessonStatus = "completed" | "active" | "locked";
type QuizScore    = { score: number; total: number };

const SEVIYE_COLOR: Record<string, { bg: string; text: string }> = {
  "başlangıç": { bg: "#dbeafe", text: "#1d4ed8" },
  temel:       { bg: "#fef3c7", text: "#b45309" },
  orta:        { bg: "#f3e8ff", text: "#7e22ce" },
};

function shortBaslik(b: string) {
  return b.replace(/^\d+\.\s*KONU:\s*/i, "");
}

function checkCompleted(
  ders: ElifbaDers,
  progress: Record<string, number[]>,
  quizScores: Record<string, QuizScore>,
): boolean {
  const seen      = progress[String(ders.id)] ?? [];
  const flashDone = ders.harf_sayisi > 0 && seen.length >= ders.harf_sayisi;
  const qs        = quizScores[String(ders.id)];
  return flashDone && !!qs && qs.score >= QUIZ_PASS;
}

function getStatus(
  ders: ElifbaDers,
  idx: number,
  all: ElifbaDers[],
  progress: Record<string, number[]>,
  quizScores: Record<string, QuizScore>,
): LessonStatus {
  if (checkCompleted(ders, progress, quizScores)) return "completed";
  if (idx === 0) return "active";
  if (checkCompleted(all[idx - 1], progress, quizScores)) return "active";
  return "locked";
}

// ── Ders Popup ────────────────────────────────────────────────────────────────

function LessonPopup({ ders, status, seenCount, quizScore, onClose, onFlashcard, onQuiz }: {
  ders: ElifbaDers; status: LessonStatus; seenCount: number;
  quizScore: QuizScore | null; onClose: () => void;
  onFlashcard: () => void; onQuiz: () => void;
}) {
  const pct = ders.harf_sayisi > 0 ? Math.round((seenCount / ders.harf_sayisi) * 100) : 0;
  const sev = SEVIYE_COLOR[ders.seviye] ?? SEVIYE_COLOR.temel;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pp.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={pp.card} activeOpacity={1}>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                <View style={[pp.badge, { backgroundColor: "#f5f0e8" }]}>
                  <Text style={[pp.badgeText, { color: "#78716c" }]}>Konu {ders.konu_sirasi}</Text>
                </View>
                <View style={[pp.badge, { backgroundColor: sev.bg }]}>
                  <Text style={[pp.badgeText, { color: sev.text }]}>{ders.seviye}</Text>
                </View>
                {status === "completed" && (
                  <View style={[pp.badge, { backgroundColor: "#d1fae5" }]}>
                    <Text style={[pp.badgeText, { color: "#065f46" }]}>✓ Tamamlandı</Text>
                  </View>
                )}
              </View>
              <Text style={pp.title}>{shortBaslik(ders.baslik)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 16, color: "#9ca3af" }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={pp.label}>Kartlar: {seenCount} / {ders.harf_sayisi}</Text>
            {pct === 100 && <Text style={[pp.label, { color: "#059669", fontWeight: "700" }]}>✓</Text>}
          </View>
          <View style={pp.bar}><View style={[pp.fill, { width: `${pct}%` as any }]} /></View>

          {quizScore ? (
            <View style={[pp.infoBox, { backgroundColor: "#eff6ff", marginTop: 8 }]}>
              <Text style={{ fontSize: 13, color: "#1d4ed8" }}>
                {"🧠 Test: "}{quizScore.score}/{quizScore.total}
                {quizScore.score >= QUIZ_PASS
                  ? <Text style={{ color: "#059669", fontWeight: "700" }}> ✓ Geçti</Text>
                  : <Text style={{ color: "#78716c" }}> — tekrar dene</Text>}
              </Text>
            </View>
          ) : status !== "locked" ? (
            <View style={[pp.infoBox, { backgroundColor: "#fef9c3", marginTop: 8 }]}>
              <Text style={{ fontSize: 12, color: "#854d0e" }}>
                💡 Dersi tamamlamak için teste gir ve en az {QUIZ_PASS}/15 al.
              </Text>
            </View>
          ) : null}

          {status === "locked" && (
            <View style={[pp.infoBox, { backgroundColor: "#f5f5f4", marginTop: 8 }]}>
              <Text style={{ fontSize: 12, color: "#78716c" }}>🔒 Önceki dersi tamamla</Text>
            </View>
          )}

          {status !== "locked" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TouchableOpacity style={pp.btnGreen} onPress={onFlashcard}>
                <Text style={pp.btnText}>📇 Kartlar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pp.btnIndigo} onPress={onQuiz}>
                <Text style={pp.btnText}>🧠 Test</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Path Node ─────────────────────────────────────────────────────────────────

function PathNode({ ders, status, pct, onPress }: {
  ders: ElifbaDers; status: LessonStatus; pct: number; onPress: () => void;
}) {
  const isComp   = status === "completed";
  const isActive = status === "active";
  const isLocked = status === "locked";
  const bg       = isComp ? "#059669" : isActive ? "#f59e0b" : "#d1d5db";
  const border   = isComp ? "#047857" : isActive ? "#d97706" : "#9ca3af";

  return (
    <TouchableOpacity
      style={nd.wrap}
      onPress={onPress}
      disabled={isLocked}
      activeOpacity={isLocked ? 1 : 0.75}
    >
      <View style={[nd.circle, { backgroundColor: bg, borderColor: border }]}>
        <Text style={nd.icon}>{isComp ? "⭐" : isActive ? "▶" : "🔒"}</Text>
      </View>
      {!isLocked && (
        <View style={nd.barBg}>
          <View style={[nd.barFill, {
            width: `${pct}%` as any,
            backgroundColor: isComp ? "#059669" : "#f59e0b",
          }]} />
        </View>
      )}
      <Text style={[nd.label, { color: isLocked ? "#9ca3af" : "#44403c" }]} numberOfLines={2}>
        {shortBaslik(ders.baslik).split(" ").slice(0, 3).join(" ")}
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
  const insets = useSafeAreaInsets();
  const [tab, setTab]               = useState<TabKey>("elifba");
  const { data: dersler = [], isLoading: loading, isError: error, refetch: loadDersler } = useQuery({
    queryKey: ["elifba-dersler"],
    queryFn: () => api.elifba.dersler(),
    staleTime: 60 * 60 * 1000,
  });

  const [progress, setProgress]     = useState<Record<string, number[]>>({});
  const [quizScores, setQuizScores] = useState<Record<string, QuizScore>>({});
  const [popupId, setPopupId]       = useState<number | null>(null);

  const loadProgress = useCallback(() => {
    storage.getJSON<Record<string, number[]>>(STORAGE_KEYS.elifbaProgress)
      .then(p => setProgress(p ?? {})).catch(() => {});
    storage.getJSON<Record<string, QuizScore>>(STORAGE_KEYS.quizScores)
      .then(q => setQuizScores(q ?? {})).catch(() => {});
  }, []);

  useFocusEffect(loadProgress);

  const statuses = dersler.map((d, i) => getStatus(d, i, dersler, progress, quizScores));
  const completedCount = statuses.filter(st => st === "completed").length;
  const overallPct = dersler.length > 0 ? Math.round((completedCount / dersler.length) * 100) : 0;

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
              onPress={() => setPopupId(ders.id)}
            />
            {i < nodes.length - 1 && (
              <View style={[s.hLine, {
                backgroundColor: statuses[origIdx] === "completed" ? "#059669" : "#e5e7eb",
              }]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  }

  const popupDers = dersler.find(d => d.id === popupId) ?? null;

  return (
    <>
      <Stack.Screen options={{ title: "Elifba" }} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>

        {/* Üst sekme bar — her zaman görünür */}
        <View style={[s.tabRow, { paddingTop: insets.top, borderBottomColor: c.border }]}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.tabBtn, active && s.tabBtnActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, { color: active ? "#0a1628" : c.textMuted }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Elif-Ba içeriği */}
        {tab === "elifba" && (
          loading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color="#059669" />
            </View>
          ) : (error || dersler.length === 0) ? (
            <View style={s.centered}>
              <Text style={s.errEmoji}>📚</Text>
              <Text style={[s.errText, { color: c.text }]}>
                {error ? "Dersler yüklenemedi.\nBağlantını kontrol et." : "Henüz ders bulunamadı."}
              </Text>
              <TouchableOpacity style={[s.retryBtn, { backgroundColor: c.accent }]} onPress={loadDersler}>
                <Text style={s.retryText}>Tekrar dene</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={[s.scroll, { backgroundColor: c.bg }]} contentContainerStyle={[s.content, { paddingBottom: 48 + insets.bottom }]}>

                {/* Genel ilerleme */}
                <View style={[s.overallCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={[s.overallTitle, { color: c.text }]}>🏆 İlerleme</Text>
                    <Text style={[s.overallCount, { color: c.accent }]}>{completedCount} / {dersler.length} ders</Text>
                  </View>
                  <View style={s.overallBar}>
                    <View style={[s.overallFill, { width: `${overallPct}%` as any }]} />
                  </View>
                  {overallPct === 100 && (
                    <Text style={s.overallDone}>🎉 Tüm dersler tamamlandı!</Text>
                  )}
                </View>

                {/* Yol haritası — dinamik, yılan şeklinde */}
                <View style={s.path}>
                  {rows.map((row, rowIdx) => (
                    <React.Fragment key={rowIdx}>
                      {renderRow(row)}
                      {rowIdx < rows.length - 1 && (
                        <VLineRow
                          side={rowIdx % 2 === 0 ? "right" : "left"}
                          color={statuses[Math.min((rowIdx + 1) * COLS - 1, dersler.length - 1)] === "completed" ? "#059669" : "#e5e7eb"}
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
                      pathname: "/ogren/[dersId]",
                      params: { dersId: String(popupDers.id), baslik: shortBaslik(popupDers.baslik) },
                    });
                  }}
                  onQuiz={() => {
                    setPopupId(null);
                    router.push({
                      pathname: "/ogren/[dersId]",
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
  tabRow:      { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn:      { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive:{ borderBottomWidth: 2, borderBottomColor: "#c9a84c" },
  tabText:     { fontSize: 14, fontWeight: "700" },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errEmoji:    { fontSize: 40, marginBottom: 12 },
  errText:     { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 20 },
  retryBtn:    { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
  retryText:   { color: "#fff", fontSize: 14, fontWeight: "700" },
  scroll:      { flex: 1 },
  content:     { padding: 16, paddingBottom: 48 },
  overallCard: { borderRadius: 14, padding: 14, marginBottom: 24, borderWidth: 1 },
  overallTitle: { fontSize: 14, fontWeight: "700" },
  overallCount: { fontSize: 13, fontWeight: "600" },
  overallBar:   { height: 10, backgroundColor: "#f5f0e8", borderRadius: 5, overflow: "hidden" },
  overallFill:  { height: "100%", backgroundColor: "#059669", borderRadius: 5 },
  overallDone:  { textAlign: "center", fontSize: 12, fontWeight: "700", color: "#059669", marginTop: 6 },
  path:  { paddingVertical: 4 },
  row:   { flexDirection: "row", alignItems: "flex-start" },
  hLine: { flex: 1, height: 3, marginTop: 25, borderRadius: 2 },
});

const nd = StyleSheet.create({
  wrap:    { width: NODE_W, alignItems: "center", paddingVertical: 4 },
  circle:  {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  icon:    { fontSize: 20 },
  barBg:   { width: 44, height: 3, backgroundColor: "#f5f0e8", borderRadius: 2, marginTop: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  label:   { fontSize: 9, fontWeight: "600", textAlign: "center", marginTop: 4, lineHeight: 13, paddingHorizontal: 2 },
});

const pp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 16 },
  card:    {
    width: "100%", maxWidth: 360 as any, backgroundColor: "#fff",
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#e7e5e4",
  },
  title:     { fontSize: 15, fontWeight: "700", color: "#1c1917" },
  badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  label:     { fontSize: 12, color: "#78716c", marginBottom: 4 },
  bar:       { height: 6, backgroundColor: "#f5f0e8", borderRadius: 3, overflow: "hidden" },
  fill:      { height: "100%", backgroundColor: "#059669", borderRadius: 3 },
  infoBox:   { borderRadius: 10, padding: 10 },
  btnGreen:  { flex: 1, backgroundColor: "#059669", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  btnIndigo: { flex: 1, backgroundColor: "#4f46e5", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  btnText:   { color: "#fff", fontSize: 13, fontWeight: "700" },
});
