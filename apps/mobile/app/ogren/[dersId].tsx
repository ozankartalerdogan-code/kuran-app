import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('lottie-react-native').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UIManager } = require('react-native');
  if (UIManager.hasViewManagerConfig?.('LottieAnimationView')) LottieView = mod;
} catch (_e) { /* noop */ }
import { logScreen } from '../../src/lib/analytics';
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { api, type ElifbaHarf, type ElifbaQuizSoru } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import {
  parseElifbaProgress,
  parseElifbaQuizScores,
  type ElifbaProgress,
} from "../../src/lib/elifbaProgress";
import { AUDIO_BASE_URL } from "../../src/lib/runtimeConfig";

const AUDIO_BASE = AUDIO_BASE_URL;

function harfSesUrl(harfId: number): string {
  return `${AUDIO_BASE}/audio/elifba/harf_${String(harfId).padStart(2, "0")}.mp3`;
}

let harfPlayer: AudioPlayer | null = null;
let audioModeSet = false;

async function playHarfSes(harfId: number) {
  try {
    if (!audioModeSet) {
      await setAudioModeAsync({ playsInSilentMode: true });
      audioModeSet = true;
    }
    if (harfPlayer) {
      try { harfPlayer.remove(); } catch { /* yoksay */ }
    }
    harfPlayer = createAudioPlayer(harfSesUrl(harfId));
    harfPlayer.play();
  } catch {
    // ses çalınamazsa sessizce geç
  }
}

// ── Flashcard ─────────────────────────────────────────────────────────────────

function Flashcard({ harf, onNext, onPrev, isLast }: {
  harf: ElifbaHarf; onNext: () => void; onPrev: () => void; isLast: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const cardLabel = flipped
    ? `${harf.harf_adi} harfi. Ses: ${harf.harf_sesi}. Mahreç: ${harf.mahrec}`
    : `${harf.harf_adi} harf kartı`; 

  useEffect(() => setFlipped(false), [harf.harf_id]);

  return (
    <View style={fc.container}>
      <TouchableOpacity
        style={fc.playBtn}
        onPress={() => playHarfSes(harf.harf_id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${harf.harf_adi} harfinin sesini dinle`}
      >
        <Text style={fc.playIcon}>🔊</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={flipped ? fc.cardBack : fc.cardFront}
        onPress={() => setFlipped((f) => !f)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={cardLabel}
        accessibilityHint="Kartı çevirmek için dokun"
        accessibilityState={{ expanded: flipped }}
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
        <TouchableOpacity
          style={fc.navBtn}
          onPress={onPrev}
          accessibilityRole="button"
          accessibilityLabel="Önceki harfe geç"
        >
          <Text style={fc.navBtnText}>← Önceki</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[fc.navBtn, fc.navBtnActive]}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Teste geç" : "Sonraki harfe geç"}
        >
          <Text style={[fc.navBtnText, { color: "#fff" }]}>
            {isLast ? "✓ Teste Geç" : "Sonraki →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function normalizeQuizSorular(data: ElifbaQuizSoru[]): ElifbaQuizSoru[] {
  return data
    .map((soru) => {
      const secenekler = Array.isArray(soru.secenekler)
        ? soru.secenekler.filter((secenek): secenek is string => typeof secenek === "string" && secenek.trim().length > 0)
        : [];
      const uniqueSecenekler = Array.from(new Set(secenekler));
      if (!soru.soru || !soru.dogru_cevap || !uniqueSecenekler.includes(soru.dogru_cevap)) return null;
      return { ...soru, secenekler: uniqueSecenekler };
    })
    .filter((soru): soru is ElifbaQuizSoru => soru !== null);
}

function QuizView({ dersId, onFinish }: { dersId: number; onFinish: (s: number, t: number) => void }) {
  const [sorular, setSorular] = useState<ElifbaQuizSoru[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [idx, setIdx]         = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore]     = useState(0);
  const [done, setDone]       = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const loadQuiz = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(false);
    setIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setShowConfetti(false);
    api.elifba.quiz(dersId)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        const arr = normalizeQuizSorular(data);
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        setSorular(arr.slice(0, 15));
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setError(true);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false);
      });
  }, [dersId]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
  }, []);

  const soru = sorular[idx];

  function handleSelect(s: string) {
    if (answered) return;
    setSelected(s);
    setAnswered(true);
    if (s === soru?.dogru_cevap) {
      setScore((p) => p + 1);
      setShowConfetti(true);
      confettiTimer.current = setTimeout(() => setShowConfetti(false), 1500);
    }
  }

  function handleNext() {
    if (idx + 1 >= sorular.length) setDone(true);
    else { setIdx((i) => i + 1); setSelected(null); setAnswered(false); }
  }

  if (loading) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;
  if (error) return (
    <View style={qv.errBox}>
      <Text style={qv.errEmoji}>📚</Text>
      <Text style={qv.noQ}>Sorular yüklenemedi.{"\n"}Bağlantını kontrol et.</Text>
      <TouchableOpacity
        style={qv.retryBtn}
        onPress={loadQuiz}
        accessibilityRole="button"
        accessibilityLabel="Elifba sorularını tekrar yükle"
      >
        <Text style={qv.retryText}>Tekrar dene</Text>
      </TouchableOpacity>
    </View>
  );
  if (sorular.length === 0) return <Text style={qv.noQ}>Bu ders için soru bulunamadı.</Text>;
  if (done) {
    const pct = Math.round((score / sorular.length) * 100);
    return (
      <View style={qv.done}>
        <Text style={qv.doneEmoji}>{pct >= 60 ? "🎉" : "📚"}</Text>
        <Text style={qv.doneTitle}>{pct >= 80 ? "Harika!" : pct >= 60 ? "İyi!" : "Tekrar dene!"}</Text>
        <Text style={qv.doneSub}>{score}/{sorular.length} doğru · %{pct}</Text>
        <TouchableOpacity
          style={qv.doneBtn}
          onPress={() => onFinish(score, sorular.length)}
          accessibilityRole="button"
          accessibilityLabel="Derslere dön"
        >
          <Text style={qv.doneBtnText}>Derslere dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isArabic = (t: string) => /[؀-ۿ]/.test(t);
  const isPureArabic = (t: string) => isArabic(t) && !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(t);

  function renderSoru(text: string) {
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    const arabicLines = lines.filter((l) => isPureArabic(l));
    const otherLines  = lines.filter((l) => !isPureArabic(l));
    return (
      <>
        {arabicLines.map((line, i) => (
          <Text key={`ar-${i}`} style={qv.soruArabicLine}>{line}</Text>
        ))}
        {otherLines.map((line, i) => (
          <Text key={`tr-${i}`} style={qv.soruText}>{line}</Text>
        ))}
      </>
    );
  }

  return (
    <View style={qv.container}>
      <Text style={qv.progress}>Soru {idx + 1}/{sorular.length} · {score} doğru</Text>
      <View style={qv.soruBox}>
        {renderSoru(soru.soru)}
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
              accessibilityRole="button"
              accessibilityLabel={`Cevap seçeneği: ${s}`}
              accessibilityState={{ disabled: answered, selected: isSelected }}
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
        <TouchableOpacity
          style={qv.nextBtn}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={idx + 1 >= sorular.length ? "Sonuçları gör" : "Sonraki soruya geç"}
        >
          <Text style={qv.nextBtnText}>{idx + 1 >= sorular.length ? "Sonuçları Gör" : "Sonraki →"}</Text>
        </TouchableOpacity>
      )}
      {showConfetti && LottieView && (
        <View style={qv.confettiWrap} pointerEvents="none">
          <LottieView
            source={require('../../assets/Success-celebration.json')}
            autoPlay
            loop={false}
            style={qv.confetti}
          />
        </View>
      )}
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Mode = "flashcard" | "quiz";

export default function DersScreen() {
  const { dersId: raw, mode: initialMode, baslik: rawBaslik } = useLocalSearchParams<{
    dersId: string; mode?: string; baslik?: string;
  }>();
  const dersId = Number(raw);
  const insets = useSafeAreaInsets();
  useEffect(() => { logScreen('ElifBaDers'); }, []);

  // Harf sesi modül seviyesinde tutuluyor (playHarfSes); ekrandan çıkarken
  // hâlâ çalıyorsa durdur — aksi halde başka bir ekrana geçince de öter.
  useEffect(() => {
    return () => {
      if (harfPlayer) {
        try { harfPlayer.remove(); } catch { /* yoksay */ }
        harfPlayer = null;
      }
    };
  }, []);

  const [harfler, setHarfler]   = useState<ElifbaHarf[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState<Mode>(initialMode === "quiz" ? "quiz" : "flashcard");
  const [idx, setIdx]           = useState(0);
  const [seenIds, setSeenIds]   = useState<number[]>([]);
  const progressRef             = useRef<ElifbaProgress>({});

  useEffect(() => {
    let isMounted = true;
    api.elifba.harfler(dersId)
      .then((h) => { if (isMounted) setHarfler(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaProgress)
      .then((rawProgress) => {
        if (isMounted) {
          const parsedProgress = parseElifbaProgress(rawProgress);
          progressRef.current = parsedProgress;
          setSeenIds(parsedProgress[String(dersId)] ?? []);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [dersId]);

  const markSeen = useCallback((harfId: number) => {
    setSeenIds((prev) => {
      if (prev.includes(harfId)) return prev;
      const next = [...prev, harfId];
      const updated = { ...progressRef.current, [String(dersId)]: next };
      progressRef.current = updated;
      storage.setJSON(STORAGE_KEYS.elifbaProgress, updated).catch(() => {});
      return next;
    });
  }, [dersId]);

  const handleNext = useCallback(() => {
    if (harfler[idx]) markSeen(harfler[idx].harf_id);
    if (idx + 1 < harfler.length) setIdx((i) => i + 1);
    else setMode("quiz");
  }, [harfler, idx, markSeen]);

  const handlePrev = useCallback(() => {
    if (idx === 0) return;
    if (harfler[idx]) markSeen(harfler[idx].harf_id);
    setIdx((i) => i - 1);
  }, [harfler, idx, markSeen]);

  const handleQuizFinish = useCallback(async (s: number, t: number) => {
    const prev = parseElifbaQuizScores(await storage.getJSON<unknown>(STORAGE_KEYS.quizScores));
    await storage.setJSON(STORAGE_KEYS.quizScores, { ...prev, [String(dersId)]: { score: s, total: t } }).catch(() => {});
    router.back();
  }, [dersId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: rawBaslik ?? "Ders" }} />
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const title = rawBaslik ?? `Ders ${dersId}`;
  const pct   = harfler.length > 0 ? Math.round((seenIds.length / harfler.length) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Mod seçici */}
        <View style={styles.modeBar}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "flashcard" && styles.modeBtnActive]}
            onPress={() => setMode("flashcard")}
            accessibilityRole="tab"
            accessibilityLabel={`Kartlar modu, ilerleme yüzde ${pct}`}
            accessibilityState={{ selected: mode === "flashcard" }}
          >
            <Text style={[styles.modeBtnText, mode === "flashcard" && styles.modeBtnTextActive]}>
              📇 Kartlar ({pct}%)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "quiz" && styles.modeBtnActive]}
            onPress={() => setMode("quiz")}
            accessibilityRole="tab"
            accessibilityLabel="Test modu"
            accessibilityState={{ selected: mode === "quiz" }}
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
              <Flashcard
                harf={harfler[idx]}
                onNext={handleNext}
                onPrev={handlePrev}
                isLast={idx === harfler.length - 1}
              />
              {harfler.length <= 30 && (
                <View style={styles.dots}>
                  {harfler.map((h, i) => (
                    <TouchableOpacity
                      key={h.harf_id}
                      onPress={() => {
                        if (harfler[idx]) markSeen(harfler[idx].harf_id);
                        setIdx(i);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.harf_adi} harfine git`}
                      accessibilityState={{ selected: i === idx }}
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
  arabicChar:  { fontSize:96, color:"#1c1917", fontFamily:"Amiri", writingDirection:"rtl" },
  arabicSmall: { fontSize:48, color:"#1c1917", fontFamily:"Amiri", writingDirection:"rtl" },
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
  noQ:         { textAlign:"center", marginTop:40, color:"#78716c", lineHeight:22 },
  errBox:      { flex:1, alignItems:"center", justifyContent:"center", padding:24 },
  errEmoji:    { fontSize:40, marginBottom:8 },
  retryBtn:    { backgroundColor:"#059669", paddingHorizontal:24, paddingVertical:11, borderRadius:10, marginTop:20 },
  retryText:   { color:"#fff", fontSize:14, fontWeight:"700" },
  progress:    { fontSize:12, color:"#a8a29e", textAlign:"center", marginBottom:12 },
  soruBox:        { backgroundColor:"#fff", borderRadius:14, padding:20, marginBottom:12, borderWidth:1, borderColor:"#e7e5e4", gap:10 },
  soruText:       { fontSize:15, lineHeight:24, color:"#1c1917" },
  soruArabic:     { fontSize:24, textAlign:"right", fontFamily:"Amiri", writingDirection:"rtl" },
  soruArabicLine: { fontSize:36, textAlign:"center", fontFamily:"Amiri", writingDirection:"rtl", color:"#1c1917", marginTop:4 },
  options:     { gap:8, marginBottom:10 },
  option:      { borderRadius:12, padding:14, borderWidth:1, borderColor:"#e7e5e4" },
  optionText:  { fontSize:14, color:"#1c1917" },
  ipucu:       { backgroundColor:"#fef9c3", borderRadius:10, padding:12, marginBottom:10 },
  ipucuText:   { fontSize:13, color:"#854d0e", lineHeight:20 },
  nextBtn:     { backgroundColor:"#059669", borderRadius:12, padding:14, alignItems:"center", marginTop:4 },
  nextBtnText: { color:"#fff", fontSize:14, fontWeight:"700" },
  confettiWrap:{ position:"absolute", top:120, left:16, right:16, height:220, alignItems:"center", justifyContent:"center" },
  confetti:    { width:220, height:220 },
  done:        { flex:1, alignItems:"center", justifyContent:"center", gap:12, padding:32 },
  doneEmoji:   { fontSize:56 },
  doneTitle:   { fontSize:22, fontWeight:"700", color:"#1c1917" },
  doneSub:     { fontSize:15, color:"#78716c" },
  doneBtn:     { backgroundColor:"#059669", borderRadius:12, paddingHorizontal:32, paddingVertical:13, marginTop:8 },
  doneBtnText: { color:"#fff", fontSize:14, fontWeight:"700" },
});
