import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Pressable,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SearchResponse, type VerseResult, type TagFilterResult } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const DEBOUNCE_MS   = 400;
const MIN_Q         = 2;
const MAX_RECENT    = 6;

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function parseVerseKey(key: string): { surahId: number; ayahNumber: number } | null {
  const [s, a] = key.split(":").map(Number);
  if (!s || !a) return null;
  return { surahId: s, ayahNumber: a };
}

async function loadRecent(): Promise<string[]> {
  try { return (await storage.getJSON<string[]>(STORAGE_KEYS.recentSearches)) ?? []; }
  catch { return []; }
}

async function addRecent(q: string, prev: string[]): Promise<string[]> {
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECENT);
  try { await storage.setJSON(STORAGE_KEYS.recentSearches, next); } catch { /* ignore */ }
  return next;
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────

function VerseCard({ item, onPress }: { item: VerseResult; onPress: () => void }) {
  const parsed     = parseVerseKey(item.verse_key);
  const mealPreview = item.meal?.slice(0, 130) ?? null;
  const truncated   = (item.meal?.length ?? 0) > 130;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72} accessibilityRole="button" accessibilityLabel={`${item.surah_name ?? item.verse_key}, ayeti aç`}>
      <View style={styles.cardHeader}>
        <View style={styles.keyBadge}>
          <Text style={styles.keyText}>{item.verse_key}</Text>
        </View>
        {item.surah_name ? (
          <Text style={styles.surahLabel} numberOfLines={1}>
            {item.surah_name}{parsed ? ` · ${parsed.ayahNumber}. ayet` : ""}
          </Text>
        ) : null}
      </View>
      {mealPreview ? (
        <Text style={styles.mealText} numberOfLines={3}>
          {mealPreview}{truncated ? "…" : ""}
        </Text>
      ) : (
        <Text style={styles.mealEmpty}>—</Text>
      )}
    </TouchableOpacity>
  );
}

function SurahCard({ surahId, surahName }: { surahId: number; surahName: string }) {
  return (
    <TouchableOpacity
      style={[styles.card, styles.surahCard]}
      onPress={() => router.push(`/surah/${surahId}`)}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`${surahName} suresini aç`}
    >
      <View style={styles.rowCenter}>
        <Text style={styles.bigIcon}>📖</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultTypeLabel}>Sure bulundu</Text>
          <Text style={styles.resultName}>{surahName}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function TagCard({ tag, count }: { tag: string; count: number }) {
  return (
    <View style={[styles.card, styles.tagCard]}>
      <View style={styles.rowCenter}>
        <Text style={styles.bigIcon}>🏷️</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultTypeLabel, { color: "#a16207" }]}>Tema bulundu</Text>
          <Text style={[styles.resultName, { color: "#713f12" }]}>{tag}</Text>
          <Text style={styles.tagCount}>{count} ayet</Text>
        </View>
      </View>
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

// Tag aramasında verse'ler ikincil fetch ile gelir
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: SearchResponse; tagVerses?: TagFilterResult[]; tagTotal?: number };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query,   setQuery]   = useState("");
  const [state,   setState]   = useState<State>({ status: "idle" });
  const [recent,  setRecent]  = useState<string[]>([]);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef              = useRef<TextInput>(null);

  useEffect(() => {
    loadRecent().then(setRecent);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < MIN_Q) { setState({ status: "idle" }); return; }

    timerRef.current = setTimeout(() => runSearch(query.trim()), DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  async function runSearch(q: string) {
    setState({ status: "loading" });
    try {
      const data = await api.search.query(q);

      // type:"tag" → ana_tema eşleşmesi, verses gelmiyor.
      // tags/filter ile ayetleri ikinci istekte çekiyoruz.
      if (data.type === "tag") {
        try {
          const filterRes = await api.tags.filter(data.tag);
          setState({
            status:    "done",
            data,
            tagVerses: filterRes.results,
            tagTotal:  filterRes.total,
          });
        } catch {
          setState({ status: "done", data });
        }
      } else {
        setState({ status: "done", data });
      }

      addRecent(q, recent).then(setRecent).catch(() => {});
    } catch {
      setState({ status: "done", data: { type: "none" } });
    }
  }

  const onVersePress = useCallback((key: string) => {
    const p = parseVerseKey(key);
    if (p) { Keyboard.dismiss(); router.push(`/ayah/${p.surahId}/${p.ayahNumber}`); }
  }, []);

  const onRecentPress = useCallback((q: string) => {
    setQuery(q);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const onClear = useCallback(() => {
    setQuery(""); setState({ status: "idle" }); inputRef.current?.focus();
  }, []);

  const renderVerseItem = useCallback(({ item }: { item: VerseResult }) => (
    <VerseCard item={item} onPress={() => onVersePress(item.verse_key)} />
  ), [onVersePress]);

  const renderTagVerseItem = useCallback(({ item }: { item: TagFilterResult }) => (
    <VerseCard
      item={{ verse_key: item.verse_key, meal: item.meal, surah_name: item.surah_name }}
      onPress={() => onVersePress(item.verse_key)}
    />
  ), [onVersePress]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const showRecent = query.length < MIN_Q && recent.length > 0;
  const isLoading  = state.status === "loading";
  const isDone     = state.status === "done";
  const d          = isDone ? state.data : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Arama çubuğu */}
      <View style={styles.bar}>
        <Text style={styles.searchEmoji}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Sure, ayet veya kelime ara…"
          placeholderTextColor="#a8a29e"
          returnKeyType="search"
          onSubmitEditing={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (query.trim().length >= MIN_Q) runSearch(query.trim());
          }}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hint */}
      {query.length === 0 && (
        <Text style={styles.hint}>
          Sure adı · ayet metninden kelime · tema kodu (sabır, namaz, A1…)
        </Text>
      )}

      {/* Yükleniyor */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Aranıyor…</Text>
        </View>
      )}

      {/* Sonuçlar */}
      {isDone && d && !isLoading && (() => {
        if (d.type === "surah") {
          return (
            <View style={styles.resultWrap}>
              <SurahCard surahId={d.surahId} surahName={d.surahName} />
            </View>
          );
        }

        if (d.type === "verses") {
          return (
            <FlatList
              data={d.results}
              keyExtractor={(item) => item.verse_key}
              renderItem={renderVerseItem}
              ListHeaderComponent={
                <>
                  {d.suggestedSurah && (
                    <SurahCard
                      surahId={d.suggestedSurah.id}
                      surahName={d.suggestedSurah.name}
                    />
                  )}
                  <Text style={styles.resultCount}>
                    {d.total} sonuç{d.total > d.results.length ? ` (ilk ${d.results.length})` : ""}
                  </Text>
                </>
              }
              ListFooterComponent={
                d.total > d.results.length ? (
                  <Text style={styles.moreHint}>
                    +{d.total - d.results.length} sonuç daha — aramayı daraltın
                  </Text>
                ) : null
              }
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              windowSize={5}
            />
          );
        }

        if (d.type === "tag") {
          const tv = state.status === "done" ? (state.tagVerses ?? []) : [];
          const tt = state.status === "done" ? (state.tagTotal  ?? d.count) : d.count;
          return (
            <FlatList
              data={tv}
              keyExtractor={(item) => item.verse_key}
              renderItem={renderTagVerseItem}
              ListHeaderComponent={
                <>
                  <TagCard tag={d.tag} count={d.count} />
                  {tv.length > 0 && (
                    <Text style={styles.resultCount}>
                      {tt} ayet{tt > tv.length ? ` (ilk ${tv.length})` : ""}
                    </Text>
                  )}
                </>
              }
              ListFooterComponent={
                tt > tv.length ? (
                  <Text style={styles.moreHint}>
                    +{tt - tv.length} ayet daha
                  </Text>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <ActivityIndicator size="small" color="#059669" />
                </View>
              }
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
            />
          );
        }

        // type === "none"
        return (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
            <Text style={styles.emptySub}>
              "{query.trim()}" için eşleşen sure, ayet veya tema yok.
            </Text>
          </View>
        );
      })()}

      {/* Boş durum: son aramalar + Keşfet tek ScrollView */}
      {!isLoading && query.length < MIN_Q && (
        <ScrollView contentContainerStyle={{ paddingBottom:32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Son aramalar */}
          {showRecent && (
            <View style={styles.recentWrap}>
              <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
                <Text style={styles.recentHeading}>Son aramalar</Text>
                <TouchableOpacity onPress={() => { setRecent([]); storage.setJSON(STORAGE_KEYS.recentSearches, []).catch(()=>{}); }} accessibilityRole="button" accessibilityLabel="Son aramaları temizle">
                  <Text style={{ fontSize:12, color:"#ef4444" }}>Temizle</Text>
                </TouchableOpacity>
              </View>
              {recent.map((r) => (
                <Pressable key={r} style={styles.recentRow} onPress={() => onRecentPress(r)} accessibilityRole="button" accessibilityLabel={`${r} aramasını tekrarla`}>
                  <Text style={styles.recentIcon}>🕐</Text>
                  <Text style={styles.recentText} numberOfLines={1}>{r}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Keşfet linki */}
          <TouchableOpacity
            style={styles.kesfetLink}
            onPress={() => router.push("/kesfet" as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Keşfet: dua kategorileri ve temalar"
          >
            <Text style={styles.kesfetLinkText}>🔍 Keşfet — Dua kategorileri ve temalar</Text>
            <Text style={{ color: "#059669" }}>›</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },

  bar: {
    flexDirection:     "row",
    alignItems:        "center",
    margin:            12,
    paddingHorizontal: 14,
    paddingVertical:   11,
    backgroundColor:   "#ffffff",
    borderRadius:      14,
    borderWidth:       1,
    borderColor:       "#e7e5e4",
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.05,
    shadowRadius:      4,
    elevation:         2,
    gap:               8,
  },
  searchEmoji: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: "#1c1917", padding: 0 },
  clearBtn:    { fontSize: 13, color: "#a8a29e", padding: 4 },

  hint: {
    fontSize: 12, color: "#a8a29e", textAlign: "center",
    paddingHorizontal: 24, marginBottom: 12, lineHeight: 18,
  },

  centered: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32,
  },
  loadingText: { fontSize: 14, color: "#78716c" },

  resultWrap: { paddingHorizontal: 12 },

  list:        { paddingHorizontal: 12, paddingBottom: 32 },
  resultCount: { fontSize: 12, color: "#a8a29e", marginTop: 8, marginBottom: 2, paddingLeft: 2 },

  card: {
    backgroundColor: "#ffffff",
    borderRadius:    14,
    padding:         14,
    borderWidth:     1,
    borderColor:     "#e7e5e4",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    3,
    elevation:       1,
    marginTop:       10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyBadge: {
    backgroundColor: "#d1fae5", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  keyText:    { fontSize: 11, fontWeight: "700", color: "#065f46" },
  surahLabel: { fontSize: 13, color: "#78716c", flex: 1 },
  mealText:   { fontSize: 14, lineHeight: 22, color: "#292524" },
  mealEmpty:  { fontSize: 14, color: "#a8a29e" },

  surahCard:  { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  tagCard:    { backgroundColor: "#fefce8", borderColor: "#fde047" },
  rowCenter:  { flexDirection: "row", alignItems: "center", gap: 12 },
  bigIcon:    { fontSize: 28 },
  resultTypeLabel: {
    fontSize: 11, fontWeight: "600", color: "#16a34a",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  resultName: { fontSize: 17, fontWeight: "700", color: "#14532d" },
  tagCount:   { fontSize: 12, color: "#a16207", marginTop: 2 },
  chevron:    { fontSize: 22, color: "#86efac" },

  moreHint: { textAlign: "center", fontSize: 12, color: "#a8a29e", paddingVertical: 14 },

  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#44403c" },
  emptySub:   { fontSize: 13, color: "#a8a29e", textAlign: "center", lineHeight: 20 },

  kesfetLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  kesfetLinkText: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  kesfetSection: {
    fontSize: 13, fontWeight: "700", color: "#78716c",
    textTransform: "uppercase", letterSpacing: 0.5,
    marginTop: 16, marginBottom: 8,
  },
  rehberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  rehberCard: {
    width: "47%", borderRadius: 14, padding: 16,
    alignItems: "center", gap: 6,
  },
  rehberLabel: { fontSize: 12, fontWeight: "600", color: "#1c1917", textAlign: "center" },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  moodLabel: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  kesfetRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#e7e5e4",
  },
  kesfetLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1c1917" },
  recentWrap:    { paddingHorizontal: 16, paddingTop: 4 },
  recentHeading: {
    fontSize: 12, fontWeight: "600", color: "#a8a29e",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  recentRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#f5f5f4",
  },
  recentIcon: { fontSize: 14, color: "#a8a29e" },
  recentText: { fontSize: 14, color: "#44403c", flex: 1 },
});
