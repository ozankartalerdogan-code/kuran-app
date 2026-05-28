import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import { api, type AyahDetailResponse } from "../../../../src/lib/api";

export default function AyahDetailScreen() {
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
    api.ayah
      .get(surahId, ayahNumber)
      .then(setData)
      .catch(() => setError("Ayet yüklenemedi. Bağlantını kontrol et."))
      .finally(() => setLoading(false));
  }, [surahId, ayahNumber]);

  const navigate = (s: number, a: number) => {
    router.replace(`/ayah/${s}/${a}`);
  };

  const headerTitle = data
    ? `${data.surahName} · ${data.ayahNumber}. Ayet`
    : "Ayet Detayı";

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Ayet Detayı" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Ayet yükleniyor…</Text>
        </View>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: "Hata" }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Veri yüklenemedi."}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Arapça Metin */}
          <View style={styles.arabicBox}>
            <Text style={styles.arabicText}>{data.arabicText ?? "—"}</Text>
            <Text style={styles.verseKeyBadge}>{data.verseKey}</Text>
          </View>

          {/* Meal */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Meal</Text>
            <Text style={styles.mealText}>
              {data.meal ?? "Meal verisi yok."}
            </Text>
          </View>

          {/* Kelime Kelime */}
          {data.words.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Kelime Kelime</Text>
              <View style={styles.wordsGrid}>
                {data.words.map((w) => (
                  <View key={w.wordIndex} style={styles.wordChip}>
                    <Text style={styles.wordArabic}>{w.arabic ?? "—"}</Text>
                    {w.meaningTr ? (
                      <Text style={styles.wordMeaning}>{w.meaningTr}</Text>
                    ) : null}
                    {w.pos ? (
                      <Text style={styles.wordPos}>{w.pos}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Navigasyon */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, !data.prevAyah && styles.navBtnDisabled]}
              onPress={() =>
                data.prevAyah &&
                navigate(data.prevAyah.surahId, data.prevAyah.ayahNumber)
              }
              disabled={!data.prevAyah}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.navBtnText,
                  !data.prevAyah && styles.navBtnTextDisabled,
                ]}
              >
                ← Önceki
              </Text>
            </TouchableOpacity>

            <Text style={styles.navCenter}>
              {data.ayahNumber} / {data.verseCount}
            </Text>

            <TouchableOpacity
              style={[styles.navBtn, !data.nextAyah && styles.navBtnDisabled]}
              onPress={() =>
                data.nextAyah &&
                navigate(data.nextAyah.surahId, data.nextAyah.ayahNumber)
              }
              disabled={!data.nextAyah}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.navBtnText,
                  !data.nextAyah && styles.navBtnTextDisabled,
                ]}
              >
                Sonraki →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f7f1e4",
  },
  loadingText: { marginTop: 12, color: "#78716c", fontSize: 14 },
  errorText:   { color: "#dc2626", fontSize: 14, textAlign: "center" },

  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight:       44,
    justifyContent:  "center",
    backgroundColor: "#059669",
    borderRadius: 8,
  },
  backBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // ── Arapça Kutu ──
  arabicBox: {
    backgroundColor:  "#ffffff",
    borderRadius:     12,
    padding:          20,
    marginBottom:     16,
    alignItems:       "center",
    borderWidth:      1,
    borderColor:      "#e7e5e4",
  },
  arabicText: {
    fontSize:    32,
    lineHeight:  56,
    color:       "#1c1917",
    fontFamily:  "serif",
    textAlign:   "right",
    writingDirection: "rtl",
    width:       "100%",
  },
  verseKeyBadge: {
    marginTop:  8,
    fontSize:   11,
    color:      "#a8a29e",
    fontWeight: "500",
  },

  // ── Bölümler ──
  section: {
    backgroundColor: "#ffffff",
    borderRadius:    12,
    padding:         16,
    marginBottom:    16,
    borderWidth:     1,
    borderColor:     "#e7e5e4",
  },
  sectionLabel: {
    fontSize:     11,
    fontWeight:   "700",
    color:        "#059669",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  mealText: {
    fontSize:   15,
    lineHeight: 26,
    color:      "#292524",
  },

  // ── Kelimeler ──
  wordsGrid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            8,
  },
  wordChip: {
    backgroundColor: "#f5f0e8",
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   8,
    alignItems:      "center",
    minWidth:        60,
  },
  wordArabic: {
    fontSize:   18,
    color:      "#1c1917",
    fontFamily: "serif",
    textAlign:  "center",
  },
  wordMeaning: {
    marginTop:  3,
    fontSize:   11,
    color:      "#44403c",
    textAlign:  "center",
  },
  wordPos: {
    marginTop:  2,
    fontSize:   10,
    color:      "#a8a29e",
    textAlign:  "center",
    fontStyle:  "italic",
  },

  // ── Navigasyon ──
  navRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      8,
  },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical:   12,
    minHeight:         44,
    justifyContent:    "center",
    backgroundColor:   "#059669",
    borderRadius:      8,
  },
  navBtnDisabled: { backgroundColor: "#d6d3d1" },
  navBtnText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#ffffff",
  },
  navBtnTextDisabled: { color: "#a8a29e" },
  navCenter: {
    fontSize: 13,
    color:    "#78716c",
  },
});
