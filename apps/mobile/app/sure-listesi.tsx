import {
  View, Text, TouchableOpacity,
  TextInput, ActivityIndicator, StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SurahListItem } from "../src/lib/api";
import { useColors, type AppColors } from "../src/hooks/useColors";

const NUZUL: Record<number, number> = {
  96:1, 68:2, 73:3, 74:4, 1:5, 111:6, 81:7, 87:8, 92:9, 89:10,
  93:11, 94:12, 103:13, 100:14, 108:15, 102:16, 107:17, 109:18, 105:19, 113:20,
  114:21, 112:22, 53:23, 80:24, 97:25, 91:26, 85:27, 95:28, 106:29, 101:30,
  75:31, 104:32, 77:33, 50:34, 90:35, 86:36, 54:37, 38:38, 7:39, 72:40,
  36:41, 25:42, 35:43, 19:44, 20:45, 56:46, 26:47, 27:48, 28:49, 17:50,
  10:51, 11:52, 12:53, 15:54, 6:55, 37:56, 31:57, 34:58, 39:59, 40:60,
  41:61, 42:62, 43:63, 44:64, 45:65, 46:66, 51:67, 88:68, 18:69, 16:70,
  71:71, 14:72, 21:73, 23:74, 32:75, 52:76, 67:77, 69:78, 70:79, 78:80,
  79:81, 82:82, 84:83, 30:84, 29:85, 83:86,
  2:87, 8:88, 3:89, 33:90, 60:91, 4:92, 99:93, 57:94, 47:95, 13:96,
  55:97, 76:98, 65:99, 98:100, 59:101, 24:102, 22:103, 63:104, 58:105,
  49:106, 66:107, 64:108, 61:109, 62:110, 48:111, 5:112, 9:113, 110:114,
};

function PlaceBadge({ place, c }: { place: "Mekke" | "Medine"; c: AppColors }) {
  const isMekki = place === "Mekke";
  return (
    <View style={[styles.badge, {
      backgroundColor: isMekki
        ? (c.isDark ? "#064e3b" : "#d1fae5")
        : (c.isDark ? "#431407" : "#ffedd5"),
    }]}>
      <Text style={[styles.badgeText, {
        color: isMekki
          ? (c.isDark ? "#6ee7b7" : "#065f46")
          : (c.isDark ? "#fca5a5" : "#9a3412"),
      }]}>
        {place}
      </Text>
    </View>
  );
}

const SurahRow = memo(function SurahRow({ item, c, sortMode }: { item: SurahListItem; c: AppColors; sortMode: "mushaf" | "nuzul" }) {
  const circleNum    = sortMode === "nuzul" ? (NUZUL[item.id] ?? item.id) : item.id;
  const secondaryNum = sortMode === "nuzul" ? item.id : (NUZUL[item.id] ?? null);

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card }]}
      onPress={() => router.push(`/surah/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.rowNumber, { backgroundColor: c.isDark ? c.cardAlt : sortMode === "nuzul" ? "#ede9fe" : "#f5f0e8" }]}>
        <Text style={[styles.numberText, { color: sortMode === "nuzul" ? "#7c3aed" : c.textMuted }]}>{circleNum}</Text>
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.surahName, { color: c.text }]}>{item.name}</Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.metaText, { color: c.textMuted }]}>{item.verseCount} ayet</Text>
          <PlaceBadge place={item.revelationPlace} c={c} />
          {secondaryNum != null && (
            <Text style={[styles.nuzulText, { color: c.textMuted }]}>
              {sortMode === "nuzul" ? `Mushaf: ${secondaryNum}` : `Nüzul: ${secondaryNum}`}
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.arabicName, { color: c.textSecondary }]}>{item.arabicName}</Text>
    </TouchableOpacity>
  );
});

export default function SureListesiScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs]     = useState<SurahListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState("");
  const [sortMode, setSortMode] = useState<"mushaf" | "nuzul">("mushaf");

  useEffect(() => {
    api.surahs.list()
      .then(setSurahs)
      .catch(() => setError("Sureler yüklenemedi. İnternet bağlantısını kontrol edin."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const list = filter.trim()
      ? surahs.filter(s =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.translit.toLowerCase().includes(filter.toLowerCase()) ||
          String(s.id).startsWith(filter.trim()),
        )
      : [...surahs];
    if (sortMode === "nuzul") {
      list.sort((a, b) => (NUZUL[a.id] ?? 999) - (NUZUL[b.id] ?? 999));
    }
    return list;
  }, [surahs, filter, sortMode]);

  const renderItem = useCallback(
    ({ item }: { item: SurahListItem }) => <SurahRow item={item} c={c} sortMode={sortMode} />,
    [c, sortMode],
  );
  const keyExtractor = useCallback((item: SurahListItem) => String(item.id), []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Sureler yükleniyor…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.searchWrapper, { backgroundColor: c.bg }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="Sure ara (ad veya numara)"
          placeholderTextColor={c.textMuted}
          value={filter}
          onChangeText={setFilter}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <View style={[styles.toggleRow, { backgroundColor: c.cardAlt }]}>
          {(["mushaf", "nuzul"] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, sortMode === mode && { backgroundColor: c.accent }]}
              onPress={() => setSortMode(mode)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, { color: sortMode === mode ? "#fff" : c.textMuted }]}>
                {mode === "mushaf" ? "📖 Mushaf Sırası" : "✨ Nüzul Sırası"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border }]} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>Sonuç bulunamadı</Text>
            <Text style={[styles.emptySubText, { color: c.textMuted }]}>Farklı bir sure adı veya numara deneyin</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText:  { marginTop: 12, fontSize: 14 },
  errorText:    { color: "#dc2626", fontSize: 14, textAlign: "center" },
  searchWrapper:{ paddingHorizontal: 16, paddingVertical: 10 },
  searchInput:  { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, marginBottom: 8 },
  toggleRow:    { flexDirection: "row", borderRadius: 10, padding: 3, gap: 3 },
  toggleBtn:    { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  toggleText:   { fontSize: 12, fontWeight: "600" },
  listContent:  { paddingBottom: 20, flexGrow: 1 },
  emptyState:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8 },
  emptyText:    { fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptySubText: { fontSize: 13, textAlign: "center" },
  separator:    { height: 1, marginLeft: 72 },
  row:          { flexDirection: "row", alignItems: "center", minHeight: 44, paddingVertical: 12, paddingHorizontal: 16 },
  rowNumber:    { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  numberText:   { fontSize: 13, fontWeight: "700" },
  rowCenter:    { flex: 1, gap: 3 },
  surahName:    { fontSize: 15, fontWeight: "600" },
  rowMeta:      { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText:     { fontSize: 12 },
  nuzulText:    { fontSize: 11 },
  arabicName:   { fontSize: 20, fontFamily: "Amiri", writingDirection: "rtl", textAlign: "right", marginLeft: 8 },
  badge:        { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:    { fontSize: 10, fontWeight: "600" },
});
