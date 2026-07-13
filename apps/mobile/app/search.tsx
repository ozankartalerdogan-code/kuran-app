import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Keyboard, Platform,
} from "react-native";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, prefetchAyah, type SearchResponse, type TagFilterResult } from "../src/lib/api";
import { storage, STORAGE_KEYS } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";
import { logFeature, AnalyticsEvents } from "../src/lib/analytics";
import { parseDirectAyahQuery } from "../src/lib/ayahRefs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";

// ── Tipler ────────────────────────────────────────────────────────────────────

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: SearchResponse }
  | { status: "direct"; surahId: number; ayahNumber: number }
  | { status: "tag_results"; tag: string; results: TagFilterResult[]; total: number; page: number; pages: number };

type IdleItem =
  | { kind: "hint"; key: string }
  | { kind: "chip_section"; key: string; title: string; chips: { tag: string; label: string }[]; color: { bg: string; border: string; text: string } }
  | { kind: "recent_header"; key: string }
  | { kind: "recent_row"; key: string; item: string };

// ── Sabitler ──────────────────────────────────────────────────────────────────

const DEBOUNCE_MS   = 400;
const MIN_LEN       = 2;
const MAX_RECENT    = 5;

// ── Veri ─────────────────────────────────────────────────────────────────────

const NAMAZ_CHIPS = [
  { tag: "namaz-genel",    label: "Genel" },
  { tag: "namaz-vakit",    label: "Vakit" },
  { tag: "namaz-husu",     label: "Huşu" },
  { tag: "namaz-teheccud", label: "Teheccüd" },
  { tag: "namaz-cuma",     label: "Cuma" },
  { tag: "namaz-abdest",   label: "Abdest" },
  { tag: "namaz-korku",    label: "Korku Namazı" },
  { tag: "namaz-sefer",    label: "Sefer" },
];

const KORUNMA_CHIPS = [
  { tag: "korunma-genel",   label: "Genel Korunma" },
  { tag: "korunma-sihir",   label: "Büyü / Sihir" },
  { tag: "korunma-nazar",   label: "Nazar" },
  { tag: "korunma-hased",   label: "Hased" },
  { tag: "korunma-siginma", label: "Sığınma" },
  { tag: "korunma-sifa",    label: "Şifa" },
];

const ISMIAZAM_CHIPS = [
  { tag: "ismiazam-ayet",   label: "İsmi Azam Ayetleri" },
  { tag: "ismiazam-sekine", label: "Sekine Duası" },
];

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function parseVerseKey(key: string) {
  const [s, a] = key.split(":").map(Number);
  return s && a ? { surahId: s, ayahNumber: a } : null;
}

function tagLabel(tag: string): string {
  if (tag.startsWith("namaz-"))    return `Namaz · ${NAMAZ_CHIPS.find(c => c.tag === tag)?.label ?? tag.slice(6)}`;
  if (tag.startsWith("korunma-"))  return `Korunma · ${KORUNMA_CHIPS.find(c => c.tag === tag)?.label ?? tag.slice(8)}`;
  if (tag.startsWith("ismiazam-")) return `İsmi Azam · ${ISMIAZAM_CHIPS.find(c => c.tag === tag)?.label ?? tag.slice(9)}`;
  if (tag.startsWith("dua-"))      return `Dua · ${tag.slice(4)}`;
  const parts = tag.replace(/_%$/, "").split("_");
  return parts.length >= 2 ? `${parts[0]} · ${parts.slice(1).join(" ").toLocaleLowerCase("tr-TR")}` : tag;
}

async function loadRecent(): Promise<string[]> {
  try { return (await storage.getJSON<string[]>(STORAGE_KEYS.recentSearches)) ?? []; }
  catch { return []; }
}
async function saveRecent(list: string[]) {
  try { await storage.setJSON(STORAGE_KEYS.recentSearches, list); } catch { /* ignore */ }
}

// ── Bileşenler ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  const c = useColors();
  return <View style={[sk.card, { backgroundColor: c.isDark ? c.cardAlt : "#e7dfcc" }]} />;
}

function ChipRow({ chips, color, onPress }: {
  chips: { tag: string; label: string }[];
  color: { bg: string; border: string; text: string };
  onPress: (tag: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {chips.map(c => (
        <TouchableOpacity
          key={c.tag}
          style={[styles.chip, { backgroundColor: color.bg, borderColor: color.border }]}
          onPress={() => onPress(c.tag)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={c.label}
        >
          <Text style={[styles.chipText, { color: color.text }]}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SurahCard({ surahId, surahName }: { surahId: number; surahName: string }) {
  const c = useColors();
  return (
    <TouchableOpacity style={[styles.resultCard, styles.surahCard, c.isDark && { backgroundColor: "#052e16", borderColor: "#166534" }]}
      onPress={() => { Keyboard.dismiss(); router.push(`/surah/${surahId}`); }} activeOpacity={0.72}
      accessibilityRole="button" accessibilityLabel={`${surahName} suresini aç`}>
      <View style={styles.cardInner}>
        <View style={[styles.iconCircle, c.isDark && { backgroundColor: "#064e3b" }]}>
          <Ionicons name="book" size={22} color={c.accent} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.typeLabel, { color: c.accent }]}>Sure Bulundu</Text>
          <Text style={[styles.cardTitle, { color: c.text }]}>{surahName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function DirectAyahCard({ surahId, ayahNumber }: { surahId: number; ayahNumber: number }) {
  const c = useColors();
  return (
    <TouchableOpacity style={[styles.resultCard, styles.surahCard, c.isDark && { backgroundColor: "#052e16", borderColor: "#166534" }]}
      onPressIn={() => prefetchAyah(surahId, ayahNumber)}
      onPress={() => { Keyboard.dismiss(); router.push(`/ayah/${surahId}/${ayahNumber}`); }} activeOpacity={0.72}
      accessibilityRole="button" accessibilityLabel={`${surahId}:${ayahNumber} ayetini aç`}>
      <View style={styles.cardInner}>
        <View style={[styles.iconCircle, c.isDark && { backgroundColor: "#064e3b" }]}>
          <Ionicons name="navigate" size={20} color={c.accent} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.typeLabel, { color: c.accent }]}>Ayete Git</Text>
          <Text style={[styles.cardTitle, { color: c.text }]}>{surahId}. Sure · {ayahNumber}. Ayet</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function TagCard({ tag, count }: { tag: string; count: number }) {
  const c = useColors();
  const amber = c.isDark ? "#fcd34d" : "#a16207";
  return (
    <View style={[styles.resultCard, styles.tagCard, c.isDark && { backgroundColor: "#422006", borderColor: "#713f12" }]}>
      <View style={styles.cardInner}>
        <View style={[styles.iconCircle, { backgroundColor: c.isDark ? "#451a03" : "#fef9c3" }]}>
          <Ionicons name="pricetag" size={20} color={amber} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.typeLabel, { color: amber }]}>Tema Bulundu</Text>
          <Text style={[styles.cardTitle, { color: c.isDark ? "#fde68a" : "#713f12" }]}>{tag}</Text>
          <Text style={[styles.tagCount, { color: amber }]}>{count} ayet içeriyor</Text>
        </View>
      </View>
    </View>
  );
}

function VerseCard({ verseKey, meal, surahName, readingTr }: {
  verseKey: string; meal: string | null; surahName: string | null; readingTr?: string | null;
}) {
  const c = useColors();
  const parsed = parseVerseKey(verseKey);
  return (
    <TouchableOpacity
      style={[styles.resultCard, { backgroundColor: c.card, borderColor: c.border }]}
      onPressIn={() => { if (parsed) prefetchAyah(parsed.surahId, parsed.ayahNumber); }}
      onPress={() => { if (!parsed) return; Keyboard.dismiss(); router.push(`/ayah/${parsed.surahId}/${parsed.ayahNumber}`); }}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`${surahName ?? verseKey}, ayeti aç`}
    >
      <View style={styles.verseHeader}>
        <View style={[styles.keyBadge, { backgroundColor: c.accentLight }]}><Text style={[styles.keyText, { color: c.accent }]}>{verseKey}</Text></View>
        {surahName ? <Text style={[styles.surahLabel, { color: c.textMuted }]} numberOfLines={1}>{surahName}{parsed ? ` · ${parsed.ayahNumber}. Ayet` : ""}</Text> : null}
      </View>
      {readingTr ? <Text style={[styles.reading, { color: c.text }]} numberOfLines={2}>{readingTr}</Text> : null}
      {meal
        ? <Text style={[styles.meal, { color: c.textSecondary }]} numberOfLines={3}>{meal.length > 140 ? meal.slice(0, 140) + "…" : meal}</Text>
        : <Text style={[styles.mealEmpty, { color: c.textMuted }]}>Meal bulunamadı</Text>}
    </TouchableOpacity>
  );
}

function Pagination({ page, pages, onPrev, onNext }: { page: number; pages: number; onPrev: () => void; onNext: () => void }) {
  const c = useColors();
  if (pages <= 1) return null;
  return (
    <View style={styles.pagination}>
      <TouchableOpacity style={[styles.pageBtn, { backgroundColor: c.card, borderColor: c.border }, page <= 1 && styles.pageBtnOff]} onPress={onPrev} disabled={page <= 1} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Önceki sayfa" accessibilityState={{ disabled: page <= 1 }}>
        <Text style={[styles.pageBtnText, { color: page <= 1 ? c.textMuted : c.accent }]}>← Önceki</Text>
      </TouchableOpacity>
      <Text style={[styles.pageInfo, { color: c.textMuted }]}>{page} / {pages}</Text>
      <TouchableOpacity style={[styles.pageBtn, { backgroundColor: c.card, borderColor: c.border }, page >= pages && styles.pageBtnOff]} onPress={onNext} disabled={page >= pages} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sonraki sayfa" accessibilityState={{ disabled: page >= pages }}>
        <Text style={[styles.pageBtnText, { color: page >= pages ? c.textMuted : c.accent }]}>Sonraki →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; tag?: string; page?: string; type?: string }>();
  const initialQuery = params.q ?? params.tag ?? "";

  const [query,        setQuery]   = useState(initialQuery);
  const [state,        setState]   = useState<SearchState>({ status: "idle" });
  const [recent,       setRecent]  = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<TextInput>(null);

  // Son aramaları yükle
  useEffect(() => { loadRecent().then(setRecent); }, []);

  const fetchTagResults = useCallback(async (tag: string, page: number) => {
    setState({ status: "loading" });
    try {
      const res = await api.tags.filter(tag, page);
      setState({ status: "tag_results", tag, results: res.results, total: res.total, page: res.page, pages: res.pages });
    } catch {
      setState({ status: "error", message: "Etiket sonuçları yüklenemedi." });
    }
  }, []);

  // URL'den tag gelirse direkt tag filter çağır
  useEffect(() => {
    if (params.type === 'tag' && params.q) {
      const page = parseInt(params.page ?? "1", 10) || 1;
      fetchTagResults(params.q, page);
      setQuery(params.q);
    } else if (params.tag) {
      const page = parseInt(params.page ?? "1", 10) || 1;
      fetchTagResults(params.tag, page);
      setQuery(params.tag);
    } else if (params.q) {
      setQuery(params.q);
    }
  }, [params.type, params.tag, params.q, params.page, fetchTagResults]);

  // Debounce metin araması
  useEffect(() => {
    if (params.tag || params.type === 'tag') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < MIN_LEN) { setState({ status: "idle" }); return; }

    setState({ status: "loading" });
    debounceRef.current = setTimeout(async () => {
      // "2:255" / "2/255" gibi doğrudan ayet referansı → yönlendirme YOK, "Ayete
      // Git" kartı gösterilir. (Anında yönlendirme "2:2"de tetiklenip 2:25/2:255'e
      // yazarak ulaşmayı imkânsız kılıyordu; Enter ise handleSubmit'te direkt gider.)
      const directRef = parseDirectAyahQuery(trimmed);
      if (directRef) {
        setState({ status: "direct", surahId: directRef.surahId, ayahNumber: directRef.ayahNumber });
        return;
      }
      try {
        const data = await api.search.query(trimmed);
        setState({ status: "done", data });
        // Kullanıcının yazdığı arama metni analytics'e gönderilmez — yalnızca
        // özelliğin kullanıldığı işaretlenir (privacy sayfasıyla uyumlu).
        logFeature(AnalyticsEvents.ARAMA);
        // Fonksiyonel güncelleme: setTimeout içinde bayat `recent` closure'ı
        // yerine güncel listeyi kullan (hızlı arka arkaya aramalarda kayıp olmaz).
        setRecent(prev => {
          const next = [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, MAX_RECENT);
          saveRecent(next);
          return next;
        });
      } catch {
        setState({ status: "error", message: "Arama sırasında hata oluştu." });
      }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, params.tag, params.type]);

  const handleClear = useCallback(() => {
    setQuery("");
    setState({ status: "idle" });
    router.setParams({ tag: undefined, q: undefined, page: undefined, type: undefined });
    inputRef.current?.focus();
  }, []);

  const handleTagChip = useCallback((tag: string) => {
    Keyboard.dismiss();
    router.push(`/search?tag=${encodeURIComponent(tag)}` as Href);
  }, []);

  const handleSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < MIN_LEN) return;

    const directRef = parseDirectAyahQuery(trimmed);
    if (directRef) {
      Keyboard.dismiss();
      router.push(`/ayah/${directRef.surahId}/${directRef.ayahNumber}`);
      return;
    }

    setState({ status: "loading" });
    api.search.query(trimmed)
      .then(data => { setState({ status: "done", data }); })
      .catch(() => setState({ status: "error", message: "Arama başarısız." }));
  }, [query]);

  // Hata kutusundaki "Tekrar Dene" — son denenen işlemi (etiket filtresi ya da
  // metin araması) parametrelere bakarak yineler.
  const handleRetryError = useCallback(() => {
    const page = parseInt(params.page ?? "1", 10) || 1;
    if (params.type === "tag" && params.q) fetchTagResults(params.q, page);
    else if (params.tag) fetchTagResults(params.tag, page);
    else handleSubmit();
  }, [params.type, params.q, params.tag, params.page, fetchTagResults, handleSubmit]);

  const handlePageChange = useCallback((newPage: number) => {
    if (params.type === 'tag' && params.q) {
      router.push(`/search?q=${encodeURIComponent(params.q)}&type=tag&page=${newPage}` as Href);
    } else if (params.tag) {
      router.push(`/search?tag=${encodeURIComponent(params.tag)}&page=${newPage}` as Href);
    }
  }, [params.type, params.q, params.tag]);

  const showIdle = state.status === "idle" && query.trim().length < MIN_LEN;
  const isLoading = state.status === "loading";

  // Idle ekran FlatList verisi — yalnız etiket grupları + son aramalar
  // (özel koleksiyon kartları kaldırıldı; aynı sayfalara "Daha Fazla"dan ulaşılıyor)
  const idleItems = useMemo<IdleItem[]>(() => {
    const items: IdleItem[] = [];
    items.push({ kind: "hint", key: "hint" });
    items.push({ kind: "chip_section", key: "st_namaz", title: "🕌 Namaz Etiketleri", chips: NAMAZ_CHIPS,
      color: c.isDark ? { bg: "#042f2e", border: "#115e59", text: "#5eead4" } : { bg: "#f0fdfa", border: "#5eead4", text: "#0d9488" } });
    items.push({ kind: "chip_section", key: "st_korunma", title: "🛡️ Korunma Etiketleri", chips: KORUNMA_CHIPS,
      color: c.isDark ? { bg: "#1e1b4b", border: "#3730a3", text: "#a5b4fc" } : { bg: "#eef2ff", border: "#a5b4fc", text: "#4338ca" } });
    items.push({ kind: "chip_section", key: "st_ismiazam", title: "✨ İsmi Azam Etiketleri", chips: ISMIAZAM_CHIPS,
      color: c.isDark ? { bg: "#422006", border: "#713f12", text: "#fcd34d" } : { bg: "#fefce8", border: "#fde047", text: "#a16207" } });
    if (recent.length > 0) {
      items.push({ kind: "recent_header", key: "recent_hdr" });
      recent.forEach((r, i) => items.push({ kind: "recent_row", key: `recent_${i}`, item: r }));
    }
    return items;
  }, [recent, c.isDark]);

  const renderIdleItem = useCallback(({ item }: { item: IdleItem }) => {
    switch (item.kind) {
      case "hint":
        return <Text style={[styles.hint, { color: c.textMuted }]}>Sure adı · ayet metni · tema kodu (A1, F1) · etiket (sabır, namaz)</Text>;
      case "chip_section":
        return (
          <View>
            <Text style={[styles.idleSection, { color: c.textMuted }]}>{item.title}</Text>
            <ChipRow chips={item.chips} color={item.color} onPress={handleTagChip} />
          </View>
        );
      case "recent_header":
        return (
          <View style={styles.recentHeader}>
            <Text style={[styles.idleSection, { color: c.textMuted }]}>Son Aramalar</Text>
            <TouchableOpacity onPress={() => { setRecent([]); saveRecent([]); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Son aramaları temizle">
              <Text style={styles.recentClear}>Temizle</Text>
            </TouchableOpacity>
          </View>
        );
      case "recent_row":
        return (
          <TouchableOpacity
            style={[styles.recentRow, { borderBottomColor: c.border }]}
            onPress={() => setQuery(item.item)}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={`${item.item} aramasını tekrarla`}
          >
            <Ionicons name="time-outline" size={16} color={c.textMuted} />
            <Text style={[styles.recentText, { color: c.textSecondary }]} numberOfLines={1}>{item.item}</Text>
            <TouchableOpacity
              onPress={() => {
                const next = recent.filter(r => r !== item.item);
                setRecent(next); saveRecent(next);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${item.item} aramasını sil`}
            >
              <Ionicons name="close" size={16} color={c.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  }, [handleTagChip, recent, c]);

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.centerWrap}>
      {/* Arama çubuğu */}
      <View style={styles.barWrap}>
        <View style={[styles.bar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.text }]}
            value={query}
            onChangeText={t => { setQuery(t); router.setParams({ tag: undefined, type: undefined }); }}
            placeholder="Sure, ayet veya kelime ara…"
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={c.accent}
            // Ana sayfadaki arama çubuğu sahte (dokununca buraya gelir) — burada
            // klavye kendiliğinden açılsın. Etiket/sorgu parametresiyle gelişte
            // (sonuçlar zaten görünecek) klavye açılmaz.
            autoFocus={!initialQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Aktif filtre göstergesi */}
      {state.status === "tag_results" && (
        <View style={styles.filterBar}>
          <View style={[styles.filterBadge, c.isDark && { backgroundColor: "#1e1b4b", borderColor: "#3730a3" }]}>
            <Text style={[styles.filterText, c.isDark && { color: "#a5b4fc" }]}>{tagLabel(state.tag)} — {state.total} ayet</Text>
          </View>
          <TouchableOpacity onPress={handleClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Filtreyi kaldır">
            <Text style={styles.filterClear}>Filtreyi Kaldır</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Yükleniyor skeleton */}
      {isLoading && (
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(i) => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Hata */}
      {state.status === "error" && !isLoading && (
        <View style={[styles.errorBox, c.isDark && { backgroundColor: "#450a0a", borderColor: "#7f1d1d" }]}>
          <Ionicons name="alert-circle-outline" size={18} color={c.isDark ? "#fca5a5" : "#dc2626"} />
          <Text style={[styles.errorText, c.isDark && { color: "#fca5a5" }]}>{state.message}</Text>
          <TouchableOpacity onPress={handleRetryError} hitSlop={8} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Tekrar dene">
            <Text style={[styles.errorRetry, { color: c.accent }]}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Doğrudan ayet referansı ("2:255") */}
      {state.status === "direct" && !isLoading && (
        <View style={styles.singleWrap}>
          <Text style={[styles.queryLabel, { color: c.textMuted }]}>"{query.trim()}" için sonuç:</Text>
          <DirectAyahCard surahId={state.surahId} ayahNumber={state.ayahNumber} />
        </View>
      )}

      {/* Tag sonuçları */}
      {state.status === "tag_results" && !isLoading && (
        <FlatList
          data={state.results}
          keyExtractor={item => item.verse_key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <VerseCard
              verseKey={item.verse_key}
              meal={item.meal}
              surahName={item.surah_name}
              readingTr={item.reading_tr}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={
            <Pagination
              page={state.page}
              pages={state.pages}
              onPrev={() => handlePageChange(state.page - 1)}
              onNext={() => handlePageChange(state.page + 1)}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Metin arama sonuçları */}
      {state.status === "done" && !isLoading && (() => {
        const d = state.data;
        if (d.type === "surah") return (
          <View style={styles.singleWrap}>
            <Text style={[styles.queryLabel, { color: c.textMuted }]}>"{query.trim()}" için sonuç:</Text>
            <SurahCard surahId={d.surahId} surahName={d.surahName} />
          </View>
        );
        if (d.type === "tag") return (
          <View style={styles.singleWrap}>
            <Text style={[styles.queryLabel, { color: c.textMuted }]}>"{query.trim()}" için sonuç:</Text>
            <TagCard tag={d.tag} count={d.count} />
          </View>
        );
        if (d.type === "verses") return (
          <FlatList
            data={d.results}
            keyExtractor={item => item.verse_key}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <VerseCard verseKey={item.verse_key} meal={item.meal} surahName={item.surah_name} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={
              <View style={{ marginBottom: 8 }}>
                {d.suggestedSurah && (
                  <TouchableOpacity
                    style={[styles.suggestionBox, c.isDark && { backgroundColor: "#422006", borderColor: "#713f12" }]}
                    onPress={() => { const s = d.suggestedSurah; if (s) router.push(`/surah/${s.id}`); }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.suggestedSurah.name} suresini aç`}
                  >
                    <Text style={[styles.suggestionText, c.isDark && { color: "#fde68a" }]}>Bunu mu demek istediniz? </Text>
                    <Text style={[styles.suggestionLink, c.isDark && { color: "#fbbf24" }]}>{d.suggestedSurah.name} Suresi →</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.queryLabel, { color: c.textMuted }]}>"{query.trim()}" için {d.total} sonuç{d.total > d.results.length ? ` (ilk ${d.results.length})` : ""}</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        );
        return (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={48} color={c.border} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>Sonuç bulunamadı</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>"{query.trim()}" için eşleşen bir şey bulunamadı.</Text>
          </View>
        );
      })()}

      {/* Boş durum */}
      {showIdle && !isLoading && (
        <FlatList
          data={idleItems}
          keyExtractor={(item) => item.key}
          renderItem={renderIdleItem}
          contentContainerStyle={styles.idleContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}
      </View>
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#f5f0e8" },
  centerWrap: { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  barWrap:  { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  bar:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fffdf6", borderRadius: 16, borderWidth: 1, borderColor: "#e7dfcc", paddingHorizontal: 14, paddingVertical: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  input:    { flex: 1, fontSize: 16, color: "#1c1917", paddingVertical: 10 },

  filterBar:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  filterBadge: { flex: 1, backgroundColor: "#eef2ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#a5b4fc" },
  filterText:  { fontSize: 12, fontWeight: "600", color: "#4338ca" },
  filterClear: { fontSize: 12, color: "#ef4444", fontWeight: "600" },

  errorBox:  { flexDirection: "row", alignItems: "center", gap: 8, margin: 14, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fecaca" },
  errorText: { fontSize: 13, color: "#dc2626", flex: 1 },
  errorRetry:{ fontSize: 13, fontWeight: "700" },

  listContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32 },
  singleWrap:  { padding: 14 },
  queryLabel:  { fontSize: 12, color: "#a8a29e", marginBottom: 6, paddingLeft: 2 },

  resultCard: { backgroundColor: "#fffdf6", borderRadius: 14, borderWidth: 1, borderColor: "#e7dfcc", padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  surahCard:  { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  tagCard:    { backgroundColor: "#fefce8", borderColor: "#fef08a" },
  cardInner:  { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center" },
  cardBody:   { flex: 1, gap: 2 },
  typeLabel:  { fontSize: 10, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.6 },
  cardTitle:  { fontSize: 17, fontWeight: "700", color: "#1c1917" },
  tagCount:   { fontSize: 12, color: "#a16207", marginTop: 1 },

  verseHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  keyBadge:    { backgroundColor: "#d1fae5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  keyText:     { fontSize: 11, fontWeight: "700", color: "#065f46" },
  surahLabel:  { fontSize: 13, color: "#78716c", flex: 1 },
  reading:     { fontSize: 13, color: "#1c1917", fontStyle: "italic", lineHeight: 20, marginBottom: 4 },
  meal:        { fontSize: 14, lineHeight: 22, color: "#292524" },
  mealEmpty:   { fontSize: 14, color: "#a8a29e", fontStyle: "italic" },

  suggestionBox:  { flexDirection: "row", alignItems: "center", flexWrap: "wrap", backgroundColor: "#fffbeb", borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#fde68a" },
  suggestionText: { fontSize: 13, color: "#92400e" },
  suggestionLink: { fontSize: 13, fontWeight: "700", color: "#b45309" },

  pagination:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  pageBtn:       { backgroundColor: "#fffdf6", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: "#e7dfcc" },
  pageBtnOff:    { opacity: 0.4 },
  pageBtnText:   { fontSize: 13, fontWeight: "600", color: "#059669" },
  pageInfo:      { fontSize: 13, color: "#78716c" },

  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#44403c" },
  emptySub:   { fontSize: 13, color: "#a8a29e", textAlign: "center", lineHeight: 20 },

  idleContent: { padding: 14, paddingBottom: 40 },
  hint:        { fontSize: 12, color: "#a8a29e", textAlign: "center", marginBottom: 16, lineHeight: 18 },
  idleSection: { fontSize: 11, fontWeight: "700", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:    { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText:{ fontSize: 12, fontWeight: "600" },

  recentHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recentClear: { fontSize: 12, color: "#ef4444", fontWeight: "600" },
  recentRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0ede8" },
  recentText:  { flex: 1, fontSize: 14, color: "#44403c" },
});

const sk = StyleSheet.create({
  card: { height: 90, backgroundColor: "#e7dfcc", borderRadius: 14, opacity: 0.5 },
});