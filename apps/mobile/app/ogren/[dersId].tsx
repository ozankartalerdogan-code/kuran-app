import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, type ElifbaHarf, type ElifbaQuizSoru } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
// expo-av yeni APK build gerektiriyor — şimdilik placeholder
async function playHarfSes(_harfId: number) {
  // Yeni APK build'inde expo-av ile aktif edilecek
}

// ── Flashcard ─────────────────────────────────────────────────────────────────

function Flashcard({ harf, onNext, onPrev }: { harf: ElifbaHarf; onNext: () => void; onPrev: () => void }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [harf.harf_id]);

  return (
    <View style={fc.container}>
      {/* Ses butonu */}
      <TouchableOpacity
        style={fc.playBtn}
        onPress={() => playHarfSes(harf.harf_id)}
        activeOpacity={0.7}
      >
        <Text style={fc.playIcon}>🔊</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={flipped ? fc.cardBack : fc.cardFront}
        onPress={() => setFlipped((f) => !f)}
        activeOpacity={0.85}
      >
        {!flipped ? (
          <>
            <Text style={fc.arabicChar}>{harf.tek_basina}</Text>
            <Text style={fc.hint}>Dokunarak çevir</Text>
          </>
        ) : (
          <ScrollView contentContainerStyle={fc.backContent}>
            <Text style={fc.arabicSmall}>{harf.tek_basina}</Text>
            <Text style={fc.harfAdi}>{harf.harf_adi}</Text>
            <Text style={fc.harfSesi}>{harf.harf_sesi}</Text>
            <View style={fc.formsRow}>
              {[["BAŞTA", harf.basta], ["ORTADA", harf.ortada], ["SONDA", harf.sonda]].map(([l, v]) => (
                <View key={l} style={fc.formBox}>
                  <Text style={fc.formLabel}>{l}</Text>
                  <Text style={fc.formChar}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={fc.mahrec}>Mahreç: {harf.mahrec}</Text>
            <View style={fc.badges}>
              <View style={[fc.badge, { backgroundColor: harf.kalin_ince === "kalın" ? "#fef3c7" : "#dbeafe" }]}>
                <Text style={fc.badgeText}>{harf.kalin_ince}</Text>
              </View>
              <View style={[fc.badge, { backgroundColor: "#f0fdf4" }]}>
                <Text style={fc.badgeText}>{harf.grup}</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </TouchableOpacity>
      <View style={fc.navRow}>
        <TouchableOpacity style={fc.navBtn} onPress={onPrev}>
          <Text style={fc.navBtnText}>← Önceki</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[fc.navBtn, fc.navBtnActive]} onPress={onNext}>
          <Text style={[fc.navBtnText, { color: "#fff" }]}>Sonraki →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizView({ dersId, onFinish }: { dersId: number; onFinish: (s: number, t: number) => void }) {
  const [sorular, setSorular] = useState<ElifbaQuizSoru[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx]         = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore]     = useState(0);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    api.elifba.quiz(dersId).then(setSorular).catch(() => {}).finally(() => setLoading(false));
  }, [dersId]);

  const soru = sorular[idx];

  function handleSelect(s: string) {
    if (answered) return;
    setSelected(s);
    setAnswered(true);
    if (s === soru?.dogru_cevap) setScore((p) => p + 1);
  }

  function handleNext() {
    if (idx + 1 >= sorular.length) { setDone(true); onFinish(score + (selected === soru?.dogru_cevap ? 1 : 0), sorular.length); }
    else { setIdx((i) => i + 1); setSelected(null); setAnswered(false); }
  }

  if (loading) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;
  if (sorular.length === 0) return <Text style={qv.noQ}>Bu ders için soru bulunamadı.</Text>;
  if (done) {
    const pct = Math.round((score / sorular.length) * 100);
    return (
      <View style={qv.done}>
        <Text style={qv.doneEmoji}>{pct >= 60 ? "🎉" : "📚"}</Text>
        <Text style={qv.doneTitle}>{pct >= 80 ? "Harika!" : pct >= 60 ? "İyi!" : "Tekrar dene!"}</Text>
        <Text style={qv.doneSub}>{score}/{sorular.length} doğru · %{pct}</Text>
        <TouchableOpacity style={qv.doneBtn} onPress={() => onFinish(score, sorular.length)}>
          <Text style={qv.doneBtnText}>Derslere dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isArabic = (t: string) => /[؀-ۿ]/.test(t);

  return (
    <View style={qv.container}>
      <Text style={qv.progress}>Soru {idx + 1}/{sorular.length} · {score} doğru</Text>
      <View style={qv.soruBox}>
        <Text style={[qv.soruText, isArabic(soru.soru) && qv.soruArabic, isArabic(soru.soru) && { textAlign: "right", writingDirection: "rtl" as const }]}>
          {soru.soru}
        </Text>
      </View>
      <View style={qv.options}>
        {soru.secenekler.map((s) => {
          const isRight    = s === soru.dogru_cevap;
          const isSelected = s === selected;
          let bg = "#fff";
          if (answered) {
            if (isRight) bg = "#dcfce7";
            else if (isSelected) bg = "#fee2e2";
          }
          return (
            <TouchableOpacity
              key={s}
              style={[qv.option, { backgroundColor: bg }]}
              onPress={() => handleSelect(s)}
              disabled={answered}
              activeOpacity={0.75}
            >
              <Text style={[qv.optionText, isArabic(s) && { fontSize: 20, textAlign: "center" }]}>
                {answered && isRight ? "✓ " : ""}{s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && soru.ipucu && selected !== soru.dogru_cevap && (
        <View style={qv.ipucu}>
          <Text style={qv.ipucuText}>💡 {soru.ipucu}</Text>
        </View>
      )}
      {answered && (
        <TouchableOpacity style={qv.nextBtn} onPress={handleNext}>
          <Text style={qv.nextBtnText}>{idx + 1 >= sorular.length ? "Sonuçları Gör" : "Sonraki →"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Mode = "flashcard" | "quiz";

export default function DersScreen() {
  const { dersId: raw, mode: initialMode } = useLocalSearchParams<{ dersId: string; mode?: string }>();
  const dersId = Number(raw);

  const [harfler, setHarfler]   = useState<ElifbaHarf[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState<Mode>(initialMode === "quiz" ? "quiz" : "flashcard");
  const [idx, setIdx]           = useState(0);
  const [seenIds, setSeenIds]   = useState<number[]>([]);

  useEffect(() => {
    api.elifba.harfler(dersId)
      .then((h) => { setHarfler(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // Kaydedilmiş ilerlemeyi yükle
    storage.getJSON<Record<string, number[]>>(STORAGE_KEYS.elifbaProgress)
      .then((p) => setSeenIds(p?.[String(dersId)] ?? []))
      .catch(() => {});
  }, [dersId]);

  const markSeen = useCallback(async (harfId: number) => {
    setSeenIds((prev) => {
      if (prev.includes(harfId)) return prev;
      const next = [...prev, harfId];
      storage.getJSON<Record<string, number[]>>(STORAGE_KEYS.elifbaProgress).then((p) => {
        const updated = { ...(p ?? {}), [String(dersId)]: next };
        storage.setJSON(STORAGE_KEYS.elifbaProgress, updated).catch(() => {});
      });
      return next;
    });
  }, [dersId]);

  const handleNext = useCallback(() => {
    if (harfler[idx]) markSeen(harfler[idx].harf_id);
    setIdx((i) => (i + 1) % harfler.length);
  }, [harfler, idx, markSeen]);

  const handlePrev = useCallback(() => {
    if (harfler[idx]) markSeen(harfler[idx].harf_id);
    setIdx((i) => (i - 1 + harfler.length) % harfler.length);
  }, [harfler, idx, markSeen]);

  const handleQuizFinish = useCallback(async (s: number, t: number) => {
    const prev = await storage.getJSON<Record<string, { score: number; total: number }>>(STORAGE_KEYS.quizScores) ?? {};
    await storage.setJSON(STORAGE_KEYS.quizScores, { ...prev, [String(dersId)]: { score: s, total: t } });
    router.back();
  }, [dersId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Ders" }} />
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const title = `Ders ${dersId}`;
  const pct   = harfler.length > 0 ? Math.round((seenIds.length / harfler.length) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={styles.container}>
        {/* Mod seçici */}
        <View style={styles.modeBar}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "flashcard" && styles.modeBtnActive]}
            onPress={() => setMode("flashcard")}
          >
            <Text style={[styles.modeBtnText, mode === "flashcard" && styles.modeBtnTextActive]}>
              📇 Kartlar ({pct}%)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "quiz" && styles.modeBtnActive]}
            onPress={() => setMode("quiz")}
          >
            <Text style={[styles.modeBtnText, mode === "quiz" && styles.modeBtnTextActive]}>
              🧠 Test
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "flashcard" ? (
          harfler.length > 0 ? (
            <>
              <Text style={styles.counter}>{idx + 1} / {harfler.length}</Text>
              <Flashcard harf={harfler[idx]} onNext={handleNext} onPrev={handlePrev} />
              {/* Nokta navigasyonu */}
              {harfler.length <= 30 && (
                <View style={styles.dots}>
                  {harfler.map((h, i) => (
                    <TouchableOpacity
                      key={h.harf_id}
                      onPress={() => {
                        if (harfler[idx]) markSeen(harfler[idx].harf_id);
                        setIdx(i);
                      }}
                      style={[
                        styles.dot,
                        i === idx
                          ? styles.dotActive
                          : seenIds.includes(h.harf_id)
                            ? styles.dotSeen
                            : styles.dotEmpty,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.noData}>Bu ders için harf verisi bulunamadı.</Text>
            </View>
          )
        ) : (
          <QuizView dersId={dersId} onFinish={handleQuizFinish} />
        )}
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f5f0e8" },
  centered:  { flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#f5f0e8" },
  noData:    { color:"#78716c", fontSize:14 },
  modeBar:   { flexDirection:"row", margin:12, gap:8 },
  modeBtn:   { flex:1, paddingVertical:10, borderRadius:10, backgroundColor:"#fff", borderWidth:1, borderColor:"#e7e5e4", alignItems:"center" },
  modeBtnActive: { backgroundColor:"#059669", borderColor:"#059669" },
  modeBtnText:   { fontSize:13, fontWeight:"600", color:"#44403c" },
  modeBtnTextActive: { color:"#fff" },
  counter:   { textAlign:"center", fontSize:12, color:"#a8a29e", marginBottom:4 },
  dots:      { flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:7, paddingHorizontal:16, marginTop:14 },
  dot:       { width:10, height:10, borderRadius:5 },
  dotActive: { backgroundColor:"#059669", transform:[{ scale:1.35 }] },
  dotSeen:   { backgroundColor:"#a7f3d0" },
  dotEmpty:  { backgroundColor:"#d6d3d1" },
});

const fc = StyleSheet.create({
  container:   { flex:1, padding:16, alignItems:"center" },
  playBtn:     { alignSelf:"flex-end", padding:10, marginBottom:4 },
  playIcon:    { fontSize:28 },
  cardFront: {
    width:"100%", minHeight:220, backgroundColor:"#fff", borderRadius:20, borderWidth:1, borderColor:"#e7e5e4",
    alignItems:"center", justifyContent:"center", padding:24,
    shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3,
  },
  cardBack: {
    width:"100%", minHeight:220, backgroundColor:"#f0fdf4", borderRadius:20, borderWidth:1.5, borderColor:"#86efac",
    padding:20, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3,
  },
  backContent: { alignItems:"center", gap:8 },
  arabicChar:  { fontSize:96, color:"#1c1917" },
  arabicSmall: { fontSize:48, color:"#1c1917" },
  hint:        { fontSize:12, color:"#a8a29e", marginTop:8 },
  harfAdi:     { fontSize:22, fontWeight:"700", color:"#065f46" },
  harfSesi:    { fontSize:15, color:"#059669" },
  formsRow:    { flexDirection:"row", gap:12, marginTop:4 },
  formBox:     { alignItems:"center", backgroundColor:"#fff", borderRadius:10, padding:10, minWidth:60 },
  formLabel:   { fontSize:9, fontWeight:"700", color:"#a8a29e", letterSpacing:0.5, marginBottom:4 },
  formChar:    { fontSize:22, color:"#1c1917" },
  mahrec:      { fontSize:12, color:"#78716c", textAlign:"center" },
  badges:      { flexDirection:"row", gap:8 },
  badge:       { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  badgeText:   { fontSize:11, fontWeight:"600", color:"#44403c" },
  navRow:        { flexDirection:"row", gap:10, marginTop:16, width:"100%" },
  navBtn:        { flex:1, borderRadius:12, paddingVertical:13, borderWidth:1, borderColor:"#e7e5e4", backgroundColor:"#fff", alignItems:"center" },
  navBtnActive:  { backgroundColor:"#059669", borderColor:"#059669" },
  navBtnText:    { fontSize:14, fontWeight:"700", color:"#44403c" },
});

const qv = StyleSheet.create({
  container:   { flex:1, padding:16 },
  noQ:         { textAlign:"center", marginTop:40, color:"#78716c" },
  progress:    { fontSize:12, color:"#a8a29e", textAlign:"center", marginBottom:12 },
  soruBox:     { backgroundColor:"#fff", borderRadius:14, padding:20, marginBottom:12, borderWidth:1, borderColor:"#e7e5e4" },
  soruText:    { fontSize:15, lineHeight:24, color:"#1c1917" },
  soruArabic:  { fontSize:24, textAlign:"right" },
  options:     { gap:8, marginBottom:10 },
  option:      { borderRadius:12, padding:14, borderWidth:1, borderColor:"#e7e5e4" },
  optionText:  { fontSize:14, color:"#1c1917" },
  ipucu:       { backgroundColor:"#fef9c3", borderRadius:10, padding:12, marginBottom:10 },
  ipucuText:   { fontSize:13, color:"#854d0e", lineHeight:20 },
  nextBtn:     { backgroundColor:"#059669", borderRadius:12, padding:14, alignItems:"center", marginTop:4 },
  nextBtnText: { color:"#fff", fontSize:14, fontWeight:"700" },
  done:        { flex:1, alignItems:"center", justifyContent:"center", gap:12, padding:32 },
  doneEmoji:   { fontSize:56 },
  doneTitle:   { fontSize:22, fontWeight:"700", color:"#1c1917" },
  doneSub:     { fontSize:15, color:"#78716c" },
  doneBtn:     { backgroundColor:"#059669", borderRadius:12, paddingHorizontal:32, paddingVertical:13, marginTop:8 },
  doneBtnText: { color:"#fff", fontSize:14, fontWeight:"700" },
});
