import { useState, useEffect, useMemo } from "react";
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { api } from "../../src/lib/api";
import { useColors } from "../../src/hooks/useColors";

// Tefsir metni dev tek bir <Text>'e basılırsa (Bakara ~1.7MB) RN yerleşim motoru
// kilitlenir (~23 sn). Bunun yerine paragraflara bölüp FlatList ile pencereli
// (windowed) render ediyoruz — sadece görünen paragraflar yerleştirilir.

export default function TafsirScreen() {
  const c = useColors();
  const { surahId: rawId, name } = useLocalSearchParams<{ surahId: string; name?: string }>();
  const surahId = Number(rawId);

  const [content, setContent] = useState<string | null | "loading">("loading");

  useEffect(() => {
    if (!surahId) return;
    let alive = true;
    api.tafsir.get(surahId)
      .then((r) => { if (alive) setContent(r?.content ?? null); })
      .catch(() => { if (alive) setContent(null); });
    return () => { alive = false; };
  }, [surahId]);

  // Paragraflara böl — boş satırlarda ayır, baştaki "2-BAKARA:" başlığını ve
  // ayraç çizgilerini temizle.
  const paragraphs = useMemo(() => {
    if (!content || content === "loading") return [];
    return content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^[-_=*\s]+$/.test(p));
  }, [content]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: name ? `${name} Tefsiri` : "Sure Tefsiri" }} />

      {content === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[styles.muted, { color: c.textMuted }]}>Tefsir yükleniyor…</Text>
        </View>
      ) : paragraphs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.muted, { color: c.textMuted }]}>Tefsir verisi bulunamadı.</Text>
        </View>
      ) : (
        <FlatList
          data={paragraphs}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Text style={[styles.para, { color: c.textSecondary }]}>{item}</Text>
          )}
          ListHeaderComponent={
            <Text style={[styles.source, { color: c.textMuted }]}>Elmalılı Hamdi Yazır</Text>
          }
          contentContainerStyle={styles.listContent}
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
  container:   { flex: 1 },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted:       { fontSize: 14, fontStyle: "italic" },
  listContent: { padding: 16, paddingBottom: 40 },
  source:      { fontSize: 12, fontStyle: "italic", marginBottom: 14 },
  para:        { fontSize: 15, lineHeight: 26, marginBottom: 14 },
});
