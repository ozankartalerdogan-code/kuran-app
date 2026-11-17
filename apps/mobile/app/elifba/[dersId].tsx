import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView,
} from "react-native";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { logScreen } from '../../src/lib/analytics';
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ElifbaHarf } from "../../src/lib/api";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";
import { useColors } from "../../src/hooks/useColors";
import {
  parseElifbaProgress,
  parseElifbaQuizScores,
  parseElifbaSrs,
  selectQuizQuestionsWithSrs,
  updateElifbaSrs,
  type ElifbaProgress,
  type ElifbaSrsMap,
} from "../../src/lib/elifbaProgress";
import { normalizeQuizQuestions, type QuizQuestion } from "../../src/lib/elifbaQuizSession";
import { ElifbaQuizView } from "../../src/components/ElifbaQuizView";
import { playHarfSes, stopHarfSes } from "../../src/lib/elifbaAudio";
import { buildListeningItems, type ListeningItem } from "../../src/lib/elifbaListening";
import { useStrings, useLang, fmt } from "../../src/i18n";
import { localizeHarfler, localizeQuiz } from "../../src/lib/elifbaEn";
import { parseDersIcerik, type DersIcerik } from "../../src/lib/elifbaLessonContent";
import { ElifbaLessonContent } from "../../src/components/ElifbaLessonContent";
import elifbaStrings from "../../src/i18n/strings/elifba";

// ── Flashcard ─────────────────────────────────────────────────────────────────

function Flashcard({ harf, onNext, onPrev, isLast }: {
  harf: ElifbaHarf; onNext: () => void; onPrev: () => void; isLast: boolean;
}) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const badgeLabels: Record<string, string> = {
    "kalın": ep.kalinLabel, ince: ep.inceLabel, "her ikisi": ep.herIkisiLabel,
    birlesen: ep.birlesenLabel, birlesmeyen: ep.birlesmeyenLabel,
  };
  const [flipped, setFlipped] = useState(false);
  const [sesHata, setSesHata] = useState(false);
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
    });
  }, [harf.harf_id]);

  return (
    <View style={fc.container}>
      <TouchableOpacity
        style={fc.playBtn}
        onPress={handlePlay}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={fmt(ep.listenA11y, { name: harf.harf_adi })}
      >
        <Text style={fc.playIcon}>🔊</Text>
      </TouchableOpacity>

      {sesHata && (
        <Text style={fc.sesHata} accessibilityLiveRegion="polite">
          {ep.audioError}
        </Text>
      )}

      <TouchableOpacity
        style={[
          flipped ? fc.cardBack : fc.cardFront,
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
            <Text style={[fc.arabicChar, { color: c.text }]}>{harf.tek_basina}</Text>
            <Text style={[fc.hint, { color: c.textMuted }]}>{ep.flipText}</Text>
          </>
        ) : (
          <ScrollView contentContainerStyle={fc.backContent}>
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
          </ScrollView>
        )}
      </TouchableOpacity>
      <View style={fc.navRow}>
        <TouchableOpacity
          style={[fc.navBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={onPrev}
          accessibilityRole="button"
          accessibilityLabel={ep.prevLetterA11y}
        >
          <Text style={[fc.navBtnText, { color: c.textSecondary }]}>{ep.prev}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[fc.navBtn, fc.navBtnActive]}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? ep.toQuizA11y : ep.nextLetterA11y}
        >
          <Text style={[fc.navBtnText, { color: "#fff" }]}>
            {isLast ? ep.toQuiz : ep.next}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizView({ dersId, onFinish }: { dersId: number; onFinish: (s: number, t: number) => void }) {
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
    const snapshot = failedSnapshotRef.current;
    if (snapshot) persistSrs(snapshot);
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
      <ElifbaQuizView
        key={sessionKey}
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
    const snapshot = failedSnapshotRef.current;
    if (snapshot) persistSrs(snapshot);
  }, [persistSrs]);

  const playAudio = useCallback(
    (harfId: number, onError: () => void) => playHarfSes(harfId, onError),
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

type Mode = "flashcard" | "quiz" | "listen";

export default function DersScreen() {
  const { dersId: raw, mode: initialMode, baslik: rawBaslik } = useLocalSearchParams<{
    dersId: string; mode?: string; baslik?: string;
  }>();
  const dersId = Number(raw);
  const insets = useSafeAreaInsets();
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  useEffect(() => { logScreen('ElifBaDers'); }, []);

  // Harf sesi modül seviyesinde tutuluyor (playHarfSes); ekrandan çıkarken
  // hâlâ çalıyorsa durdur — aksi halde başka bir ekrana geçince de öter.
  useEffect(() => () => { stopHarfSes(); }, []);

  const lang = useLang();
  const [harflerRaw, setHarfler] = useState<ElifbaHarf[]>([]);
  const harfler = useMemo(() => localizeHarfler(harflerRaw, lang), [harflerRaw, lang]);
  // 4 farklı harfi olmayan derslerde (ör. Med Harfleri) dinleme sorusu kurulamaz; sekmeyi gizle.
  const canListen = useMemo(() => buildListeningItems(harfler, () => 0).length > 0, [harfler]);
  const [loading, setLoading]   = useState(true);
  // Hata yutulursa boş liste "harf verisi bulunamadı" gibi görünür — ayrı durum + retry.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode]         = useState<Mode>(initialMode === "quiz" ? "quiz" : "flashcard");
  const [idx, setIdx]           = useState(0);
  const [seenIds, setSeenIds]   = useState<number[]>([]);
  const [dersIcerik, setDersIcerik] = useState<DersIcerik | null>(null);
  const progressRef             = useRef<ElifbaProgress>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(false);
    api.elifba.harfler(dersId)
      .then((h) => { if (isMounted) setHarfler(h); })
      .catch(() => { if (isMounted) setLoadError(true); })
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
  }, [dersId, reloadKey]);

  useEffect(() => {
    let isMounted = true;
    setDersIcerik(null);
    api.elifba.dersler()
      .then((list) => {
        if (!isMounted) return;
        const ders = list.find((d) => d.id === dersId);
        setDersIcerik(ders ? parseDersIcerik(ders.icerik_json) : null);
      })
      .catch(() => {
        if (isMounted) setDersIcerik(null);
      });
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
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title: rawBaslik ?? ep.lessonFallback }} />
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const title = rawBaslik ?? fmt(ep.lessonFallbackN, { n: dersId });
  const pct   = harfler.length > 0 ? Math.round((seenIds.length / harfler.length) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: c.bg }]}>
        {/* Mod seçici */}
        <View style={styles.modeBar}>
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
        </View>

        {mode === "listen" && canListen ? (
          <ListeningView harfler={harfler} onFinish={() => router.back()} />
        ) : mode === "flashcard" ? (
          harfler.length > 0 ? (
            <>
              {dersIcerik && <ElifbaLessonContent icerik={dersIcerik} lang={lang} />}
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
                      accessibilityLabel={fmt(ep.goToLetterA11y, { name: h.harf_adi })}
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
  noData:    { color:"#78716c", fontSize:14, textAlign:"center" },
  modeBar:   { flexDirection:"row", margin:12, gap:8 },
  modeBtn:   { flex:1, paddingVertical:10, borderRadius:10, backgroundColor:"#fffdf6", borderWidth:1, borderColor:"#e7dfcc", alignItems:"center" },
  modeBtnActive: { backgroundColor:"#059669", borderColor:"#059669" },
  modeBtnText:   { fontSize:12, fontWeight:"600", color:"#44403c", textAlign:"center" },
  modeBtnTextActive: { color:"#fff" },
  counter:   { textAlign:"center", fontSize:12, color:"#a8a29e", marginBottom:4 },
  dots:      { flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:7, paddingHorizontal:16, marginTop:14 },
  dot:       { width:10, height:10, borderRadius:5 },
  dotActive: { backgroundColor:"#059669", transform:[{ scale:1.35 }] },
  dotSeen:   { backgroundColor:"#a7f3d0" },
  dotEmpty:  { backgroundColor:"#d6d3d1" },
});

const fc = StyleSheet.create({
  container:   { flex:1, padding:16, alignItems:"center", width:"100%", maxWidth:READING_MAX_WIDTH, alignSelf:"center" },
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
  formsRow:    { flexDirection:"row", gap:12, marginTop:4 },
  formBox:     { alignItems:"center", backgroundColor:"#fffdf6", borderRadius:10, padding:10, minWidth:60 },
  formLabel:   { fontSize:9, fontWeight:"700", color:"#a8a29e", letterSpacing:0.5, marginBottom:4 },
  formChar:    { fontSize:22, color:"#1c1917" },
  mahrec:      { fontSize:12, color:"#78716c", textAlign:"center" },
  badges:      { flexDirection:"row", gap:8 },
  badge:       { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  badgeText:   { fontSize:11, fontWeight:"600", color:"#44403c" },
  navRow:        { flexDirection:"row", gap:10, marginTop:16, width:"100%" },
  navBtn:        { flex:1, borderRadius:12, paddingVertical:13, borderWidth:1, borderColor:"#e7dfcc", backgroundColor:"#fffdf6", alignItems:"center" },
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
