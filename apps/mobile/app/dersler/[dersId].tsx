import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, PanResponder, Animated, useWindowDimensions,
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

import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import { notifyReviewCompletion } from "../../src/hooks/storeReviewPolicy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { QuizFeedback } from "../../src/components/QuizFeedback";
import quizFeedbackStrings from "../../src/i18n/strings/quizFeedback";
import { useColors } from "../../src/hooks/useColors";
import { useDersProgress } from "../../src/hooks/useDersProgress";
import { getDers, getQuizFor, getBaslik } from "../../src/data/Dersler/dersler_registry";
import { useLang, useStrings, fmt, caps } from "../../src/i18n";
import derslerStrings from "../../src/i18n/strings/dersler";
import { normalizeQuizSorular, shuffleQuizOptions, type QuizSoru } from "../../src/lib/quizUtils";
import { useContextualHint } from "../../src/tour/useContextualHint";
import { ContextualHintCard, ContextualHintHelp } from "../../src/tour/ContextualHintCard";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { AyahLinkedText } from "../../src/components/AyahLinkedText";
import { BackButton, Button, Callout, radius, space } from "../../src/components/ui";

// Quiz geçme oranı: bu orandaki doğru → ders "tamamlandı" sayılır + kutlama.
// Mutlak sayı değil oran — soru havuzu 10'un altına düşerse eşik ulaşılamaz olmasın.
const QUIZ_PASS_RATIO = 0.7;

// ─── Görsel haritası ──────────────────────────────────────────────────────

const GORSEL_MAP: Record<string, number> = {
  namaz_tekbir:   require("../../assets/images/namaz/tekbir.jpg"),
  namaz_kiyam:    require("../../assets/images/namaz/kiyam.jpg"),
  namaz_ruku:     require("../../assets/images/namaz/ruku.jpg"),
  namaz_kavme:    require("../../assets/images/namaz/kavme.jpg"),
  namaz_secde:    require("../../assets/images/namaz/secde.jpg"),
  namaz_celse:    require("../../assets/images/namaz/celse.jpg"),
  namaz_tesehhud: require("../../assets/images/namaz/tesehhud.jpg"),
  namaz_selam:    require("../../assets/images/namaz/selam.jpg"),
};
// İngilizce arayüzde görseller içindeki yazılar İngilizce olan sürümlerle değişir.
const GORSEL_MAP_EN: Record<string, number> = {
  namaz_tekbir:   require("../../assets/images/namaz/tekbir_en.jpg"),
  namaz_kiyam:    require("../../assets/images/namaz/kiyam_en.jpg"),
  namaz_ruku:     require("../../assets/images/namaz/ruku_en.jpg"),
  namaz_kavme:    require("../../assets/images/namaz/kavme_en.jpg"),
  namaz_secde:    require("../../assets/images/namaz/secde_en.jpg"),
  namaz_celse:    require("../../assets/images/namaz/celse_en.jpg"),
  namaz_tesehhud: require("../../assets/images/namaz/tesehhud_en.jpg"),
  namaz_selam:    require("../../assets/images/namaz/selam_en.jpg"),
};

// DERS_DATA, getQuiz, BASLIKLAR → dersler_registry.ts'ten import edildi

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
  const t = useStrings(derslerStrings);
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.headerSide}>
          <BackButton accessibilityLabel={t.back} />
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
        <View style={s.headerSide} />
      </View>
      <View style={s.center}>
        <Text style={{ fontSize: 56 }}>📚</Text>
        <Text style={[s.placeholderText, { color: c.textMuted }]}>{t.unavailable}</Text>
      </View>
    </View>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────

export default function DersDetayScreen() {
  const { dersId } = useLocalSearchParams<{ dersId: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();

  // Ders state
  const [dersIndex, setDersIndex] = useState(0);
  const dersScrollRef = useRef<ScrollView>(null);
  const quizScrollRef = useRef<ScrollView>(null);
  const [quizFooterHeight, setQuizFooterHeight] = useState(0);
  const { width, fontScale } = useWindowDimensions();
  const compactQuizBack = width / fontScale < 300;

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
  useFocusEffect(useCallback(() => {
    if (quizFinished) return notifyReviewCompletion();
  }, [quizFinished]));
  const [wrongAnswers, setWrongAnswers]             = useState<QuizSoru[]>([]);
  const quizOpacity = useRef(new Animated.Value(1)).current;
  const quizAnimStyle = { opacity: quizOpacity };

  const dersKey  = dersId ?? "";
  const lang     = useLang();
  const t        = useStrings(derslerStrings);
  const feedback = useStrings(quizFeedbackStrings);
  const dersData = getDers(dersKey, lang);
  const quizData = getQuizFor(dersKey, lang);
  // Normalize bozuk soruları eler; hasQuiz gerçek kullanılabilir soru sayısına
  // bakar — aksi halde tümü bozuksa "Teste Başla" sessizce çalışmaz.
  const validQuiz = useMemo(
    () => (Array.isArray(quizData?.sorular) ? normalizeQuizSorular(quizData.sorular) : []),
    [quizData],
  );
  const hasQuiz  = validQuiz.length > 0;
  const baslik   = getBaslik(dersKey, lang);
  const quizPass = Math.max(1, Math.ceil(quizQuestions.length * QUIZ_PASS_RATIO));

  const { progress, hydrated, updateProgress, setQuizBitti } = useDersProgress();

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

  // Kaldığı karttan devam: depodaki ilerleme hidrasyondan sonra bir kez uygulanır.
  // Kullanıcı bu arada gezinmişse (dersIndex ≠ 0) dokunulmaz; kart sayısı
  // değişmiş olabilir diye üst sınır kırpılır.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || resumedRef.current) return;
    resumedRef.current = true;
    const count = dersData?.kartlar?.length ?? 0;
    const seen = progress[dersKey]?.gorülen ?? 0;
    if (count > 0 && seen > 0) {
      const target = Math.min(seen, count - 1);
      setDersIndex((cur) => (cur === 0 ? target : cur));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const hint = useContextualHint("lessonProgress", hydrated && !readMode && !quizMode &&
    !!dersData?.kartlar?.[dersIndex] && dersIndex < dersData.kartlar.length - 1,
    `${dersKey}:${dersIndex}:${readMode}:${quizMode}`);
  if (!dersData) return <YakindaEkran baslik={baslik} />;

  // ── Ders verileri ──
  const kartlar: Kart[] = dersData.kartlar ?? [];
  const total    = kartlar.length;
  const kart     = kartlar[dersIndex] ?? kartlar[0];
  const isFirst  = dersIndex === 0;
  const isLast   = dersIndex === total - 1;
  const dersProgressW = `${Math.round(((dersIndex + 1) / total) * 100)}%` as const;
  const gorselSrc = kart?.tip === "gorsel" && kart.gorsel ? ((lang === "en" ? GORSEL_MAP_EN[kart.gorsel] : undefined) ?? GORSEL_MAP[kart.gorsel] ?? null) : null;

  // ── Ders handlers ──
  const navigateDers = (dir: 1 | -1) => {
    hint.targetAction();
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
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)).map(shuffleQuizOptions));
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
      // Sadece geçme eşiğini tutturan (%70+) ders "tamamlandı" sayılır.
      if (score >= quizPass) setQuizBitti(dersKey);
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
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)).map(shuffleQuizOptions));
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
        <View style={s.contentColumn}>
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <View style={s.headerSide}>
            <BackButton accessibilityLabel={t.back} />
          </View>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
          <Button
            variant="ghost"
            tone="accent"
            label={t.cardMode}
            onPress={() => setReadMode(false)}
            accessibilityLabel={t.cardModeA11y}
          />
        </View>

        <ScrollView
          contentContainerStyle={[s.readContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {kartlar.map((k, i) => (
            <View key={k.id}>
              <Text style={[s.readBaslik, { color: c.text }]}>{k.baslik ?? ""}</Text>
              <AyahLinkedText style={[s.kartIcerik, { color: c.textSecondary }]}>{k.icerik ?? ""}</AyahLinkedText>
              <View style={[s.vurguBox, { backgroundColor: c.amberBg, borderLeftColor: c.amberBorder, marginTop: space.sm }]}>
                <Text style={[s.vurguText, { color: c.goldText }]}>✦  {k.vurgu ?? ""}</Text>
              </View>
              {i < kartlar.length - 1 && <View style={[s.readDivider, { backgroundColor: c.border }]} />}
            </View>
          ))}

          {hasQuiz && (
            <Button
              variant="primary"
              fullWidth
              label={t.startQuiz}
              onPress={startQuiz}
              accessibilityLabel={t.startQuizA11y}
              style={{ marginTop: 28 }}
            />
          )}
        </ScrollView>
        </View>
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
    const barW      = `${pct}%` as const;

    return (
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.contentColumn}>
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <View style={s.headerSide} />
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[s.headerTitle, { color: c.text }]}>{t.result}</Text>
          <View style={s.headerSide} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Skor */}
          <View style={[s.scoreCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {LottieView && score >= quizPass ? (
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
              {fmt(t.scoreCorrect, { score, total: qTotal })}
            </Text>
            <Text style={[s.scorePct, { color: c.textMuted }]}>{fmt(t.scorePct, { pct })}</Text>
            <View style={[s.scoreBarTrack, { backgroundColor: c.cardAlt }]}>
              <View style={[s.scoreBarFill, { width: barW, backgroundColor: c.accent }]} />
            </View>
          </View>

          {/* Yanlış sorular */}
          {wrongAnswers.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[s.wrongTitle, { color: c.textMuted }]}>
                {caps(fmt(t.wrongTitle, { n: wrongAnswers.length }))}
              </Text>
              {wrongAnswers.map((q, i) => (
                <View key={q.id} style={[s.wrongCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[s.wrongQ, { color: c.text }]}>{i + 1}. {q.soru}</Text>
                  <Text style={[s.wrongCorrect, { color: c.successText }]}>
                    {fmt(t.correctAnswer, { answer: q.cevaplar.find(c => c.harf === q.dogru)?.metin ?? "" })}
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
          <Button
            variant="secondary"
            label={t.backToLesson}
            onPress={returnToLesson}
            accessibilityLabel={t.backToLessonA11y}
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            label={t.retry}
            onPress={retryQuiz}
            accessibilityLabel={t.retryA11y}
            style={{ flex: 1 }}
          />
        </View>
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
    const qProgressW = `${Math.round(((qIndex + 1) / qTotal) * 100)}%` as const;

    const answerBg = (harf: string) => {
      if (!showResult) return c.card;
      if (harf === question.dogru) return c.greenBg;
      if (harf === selectedAnswer) return c.errorBg;
      return c.card;
    };

    const answerTextColor = (harf: string) => {
      if (!showResult) return c.text;
      if (harf === question.dogru) return c.greenText;
      if (harf === selectedAnswer) return c.errorText;
      return c.text;
    };

    const answerBorderColor = (harf: string) => {
      if (!showResult) return c.border;
      if (harf === question.dogru) return c.greenBorder;
      if (harf === selectedAnswer) return c.errorBorder;
      return c.border;
    };

    return (
      <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.contentColumn}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <Button
            variant="ghost"
            tone="accent"
            label={compactQuizBack ? undefined : t.backToLessonArrow}
            icon={compactQuizBack ? "arrow-back" : undefined}
            onPress={returnToLesson}
            accessibilityLabel={t.backToLessonA11y}
          />
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[s.headerTitle, { color: c.text }]}>
            {fmt(t.questionOf, { i: qIndex + 1, n: qTotal })}
          </Text>
          <View style={s.headerSide} />
        </View>

        {/* Progress */}
        <View style={[s.progressTrack, { backgroundColor: c.cardAlt }]}>
          <View style={[s.progressFill, { width: qProgressW, backgroundColor: c.accent }]} />
        </View>

        {/* Soru kartı + şıklar — fade animasyonlu */}
        <Animated.View style={[s.quizBody, quizAnimStyle]}>
        <ScrollView
          key={qIndex}
          style={{ flex: 1 }}
          ref={quizScrollRef}
          contentContainerStyle={{ paddingBottom: quizFooterHeight + insets.bottom }}
          onContentSizeChange={() => {
            if (showResult) quizScrollRef.current?.scrollToEnd({ animated: true });
            else quizScrollRef.current?.scrollTo({ y: 0, animated: false });
          }}
        >
          <View style={s.quizQuestionContent}>
            <View style={[s.questionCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.questionText, { color: c.text }]}>{question.soru}</Text>
            </View>
          </View>

          {/* Şıklar */}
          <View style={s.answersContainer}>
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
                accessibilityLabel={`${cevap.harf}: ${cevap.metin}${showResult && cevap.harf === question.dogru ? `. ${feedback.correctOption}` : showResult && cevap.harf === selectedAnswer ? `. ${feedback.wrongSelection}` : ""}`}
              >
                <View style={[s.answerHarf, { borderColor: answerBorderColor(cevap.harf) }]}>
                  <Text style={[s.answerHarfText, { color: answerTextColor(cevap.harf) }]} maxFontSizeMultiplier={1.2}>
                    {cevap.harf}
                  </Text>
                </View>
                <Text style={[s.answerMetin, { color: answerTextColor(cevap.harf), flex: 1 }]}>
                  {cevap.metin}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ paddingHorizontal: space.gutter }}>
            {showResult && question.aciklama ? (
              <Callout tone="info" style={s.aciklamaBox}>
                {question.aciklama}
              </Callout>
            ) : null}
            <QuizFeedback answered={showResult} correct={selectedAnswer === question.dogru} answer={`${question.dogru}, ${question.cevaplar.find(a => a.harf === question.dogru)?.metin ?? ""}`} questionKey={qIndex} />
          </View>
        </ScrollView>
        </Animated.View>

        {/* Sonraki — her zaman altta sabit, cevap seçilince aktifleşir */}
        <View
          onLayout={e => setQuizFooterHeight(e.nativeEvent.layout.height - insets.bottom)}
          style={[s.navRow, { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}
        >
          <Button
            variant="primary"
            label={qIndex + 1 >= qTotal ? t.seeResults : t.nextQuestion}
            onPress={nextQuestion}
            disabled={!showResult}
            accessibilityLabel={qIndex + 1 >= qTotal ? t.seeResultsA11y : t.nextQuestionA11y}
            style={{ flex: 1 }}
          />
        </View>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // DERS EKRANI
  // ═══════════════════════════════════════════════════════
  return (
    <View ref={hint.viewportRef} style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]} {...panResponder.panHandlers}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.contentColumn}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.headerSide}>
          <BackButton accessibilityLabel={t.back} />
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
        <Button
          variant="ghost"
          tone="accent"
          label={readMode ? t.cardMode : t.readAll}
          onPress={() => setReadMode(r => !r)}
          accessibilityLabel={readMode ? t.cardModeA11y : t.readAllA11y}
        />
      </View>

      {/* Progress */}
      <View style={[s.progressTrack, { backgroundColor: c.cardAlt }]}>
        <View style={[s.progressFill, { width: dersProgressW, backgroundColor: c.accent }]} />
      </View>

      {/* Kart başlığı — her zaman görünür */}
      <View style={s.kartBaslikBox}>
        <Text style={[s.kartBaslikBig, { flex: 1, color: c.text }]}>{kart?.baslik ?? ""}</Text>
        <ContextualHintHelp hint={hint} />
      </View>

      {/* Kart içeriği */}
      <ScrollView
        ref={dersScrollRef}
        {...hint.scrollProps}
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {gorselSrc && (
          <View style={[s.gorselFrame, { backgroundColor: c.card, borderColor: c.border }]}>
            <Image
              source={gorselSrc}
              style={s.gorselImg}
              resizeMode="cover"
              alt={t.lessonImageAlt}
            />
          </View>
        )}
        <View style={[s.kartCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <AyahLinkedText style={[s.kartIcerik, { color: c.textSecondary }]}>{kart?.icerik ?? ""}</AyahLinkedText>
        </View>
        <View style={{ flexGrow: 1 }} />
        {/* Vurgu kaydırılan alanın içinde: büyük yazıda sabit kutu alanı daraltıp metni kesmesin */}
        <View style={[s.vurguBox, { backgroundColor: c.amberBg, borderLeftColor: c.amberBorder, marginTop: space.sm }]}>
          <Text style={[s.vurguText, { color: c.goldText }]}>✦  {kart?.vurgu ?? ""}</Text>
        </View>
      </ScrollView>

      {hint.display && <View style={{ marginBottom: space.xs, marginHorizontal: space.gutter }}><ContextualHintCard hint={hint} /></View>}
      {/* Navigasyon */}
      <View style={[s.navRow, { borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
        <Button
          variant="secondary"
          label={t.prevCard}
          onPress={() => navigateDers(-1)}
          disabled={isFirst}
          accessibilityLabel={t.prevCardA11y}
        />

        {isLast ? (
          <Button
            variant="primary"
            label={t.startQuiz}
            onPress={startQuiz}
            disabled={!hasQuiz}
            accessibilityLabel={t.startQuizA11y}
            style={{ flex: 1 }}
          />
        ) : (
          <View {...hint.targetProps} style={{ flex: 1 }}>
            <Button
              variant="primary"
              fullWidth
              label={t.nextCard}
              onPress={() => navigateDers(1)}
              accessibilityLabel={t.nextCardA11y}
            />
          </View>
        )}
      </View>
      </View>
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  // Geniş (tablet) ekranda içerik sütununu ortalar + sınırlar; arka plan
  // (s.container) yine tam ekran kalır, sadece içerik daralır.
  contentColumn: { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },

  header:        {
    flexDirection: "row", alignItems: "center", gap: space.xs,
    paddingHorizontal: space.gutter, paddingVertical: space.xs, borderBottomWidth: 1,
  },
  headerSide:    { width: 48, minHeight: 48, justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: "800", textAlign: "center" },

  progressTrack: { height: 5, marginHorizontal: space.gutter, borderRadius: 3, marginBottom: 6 },
  progressFill:  { height: 5, borderRadius: 3 },

  scrollContent: { flexGrow: 1, padding: space.gutter, paddingBottom: space.lg },

  // Ders
  kartBaslikBox: { paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  kartBaslikBig: { fontSize: 24, fontWeight: "800", lineHeight: 32 },
  gorselFrame:   {
    width: "100%", maxWidth: "100%", aspectRatio: 1.83, borderRadius: radius.lg, borderWidth: 1,
    marginBottom: space.md, alignSelf: "stretch", overflow: "hidden",
  },
  gorselImg:     { width: "100%", height: "100%" },
  kartCard:      { borderRadius: radius.lg, borderWidth: 1, padding: 20 },
  kartIcerik:    { fontSize: 15, lineHeight: 26 },
  vurguBox:      { borderLeftWidth: 5, borderRadius: radius.md, padding: space.md },
  vurguText:     { fontSize: 15, fontWeight: "700", lineHeight: 24 },

  // Quiz — soru
  questionCard:  {
    borderRadius: radius.lg, borderWidth: 1, padding: 20, marginBottom: 20,
  },
  questionText:  { fontSize: 18, fontWeight: "700", lineHeight: 28 },

  quizBody:       { flex: 1, justifyContent: "flex-start" },
  quizQuestionContent: { paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.xs },
  answersContainer: { paddingHorizontal: space.gutter, gap: 10, marginBottom: space.xs, paddingTop: space.xxs },
  answerBtn:     {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    borderRadius: radius.lg, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14,
  },
  answerHarf:    {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  answerHarfText:{ fontSize: 13, fontWeight: "800" },
  answerMetin:   { fontSize: 14, fontWeight: "500", lineHeight: 20 },

  aciklamaBox:   { marginTop: space.sm, marginBottom: space.xs },

  // Okuma modu
  readContent:   { padding: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  readBaslik:    { fontSize: 20, fontWeight: "800", lineHeight: 28, marginBottom: space.sm },
  readDivider:   { height: 1, marginVertical: 28, opacity: 0.4 },

  // Sonuç
  scoreCard:     { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, alignItems: "center", gap: space.xs },
  resultLottie:  { width: 96, height: 96, alignSelf: "center" },
  scoreEmoji:    { fontSize: 52 },
  scoreText:     { fontSize: 28, fontWeight: "800" },
  scorePct:      { fontSize: 15, fontWeight: "600" },
  scoreBarTrack: { alignSelf: "stretch", height: 8, borderRadius: 4, marginTop: space.xs, overflow: "hidden" },
  scoreBarFill:  { height: 8, borderRadius: 4 },

  wrongTitle:    { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  wrongCard:     { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  wrongQ:        { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  wrongCorrect:  { fontSize: 13, fontWeight: "600" },
  wrongAciklama: { fontSize: 12, lineHeight: 18 },

  // Navigasyon
  navRow:        {
    flexDirection: "row", gap: space.sm,
    paddingHorizontal: space.gutter, paddingTop: space.sm, borderTopWidth: 1,
  },

  placeholderText: { fontSize: 16, fontWeight: "500" },
});
