/**
 * /root/[root] — Kök Detayı
 * 114 sure dağılımı (renkli grid) + türev kelimeler listesi.
 */
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, FlatList,
} from "react-native";
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, prefetchAyah, type RootDetail } from "../../../src/lib/api";
import { useColors, type AppColors } from "../../../src/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../../../src/lib/layout";

function heatColor(count: number, max: number, isDark: boolean): string {
  if (count === 0) return isDark ? "#292524" : "#f5f5f4";
  const ratio = Math.min(count / Math.max(max, 1), 1);
  const intensity = Math.round(ratio * 255);
  const r = Math.round(255 - intensity * 0.8);
  const g = Math.round(255 - intensity * 0.1);
  const b = Math.round(255 - intensity * 0.7);
  return `rgb(${r},${g},${b})`;
}

const SURAH_SHORT: Record<number, string> = {
  1: "Fât", 2: "Bak", 3: "Âl", 4: "Nis", 5: "Mâi", 6: "En'", 7: "A'r", 8: "Enf", 9: "Tev", 10: "Yun",
  11: "Hûd", 12: "Yus", 13: "Ra'd", 14: "İbr", 15: "Hicr", 16: "Nah", 17: "İsr", 18: "Keh", 19: "Mer", 20: "Tâh",
  21: "Enb", 22: "Hac", 23: "Mü'", 24: "Nur", 25: "Fur", 26: "Şua", 27: "Nem", 28: "Kas", 29: "Ank", 30: "Rum",
  31: "Luk", 32: "Sec", 33: "Ahz", 34: "Seb", 35: "Fâtr", 36: "Yas", 37: "Saf", 38: "Sâd", 39: "Zum", 40: "Mü'",
  41: "Fus", 42: "Şur", 43: "Zuh", 44: "Duh", 45: "Câs", 46: "Ahk", 47: "Muh", 48: "Fet", 49: "Huc", 50: "Kâf",
  51: "Zâr", 52: "Tûr", 53: "Nec", 54: "Kam", 55: "Rah", 56: "Vâk", 57: "Had", 58: "Muc", 59: "Haş", 60: "Mum",
  61: "Saf", 62: "Cum", 63: "Mun", 64: "Teğ", 65: "Tal", 66: "Tah", 67: "Mül", 68: "Kal", 69: "Hak", 70: "Mea",
  71: "Nuh", 72: "Cin", 73: "Müz", 74: "Müd", 75: "Kıy", 76: "İns", 77: "Mür", 78: "Neb", 79: "Nâz", 80: "Abs",
  81: "Tek", 82: "İnf", 83: "Mut", 84: "İnş", 85: "Bur", 86: "Târ", 87: "A'l", 88: "Gaş", 89: "Fec", 90: "Bel",
  91: "Şem", 92: "Ley", 93: "Duh", 94: "İnş", 95: "Tîn", 96: "Ala", 97: "Kad", 98: "Bey", 99: "Zel", 100: "Âdi",
  101: "Kâr", 102: "Tek", 103: "Asr", 104: "Hüm", 105: "Fil", 106: "Kur", 107: "Mâu", 108: "Kev", 109: "Kâf", 110: "Nas",
  111: "Teb", 112: "İhl", 113: "Fel", 114: "Nas",
};

const HeatGrid = memo(function HeatGrid({
  distribution,
  maxCount,
  c,
}: {
  distribution: Record<number, number>;
  maxCount: number;
  c: AppColors;
}) {
  const [modalInfo, setModalInfo] = useState<{ surahId: number; count: number } | null>(null);

  return (
    <>
      <View style={hg.grid}>
        {Array.from({ length: 114 }, (_, i) => i + 1).map((id) => {
          const count = distribution[id] ?? 0;
          const backgroundColor = heatColor(count, maxCount, c.isDark);
          const isDisabled = count === 0;

          return (
            <TouchableOpacity
              key={id}
              style={[hg.cell, { backgroundColor }]}
              onPress={() => count > 0 && setModalInfo({ surahId: id, count })}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${id}. sure ${SURAH_SHORT[id] ?? ""}`.trim()}
              accessibilityHint={isDisabled ? "Bu surede bu kök geçmiyor" : `${count} geçiş bilgisini açar`}
              accessibilityState={{ disabled: isDisabled }}
            >
              <Text style={[hg.cellText, count > 0 && { color: "#1c1917" }]}>
                {SURAH_SHORT[id] ?? id}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={!!modalInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfo(null)}
      >
        <TouchableOpacity
          style={hg.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalInfo(null)}
          accessibilityRole="button"
          accessibilityLabel="Sure bilgi penceresini kapat"
        >
          <View style={hg.modalCard}>
            {modalInfo && (
              <>
                <Text style={hg.modalSurah}>{modalInfo.surahId}. Sure</Text>
                <Text style={hg.modalCount}>{modalInfo.count} geçiş</Text>
                <TouchableOpacity
                  style={hg.modalBtn}
                  onPress={() => {
                    setModalInfo(null);
                    router.push(`/surah/${modalInfo.surahId}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${modalInfo.surahId}. sureye git`}
                >
                  <Text style={hg.modalBtnText}>Sureye Git →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

type Verse = { surahId: number; ayahNumber: number };

const MeaningGroup = memo(function MeaningGroup({
  meaning,
  forms,
  verses,
  isOpen,
  onToggle,
  c,
}: {
  meaning: string;
  forms: string[];
  verses: Verse[];
  isOpen: boolean;
  onToggle: (meaning: string) => void;
  c: AppColors;
}) {
  return (
    <View style={[s.accordionCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity
        style={s.accordionHeader}
        onPress={() => onToggle(meaning)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${meaning} anlam grubu`}
        accessibilityHint={`${verses.length} ayet içeren kullanım bağlamını ${isOpen ? "kapatır" : "açar"}`}
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.accordionTitle, { color: c.text }]}>
            {meaning}
            <Text style={[s.accordionCount, { color: c.accent }]}> — {verses.length} ayet</Text>
          </Text>
          <Text style={[s.accordionForms, { color: c.textMuted }]} numberOfLines={1}>
            {forms.join(" · ")}
          </Text>
        </View>
        <Text style={[s.accordionChevron, isOpen && { transform: [{ rotate: "180deg" }] }]}>
          ▼
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={s.versesWrap}>
          {verses.slice(0, 80).map((verse, index) => (
            <TouchableOpacity
              key={index}
              style={[s.verseChip, c.isDark && { backgroundColor: "#064e3b", borderColor: "#065f46" }]}
              onPressIn={() => prefetchAyah(verse.surahId, verse.ayahNumber)}
              onPress={() => router.push(`/ayah/${verse.surahId}/${verse.ayahNumber}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${verse.surahId} sure ${verse.ayahNumber}. ayet`}
              accessibilityHint="Ayet detayını açar"
            >
              <Text style={[s.verseChipText, c.isDark && { color: "#6ee7b7" }]}>{verse.surahId}:{verse.ayahNumber}</Text>
            </TouchableOpacity>
          ))}
          {verses.length > 80 && (
            <View style={s.verseMore}>
              <Text style={s.verseMoreText}>+{verses.length - 80} ayet daha</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

export default function RootDetailScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { root: encodedRoot } = useLocalSearchParams<{ root: string | string[] }>();
  const rawRoot = Array.isArray(encodedRoot) ? encodedRoot[0] : encodedRoot;
  const root = rawRoot ? decodeURIComponent(rawRoot) : "";

  const [data, setData] = useState<RootDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMeaning, setOpenMeaning] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchDetail = useCallback(async (nextRoot: string) => {
    if (!nextRoot) {
      setData(null);
      setOpenMeaning(null);
      setError("Geçersiz kök bağlantısı.");
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setData(null);
    setOpenMeaning(null);

    try {
      const detail = await api.roots.detail(nextRoot);
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) return;
      setData(detail);
    } catch {
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) return;
      setError("Kök detayı yüklenemedi.");
    } finally {
      if (isMountedRef.current && requestIdRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, []);

  const groups = useMemo(() => {
    if (!data?.derivedWords) {
      return [] as [string, { forms: string[]; verses: Verse[] }][];
    }

    const normalize = (value: string) => value.normalize("NFC").trim();
    const wordMap = new Map<string, { display: string; meaning: string; verses: Verse[] }>();

    for (const derivedWord of data.derivedWords) {
      const key = normalize(derivedWord.word);
      if (!wordMap.has(key)) {
        wordMap.set(key, { display: derivedWord.word, meaning: derivedWord.meaning, verses: [] });
      }
      wordMap.get(key)!.verses.push({ surahId: derivedWord.surahId, ayahNumber: derivedWord.ayahNumber });
    }

    const meaningMap = new Map<string, { forms: string[]; verses: Verse[] }>();
    for (const [, { display, meaning, verses }] of wordMap.entries()) {
      const key = normalize(meaning) || "—";
      if (!meaningMap.has(key)) {
        meaningMap.set(key, { forms: [], verses: [] });
      }
      const group = meaningMap.get(key)!;
      if (!group.forms.some((form) => normalize(form) === normalize(display))) {
        group.forms.push(display);
      }
      group.verses.push(...verses);
    }

    return Array.from(meaningMap.entries());
  }, [data?.derivedWords]);

  // Akordiyonlar varsayılan kapalı — kullanıcı dokununca açılır/kapanır.

  useEffect(() => {
    void fetchDetail(root);
  }, [fetchDetail, root]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleToggle = useCallback((meaning: string) => {
    setOpenMeaning((previous) => (previous === meaning ? null : meaning));
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: root || "Kelime Kökleri" }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: root || "Kelime Kökleri" }} />
        <View style={[s.centered, { backgroundColor: c.bg }]}>
          <Text style={s.errorText}>{error ?? "Veri yüklenemedi."}</Text>
          <View style={s.errorActions}>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => { void fetchDetail(root); }}
              accessibilityRole="button"
              accessibilityLabel="Kök detayını yeniden dene"
            >
              <Text style={s.retryBtnText}>Tekrar Dene</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Önceki ekrana dön"
            >
              <Text style={s.backBtnText}>← Geri</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const maxCount = Math.max(...Object.values(data.distribution), 1);
  const totalOccurrences = Object.values(data.distribution).reduce((sum, count) => sum + count, 0);
  const surahCount = Object.values(data.distribution).filter((count) => count > 0).length;
  const uniqueForms = new Set(data.derivedWords.map((item) => item.word)).size;

  const displayMeaning = data.meaningTr || (() => {
    const frequencyMap = new Map<string, number>();
    for (const derivedWord of data.derivedWords) {
      if (derivedWord.meaning) {
        frequencyMap.set(derivedWord.meaning, (frequencyMap.get(derivedWord.meaning) ?? 0) + 1);
      }
    }
    return [...frequencyMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  })();

  return (
    <>
      <Stack.Screen options={{ title: root }} />
      <FlatList
        style={[s.container, { backgroundColor: c.bg }]}
        contentContainerStyle={[s.content, { paddingBottom: 40 + insets.bottom }]}
        data={groups}
        keyExtractor={(item) => item[0]}
        extraData={openMeaning}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <View style={[s.header, { backgroundColor: c.card }]}>
              <Text style={[s.rootTitle, { color: c.text }]}>{data.root}</Text>
              {displayMeaning ? <Text style={[s.meaning, { color: c.textSecondary }]}>{displayMeaning}</Text> : null}
              <View style={s.statsRow}>
                {([[totalOccurrences, "geçiş"], [surahCount, "sure"], [uniqueForms, "türev"]] as const).map(([num, label]) => (
                  <View key={label} style={[s.statBadge, c.isDark && { backgroundColor: "#064e3b", borderColor: "#065f46" }]}>
                    <Text style={[s.statNum, c.isDark && { color: "#6ee7b7" }]}>{num}</Text>
                    <Text style={[s.statLabel, c.isDark && { color: "#34d399" }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Sure Dağılımı</Text>
              <Text style={[s.sectionHint, { color: c.textMuted }]}>Renkli hücreye dokun → sure bilgisi</Text>
              <HeatGrid distribution={data.distribution} maxCount={maxCount} c={c} />
            </View>

            {groups.length > 0 && (
              <Text style={[s.groupsTitle, { color: c.text }]}>Kullanım Bağlamları ({groups.length} anlam)</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <MeaningGroup
            meaning={item[0]}
            forms={item[1].forms}
            verses={item[1].verses}
            isOpen={openMeaning === item[0]}
            onToggle={handleToggle}
            c={c}
          />
        )}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  content: { paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  retryBtn: { backgroundColor: "#059669", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  backBtn: { backgroundColor: "#0f766e", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  header: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, backgroundColor: "#fff", marginBottom: 8 },
  rootTitle: { fontSize: 40, color: "#1c1917", marginBottom: 8 },
  meaning: { fontSize: 16, color: "#44403c", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 16 },
  statBadge: { alignItems: "center", backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "#86efac" },
  statNum: { fontSize: 18, fontWeight: "700", color: "#065f46" },
  statLabel: { fontSize: 10, color: "#059669", marginTop: 1 },

  section: { marginHorizontal: 12, marginBottom: 16, backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e7e5e4" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  sectionHint: { fontSize: 11, color: "#a8a29e", marginBottom: 12 },
  groupsTitle: { fontSize: 13, fontWeight: "700", color: "#1c1917", marginHorizontal: 12, marginTop: 4, marginBottom: 8 },

  accordionCard: { borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 6 },
  accordionHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  accordionTitle: { fontSize: 14, fontWeight: "700", color: "#1c1917" },
  accordionCount: { fontSize: 13, fontWeight: "400", color: "#059669" },
  accordionForms: { fontSize: 12, color: "#a8a29e", marginTop: 2, textAlign: "right" },
  accordionChevron: { fontSize: 10, color: "#a8a29e" },
  versesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#f5f0e8" },
  verseChip: { backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac" },
  verseChipText: { fontSize: 12, color: "#065f46", fontWeight: "600" },
  verseMore: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, justifyContent: "center" },
  verseMoreText: { fontSize: 12, color: "#a8a29e", fontStyle: "italic" },
});

const hg = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  cell: { width: "8%", aspectRatio: 1, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  cellText: { fontSize: 7, color: "#a8a29e", fontWeight: "500" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", minWidth: 200 },
  modalSurah: { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 6 },
  modalCount: { fontSize: 14, color: "#78716c", marginBottom: 16 },
  modalBtn: { backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  modalBtnText: { color: "#fff", fontWeight: "600" },
});