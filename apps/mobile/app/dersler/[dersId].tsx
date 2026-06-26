import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Dimensions,
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

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Statik veri haritaları ────────────────────────────────────────────────

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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DERS_DATA: Record<string, any> = {
  namaz:        require("../../src/data/Dersler/namaz_dersi.json"),
  "namaz-dualar": require("../../src/data/Dersler/namaz_dualar_dersi.json"),
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const QUIZ_MAP: Record<string, any> = {
  namaz:        require("../../src/data/Dersler/namaz_quiz.json"),
  "namaz-dualar": require("../../src/data/Dersler/namaz_dualar_quiz.json"),
};

const BASLIKLAR: Record<string, string> = {
  "namaz":           "Namaz",
  "namaz-dualar":    "Namaz Duaları",
  "oruc":            "Oruç",
  "hac-umre":        "Hac & Umre",
  "iman-esaslari":   "İman Esasları",
  "peygamberler":    "Peygamberler",
  "siyer":           "Siyer-i Nebi",
  "tecvid":          "Tecvid",
  "abdest-gusul":    "Abdest & Gusül",
  "ezan-kamet":      "Ezan & Kamet",
  "allah-sifatlari": "Allah'ın Sıfatları",
  "zekat":           "Zekat",
};

// ─── Tipler ───────────────────────────────────────────────────────────────

type Kart = {
  id: string;
  tip: "metin" | "gorsel";
  baslik: string;
  icerik: string;
  vurgu: string;
  gorsel?: string;
};

type QuizCevap = { harf: string; metin: string };

type QuizSoru = {
  id: string;
  soru: string;
  cevaplar: QuizCevap[];
  dogru: string;
  aciklama: string;
};

// ─── Yardımcı ─────────────────────────────────────────────────────────────

function normalizeQuizSorular(raw: any[]): QuizSoru[] {
  return raw.map(r => ({
    id:       r.id,
    soru:     r.soru,
    dogru:    r.dogru_cevap,
    aciklama: r.aciklama ?? "",
    cevaplar: (r.secenekler as string[]).map(s => {
      const sep = s.indexOf(") ");
      return { harf: s.charAt(0), metin: sep >= 0 ? s.slice(sep + 2) : s };
    }),
  }));
}

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
        <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7}>
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

  // Ders state
  const [dersIndex, setDersIndex] = useState(0);
  const dersScrollRef = useRef<ScrollView>(null);

  // Quiz state
  const [quizMode, setQuizMode]                     = useState(false);
  const [quizQuestions, setQuizQuestions]           = useState<QuizSoru[]>([]);
  const [qIndex, setQIndex]                         = useState(0);
  const [selectedAnswer, setSelectedAnswer]         = useState<string | null>(null);
  const [showResult, setShowResult]                 = useState(false);
  const [score, setScore]                           = useState(0);
  const [quizFinished, setQuizFinished]             = useState(false);
  const [wrongAnswers, setWrongAnswers]             = useState<QuizSoru[]>([]);
  const [showCelebration, setShowCelebration]       = useState(false);

  const dersKey  = dersId ?? "";
  const dersData = DERS_DATA[dersKey];
  const quizData = QUIZ_MAP[dersKey];
  const hasQuiz  = !!(quizData?.sorular?.length);
  const baslik   = BASLIKLAR[dersKey] ?? dersKey;

  if (!dersData) return <YakindaEkran baslik={baslik} />;

  // ── Ders verileri ──
  const kartlar: Kart[] = dersData.kartlar;
  const total    = kartlar.length;
  const kart     = kartlar[dersIndex];
  const isFirst  = dersIndex === 0;
  const isLast   = dersIndex === total - 1;
  const dersProgressW = (SCREEN_W - 32) * ((dersIndex + 1) / total);
  const gorselSrc = kart.tip === "gorsel" && kart.gorsel ? GORSEL_MAP[kart.gorsel] : null;

  // ── Ders handlers ──
  const navigateDers = (dir: 1 | -1) => {
    const next = dersIndex + dir;
    if (next < 0 || next >= total) return;
    Haptics.selectionAsync();
    setDersIndex(next);
    dersScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // ── Quiz handlers ──
  const startQuiz = () => {
    Haptics.selectionAsync();
    const shuffled = shuffle<QuizSoru>(normalizeQuizSorular(quizData.sorular));
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
    setQIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
    setWrongAnswers([]);
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
      const finalScore = score + (selectedAnswer === quizQuestions[qIndex].dogru ? 1 : 0);
      if (finalScore >= 7) setShowCelebration(true);
      setQuizFinished(true);
    } else {
      setQIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const retryQuiz = () => {
    const shuffled = shuffle<QuizSoru>(normalizeQuizSorular(quizData.sorular));
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
    setQIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
    setWrongAnswers([]);
    setShowCelebration(false);
  };

  const returnToLesson = () => {
    setQuizMode(false);
    setQuizFinished(false);
  };

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
            <Text style={s.scoreEmoji}>{emoji}</Text>
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
          >
            <Text style={[s.prevBtnText, { color: c.text }]}>Derse Dön</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={retryQuiz} activeOpacity={0.8}>
            <Text style={s.nextBtnText}>Tekrar Çöz</Text>
          </TouchableOpacity>
        </View>

        {/* Kutlama animasyonu — absoluteFill overlay, dokunuşları geçirir */}
        {LottieView && showCelebration && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 99, elevation: 99 }]} pointerEvents="none">
            <LottieView
              source={require("../../assets/Success-celebration.json")}
              autoPlay
              loop={false}
              style={{ flex: 1 }}
              onAnimationFinish={() => setShowCelebration(false)}
            />
          </View>
        )}
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

        {/* Soru kartı */}
        <View style={s.scrollContent}>
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

        {/* Sonraki — her zaman altta sabit, cevap seçilince aktifleşir */}
        <View style={[s.navRow, { borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[s.nextBtn, !showResult && { opacity: 0.35 }]}
            onPress={showResult ? nextQuestion : undefined}
            disabled={!showResult}
            activeOpacity={0.8}
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
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerSide} activeOpacity={0.7}>
          <Text style={s.accent}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>{baslik}</Text>
        <Text style={[s.progressLabel, { color: "#c9a84c", width: 72, textAlign: "right" }]}>
          {dersIndex + 1}/{total}
        </Text>
      </View>

      {/* Progress */}
      <View style={[s.progressTrack, { backgroundColor: c.border }]}>
        <View style={[s.progressFill, { width: dersProgressW }]} />
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
          <Text style={[s.kartBaslik, { color: c.text }]}>{kart.baslik}</Text>
          <Text style={[s.kartIcerik, { color: c.textSecondary }]}>{kart.icerik}</Text>
        </View>
      </ScrollView>

      {/* Vurgu — navRow üstünde her zaman sabit */}
      <View style={[s.vurguBox, { backgroundColor: "rgba(201, 168, 76, 0.12)", borderLeftColor: "#c9a84c", marginHorizontal: 20, marginBottom: 8 }]}>
        <Text style={s.vurguText}>✦  {kart.vurgu}</Text>
      </View>

      {/* Navigasyon */}
      <View style={[s.navRow, { borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[s.prevBtn, { borderColor: isFirst ? c.border : "#c9a84c" }]}
          onPress={() => navigateDers(-1)}
          disabled={isFirst}
          activeOpacity={0.7}
        >
          <Text style={[s.prevBtnText, { color: isFirst ? c.textMuted : "#c9a84c" }]}>← Önceki</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity
            style={[s.nextBtn, !hasQuiz && { opacity: 0.45 }]}
            onPress={hasQuiz ? startQuiz : undefined}
            disabled={!hasQuiz}
            activeOpacity={0.8}
          >
            <Text style={s.nextBtnText}>Teste Başla</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.nextBtn} onPress={() => navigateDers(1)} activeOpacity={0.8}>
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
  progressLabel: { textAlign: "right", fontSize: 12, fontWeight: "600" },

  progressTrack: { height: 5, marginHorizontal: 16, borderRadius: 3, marginBottom: 6 },
  progressFill:  { height: 5, backgroundColor: "#c9a84c", borderRadius: 3 },

  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 16 },

  // Ders
  gorselImg:     {
    width: SCREEN_W - 32, height: (SCREEN_W - 32) * 0.85,
    borderRadius: 14, marginBottom: 16, alignSelf: "center", backgroundColor: "#ffffff",
  },
  kartCard:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 20, gap: 10, justifyContent: "center" },
  kartBaslik:    { fontSize: 22, fontWeight: "800", lineHeight: 30 },
  kartIcerik:    { fontSize: 15, lineHeight: 26 },
  vurguBox:      { borderLeftWidth: 5, borderRadius: 10, padding: 16 },
  vurguText:     { fontSize: 15, color: "#c9a84c", fontWeight: "700", lineHeight: 24 },

  // Quiz — soru
  questionCard:  {
    backgroundColor: "#0f2040", borderRadius: 16, padding: 20, marginBottom: 20,
  },
  questionText:  { fontSize: 18, fontWeight: "700", color: "#ffffff", lineHeight: 28 },

  answersContainer: { gap: 10, marginBottom: 8 },
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

  // Sonuç
  scoreCard:     { borderRadius: 16, padding: 24, alignItems: "center", gap: 8 },
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
