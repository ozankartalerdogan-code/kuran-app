import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { api, type AyahDetailResponse } from "../../../src/lib/api";

// ── Yardımcı: Köksüz kelimeler için etiket ────────────────────────────────────

const naturallyRootlessPosLabels: Record<string, string> = {
  particle:     "edat",
  preposition:  "edat",
  conjunction:  "bağlaç",
  article:      "harf",
  determiner:   "harf",
};

function getRootDisplayText(word: AyahDetailResponse["words"][number]): string {
  if (word.root) return word.root;
  if (word.pos && naturallyRootlessPosLabels[word.pos]) {
    return `Kök yok (${naturallyRootlessPosLabels[word.pos]})`;
  }
  return "Kök bilgisi yok";
}

function isRootClickable(word: AyahDetailResponse["words"][number]): boolean {
  return Boolean(word.root && word.root.trim().length > 0);
}

// ── Ham Anlam Özeti bileşeni ──────────────────────────────────────────────────

function RawMeaningSummary({
  words,
  colors,
}: {
  words: AyahDetailResponse["words"];
  colors: ThemeColors;
}) {
  const meanings = words
    .map((w) => w.meaningTr?.trim())
    .filter((m): m is string => typeof m === "string" && m.length > 0);

  if (meanings.length === 0) return null;

  return (
    <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.analysisCardTitle, { color: colors.textPrimary }]}>
        Ham Anlam Özeti
      </Text>
      <Text style={[styles.analysisCardSubtitle, { color: colors.textMuted }]}>
        Kelimelerin sırasıyla doğrudan anlamları
      </Text>
      <Text style={[styles.analysisCardBody, { color: colors.textSecondary }]}>
        {meanings.join(" ") + "."}
      </Text>
    </View>
  );
}

// ── Eşsiz Kök Listesi ─────────────────────────────────────────────────────────

function UniqueRootList({
  words,
  colors,
}: {
  words: AyahDetailResponse["words"];
  colors: ThemeColors;
}) {
  // Benzersiz kökleri topla
  const rootMap = new Map<string, number>();
  for (const w of words) {
    if (w.root?.trim()) {
      rootMap.set(w.root.trim(), (rootMap.get(w.root.trim()) ?? 0) + 1);
    }
  }
  const roots = Array.from(rootMap.entries()).sort((a, b) => a[0].localeCompare(b[0], "ar"));

  if (roots.length === 0) {
    return (
      <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Bu ayet için kök bilgisi bulunamadı.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.rootsGrid}>
      {roots.map(([root, count]) => (
        <TouchableOpacity
          key={root}
          style={[styles.rootChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => router.push(`/root/${encodeURIComponent(root)}`)}
          activeOpacity={0.7}
        >
          <View style={styles.rootChipRow}>
            <Text style={[styles.rootChipArabic, { color: colors.accent }]}>{root}</Text>
            <View style={[styles.rootCountBadge, { backgroundColor: colors.accent + "18" }]}>
              <Text style={[styles.rootCountText, { color: colors.accent }]}>
                {count} kelime
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Sekme Bileşeni ────────────────────────────────────────────────────────────

type TabId = "meal" | "words" | "roots" | "analysis";

function SegmentedTabs({
  active,
  onChange,
  colors,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
  colors: ThemeColors;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "meal", label: "Meal" },
    { id: "words", label: "Kelimeler" },
    { id: "roots", label: "Kökler" },
    { id: "analysis", label: "Analiz" },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.tabItem,
              isActive && { backgroundColor: colors.accent },
              isActive && styles.tabItemActive,
            ]}
            onPress={() => onChange(t.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? "#ffffff" : colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Tema Renkleri ─────────────────────────────────────────────────────────────

interface ThemeColors {
  bg: string;
  card: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  error: string;
}

const lightColors: ThemeColors = {
  bg:           "#f7f1e4",
  card:         "#ffffff",
  surfaceAlt:   "#f5f0e8",
  border:       "#e7e5e4",
  textPrimary:  "#1c1917",
  textSecondary:"#44403c",
  textMuted:    "#a8a29e",
  accent:       "#059669",
  accentLight:  "#d1fae5",
  error:        "#dc2626",
};

const darkColors: ThemeColors = {
  bg:           "#171717",
  card:         "#262626",
  surfaceAlt:   "#1f1f1f",
  border:       "#404040",
  textPrimary:  "#fafaf9",
  textSecondary:"#d6d3d1",
  textMuted:    "#78716c",
  accent:       "#10b981",
  accentLight:  "#064e3b",
  error:        "#f87171",
};

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function AyahDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  const { surahId: rawS, ayahNumber: rawA } =
    useLocalSearchParams<{ surahId: string; ayahNumber: string }>();
  const surahId    = Number(rawS);
  const ayahNumber = Number(rawA);

  const [data, setData]       = useState<AyahDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("meal");

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

  const navigate = useCallback(
    (s: number, a: number) => {
      router.replace(`/ayah/${s}/${a}`);
    },
    [],
  );

  const headerTitle = data
    ? `${data.surahName} · ${data.ayahNumber}. Ayet`
    : "Ayet Detayı";

  const navToRoot = useCallback((root: string) => {
    router.push(`/root/${encodeURIComponent(root)}`);
  }, []);

  // ── Yükleme ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Ayet Detayı" }} />
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Ayet yükleniyor…
          </Text>
        </View>
      </>
    );
  }

  // ── Hata / Veri yok ──
  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: "Hata" }} />
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error ?? "Veri yüklenemedi."}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ── Veri görünümü ──
  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Başlık ═══ */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {data.surahName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {data.ayahNumber}. Ayet · {data.verseKey}
          </Text>
        </View>

        {/* ═══ Arapça Metin ═══ */}
        <View style={[styles.arabicBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.arabicText, { color: colors.textPrimary }]}>
            {data.arabicText ?? "—"}
          </Text>
        </View>

        {/* ═══ Sekmeler ═══ */}
        <SegmentedTabs active={activeTab} onChange={setActiveTab} colors={colors} />

        {/* ═══ Sekme İçerikleri ═══ */}
        {activeTab === "meal" && (
          <View style={styles.tabContent}>

            {/* Okunuş */}
            {data.readingTr ? (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>OKUNUŞ</Text>
                <Text style={[styles.literalText, { color: colors.textMuted }]}>{data.readingTr}</Text>
              </View>
            ) : null}

            {/* Birden fazla çeviri varsa hepsini göster */}
            {(data.translations ?? []).length > 0 ? (
              (data.translations ?? []).map((t) => (
                <View key={t.source} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.accent }]}>
                    {t.source?.split("#").at(-1)?.toUpperCase() ?? "MEAL"}
                  </Text>
                  <Text style={[styles.mealText, { color: colors.textSecondary }]}>
                    {t.text ?? "—"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>MEAL</Text>
                <Text style={[styles.mealText, { color: colors.textSecondary }]}>
                  {data.meal ?? "Meal verisi yok."}
                </Text>
              </View>
            )}

          </View>
        )}

        {activeTab === "words" && (
          <View style={styles.tabContent}>
            {data.words.length > 0 ? (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>KELİME ANALİZİ</Text>
                <View style={styles.wordsList}>
                  {data.words.map((w) => (
                    <View
                      key={w.wordIndex}
                      style={[
                        styles.wordCard,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                    >
                      {/* Arapça kelime */}
                      <View style={styles.wordTopRow}>
                        <Text style={[styles.wordIndex, { color: colors.textMuted }]}>
                          #{w.wordIndex + 1}
                        </Text>
                        <Text style={[styles.wordArabicChip, { color: colors.textPrimary }]}>
                          {w.arabic ?? "—"}
                        </Text>
                      </View>

                      {/* Anlam */}
                      <View style={styles.wordDetailRow}>
                        <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                          Anlam
                        </Text>
                        <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                          {w.meaningTr ?? "Anlam yok"}
                        </Text>
                      </View>

                      {/* Tür */}
                      {w.pos ? (
                        <View style={styles.wordDetailRow}>
                          <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                            Tür
                          </Text>
                          <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                            {w.pos}
                          </Text>
                        </View>
                      ) : null}

                      {/* Kök */}
                      <View style={styles.wordDetailRow}>
                        <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                          Kök
                        </Text>
                        {isRootClickable(w) ? (
                          <TouchableOpacity
                            onPress={() => navToRoot(w.root!)}
                            activeOpacity={0.6}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.rootLink, { color: colors.accent }]}>
                              {w.root}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={[styles.wordDetailValue, { color: colors.textMuted }]}>
                            {getRootDisplayText(w)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Kelime analizi verisi yok.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "roots" && (
          <View style={styles.tabContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.accent }]}>KÖKLER</Text>
              <UniqueRootList words={data.words} colors={colors} />
            </View>
          </View>
        )}

        {activeTab === "analysis" && (
          <View style={styles.tabContent}>

            {/* Literal Çeviri */}
            {data.literalCeviri ? (
              <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.analysisCardTitle, { color: colors.textPrimary }]}>Literal Çeviri</Text>
                <Text style={[styles.analysisCardSubtitle, { color: colors.textMuted }]}>
                  Kelimenin kelime karşılığı
                </Text>
                <Text style={[styles.analysisCardBody, { color: colors.textSecondary }]}>
                  {data.literalCeviri}
                </Text>
              </View>
            ) : null}

            {/* Fark Analizi */}
            {data.farkAnalizi ? (
              <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.analysisCardTitle, { color: colors.textPrimary }]}>Fark Analizi</Text>
                <Text style={[styles.analysisCardSubtitle, { color: colors.textMuted }]}>
                  Meal ile literal çeviri arasındaki anlam farkları
                </Text>
                <Text style={[styles.analysisCardBody, { color: colors.textSecondary }]}>
                  {data.farkAnalizi}
                </Text>
              </View>
            ) : null}

            {/* Ham Anlam Özeti */}
            <RawMeaningSummary words={data.words} colors={colors} />

            {/* Hiç veri yoksa */}
            {!data.farkAnalizi && data.words.filter((w) => w.meaningTr?.trim()).length === 0 && (
              <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Bu ayet için analiz verisi bulunamadı.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ Navigasyon ═══ */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { backgroundColor: data.prevAyah ? colors.accent : colors.border },
            ]}
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
                !data.prevAyah && { color: colors.textMuted },
              ]}
            >
              ← Önceki
            </Text>
          </TouchableOpacity>

          <Text style={[styles.navCenter, { color: colors.textMuted }]}>
            {data.ayahNumber} / {data.verseCount}
          </Text>

          <TouchableOpacity
            style={[
              styles.navBtn,
              { backgroundColor: data.nextAyah ? colors.accent : colors.border },
            ]}
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
                !data.nextAyah && { color: colors.textMuted },
              ]}
            >
              Sonraki →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Merkez / Durum ──
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 20,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText:   { fontSize: 14, textAlign: "center" },
  backBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    minHeight: 44, justifyContent: "center", borderRadius: 8,
  },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 48 },

  // ── Başlık kartı ──
  headerCard: {
    borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 22, fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 4, fontSize: 13, fontWeight: "500",
  },

  // ── Arapça metin ──
  arabicBox: {
    borderRadius: 12, padding: 20, marginBottom: 10,
    alignItems: "center", borderWidth: 1,
  },
  arabicText: {
    fontSize: 36, lineHeight: 60,
    fontFamily: "serif", textAlign: "right",
    writingDirection: "rtl", width: "100%",
  },

  // ── Sekmeler ──
  tabBar: {
    flexDirection: "row", borderRadius: 10,
    borderWidth: 1, padding: 3, marginBottom: 10,
  },
  tabItem: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    minHeight: 38,
  },
  tabItemActive: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  tabContent: { gap: 10 },

  // ── Bölüm kartı ──
  sectionCard: {
    borderRadius: 12, padding: 16, borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: "700",
    letterSpacing: 0.5, marginBottom: 10,
  },
  mealText: { fontSize: 15, lineHeight: 26 },
  literalText: { fontSize: 14, lineHeight: 24, fontStyle: "italic" },

  // ── Kelime listesi ──
  wordsList: { gap: 8 },
  wordCard: {
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  wordTopRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 8,
  },
  wordIndex: { fontSize: 11, fontWeight: "700" },
  wordArabicChip: {
    fontSize: 22, fontFamily: "serif",
    textAlign: "right", writingDirection: "rtl",
  },
  wordDetailRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  wordDetailLabel: {
    fontSize: 11, fontWeight: "600",
    textTransform: "uppercase",
  },
  wordDetailValue: {
    fontSize: 13, fontWeight: "500",
    flex: 1, textAlign: "right",
  },
  rootLink: {
    fontSize: 16, fontWeight: "700",
    textDecorationLine: "underline",
  },

  // ── Kök listesi ──
  rootsGrid: { gap: 8 },
  rootChip: {
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  rootChipRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  rootChipArabic: {
    fontSize: 22, fontWeight: "700",
    fontFamily: "serif",
  },
  rootCountBadge: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  rootCountText: { fontSize: 11, fontWeight: "600" },

  // ── Analiz kartları ──
  analysisCard: {
    borderRadius: 12, padding: 16, borderWidth: 1,
  },
  analysisCardTitle: {
    fontSize: 14, fontWeight: "700",
  },
  analysisCardSubtitle: {
    marginTop: 2, fontSize: 11,
  },
  analysisCardBody: {
    marginTop: 8, fontSize: 14, lineHeight: 24,
  },

  // ── Boş durum ──
  emptyState: {
    borderRadius: 10, borderWidth: 1,
    borderStyle: "dashed", padding: 16, alignItems: "center",
  },
  emptyText: { fontSize: 13 },

  // ── Navigasyon ──
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 14,
  },
  navBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    minHeight: 44, justifyContent: "center", borderRadius: 8,
  },
  navBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  navCenter: { fontSize: 13 },

  // (geriye dönük uyumluluk için kalan)
  wordRoot: {
    fontSize: 13, fontWeight: "600",
    textDecorationLine: "underline",
  },
});