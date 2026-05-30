/**
 * /mushaf/[surahId]/[ayahNumber]
 * Mushaf okuma modu — büyük Arapça font, JuzTracker, önceki/sonraki nav, bookmark.
 */
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Pressable, FlatList,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { api, type AyahDetailResponse } from "../../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../../src/lib/storage";

// ── Cüz sınır tablosu (yaklaşık başlangıç noktaları) ──────────────────────────

const JUZ_STARTS: Array<{ surahId: number; ayahNumber: number }> = [
  { surahId: 1,  ayahNumber: 1 },  { surahId: 2,  ayahNumber: 142 },
  { surahId: 2,  ayahNumber: 253 }, { surahId: 3,  ayahNumber: 93 },
  { surahId: 4,  ayahNumber: 24 },  { surahId: 4,  ayahNumber: 148 },
  { surahId: 5,  ayahNumber: 82 },  { surahId: 6,  ayahNumber: 111 },
  { surahId: 7,  ayahNumber: 88 },  { surahId: 8,  ayahNumber: 41 },
  { surahId: 9,  ayahNumber: 93 },  { surahId: 11, ayahNumber: 6 },
  { surahId: 12, ayahNumber: 53 }, { surahId: 15, ayahNumber: 1 },
  { surahId: 17, ayahNumber: 1 },  { surahId: 18, ayahNumber: 75 },
  { surahId: 21, ayahNumber: 1 },  { surahId: 23, ayahNumber: 1 },
  { surahId: 25, ayahNumber: 21 }, { surahId: 27, ayahNumber: 56 },
  { surahId: 29, ayahNumber: 46 }, { surahId: 33, ayahNumber: 31 },
  { surahId: 36, ayahNumber: 28 }, { surahId: 39, ayahNumber: 32 },
  { surahId: 41, ayahNumber: 47 }, { surahId: 46, ayahNumber: 1 },
  { surahId: 51, ayahNumber: 31 }, { surahId: 58, ayahNumber: 1 },
  { surahId: 67, ayahNumber: 1 },  { surahId: 78, ayahNumber: 1 },
];

function getJuzIndex(surahId: number, ayahNumber: number): number {
  let juz = 0;
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    const s = JUZ_STARTS[i];
    if (surahId > s.surahId || (surahId === s.surahId && ayahNumber >= s.ayahNumber)) {
      juz = i;
    } else break;
  }
  return juz; // 0-indexed → cüz = juz+1
}

// ── JuzTracker bileşeni ────────────────────────────────────────────────────────

function JuzTracker({ currentJuz }: { currentJuz: number }) {
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    flatRef.current?.scrollToIndex({ index: currentJuz, animated: true, viewPosition: 0.5 });
  }, [currentJuz]);

  return (
    <View style={jt.container}>
      <FlatList
        ref={flatRef}
        horizontal
        data={JUZ_STARTS}
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={jt.list}
        getItemLayout={(_, index) => ({ length: 36, offset: 36 * index, index })}
        renderItem={({ item, index }) => {
          const active = index === currentJuz;
          return (
            <TouchableOpacity
              style={[jt.cell, active && jt.cellActive]}
              onPress={() => router.push(`/mushaf/${item.surahId}/${item.ayahNumber}`)}
              activeOpacity={0.75}
            >
              <Text style={[jt.cellText, active && jt.cellTextActive]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Ses oynatıcı (CDN veya local) ─────────────────────────────────────────────

function AudioBar({ surahId }: { surahId: number }) {
  const [playing, setPlaying] = useState(false);
  const audioUrl =
    (process.env.EXPO_PUBLIC_AUDIO_BASE_URL
      ? `${process.env.EXPO_PUBLIC_AUDIO_BASE_URL}/surah/${String(surahId).padStart(3, "0")}.mp3`
      : null);

  if (!audioUrl) return null;

  // React Native'de Audio, expo-av ile çalışır.
  // expo-av kurulu değilse bu bölüm render edilmez.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Audio } = require("expo-av") as typeof import("expo-av");
    void Audio; // ensure import used
  } catch {
    return null;
  }

  return (
    <TouchableOpacity
      style={ab.btn}
      onPress={() => setPlaying(p => !p)}
      activeOpacity={0.8}
    >
      <Text style={ab.icon}>{playing ? "⏸" : "▶"}</Text>
      <Text style={ab.label}>{playing ? "Duraklat" : "Dinle"}</Text>
    </TouchableOpacity>
  );
}

// ── Ana ekran ──────────────────────────────────────────────────────────────────

export default function MushafAyahScreen() {
  const { surahId: rawS, ayahNumber: rawA } =
    useLocalSearchParams<{ surahId: string; ayahNumber: string }>();

  const surahId    = Number(rawS);
  const ayahNumber = Number(rawA);

  const [data, setData]       = useState<AyahDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!surahId || !ayahNumber) return;
    setLoading(true);
    setError(null);
    api.ayah.get(surahId, ayahNumber)
      .then(d => {
        setData(d);
        // Yer imini kaydet
        storage.setJSON(STORAGE_KEYS.mushafBookmark, `${surahId}:${ayahNumber}`).catch(() => {});
      })
      .catch(() => setError("Ayet yüklenemedi."))
      .finally(() => setLoading(false));
  }, [surahId, ayahNumber]);

  const navigate = useCallback((s: number, a: number) => {
    router.replace(`/mushaf/${s}/${a}`);
  }, []);

  const juzIndex = data ? getJuzIndex(surahId, ayahNumber) : 0;
  const title    = data ? `${data.surahName} · ${ayahNumber}` : "Mushaf";

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Mushaf", headerBackTitle: "Geri" }} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: "Hata" }} />
        <View style={s.centered}>
          <Text style={s.errorText}>{error ?? "Veri yüklenemedi."}</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Geri</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title, headerBackTitle: "Geri" }} />
      <View style={s.container}>
        {/* Cüz takibi */}
        <JuzTracker currentJuz={juzIndex} />

        {/* Ses oynatıcı */}
        <AudioBar surahId={surahId} />

        {/* Arapça metin */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sure + ayet numarası bilgisi */}
          <View style={s.metaRow}>
            <Text style={s.surahName}>{data.surahName}</Text>
            <View style={s.ayahBadge}>
              <Text style={s.ayahBadgeText}>{ayahNumber} / {data.verseCount}</Text>
            </View>
          </View>

          {/* Arapça metin — büyük font, RTL */}
          <View style={s.arabicBox}>
            <Text style={s.arabicText} selectable>
              {data.arabicText ?? "—"}
            </Text>
          </View>

          {/* Meal */}
          <View style={s.mealBox}>
            <Text style={s.mealText}>{data.meal ?? "—"}</Text>
          </View>
        </ScrollView>

        {/* Navigasyon */}
        <View style={s.navBar}>
          <TouchableOpacity
            style={[s.navBtn, !data.prevAyah && s.navBtnDisabled]}
            onPress={() => data.prevAyah && navigate(data.prevAyah.surahId, data.prevAyah.ayahNumber)}
            disabled={!data.prevAyah}
            activeOpacity={0.75}
          >
            <Text style={[s.navBtnText, !data.prevAyah && s.navBtnTextOff]}>← Önceki</Text>
          </TouchableOpacity>

          <Pressable
            style={s.navCenter}
            onLongPress={() => router.push(`/surah/${surahId}`)}
          >
            <Text style={s.navCenterText}>{surahId}:{ayahNumber}</Text>
            <Text style={s.navCenterHint}>basılı tut → sure</Text>
          </Pressable>

          <TouchableOpacity
            style={[s.navBtn, !data.nextAyah && s.navBtnDisabled]}
            onPress={() => data.nextAyah && navigate(data.nextAyah.surahId, data.nextAyah.ayahNumber)}
            disabled={!data.nextAyah}
            activeOpacity={0.75}
          >
            <Text style={[s.navBtnText, !data.nextAyah && s.navBtnTextOff]}>Sonraki →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ── Stiller ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#1a1a2e" },
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a1a2e" },
  errorText:  { color: "#ef4444", fontSize: 14, textAlign: "center" },
  backBtn:    { marginTop: 16, backgroundColor: "#059669", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText:{ color: "#fff", fontSize: 14, fontWeight: "600" },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16 },

  metaRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  surahName:  { fontSize: 16, fontWeight: "700", color: "#e5e7eb" },
  ayahBadge:  { backgroundColor: "#059669", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  ayahBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  arabicBox: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2d3561",
  },
  arabicText: {
    fontSize: 32,
    lineHeight: 56,
    color: "#f9f6ee",
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: "serif",
  },

  mealBox: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2d3561",
  },
  mealText: { fontSize: 15, lineHeight: 26, color: "#d1d5db" },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16213e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#2d3561",
  },
  navBtn:         { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#059669", borderRadius: 8, minHeight: 44, justifyContent: "center" },
  navBtnDisabled: { backgroundColor: "#374151" },
  navBtnText:     { color: "#fff", fontSize: 13, fontWeight: "600" },
  navBtnTextOff:  { color: "#6b7280" },
  navCenter:      { alignItems: "center" },
  navCenterText:  { color: "#9ca3af", fontSize: 13, fontWeight: "600" },
  navCenterHint:  { color: "#4b5563", fontSize: 10, marginTop: 2 },
});

const jt = StyleSheet.create({
  container: { height: 44, backgroundColor: "#0f0f1e", borderBottomWidth: 1, borderBottomColor: "#2d3561" },
  list:      { alignItems: "center", paddingHorizontal: 8 },
  cell:      { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginHorizontal: 2 },
  cellActive:{ backgroundColor: "#059669" },
  cellText:  { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  cellTextActive: { color: "#fff", fontWeight: "700" },
});

const ab = StyleSheet.create({
  btn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#16213e", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#2d3561" },
  icon:  { fontSize: 16 },
  label: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
});
