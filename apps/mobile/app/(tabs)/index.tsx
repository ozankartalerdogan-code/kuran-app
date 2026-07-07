import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStreak } from "../../src/hooks/useStreak";
import { useDailyContent } from "../../src/hooks/useDailyContent";
import { useColors, toggleTheme } from "../../src/hooks/useColors";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import { SkeletonAyetCard } from "../../src/components/SkeletonLoader";
import { api } from "../../src/lib/api";
import * as Haptics from 'expo-haptics';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('lottie-react-native').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UIManager } = require('react-native');
  if (UIManager.hasViewManagerConfig?.('LottieAnimationView')) LottieView = mod;
} catch (_e) { /* noop */ }
import { logScreen, logFeature, AnalyticsEvents } from '../../src/lib/analytics';
import { TasbihModal } from '../../src/components/ZikirMatik';
import { useTourTarget, useTourScroller } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";


const PRAYER_ORDER = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

const RUH_HALI = [
  { emoji: "😌", label: "Huzur",           tag: "rahmet",   bg: "#d1fae5", border: "#6ee7b7" },
  { emoji: "💪", label: "Sabır",           tag: "sabır",    bg: "#fef3c7", border: "#fcd34d" },
  { emoji: "🙏", label: "Tövbe",           tag: "tövbe",    bg: "#ede9fe", border: "#c4b5fd" },
  { emoji: "🌟", label: "Şükür",           tag: "şükür",    bg: "#fef9c3", border: "#fde047" },
  { emoji: "⚖️", label: "Adalet",          tag: "adalet",   bg: "#e0e7ff", border: "#a5b4fc" },
  { emoji: "💔", label: "Geçim Sıkıntısı", tag: "rızık",    bg: "#ffe4e6", border: "#fda4af" },
  { emoji: "🧭", label: "Hidayet",         tag: "hidayet",  bg: "#ffedd5", border: "#fdba74" },
  { emoji: "🤲", label: "Dua",             tag: "dua",      bg: "#cffafe", border: "#67e8f9" },
  { emoji: "📿", label: "Zikir",           tag: "zikir",    bg: "#fae8ff", border: "#f0abfc" },
  { emoji: "🍃", label: "Tevekkül",        tag: "tevekkül", bg: "#ecfccb", border: "#bef264" },
];

type MoodItem = typeof RUH_HALI[number];
type MoodResult = MoodItem & {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  arabic_text: string | null;
  meal: string | null;
};

type QuickAction =
  | { id: string; emoji: string; label: string; bg: string; route: "/sure-listesi" | "/ne-ogreneyim" | "/kible"; onPress?: never }
  | { id: string; emoji: string; label: string; bg: string; route?: never; onPress: () => void };

function HomeContent() {
  const c          = useColors();
  // Salt gösterim — seriyi yalnız gerçek okuma (ayet ekranı) ilerletir;
  // uygulamayı açmak "okuma" sayılmaz.
  const { streak, refresh: refreshStreak } = useStreak({ record: false });
  // Ana sayfa tab olarak takılı kalır; ayet okuyup dönünce seri kartı güncellensin.
  useFocusEffect(useCallback(() => { refreshStreak(); }, [refreshStreak]));
  const { verse, dua, prayers, nextPrayer, prayerCity, PRAYER_LABELS, error, verseLoading, duaLoading, prayerLoading } = useDailyContent();
  const [moodLoading, setMoodLoading] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodResult | null>(null);
  const [tasbihOpen, setTasbihOpen]   = useState(false);
  const prayerTarget = useTourTarget("home.prayerTimes");
  const qiblaTarget = useTourTarget("home.quick.qibla");
  const tourScroll = useTourScroller();

  const openTasbih = useCallback(() => setTasbihOpen(true), []);

  const handleSearchPress = useCallback(() => {
    logFeature("home_search");
    router.push("/search" as Href);
  }, []);

  const QUICK_ACTIONS: QuickAction[] = useMemo(() => [
    { id: "quran", emoji: "📖", label: "Kur'an-ı Kerim", route: "/sure-listesi", bg: "#d1fae5" },
    { id: "learn", emoji: "🎓", label: "Öğren",          route: "/ne-ogreneyim", bg: "#fef3c7" },
    { id: "tasbih", emoji: "📿", label: "Tespih",         bg: "#dcfce7",          onPress: openTasbih },
    { id: "qibla", emoji: "🧭", label: "Kıble",          route: "/kible",        bg: "#ede9fe" },
  ], [openTasbih]);
  // Tag bazında gösterilen TÜM ayetler — exclude olarak gönderilir, böylece o tag'in
  // havuzu bitene kadar aynı ayet bir daha gelmez. Havuz tükenince (hepsi exclude'da →
  // sunucu "ayet bulunamadı" döner) ilgili tag sıfırlanıp yeni tur başlar.
  // Ayrıca her istek benzersiz olduğundan no-store'a rağmen oluşan kısa-pencere cache'i atlanır.
  const moodSeen = useRef<Record<string, string[]>>({});

  useEffect(() => { logScreen('AnaSayfa'); }, []);

  const handleMoodPress = useCallback(async (mood: MoodItem) => {
    if (moodLoading) return;
    const { tag } = mood;
    Haptics.selectionAsync();
    setMoodLoading(tag);
    try {
      const seen = moodSeen.current[tag] ?? [];
      const result = await api.mood.random(tag, seen.join(",")).catch((e) => {
        // Havuz tükendiyse o tag'i sıfırla ve yeni turla bir kez daha dene.
        if (seen.length === 0) throw e;
        moodSeen.current[tag] = [];
        return api.mood.random(tag, "");
      });
      if (!result?.surah_id || !result?.ayah_number) throw new Error("empty result");
      moodSeen.current[tag] = [...(moodSeen.current[tag] ?? []), result.verse_key];
      setSelectedMood({ ...mood, ...result });
    } catch {
      // Fallback: tag aramasına git
      logFeature(AnalyticsEvents.ARAMA);
      router.push({ pathname: "/search", params: { q: tag } });
    } finally {
      setMoodLoading(null);
    }
  }, [moodLoading]);

  const closeMoodCard = useCallback(() => setSelectedMood(null), []);

  const openMoodAyah = useCallback(() => {
    if (!selectedMood) return;
    const { surah_id, ayah_number } = selectedMood;
    setSelectedMood(null);
    router.push(`/ayah/${surah_id}/${ayah_number}`);
  }, [selectedMood]);

  const handleQuickActionPress = useCallback((action: QuickAction) => {
    Haptics.selectionAsync();
    logFeature('quick_action', { action: action.id });
    if (action.onPress) { action.onPress(); return; }
    router.push(action.route);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
    <ScrollView
      {...tourScroll}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={handleSearchPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Ayet veya sure ara"
      >
        <Ionicons name="search-outline" size={18} color={c.textMuted} />
        <Text style={[styles.searchText, { color: c.textMuted }]}>Sure, ayet veya kelime ara…</Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Günlük içerik yüklenemedi. İnternet bağlantınızı kontrol edin.</Text>
        </View>
      )}

      {/* Streak + Gece modu */}
      <View style={[styles.streakCard, { backgroundColor: c.isDark ? "#431407" : "#fff7ed", borderColor: c.isDark ? "#7c2d12" : "#fed7aa" }]}>
        {streak.current > 0 ? (
          LottieView ? (
            <LottieView
              source={require('../../assets/flamefire.json')}
              autoPlay
              loop
              style={{ width: 40, height: 40 }}
            />
          ) : (
            <Text style={styles.streakEmoji}>🔥</Text>
          )
        ) : (
          <Text style={styles.streakEmoji}>🔥</Text>
        )}
        <View style={{ flex: 1 }}>
          {streak.current > 0 ? (
            <>
              <Text style={[styles.streakTitle, { color: c.isDark ? "#fb923c" : "#9a3412" }]}>{streak.current} günlük seri!</Text>
              <Text style={[styles.streakSub, { color: c.isDark ? "#f97316" : "#c2410c" }]}>Rekor: {streak.longest} gün</Text>
            </>
          ) : (
            <Text style={[styles.streakTitle, { color: c.isDark ? "#fb923c" : "#9a3412" }]}>Kuran Yolu</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.75}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={c.isDark ? "Aydınlık moda geç" : "Gece moduna geç"}
          style={[styles.themeBtn, {
            backgroundColor: c.isDark ? "#292524" : "#e7e5e4",
            borderColor: c.isDark ? "#44403c" : "#d6d3d1",
          }]}
        >
          <Ionicons
            name={c.isDark ? "sunny" : "moon"}
            size={18}
            color={c.isDark ? "#fbbf24" : "#6366f1"}
          />
        </TouchableOpacity>
      </View>

      {/* Günün Ayeti */}
      <TouchableOpacity
        style={[styles.verseCard, { backgroundColor: c.isDark ? "#1c1405" : "#fffbeb", borderColor: c.isDark ? "#78350f" : "#fcd34d" }]}
        onPress={() => verse && router.push(`/ayah/${verse.surah_id}/${verse.ayah_number}`)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Günün ayetini aç"
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardBadge, { color: c.isDark ? "#fbbf24" : "#92400e" }]}>✨ Günün Ayeti</Text>
          {verse && <Text style={[styles.cardRef, { color: c.isDark ? "#d97706" : "#a16207" }]}>{verse.surah_name} · {verse.surah_id}:{verse.ayah_number}</Text>}
        </View>
        {!verse ? (
          verseLoading ? <SkeletonAyetCard /> : <Text style={[styles.verseMeal, { color: c.isDark ? "#fef3c7" : "#451a03" }]}>Günün ayeti şu an yüklenemedi. Lütfen daha sonra tekrar deneyin.</Text>
        ) : (
          <>
            {verse.arabic_text && <Text style={[styles.duaArabic, { color: c.isDark ? "#fde68a" : "#78350f" }]}>{verse.arabic_text}</Text>}
            {verse.reading_tr && <Text style={[styles.verseReading, { color: c.isDark ? "#fde68a" : "#78350f" }]}>{verse.reading_tr}</Text>}
            {verse.meal && <Text style={[styles.verseMeal, { color: c.isDark ? "#fef3c7" : "#451a03" }]} numberOfLines={3}>{verse.meal}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Ruh Haline Göre */}
      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>💭 Ruh Haline Göre</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {RUH_HALI.map(m => (
          <TouchableOpacity
            key={m.tag}
            style={[styles.moodChip, { backgroundColor: c.isDark ? c.cardAlt : m.bg, borderColor: c.isDark ? c.border : m.border, opacity: moodLoading === m.tag ? 0.6 : 1 }]}
            onPress={() => handleMoodPress(m)}
            activeOpacity={0.7}
            disabled={!!moodLoading}
            accessibilityRole="button"
            accessibilityLabel={m.label}
            accessibilityState={{ disabled: !!moodLoading, busy: moodLoading === m.tag }}
          >
            {moodLoading === m.tag
              ? <ActivityIndicator size="small" color={c.text} />
              : <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
            }
            <Text style={[styles.moodLabel, { color: c.text }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Namaz Vakitleri */}
      <View {...prayerTarget} style={[styles.prayerCard, { backgroundColor: c.isDark ? "#0f0a2a" : "#eef2ff", borderColor: c.isDark ? "#3730a3" : "#a5b4fc" }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardBadge, { color: c.isDark ? "#818cf8" : "#3730a3" }]}>🕌 Namaz Vakitleri</Text>
          <Text style={[styles.cardRef, { color: c.isDark ? "#6366f1" : "#4338ca" }]}>{prayerCity}{nextPrayer ? ` · Sonraki: ${nextPrayer.label} ${nextPrayer.time}` : ""}</Text>
        </View>
        {!prayers && prayerLoading ? (
          <ActivityIndicator color="#4f46e5" style={{ marginVertical: 8 }} />
        ) : !prayers ? (
          <Text style={[styles.verseMeal, { color: c.isDark ? "#c7d2fe" : "#4338ca", marginVertical: 8 }]}>
            Namaz vakitleri şu an yüklenemedi. Lütfen daha sonra tekrar deneyin.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {PRAYER_ORDER.map((key) => {
              const isNext = nextPrayer?.label === PRAYER_LABELS[key];
              return (
                <View key={key} style={[
                  styles.prayerItem,
                  { backgroundColor: c.isDark ? "#1e1b4b" : "#fff", borderColor: c.isDark ? "#3730a3" : "#e0e7ff" },
                  isNext && styles.prayerItemActive,
                ]}>
                  <Text style={[styles.prayerLabel, { color: c.isDark ? "#a5b4fc" : "#6366f1" }, isNext && styles.prayerLabelActive]}>{PRAYER_LABELS[key]}</Text>
                  <Text style={[styles.prayerTime, { color: c.isDark ? "#c7d2fe" : "#312e81" }, isNext && styles.prayerTimeActive]}>{prayers[key as keyof typeof prayers]}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Bildirim ayarları /bildirimler ekranında yönetilir — buraya kısayol. */}
        <TouchableOpacity onPress={() => router.push("/bildirimler")} activeOpacity={0.7} style={styles.prayerNotifLink} accessibilityRole="button" accessibilityLabel="Namaz vakti bildirimleri">
          <Text style={[styles.prayerNotifLinkText, { color: c.isDark ? "#a5b4fc" : "#4338ca" }]}>🔔 Namaz vakti bildirimleri →</Text>
        </TouchableOpacity>
      </View>

      {/* Günün Duası */}
      <TouchableOpacity
        style={[styles.duaCard, { backgroundColor: c.isDark ? "#042f2e" : "#f0fdfa", borderColor: c.isDark ? "#0f766e" : "#5eead4" }]}
        onPress={() => dua && router.push(`/ayah/${dua.surah_id}/${dua.ayah_number}`)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Günün duasını aç"
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardBadge, { color: c.isDark ? "#2dd4bf" : "#0f766e" }]}>🤲 Günün Duası</Text>
          {dua && <Text style={[styles.cardRef, { color: c.isDark ? "#14b8a6" : "#0d9488" }]}>{dua.surah_name} · {dua.surah_id}:{dua.ayah_number}</Text>}
        </View>
        {!dua ? (
          duaLoading ? <SkeletonAyetCard /> : <Text style={[styles.verseMeal, { color: c.isDark ? "#ccfbf1" : "#134e4a" }]}>Günün duası şu an yüklenemedi. Lütfen daha sonra tekrar deneyin.</Text>
        ) : (
          <>
            {dua.arabic_text && <Text style={[styles.duaArabic, { color: c.isDark ? "#99f6e4" : "#134e4a" }]}>{dua.arabic_text}</Text>}
            {dua.reading_tr && <Text style={[styles.verseReading, { color: c.isDark ? "#99f6e4" : "#134e4a" }]}>{dua.reading_tr}</Text>}
            {dua.meal && <Text style={[styles.verseMeal, { color: c.isDark ? "#ccfbf1" : "#134e4a" }]} numberOfLines={3}>{dua.meal}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Bugün ne yapmak istiyorsun? */}
      <View style={[styles.quickWidget, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.quickTitle, { color: c.textMuted }]}>Bugün ne yapmak istiyorsun?</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity
              key={a.id}
              {...(a.id === "qibla" ? qiblaTarget : {})}
              style={[styles.quickBtn, { backgroundColor: c.isDark ? c.cardAlt : a.bg }]}
              onPress={() => handleQuickActionPress(a)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <Text style={styles.quickEmoji}>{a.emoji}</Text>
              <Text style={[styles.quickLabel, { color: c.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
    <TasbihModal visible={tasbihOpen} onClose={() => setTasbihOpen(false)} />
    <Modal
      visible={!!selectedMood}
      transparent
      animationType="fade"
      onRequestClose={closeMoodCard}
    >
      <View style={styles.moodModalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMoodCard} accessibilityRole="button" accessibilityLabel="Kapat" />
        {selectedMood && (
          <View style={[styles.moodModalCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.moodModalHeader}>
              <View style={[styles.moodModalIcon, { backgroundColor: c.isDark ? c.cardAlt : selectedMood.bg }]}>
                <Text style={styles.moodModalEmoji}>{selectedMood.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moodModalTitle, { color: c.text }]}>{selectedMood.label}</Text>
                <Text style={[styles.moodModalSub, { color: c.textMuted }]}>Elmalılı Hamdi Yazır meali</Text>
              </View>
              <TouchableOpacity onPress={closeMoodCard} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Kapat">
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={openMoodAyah}
              activeOpacity={0.75}
              style={[styles.moodAyahLink, { backgroundColor: c.isDark ? c.cardAlt : "#f8fafc", borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityLabel="Ayeti aç"
            >
              <Text style={[styles.moodAyahLinkText, { color: c.isDark ? "#fbbf24" : "#92400e" }]}>
                {selectedMood.surah_name ?? "Ayet"} · {selectedMood.surah_id}:{selectedMood.ayah_number}
              </Text>
              <Ionicons name="open-outline" size={16} color={c.isDark ? "#fbbf24" : "#92400e"} />
            </TouchableOpacity>

            <Text style={[styles.moodMeal, { color: c.text }]}>
              {selectedMood.meal || "Bu ayetin meali şu an yüklenemedi. Ayet sayfasından tekrar kontrol edebilirsiniz."}
            </Text>
          </View>
        )}
      </View>
    </Modal>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, paddingBottom: 32, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  searchBar:  { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14,
                borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 12 },
  searchText: { fontSize: 14, flex: 1 },

  streakCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, marginBottom: 12,
  },
  streakEmoji: { fontSize: 26 },
  streakTitle: { fontSize: 14, fontWeight: "700" },
  streakSub:   { fontSize: 11, marginTop: 2 },

  verseCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardBadge: { fontSize: 13, fontWeight: "700" },
  cardRef:   { fontSize: 11 },
  verseReading: { fontSize: 13, fontStyle: "italic", marginBottom: 6, lineHeight: 20 },
  verseMeal:    { fontSize: 13, lineHeight: 20 },

  prayerCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  prayerNotifLink: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(99,102,241,0.25)", alignItems: "center" },
  prayerNotifLinkText: { fontSize: 13, fontWeight: "600" },
  prayerItem: {
    alignItems: "center", paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, borderRadius: 10, borderWidth: 1, minWidth: 64,
  },
  prayerItemActive:    { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  prayerLabel:         { fontSize: 11, fontWeight: "600" },
  prayerLabelActive:   { color: "#fff" },
  prayerTime:          { fontSize: 13, fontWeight: "700", marginTop: 2 },
  prayerTimeActive:    { color: "#fff" },

  duaCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  duaArabic: { fontSize: 18, textAlign: "right", writingDirection: "rtl", lineHeight: 36, marginBottom: 8, fontFamily: "Amiri" },

  themeBtn:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  moodChip:  { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  moodLabel: { fontSize: 13, fontWeight: "600" },
  moodModalBackdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.45)" },
  moodModalCard: { width: "100%", maxWidth: 420, alignSelf: "center", borderRadius: 20, borderWidth: 1, padding: 18, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  moodModalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  moodModalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  moodModalEmoji: { fontSize: 24 },
  moodModalTitle: { fontSize: 17, fontWeight: "800" },
  moodModalSub: { fontSize: 12, marginTop: 2 },
  moodAyahLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  moodAyahLinkText: { fontSize: 13, fontWeight: "800" },
  moodMeal: { fontSize: 15, lineHeight: 24 },

  quickWidget: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
  quickTitle:  { fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  quickGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn:    { flexBasis: "48%", flexGrow: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  quickEmoji:  { fontSize: 30, lineHeight: 36 },
  quickLabel:  { fontSize: 12, fontWeight: "600", textAlign: "center" },
  errorBanner:     { backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#fca5a5" },
  errorBannerText: { fontSize: 13, color: "#b91c1c", textAlign: "center" },
});
