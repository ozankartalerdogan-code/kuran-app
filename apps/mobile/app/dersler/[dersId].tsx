import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Dimensions, PanResponder, Animated,
} from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("lottie-react-native").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UIManager } = require("react-native");
  if (UIManager.hasViewManagerConfig?.("LottieAnimationView")) LottieView = mod;
} catch (_e) { /* noop */ }

import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "../../src/hooks/useColors";
import { useDersProgress } from "../../src/hooks/useDersProgress";
import { DERS_DATA, QUIZ_MAP, BASLIKLAR } from "../../src/data/Dersler/dersler_registry";
import { normalizeQuizSorular, type QuizSoru } from "../../src/lib/quizUtils";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { AyahLinkedText } from "../../src/components/AyahLinkedText";

const { width: SCREEN_W } = Dimensions.get("window");

// Quiz geçme eşiği: bu kadar doğru → ders "tamamlandı" sayılır + kutlama.
const QUIZ_PASS = 7;

// ─── Görsel haritası ──────────────────────────────────────────────────────

const GORSEL_MAP: Record<string, number> = {
  namaz_tekbir:   require("../../assets/images/namaz/tekbir.jpg"),
  namaz_kiyam:    require("../../assets/images/namaz/kıyam.jpg"),
  namaz_ruku:     require("../../assets/images/namaz/ruku.jpg"),
  namaz_kavme:    require("../../assets/images/namaz/kavme.jpg"),
  namaz_secde:    require("../../assets/images/namaz/secde.jpg"),
  namaz_celse:    require("../../assets/images/namaz/celse.jpg"),
  namaz_tesehhud: require("../../assets/images/namaz/tesehhüd.jpg"),
  namaz_selam:    require("../../assets/images/namaz/selam.jpg"),
};

// DERS_DATA, QUIZ_MAP, BASLIKLAR → dersler_registry.ts'ten import edildi

// ─── Tipler ───────────────────────────────────────────────────────────────

type Kart = {
  id: string;
  tip: "metin" | "gorsel";
  baslik: string;
  icerik: string;
  vurgu: string;
  gorsel?: string;
};

// ─── Yardımcı ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scoreEmoji(score: number, total: number) {
  const pct = score / total;
  if (pct >= 0.9) return "🏆";
  if (pct >= 0.7) return "🌟";
  if (pct >= 0.5) return "👍";
  return "📚";
}

// ─── Yakında ekranı ───────────────────────────────────────────────────────

function YakindaEkran({ baslik }: { baslik: string }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Geri">
          <Text style={s.accent}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
        <View style={s.headerSide} />
      </View>
      <View style={s.center}>
        <Text style={{ fontSize: 56 }}>📚</Text>
        <Text style={[s.placeholderText, { color: c.textMuted }]}>Kartlar yakında...</Text>
      </View>
    </View>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────

export default function DersDetayScreen() {
  const { dersId } = useLocalSearchParams<{ dersId: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const lessonNextTarget = useTourTarget("lesson.next");

  // Ders state
  const [dersIndex, setDersIndex] = useState(0);
  const dersScrollRef = useRef<ScrollView>(null);

  // Okuma modu
  const [readMode, setReadMode] = useState(false);

  // Quiz state
  const [quizMode, setQuizMode]                     = useState(false);
  const [quizQuestions, setQuizQuestions]           = useState<QuizSoru[]>([]);
  const [qIndex, setQIndex]                         = useState(0);
  const [selectedAnswer, setSelectedAnswer]         = useState<string | null>(null);
  const [showResult, setShowResult]                 = useState(false);
  const [score, setScore]                           = useState(0);
  const [quizFinished, setQuizFinished]             = useState(false);
  const [wrongAnswers, setWrongAnswers]             = useState<QuizSoru[]>([]);
  const quizOpacity = useRef(new Animated.Value(1)).current;
  const quizAnimStyle = { opacity: quizOpacity };

  const dersKey  = dersId ?? "";
  const dersData = DERS_DATA[dersKey];
  const quizData = QUIZ_MAP[dersKey];
  // Normalize bozuk soruları eler; hasQuiz gerçek kullanılabilir soru sayısına
  // bakar — aksi halde tümü bozuksa "Teste Başla" sessizce çalışmaz.
  const validQuiz = useMemo(
    () => (Array.isArray(quizData?.sorular) ? normalizeQuizSorular(quizData.sorular) : []),
    [quizData],
  );
  const hasQuiz  = validQuiz.length > 0;
  const baslik   = BASLIKLAR[dersKey] ?? dersKey;

  const { updateProgress, setQuizBitti } = useDersProgress();

  const navigateRef = useRef<(dir: 1 | -1) => void>(() => {});
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) navigateRef.current(1);
        else if (g.dx > 50) navigateRef.current(-1);
      },
    })
  ).current;

  useEffect(() => {
    if (dersKey && dersData) {
      const count = dersData.kartlar?.length ?? 0;
      if (count > 0) updateProgress(dersKey, 0, count);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dersKey]);

  if (!dersData) return <YakindaEkran baslik={baslik} />;

  // ── Ders verileri ──
  const kartlar: Kart[] = dersData.kartlar ?? [];
  const total    = kartlar.length;
  const kart     = kartlar[dersIndex] ?? kartlar[0];
  const isFirst  = dersIndex === 0;
  const isLast   = dersIndex === total - 1;
  const dersProgressW = (SCREEN_W - 32) * ((dersIndex + 1) / total);
  const gorselSrc = kart?.tip === "gorsel" && kart.gorsel ? (GORSEL_MAP[kart.gorsel] ?? null) : null;

  // ── Ders handlers ──
  const navigateDers = (dir: 1 | -1) => {
    const next = dersIndex + dir;
    if (next < 0 || next >= total) return;
    Haptics.selectionAsync();
    updateProgress(dersKey, next, total);
    setDersIndex(next);
    dersScrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  navigateRef.current = navigateDers;

  // ── Quiz handlers ──
  const startQuiz = () => {
    Haptics.selectionAsync();
    const shuffled = shuffle<QuizSoru>(validQuiz);
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
    setQIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
    setWrongAnswers([]);
    setReadMode(false);
    quizOpacity.setValue(1);
    setQuizMode(true);
  };

  const handleAnswerSelect = (harf: string) => {
    if (selectedAnswer) return;
    Haptics.selectionAsync();
    const q = quizQuestions[qIndex];
    setSelectedAnswer(harf);
    setShowResult(true);
    if (harf === q.dogru) {
      setScore(prev => prev + 1);
    } else {
      setWrongAnswers(prev => [...prev, q]);
    }
  };

  const nextQuestion = () => {
    Haptics.selectionAsync();
    if (qIndex + 1 >= quizQuestions.length) {
      // Sadece geçme eşiğini tutturan (QUIZ_PASS+) ders "tamamlandı" sayılır.
      if (score >= QUIZ_PASS) setQuizBitti(dersKey);
      setQuizFinished(true);
    } else {
      Animated.timing(quizOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setQIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        Animated.timing(quizOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const retryQuiz = () => {
    const shuffled = shuffle<QuizSoru>(validQuiz);
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
    setQIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
    setWrongAnswers([]);
    quizOpacity.setValue(1);
  };

  const returnToLesson = () => {
    setQuizMode(false);
    setQuizFinished(false);
  };

  // ═══════════════════════════════════════════════════════
  // OKUMA MODU
  // ═══════════════════════════════════════════════════════
  if (readMode) {
    return (
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[s.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Geri">
            <Text style={s.accent}>‹ Geri</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
          <TouchableOpacity onPress={() => setReadMode(false)} style={{ width: 72, alignItems: "flex-end" }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Kart moduna geç">
            <Text style={[s.accent, { fontSize: 12 }]}>Kart Modu</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[s.readContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {kartlar.map((k, i) => (
            <View key={k.id}>
              <Text style={[s.readBaslik, { color: c.text }]}>{k.baslik ?? ""}</Text>
              <AyahLinkedText style={[s.kartIcerik, { color: c.textSecondary }]}>{k.icerik ?? ""}</AyahLinkedText>
              <View style={[s.vurguBox, { backgroundColor: "rgba(201,168,76,0.10)", borderLeftColor: "#c9a84c", marginTop: 12 }]}>
                <Text style={s.vurguText}>✦  {k.vurgu ?? ""}</Text>
              </View>
              {i < kartlar.length - 1 && <View style={[s.readDivider, { backgroundColor: c.border }]} />}
            </View>
          ))}

          {hasQuiz && (
            <TouchableOpacity style={[s.nextBtn, { marginTop: 28 }]} onPress={startQuiz} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Teste başla">
              <Text style={s.nextBtnText}>Teste Başla</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // SONUÇ EKRANI
  // ═══════════════════════════════════════════════════════
  if (quizMode && quizFinished) {
    const qTotal    = quizQuestions.length;
    const pct       = Math.round((score / qTotal) * 100);
    const emoji     = scoreEmoji(score, qTotal);
    const barW      = (SCREEN_W - 64) * (score / qTotal);

    return (
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[s.header, { borderBottomColor: c.border }]}>
          <View style={s.headerSide} />
          <Text style={[s.headerTitle, { color: c.text }]}>Sonuç</Text>
          <View style={s.headerSide} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Skor */}
          <View style={[s.scoreCard, { backgroundColor: c.card }]}>
            {LottieView && score >= QUIZ_PASS ? (
              <LottieView
                source={require("../../assets/Success-celebration.json")}
                autoPlay
                loop={false}
                style={s.resultLottie}
              />
            ) : (
              <Text style={s.scoreEmoji}>{emoji}</Text>
            )}
            <Text style={[s.scoreText, { color: c.text }]}>
              {score} / {qTotal} doğru
            </Text>
            <Text style={[s.scorePct, { color: c.textMuted }]}>%{pct} başarı</Text>
            <View style={[s.scoreBarTrack, { backgroundColor: c.border }]}>
              <View style={[s.scoreBarFill, { width: barW }]} />
            </View>
          </View>

          {/* Yanlış sorular */}
          {wrongAnswers.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[s.wrongTitle, { color: c.textMuted }]}>
                Yanlış Cevapladıkların ({wrongAnswers.length})
              </Text>
              {wrongAnswers.map((q, i) => (
                <View key={q.id} style={[s.wrongCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[s.wrongQ, { color: c.text }]}>{i + 1}. {q.soru}</Text>
                  <Text style={s.wrongCorrect}>
                    ✓ Doğru cevap: {q.cevaplar.find(c => c.harf === q.dogru)?.metin}
                  </Text>
                  {q.aciklama ? (
                    <Text style={[s.wrongAciklama, { color: c.textMuted }]}>{q.aciklama}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Alt butonlar */}
        <View style={[s.navRow, { borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[s.prevBtn, { borderColor: c.border, flex: 1 }]}
            onPress={returnToLesson}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Derse dön"
          >
            <Text style={[s.prevBtnText, { color: c.text }]}>Derse Dön</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={retryQuiz} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Testi tekrar çöz">
            <Text style={s.nextBtnText}>Tekrar Çöz</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // QUIZ EKRANI
  // ═══════════════════════════════════════════════════════
  if (quizMode && quizQuestions.length > 0) {
    const question  = quizQuestions[qIndex];
    const qTotal    = quizQuestions.length;
    const qProgressW = (SCREEN_W - 32) * ((qIndex + 1) / qTotal);

    const answerBg = (harf: string) => {
      if (!showResult) return c.card;
      if (harf === question.dogru) return "#2d6a4f";
      if (harf === selectedAnswer) return "#6b2d2d";
      return c.card;
    };

    const answerTextColor = (harf: string) => {
      if (!showResult) return c.text;
      if (harf === question.dogru || harf === selectedAnswer) return "#ffffff";
      return c.textMuted;
    };

    const answerBorderColor = (harf: string) => {
      if (!showResult) return c.border;
      if (harf === question.dogru) return "#2d6a4f";
      if (harf === selectedAnswer) return "#6b2d2d";
      return c.border;
    };

    return (
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity
            style={[s.headerSide, { width: 96 }]}
            onPress={returnToLesson}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Derse dön"
          >
            <Text style={s.accent} numberOfLines={1}>← Derse Dön</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.text }]}>
            Soru {qIndex + 1}/{qTotal}
          </Text>
          <View style={s.headerSide} />
        </View>

        {/* Progress */}
        <View style={[s.progressTrack, { backgroundColor: c.border }]}>
          <View style={[s.progressFill, { width: qProgressW }]} />
        </View>

        {/* Soru kartı + şıklar — fade animasyonlu */}
        <Animated.View style={[s.quizBody, quizAnimStyle]}>
        <View style={s.quizQuestionContent}>
          <View style={s.questionCard}>
            <Text style={s.questionText}>{question.soru}</Text>
          </View>
          {showResult && question.aciklama ? (
            <View style={[s.aciklamaBox, { borderColor: "#c9a84c", backgroundColor: c.cardAlt }]}>
              <Text style={[s.aciklamaText, { color: c.textSecondary }]}>{question.aciklama}</Text>
            </View>
          ) : null}
        </View>

        {/* Şıklar */}
        <View style={[s.answersContainer, { paddingHorizontal: 20 }]}>
          {question.cevaplar.map((cevap) => (
            <TouchableOpacity
              key={cevap.harf}
              style={[
                s.answerBtn,
                {
                  backgroundColor: answerBg(cevap.harf),
                  borderColor: answerBorderColor(cevap.harf),
                  opacity: showResult && cevap.harf !== question.dogru && cevap.harf !== selectedAnswer ? 0.45 : 1,
                },
              ]}
              onPress={() => handleAnswerSelect(cevap.harf)}
              disabled={!!selectedAnswer}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!selectedAnswer, selected: selectedAnswer === cevap.harf }}
              accessibilityLabel={`${cevap.harf}: ${cevap.metin}`}
            >
              <View style={[s.answerHarf, { borderColor: answerBorderColor(cevap.harf) }]}>
                <Text style={[s.answerHarfText, { color: answerTextColor(cevap.harf) }]}>
                  {cevap.harf}
                </Text>
              </View>
              <Text style={[s.answerMetin, { color: answerTextColor(cevap.harf), flex: 1 }]}>
                {cevap.metin}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </Animated.View>

        {/* Sonraki — her zaman altta sabit, cevap seçilince aktifleşir */}
        <View style={[s.navRow, { borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[s.nextBtn, !showResult && { opacity: 0.35 }]}
            onPress={showResult ? nextQuestion : undefined}
            disabled={!showResult}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ disabled: !showResult }}
            accessibilityLabel={qIndex + 1 >= qTotal ? "Sonuçları gör" : "Sonraki soru"}
          >
            <Text style={s.nextBtnText}>
              {qIndex + 1 >= qTotal ? "Sonuçları Gör" : "Sonraki Soru →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // DERS EKRANI
  // ═══════════════════════════════════════════════════════
  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]} {...panResponder.panHandlers}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Geri">
          <Text style={s.accent}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
        <TouchableOpacity onPress={() => setReadMode(r => !r)} style={{ width: 72, alignItems: "flex-end" }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={readMode ? "Kart moduna geç" : "Tümünü oku"}>
          <Text style={[s.accent, { fontSize: 12 }]}>
            {readMode ? "Kart Modu" : "Tümünü Oku"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={[s.progressTrack, { backgroundColor: c.border }]}>
        <View style={[s.progressFill, { width: dersProgressW }]} />
      </View>

      {/* Kart başlığı — her zaman görünür */}
      <View style={s.kartBaslikBox}>
        <Text style={[s.kartBaslikBig, { color: c.text }]}>{kart?.baslik ?? ""}</Text>
      </View>

      {/* Kart içeriği */}
      <ScrollView
        ref={dersScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {gorselSrc && (
          <Image source={gorselSrc} style={s.gorselImg} resizeMode="contain" />
        )}
        <View style={[s.kartCard, { backgroundColor: c.card, borderColor: "#c9a84c" }]}>
          <AyahLinkedText style={[s.kartIcerik, { color: c.textSecondary }]}>{kart?.icerik ?? ""}</AyahLinkedText>
        </View>
      </ScrollView>

      {/* Vurgu — navRow üstünde her zaman sabit */}
      <View style={[s.vurguBox, { backgroundColor: "rgba(201, 168, 76, 0.12)", borderLeftColor: "#c9a84c", marginHorizontal: 20, marginBottom: 8 }]}>
        <Text style={s.vurguText}>✦  {kart?.vurgu ?? ""}</Text>
      </View>

      {/* Navigasyon */}
      <View style={[s.navRow, { borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[s.prevBtn, { borderColor: isFirst ? c.border : "#c9a84c" }]}
          onPress={() => navigateDers(-1)}
          disabled={isFirst}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Önceki kart"
          accessibilityState={{ disabled: isFirst }}
        >
          <Text style={[s.prevBtnText, { color: isFirst ? c.textMuted : "#c9a84c" }]}>← Önceki</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity
            style={[s.nextBtn, !hasQuiz && { opacity: 0.45 }]}
            onPress={hasQuiz ? startQuiz : undefined}
            disabled={!hasQuiz}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Teste başla"
            accessibilityState={{ disabled: !hasQuiz }}
          >
            <Text style={s.nextBtnText}>Teste Başla</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity {...lessonNextTarget} style={s.nextBtn} onPress={() => navigateDers(1)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Sonraki kart">
            <Text style={s.nextBtnText}>Sonraki →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  header:        {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerSide:    { width: 72 },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: "800", textAlign: "center" },
  accent:        { fontSize: 14, color: "#c9a84c", fontWeight: "600" },

  progressTrack: { height: 5, marginHorizontal: 16, borderRadius: 3, marginBottom: 6 },
  progressFill:  { height: 5, backgroundColor: "#c9a84c", borderRadius: 3 },

  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 16 },

  // Ders
  kartBaslikBox: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  kartBaslikBig: { fontSize: 24, fontWeight: "800", lineHeight: 32 },
  gorselImg:     {
    width: SCREEN_W - 32, height: (SCREEN_W - 32) * 0.85,
    borderRadius: 14, marginBottom: 16, alignSelf: "center", backgroundColor: "#ffffff",
  },
  kartCard:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 20, justifyContent: "center" },
  kartIcerik:    { fontSize: 15, lineHeight: 26 },
  vurguBox:      { borderLeftWidth: 5, borderRadius: 10, padding: 16 },
  vurguText:     { fontSize: 15, color: "#c9a84c", fontWeight: "700", lineHeight: 24 },

  // Quiz — soru
  questionCard:  {
    backgroundColor: "#0f2040", borderRadius: 16, padding: 20, marginBottom: 20,
  },
  questionText:  { fontSize: 18, fontWeight: "700", color: "#ffffff", lineHeight: 28 },

  quizBody:       { flex: 1, justifyContent: "flex-start" },
  quizQuestionContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  answersContainer: { gap: 10, marginBottom: 8, paddingTop: 4 },
  answerBtn:     {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 14,
  },
  answerHarf:    {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  answerHarfText:{ fontSize: 13, fontWeight: "800" },
  answerMetin:   { fontSize: 14, fontWeight: "500", lineHeight: 20 },

  aciklamaBox:   { borderWidth: 1.5, borderRadius: 12, padding: 14, marginTop: 12 },
  aciklamaText:  { fontSize: 14, lineHeight: 22, marginBottom: 4 },

  // Okuma modu
  readContent:   { padding: 20 },
  readBaslik:    { fontSize: 20, fontWeight: "800", lineHeight: 28, marginBottom: 12 },
  readDivider:   { height: 1, marginVertical: 28, opacity: 0.4 },

  // Sonuç
  scoreCard:     { borderRadius: 16, padding: 24, alignItems: "center", gap: 8 },
  resultLottie:  { width: 96, height: 96, alignSelf: "center" },
  scoreEmoji:    { fontSize: 52 },
  scoreText:     { fontSize: 28, fontWeight: "800" },
  scorePct:      { fontSize: 15, fontWeight: "600" },
  scoreBarTrack: { width: SCREEN_W - 96, height: 8, borderRadius: 4, marginTop: 8 },
  scoreBarFill:  { height: 8, backgroundColor: "#c9a84c", borderRadius: 4 },

  wrongTitle:    { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  wrongCard:     { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  wrongQ:        { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  wrongCorrect:  { fontSize: 13, color: "#4ade80", fontWeight: "600" },
  wrongAciklama: { fontSize: 12, lineHeight: 18 },

  // Navigasyon
  navRow:        {
    flexDirection: "row", gap: 12,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
  prevBtn:       { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1 },
  prevBtnText:   { fontSize: 14, fontWeight: "700" },
  nextBtn:       { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#c9a84c", alignItems: "center" },
  nextBtnText:   { fontSize: 14, fontWeight: "700", color: "#0a1628" },

  placeholderText: { fontSize: 16, fontWeight: "500" },
});
