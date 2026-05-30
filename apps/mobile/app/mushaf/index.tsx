import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api, type SurahListItem, type AyahDetailResponse } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";

// ── Tipler ──────────────────────────────────────────────────────────────────────

type MushafBookmark = { surahId: number; ayahNumber: number } | null;

type AudioState = "idle" | "playing" | "paused";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; surah: SurahListItem; ayah: AyahDetailResponse }
  | { status: "error"; message: string };

// ── Juz bilgisi (yaklaşık başlangıç sureleri) ───────────────────────────────────

interface JuzEntry {
  juz: number;
  surahId: number;
  ayahNumber: number;
  label: string;
}

const JUZ_TABLE: JuzEntry[] = [
  { juz: 1, surahId: 1, ayahNumber: 1, label: "١" },
  { juz: 2, surahId: 2, ayahNumber: 142, label: "٢" },
  { juz: 3, surahId: 2, ayahNumber: 253, label: "٣" },
  { juz: 4, surahId: 3, ayahNumber: 93, label: "٤" },
  { juz: 5, surahId: 4, ayahNumber: 24, label: "٥" },
  { juz: 6, surahId: 4, ayahNumber: 148, label: "٦" },
  { juz: 7, surahId: 5, ayahNumber: 82, label: "٧" },
  { juz: 8, surahId: 6, ayahNumber: 111, label: "٨" },
  { juz: 9, surahId: 7, ayahNumber: 88, label: "٩" },
  { juz: 10, surahId: 8, ayahNumber: 41, label: "١٠" },
  { juz: 11, surahId: 9, ayahNumber: 93, label: "١١" },
  { juz: 12, surahId: 11, ayahNumber: 6, label: "١٢" },
  { juz: 13, surahId: 12, ayahNumber: 53, label: "١٣" },
  { juz: 14, surahId: 15, ayahNumber: 1, label: "١٤" },
  { juz: 15, surahId: 17, ayahNumber: 1, label: "١٥" },
  { juz: 16, surahId: 18, ayahNumber: 75, label: "١٦" },
  { juz: 17, surahId: 21, ayahNumber: 1, label: "١٧" },
  { juz: 18, surahId: 23, ayahNumber: 1, label: "١٨" },
  { juz: 19, surahId: 25, ayahNumber: 21, label: "١٩" },
  { juz: 20, surahId: 27, ayahNumber: 56, label: "٢٠" },
  { juz: 21, surahId: 29, ayahNumber: 46, label: "٢١" },
  { juz: 22, surahId: 33, ayahNumber: 31, label: "٢٢" },
  { juz: 23, surahId: 36, ayahNumber: 28, label: "٢٣" },
  { juz: 24, surahId: 39, ayahNumber: 32, label: "٢٤" },
  { juz: 25, surahId: 41, ayahNumber: 47, label: "٢٥" },
  { juz: 26, surahId: 46, ayahNumber: 1, label: "٢٦" },
  { juz: 27, surahId: 51, ayahNumber: 31, label: "٢٧" },
  { juz: 28, surahId: 58, ayahNumber: 1, label: "٢٨" },
  { juz: 29, surahId: 67, ayahNumber: 1, label: "٢٩" },
  { juz: 30, surahId: 78, ayahNumber: 1, label: "٣٠" },
];

/** Verilen sure ID'sinin hangi cüzde olduğunu yaklaşık döndürür */
function getJuzForSurah(surahId: number): number {
  for (let i = JUZ_TABLE.length - 1; i >= 0; i--) {
    if (surahId >= JUZ_TABLE[i].surahId) {
      return JUZ_TABLE[i].juz;
    }
  }
  return 1;
}

/** Cüz numarasına göre başlangıç suresini döndürür */
function getSurahForJuz(juz: number): number {
  const entry = JUZ_TABLE.find((e) => e.juz === juz);
  return entry ? entry.surahId : 1;
}

// ── Sabitler ────────────────────────────────────────────────────────────────────

const BOOKMARK_KEY = STORAGE_KEYS.mushafBookmark;

// ── Alt Bileşen: JuzTracker ─────────────────────────────────────────────────────

interface JuzTrackerProps {
  currentJuz: number;
  onJuzPress: (juz: number) => void;
}

function JuzTracker({ currentJuz, onJuzPress }: JuzTrackerProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Seçili cüze scroll'la
    const idx = currentJuz - 1;
    scrollRef.current?.scrollTo({ x: idx * 48, animated: true });
  }, [currentJuz]);

  return (
    <View style={juzStyles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={juzStyles.scrollContent}
      >
        {JUZ_TABLE.map((entry) => {
          const isActive = entry.juz === currentJuz;
          return (
            <TouchableOpacity
              key={entry.juz}
              style={[juzStyles.segment, isActive && juzStyles.segmentActive]}
              onPress={() => onJuzPress(entry.juz)}
              activeOpacity={0.7}
            >
              <Text
                style={[juzStyles.segmentLabel, isActive && juzStyles.segmentLabelActive]}
              >
                {entry.label}
              </Text>
              <Text
                style={[juzStyles.segmentNum, isActive && juzStyles.segmentNumActive]}
              >
                {entry.juz}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Aktif cüz göstergesi */}
      <View style={juzStyles.indicator}>
        <Text style={juzStyles.indicatorText}>
          {currentJuz}. Cüz
        </Text>
      </View>
    </View>
  );
}

const juzStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fefcf8",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e2d4",
    paddingTop: 8,
    paddingBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 4,
  },
  segment: {
    width: 44,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f5f0e8",
    borderWidth: 1,
    borderColor: "#e8e2d4",
    paddingVertical: 6,
    gap: 2,
  },
  segmentActive: {
    backgroundColor: "#059669",
    borderColor: "#047857",
  },
  segmentLabel: {
    fontSize: 15,
    color: "#78716c",
    fontFamily: "serif",
  },
  segmentLabelActive: {
    color: "#ffffff",
  },
  segmentNum: {
    fontSize: 9,
    fontWeight: "700",
    color: "#a8a29e",
  },
  segmentNumActive: {
    color: "#d1fae5",
  },
  indicator: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
    letterSpacing: 0.5,
  },
});

// ── Alt Bileşen: AudioPlayer (Simüle) ───────────────────────────────────────────

interface AudioPlayerProps {
  state: AudioState;
  progress: number;
  onPlayPause: () => void;
}

function AudioPlayer({ state, progress, onPlayPause }: AudioPlayerProps) {
  const isPlaying = state === "playing";

  return (
    <View style={audioStyles.container}>
      <TouchableOpacity
        style={audioStyles.playBtn}
        onPress={onPlayPause}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={22}
          color="#ffffff"
        />
      </TouchableOpacity>

      <View style={audioStyles.info}>
        <Text style={audioStyles.title} numberOfLines={1}>
          {isPlaying ? "Kıraat dinleniyor…" : state === "paused" ? "Duraklatıldı" : "Oynatıcı hazır"}
        </Text>
        {/* İlerleme çubuğu */}
        <View style={audioStyles.progressTrack}>
          <View
            style={[
              audioStyles.progressFill,
              { width: `${Math.min(100, Math.max(0, progress))}%` },
            ]}
          />
        </View>
      </View>

      <Text style={audioStyles.time}>
        {formatTime(progress)}
      </Text>
    </View>
  );
}

function formatTime(progress: number): string {
  const totalSec = 180; // simüle 3 dakika
  const current = Math.floor((progress / 100) * totalSec);
  const m = Math.floor(current / 60);
  const s = current % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const audioStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1917",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e7e5e4",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#44403c",
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#059669",
  },
  time: {
    fontSize: 11,
    color: "#a8a29e",
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
    width: 32,
    textAlign: "right",
  },
});

// ── Alt Bileşen: BookmarkBar ────────────────────────────────────────────────────

interface BookmarkBarProps {
  currentSurah: number;
  currentAyah: number;
  bookmark: MushafBookmark;
  onBookmarkChange: (bm: MushafBookmark) => void;
}

function BookmarkBar({ currentSurah, currentAyah, bookmark, onBookmarkChange }: BookmarkBarProps) {
  const isBookmarked =
    bookmark !== null &&
    bookmark.surahId === currentSurah &&
    bookmark.ayahNumber === currentAyah;

  const handleSetBookmark = useCallback(async () => {
    const bm: MushafBookmark = { surahId: currentSurah, ayahNumber: currentAyah };
    await storage.setJSON(BOOKMARK_KEY, `${currentSurah}:${currentAyah}`);
    onBookmarkChange(bm);
  }, [currentSurah, currentAyah, onBookmarkChange]);

  const handleGoToBookmark = useCallback(async () => {
    if (!bookmark) return;
    // Mevcut ekranda bookmark'lı sure/ayete git
    if (bookmark.surahId === currentSurah && bookmark.ayahNumber === currentAyah) {
      return; // zaten burada
    }
    // Farklı sure ise bookmark'a yönlendir
    const raw = await storage.getJSON<string>(BOOKMARK_KEY);
    if (raw) {
      const [sId, aNum] = raw.split(":").map(Number);
      if (sId && aNum) {
        // Sayfayı yeniden yükle → bookmark'a git
        // Bu bileşen içinde state değişimi ile yapılacak
        onBookmarkChange({ surahId: sId, ayahNumber: aNum });
      }
    }
  }, [bookmark, currentSurah, currentAyah, onBookmarkChange]);

  return (
    <View style={bookmarkStyles.container}>
      <TouchableOpacity
        style={[bookmarkStyles.btn, isBookmarked && bookmarkStyles.btnActive]}
        onPress={handleSetBookmark}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={16}
          color={isBookmarked ? "#ffffff" : "#059669"}
        />
        <Text style={[bookmarkStyles.btnText, isBookmarked && bookmarkStyles.btnTextActive]}>
          {isBookmarked ? "İşaretlendi" : "Buraya İşaretle"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[bookmarkStyles.btn, bookmarkStyles.btnOutline]}
        onPress={handleGoToBookmark}
        activeOpacity={0.7}
        disabled={!bookmark}
      >
        <Ionicons
          name="location-outline"
          size={16}
          color={bookmark ? "#059669" : "#d6d3d1"}
        />
        <Text
          style={[
            bookmarkStyles.btnText,
            bookmarkStyles.btnTextOutline,
            !bookmark && bookmarkStyles.btnTextDisabled,
          ]}
        >
          {bookmark
            ? `Kaldığım Yer (${bookmark.surahId}:${bookmark.ayahNumber})`
            : "Kaldığım Yer"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const bookmarkStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fefcf8",
    borderTopWidth: 1,
    borderTopColor: "#e8e2d4",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  btnActive: {
    backgroundColor: "#059669",
    borderColor: "#047857",
  },
  btnOutline: {
    backgroundColor: "#ffffff",
    borderColor: "#e7e5e4",
  },
  btnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  btnTextActive: {
    color: "#ffffff",
  },
  btnTextOutline: {
    color: "#44403c",
  },
  btnTextDisabled: {
    color: "#d6d3d1",
  },
});

// ── Ana Ekran: Mushaf Okuma ─────────────────────────────────────────────────────

export default function MushafScreen() {
  // State
  const [surahList, setSurahList] = useState<SurahListItem[]>([]);
  const [currentSurahId, setCurrentSurahId] = useState(1);
  const [currentAyahNum, setCurrentAyahNum] = useState(1);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [bookmark, setBookmark] = useState<MushafBookmark>(null);
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioProgress, setAudioProgress] = useState(0);

  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Veri yükleme ───────────────────────────────────────────────────────────

  /** Sure listesini ve bookmark'ı yükle */
  useEffect(() => {
    // Sure listesi
    api.surahs
      .list()
      .then((list) => {
        setSurahList(list);
      })
      .catch(() => {
        /* sessizce devam et, varsayılan listesiz */
      });

    // Kayıtlı bookmark
    storage
      .getJSON<string>(BOOKMARK_KEY)
      .then((raw) => {
        if (raw) {
          const [sId, aNum] = raw.split(":").map(Number);
          if (sId && aNum && Number.isFinite(sId) && Number.isFinite(aNum)) {
            setBookmark({ surahId: sId, ayahNumber: aNum });
            // Bookmark varsa oradan başla
            setCurrentSurahId(sId);
            setCurrentAyahNum(aNum);
          }
        }
      })
      .catch(() => {});
  }, []);

  /** Sure / ayet değiştiğinde ayet detayını çek */
  useEffect(() => {
    if (!currentSurahId || !currentAyahNum) return;

    let cancelled = false;
    setLoadState({ status: "loading" });

    api.ayah
      .get(currentSurahId, currentAyahNum)
      .then((ayahData) => {
        if (cancelled) return;
        const surahMeta = surahList.find((s) => s.id === currentSurahId);
        if (!surahMeta) {
          // Sure listesi henüz yüklenmemişse minimal meta oluştur
          setLoadState({
            status: "ready",
            surah: {
              id: ayahData.surahId,
              name: ayahData.surahName,
              arabicName: ayahData.arabicName,
              verseCount: ayahData.verseCount,
              translit: "",
              revelationPlace: "Mekke",
            },
            ayah: ayahData,
          });
        } else {
          setLoadState({ status: "ready", surah: surahMeta, ayah: ayahData });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState({ status: "error", message: "Ayet yüklenemedi. Bağlantını kontrol et." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentSurahId, currentAyahNum, surahList]);

  // ── Ses simülasyonu ────────────────────────────────────────────────────────

  useEffect(() => {
    if (audioState === "playing") {
      audioTimerRef.current = setInterval(() => {
        setAudioProgress((prev) => {
          const next = prev + 0.56; // ~180 saniyede tamamlanır
          if (next >= 100) {
            setAudioState("idle");
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }
    }
    return () => {
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
      }
    };
  }, [audioState]);

  // ── Olay yöneticileri ──────────────────────────────────────────────────────

  const handleJuzPress = useCallback(
    (juz: number) => {
      const targetSurah = getSurahForJuz(juz);
      setCurrentSurahId(targetSurah);
      setCurrentAyahNum(1);
      // Ses sıfırla
      setAudioState("idle");
      setAudioProgress(0);
    },
    [],
  );

  const handlePrevSurah = useCallback(() => {
    if (currentSurahId <= 1) {
      setCurrentSurahId(114);
    } else {
      setCurrentSurahId((prev) => prev - 1);
    }
    setCurrentAyahNum(1);
    setAudioState("idle");
    setAudioProgress(0);
  }, [currentSurahId]);

  const handleNextSurah = useCallback(() => {
    if (currentSurahId >= 114) {
      setCurrentSurahId(1);
    } else {
      setCurrentSurahId((prev) => prev + 1);
    }
    setCurrentAyahNum(1);
    setAudioState("idle");
    setAudioProgress(0);
  }, [currentSurahId]);

  const handlePrevAyah = useCallback(() => {
    if (loadState.status !== "ready") return;
    const { ayah } = loadState;
    if (ayah.prevAyah) {
      setCurrentSurahId(ayah.prevAyah.surahId);
      setCurrentAyahNum(ayah.prevAyah.ayahNumber);
    } else if (currentAyahNum > 1) {
      setCurrentAyahNum((prev) => prev - 1);
    } else if (currentSurahId > 1) {
      // Önceki surenin son ayetine git
      const prevSurah = surahList.find((s) => s.id === currentSurahId - 1);
      setCurrentSurahId(currentSurahId - 1);
      setCurrentAyahNum(prevSurah ? prevSurah.verseCount : 1);
    }
    setAudioState("idle");
    setAudioProgress(0);
  }, [loadState, currentAyahNum, currentSurahId, surahList]);

  const handleNextAyah = useCallback(() => {
    if (loadState.status !== "ready") return;
    const { ayah } = loadState;
    if (ayah.nextAyah) {
      setCurrentSurahId(ayah.nextAyah.surahId);
      setCurrentAyahNum(ayah.nextAyah.ayahNumber);
    } else if (currentAyahNum < ayah.verseCount) {
      setCurrentAyahNum((prev) => prev + 1);
    } else if (currentSurahId < 114) {
      setCurrentSurahId(currentSurahId + 1);
      setCurrentAyahNum(1);
    }
    setAudioState("idle");
    setAudioProgress(0);
  }, [loadState, currentAyahNum, currentSurahId]);

  const handlePlayPause = useCallback(() => {
    setAudioState((prev) => {
      if (prev === "playing") return "paused";
      if (prev === "paused" || prev === "idle") {
        // idleyken progress sıfırdan başla
        if (prev === "idle") setAudioProgress(0);
        return "playing";
      }
      return "idle";
    });
  }, []);

  const handleBookmarkChange = useCallback(
    (bm: MushafBookmark) => {
      setBookmark(bm);
      if (bm && (bm.surahId !== currentSurahId || bm.ayahNumber !== currentAyahNum)) {
        setCurrentSurahId(bm.surahId);
        setCurrentAyahNum(bm.ayahNumber);
      }
    },
    [currentSurahId, currentAyahNum],
  );

  const handleSurahListPress = useCallback((surahId: number) => {
    setCurrentSurahId(surahId);
    setCurrentAyahNum(1);
    setAudioState("idle");
    setAudioProgress(0);
  }, []);

  // ── Hesaplanan değerler ────────────────────────────────────────────────────

  const currentJuz = getJuzForSurah(currentSurahId);
  const surahMeta =
    loadState.status === "ready"
      ? loadState.surah
      : surahList.find((s) => s.id === currentSurahId);

  const canGoPrev = currentSurahId > 1 || currentAyahNum > 1;
  const canGoNext =
    loadState.status === "ready"
      ? currentAyahNum < loadState.ayah.verseCount || currentSurahId < 114
      : currentSurahId < 114;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Cüz Takip Çubuğu */}
      <JuzTracker currentJuz={currentJuz} onJuzPress={handleJuzPress} />

      {/* Ses Çalar */}
      <AudioPlayer
        state={audioState}
        progress={audioProgress}
        onPlayPause={handlePlayPause}
      />

      {/* Ana içerik alanı */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Sure başlığı */}
        {surahMeta ? (
          <View style={styles.surahHeader}>
            <Text style={styles.surahArabicName}>{surahMeta.arabicName}</Text>
            <Text style={styles.surahName}>
              {surahMeta.id}. {surahMeta.name}
            </Text>
            <Text style={styles.surahMeta}>
              {surahMeta.verseCount} ayet · {surahMeta.revelationPlace}
            </Text>
          </View>
        ) : null}

        {/* Yükleniyor / Hata / İçerik */}
        {loadState.status === "loading" ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Ayet yükleniyor…</Text>
          </View>
        ) : loadState.status === "error" ? (
          <View style={styles.centeredState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#d6d3d1" />
            <Text style={styles.errorText}>{loadState.message}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                // Re-trigger load by toggling state
                setCurrentAyahNum((n) => n);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.retryBtnText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Arapça metin + meal */
          <View style={styles.ayahContainer}>
            {/* Ayet numarası */}
            <View style={styles.ayahBadge}>
              <Text style={styles.ayahBadgeText}>{loadState.ayah.ayahNumber}</Text>
            </View>

            {/* Arapça metin */}
            {loadState.ayah.arabicText ? (
              <Text style={styles.arabicText} selectable>
                {loadState.ayah.arabicText}
              </Text>
            ) : (
              <Text style={styles.arabicMissing}>Arapça metin yüklenemedi</Text>
            )}

            {/* Meal */}
            {loadState.ayah.meal ? (
              <View style={styles.mealContainer}>
                <Text style={styles.mealLabel}>Meal</Text>
                <Text style={styles.mealText} selectable>
                  {loadState.ayah.meal}
                </Text>
              </View>
            ) : null}

            {/* Kelime analizi (isteğe bağlı) */}
            {loadState.ayah.words && loadState.ayah.words.length > 0 ? (
              <View style={styles.wordsContainer}>
                <Text style={styles.wordsLabel}>Kelime Kelime</Text>
                <View style={styles.wordsGrid}>
                  {loadState.ayah.words.map((w) => (
                    <View key={w.wordIndex} style={styles.wordChip}>
                      <Text style={styles.wordArabic}>{w.arabic}</Text>
                      <Text style={styles.wordMeaning}>{w.meaningTr}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Sure seçici (hızlı erişim) */}
      <View style={styles.surahSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {surahList.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.surahChip,
                s.id === currentSurahId && styles.surahChipActive,
              ]}
              onPress={() => handleSurahListPress(s.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.surahChipText,
                  s.id === currentSurahId && styles.surahChipTextActive,
                ]}
                numberOfLines={1}
              >
                {s.id}. {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Navigasyon butonları */}
      <View style={styles.navBar}>
        {/* Önceki Sure */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnSurah]}
          onPress={handlePrevSurah}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-back" size={18} color="#ffffff" />
          <Text style={styles.navBtnText}>Önceki Sure</Text>
        </TouchableOpacity>

        {/* Önceki Ayet */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnAyah, !canGoPrev && styles.navBtnDisabled]}
          onPress={handlePrevAyah}
          activeOpacity={0.7}
          disabled={!canGoPrev}
        >
          <Ionicons name="chevron-back" size={20} color={canGoPrev ? "#059669" : "#d6d3d1"} />
          <Text style={[styles.navBtnText, styles.navBtnTextAyah]}>Önceki Ayet</Text>
        </TouchableOpacity>

        {/* Sonraki Ayet */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnAyah, !canGoNext && styles.navBtnDisabled]}
          onPress={handleNextAyah}
          activeOpacity={0.7}
          disabled={!canGoNext}
        >
          <Text style={[styles.navBtnText, styles.navBtnTextAyah]}>Sonraki Ayet</Text>
          <Ionicons name="chevron-forward" size={20} color={canGoNext ? "#059669" : "#d6d3d1"} />
        </TouchableOpacity>

        {/* Sonraki Sure */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnSurah]}
          onPress={handleNextSurah}
          activeOpacity={0.7}
        >
          <Text style={styles.navBtnText}>Sonraki Sure</Text>
          <Ionicons name="play-skip-forward" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Bookmark çubuğu */}
      <BookmarkBar
        currentSurah={currentSurahId}
        currentAyah={currentAyahNum}
        bookmark={bookmark}
        onBookmarkChange={handleBookmarkChange}
      />
    </View>
  );
}

// ── Stiller ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#faf7f0",
  },

  // ── Ana içerik scroll ──
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 24,
  },

  // ── Sure başlığı ──
  surahHeader: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e2d4",
    marginBottom: 4,
  },
  surahArabicName: {
    fontSize: 30,
    color: "#1c1917",
    fontFamily: "serif",
    marginBottom: 8,
    textAlign: "center",
  },
  surahName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#059669",
    marginBottom: 4,
  },
  surahMeta: {
    fontSize: 12,
    color: "#78716c",
  },

  // ── Yükleniyor / Hata ──
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#78716c",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },

  // ── Ayet içerik ──
  ayahContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  ayahBadge: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ayahBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  arabicText: {
    fontSize: 32,
    lineHeight: 52,
    color: "#1c1917",
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: "serif",
    marginBottom: 20,
  },
  arabicMissing: {
    fontSize: 18,
    color: "#a8a29e",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
    paddingVertical: 30,
  },

  // ── Meal ──
  mealContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e8e2d4",
    marginBottom: 16,
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  mealText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#292524",
  },

  // ── Kelime analizi ──
  wordsContainer: {
    marginBottom: 12,
  },
  wordsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a8a29e",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  wordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  wordChip: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e2d4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 2,
  },
  wordArabic: {
    fontSize: 16,
    color: "#1c1917",
    fontFamily: "serif",
  },
  wordMeaning: {
    fontSize: 10,
    color: "#78716c",
  },

  // ── Sure seçici ──
  surahSelector: {
    backgroundColor: "#fefcf8",
    borderTopWidth: 1,
    borderTopColor: "#e8e2d4",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  surahChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f0e8",
    borderWidth: 1,
    borderColor: "#e8e2d4",
    marginHorizontal: 4,
  },
  surahChipActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#059669",
  },
  surahChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78716c",
  },
  surahChipTextActive: {
    color: "#059669",
  },

  // ── Navigasyon bar ──
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fefcf8",
    borderTopWidth: 1,
    borderTopColor: "#e8e2d4",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    flex: 1,
  },
  navBtnSurah: {
    backgroundColor: "#1c1917",
  },
  navBtnAyah: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  navBtnTextAyah: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1c1917",
  },
});