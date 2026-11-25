import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Platform,
  Text,
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
import { Button, Callout, Tabs, space } from "../../src/components/ui";

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
  // İngilizce arayüzde orijinal (Türkçe) Elmalılı metni gösterilmez: yalnız
  // İngilizce sade tefsir (114 surenin hepsinde var). İki dil aynı anda görünmez.
  const enOnly = lang === "en" && !!localEnContent;

  const [tafsir, setTafsir] = useState<TafsirResponse | null | "loading">("loading");
  const [selectedMode, setSelectedMode] = useState<TafsirMode>("original");
  // Ağ hatasını "veri yok"tan ayır: hata → Tekrar Dene sunulur, yanıltıcı
  // "bulunamadı" mesajı gösterilmez.
  const [fetchFailed, setFetchFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!surahId) { setTafsir(null); return; }
    // EN: içerik yerel, sunucudaki Türkçe metne gerek yok.
    if (enOnly) { setTafsir(null); setFetchFailed(false); return; }
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
        if (localSimplifiedContent) {
          setSelectedMode("simplified");
          setTafsir({ content: null, simplifiedContent: localSimplifiedContent, availableModes: ["original", "simplified"] });
        } else {
          setTafsir(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [enOnly, localSimplifiedContent, surahId, reloadKey]);

  const availableModes = useMemo<TafsirMode[]>(() => {
    if (enOnly) return ["simplified"];
    if (!tafsir || tafsir === "loading") return ["original"];

    const modes: TafsirMode[] = tafsir.availableModes?.length
      ? [...tafsir.availableModes]
      : ["original"];

    if (localSimplifiedContent && !modes.includes("simplified")) {
      modes.push("simplified");
    }

    return modes;
  }, [enOnly, localSimplifiedContent, tafsir]);

  const activeContent = useMemo(() => {
    if (enOnly) return localEnContent;
    if (!tafsir || tafsir === "loading") return null;
    if (selectedMode === "simplified") {
      return localEnContent ?? tafsir.simplifiedContent ?? localSimplifiedContent;
    }
    return tafsir.content ?? null;
  }, [enOnly, localEnContent, localSimplifiedContent, selectedMode, tafsir]);

  const paragraphs = useMemo(() => {
    if (!activeContent) return [];
    return activeContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^[-_=*\s]+$/.test(p));
  }, [activeContent]);

  const isSimplified = enOnly || selectedMode === "simplified";

  const modeTabs = availableModes.length > 1 ? (
    <Tabs<TafsirMode>
      variant="segmented"
      value={selectedMode}
      onChange={setSelectedMode}
      style={styles.modeTabs}
      items={[
        { key: "original", label: s.original, accessibilityLabel: s.originalA11y },
        {
          key: "simplified",
          label: lang === "en" && !localEnContent ? s.simplifiedFallback : s.simplified,
          accessibilityLabel: s.simplifiedA11y,
        },
      ]}
    />
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <Stack.Screen options={{ title: name ? fmt(s.titleNamed, { name }) : s.title }} />

      {tafsir === "loading" && !enOnly ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[styles.muted, { color: c.textMuted }]}>{s.loading}</Text>
        </View>
      ) : paragraphs.length === 0 ? (
        <View style={styles.emptyContainer}>
          {modeTabs ? <View style={styles.tabsWrap}>{modeTabs}</View> : null}
          <View style={styles.centered}>
            {fetchFailed && selectedMode === "original" && localSimplifiedContent ? (
              <Callout tone="info" style={{ alignSelf: "stretch" }}>
                {s.originalRequiresInternet}
              </Callout>
            ) : (
              <Text style={[styles.muted, { color: c.textMuted }]}>
                {fetchFailed ? s.loadFailed : s.notFound}
              </Text>
            )}
            {fetchFailed && surahId ? (
              <Button
                variant="primary"
                label={s.retry}
                onPress={() => setReloadKey((k) => k + 1)}
                accessibilityLabel={s.retryA11y}
                style={{ marginTop: space.xxs }}
              />
            ) : null}
          </View>
        </View>
      ) : (
        <FlatList
          data={paragraphs}
          keyExtractor={(_, i) => `${selectedMode}-${i}`}
          renderItem={({ item }) => (
            <Text style={[styles.para, { color: c.textSecondary }]}>{item}</Text>
          )}
          ListHeaderComponent={modeTabs}
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
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1 },
  tabsWrap: { paddingHorizontal: space.gutter, paddingTop: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, gap: space.sm },
  muted: { fontSize: 14, fontStyle: "italic", textAlign: "center" },
  listContent: { padding: space.gutter, paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  sourceFooter: { fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  para: { fontSize: 15, lineHeight: 26, marginBottom: 14 },
  modeTabs: { marginBottom: space.sm },
});