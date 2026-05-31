import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { router, Stack } from "expo-router";
import { api, type ElifbaDers } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";

const QUIZ_PASS = 3;
const NODE_W   = 72;

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

          {/* Başlık */}
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

          {/* Kart ilerlemesi */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={pp.label}>Kartlar: {seenCount} / {ders.harf_sayisi}</Text>
            {pct === 100 && <Text style={[pp.label, { color: "#059669", fontWeight: "700" }]}>✓</Text>}
          </View>
          <View style={pp.bar}><View style={[pp.fill, { width: `${pct}%` as any }]} /></View>

          {/* Test skoru */}
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
                💡 Dersi tamamlamak için teste gir ve en az {QUIZ_PASS}/5 al.
              </Text>
            </View>
          ) : null}

          {/* Kilitli uyarısı */}
          {status === "locked" && (
            <View style={[pp.infoBox, { backgroundColor: "#f5f5f4", marginTop: 8 }]}>
              <Text style={{ fontSize: 12, color: "#78716c" }}>🔒 Önceki dersi tamamla</Text>
            </View>
          )}

          {/* Butonlar */}
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
      {/* İlerleme çubuğu */}
      {!isLocked && (
        <View style={nd.barBg}>
          <View style={[nd.barFill, {
            width: `${pct}%` as any,
            backgroundColor: isComp ? "#059669" : "#f59e0b",
          }]} />
        </View>
      )}
      {/* Etiket */}
      <Text style={[nd.label, { color: isLocked ? "#9ca3af" : "#44403c" }]} numberOfLines={2}>
        {shortBaslik(ders.baslik).split(" ").slice(0, 3).join(" ")}
      </Text>
    </TouchableOpacity>
  );
}

// ── VLine (dikey bağlantı) ────────────────────────────────────────────────────
// Satır yapısını aynalamak için: [NODE_W][flex][NODE_W][flex][NODE_W]

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
  const [dersler, setDersler]       = useState<ElifbaDers[]>([]);
  const [loading, setLoading]       = useState(true);
  const [progress, setProgress]     = useState<Record<string, number[]>>({});
  const [quizScores, setQuizScores] = useState<Record<string, QuizScore>>({});
  const [popupId, setPopupId]       = useState<number | null>(null);

  useEffect(() => {
    api.elifba.dersler()
      .then(setDersler).catch(() => {}).finally(() => setLoading(false));
    storage.getJSON<Record<string, number[]>>(STORAGE_KEYS.elifbaProgress)
      .then(p => setProgress(p ?? {})).catch(() => {});
    storage.getJSON<Record<string, QuizScore>>(STORAGE_KEYS.quizScores)
      .then(q => setQuizScores(q ?? {})).catch(() => {});
  }, []);

  if (loading) {
    return (
      <View style={s.centered}>
        <Stack.Screen options={{ title: "Elif-Ba Öğren" }} />
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const statuses = dersler.map((d, i) => getStatus(d, i, dersler, progress, quizScores));
  const completedCount = statuses.filter(st => st === "completed").length;
  const overallPct = dersler.length > 0 ? Math.round((completedCount / dersler.length) * 100) : 0;

  function getPct(ders: ElifbaDers) {
    const seen = progress[String(ders.id)]?.length ?? 0;
    return ders.harf_sayisi > 0 ? Math.round((seen / ders.harf_sayisi) * 100) : 0;
  }

  const row1 = [dersler[0], dersler[1], dersler[2]].filter(Boolean);
  const row2 = [dersler[5], dersler[4], dersler[3]].filter(Boolean);
  const row3 = [dersler[6], dersler[7], dersler[8]].filter(Boolean);

  function renderRow(nodes: ElifbaDers[]) {
    return (
      <View style={s.row}>
        {nodes.map((ders, i) => (
          <React.Fragment key={ders.id}>
            <PathNode
              ders={ders}
              status={statuses[dersler.indexOf(ders)]}
              pct={getPct(ders)}
              onPress={() => setPopupId(ders.id)}
            />
            {i < nodes.length - 1 && (
              <View style={[s.hLine, {
                backgroundColor: statuses[dersler.indexOf(nodes[i])] === "completed"
                  ? "#059669" : "#e5e7eb",
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
      <Stack.Screen options={{ title: "Elif-Ba Öğren" }} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Genel ilerleme */}
        <View style={s.overallCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={s.overallTitle}>🏆 İlerleme</Text>
            <Text style={s.overallCount}>{completedCount} / {dersler.length} ders</Text>
          </View>
          <View style={s.overallBar}>
            <View style={[s.overallFill, { width: `${overallPct}%` as any }]} />
          </View>
          {overallPct === 100 && (
            <Text style={s.overallDone}>🎉 Tüm dersler tamamlandı!</Text>
          )}
        </View>

        {/* Yol haritası */}
        <View style={s.path}>
          {row1.length > 0 && renderRow(row1)}
          {row2.length > 0 && (
            <VLineRow side="right" color={statuses[2] === "completed" ? "#059669" : "#e5e7eb"} />
          )}
          {row2.length > 0 && renderRow(row2)}
          {row3.length > 0 && (
            <VLineRow side="left" color={statuses[5] === "completed" ? "#059669" : "#e5e7eb"} />
          )}
          {row3.length > 0 && renderRow(row3)}
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
            router.push(`/ogren/${popupDers.id}`);
          }}
          onQuiz={() => {
            setPopupId(null);
            router.push({
              pathname: "/ogren/[dersId]",
              params: { dersId: String(popupDers.id), mode: "quiz" },
            });
          }}
        />
      )}
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f1e4" },
  scroll:      { flex: 1, backgroundColor: "#f7f1e4" },
  content:     { padding: 16, paddingBottom: 48 },
  overallCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 24, borderWidth: 1, borderColor: "#e7e5e4",
  },
  overallTitle: { fontSize: 14, fontWeight: "700", color: "#1c1917" },
  overallCount: { fontSize: 13, fontWeight: "600", color: "#059669" },
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
