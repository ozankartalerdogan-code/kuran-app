import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, type SurahListItem, type AyahDetailResponse } from "../lib/api";
import { storage, STORAGE_KEYS } from "../lib/storage";

// ── Tipler ──────────────────────────────────────────────────────────────────

type MushafBookmark = { surahId: number; ayahNumber: number } | null;
type AudioState     = "idle" | "playing" | "paused";
type LoadState      =
  | { status: "loading" }
  | { status: "ready"; surah: SurahListItem; ayah: AyahDetailResponse }
  | { status: "error"; message: string };

// ── Cüz tablosu ─────────────────────────────────────────────────────────────

const JUZ_TABLE = [
  { juz:  1, surahId:  1, ayahNumber:   1 }, { juz:  2, surahId:  2, ayahNumber: 142 },
  { juz:  3, surahId:  2, ayahNumber: 253 }, { juz:  4, surahId:  3, ayahNumber:  93 },
  { juz:  5, surahId:  4, ayahNumber:  24 }, { juz:  6, surahId:  4, ayahNumber: 148 },
  { juz:  7, surahId:  5, ayahNumber:  82 }, { juz:  8, surahId:  6, ayahNumber: 111 },
  { juz:  9, surahId:  7, ayahNumber:  88 }, { juz: 10, surahId:  8, ayahNumber:  41 },
  { juz: 11, surahId:  9, ayahNumber:  93 }, { juz: 12, surahId: 11, ayahNumber:   6 },
  { juz: 13, surahId: 12, ayahNumber:  53 }, { juz: 14, surahId: 15, ayahNumber:   1 },
  { juz: 15, surahId: 17, ayahNumber:   1 }, { juz: 16, surahId: 18, ayahNumber:  75 },
  { juz: 17, surahId: 21, ayahNumber:   1 }, { juz: 18, surahId: 23, ayahNumber:   1 },
  { juz: 19, surahId: 25, ayahNumber:  21 }, { juz: 20, surahId: 27, ayahNumber:  56 },
  { juz: 21, surahId: 29, ayahNumber:  46 }, { juz: 22, surahId: 33, ayahNumber:  31 },
  { juz: 23, surahId: 36, ayahNumber:  28 }, { juz: 24, surahId: 39, ayahNumber:  32 },
  { juz: 25, surahId: 41, ayahNumber:  47 }, { juz: 26, surahId: 46, ayahNumber:   1 },
  { juz: 27, surahId: 51, ayahNumber:  31 }, { juz: 28, surahId: 58, ayahNumber:   1 },
  { juz: 29, surahId: 67, ayahNumber:   1 }, { juz: 30, surahId: 78, ayahNumber:   1 },
];

function getJuzForSurah(surahId: number): number {
  for (let i = JUZ_TABLE.length - 1; i >= 0; i--) {
    if (surahId >= JUZ_TABLE[i].surahId) return JUZ_TABLE[i].juz;
  }
  return 1;
}

function getSurahForJuz(juz: number): number {
  return JUZ_TABLE.find(e => e.juz === juz)?.surahId ?? 1;
}

const BOOKMARK_KEY = STORAGE_KEYS.mushafBookmark;

// ── JuzTracker ───────────────────────────────────────────────────────────────

function JuzTracker({ currentJuz, onJuzPress }: { currentJuz: number; onJuzPress: (juz: number) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: (currentJuz - 1) * 48, animated: true });
  }, [currentJuz]);

  return (
    <View style={juzSt.container}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={juzSt.list}>
        {JUZ_TABLE.map(e => {
          const active = e.juz === currentJuz;
          return (
            <TouchableOpacity key={e.juz} style={[juzSt.seg, active && juzSt.segActive]} onPress={() => onJuzPress(e.juz)} activeOpacity={0.7}>
              <Text style={[juzSt.label, active && juzSt.labelActive]}>{e.juz}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={juzSt.indicator}>
        <Text style={juzSt.indicatorText}>{currentJuz}. Cüz</Text>
      </View>
    </View>
  );
}

// ── AudioPlayer (simülasyon) ─────────────────────────────────────────────────

function AudioPlayer({ state, progress, onPlayPause }: { state: AudioState; progress: number; onPlayPause: () => void }) {
  const isPlaying = state === "playing";
  return (
    <View style={audioSt.container}>
      <TouchableOpacity style={audioSt.playBtn} onPress={onPlayPause} activeOpacity={0.7}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#ffffff" />
      </TouchableOpacity>
      <View style={audioSt.info}>
        <Text style={audioSt.title} numberOfLines={1}>
          {isPlaying ? "Kıraat dinleniyor…" : state === "paused" ? "Duraklatıldı" : "Oynatıcı hazır"}
        </Text>
        <View style={audioSt.track}>
          <View style={[audioSt.fill, { width: `${Math.min(100, Math.max(0, progress))}%` as any }]} />
        </View>
      </View>
      <Text style={audioSt.time}>{formatTime(progress)}</Text>
    </View>
  );
}

function formatTime(p: number): string {
  const s = Math.floor((p / 100) * 180);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── BookmarkBar ──────────────────────────────────────────────────────────────

function BookmarkBar({ currentSurah, currentAyah, bookmark, onChange }: {
  currentSurah: number; currentAyah: number;
  bookmark: MushafBookmark; onChange: (bm: MushafBookmark) => void;
}) {
  const isHere = bookmark?.surahId === currentSurah && bookmark?.ayahNumber === currentAyah;

  const save = useCallback(async () => {
    await storage.setJSON(BOOKMARK_KEY, `${currentSurah}:${currentAyah}`);
    onChange({ surahId: currentSurah, ayahNumber: currentAyah });
  }, [currentSurah, currentAyah, onChange]);

  const goTo = useCallback(async () => {
    if (!bookmark) return;
    onChange(bookmark);
  }, [bookmark, onChange]);

  return (
    <View style={bmSt.container}>
      <TouchableOpacity style={[bmSt.btn, isHere && bmSt.btnActive]} onPress={save} activeOpacity={0.7}>
        <Ionicons name={isHere ? "bookmark" : "bookmark-outline"} size={16} color={isHere ? "#fff" : "#059669"} />
        <Text style={[bmSt.btnText, isHere && bmSt.btnTextActive]}>{isHere ? "İşaretlendi" : "Buraya İşaretle"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[bmSt.btn, bmSt.btnOutline]} onPress={goTo} activeOpacity={0.7} disabled={!bookmark}>
        <Ionicons name="location-outline" size={16} color={bookmark ? "#059669" : "#d6d3d1"} />
        <Text style={[bmSt.btnText, bmSt.btnTextOutline, !bookmark && { color: "#d6d3d1" }]}>
          {bookmark ? `Kaldığım Yer (${bookmark.surahId}:${bookmark.ayahNumber})` : "Kaldığım Yer"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── MushafReader ─────────────────────────────────────────────────────────────

interface MushafReaderProps {
  initialSurahId?: number;
  initialAyahNum?: number;
}

export function MushafReader({ initialSurahId = 1, initialAyahNum = 1 }: MushafReaderProps) {
  const [surahList, setSurahList]       = useState<SurahListItem[]>([]);
  const [currentSurahId, setCurrentSurahId] = useState(initialSurahId);
  const [currentAyahNum, setCurrentAyahNum] = useState(initialAyahNum);
  const [loadState, setLoadState]       = useState<LoadState>({ status: "loading" });
  const [bookmark, setBookmark]         = useState<MushafBookmark>(null);
  const [audioState, setAudioState]     = useState<AudioState>("idle");
  const [audioProgress, setAudioProgress] = useState(0);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sure listesi + bookmark
  useEffect(() => {
    api.surahs.list().then(setSurahList).catch(() => {});
    storage.getJSON<string>(BOOKMARK_KEY).then(raw => {
      if (!raw) return;
      const [sId, aNum] = raw.split(":").map(Number);
      if (sId && aNum && Number.isFinite(sId) && Number.isFinite(aNum)) {
        setBookmark({ surahId: sId, ayahNumber: aNum });
        // Dışarıdan başlangıç verilmediyse bookmark'tan başla
        if (initialSurahId === 1 && initialAyahNum === 1) {
          setCurrentSurahId(sId);
          setCurrentAyahNum(aNum);
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ayet yükleme
  useEffect(() => {
    if (!currentSurahId || !currentAyahNum) return;
    let cancelled = false;
    setLoadState({ status: "loading" });
    api.ayah.get(currentSurahId, currentAyahNum)
      .then(ayahData => {
        if (cancelled) return;
        const meta = surahList.find(s => s.id === currentSurahId);
        setLoadState({
          status: "ready",
          surah: meta ?? {
            id: ayahData.surahId, name: ayahData.surahName, arabicName: ayahData.arabicName,
            verseCount: ayahData.verseCount, translit: "", revelationPlace: "Mekke",
          },
          ayah: ayahData,
        });
      })
      .catch(() => { if (!cancelled) setLoadState({ status: "error", message: "Ayet yüklenemedi." }); });
    return () => { cancelled = true; };
  }, [currentSurahId, currentAyahNum, surahList]);

  // Ses simülasyonu
  useEffect(() => {
    if (audioState === "playing") {
      audioTimerRef.current = setInterval(() => {
        setAudioProgress(p => {
          if (p + 0.56 >= 100) { setAudioState("idle"); return 0; }
          return p + 0.56;
        });
      }, 1000);
    } else {
      if (audioTimerRef.current) { clearInterval(audioTimerRef.current); audioTimerRef.current = null; }
    }
    return () => { if (audioTimerRef.current) clearInterval(audioTimerRef.current); };
  }, [audioState]);

  const go = useCallback((sId: number, aNum: number) => {
    setCurrentSurahId(sId); setCurrentAyahNum(aNum);
    setAudioState("idle"); setAudioProgress(0);
  }, []);

  const handleJuzPress    = useCallback((juz: number) => go(getSurahForJuz(juz), 1), [go]);
  const handlePrevSurah   = useCallback(() => go(currentSurahId <= 1 ? 114 : currentSurahId - 1, 1), [go, currentSurahId]);
  const handleNextSurah   = useCallback(() => go(currentSurahId >= 114 ? 1 : currentSurahId + 1, 1), [go, currentSurahId]);
  const handlePrevAyah    = useCallback(() => {
    if (loadState.status !== "ready") return;
    const { ayah } = loadState;
    if (ayah.prevAyah) go(ayah.prevAyah.surahId, ayah.prevAyah.ayahNumber);
    else if (currentSurahId > 1) {
      const prev = surahList.find(s => s.id === currentSurahId - 1);
      go(currentSurahId - 1, prev?.verseCount ?? 1);
    }
  }, [loadState, currentSurahId, surahList, go]);
  const handleNextAyah    = useCallback(() => {
    if (loadState.status !== "ready") return;
    const { ayah } = loadState;
    if (ayah.nextAyah) go(ayah.nextAyah.surahId, ayah.nextAyah.ayahNumber);
    else if (currentSurahId < 114) go(currentSurahId + 1, 1);
  }, [loadState, currentSurahId, go]);
  const handlePlayPause   = useCallback(() => setAudioState(p => p === "playing" ? "paused" : "playing"), []);
  const handleBookmark    = useCallback((bm: MushafBookmark) => {
    setBookmark(bm);
    if (bm && (bm.surahId !== currentSurahId || bm.ayahNumber !== currentAyahNum)) go(bm.surahId, bm.ayahNumber);
  }, [currentSurahId, currentAyahNum, go]);
  const handleSurahSelect = useCallback((sId: number) => go(sId, 1), [go]);

  const currentJuz = getJuzForSurah(currentSurahId);
  const surahMeta  = loadState.status === "ready" ? loadState.surah : surahList.find(s => s.id === currentSurahId);
  const canPrev    = currentSurahId > 1 || currentAyahNum > 1;
  const canNext    = loadState.status === "ready"
    ? currentAyahNum < loadState.ayah.verseCount || currentSurahId < 114
    : currentSurahId < 114;

  return (
    <View style={st.screen}>
      <JuzTracker currentJuz={currentJuz} onJuzPress={handleJuzPress} />
      <AudioPlayer state={audioState} progress={audioProgress} onPlayPause={handlePlayPause} />

      <ScrollView style={st.scroll} contentContainerStyle={st.scrollInner} showsVerticalScrollIndicator={false}>
        {/* Sure başlığı */}
        {surahMeta && (
          <View style={st.surahHeader}>
            <Text style={st.surahArabic}>{surahMeta.arabicName}</Text>
            <Text style={st.surahName}>{surahMeta.id}. {surahMeta.name}</Text>
            <Text style={st.surahMeta}>{surahMeta.verseCount} ayet · {surahMeta.revelationPlace}</Text>
          </View>
        )}

        {/* Ayet içeriği */}
        {loadState.status === "loading" ? (
          <View style={st.center}><ActivityIndicator size="large" color="#059669" /><Text style={st.loadingText}>Yükleniyor…</Text></View>
        ) : loadState.status === "error" ? (
          <View style={st.center}>
            <Ionicons name="cloud-offline-outline" size={48} color="#d6d3d1" />
            <Text style={st.errorText}>{loadState.message}</Text>
            <TouchableOpacity style={st.retryBtn} onPress={() => setCurrentAyahNum(n => n)} activeOpacity={0.7}>
              <Text style={st.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.ayahBox}>
            <View style={st.ayahBadge}><Text style={st.ayahBadgeText}>{loadState.ayah.ayahNumber}</Text></View>
            {loadState.ayah.arabicText
              ? <Text style={st.arabic} selectable>{loadState.ayah.arabicText}</Text>
              : <Text style={st.arabicMissing}>Arapça metin yüklenemedi</Text>}
            {loadState.ayah.meal && (
              <View style={st.mealBox}>
                <Text style={st.mealLabel}>Meal</Text>
                <Text style={st.mealText} selectable>{loadState.ayah.meal}</Text>
              </View>
            )}
            {/* Ayet detay linki */}
            <TouchableOpacity
              style={st.detailBtn}
              onPress={() => router.push(`/ayah/${currentSurahId}/${currentAyahNum}`)}
              activeOpacity={0.7}
            >
              <Text style={st.detailBtnText}>Kelime & Analiz →</Text>
            </TouchableOpacity>
            {loadState.ayah.words && loadState.ayah.words.length > 0 && (
              <View style={st.wordsBox}>
                <Text style={st.wordsLabel}>Kelime Kelime</Text>
                <View style={st.wordsGrid}>
                  {loadState.ayah.words.map(w => (
                    <View key={w.wordIndex} style={st.wordChip}>
                      <Text style={st.wordArabic}>{w.arabic}</Text>
                      <Text style={st.wordMeaning}>{w.meaningTr}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sure seçici */}
      <View style={st.surahSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {surahList.map(s => (
            <TouchableOpacity key={s.id}
              style={[st.surahChip, s.id === currentSurahId && st.surahChipActive]}
              onPress={() => handleSurahSelect(s.id)} activeOpacity={0.7}
            >
              <Text style={[st.surahChipText, s.id === currentSurahId && st.surahChipTextActive]} numberOfLines={1}>
                {s.id}. {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Navigasyon */}
      <View style={st.navBar}>
        <TouchableOpacity style={[st.navBtn, st.navBtnSurah]} onPress={handlePrevSurah} activeOpacity={0.7}>
          <Ionicons name="play-skip-back" size={18} color="#fff" />
          <Text style={st.navBtnText}>Önceki Sure</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.navBtn, st.navBtnAyah, !canPrev && st.navBtnDisabled]} onPress={handlePrevAyah} disabled={!canPrev} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={canPrev ? "#059669" : "#d6d3d1"} />
          <Text style={[st.navBtnText, st.navBtnTextAyah]}>Önceki Ayet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.navBtn, st.navBtnAyah, !canNext && st.navBtnDisabled]} onPress={handleNextAyah} disabled={!canNext} activeOpacity={0.7}>
          <Text style={[st.navBtnText, st.navBtnTextAyah]}>Sonraki Ayet</Text>
          <Ionicons name="chevron-forward" size={20} color={canNext ? "#059669" : "#d6d3d1"} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.navBtn, st.navBtnSurah]} onPress={handleNextSurah} activeOpacity={0.7}>
          <Text style={st.navBtnText}>Sonraki Sure</Text>
          <Ionicons name="play-skip-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <BookmarkBar currentSurah={currentSurahId} currentAyah={currentAyahNum} bookmark={bookmark} onChange={handleBookmark} />
    </View>
  );
}

// ── Stiller ──────────────────────────────────────────────────────────────────

const juzSt = StyleSheet.create({
  container:     { backgroundColor: "#fefcf8", borderBottomWidth: 1, borderBottomColor: "#e8e2d4", paddingTop: 8, paddingBottom: 6 },
  list:          { paddingHorizontal: 8, gap: 4 },
  seg:           { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#f5f0e8", borderWidth: 1, borderColor: "#e8e2d4" },
  segActive:     { backgroundColor: "#059669", borderColor: "#047857" },
  label:         { fontSize: 13, fontWeight: "600", color: "#78716c" },
  labelActive:   { color: "#fff" },
  indicator:     { alignItems: "center", paddingTop: 4, paddingBottom: 2 },
  indicatorText: { fontSize: 10, fontWeight: "600", color: "#059669" },
});

const audioSt = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1917", paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  playBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "#059669", alignItems: "center", justifyContent: "center" },
  info:      { flex: 1, gap: 5 },
  title:     { fontSize: 12, fontWeight: "600", color: "#e7e5e4" },
  track:     { height: 3, borderRadius: 2, backgroundColor: "#44403c", overflow: "hidden" },
  fill:      { height: 3, borderRadius: 2, backgroundColor: "#059669" },
  time:      { fontSize: 11, color: "#a8a29e", width: 32, textAlign: "right" },
});

const bmSt = StyleSheet.create({
  container:    { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fefcf8", borderTopWidth: 1, borderTopColor: "#e8e2d4" },
  btn:          { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0", flex: 1, justifyContent: "center" },
  btnActive:    { backgroundColor: "#059669", borderColor: "#047857" },
  btnOutline:   { backgroundColor: "#fff", borderColor: "#e7e5e4" },
  btnText:      { fontSize: 12, fontWeight: "600", color: "#059669" },
  btnTextActive:{ color: "#fff" },
  btnTextOutline:{ color: "#44403c" },
});

const st = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: "#faf7f0" },
  scroll:       { flex: 1 },
  scrollInner:  { paddingBottom: 24 },
  center:       { alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  loadingText:  { marginTop: 8, fontSize: 14, color: "#78716c" },
  errorText:    { fontSize: 14, color: "#dc2626", textAlign: "center" },
  retryBtn:     { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#ecfdf5", borderRadius: 10, borderWidth: 1, borderColor: "#a7f3d0" },
  retryText:    { fontSize: 13, fontWeight: "600", color: "#059669" },
  surahHeader:  { alignItems: "center", paddingVertical: 20, paddingHorizontal: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e8e2d4", marginBottom: 4 },
  surahArabic:  { fontSize: 30, color: "#1c1917", fontFamily: "serif", marginBottom: 8, textAlign: "center" },
  surahName:    { fontSize: 18, fontWeight: "700", color: "#059669", marginBottom: 4 },
  surahMeta:    { fontSize: 12, color: "#78716c" },
  ayahBox:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  ayahBadge:    { alignSelf: "center", width: 40, height: 40, borderRadius: 20, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  ayahBadgeText:{ fontSize: 16, fontWeight: "700", color: "#fff" },
  arabic:       { fontSize: 32, lineHeight: 52, color: "#1c1917", textAlign: "right", writingDirection: "rtl", fontFamily: "serif", marginBottom: 20 },
  arabicMissing:{ fontSize: 16, color: "#a8a29e", textAlign: "center", fontStyle: "italic", paddingVertical: 30 },
  mealBox:      { backgroundColor: "#fff", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#e8e2d4", marginBottom: 12 },
  mealLabel:    { fontSize: 10, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  mealText:     { fontSize: 16, lineHeight: 26, color: "#292524" },
  detailBtn:    { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12 },
  detailBtnText:{ fontSize: 12, color: "#059669", fontWeight: "600" },
  wordsBox:     { marginBottom: 12 },
  wordsLabel:   { fontSize: 10, fontWeight: "700", color: "#a8a29e", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  wordsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  wordChip:     { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e8e2d4", paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", gap: 2 },
  wordArabic:   { fontSize: 16, color: "#1c1917", fontFamily: "serif" },
  wordMeaning:  { fontSize: 10, color: "#78716c" },
  surahSelector:{ backgroundColor: "#fefcf8", borderTopWidth: 1, borderTopColor: "#e8e2d4", paddingVertical: 8, paddingHorizontal: 8 },
  surahChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f5f0e8", borderWidth: 1, borderColor: "#e8e2d4", marginHorizontal: 4 },
  surahChipActive:    { backgroundColor: "#ecfdf5", borderColor: "#059669" },
  surahChipText:      { fontSize: 12, fontWeight: "600", color: "#78716c" },
  surahChipTextActive:{ color: "#059669" },
  navBar:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fefcf8", borderTopWidth: 1, borderTopColor: "#e8e2d4" },
  navBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 10, flex: 1 },
  navBtnSurah:  { backgroundColor: "#1c1917" },
  navBtnAyah:   { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e7e5e4" },
  navBtnDisabled:{ opacity: 0.4 },
  navBtnText:   { fontSize: 10, fontWeight: "700", color: "#fff" },
  navBtnTextAyah:{ fontSize: 10, fontWeight: "600", color: "#1c1917" },
});
