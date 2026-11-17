import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("lottie-react-native").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UIManager } = require("react-native");
  if (UIManager.hasViewManagerConfig?.("LottieAnimationView")) LottieView = mod;
} catch (_e) { /* noop */ }
import { useColors } from "../hooks/useColors";
import { useStrings, fmt } from "../i18n";
import elifbaStrings from "../i18n/strings/elifba";
import { READING_MAX_WIDTH } from "../lib/layout";
import type { QuizQuestion } from "../lib/elifbaQuizSession";

export type ElifbaQuizViewProps = {
  questions: QuizQuestion[];
  onAnswer: (q: QuizQuestion, correct: boolean) => void;
  onFinish: (score: number, total: number) => void;
};

export function ElifbaQuizView({ questions, onAnswer, onFinish }: ElifbaQuizViewProps) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
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
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={qv.done}>
        <Text style={qv.doneEmoji}>{pct >= 60 ? "🎉" : "📚"}</Text>
        <Text style={[qv.doneTitle, { color: c.text }]}>{pct >= 80 ? ep.great : pct >= 60 ? ep.good : ep.tryAgain}</Text>
        <Text style={[qv.doneSub, { color: c.textMuted }]}>{fmt(ep.scoreLine, { s: score, t: questions.length, p: pct })}</Text>
        <TouchableOpacity
          style={qv.doneBtn}
          onPress={() => onFinish(score, questions.length)}
          accessibilityRole="button"
          accessibilityLabel={ep.backToLessonsA11y}
        >
          <Text style={qv.doneBtnText}>{ep.backToLessons}</Text>
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
          <Text key={`ar-${i}`} style={[qv.soruArabicLine, { color: c.text }]}>{line}</Text>
        ))}
        {otherLines.map((line, i) => (
          <Text key={`tr-${i}`} style={[qv.soruText, { color: c.text }]}>{line}</Text>
        ))}
      </>
    );
  }

  return (
    <View style={qv.container}>
      <Text style={qv.progress}>{fmt(ep.questionProgress, { i: idx + 1, n: questions.length, s: score })}</Text>
      <View style={[qv.soruBox, { backgroundColor: c.card, borderColor: c.border }]}>
        {renderSoru(soru.soru)}
      </View>
      <View style={qv.options}>
        {soru.secenekler.map((s) => {
          const isRight    = s === soru.dogru_cevap;
          const isSelected = s === selected;
          let bg = c.card;
          if (answered) {
            if (isRight) bg = c.isDark ? "#052e22" : "#dcfce7";
            else if (isSelected) bg = c.isDark ? "#450a0a" : "#fee2e2";
          }
          return (
            <TouchableOpacity
              key={s}
              style={[qv.option, { backgroundColor: bg, borderColor: c.border }]}
              onPress={() => handleSelect(s)}
              disabled={answered}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={fmt(ep.answerA11y, { s })}
              accessibilityState={{ disabled: answered, selected: isSelected }}
            >
              <Text style={[qv.optionText, { color: c.text }, isArabic(s) && { fontSize: 20, textAlign: "center" }]}>
                {answered && isRight ? "✓ " : ""}{s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && soru.ipucu && selected !== soru.dogru_cevap && (
        <View style={[qv.ipucu, c.isDark && { backgroundColor: "#422006" }]}>
          <Text style={[qv.ipucuText, c.isDark && { color: "#fde68a" }]}>💡 {soru.ipucu}</Text>
        </View>
      )}
      {answered && (
        <TouchableOpacity
          style={qv.nextBtn}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={idx + 1 >= questions.length ? ep.seeResultsA11y : ep.nextQuestionA11y}
        >
          <Text style={qv.nextBtnText}>{idx + 1 >= questions.length ? ep.seeResults : ep.next}</Text>
        </TouchableOpacity>
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
    </View>
  );
}

const qv = StyleSheet.create({
  container:   { flex:1, padding:16, width:"100%", maxWidth:READING_MAX_WIDTH, alignSelf:"center" },
  noQ:         { textAlign:"center", marginTop:40, color:"#78716c", lineHeight:22 },
  progress:    { fontSize:12, color:"#a8a29e", textAlign:"center", marginBottom:12 },
  soruBox:        { backgroundColor:"#fffdf6", borderRadius:14, padding:20, marginBottom:12, borderWidth:1, borderColor:"#e7dfcc", gap:10 },
  soruText:       { fontSize:15, lineHeight:24, color:"#1c1917" },
  soruArabicLine: { fontSize:36, textAlign:"center", fontFamily:"Amiri", writingDirection:"rtl", color:"#1c1917", marginTop:4 },
  options:     { gap:8, marginBottom:10 },
  option:      { borderRadius:12, padding:14, borderWidth:1, borderColor:"#e7dfcc" },
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
