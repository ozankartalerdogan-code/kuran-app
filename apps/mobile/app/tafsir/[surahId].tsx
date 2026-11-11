import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type TafsirResponse } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";
import { getSimplifiedTafsir, getSimplifiedTafsirEn } from "../../src/data/tafsirSimplified";
import { fmt, useLang, useStrings } from "../../src/i18n";
import tafsirStrings from "../../src/i18n/strings/tafsir";
import { READING_MAX_WIDTH } from "../../src/lib/layout";

type TafsirMode = "original" | "simplified";

export default function TafsirScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { surahId: rawId, name } = useLocalSearchParams<{ surahId: string; name?: string }>();
  const surahId = Number(rawId);
  const lang = useLang();
  const s = useStrings(tafsirStrings);
  // İngilizce arayüzde sadeleştirilmiş sekme İngilizce çeviriyi gösterir; çevirisi
  // olmayan surede Türkçe sadeleştirilmiş metne düşülür.
  const localEnContent = lang === "en" && surahId ? getSimplifiedTafsirEn(surahId) : null;
  const localSimplifiedContent = localEnContent ?? (surahId ? getSimplifiedTafsir(surahId) : null);

  const [tafsir, setTafsir] = useState<TafsirResponse | null | "loading">("loading");
  const [selectedMode, setSelectedMode] = useState<TafsirMode>("original");
  // Ağ hatasını "veri yok"tan ayır: hata → Tekrar Dene sunulur, yanıltıcı
  // "bulunamadı" mesajı gösterilmez.
  const [fetchFailed, setFetchFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!surahId) { setTafsir(null); return; }
    let alive = true;
    setTafsir("loading");
    setFetchFailed(false);
    setSelectedMode("original");

    api.tafsir.get(surahId)
      .then((response) => {
        if (!alive) return;
        setTafsir(response);
        if (response?.simplifiedContent || localSimplifiedContent) {
          setSelectedMode("simplified");
        }
      })
      .catch(() => {
        if (!alive) return;
        setFetchFailed(true);
        setTafsir(
          localSimplifiedContent
            ? { content: null, simplifiedContent: localSimplifiedContent, availableModes: ["original", "simplified"] }
            : null
        );
      });

    return () => {
      alive = false;
    };
  }, [localSimplifiedContent, surahId, reloadKey]);

  const availableModes = useMemo<TafsirMode[]>(() => {
    if (!tafsir || tafsir === "loading") return ["original"];

    const modes: TafsirMode[] = tafsir.availableModes?.length
      ? [...tafsir.availableModes]
      : ["original"];

    if (localSimplifiedContent && !modes.includes("simplified")) {
      modes.push("simplified");
    }

    return modes;
  }, [localSimplifiedContent, tafsir]);

  const activeContent = useMemo(() => {
    if (!tafsir || tafsir === "loading") return null;
    if (selectedMode === "simplified") {
      return localEnContent ?? tafsir.simplifiedContent ?? localSimplifiedContent;
    }
    return tafsir.content ?? null;
  }, [localEnContent, localSimplifiedContent, selectedMode, tafsir]);

  const paragraphs = useMemo(() => {
    if (!activeContent) return [];
    return activeContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^[-_=*\s]+$/.test(p));
  }, [activeContent]);

  const isSimplified = selectedMode === "simplified";

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <Stack.Screen options={{ title: name ? fmt(s.titleNamed, { name }) : s.title }} />

      {tafsir === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[styles.muted, { color: c.textMuted }]}>{s.loading}</Text>
        </View>
      ) : paragraphs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.muted, { color: c.textMuted }]}>
            {fetchFailed ? s.loadFailed : s.notFound}
          </Text>
          {fetchFailed && surahId ? (
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: c.accent }]}
              onPress={() => setReloadKey((k) => k + 1)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={s.retryA11y}
            >
              <Text style={styles.retryText}>{s.retry}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={paragraphs}
          keyExtractor={(_, i) => `${selectedMode}-${i}`}
          renderItem={({ item }) => (
            <Text style={[styles.para, { color: c.textSecondary }]}>{item}</Text>
          )}
          ListHeaderComponent={
            availableModes.length > 1 ? (
              <View style={[styles.tabRow, { borderColor: c.border, backgroundColor: c.card }]}>
                <TouchableOpacity
                  style={[styles.tab, selectedMode === "original" && styles.tabActive]}
                  onPress={() => setSelectedMode("original")}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityLabel={s.originalA11y}
                  accessibilityState={{ selected: selectedMode === "original" }}
                >
                  <Text style={[styles.tabText, { color: selectedMode === "original" ? "#0a1628" : c.textMuted }]}>{s.original}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, selectedMode === "simplified" && styles.tabActive]}
                  onPress={() => setSelectedMode("simplified")}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityLabel={s.simplifiedA11y}
                  accessibilityState={{ selected: selectedMode === "simplified" }}
                >
                  <Text style={[styles.tabText, { color: selectedMode === "simplified" ? "#0a1628" : c.textMuted }]}>{lang === "en" && !localEnContent ? s.simplifiedFallback : s.simplified}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={
            <Text style={[styles.sourceFooter, { color: c.textMuted, borderTopColor: c.border }]}>
              {isSimplified
                ? (lang === "en" && !localEnContent ? s.footerSimplifiedFallback : s.footerSimplified)
                : s.footerOriginal}
            </Text>
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 + insets.bottom }]}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { fontSize: 14, fontStyle: "italic", textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  listContent: { padding: 16, paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  source: { fontSize: 12, fontStyle: "italic", lineHeight: 18, marginBottom: 14 },
  sourceFooter: { fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  para: { fontSize: 15, lineHeight: 26, marginBottom: 14 },
  tabRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#c9a84c",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
});