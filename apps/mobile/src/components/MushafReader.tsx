import {
  View, Text, ScrollView, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from "react-native";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SurahListItem, type AyahDetailResponse } from "../lib/api";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { TajweedText, TAJWEED_LEGEND } from "./TajweedText";
import { logFeature } from "../lib/analytics";
import { READING_MAX_WIDTH } from "../lib/layout";

// ── Tipler ──────────────────────────────────────────────────────────────────

type MushafBookmark = { surahId: number; ayahNumber: number } | null;
type LoadState      =
  | { status: "loading" }
  | { status: "ready"; surah: SurahListItem; ayah: AyahDetailResponse }
  | { status: "error"; message: string };

const BOOKMARK_KEY = STORAGE_KEYS.mushafBookmark;

function parseBookmark(raw: string | null): MushafBookmark {
  if (!raw) return null;
  const [surahId, ayahNumber] = raw.split(":").map(Number);
  if (
    Number.isInteger(surahId) && surahId >= 1 && surahId <= 114 &&
    Number.isInteger(ayahNumber) && ayahNumber >= 1
  ) {
    return { surahId, ayahNumber };
  }
  return null;
}

// ── AyahSelector — üst ayet seçici (altta sure, üstte ayet) ─────────────────

const AYAH_ITEM = 48; // seg 44 + gap 4

function AyahSelector({ count, current, onSelect }: { count: number; current: number; onSelect: (n: number) => void }) {
  const listRef = useRef<FlatList<number>>(null);
  const data = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  useEffect(() => {
    // scrollToOffset asla throw etmez (scrollToIndex aralık dışında crash edebiliyordu)
    listRef.current?.scrollToOffset({ offset: Math.max(0, (current - 1) * AYAH_ITEM - 120), animated: true });
  }, [current]);

  const renderItem = useCallback(({ item: n }: { item: number }) => {
    const active = n === current;
    return (
      <TouchableOpacity style={[juzSt.seg, active && juzSt.segActive]} onPress={() => onSelect(n)} activeOpacity={0.7}>
        <Text style={[juzSt.label, active && juzSt.labelActive]}>{n}</Text>
      </TouchableOpacity>
    );
  }, [current, onSelect]);

  return (
    <View style={juzSt.container}>
      <FlatList
        ref={listRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={juzSt.list}
        keyExtractor={(n) => String(n)}
        renderItem={renderItem}
        extraData={current}
        getItemLayout={(_, i) => ({ length: AYAH_ITEM, offset: AYAH_ITEM * i + 8, index: i })}
        initialNumToRender={24}
        maxToRenderPerBatch={24}
        windowSize={5}
        removeClippedSubviews
      />
      <View style={juzSt.indicator}>
        <Text style={juzSt.indicatorText}>{current}/{count}</Text>
      </View>
    </View>
  );
}


function BookmarkBar({ currentSurah, currentAyah, bookmark, onChange }: {
  currentSurah: number; currentAyah: number;
  bookmark: MushafBookmark; onChange: (bm: MushafBookmark) => void;
}) {
  const insets = useSafeAreaInsets();
  const isHere = bookmark?.surahId === currentSurah && bookmark?.ayahNumber === currentAyah;

  // Tek butonla toggle: işaretliyse kaldır, değilse işaretle — her ikisinde de onay.
  const save = useCallback(() => {
    if (isHere) {
      Alert.alert("Yer İmini Kaldır", "Bu ayetteki yer imini kaldırmak istiyor musun?", [
        { text: "İptal", style: "cancel" },
        { text: "Kaldır", style: "destructive", onPress: async () => {
          logFeature("mushaf_bookmark_remove", { verse: `${currentSurah}:${currentAyah}` });
          await storage.remove(BOOKMARK_KEY).catch(() => undefined);
          onChange(null);
        } },
      ]);
    } else {
      const mesaj = bookmark
        ? `Kaldığım yer ${bookmark.surahId}:${bookmark.ayahNumber} idi. Bu ayet (${currentSurah}:${currentAyah}) olarak güncellensin mi?`
        : `Bu ayeti (${currentSurah}:${currentAyah}) "Kaldığım Yer" olarak işaretle?`;
      Alert.alert("Yer İmi", mesaj, [
        { text: "İptal", style: "cancel" },
        { text: "İşaretle", onPress: async () => {
          logFeature("mushaf_bookmark_set", { verse: `${currentSurah}:${currentAyah}` });
          await storage.setJSON(BOOKMARK_KEY, `${currentSurah}:${currentAyah}`).catch(() => undefined);
          onChange({ surahId: currentSurah, ayahNumber: currentAyah });
        } },
      ]);
    }
  }, [isHere, bookmark, currentSurah, currentAyah, onChange]);

  const goTo = useCallback(() => {
    if (!bookmark) return;
    logFeature("mushaf_bookmark_go", { verse: `${bookmark.surahId}:${bookmark.ayahNumber}` });
    onChange(bookmark);
  }, [bookmark, onChange]);

  return (
    <View style={[bmSt.container, { paddingBottom: insets.bottom + 8 }]}>
      <TouchableOpacity
        style={[bmSt.btn, isHere && bmSt.btnActive]}
        onPress={save}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isHere ? "Bu ayetteki yer imini kaldır" : "Bu ayeti kaldığım yer olarak işaretle"}
      >
        <Ionicons name={isHere ? "bookmark" : "bookmark-outline"} size={16} color={isHere ? "#fff" : "#059669"} />
        <Text style={[bmSt.btnText, isHere && bmSt.btnTextActive]}>{isHere ? "İşaretlendi" : "Buraya İşaretle"}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[bmSt.btn, bmSt.btnOutline]}
        onPress={goTo}
        activeOpacity={0.7}
        disabled={!bookmark}
        accessibilityRole="button"
        accessibilityState={{ disabled: !bookmark }}
        accessibilityLabel={bookmark ? `Kaldığım yere git ${bookmark.surahId}:${bookmark.ayahNumber}` : "Kaldığım yer yok"}
      >
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
  loadBookmark?: boolean; // true → bookmark'tan başla (standalone mushaf), false → explicit pozisyon
}

export function MushafReader({ initialSurahId = 1, initialAyahNum = 1, loadBookmark = false }: MushafReaderProps) {
  const [surahList, setSurahList]       = useState<SurahListItem[]>([]);
  const [currentSurahId, setCurrentSurahId] = useState(initialSurahId);
  const [currentAyahNum, setCurrentAyahNum] = useState(initialAyahNum);
  const [loadState, setLoadState]       = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey]         = useState(0);
  const [bookmark, setBookmark]         = useState<MushafBookmark>(null);
  const [tajweed, setTajweed]           = useState(true); // tecvid renkleri aç/kapa

  // Sure listesi + bookmark
  useEffect(() => {
    api.surahs.list().then(setSurahList).catch(() => {});
    storage.getJSON<string>(BOOKMARK_KEY).then(raw => {
      const parsed = parseBookmark(raw);
      if (!parsed) return;
      setBookmark(parsed);
      if (loadBookmark) {
        setCurrentSurahId(parsed.surahId);
        setCurrentAyahNum(parsed.ayahNumber);
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
  }, [currentSurahId, currentAyahNum, surahList, reloadKey]);

  const go = useCallback((sId: number, aNum: number) => {
    if (!Number.isFinite(sId) || !Number.isFinite(aNum)) return;
    const nextSurahId = Math.min(114, Math.max(1, Math.trunc(sId)));
    const surahMetaForTarget = surahList.find(s => s.id === nextSurahId);
    const maxAyah = surahMetaForTarget?.verseCount;
    const nextAyahNum = maxAyah
      ? Math.min(maxAyah, Math.max(1, Math.trunc(aNum)))
      : Math.max(1, Math.trunc(aNum));
    setCurrentSurahId(nextSurahId);
    setCurrentAyahNum(nextAyahNum);
  }, [surahList]);

  const handleRetry = useCallback(() => setReloadKey(k => k + 1), []);

  const handleAyahSelect = useCallback((n: number) => {
    logFeature("mushaf_ayah_select", { verse: `${currentSurahId}:${n}` });
    go(currentSurahId, n);
  }, [currentSurahId, go]);

  const handleTajweedToggle = useCallback(() => {
    setTajweed(t => {
      const next = !t;
      logFeature("mushaf_tajweed_toggle", { enabled: String(next) });
      return next;
    });
  }, []);

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
  const handleBookmark    = useCallback((bm: MushafBookmark) => {
    setBookmark(bm);
    if (bm && (bm.surahId !== currentSurahId || bm.ayahNumber !== currentAyahNum)) go(bm.surahId, bm.ayahNumber);
  }, [currentSurahId, currentAyahNum, go]);
  const handleSurahSelect = useCallback((sId: number) => {
    logFeature("mushaf_surah_select", { surahId: String(sId) });
    go(sId, 1);
  }, [go]);

  const surahMeta  = loadState.status === "ready" ? loadState.surah : surahList.find(s => s.id === currentSurahId);
  const canPrev    = currentSurahId > 1 || currentAyahNum > 1;
  const canNext    = loadState.status === "ready"
    ? currentAyahNum < loadState.ayah.verseCount || currentSurahId < 114
    : currentSurahId < 114;

  return (
    <View style={st.screen}>
      {surahMeta && surahMeta.verseCount > 0 && (
        <AyahSelector
          count={surahMeta.verseCount}
          current={currentAyahNum}
          onSelect={handleAyahSelect}
        />
      )}

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
            <TouchableOpacity style={st.retryBtn} onPress={handleRetry} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Ayeti tekrar yükle">
              <Text style={st.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.ayahBox}>
            <View style={st.ayahTopRow}>
              <View style={st.ayahBadge}><Text style={st.ayahBadgeText}>{loadState.ayah.ayahNumber}</Text></View>
              {loadState.ayah.arabicTajweed && (
                <TouchableOpacity
                  style={[st.tajToggle, tajweed && st.tajToggleOn]}
                  onPress={handleTajweedToggle}
                  activeOpacity={0.75}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: tajweed }}
                  accessibilityLabel="Tecvid renklendirmesini aç veya kapat"
                >
                  <Text style={[st.tajToggleText, tajweed && st.tajToggleTextOn]}>🎨 Tecvid</Text>
                </TouchableOpacity>
              )}
            </View>
            {loadState.ayah.arabicText
              ? (tajweed && loadState.ayah.arabicTajweed
                  ? <TajweedText markup={loadState.ayah.arabicTajweed} style={st.arabic} />
                  : <Text style={st.arabic} selectable>{loadState.ayah.arabicText}</Text>)
              : <Text style={st.arabicMissing}>Arapça metin yüklenemedi</Text>}
            {tajweed && loadState.ayah.arabicTajweed && (
              <View style={st.legend}>
                {TAJWEED_LEGEND.map(l => (
                  <View key={l.ad} style={st.legendItem}>
                    <View style={[st.legendDot, { backgroundColor: l.renk }]} />
                    <Text style={st.legendText}>{l.ad}</Text>
                  </View>
                ))}
              </View>
            )}
            {loadState.ayah.meal && (
              <View style={st.mealBox}>
                <Text style={st.mealLabel}>Meal</Text>
                <Text style={st.mealText} selectable>{loadState.ayah.meal}</Text>
              </View>
            )}
            {/* Ayet detay linki */}
            <TouchableOpacity
              style={st.detailBtn}
              onPress={() => {
                logFeature("mushaf_detail_open", { verse: `${currentSurahId}:${currentAyahNum}` });
                router.push(`/ayah/${currentSurahId}/${currentAyahNum}`);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Ayet detayını aç"
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

      {/* Sure seçici — virtualize (114 sure) */}
      <View style={st.surahSelector}>
        <FlatList
          data={surahList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => String(s.id)}
          extraData={currentSurahId}
          renderItem={({ item: s }) => (
            <TouchableOpacity
              style={[st.surahChip, s.id === currentSurahId && st.surahChipActive]}
              onPress={() => handleSurahSelect(s.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${s.name} suresine git`}
            >
              <Text style={[st.surahChipText, s.id === currentSurahId && st.surahChipTextActive]} numberOfLines={1}>
                {s.id}. {s.name}
              </Text>
            </TouchableOpacity>
          )}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews
        />
      </View>

      {/* Navigasyon */}
      <View style={st.navBar}>
        <TouchableOpacity style={[st.navBtn, st.navBtnSurah]} onPress={handlePrevSurah} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Önceki sureye git">
          <Ionicons name="play-skip-back" size={18} color="#fff" />
          <Text style={st.navBtnText}>Önceki Sure</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.navBtn, st.navBtnAyah, !canPrev && st.navBtnDisabled]} onPress={handlePrevAyah} disabled={!canPrev} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ disabled: !canPrev }} accessibilityLabel="Önceki ayete git">
          <Ionicons name="chevron-back" size={20} color={canPrev ? "#059669" : "#d6d3d1"} />
          <Text style={[st.navBtnText, st.navBtnTextAyah]}>Önceki Ayet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.navBtn, st.navBtnAyah, !canNext && st.navBtnDisabled]} onPress={handleNextAyah} disabled={!canNext} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ disabled: !canNext }} accessibilityLabel="Sonraki ayete git">
          <Text style={[st.navBtnText, st.navBtnTextAyah]}>Sonraki Ayet</Text>
          <Ionicons name="chevron-forward" size={20} color={canNext ? "#059669" : "#d6d3d1"} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.navBtn, st.navBtnSurah]} onPress={handleNextSurah} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sonraki sureye git">
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
  surahArabic:  { fontSize: 30, color: "#1c1917", fontFamily: "Amiri", marginBottom: 8, textAlign: "center" },
  surahName:    { fontSize: 18, fontWeight: "700", color: "#059669", marginBottom: 4 },
  surahMeta:    { fontSize: 12, color: "#78716c" },
  ayahBox:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  ayahBadge:    { width: 40, height: 40, borderRadius: 20, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  ayahBadgeText:{ fontSize: 16, fontWeight: "700", color: "#fff" },
  ayahTopRow:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tajToggle:    { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: "#d6d3d1", paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
  tajToggleOn:  { backgroundColor: "#ecfdf5", borderColor: "#6ee7b7" },
  tajToggleText:  { fontSize: 12, fontWeight: "700", color: "#78716c" },
  tajToggleTextOn:{ color: "#047857" },
  legend:       { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 2, marginBottom: 10 },
  legendItem:   { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:    { width: 11, height: 11, borderRadius: 3 },
  legendText:   { fontSize: 11, color: "#78716c" },
  arabic:       { fontSize: 32, lineHeight: 52, color: "#1c1917", textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", marginBottom: 20 },
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
  wordArabic:   { fontSize: 16, color: "#1c1917", fontFamily: "Amiri", writingDirection: "rtl" },
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
