import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { useLang, useStrings } from "../../src/i18n";
import elifbaStrings from "../../src/i18n/strings/elifba";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import {
  parseElifbaSrs,
  updateElifbaSrs,
  type ElifbaSrsMap,
} from "../../src/lib/elifbaProgress";
import { normalizeQuizQuestions, type QuizQuestion } from "../../src/lib/elifbaQuizSession";
import { ElifbaQuizView } from "../../src/components/ElifbaQuizView";
import { localizeQuiz } from "../../src/lib/elifbaEn";
import { selectWrongReview } from "../../src/lib/elifbaReview";

const REVIEW_MAX = 15;

export default function TekrarScreen() {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { lessons: rawLessons } = useLocalSearchParams<{ lessons?: string }>();

  const lessonIds = useMemo(
    () => (rawLessons ?? "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
    [rawLessons],
  );

  const [pool, setPool]               = useState<QuizQuestion[] | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError]     = useState(false);
  const [srsReady, setSrsReady]       = useState(false);
  const [srsError, setSrsError]       = useState(false);
  const [questions, setQuestions]     = useState<QuizQuestion[] | null>(null);
  const [sessionKey, setSessionKey]   = useState(0);
  const [writeError, setWriteError]   = useState(false);
  const [reloadKey, setReloadKey]     = useState(0);

  const requestIdRef = useRef(0);
  const srsRef = useRef<ElifbaSrsMap>({});
  const srsLoadFailedRef = useRef(false);
  const answeredIdsRef = useRef<Set<number>>(new Set());
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedSnapshotRef = useRef<ElifbaSrsMap | null>(null);

  useEffect(() => {
    if (lessonIds.length === 0) {
      setPool(null);
      setPoolError(false);
      setPoolLoading(false);
      return;
    }

    let isMounted = true;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPoolLoading(true);
    setPoolError(false);
    setPool(null);

    Promise.all(lessonIds.map((id) =>
      api.elifba.quiz(id).then((data) => normalizeQuizQuestions(localizeQuiz(data, lang))),
    ))
      .then((pools) => {
        if (!isMounted || requestIdRef.current !== requestId) return;
        setPool(pools.flat());
      })
      .catch(() => {
        if (!isMounted || requestIdRef.current !== requestId) return;
        setPoolError(true);
      })
      .finally(() => {
        if (isMounted && requestIdRef.current === requestId) setPoolLoading(false);
      });

    return () => { isMounted = false; };
  }, [lessonIds, lang, reloadKey]);

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
        // Okuma başarısızsa boş haritayla devam et; diske YAZMA (geçmişi ezmemek için).
        srsRef.current = {};
        srsLoadFailedRef.current = true;
        setSrsError(true);
        setSrsReady(true);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!srsReady || poolLoading || pool === null) return;
    // Başlangıç soruları oturum boyunca sabit kalır.
    if (questions !== null) return;
    answeredIdsRef.current = new Set();
    setQuestions(selectWrongReview(pool, srsRef.current, REVIEW_MAX, Math.random));
    setSessionKey((key) => key + 1);
  }, [srsReady, poolLoading, pool, questions]);

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
        if (questions !== null && questions.length === 0 && answeredIdsRef.current.size === 0) {
          setQuestions(null);
        }
      })
      .catch(() => setSrsError(true));
  }, [questions]);

  const retryWrite = useCallback(() => {
    // Eski başarısız anlık görüntüyü değil güncel durumu yaz: arada verilen
    // cevaplar kaybolmasın (kuyrukta eski sürüm yenisinin ardından yazılmasın).
    if (failedSnapshotRef.current) persistSrs(srsRef.current);
  }, [persistSrs]);

  const retryLoad = useCallback(() => { setReloadKey((key) => key + 1); }, []);
  const handleFinish = useCallback(() => { router.dismissTo("/elifba"); }, []);

  const isEmpty = !poolLoading && !poolError
    && (lessonIds.length === 0 || (questions !== null && questions.length === 0));

  return (
    <>
      <Stack.Screen options={{ title: ep.reviewTitle }} />
      <View style={[s.container, { backgroundColor: c.bg, paddingBottom: insets.bottom }]}>
        <View style={s.noticeWrap}>
        {srsError && (
          <View style={[s.notice, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
              {ep.srsLoadError}
            </Text>
            <TouchableOpacity
              style={[s.retryBtn, s.retryBtnCompact, { backgroundColor: c.accent }]}
              onPress={retrySrs}
              accessibilityRole="button"
              accessibilityLabel={ep.srsLoadRetryA11y}
            >
              <Text style={s.retryText}>{ep.retry}</Text>
            </TouchableOpacity>
          </View>
        )}
        {writeError && (
          <View style={[s.notice, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.noticeText, { color: c.text }]} accessibilityLiveRegion="polite">
              {ep.srsWriteError}
            </Text>
            <TouchableOpacity
              style={[s.retryBtn, s.retryBtnCompact, { backgroundColor: c.accent }]}
              onPress={retryWrite}
              accessibilityRole="button"
              accessibilityLabel={ep.srsWriteRetryA11y}
            >
              <Text style={s.retryText}>{ep.retry}</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>

        {poolLoading || !srsReady ? (
          <ActivityIndicator size="large" color={c.accent} style={s.loading} />
        ) : poolError ? (
          <View style={s.centered}>
            <Text style={s.errEmoji}>📚</Text>
            <Text style={[s.errText, { color: c.textMuted }]}>{ep.quizError}</Text>
            <TouchableOpacity
              style={[s.retryBtn, { backgroundColor: c.accent }]}
              onPress={retryLoad}
              accessibilityRole="button"
              accessibilityLabel={ep.reloadQuizA11y}
            >
              <Text style={s.retryText}>{ep.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : isEmpty ? (
          <View style={s.centered}>
            <Text style={[s.errText, { color: c.textMuted }]}>{ep.reviewEmpty}</Text>
            <TouchableOpacity
              style={[s.retryBtn, { backgroundColor: c.accent }]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={ep.backToLessonsA11y}
            >
              <Text style={s.retryText}>{ep.backToLessons}</Text>
            </TouchableOpacity>
          </View>
        ) : questions === null ? (
          <ActivityIndicator size="large" color={c.accent} style={s.loading} />
        ) : (
          <ElifbaQuizView
            key={sessionKey}
            questions={questions}
            onAnswer={handleAnswer}
            onFinish={handleFinish}
          />
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading:   { marginTop: 40 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errEmoji:  { fontSize: 40, marginBottom: 12 },
  errText:   { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 20 },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10, alignSelf: "center" },
  retryBtnCompact: { paddingVertical: 8, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  notice:    { marginHorizontal: 12, marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  noticeWrap: { width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  noticeText: { fontSize: 13, lineHeight: 19 },
});
