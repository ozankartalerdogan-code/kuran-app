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

import { useMealOf, getEnglishMealTable } from "../src/lib/englishMeal";
import { searchMealTable } from "../src/lib/mealLookup";
import { getLang, getStrings, useLang, useStrings, fmt, caps } from "../src/i18n";
import { localizedVerseTranslit } from "../src/lib/verseTranslitEn";
import searchStrings from "../src/i18n/strings/search";
import tagStrings from "../src/i18n/strings/tagLabels";
import { useSurahNameOf, localizedSurahName } from "../src/lib/surahNames";
import { getThemeTitle, hasThemeTitle, resolveThemeCode, THEME_TAGS_ENABLED, TAXONOMY_IS_PLACEHOLDER } from "../src/lib/themes";
import { Badge, Button, Callout, radius, space, toneColors } from "../src/components/ui";
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
const MAX_EN_HITS   = 50;

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
  { tag: "ismiazam-ayet",   label: "İsm-i Azam Ayetleri" },
  { tag: "ismiazam-sekine", label: "Sekine Duası" },
];

const NETWORK_MSG_RE = /network request failed|failed to fetch|networkerror|network error|load failed|offline|internet|timed out|timeout|zaman aşımı|econnrefused|enotfound|enetunreach|err_network/i;
const NETWORK_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "ENETUNREACH", "ECONNRESET", "ETIMEDOUT", "ERR_NETWORK"]);

function isNetworkError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { name?: unknown; message?: unknown; status?: unknown; code?: unknown };
    if (e.name === "ApiError") return e.status === 408;
    if (e.name === "AbortError" || e.name === "TimeoutError") return true;
    // TypeError tek başına ağ hatası sayılmaz (kod hatası da olabilir); RN'de
    // ağ kopukluğu "Network request failed" mesajıyla gelir → aşağıdaki desen yakalar.
    if (typeof e.code === "string" && NETWORK_CODES.has(e.code)) return true;
    if (typeof e.message === "string" && NETWORK_MSG_RE.test(e.message)) return true;
  }
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function searchErrorMessage(err: unknown, fallbackKey: "searchError" | "searchFailed" | "tagError"): string {
  const s = getStrings(searchStrings);
  return isNetworkError(err) ? s.networkError : s[fallbackKey];
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function parseVerseKey(key: string) {
  const [s, a] = key.split(":").map(Number);
  return s && a ? { surahId: s, ayahNumber: a } : null;
}

function chipText(tag: string, trLabel: string, s: Record<string, string>): string {
  return s[tag] ?? (trLabel || getThemeTitle(tag, getLang()));
}

// İngilizce modda eşlemesi olmayan etiket null döner (Türkçe göstermemek için gizlenir).
function tagLabel(tag: string): string | null {
  const s = getStrings(tagStrings) as Record<string, string>;
  const en = getLang() === "en";
  const groups: [string, string, { tag: string }[]][] = [
    ["namaz-", s.namaz, NAMAZ_CHIPS], ["korunma-", s.korunma, KORUNMA_CHIPS], ["ismiazam-", s.ismiazam, ISMIAZAM_CHIPS],
  ];
  for (const [prefix, title, chips] of groups) {
    if (!tag.startsWith(prefix)) continue;
    if (chips.some(c => c.tag === tag)) return `${title} · ${chipText(tag, "", s)}`;
    return en ? null : `${title} · ${tag.slice(prefix.length)}`;
  }
  // Tema taksonomisi (level1/level2; eski kodlar migration ile eşlenir). İngilizcede
  // yalnız gerçek (EN başlıklı) taksonomi varsa ya da geliştirme bayrağı açıkken.
  const known = hasThemeTitle(tag);
  if (en && !(known && (!TAXONOMY_IS_PLACEHOLDER || THEME_TAGS_ENABLED))) return null;
  if (!known && tag.startsWith("dua-")) return `Dua · ${getThemeTitle(tag.slice(4), "tr")}`;
  // Silinmiş eski kod: yine okunur yedek başlık (ham kod gösterilmez).
  return getThemeTitle(resolveThemeCode(tag) ?? tag, en ? "en" : "tr");
}

// İngilizce modda sunucu aramasına ek olarak gömülü Pickthall tablosunda ara
// (sunucu araması yalnız Türkçe). Türkçe modda hiç çalışmaz.
function localEnglishHits(q: string): string[] {
  return getLang() === "en" ? searchMealTable(getEnglishMealTable(), q, MAX_EN_HITS) : [];
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
  return <View style={[sk.card, { backgroundColor: c.cardAlt, borderColor: c.border }]} />;
}

function ChipRow({ chips, color, onPress }: {
  chips: { tag: string; label: string }[];
  color: { bg: string; border: string; text: string };
  onPress: (tag: string) => void;
}) {
  const ts = useStrings(tagStrings) as Record<string, string>;
  return (
    <View style={styles.chipRow}>
      {chips.map(c => (
        <TouchableOpacity
          key={c.tag}
          style={[styles.chip, { backgroundColor: color.bg, borderColor: color.border }]}
          onPress={() => onPress(c.tag)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={chipText(c.tag, c.label, ts)}
        >
          <Text style={[styles.chipText, { color: color.text }]}>{chipText(c.tag, c.label, ts)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function GreenHighlightCard({
  icon,
  iconSize,
  typeLabel,
  title,
  onPress,
  onPressIn,
  accessibilityLabel,
}: {
  icon: "book" | "navigate";
  iconSize: number;
  typeLabel: string;
  title: string;
  onPress: () => void;
  onPressIn?: () => void;
  accessibilityLabel: string;
}) {
  const c = useColors();
  const emerald = toneColors(c, "emerald");
  return (
    <TouchableOpacity
      style={[styles.resultCard, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}
      onPressIn={onPressIn}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.cardInner}>
        <View style={[styles.iconCircle, { backgroundColor: emerald.bg }]}>
          <Ionicons name={icon} size={iconSize} color={emerald.fg} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.typeLabel, { color: c.greenText }]}>{typeLabel}</Text>
          <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function SurahCard({ surahId, surahName: trSurahName }: { surahId: number; surahName: string }) {
  const surahName = useSurahNameOf()(surahId, trSurahName);
  const ss = useStrings(searchStrings);
  return (
    <GreenHighlightCard
      icon="book"
      iconSize={22}
      typeLabel={caps(ss.surahFound)}
      title={surahName}
      onPress={() => { Keyboard.dismiss(); router.push(`/surah/${surahId}`); }}
      accessibilityLabel={fmt(ss.openSurahA11y, { name: surahName })}
    />
  );
}

function DirectAyahCard({ surahId, ayahNumber }: { surahId: number; ayahNumber: number }) {
  const ss = useStrings(searchStrings);
  return (
    <GreenHighlightCard
      icon="navigate"
      iconSize={20}
      typeLabel={caps(ss.goToAyah)}
      title={fmt(ss.surahAyah, { s: surahId, a: ayahNumber })}
      onPressIn={() => prefetchAyah(surahId, ayahNumber)}
      onPress={() => { Keyboard.dismiss(); router.push(`/ayah/${surahId}/${ayahNumber}`); }}
      accessibilityLabel={fmt(ss.openAyahA11y, { ref: `${surahId}:${ayahNumber}` })}
    />
  );
}

function TagCard({ tag, count }: { tag: string; count: number }) {
  const c = useColors();
  const ss = useStrings(searchStrings);
  const amber = toneColors(c, "amber");
  return (
    <View style={[styles.resultCard, { backgroundColor: c.amberBg, borderColor: c.amberBorder }]}>
      <View style={styles.cardInner}>
        <View style={[styles.iconCircle, { backgroundColor: amber.bg }]}>
          <Ionicons name="pricetag" size={20} color={amber.fg} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.typeLabel, { color: c.amberText }]}>{caps(ss.themeFound)}</Text>
          <Text style={[styles.cardTitle, { color: c.goldText }]}>{tagLabel(tag) ?? ""}</Text>
          <Text style={[styles.tagCount, { color: c.amberText }]}>{fmt(ss.tagCount, { n: count })}</Text>
        </View>
      </View>
    </View>
  );
}

function VerseCard({ verseKey, meal: trMeal, surahName, readingTr }: {
  verseKey: string; meal: string | null; surahName: string | null; readingTr?: string | null;
}) {
  const c = useColors();
  const ss = useStrings(searchStrings);
  const lang = useLang();
  const meal = useMealOf()(verseKey, trMeal);
  const parsed = parseVerseKey(verseKey);
  const surahNameOf = useSurahNameOf();
  // İngilizce modda yerel Pickthall isabetlerinde (surahName null) ad tablodan gelir.
  const shownSurah = surahNameOf(parsed?.surahId, surahName);
  return (
    <TouchableOpacity
      style={[styles.resultCard, { backgroundColor: c.card, borderColor: c.border }]}
      onPressIn={() => { if (parsed) prefetchAyah(parsed.surahId, parsed.ayahNumber); }}
      onPress={() => { if (!parsed) return; Keyboard.dismiss(); router.push(`/ayah/${parsed.surahId}/${parsed.ayahNumber}`); }}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={fmt(ss.openVerseA11y, { name: shownSurah ?? verseKey })}
    >
      <View style={styles.verseHeader}>
        <Badge label={verseKey} tone="emerald" />
        {shownSurah ? <Text style={[styles.surahLabel, { color: c.textMuted }]} numberOfLines={1}>{shownSurah}{parsed ? fmt(ss.ayahSuffix, { a: parsed.ayahNumber }) : ""}</Text> : null}
      </View>
      {readingTr ? <Text style={[styles.reading, { color: c.text }]} numberOfLines={2}>{localizedVerseTranslit(verseKey, readingTr, lang)}</Text> : null}
      {meal
        ? <Text style={[styles.meal, { color: c.textSecondary }]} numberOfLines={3}>{meal.length > 140 ? meal.slice(0, 140) + "…" : meal}</Text>
        : <Text style={[styles.mealEmpty, { color: c.textMuted }]}>{ss.noMeal}</Text>}
    </TouchableOpacity>
  );
}

function Pagination({ page, pages, onPrev, onNext }: { page: number; pages: number; onPrev: () => void; onNext: () => void }) {
  const c = useColors();
  const ss = useStrings(searchStrings);
  if (pages <= 1) return null;
  return (
    <View style={styles.pagination}>
      <Button
        variant="secondary"
        label={ss.prev}
        onPress={onPrev}
        disabled={page <= 1}
        accessibilityLabel={ss.prevA11y}
      />
      <Text style={[styles.pageInfo, { color: c.textMuted }]}>{page} / {pages}</Text>
      <Button
        variant="secondary"
        label={ss.next}
        onPress={onNext}
        disabled={page >= pages}
        accessibilityLabel={ss.nextA11y}
      />
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const c = useColors();
  const tagS = useStrings(tagStrings);
  const ss = useStrings(searchStrings);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; tag?: string; page?: string; type?: string }>();
  const initialQuery = params.q ?? params.tag ?? "";

  const [query,        setQuery]   = useState(initialQuery);
  const [state,        setState]   = useState<SearchState>({ status: "idle" });
  const [recent,       setRecent]  = useState<string[]>([]);
  const [enHits,       setEnHits]  = useState<string[]>([]);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef     = useRef<TextInput>(null);
  const requestIdRef = useRef(0);

  // Son aramaları yükle
  useEffect(() => { loadRecent().then(setRecent); }, []);
  useEffect(() => () => { requestIdRef.current += 1; }, []);

  const fetchTagResults = useCallback(async (tag: string, page: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const reqId = ++requestIdRef.current;
    setState({ status: "loading" });
    try {
      const res = await api.tags.filter(tag, page);
      if (reqId !== requestIdRef.current) return;
      setState({ status: "tag_results", tag, results: res.results, total: res.total, page: res.page, pages: res.pages });
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setState({ status: "error", message: searchErrorMessage(err, "tagError") });
    }
  }, []);

  // URL'den tag gelirse direkt tag filter çağır
  useEffect(() => {
    if (params.type === 'tag' && params.q) {
      const page = parseInt(params.page ?? "1", 10) || 1;
      fetchTagResults(params.q, page);
      // Kutuda ham kod (dua-aile) yerine okunur başlık; bilinmeyen kod aynen kalır.
      setQuery(tagLabel(params.q) ?? params.q);
    } else if (params.tag) {
      const page = parseInt(params.page ?? "1", 10) || 1;
      fetchTagResults(params.tag, page);
      setQuery(tagLabel(params.tag) ?? params.tag);
    } else if (params.q) {
      setQuery(params.q);
    }
  }, [params.type, params.tag, params.q, params.page, fetchTagResults]);

  // Debounce metin araması
  useEffect(() => {
    if (params.tag || params.type === 'tag') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < MIN_LEN) {
      requestIdRef.current += 1;
      setState({ status: "idle" });
      return;
    }

    const reqId = ++requestIdRef.current;
    setState({ status: "loading" });
    debounceRef.current = setTimeout(async () => {
      if (reqId !== requestIdRef.current) return;
      // "2:255" / "2/255" gibi doğrudan ayet referansı → yönlendirme YOK, "Ayete
      // Git" kartı gösterilir. (Anında yönlendirme "2:2"de tetiklenip 2:25/2:255'e
      // yazarak ulaşmayı imkânsız kılıyordu; Enter ise handleSubmit'te direkt gider.)
      const directRef = parseDirectAyahQuery(trimmed);
      if (directRef) {
        setState({ status: "direct", surahId: directRef.surahId, ayahNumber: directRef.ayahNumber });
        return;
      }
      const hits = localEnglishHits(trimmed);
      setEnHits(hits);
      try {
        const data = await api.search.query(trimmed);
        if (reqId !== requestIdRef.current) return;
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
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        // EN: gömülü Pickthall isabetleri çevrimdışı da gösterilir.
        if (hits.length > 0) setState({ status: "done", data: { type: "none" } });
        else setState({ status: "error", message: searchErrorMessage(err, "searchError") });
      }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, params.tag, params.type]);

  const handleClear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
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
      requestIdRef.current += 1;
      Keyboard.dismiss();
      router.push(`/ayah/${directRef.surahId}/${directRef.ayahNumber}`);
      return;
    }

    const reqId = ++requestIdRef.current;
    const hits = localEnglishHits(trimmed);
    setEnHits(hits);
    setState({ status: "loading" });
    api.search.query(trimmed)
      .then(data => {
        if (reqId !== requestIdRef.current) return;
        setState({ status: "done", data });
      })
      .catch((err) => {
        if (reqId !== requestIdRef.current) return;
        setState(hits.length > 0
          ? { status: "done", data: { type: "none" } }
          : { status: "error", message: searchErrorMessage(err, "searchFailed") });
      });
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
    const emerald = toneColors(c, "emerald");
    const violet = toneColors(c, "violet");
    const amber = toneColors(c, "amber");
    const items: IdleItem[] = [];
    items.push({ kind: "hint", key: "hint" });
    items.push({ kind: "chip_section", key: "st_namaz", title: tagS.namazTitle, chips: NAMAZ_CHIPS,
      color: { bg: emerald.bg, border: c.border, text: emerald.fg } });
    items.push({ kind: "chip_section", key: "st_korunma", title: tagS.korunmaTitle, chips: KORUNMA_CHIPS,
      color: { bg: violet.bg, border: c.border, text: violet.fg } });
    items.push({ kind: "chip_section", key: "st_ismiazam", title: tagS.ismiazamTitle, chips: ISMIAZAM_CHIPS,
      color: { bg: amber.bg, border: c.border, text: amber.fg } });
    if (recent.length > 0) {
      items.push({ kind: "recent_header", key: "recent_hdr" });
      recent.forEach((r, i) => items.push({ kind: "recent_row", key: `recent_${i}`, item: r }));
    }
    return items;
  }, [recent, c, tagS]);

  const renderIdleItem = useCallback(({ item }: { item: IdleItem }) => {
    switch (item.kind) {
      case "hint":
        return <Text style={[styles.hint, { color: c.textMuted }]}>{ss.hint}</Text>;
      case "chip_section":
        return (
          <View>
            <Text style={[styles.idleSection, { color: c.textMuted }]}>{caps(item.title)}</Text>
            <ChipRow chips={item.chips} color={item.color} onPress={handleTagChip} />
          </View>
        );
      case "recent_header":
        return (
          <View style={styles.recentHeader}>
            <Text style={[styles.idleSection, { color: c.textMuted }]}>{caps(ss.recent)}</Text>
            <Button
              variant="ghost"
              tone="danger"
              label={ss.clear}
              onPress={() => { setRecent([]); saveRecent([]); }}
              accessibilityLabel={ss.clearRecentA11y}
            />
          </View>
        );
      case "recent_row":
        return (
          <TouchableOpacity
            style={[styles.recentRow, { borderBottomColor: c.border }]}
            onPress={() => setQuery(item.item)}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={fmt(ss.repeatA11y, { q: item.item })}
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
              accessibilityLabel={fmt(ss.deleteA11y, { q: item.item })}
            >
              <Ionicons name="close" size={16} color={c.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  }, [handleTagChip, recent, c, ss]);

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
            placeholder={ss.placeholder}
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
            <TouchableOpacity onPress={handleClear} hitSlop={8} accessibilityRole="button" accessibilityLabel={ss.clearSearchA11y}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Aktif filtre göstergesi */}
      {state.status === "tag_results" && (
        <View style={styles.filterBar}>
          {tagLabel(state.tag) ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Badge
                tone="violet"
                label={fmt(ss.filterCount, { label: tagLabel(state.tag) ?? "", n: state.total })}
              />
            </View>
          ) : <View style={{ flex: 1 }} />}
          <Button
            variant="ghost"
            tone="danger"
            label={ss.removeFilter}
            onPress={handleClear}
            accessibilityLabel={ss.removeFilterA11y}
          />
        </View>
      )}

      {/* Yükleniyor skeleton */}
      {isLoading && (
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(i) => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={{ padding: space.gutter, gap: 10 }}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Hata */}
      {state.status === "error" && !isLoading && (
        <Callout tone="error" style={styles.errorCallout}>
          <View style={styles.errorRow}>
            <Text style={[styles.errorText, { color: c.errorText }]}>{state.message}</Text>
            <Button
              variant="ghost"
              tone="accent"
              label={ss.retry}
              onPress={handleRetryError}
              accessibilityLabel={ss.retryA11y}
            />
          </View>
        </Callout>
      )}

      {/* İngilizce: sunucu hatasında da cihaz üstü sonuçlar */}
      {state.status === "error" && !isLoading && enHits.length > 0 && (
        <FlatList
          data={enHits}
          keyExtractor={k => k}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <VerseCard verseKey={item} meal={null} surahName={null} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Doğrudan ayet referansı ("2:255") */}
      {state.status === "direct" && !isLoading && (
        <View style={styles.singleWrap}>
          <Text style={[styles.queryLabel, { color: c.textMuted }]}>{fmt(ss.resultFor, { q: query.trim() })}</Text>
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
            <Text style={[styles.queryLabel, { color: c.textMuted }]}>{fmt(ss.resultFor, { q: query.trim() })}</Text>
            <SurahCard surahId={d.surahId} surahName={d.surahName} />
          </View>
        );
        if (d.type === "tag") return (
          <View style={styles.singleWrap}>
            <Text style={[styles.queryLabel, { color: c.textMuted }]}>{fmt(ss.resultFor, { q: query.trim() })}</Text>
            {getLang() !== "en" || tagLabel(d.tag) ? <TagCard tag={d.tag} count={d.count} /> : null}
          </View>
        );
        if (d.type === "verses") return (
          <FlatList
            data={enHits.length > 0
              ? [...enHits.map(k => ({ verse_key: k, meal: null, surah_name: null })), ...d.results.filter(r => !enHits.includes(r.verse_key))]
              : d.results}
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
                    onPress={() => { const s = d.suggestedSurah; if (s) router.push(`/surah/${s.id}`); }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={fmt(ss.openSurahA11y, { name: localizedSurahName(d.suggestedSurah.id, d.suggestedSurah.name) })}
                  >
                    <Callout tone="warning" icon={false} style={styles.suggestionCallout}>
                      <View style={styles.suggestionRow}>
                        <Text style={[styles.suggestionText, { color: c.amberText }]}>{ss.didYouMean}</Text>
                        <Text style={[styles.suggestionLink, { color: c.goldText }]}>{fmt(ss.surahLink, { name: localizedSurahName(d.suggestedSurah.id, d.suggestedSurah.name) })}</Text>
                      </View>
                    </Callout>
                  </TouchableOpacity>
                )}
                <Text style={[styles.queryLabel, { color: c.textMuted }]}>{fmt(ss.resultsCount, { q: query.trim(), n: d.total + enHits.filter(k => !d.results.some(r => r.verse_key === k)).length })}{d.total > d.results.length ? fmt(ss.firstN, { n: d.results.length }) : ""}</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        );
        if (enHits.length > 0) return (
          <FlatList
            data={enHits}
            keyExtractor={k => k}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <VerseCard verseKey={item} meal={null} surahName={null} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            keyboardShouldPersistTaps="handled"
          />
        );
        return (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>{ss.noResults}</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>{fmt(ss.noMatch, { q: query.trim() })}</Text>
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
  screen:   { flex: 1 },
  centerWrap: { flex: 1, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  barWrap:  { paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.xxs },
  bar:      { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5 },
  input:    { flex: 1, fontSize: 16, paddingVertical: 10 },

  filterBar:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.gutter, paddingBottom: space.xs, gap: 10 },

  errorCallout: { marginHorizontal: space.gutter, marginVertical: space.sm },
  errorRow:     { flexDirection: "row", alignItems: "center", gap: space.xs },
  errorText:    { fontSize: 13, lineHeight: 20, flex: 1 },

  listContent: { paddingHorizontal: space.gutter, paddingTop: space.xxs, paddingBottom: space.xl },
  singleWrap:  { padding: space.gutter },
  queryLabel:  { fontSize: 12, marginBottom: 6, paddingLeft: 2 },

  resultCard: { borderRadius: radius.lg, borderWidth: 1, padding: 14 },
  cardInner:  { flexDirection: "row", alignItems: "center", gap: space.sm },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardBody:   { flex: 1, gap: 2 },
  typeLabel:  { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cardTitle:  { fontSize: 17, fontWeight: "700" },
  tagCount:   { fontSize: 12, marginTop: 1 },

  verseHeader: { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: 6 },
  surahLabel:  { fontSize: 13, flex: 1 },
  reading:     { fontSize: 13, fontStyle: "italic", lineHeight: 20, marginBottom: 4 },
  meal:        { fontSize: 14, lineHeight: 22 },
  mealEmpty:   { fontSize: 14, fontStyle: "italic" },

  suggestionCallout: { marginBottom: space.xs },
  suggestionRow:     { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  suggestionText:    { fontSize: 13 },
  suggestionLink:    { fontSize: 13, fontWeight: "700" },

  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.md },
  pageInfo:   { fontSize: 13 },

  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.sm },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub:   { fontSize: 13, textAlign: "center", lineHeight: 20 },

  idleContent: { padding: space.gutter, paddingBottom: 40 },
  hint:        { fontSize: 12, textAlign: "center", marginBottom: space.md, lineHeight: 18 },
  idleSection: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: space.md, marginBottom: space.xs },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip:    { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText:{ fontSize: 12, fontWeight: "600" },

  recentHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recentRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  recentText:  { flex: 1, fontSize: 14 },
});

const sk = StyleSheet.create({
  card: { height: 90, borderRadius: radius.lg, borderWidth: 1, opacity: 0.5 },
});