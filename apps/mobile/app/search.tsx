import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, type SearchResponse, type VerseResult, type SuggestedSurah } from "../src/lib/api";
import { storage, STORAGE_KEYS } from "../src/lib/storage";

// ── Tip tanımlamaları ──────────────────────────────────────────────────────────

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: SearchResponse };

// ── Sabitler ───────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const MAX_RECENT = 5;
const RECENT_STORAGE_KEY = STORAGE_KEYS.recentSearches;

// ── Yardımcı fonksiyonlar ──────────────────────────────────────────────────────

/** verse_key (örn: "2:255") → { surahId, ayahNumber } */
function parseVerseKey(key: string): { surahId: number; ayahNumber: number } | null {
  const [surahStr, ayahStr] = key.split(":");
  const surahId = Number(surahStr);
  const ayahNumber = Number(ayahStr);
  if (!surahId || !ayahNumber || !Number.isFinite(surahId) || !Number.isFinite(ayahNumber)) return null;
  return { surahId, ayahNumber };
}

async function loadRecentSearches(): Promise<string[]> {
  try {
    return (await storage.getJSON<string[]>(RECENT_STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

async function saveRecentSearches(searches: string[]): Promise<void> {
  try {
    await storage.setJSON(RECENT_STORAGE_KEY, searches);
  } catch {
    /* depolama hatası sessizce yok sayılır */
  }
}

async function addToRecent(q: string, existing: string[]): Promise<string[]> {
  const cleaned = q.trim();
  if (!cleaned) return existing;
  const filtered = existing.filter((item) => item !== cleaned);
  const next = [cleaned, ...filtered].slice(0, MAX_RECENT);
  await saveRecentSearches(next);
  return next;
}

async function removeFromRecent(q: string, existing: string[]): Promise<string[]> {
  const next = existing.filter((item) => item !== q);
  await saveRecentSearches(next);
  return next;
}

// ── Alt bileşenler ─────────────────────────────────────────────────────────────

/** Sure sonucu kartı — tıklanınca /surah/[id] rotasına yönlendirir */
function SurahResultCard({ surahId, surahName }: { surahId: number; surahName: string }) {
  return (
    <TouchableOpacity
      style={[styles.resultCard, styles.surahCard]}
      onPress={() => {
        Keyboard.dismiss();
        router.push(`/surah/${surahId}`);
      }}
      activeOpacity={0.72}
    >
      <View style={styles.resultCardInner}>
        <View style={styles.iconCircle}>
          <Ionicons name="book" size={22} color="#059669" />
        </View>
        <View style={styles.resultCardBody}>
          <Text style={styles.resultTypeLabel}>Sure Bulundu</Text>
          <Text style={styles.resultTitle}>{surahName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#a8a29e" />
      </View>
    </TouchableOpacity>
  );
}

/** Tema (tag) sonucu kartı */
function TagResultCard({ tag, count }: { tag: string; count: number }) {
  return (
    <View style={[styles.resultCard, styles.tagCard]}>
      <View style={styles.resultCardInner}>
        <View style={[styles.iconCircle, styles.tagIconCircle]}>
          <Ionicons name="pricetag" size={20} color="#a16207" />
        </View>
        <View style={styles.resultCardBody}>
          <Text style={[styles.resultTypeLabel, styles.tagTypeLabel]}>Tema Bulundu</Text>
          <Text style={[styles.resultTitle, styles.tagTitle]}>{tag}</Text>
          <Text style={styles.tagCount}>{count} ayet içeriyor</Text>
        </View>
      </View>
    </View>
  );
}

/** Ayet sonucu kartı */
function VerseResultCard({
  verseKey,
  meal,
  surahName,
}: {
  verseKey: string;
  meal: string | null;
  surahName: string | null;
}) {
  const parsed = parseVerseKey(verseKey);
  const mealPreview = meal ? (meal.length > 140 ? meal.slice(0, 140) + "…" : meal) : null;

  return (
    <TouchableOpacity
      style={[styles.resultCard, styles.verseCard]}
      onPress={() => {
        if (!parsed) return;
        Keyboard.dismiss();
        router.push(`/ayah/${parsed.surahId}/${parsed.ayahNumber}`);
      }}
      activeOpacity={0.72}
    >
      <View style={styles.verseHeader}>
        <View style={styles.verseKeyBadge}>
          <Text style={styles.verseKeyText}>{verseKey}</Text>
        </View>
        {surahName ? (
          <Text style={styles.verseSurahLabel} numberOfLines={1}>
            {surahName}{parsed ? ` · ${parsed.ayahNumber}. Ayet` : ""}
          </Text>
        ) : null}
      </View>
      {mealPreview ? (
        <Text style={styles.verseMeal} numberOfLines={3}>
          {mealPreview}
        </Text>
      ) : (
        <Text style={styles.verseMealEmpty}>Meal bulunamadı</Text>
      )}
    </TouchableOpacity>
  );
}

/** Son arama satırı */
function RecentSearchRow({
  query,
  onPress,
  onDelete,
}: {
  query: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.recentRow}>
      <TouchableOpacity style={styles.recentTouchable} onPress={onPress} activeOpacity={0.65}>
        <Ionicons name="time-outline" size={16} color="#a8a29e" />
        <Text style={styles.recentText} numberOfLines={1}>
          {query}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.recentDeleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color="#a8a29e" />
      </TouchableOpacity>
    </View>
  );
}

// ── Ana arama ekranı ───────────────────────────────────────────────────────────

export default function SearchScreen() {
  // URL params: /search?q=xxx veya /search?tag=xxx
  const params = useLocalSearchParams<{ q?: string; tag?: string }>();
  const initialQuery = params.q ?? params.tag ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // URL parametresi değişince query'i güncelle
  useEffect(() => {
    const q = params.q ?? params.tag ?? "";
    if (q) setQuery(q);
  }, [params.q, params.tag]);

  // Başlangıçta AsyncStorage'dan son aramaları yükle
  useEffect(() => {
    loadRecentSearches().then(setRecentSearches);
  }, []);

  // Debounce: kullanıcı yazmayı bıraktıktan 400ms sonra arama yap
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await api.search.query(trimmed);
        setState({ status: "done", data });

        // Aramayı son aramalara ekle
        addToRecent(trimmed, recentSearches).then(setRecentSearches).catch(() => {});
      } catch {
        setState({ status: "done", data: { type: "none" } });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // ── Olay yöneticileri ──────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setQuery("");
    setState({ status: "idle" });
    inputRef.current?.focus();
  }, []);

  const handleRecentPress = useCallback((text: string) => {
    setQuery(text);
    // Imleci input sonuna konumlandırmak için odakla
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const handleRecentDelete = useCallback(async (text: string) => {
    setRecentSearches((prev) => prev.filter((item) => item !== text));
    removeFromRecent(text, recentSearches).then(setRecentSearches).catch(() => {});
  }, [recentSearches]);

  const handleSubmit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    setState({ status: "loading" });
    api.search
      .query(trimmed)
      .then((data) => {
        setState({ status: "done", data });
        addToRecent(trimmed, recentSearches).then(setRecentSearches).catch(() => {});
      })
      .catch(() => {
        setState({ status: "done", data: { type: "none" } });
      });
  }, [query]);

  // ── Render yardımcıları ────────────────────────────────────────────────────

  const showRecent = query.trim().length < MIN_QUERY_LENGTH && recentSearches.length > 0;
  const isLoading = state.status === "loading";
  const isDone = state.status === "done";
  const resultData = isDone ? state.data : null;

  /** Sonuç FlatList'ini render eder */
  const renderResultsList = useCallback(
    (verses: VerseResult[], total: number, suggestedSurah?: SuggestedSurah) => {
      const hasMore = total > verses.length;

      return (
        <FlatList
          data={verses}
          keyExtractor={(item) => item.verse_key}
          renderItem={({ item }) => (
            <VerseResultCard
              verseKey={item.verse_key}
              meal={item.meal}
              surahName={item.surah_name}
            />
          )}
          ListHeaderComponent={
            <>
              {suggestedSurah ? (
                <View style={styles.listHeaderSection}>
                  <SurahResultCard
                    surahId={suggestedSurah.id}
                    surahName={suggestedSurah.name}
                  />
                </View>
              ) : null}
              <View style={styles.listHeaderSection}>
                <Text style={styles.resultCountText}>
                  {total} sonuç{hasMore ? ` (ilk ${verses.length} gösteriliyor)` : ""}
                </Text>
              </View>
            </>
          }
          ListFooterComponent={
            hasMore ? (
              <Text style={styles.moreResultsHint}>
                +{total - verses.length} sonuç daha — aramanızı daraltın
              </Text>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          initialNumToRender={12}
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      );
    },
    [],
  );

  // ── Ana render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* ── Arama Çubuğu ── */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#a8a29e" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Sure, ayet veya kelime ara…"
            placeholderTextColor="#a8a29e"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            selectionColor="#059669"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#78716c" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── İpucu metni ── */}
      {query.trim().length === 0 ? (
        <Text style={styles.hintText}>
          Sure adı · ayet metninden kelime · tema etiketi (sabır, namaz, vb.)
        </Text>
      ) : null}

      {/* ── Yükleniyor göstergesi ── */}
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Aranıyor…</Text>
        </View>
      ) : null}

      {/* ── Sonuçlar ── */}
      {isDone && resultData && !isLoading ? (
        (() => {
          switch (resultData.type) {
            case "surah":
              return (
                <View style={styles.singleResultWrap}>
                  <View style={styles.searchResultHeader}>
                    <Text style={styles.searchQueryLabel}>
                      "{query.trim()}" için sonuç:
                    </Text>
                  </View>
                  <SurahResultCard
                    surahId={resultData.surahId}
                    surahName={resultData.surahName}
                  />
                </View>
              );

            case "tag":
              return (
                <View style={styles.singleResultWrap}>
                  <View style={styles.searchResultHeader}>
                    <Text style={styles.searchQueryLabel}>
                      "{query.trim()}" için sonuç:
                    </Text>
                  </View>
                  <TagResultCard tag={resultData.tag} count={resultData.count} />
                </View>
              );

            case "verses":
              return (
                <View style={styles.versesContainer}>
                  <View style={styles.searchResultHeader}>
                    <Text style={styles.searchQueryLabel}>
                      "{query.trim()}" için sonuçlar:
                    </Text>
                  </View>
                  {renderResultsList(
                    resultData.results,
                    resultData.total,
                    resultData.suggestedSurah,
                  )}
                </View>
              );

            case "none":
            default:
              return (
                <View style={styles.centeredState}>
                  <Ionicons name="search-outline" size={48} color="#d6d3d1" />
                  <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
                  <Text style={styles.emptySubtitle}>
                    "{query.trim()}" için eşleşen sure, ayet veya tema bulunamadı.
                  </Text>
                </View>
              );
          }
        })()
      ) : null}

      {/* ── Son Aramalar ── */}
      {showRecent && !isLoading ? (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentSectionTitle}>Son Aramalar</Text>
            <TouchableOpacity
              onPress={() => {
                setRecentSearches([]);
                storage.setJSON(RECENT_STORAGE_KEY, []).catch(() => {});
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearAllText}>Temizle</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((item) => (
            <RecentSearchRow
              key={item}
              query={item}
              onPress={() => handleRecentPress(item)}
              onDelete={() => handleRecentDelete(item)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Stiller ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Ana yapı ──
  screen: {
    flex: 1,
    backgroundColor: "#f7f1e4",
  },

  // ── Arama çubuğu ──
  searchBarContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    paddingHorizontal: 14,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1c1917",
    paddingVertical: 10,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },

  // ── İpucu ──
  hintText: {
    fontSize: 12,
    color: "#a8a29e",
    textAlign: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 18,
  },

  // ── Merkezi durum ──
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#78716c",
    marginTop: 4,
  },

  // ── Sonuç başlığı ──
  searchResultHeader: {
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  searchQueryLabel: {
    fontSize: 13,
    color: "#78716c",
    fontWeight: "500",
  },

  // ── Tekil sonuç wrap ──
  singleResultWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },

  // ── Ayetler konteyner ──
  versesContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },

  // ── Sonuç kartları (ortak) ──
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  resultCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  resultCardBody: {
    flex: 1,
    gap: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  tagIconCircle: {
    backgroundColor: "#fef9c3",
  },
  resultTypeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tagTypeLabel: {
    color: "#a16207",
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1c1917",
  },
  tagTitle: {
    color: "#713f12",
  },
  tagCount: {
    fontSize: 12,
    color: "#a16207",
    marginTop: 1,
  },

  // ── Sure kartı özel ──
  surahCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    marginTop: 10,
  },

  // ── Tag kartı özel ──
  tagCard: {
    backgroundColor: "#fefce8",
    borderColor: "#fef08a",
    marginTop: 10,
  },

  // ── Ayet kartı ──
  verseCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e7e5e4",
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  verseKeyBadge: {
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verseKeyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065f46",
  },
  verseSurahLabel: {
    fontSize: 13,
    color: "#78716c",
    flex: 1,
  },
  verseMeal: {
    fontSize: 14,
    lineHeight: 22,
    color: "#292524",
  },
  verseMealEmpty: {
    fontSize: 14,
    color: "#a8a29e",
    fontStyle: "italic",
  },

  // ── Ayet listesi ──
  listContent: {
    paddingBottom: 32,
  },
  listHeaderSection: {
    marginBottom: 4,
  },
  listSeparator: {
    height: 0,
  },
  resultCountText: {
    fontSize: 12,
    color: "#a8a29e",
    paddingTop: 8,
    paddingBottom: 4,
    paddingLeft: 2,
  },
  moreResultsHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#a8a29e",
    paddingVertical: 16,
  },

  // ── Boş sonuç ──
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#44403c",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#a8a29e",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── Son Aramalar ──
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  clearAllText: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "500",
  },
  recentSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    flex: 1,
  },
  recentSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a8a29e",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 2,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0ede8",
  },
  recentTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  recentText: {
    fontSize: 14,
    color: "#44403c",
    flex: 1,
  },
  recentDeleteBtn: {
    padding: 8,
  },
});