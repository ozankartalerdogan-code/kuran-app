import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("lottie-react-native").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UIManager } = require("react-native");
  if (UIManager.hasViewManagerConfig?.("LottieAnimationView")) LottieView = mod;
} catch (_e) { /* noop */ }
import { QuizFeedback } from "./QuizFeedback";
import quizFeedbackStrings from "../i18n/strings/quizFeedback";
import { useColors, type AppColors } from "../hooks/useColors";
import { Button, Callout, radius, space } from "./ui";
import { notifyReviewCompletion } from "../hooks/storeReviewPolicy";
import { useStrings, fmt } from "../i18n";
import elifbaStrings from "../i18n/strings/elifba";
import { READING_MAX_WIDTH } from "../lib/layout";
import { ELIFBA_QUIZ_PASS } from "../lib/elifbaProgress";
import type { QuizQuestion } from "../lib/elifbaQuizSession";
import type { ListeningItem } from "../lib/elifbaListening";
import { ElifbaWordAudioButton } from "./ElifbaWordAudioButton";

export type ElifbaQuizViewProps =
  | {
      kind?: "quiz";
      isBypass?: boolean;
      questions: QuizQuestion[];
      onAnswer: (q: QuizQuestion, correct: boolean) => void;
      onFinish: (score: number, total: number) => void;
    }
  | {
      kind: "listening";
      items: ListeningItem[];
      onAnswer: (item: ListeningItem, correct: boolean) => void;
      onPlayAudio: (harfId: number, onError: () => void, onPlayingChange?: (playing: boolean) => void) => () => void;
      onFinish: (score: number, total: number) => void;
    };

export function ElifbaQuizView(props: ElifbaQuizViewProps) {
  if (props.kind === "listening") return <ListeningRun {...props} />;
  return <QuestionRun {...props} />;
}

function getOptionColors(c: AppColors, answered: boolean, isRight: boolean, isSelected: boolean) {
  if (!answered) return { bg: c.card, border: c.border, fg: c.text };
  if (isRight) return { bg: c.greenBg, border: c.greenBorder, fg: c.greenText };
  if (isSelected) return { bg: c.errorBg, border: c.errorBorder, fg: c.errorText };
  return { bg: c.card, border: c.border, fg: c.text };
}

function DoneScreen({ score, total, onFinish, isBypass = false }: {
  isBypass?: boolean;
  score: number; total: number; onFinish: (score: number, total: number) => void;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const pct = Math.round((score / total) * 100);
  // Sınavla geçişte başarı eşiği ders geçme eşiğidir; kalınca kutlama ve puan isteği yok.
  const passed = isBypass ? score >= ELIFBA_QUIZ_PASS : pct >= 60;
  useFocusEffect(useCallback(() => {
    if (passed) return notifyReviewCompletion();
  }, [passed]));
  return (
    <View style={qv.done}>
      <Ionicons
        name={passed ? "trophy-outline" : "book-outline"}
        size={56}
        color={passed ? c.accent : c.textMuted}
        accessible={false}
        importantForAccessibility="no"
      />
      <Text style={[qv.doneTitle, { color: c.text }]}>{!passed ? ep.tryAgain : pct >= 80 ? ep.great : ep.good}</Text>
      <Text style={[qv.doneSub, { color: c.textSecondary }]}>{fmt(ep.scoreLine, { s: score, t: total, p: pct })}</Text>
      {isBypass && score < ELIFBA_QUIZ_PASS && (
        <Text style={[qv.doneSub, { color: c.textSecondary, textAlign: "center" }]}>
          {fmt(ep.bypassFailed, { n: ELIFBA_QUIZ_PASS })}
        </Text>
      )}
      <Button
        variant="primary"
        label={ep.backToLessons}
        onPress={() => onFinish(score, total)}
        accessibilityLabel={ep.backToLessonsA11y}
        style={{ marginTop: space.xs, paddingHorizontal: space.xl }}
      />
    </View>
  );
}

function QuestionRun({ questions, onAnswer, onFinish, isBypass }: {
  isBypass?: boolean;
  questions: QuizQuestion[];
  onAnswer: (q: QuizQuestion, correct: boolean) => void;
  onFinish: (score: number, total: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const feedback = useStrings(quizFeedbackStrings);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answeredLockRef = useRef(false);

  useEffect(() => {
    answeredLockRef.current = false;
    setIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setShowConfetti(false);
  }, [questions]);

  useEffect(() => () => {
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
  }, []);

  const soru = questions[idx];

  function handleSelect(s: string) {
    if (answeredLockRef.current || !soru) return;
    answeredLockRef.current = true;
    setSelected(s);
    setAnswered(true);
    const correct = s === soru.dogru_cevap;
    if (correct) {
      setScore((p) => p + 1);
      setShowConfetti(true);
      confettiTimer.current = setTimeout(() => setShowConfetti(false), 1500);
    }
    onAnswer(soru, correct);
  }

  function handleNext() {
    if (idx + 1 >= questions.length) setDone(true);
    else {
      answeredLockRef.current = false;
      setIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (questions.length === 0) {
    return <Text style={[qv.noQ, { color: c.textMuted }]}>{ep.noQuestions}</Text>;
  }
  if (!soru) return <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />;
  if (done) {
    return <DoneScreen score={score} total={questions.length} onFinish={onFinish} isBypass={isBypass} />;
  }

  const isArabic = (t: string) => /[؀-ۿ]/.test(t);
  const isPureArabic = (t: string) => isArabic(t) && !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(t);

  function renderSoru(text: string) {
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    const arabicLines = lines.filter((l) => isPureArabic(l));
    const otherLines  = lines.filter((l) => !isPureArabic(l));
    return (
      <>
        {arabicLines.map((line, i) => line === soru.exerciseArabic ? (
          <View key={`ar-${i}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xxs }}>
            <Text style={[qv.soruArabicLine, { color: c.text, flexShrink: 1 }]}>{line}</Text>
            <ElifbaWordAudioButton key={`${soru.quiz_id}-${i}`} word={line} />
          </View>
        ) : (
          <Text key={`ar-${i}`} style={[qv.soruArabicLine, { color: c.text }]}>{line}</Text>
        ))}
        {otherLines.map((line, i) => (
          <Text key={`tr-${i}`} style={[qv.soruText, { color: c.text }]}>{line}</Text>
        ))}
      </>
    );
  }

  return (
    <ScrollView
      key={idx}
      ref={scrollRef}
      style={qv.scroll}
      contentContainerStyle={[qv.content, { paddingBottom: 16 + insets.bottom }]}
      onContentSizeChange={() => {
        if (answered) scrollRef.current?.scrollToEnd({ animated: true });
        else scrollRef.current?.scrollTo({ y: 0, animated: false });
      }}
    >
      <Text style={[qv.progress, { color: c.textMuted }]}>{fmt(ep.questionProgress, { i: idx + 1, n: questions.length, s: score })}</Text>
      <View style={[qv.soruBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
        {renderSoru(soru.soru)}
      </View>
      <QuizFeedback answered={answered} correct={selected === soru.dogru_cevap} answer={soru.dogru_cevap} questionKey={idx} style={{ marginBottom: space.sm }} />
      <View style={qv.options}>
        {soru.secenekler.map((s) => {
          const isRight    = s === soru.dogru_cevap;
          const isSelected = s === selected;
          const opt = getOptionColors(c, answered, isRight, isSelected);
          return (
            <TouchableOpacity
              key={s}
              style={[qv.option, { backgroundColor: opt.bg, borderColor: opt.border }]}
              onPress={() => handleSelect(s)}
              disabled={answered}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${fmt(ep.answerA11y, { s })}${answered && isRight ? `. ${feedback.correctOption}` : answered && isSelected ? `. ${feedback.wrongSelection}` : ""}`}
              accessibilityState={{ disabled: answered, selected: isSelected }}
            >
              <Text style={[qv.optionText, { color: opt.fg }, isArabic(s) && { fontSize: 20, textAlign: "center" }]}>
                {answered && isRight ? "✓ " : ""}{s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && soru.ipucu && selected !== soru.dogru_cevap && (
        <Callout tone="warning" icon="bulb-outline" style={qv.ipucu}>
          {soru.ipucu}
        </Callout>
      )}
      {answered && (
        <Button
          variant="primary"
          fullWidth
          label={idx + 1 >= questions.length ? ep.seeResults : ep.next}
          onPress={handleNext}
          accessibilityLabel={idx + 1 >= questions.length ? ep.seeResultsA11y : ep.nextQuestionA11y}
          style={{ marginTop: space.xxs }}
        />
      )}
      {showConfetti && LottieView && (
        <View style={qv.confettiWrap} pointerEvents="none">
          <LottieView
            source={require("../../assets/Success-celebration.json")}
            autoPlay
            loop={false}
            style={qv.confetti}
          />
        </View>
      )}
    </ScrollView>
  );
}

function ListeningQuestion({ item, index, total, score, isLast, onAnswer, onNext, onPlayAudio }: {
  item: ListeningItem;
  index: number;
  total: number;
  score: number;
  isLast: boolean;
  onAnswer: (item: ListeningItem, correct: boolean) => void;
  onNext: () => void;
  onPlayAudio: (harfId: number, onError: () => void, onPlayingChange?: (playing: boolean) => void) => () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const feedback = useStrings(quizFeedbackStrings);
  const [answered, setAnswered] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const cancelPlayRef = useRef<(() => void) | null>(null);
  const answeredLockRef = useRef(false);

  const startPlay = useCallback(() => {
    cancelPlayRef.current?.();
    cancelPlayRef.current = onPlayAudio(item.audioHarfId, () => {
      cancelPlayRef.current?.();
      cancelPlayRef.current = null;
      if (!answeredLockRef.current) setFallback(true);
    }, setPlaying);
  }, [item.audioHarfId, onPlayAudio]);

  useEffect(() => {
    startPlay();
    return () => {
      cancelPlayRef.current?.();
      cancelPlayRef.current = null;
    };
  }, [startPlay]);

  const isArabic = (t: string) => /[؀-ۿ]/.test(t);

  function handleSelect(id: number) {
    if (answeredLockRef.current) return;
    answeredLockRef.current = true;
    setSelectedId(id);
    setAnswered(true);
    onAnswer(item, id === item.correctId);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={qv.scroll}
      contentContainerStyle={[qv.content, { paddingBottom: 16 + insets.bottom }]}
      onContentSizeChange={() => { if (answered) scrollRef.current?.scrollToEnd({ animated: true }); }}
    >
      <Text style={[qv.progress, { color: c.textMuted }]}>{fmt(ep.questionProgress, { i: index + 1, n: total, s: score })}</Text>
      <View style={[qv.soruBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
        {fallback ? (
          <>
            <Text style={[qv.soruText, { color: c.text }]}>{ep.listeningPrompt}</Text>
            <Text style={[qv.fallbackName, { color: c.text }]}>{item.fallbackLabel}</Text>
          </>
        ) : (
          <>
            <Text style={[qv.soruText, { color: c.text }]}>{ep.listeningPromptAudio}</Text>
            <Button
              variant="primary"
              fullWidth
              icon="volume-high-outline"
              label={playing ? ep.playing : ep.listenPlay}
              onPress={startPlay}
              disabled={playing}
              accessibilityLabel={playing ? ep.playing : ep.listenPlayA11y}
            />
          </>
        )}
      </View>
      <QuizFeedback answered={answered} correct={selectedId === item.correctId} answer={item.options.find(o => o.id === item.correctId)?.label ?? item.fallbackLabel} questionKey={item.itemId} style={{ marginBottom: space.sm }} />
      <View style={qv.options}>
        {item.options.map((option) => {
          const isRight = option.id === item.correctId;
          const isSelected = option.id === selectedId;
          const opt = getOptionColors(c, answered, isRight, isSelected);
          return (
            <TouchableOpacity
              key={option.id}
              style={[qv.option, { backgroundColor: opt.bg, borderColor: opt.border }]}
              onPress={() => handleSelect(option.id)}
              disabled={answered}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${fmt(ep.answerA11y, { s: option.label })}${answered && isRight ? `. ${feedback.correctOption}` : answered && isSelected ? `. ${feedback.wrongSelection}` : ""}`}
              accessibilityState={{ disabled: answered, selected: isSelected }}
            >
              <Text style={[qv.optionText, { color: opt.fg }, isArabic(option.label) && { fontSize: 20, textAlign: "center" }]}>
                {answered && isRight ? "✓ " : ""}{option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && (
        <Button
          variant="primary"
          fullWidth
          label={isLast ? ep.seeResults : ep.next}
          onPress={onNext}
          accessibilityLabel={isLast ? ep.seeResultsA11y : ep.nextQuestionA11y}
          style={{ marginTop: space.xxs }}
        />
      )}
    </ScrollView>
  );
}

function ListeningRun({ items, onAnswer, onPlayAudio, onFinish }: {
  items: ListeningItem[];
  onAnswer: (item: ListeningItem, correct: boolean) => void;
  onPlayAudio: (harfId: number, onError: () => void, onPlayingChange?: (playing: boolean) => void) => () => void;
  onFinish: (score: number, total: number) => void;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
  }, []);

  const item = items[idx];

  function handleAnswer(answerItem: ListeningItem, correct: boolean) {
    if (correct) {
      setScore((p) => p + 1);
      setShowConfetti(true);
      confettiTimer.current = setTimeout(() => setShowConfetti(false), 1500);
    }
    onAnswer(answerItem, correct);
  }

  function handleNext() {
    if (idx + 1 >= items.length) setDone(true);
    else setIdx((i) => i + 1);
  }

  if (items.length === 0) {
    return <Text style={[qv.noQ, { color: c.textMuted }]}>{ep.noQuestions}</Text>;
  }
  if (!item) return <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />;
  if (done) {
    return <DoneScreen score={score} total={items.length} onFinish={onFinish} />;
  }

  return (
    <View style={qv.container}>
      <ListeningQuestion
        key={item.itemId}
        item={item}
        index={idx}
        total={items.length}
        score={score}
        isLast={idx + 1 >= items.length}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onPlayAudio={onPlayAudio}
      />
      {showConfetti && LottieView && (
        <View style={qv.confettiWrap} pointerEvents="none">
          <LottieView
            source={require("../../assets/Success-celebration.json")}
            autoPlay
            loop={false}
            style={qv.confetti}
          />
        </View>
      )}
    </View>
  );
}

const qv = StyleSheet.create({
  container:   { flex:1, width:"100%", maxWidth:READING_MAX_WIDTH, alignSelf:"center" },
  scroll:      { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  content:     { padding: space.gutter },
  noQ:         { textAlign:"center", marginTop:40, lineHeight:22 },
  progress:    { fontSize:12, textAlign:"center", marginBottom:space.sm },
  soruBox:        { borderRadius:radius.lg, padding:20, marginBottom:space.sm, borderWidth:1, gap:10 },
  soruText:       { fontSize:15, lineHeight:24 },
  soruArabicLine: { fontSize:56, textAlign:"center", fontFamily:"Amiri", writingDirection:"rtl", marginTop:space.xxs },
  fallbackName:   { fontSize:24, fontWeight:"700", textAlign:"center" },
  options:     { gap:space.xs, marginBottom:10 },
  option:      { borderRadius:radius.md, padding:14, borderWidth:1 },
  optionText:  { fontSize:14 },
  ipucu:       { marginBottom:10 },
  confettiWrap:{ position:"absolute", top:120, left:space.gutter, right:space.gutter, height:220, alignItems:"center", justifyContent:"center" },
  confetti:    { width:220, height:220 },
  done:        { flex:1, alignItems:"center", justifyContent:"center", gap:space.sm, padding:space.xl },
  doneTitle:   { fontSize:22, fontWeight:"700" },
  doneSub:     { fontSize:15 },
});
