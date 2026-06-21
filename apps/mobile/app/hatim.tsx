import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import LottieView from 'lottie-react-native';
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MushafReader } from "../src/components/MushafReader";
import { useColors } from "../src/hooks/useColors";

const STORAGE_KEY = "hatimTakibi";

interface JuzInfo {
  juz: number;
  startSurah: number; startAyah: number; startName: string;
  endSurah:   number; endAyah:   number; endName:   string;
}

const JUZ_DATA: JuzInfo[] = [
  { juz:  1, startSurah:   1, startAyah:   1, startName: "Fâtiha",    endSurah:   2, endAyah: 141, endName: "Bakara"     },
  { juz:  2, startSurah:   2, startAyah: 142, startName: "Bakara",    endSurah:   2, endAyah: 252, endName: "Bakara"     },
  { juz:  3, startSurah:   2, startAyah: 253, startName: "Bakara",    endSurah:   3, endAyah:  92, endName: "Âl-i İmrân"},
  { juz:  4, startSurah:   3, startAyah:  93, startName: "Âl-i İmrân",endSurah:  4, endAyah:  23, endName: "Nisâ"       },
  { juz:  5, startSurah:   4, startAyah:  24, startName: "Nisâ",      endSurah:   4, endAyah: 147, endName: "Nisâ"       },
  { juz:  6, startSurah:   4, startAyah: 148, startName: "Nisâ",      endSurah:   5, endAyah:  81, endName: "Mâide"      },
  { juz:  7, startSurah:   5, startAyah:  82, startName: "Mâide",     endSurah:   6, endAyah: 110, endName: "En'âm"      },
  { juz:  8, startSurah:   6, startAyah: 111, startName: "En'âm",     endSurah:   7, endAyah:  87, endName: "A'râf"      },
  { juz:  9, startSurah:   7, startAyah:  88, startName: "A'râf",     endSurah:   8, endAyah:  40, endName: "Enfâl"      },
  { juz: 10, startSurah:   8, startAyah:  41, startName: "Enfâl",     endSurah:   9, endAyah:  92, endName: "Tevbe"      },
  { juz: 11, startSurah:   9, startAyah:  93, startName: "Tevbe",     endSurah:  11, endAyah:   5, endName: "Hûd"        },
  { juz: 12, startSurah:  11, startAyah:   6, startName: "Hûd",       endSurah:  12, endAyah:  52, endName: "Yûsuf"      },
  { juz: 13, startSurah:  12, startAyah:  53, startName: "Yûsuf",     endSurah:  14, endAyah:  52, endName: "İbrâhîm"    },
  { juz: 14, startSurah:  15, startAyah:   1, startName: "Hicr",      endSurah:  16, endAyah: 128, endName: "Nahl"       },
  { juz: 15, startSurah:  17, startAyah:   1, startName: "İsrâ",      endSurah:  18, endAyah:  74, endName: "Kehf"       },
  { juz: 16, startSurah:  18, startAyah:  75, startName: "Kehf",      endSurah:  20, endAyah: 135, endName: "Tâhâ"       },
  { juz: 17, startSurah:  21, startAyah:   1, startName: "Enbiyâ",    endSurah:  22, endAyah:  78, endName: "Hac"        },
  { juz: 18, startSurah:  23, startAyah:   1, startName: "Mü'minûn",  endSurah:  25, endAyah:  20, endName: "Furkân"     },
  { juz: 19, startSurah:  25, startAyah:  21, startName: "Furkân",    endSurah:  27, endAyah:  55, endName: "Neml"       },
  { juz: 20, startSurah:  27, startAyah:  56, startName: "Neml",      endSurah:  29, endAyah:  45, endName: "Ankebût"    },
  { juz: 21, startSurah:  29, startAyah:  46, startName: "Ankebût",   endSurah:  33, endAyah:  30, endName: "Ahzâb"      },
  { juz: 22, startSurah:  33, startAyah:  31, startName: "Ahzâb",     endSurah:  36, endAyah:  27, endName: "Yâsîn"      },
  { juz: 23, startSurah:  36, startAyah:  28, startName: "Yâsîn",     endSurah:  39, endAyah:  31, endName: "Zümer"      },
  { juz: 24, startSurah:  39, startAyah:  32, startName: "Zümer",     endSurah:  41, endAyah:  46, endName: "Fussilet"   },
  { juz: 25, startSurah:  41, startAyah:  47, startName: "Fussilet",  endSurah:  45, endAyah:  37, endName: "Câsiye"     },
  { juz: 26, startSurah:  46, startAyah:   1, startName: "Ahkâf",     endSurah:  51, endAyah:  30, endName: "Zâriyât"    },
  { juz: 27, startSurah:  51, startAyah:  31, startName: "Zâriyât",   endSurah:  57, endAyah:  29, endName: "Hadîd"      },
  { juz: 28, startSurah:  58, startAyah:   1, startName: "Mücâdele",  endSurah:  66, endAyah:  12, endName: "Tahrîm"     },
  { juz: 29, startSurah:  67, startAyah:   1, startName: "Mülk",      endSurah:  77, endAyah:  50, endName: "Mürselât"   },
  { juz: 30, startSurah:  78, startAyah:   1, startName: "Nebe",      endSurah: 114, endAyah:   6, endName: "Nâs"        },
];

interface Hatim { id: string; startDate: string; completedDate: string | null; readJuz: number[] }
interface Store  { hatims: Hatim[]; currentId: string | null }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
function days(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function HatimScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [store, setStore]       = useState<Store>({ hatims: [], currentId: null });
  const [mounted, setMounted]   = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevProgress = useRef(0);
  const [activeTab, setActiveTab]   = useState<"takip" | "oku">("takip");
  const [readerSurah, setReaderSurah] = useState(1);
  const [readerAyah, setReaderAyah]   = useState(1);
  const [readerKey, setReaderKey]     = useState(0);

  function openMushaf(surahId: number, ayahNumber: number) {
    setReaderSurah(surahId);
    setReaderAyah(ayahNumber);
    setReaderKey(k => k + 1);
    setActiveTab("oku");
  }

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => { if (isMounted && v) setStore(JSON.parse(v)); })
      .finally(() => setMounted(true));
    return () => { isMounted = false; };
  }, []);

  const persist = useCallback((next: Store) => {
    setStore(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const startHatim = () => {
    const h: Hatim = { id: Date.now().toString(), startDate: new Date().toISOString(), completedDate: null, readJuz: [] };
    persist({ hatims: [h, ...store.hatims], currentId: h.id });
    setConfirm(false);
  };

  const toggleJuz = (n: number) => {
    const next = store.hatims.map(h => {
      if (h.id !== store.currentId) return h;
      const readJuz = h.readJuz.includes(n) ? h.readJuz.filter(j => j !== n) : [...h.readJuz, n];
      const completedDate = readJuz.length === 30 ? (h.completedDate ?? new Date().toISOString()) : null;
      return { ...h, readJuz, completedDate };
    });
    persist({ ...store, hatims: next });
  };

  const current   = store.hatims.find(h => h.id === store.currentId) ?? null;
  const completed = store.hatims.filter(h => h.completedDate !== null);
  const progress  = current?.readJuz.length ?? 0;
  const pct       = Math.round((progress / 30) * 100);

  useEffect(() => {
    if (mounted && progress === 30 && prevProgress.current < 30) {
      setShowCelebration(true);
    }
    prevProgress.current = progress;
  }, [progress, mounted]);

  if (!mounted) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent ?? "#059669"} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Hatim & Mushaf" }} />

      {/* Hatim tamamlama kutlaması */}
      <Modal visible={showCelebration} transparent animationType="fade" onRequestClose={() => setShowCelebration(false)}>
        <View style={styles.celebrationOverlay}>
          <View style={[styles.celebrationCard, { backgroundColor: c.card }]}>
            <LottieView
              source={require('../assets/Star-Blast.json')}
              autoPlay
              loop={false}
              style={{ width: 200, height: 200 }}
            />
            <Text style={[styles.celebrationTitle, { color: c.text }]}>Tebrikler! 🎉</Text>
            <Text style={[styles.celebrationSub, { color: c.textMuted }]}>Hatminizi tamamladınız!</Text>
            <TouchableOpacity
              style={[styles.celebrationBtn, { backgroundColor: c.accent }]}
              onPress={() => setShowCelebration(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.celebrationBtnText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sekme çubuğu */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "takip" && styles.tabBtnActive]}
          onPress={() => setActiveTab("takip")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "takip" && styles.tabBtnTextActive]}>📋 Takip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "oku" && styles.tabBtnActive]}
          onPress={() => setActiveTab("oku")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "oku" && styles.tabBtnTextActive]}>📖 Oku</Text>
        </TouchableOpacity>
      </View>

      {/* Oku sekmesi */}
      {activeTab === "oku" && (
        <MushafReader
          key={readerKey}
          initialSurahId={readerSurah}
          initialAyahNum={readerAyah}
          loadBookmark={readerKey === 0}
        />
      )}

      {/* Takip sekmesi */}
      {activeTab === "takip" && (
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>

        <Text style={styles.title}>📖 Hatim Takibi</Text>
        <Text style={styles.sub}>30 cüzlük okumanızı işaretleyin</Text>

        {!current ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aktif hatim yok</Text>
            <TouchableOpacity style={styles.startBtn} onPress={startHatim}>
              <Text style={styles.startBtnText}>+ Yeni Hatim Başlat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* İlerleme */}
            <View style={[styles.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.progressRow}>
                <View>
                  <Text style={styles.progressDate}>Başlangıç: {fmt(current.startDate)}</Text>
                  {current.completedDate && (
                    <Text style={styles.completedText}>✅ Tamamlandı! ({days(current.startDate, current.completedDate)} günde)</Text>
                  )}
                </View>
                <Text style={styles.progressCount}>{progress}/30</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.progressPct}>%{pct}</Text>

              {/* Eylemler — inline onay */}
              <View style={styles.progressActions}>
                {!confirm ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setConfirm(true)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionText}>Sıfırla</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.confirmText}>Emin misiniz?</Text>
                    <TouchableOpacity
                      onPress={() => {
                        persist({ ...store, hatims: store.hatims.map(h => h.id === store.currentId ? { ...h, readJuz: [], completedDate: null } : h) });
                        setConfirm(false);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.actionBtn}
                    >
                      <Text style={[styles.actionText, { color: "#dc2626", fontWeight: "700" }]}>Evet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setConfirm(false)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionText}>Hayır</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* 30 Cüz */}
            {JUZ_DATA.map(juz => {
              const done = current.readJuz.includes(juz.juz);
              return (
                <View key={juz.juz} style={[styles.juzRow, { backgroundColor: c.card, borderColor: c.border }, done && styles.juzRowDone]}>
                  <TouchableOpacity
                    style={styles.juzMain}
                    onPress={() => toggleJuz(juz.juz)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.juzCheck, done && styles.juzCheckDone]}>
                      <Text style={[styles.juzNum, done && styles.juzNumDone]}>
                        {done ? "✓" : juz.juz}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.juzTitle, { color: c.text }, done && styles.juzTitleDone]}>{juz.juz}. Cüz</Text>
                      <Text style={[styles.juzRange, { color: c.textMuted }]}>{juz.startName} {juz.startAyah} – {juz.endName} {juz.endAyah}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.juzReadBtn}
                    onPress={() => openMushaf(juz.startSurah, juz.startAyah)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.juzReadBtnText}>Oku →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Geçmiş */}
        {completed.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Tamamlanan Hatimler ({completed.length})</Text>
            {completed.map((h, i) => (
              <View key={h.id} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyLabel}>{completed.length - i}. Hatim</Text>
                  <Text style={styles.historyDates}>{fmt(h.startDate)} → {fmt(h.completedDate!)}</Text>
                </View>
                <Text style={styles.historyDays}>{days(h.startDate, h.completedDate!)} gün</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabBar:        { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tabBtn:        { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive:  { borderBottomWidth: 2, borderBottomColor: "#059669" },
  tabBtnText:    { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  tabBtnTextActive: { color: "#059669" },

  container: { flex: 1, backgroundColor: "#f0fdf4" },
  content:   { padding: 16, paddingBottom: 32 },
  title:     { fontSize: 22, fontWeight: "700", color: "#14532d", textAlign: "center", marginBottom: 4 },
  sub:       { fontSize: 13, color: "#86efac", textAlign: "center", marginBottom: 20 },

  emptyCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#bbf7d0" },
  emptyText:    { fontSize: 15, color: "#6b7280", marginBottom: 16 },
  startBtn:     { backgroundColor: "#059669", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  progressCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  progressRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  progressDate: { fontSize: 12, color: "#6b7280" },
  completedText:{ fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  progressCount:{ fontSize: 28, fontWeight: "700", color: "#059669" },
  progressBg:   { height: 8, backgroundColor: "#d1fae5", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#059669", borderRadius: 4 },
  progressPct:     { fontSize: 11, color: "#9ca3af", textAlign: "right", marginTop: 2 },
  progressActions: { flexDirection: "row", gap: 16, marginTop: 10, alignItems: "center" },
  actionBtn:       { paddingVertical: 6, paddingHorizontal: 4 },
  actionText:      { fontSize: 13, color: "#ef4444" },
  confirmText:     { fontSize: 12, color: "#6b7280", flex: 1 },

  juzRow:     { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: "#e7e5e4", overflow: "hidden" },
  juzRowDone: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  juzMain:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  juzReadBtn: { paddingHorizontal: 12, paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: "#e7e5e4", justifyContent: "center" },
  juzReadBtnText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  juzCheck:     { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  juzCheckDone: { backgroundColor: "#059669", borderColor: "#059669" },
  juzNum:     { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  juzNumDone: { color: "#fff" },
  juzTitle:   { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  juzTitleDone: { color: "#059669" },
  juzRange:   { fontSize: 11, color: "#9ca3af", marginTop: 1 },

  historySection: { marginTop: 20 },
  historyTitle:   { fontSize: 14, fontWeight: "700", color: "#6b7280", marginBottom: 8 },
  historyRow:     { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: "#e7e5e4" },
  historyLabel:   { fontSize: 13, fontWeight: "600", color: "#374151" },
  historyDates:   { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  historyDays:    { fontSize: 13, fontWeight: "600", color: "#059669" },
  celebrationOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  celebrationCard:    { borderRadius: 24, padding: 32, alignItems: "center", width: 300 },
  celebrationTitle:   { fontSize: 24, fontWeight: "700", marginTop: 8, marginBottom: 6 },
  celebrationSub:     { fontSize: 15, textAlign: "center", marginBottom: 24 },
  celebrationBtn:     { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  celebrationBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
