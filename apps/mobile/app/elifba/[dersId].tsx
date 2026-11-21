import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, useWindowDimensions,
} from "react-native";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { logScreen } from '../../src/lib/analytics';
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ElifbaHarf } from "../../src/lib/api";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { useColors } from "../../src/hooks/useColors";
import {
  ELIFBA_QUIZ_PASS,
  canOpenLesson,
  getLessonStatus,
  mergeQuizScore,
  parseElifbaProgress,
  parseElifbaQuizScores,
  parseElifbaSrs,
  selectQuizQuestionsWithSrs,
  updateElifbaSrs,
  type ElifbaProgress,
  type ElifbaQuizScores,
  type ElifbaSrsMap,
} from "../../src/lib/elifbaProgress";
import { normalizeQuizQuestions, type QuizQuestion } from "../../src/lib/elifbaQuizSession";
import {
  buildExerciseQuestions,
  type ReviewedExercise,
} from "../../src/lib/elifbaExerciseGen";
import exercisesData from "../../src/data/elifba.exercises.json";
import { ElifbaQuizView } from "../../src/components/ElifbaQuizView";
import { playHarfSes, stopHarfSes } from "../../src/lib/elifbaAudio";
import { buildListeningItems, type ListeningItem } from "../../src/lib/elifbaListening";
import { useStrings, useLang, fmt } from "../../src/i18n";
import { localizeDersler, localizeHarfler, localizeQuiz } from "../../src/lib/elifbaEn";
import { parseDersIcerik } from "../../src/lib/elifbaLessonContent";
import { ElifbaLessonContent } from "../../src/components/ElifbaLessonContent";
import elifbaStrings from "../../src/i18n/strings/elifba";

function shortBaslik(b: string) {
  return b.replace(/^\d+\.\s*(KONU|LESSON):\s*/i, "");
}

const reviewedExercises = exercisesData as unknown as ReviewedExercise[];

// ── Flashcard ─────────────────────────────────────────────────────────────────

function Flashcard({ harf, cardHeight = 220 }: { harf: ElifbaHarf; cardHeight?: number }) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const isCompact = cardHeight < 200;
  const arabicSize = cardHeight >= 210 ? 96 : Math.max(52, Math.round((cardHeight - 56) * 0.56));
  const badgeLabels: Record<string, string> = {
    "kalın": ep.kalinLabel, ince: ep.inceLabel, "her ikisi": ep.herIkisiLabel,
    birlesen: ep.birlesenLabel, birlesmeyen: ep.birlesmeyenLabel,
  };
  const [flipped, setFlipped] = useState(false);
  const [sesHata, setSesHata] = useState(false);
  const [playing, setPlaying] = useState(false);
  const sesHataTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPlayRef = useRef<(() => void) | null>(null);
  const cardLabel = flipped
    ? fmt(ep.cardLabelFlipped, { name: harf.harf_adi, sound: harf.harf_sesi, mahrec: harf.mahrec })
    : fmt(ep.cardLabel, { name: harf.harf_adi });

  // Kart değişince önceki kartın bekleyen ses/timeout'unu iptal et — yoksa gecikmiş
  // hata callback'i yeni karta ait "ses hatası" uyarısını yanlışlıkla tetikleyebilir.
  useEffect(() => {
    cancelPlayRef.current?.();
    setFlipped(false); setSesHata(false);
  }, [harf.harf_id]);
  useEffect(() => () => {
    if (sesHataTimer.current) clearTimeout(sesHataTimer.current);
    cancelPlayRef.current?.();
  }, []);

  const handlePlay = useCallback(() => {
    setSesHata(false);
    cancelPlayRef.current?.();
    cancelPlayRef.current = playHarfSes(harf.harf_id, () => {
      setSesHata(true);
      if (sesHataTimer.current) clearTimeout(sesHataTimer.current);
      sesHataTimer.current = setTimeout(() => setSesHata(false), 3000);
    }, setPlaying);
  }, [harf.harf_id]);

  return (
    <View style={[fc.container, isCompact && { paddingVertical: 8 }]}>
      <TouchableOpacity
        style={[fc.playBtn, isCompact && { padding: 6, marginBottom: 2 }]}
        onPress={handlePlay}
        activeOpacity={0.7}
        accessibilityRole="button"
        disabled={playing}
        accessibilityState={{ busy: playing, selected: playing, disabled: playing }}
        accessibilityLabel={playing ? ep.playing : fmt(ep.listenA11y, { name: harf.harf_adi })}
      >
        <Text style={playing ? { color: c.text, fontSize: 14 } : fc.playIcon}>{playing ? ep.playing : "🔊"}</Text>
      </TouchableOpacity>

      {sesHata && (
        <Text style={fc.sesHata} accessibilityLiveRegion="polite">
          {ep.audioError}
        </Text>
      )}

      <TouchableOpacity
        style={[
          flipped ? fc.cardBack : fc.cardFront,
          { minHeight: cardHeight },
          isCompact && (flipped ? { padding: 14 } : { paddingVertical: 14, paddingHorizontal: 20 }),
          flipped
            ? c.isDark && { backgroundColor: "#052e22", borderColor: "#065f46" }
            : { backgroundColor: c.card, borderColor: c.border },
        ]}
        onPress={() => setFlipped((f) => !f)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={cardLabel}
        accessibilityHint={ep.flipHint}
        accessibilityState={{ expanded: flipped }}
      >
        {!flipped ? (
          <>
            <Text
              style={[fc.arabicChar, { color: c.text, fontSize: arabicSize }]}
              allowFontScaling={false}
            >
              {harf.tek_basina}
            </Text>
            <Text
              style={[fc.hint, { color: c.textMuted }, isCompact && { marginTop: 4 }]}
              numberOfLines={2}
            >
              {ep.flipText}
            </Text>
          </>
        ) : (
          <View style={fc.backContent}>
            <Text style={[fc.arabicSmall, { color: c.text }]}>{harf.tek_basina}</Text>
            <Text style={[fc.harfAdi, c.isDark && { color: "#6ee7b7" }]}>{harf.harf_adi}</Text>
            <Text style={[fc.harfSesi, { color: c.accent }]}>{harf.harf_sesi}</Text>
            <View style={fc.formsRow}>
              {[[ep.fBegin, harf.basta], [ep.fMid, harf.ortada], [ep.fEnd, harf.sonda]].map(([l, v]) => (
                <View key={l} style={[fc.formBox, { backgroundColor: c.card }]}>
                  <Text style={[fc.formLabel, { color: c.textMuted }]}>{l}</Text>
                  <Text style={[fc.formChar, { color: c.text }]}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={[fc.mahrec, { color: c.textMuted }]}>{fmt(ep.makhraj, { m: harf.mahrec })}</Text>
            <View style={fc.badges}>
              <View style={[fc.badge, { backgroundColor: harf.kalin_ince === "kalın" ? "#fef3c7" : "#dbeafe" }]}>
                <Text style={fc.badgeText}>{badgeLabels[harf.kalin_ince] ?? harf.kalin_ince}</Text>
              </View>
              <View style={[fc.badge, { backgroundColor: "#f0fdf4" }]}>
                <Text style={fc.badgeText}>{badgeLabels[harf.grup] ?? harf.grup}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizView({ dersId, onFinish, isBypass = false }: { dersId: number; isBypass?: boolean; onFinish: (s: number, t: number) => void }) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const lang = useLang();
  const [pool, setPool]           = useState<QuizQuestion[] | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState(false);
  const [srsReady, setSrsReady]   = useState(false);
  const [srsError, setSrsError]   = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [writeError, setWriteError] = useState(false);
  const requestIdRef = useRef(0);
  const srsRef = useRef<ElifbaSrsMap>({});
  const srsLoadFailedRef = useRef(false);
  const answeredIdsRef = useRef<Set<number>>(new Set());
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedSnapshotRef = useRef<ElifbaSrsMap | null>(null);

  const loadQuiz = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPoolLoading(true);
    setPoolError(false);
    setPool(null);
    setQuestions(null);
    api.elifba.quiz(dersId)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setPool(normalizeQuizQuestions(localizeQuiz(data, lang)));
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setPoolError(true);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setPoolLoading(false);
      });
  }, [dersId, lang]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  useEffect(() => {
    let isMounted = true;
    setSrsError(false);
    srsLoadFailedRef.current = false;
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then((raw) => {
        if (!isMounted) return;
        srsRef.current = parseElifbaSrs(raw);
        setSrsReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        // Okuma başarısızsa boş haritayla devam et; kullanıcıya görünür retry sun.
        srsRef.current = {};
        srsLoadFailedRef.current = true;
        setSrsError(true);
        setSrsReady(true);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!srsReady || pool === null) return;
    answeredIdsRef.current = new Set();
    setQuestions(selectQuizQuestionsWithSrs(pool, srsRef.current, 15));
    setSessionKey((k) => k + 1);
  }, [pool, srsReady]);

  useEffect(() => () => { requestIdRef.current += 1; }, []);

  const persistSrs = useCallback((snapshot: ElifbaSrsMap) => {
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await storage.setJSON(STORAGE_KEYS.elifbaSrs, snapshot);
        failedSnapshotRef.current = null;
        setWriteError(false);
      } catch {
        failedSnapshotRef.current = snapshot;
        setWriteError(true);
      }
    });
  }, []);

  const handleAnswer = useCallback((q: QuizQuestion, correct: boolean) => {
    // Aynı karede gelen ikinci dokunuşu tek soru bazında kes.
    if (answeredIdsRef.current.has(q.quiz_id)) return;
    answeredIdsRef.current.add(q.quiz_id);
    // Okuma hatasında diskteki geçmişi ezmemek için SRS'i güncellemiyoruz.
    if (srsLoadFailedRef.current) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const next = updateElifbaSrs(srsRef.current, `q:${q.quiz_id}`, correct, nowSec);
    srsRef.current = next;
    persistSrs(next);
  }, [persistSrs]);

  const retrySrs = useCallback(() => {
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then((raw) => {
        srsRef.current = parseElifbaSrs(raw);
        srsLoadFailedRef.current = false;
        setSrsError(false);
      })
      .catch(() => setSrsError(true));
  }, []);

  const retryWrite = useCallback(() => {
    // Eski başarısız anlık görüntüyü değil güncel durumu yaz: arada verilen
    // cevaplar kaybolmasın (kuyrukta eski sürüm yenisinin ardından yazılmasın).
    if (failedSnapshotRef.current) persistSrs(srsRef.current);
  }, [persistSrs]);

  if (poolLoading || !srsReady) {
    return <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />;
  }
  if (poolError) return (
    <View style={qv.errBox}>
      <Text style={qv.errEmoji}>📚</Text>
      <Text style={[qv.noQ, { color: c.textMuted }]}>{ep.quizError}</Text>
      <TouchableOpacity
        style={qv.retryBtn}
        onPress={loadQuiz}
        accessibilityRole="button"
        accessibilityLabel={ep.reloadQuizA11y}
      >
        <Text style={qv.retryText}>{ep.retry}</Text>
      </TouchableOpacity>
    </View>
  );
  if (questions === null) {
    return <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {srsError && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
            {ep.srsLoadError}
          </Text>
          <TouchableOpacity
            style={qv.retryBtn}
            onPress={retrySrs}
            accessibilityRole="button"
            accessibilityLabel={ep.srsLoadRetryA11y}
          >
            <Text style={qv.retryText}>{ep.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      {writeError && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
            {ep.srsWriteError}
          </Text>
          <TouchableOpacity
            style={qv.retryBtn}
            onPress={retryWrite}
            accessibilityRole="button"
            accessibilityLabel={ep.srsWriteRetryA11y}
          >
            <Text style={qv.retryText}>{ep.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      {isBypass && questions.length > 0 && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]}>
            {fmt(ep.bypassBanner, { n: ELIFBA_QUIZ_PASS, total: questions.length })}
          </Text>
        </View>
      )}
      <ElifbaQuizView
        isBypass={isBypass}
        key={sessionKey}
        questions={questions}
        onAnswer={handleAnswer}
        onFinish={onFinish}
      />
    </View>
  );
}

// ── Alıştırma ────────────────────────────────────────────────────────────────

function ExerciseView({ questions, onFinish }: {
  questions: QuizQuestion[]; onFinish: () => void;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [srsReady, setSrsReady] = useState(false);
  const [srsError, setSrsError] = useState(false);
  const [writeError, setWriteError] = useState(false);
  const srsRef = useRef<ElifbaSrsMap>({});
  const srsLoadFailedRef = useRef(false);
  const answeredIdsRef = useRef<Set<number>>(new Set());
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedSnapshotRef = useRef<ElifbaSrsMap | null>(null);

  useEffect(() => {
    let isMounted = true;
    setSrsError(false);
    srsLoadFailedRef.current = false;
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then((raw) => {
        if (!isMounted) return;
        srsRef.current = parseElifbaSrs(raw);
        setSrsReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        // Okuma başarısızsa diskteki geçmişi ezmemek için SRS yazılmaz.
        srsRef.current = {};
        srsLoadFailedRef.current = true;
        setSrsError(true);
        setSrsReady(true);
      });
    return () => { isMounted = false; };
  }, []);

  const persistSrs = useCallback((snapshot: ElifbaSrsMap) => {
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await storage.setJSON(STORAGE_KEYS.elifbaSrs, snapshot);
        failedSnapshotRef.current = null;
        setWriteError(false);
      } catch {
        failedSnapshotRef.current = snapshot;
        setWriteError(true);
      }
    });
  }, []);

  const handleAnswer = useCallback((q: QuizQuestion, correct: boolean) => {
    if (answeredIdsRef.current.has(q.quiz_id)) return;
    answeredIdsRef.current.add(q.quiz_id);
    if (srsLoadFailedRef.current) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const next = updateElifbaSrs(srsRef.current, `exercise:${q.quiz_id}`, correct, nowSec);
    srsRef.current = next;
    persistSrs(next);
  }, [persistSrs]);

  const retrySrs = useCallback(() => {
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then((raw) => {
        srsRef.current = parseElifbaSrs(raw);
        srsLoadFailedRef.current = false;
        setSrsError(false);
      })
      .catch(() => setSrsError(true));
  }, []);

  const retryWrite = useCallback(() => {
    // Eski başarısız anlık görüntüyü değil güncel durumu yaz: arada verilen
    // cevaplar kaybolmasın (kuyrukta eski sürüm yenisinin ardından yazılmasın).
    if (failedSnapshotRef.current) persistSrs(srsRef.current);
  }, [persistSrs]);

  if (!srsReady) {
    return <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />;
  }
  if (questions.length === 0) {
    return <Text style={[qv.noQ, { color: c.textMuted }]}>{ep.noQuestions}</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      {srsError && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
            {ep.srsLoadError}
          </Text>
          <TouchableOpacity
            style={qv.retryBtn}
            onPress={retrySrs}
            accessibilityRole="button"
            accessibilityLabel={ep.srsLoadRetryA11y}
          >
            <Text style={qv.retryText}>{ep.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      {writeError && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
            {ep.srsWriteError}
          </Text>
          <TouchableOpacity
            style={qv.retryBtn}
            onPress={retryWrite}
            accessibilityRole="button"
            accessibilityLabel={ep.srsWriteRetryA11y}
          >
            <Text style={qv.retryText}>{ep.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      <ElifbaQuizView
        questions={questions}
        onAnswer={handleAnswer}
        onFinish={onFinish}
      />
    </View>
  );
}

// ── Dinleme Testi ────────────────────────────────────────────────────────────

function ListeningView({ harfler, onFinish }: {
  harfler: ElifbaHarf[]; onFinish: () => void;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [items, setItems]           = useState<ListeningItem[] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [srsReady, setSrsReady]     = useState(false);
  const [srsError, setSrsError]     = useState(false);
  const [writeError, setWriteError] = useState(false);
  const srsRef = useRef<ElifbaSrsMap>({});
  const srsLoadFailedRef = useRef(false);
  const answeredRef = useRef<Set<string>>(new Set());
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedSnapshotRef = useRef<ElifbaSrsMap | null>(null);

  useEffect(() => {
    let isMounted = true;
    setSrsError(false);
    srsLoadFailedRef.current = false;
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then((raw) => {
        if (!isMounted) return;
        srsRef.current = parseElifbaSrs(raw);
        setSrsReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        srsRef.current = {};
        srsLoadFailedRef.current = true;
        setSrsError(true);
        setSrsReady(true);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!srsReady) return;
    answeredRef.current = new Set();
    setItems(buildListeningItems(harfler, Math.random));
    setSessionKey((k) => k + 1);
  }, [harfler, srsReady]);

  const persistSrs = useCallback((snapshot: ElifbaSrsMap) => {
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await storage.setJSON(STORAGE_KEYS.elifbaSrs, snapshot);
        failedSnapshotRef.current = null;
        setWriteError(false);
      } catch {
        failedSnapshotRef.current = snapshot;
        setWriteError(true);
      }
    });
  }, []);

  const handleAnswer = useCallback((item: ListeningItem, correct: boolean) => {
    if (answeredRef.current.has(item.itemId)) return;
    answeredRef.current.add(item.itemId);
    if (srsLoadFailedRef.current) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const next = updateElifbaSrs(srsRef.current, item.itemId, correct, nowSec);
    srsRef.current = next;
    persistSrs(next);
  }, [persistSrs]);

  const retrySrs = useCallback(() => {
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaSrs)
      .then((raw) => {
        srsRef.current = parseElifbaSrs(raw);
        srsLoadFailedRef.current = false;
        setSrsError(false);
      })
      .catch(() => setSrsError(true));
  }, []);

  const retryWrite = useCallback(() => {
    // Eski başarısız anlık görüntüyü değil güncel durumu yaz: arada verilen
    // cevaplar kaybolmasın (kuyrukta eski sürüm yenisinin ardından yazılmasın).
    if (failedSnapshotRef.current) persistSrs(srsRef.current);
  }, [persistSrs]);

  const playAudio = useCallback(
    (harfId: number, onError: () => void, onPlayingChange?: (playing: boolean) => void) => playHarfSes(harfId, onError, onPlayingChange),
    [],
  );

  if (!srsReady || items === null) {
    return <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {srsError && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
            {ep.srsLoadError}
          </Text>
          <TouchableOpacity
            style={qv.retryBtn}
            onPress={retrySrs}
            accessibilityRole="button"
            accessibilityLabel={ep.srsLoadRetryA11y}
          >
            <Text style={qv.retryText}>{ep.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      {writeError && (
        <View style={[qv.notice, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[qv.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
            {ep.srsWriteError}
          </Text>
          <TouchableOpacity
            style={qv.retryBtn}
            onPress={retryWrite}
            accessibilityRole="button"
            accessibilityLabel={ep.srsWriteRetryA11y}
          >
            <Text style={qv.retryText}>{ep.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      <ElifbaQuizView
        key={sessionKey}
        kind="listening"
        items={items}
        onAnswer={handleAnswer}
        onPlayAudio={playAudio}
        onFinish={onFinish}
      />
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Mode = "flashcard" | "quiz" | "listen" | "exercise";

export default function DersScreen() {
  const { dersId: raw, mode: initialMode, baslik: rawBaslik, bypass: rawBypass } = useLocalSearchParams<{
    dersId: string; mode?: string; baslik?: string; bypass?: string;
  }>();
  const dersId = Number(raw);
  const isBypass = rawBypass === "1";
  const insets = useSafeAreaInsets();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  useEffect(() => { logScreen('ElifBaDers'); }, []);

  // Harf sesi modül seviyesinde tutuluyor (playHarfSes); ekrandan çıkarken
  // hâlâ çalıyorsa durdur — aksi halde başka bir ekrana geçince de öter.
  useEffect(() => () => { stopHarfSes(); }, []);

  const lang = useLang();
  const {
    data: derslerRaw,
    isLoading: derslerLoading,
    isError: derslerError,
    refetch: refetchDersler,
  } = useQuery({
    queryKey: ["elifba-dersler"],
    queryFn: () => api.elifba.dersler(),
    staleTime: 60 * 60 * 1000,
  });
  const dersler = useMemo(() => localizeDersler(derslerRaw ?? [], lang), [derslerRaw, lang]);
  const currentIdx = useMemo(() => dersler.findIndex((d) => d.id === dersId), [dersler, dersId]);
  const currentDers = currentIdx >= 0 ? dersler[currentIdx] : null;
  const prevDers = currentIdx > 0 ? dersler[currentIdx - 1] : null;
  const currentDersRaw = useMemo(
    () => (derslerRaw ?? []).find((d) => d.id === dersId) ?? null,
    [derslerRaw, dersId],
  );
  const dersIcerik = useMemo(
    () => (currentDersRaw ? parseDersIcerik(currentDersRaw.icerik_json) : null),
    [currentDersRaw],
  );

  const [harflerRaw, setHarfler] = useState<ElifbaHarf[]>([]);
  const harfler = useMemo(() => localizeHarfler(harflerRaw, lang), [harflerRaw, lang]);
  // 4 farklı harfi olmayan derslerde (ör. Med Harfleri) dinleme sorusu kurulamaz; sekmeyi gizle.
  const canListen = useMemo(() => buildListeningItems(harfler, () => 0).length > 0, [harfler]);
  const exerciseQuestions = useMemo(
    () => buildExerciseQuestions(reviewedExercises, dersId, lang),
    [dersId, lang],
  );
  const canExercise = exerciseQuestions.length > 0;
  const [loading, setLoading]   = useState(true);
  // Hata yutulursa boş liste "harf verisi bulunamadı" gibi görünür — ayrı durum + retry.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode]         = useState<Mode>(isBypass || initialMode === "quiz" ? "quiz" : "flashcard");
  const [idx, setIdx]           = useState(0);
  const lettersRef = useRef<ScrollView>(null);
  useEffect(() => {
    lettersRef.current?.scrollTo({ x: Math.max(0, idx * 51 - 16), animated: true });
  }, [idx, mode]);
  const [seenIds, setSeenIds]   = useState<number[]>([]);
  const [progress, setProgress] = useState<ElifbaProgress>({});
  const [quizScores, setQuizScores] = useState<ElifbaQuizScores>({});
  const [progressReady, setProgressReady] = useState(false);
  const [scoresReady, setScoresReady]     = useState(false);
  const progressRef             = useRef<ElifbaProgress>({});

  useEffect(() => {
    setMode(isBypass || initialMode === "quiz" ? "quiz" : "flashcard");
    setIdx(0);
  }, [dersId, initialMode, isBypass]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(false);
    setHarfler([]);
    api.elifba.harfler(dersId)
      .then((h) => { if (isMounted) setHarfler(h); })
      .catch(() => { if (isMounted) setLoadError(true); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [dersId, reloadKey]);

  const loadProgressAndScores = useCallback(() => {
    let isMounted = true;
    storage.getJSON<unknown>(STORAGE_KEYS.elifbaProgress)
      .then((rawProgress) => {
        if (!isMounted) return;
        const parsedProgress = parseElifbaProgress(rawProgress);
        progressRef.current = parsedProgress;
        setProgress(parsedProgress);
        setSeenIds(parsedProgress[String(dersId)] ?? []);
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setProgressReady(true); });
    storage.getJSON<unknown>(STORAGE_KEYS.quizScores)
      .then((rawScores) => {
        if (!isMounted) return;
        setQuizScores(parseElifbaQuizScores(rawScores));
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setScoresReady(true); });
    return () => { isMounted = false; };
  }, [dersId]);

  useFocusEffect(loadProgressAndScores);

  const markSeen = useCallback((harfId: number) => {
    setSeenIds((prev) => {
      if (prev.includes(harfId)) return prev;
      const next = [...prev, harfId];
      const updated = { ...progressRef.current, [String(dersId)]: next };
      progressRef.current = updated;
      setProgress(updated);
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
    if (!isBypass || s >= ELIFBA_QUIZ_PASS) {
      const prev = parseElifbaQuizScores(await storage.getJSON<unknown>(STORAGE_KEYS.quizScores));
      const next = isBypass
        ? mergeQuizScore(prev[String(dersId)], { score: s, total: t, bypass: true })
        // Sınavla geçilmiş derste normal test tekrarı bayrağı silmesin (ders yeniden kilitlenmesin).
        : { score: s, total: t, ...(prev[String(dersId)]?.bypass === true ? { bypass: true } : {}) };
      await storage.setJSON(STORAGE_KEYS.quizScores, { ...prev, [String(dersId)]: next }).catch(() => {});
    }
    router.dismissTo("/elifba");
  }, [dersId, isBypass]);

  const dersTitle = currentDers ? shortBaslik(currentDers.baslik) : null;
  const title = dersTitle ?? rawBaslik ?? fmt(ep.lessonFallbackN, { n: dersId });
  const statusLoading = derslerLoading || !progressReady || !scoresReady;
  const lessonStatus = useMemo(
    () => (currentDers ? getLessonStatus(currentDers, currentIdx, dersler, progress, quizScores) : null),
    [currentDers, currentIdx, dersler, progress, quizScores],
  );
  const canOpen = lessonStatus !== null && canOpenLesson(lessonStatus, { mode: initialMode, bypass: rawBypass });

  if (statusLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title: dersTitle ?? rawBaslik ?? ep.lessonFallback }} />
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (derslerError && !currentDers) {
    return (
      <View style={[styles.centered, styles.lockedWrap, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title }} />
        <Text style={[styles.noData, { color: c.textMuted }]}>{ep.loadError}</Text>
        <TouchableOpacity
          style={[qv.retryBtn, { backgroundColor: c.accent }]}
          onPress={() => { void refetchDersler(); }}
          accessibilityRole="button"
          accessibilityLabel={ep.reloadA11y}
        >
          <Text style={qv.retryText}>{ep.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentDers) {
    return (
      <View style={[styles.centered, styles.lockedWrap, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title }} />
        <Text style={[styles.noData, { color: c.textMuted }]}>{ep.noLessons}</Text>
        <TouchableOpacity
          style={[qv.retryBtn, { backgroundColor: c.accent }]}
          onPress={() => router.dismissTo("/elifba")}
          accessibilityRole="button"
          accessibilityLabel={ep.backToLessonsA11y}
        >
          <Text style={qv.retryText}>{ep.backToLessons}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!canOpen) {
    const prevName = prevDers ? shortBaslik(prevDers.baslik) : null;
    return (
      <View style={[styles.centered, styles.lockedWrap, { backgroundColor: c.bg, paddingBottom: insets.bottom + 24 }]}>
        <Stack.Screen options={{ title }} />
        <View style={[styles.lockCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.lockIconWrap, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
            <Ionicons name="lock-closed" size={30} color={c.textMuted} />
          </View>
          <Text style={[styles.lockTitle, { color: c.text }]}>{ep.lockedTitle}</Text>
          <Text style={[styles.lockHint, { color: c.textMuted }]}>
            {prevName ? fmt(ep.lockedPrevHint, { name: prevName }) : ep.lockedDefaultHint}
          </Text>
          <View style={styles.lockActions}>
            {prevDers && prevName && (
              <TouchableOpacity
                style={[styles.lockBtnSecondary, { backgroundColor: c.cardAlt, borderColor: c.border }]}
                onPress={() => router.replace({
                  pathname: "/elifba/[dersId]",
                  params: { dersId: String(prevDers.id), baslik: prevName },
                })}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={fmt(ep.goToPrevLessonA11y, { name: prevName })}
              >
                <Text style={[styles.lockBtnSecondaryText, { color: c.text }]}>{ep.goToPrevLesson}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.lockBtnPrimary, { backgroundColor: c.actionBg }]}
              onPress={() => router.replace({
                pathname: "/elifba/[dersId]",
                params: {
                  dersId: String(currentDers.id),
                  mode: "quiz",
                  bypass: "1",
                  baslik: shortBaslik(currentDers.baslik),
                },
              })}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={fmt(ep.bypassQuizA11y, { name: shortBaslik(currentDers.baslik) })}
            >
              <Text style={[styles.lockBtnPrimaryText, { color: c.actionText }]}>{ep.bypassQuizBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title }} />
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const pct   = harfler.length > 0 ? Math.round((seenIds.length / harfler.length) * 100) : 0;
  const lettersStripHeight = 16 + Math.max(44, Math.round(46 * fontScale));
  const chromeHeight = insets.top + insets.bottom + 56
    + (isBypass ? 0 : 56)
    + (harfler.length <= 30 ? lettersStripHeight : 0)
    + 80;
  const lessonEstimate = dersIcerik ? Math.round(148 * Math.min(fontScale, 1.35)) : 0;
  const cardHeight = Math.max(148, Math.min(220, windowHeight - chromeHeight - lessonEstimate - 72));
  const isCompact = cardHeight < 200;
  const prevDisabled = idx === 0;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        {/* Mod seçici */}
        {!isBypass && <View style={styles.modeBar}>
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: c.card, borderColor: c.border }, mode === "flashcard" && styles.modeBtnActive]}
            onPress={() => setMode("flashcard")}
            accessibilityRole="tab"
            accessibilityLabel={fmt(ep.cardsModeA11y, { pct })}
            accessibilityState={{ selected: mode === "flashcard" }}
          >
            <Text
              style={[styles.modeBtnText, { color: c.textSecondary }, mode === "flashcard" && styles.modeBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {fmt(ep.cardsMode, { pct })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: c.card, borderColor: c.border }, mode === "quiz" && styles.modeBtnActive]}
            onPress={() => setMode("quiz")}
            accessibilityRole="tab"
            accessibilityLabel={ep.quizModeA11y}
            accessibilityState={{ selected: mode === "quiz" }}
          >
            <Text
              style={[styles.modeBtnText, { color: c.textSecondary }, mode === "quiz" && styles.modeBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {ep.quizBtn}
            </Text>
          </TouchableOpacity>
          {canExercise && (
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: c.card, borderColor: c.border }, mode === "exercise" && styles.modeBtnActive]}
            onPress={() => setMode("exercise")}
            accessibilityRole="tab"
            accessibilityLabel={ep.exerciseModeA11y}
            accessibilityState={{ selected: mode === "exercise" }}
          >
            <Text
              style={[styles.modeBtnText, { color: c.textSecondary }, mode === "exercise" && styles.modeBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {ep.exerciseBtn}
            </Text>
          </TouchableOpacity>
          )}
          {canListen && (
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: c.card, borderColor: c.border }, mode === "listen" && styles.modeBtnActive]}
            onPress={() => setMode("listen")}
            accessibilityRole="tab"
            accessibilityLabel={ep.listenModeA11y}
            accessibilityState={{ selected: mode === "listen" }}
          >
            <Text
              style={[styles.modeBtnText, { color: c.textSecondary }, mode === "listen" && styles.modeBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {ep.listenBtn}
            </Text>
          </TouchableOpacity>
          )}
        </View>}

        {mode === "exercise" && canExercise ? (
          <ExerciseView questions={exerciseQuestions} onFinish={() => router.dismissTo("/elifba")} />
        ) : mode === "listen" && canListen ? (
          <ListeningView harfler={harfler} onFinish={() => router.dismissTo("/elifba")} />
        ) : mode === "flashcard" ? (
          harfler.length > 0 ? (
            <>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                {dersIcerik && <ElifbaLessonContent icerik={dersIcerik} lang={lang} />}
                <Text style={styles.counter}>{idx + 1} / {harfler.length}</Text>
                <Flashcard
                  harf={harfler[idx]}
                  cardHeight={cardHeight}
                />
              </ScrollView>
              {harfler.length <= 30 && (
                <ScrollView
                  ref={lettersRef}
                  horizontal
                  style={{ height: lettersStripHeight, flexGrow: 0, flexShrink: 0 }}
                  contentContainerStyle={styles.letters}
                  onContentSizeChange={() => lettersRef.current?.scrollTo({ x: Math.max(0, idx * 51 - 16), animated: false })}
                >
                  {harfler.map((h, i) => (
                    <TouchableOpacity
                      key={h.harf_id}
                      onPress={() => {
                        if (harfler[idx]) markSeen(harfler[idx].harf_id);
                        setIdx(i);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={fmt(ep.goToLetterA11y, { name: h.harf_adi })}
                      accessibilityState={{ selected: i === idx }}
                      style={[styles.letterChip, { backgroundColor: i === idx ? c.accentLight : c.card, borderColor: i === idx ? c.accent : c.border }]}
                    >
                      <Text style={{ color: i === idx ? c.successText : c.text, fontSize: 22, fontFamily: "Amiri" }}>{h.tek_basina}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + (isCompact ? 10 : 16), flexShrink: 0, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" }}>
                <View style={[fc.navRow, isCompact && { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={[fc.navBtn, { backgroundColor: c.card, borderColor: c.border }, prevDisabled && fc.navBtnDisabled]}
                    onPress={handlePrev}
                    disabled={prevDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={ep.prevLetterA11y}
                    accessibilityState={{ disabled: prevDisabled }}
                  >
                    <Text style={[fc.navBtnText, { color: c.textSecondary }]}>{ep.prev}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[fc.navBtn, fc.navBtnActive]}
                    onPress={handleNext}
                    accessibilityRole="button"
                    accessibilityLabel={idx === harfler.length - 1 ? ep.toQuizA11y : ep.nextLetterA11y}
                  >
                    <Text style={[fc.navBtnText, { color: "#fff" }]}>
                      {idx === harfler.length - 1 ? ep.toQuiz : ep.next}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={[styles.centered, { backgroundColor: c.bg }]}>
              <Text style={[styles.noData, { color: c.textMuted }]}>
                {loadError ? ep.lettersError : ep.noLetters}
              </Text>
              {loadError && (
                <TouchableOpacity
                  style={qv.retryBtn}
                  onPress={() => setReloadKey((k) => k + 1)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={ep.retryA11y}
                >
                  <Text style={qv.retryText}>{ep.retry}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        ) : (
          <QuizView dersId={dersId} isBypass={isBypass} onFinish={handleQuizFinish} />
        )}
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f5f0e8" },
  centered:  { flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#f5f0e8" },
  lockedWrap: { paddingHorizontal: 20 },
  lockCard: {
    width: "100%", maxWidth: READING_MAX_WIDTH, borderRadius: 20, borderWidth: 1,
    padding: 24, alignItems: "center", gap: 12,
  },
  lockIconWrap: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 1,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  lockTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  lockHint: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  lockActions: { width: "100%", gap: 10, marginTop: 8 },
  lockBtnSecondary: {
    width: "100%", borderRadius: 12, borderWidth: 1, paddingVertical: 13,
    paddingHorizontal: 16, alignItems: "center",
  },
  lockBtnSecondaryText: { fontSize: 14, fontWeight: "700" },
  lockBtnPrimary: {
    width: "100%", borderRadius: 12, paddingVertical: 13,
    paddingHorizontal: 16, alignItems: "center",
  },
  lockBtnPrimaryText: { fontSize: 14, fontWeight: "700" },
  noData:    { color:"#78716c", fontSize:14, textAlign:"center" },
  modeBar:   { flexDirection:"row", margin:12, gap:8 },
  modeBtn:   { flex:1, paddingVertical:10, borderRadius:10, backgroundColor:"#fffdf6", borderWidth:1, borderColor:"#e7dfcc", alignItems:"center" },
  modeBtnActive: { backgroundColor:"#059669", borderColor:"#059669" },
  modeBtnText:   { fontSize:12, fontWeight:"600", color:"#44403c", textAlign:"center" },
  modeBtnTextActive: { color:"#fff" },
  counter:   { textAlign:"center", fontSize:12, color:"#a8a29e", marginBottom:4 },
  letters: { flexDirection: "row", gap: 7, paddingHorizontal: 16, paddingVertical: 8 },
  letterChip: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 8 },
});

const fc = StyleSheet.create({
  container:   { flexGrow:1, padding:16, alignItems:"center", width:"100%", maxWidth:READING_MAX_WIDTH, alignSelf:"center" },
  playBtn:     { alignSelf:"flex-end", padding:10, marginBottom:4 },
  playIcon:    { fontSize:28 },
  sesHata:     { fontSize:12, color:"#dc2626", textAlign:"center", marginBottom:8, paddingHorizontal:8 },
  cardFront: {
    width:"100%", minHeight:220, backgroundColor:"#fffdf6", borderRadius:20, borderWidth:1, borderColor:"#e7dfcc",
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
  formsRow:    { flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:12, marginTop:4 },
  formBox:     { alignItems:"center", backgroundColor:"#fffdf6", borderRadius:10, padding:10, minWidth:60 },
  formLabel:   { fontSize:9, fontWeight:"700", color:"#a8a29e", letterSpacing:0.5, marginBottom:4 },
  formChar:    { fontSize:22, color:"#1c1917" },
  mahrec:      { fontSize:12, color:"#78716c", textAlign:"center" },
  badges:      { flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:8 },
  badge:       { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  badgeText:   { fontSize:11, fontWeight:"600", color:"#44403c" },
  navRow:        { flexDirection:"row", gap:10, marginTop:16, width:"100%" },
  navBtn:        { flex:1, borderRadius:12, paddingVertical:13, borderWidth:1, borderColor:"#e7dfcc", backgroundColor:"#fffdf6", alignItems:"center" },
  navBtnDisabled:{ opacity:0.4 },
  navBtnActive:  { backgroundColor:"#059669", borderColor:"#059669" },
  navBtnText:    { fontSize:14, fontWeight:"700", color:"#44403c" },
});

const qv = StyleSheet.create({
  noQ:         { textAlign:"center", marginTop:40, color:"#78716c", lineHeight:22 },
  errBox:      { flex:1, alignItems:"center", justifyContent:"center", padding:24 },
  errEmoji:    { fontSize:40, marginBottom:8 },
  retryBtn:    { backgroundColor:"#059669", paddingHorizontal:24, paddingVertical:11, borderRadius:10, marginTop:12, alignSelf:"center" },
  retryText:   { color:"#fff", fontSize:14, fontWeight:"700" },
  notice:      { marginHorizontal:12, marginTop:12, padding:12, borderRadius:10, borderWidth:1, gap:6 },
  noticeText:  { fontSize:13, lineHeight:19 },
});
