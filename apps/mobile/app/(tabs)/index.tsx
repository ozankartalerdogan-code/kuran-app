import { beginOverlay, isOverlayBusy } from "../../src/tour/overlayBusy";
import { HomeWelcomeCards } from "../../src/components/onboarding/HomeWelcomeCards";
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal,
  RefreshControl, PixelRatio, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStreak } from "../../src/hooks/useStreak";
import { useDailyContent, formatHijriDate } from "../../src/hooks/useDailyContent";
import { useColors, toggleTheme } from "../../src/hooks/useColors";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import { SkeletonAyetCard } from "../../src/components/SkeletonLoader";
import { api } from "../../src/lib/api";
import * as Haptics from 'expo-haptics';
// Seri kartındaki Lottie alev animasyonu kaldırıldı (düşük donanımda nokta kadar
// görünüyordu); yerine sabit rozet var. lottie-react-native paketi başka ekranlarda kullanılıyor.
import { logScreen, logFeature, AnalyticsEvents } from '../../src/lib/analytics';
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { CloseButton, featureColors, space, toneColors, type IoniconName, type Tone } from "../../src/components/ui";
// Günün Ayeti/Duası kartları UthmanicHafs ile basılır; o font U+06DF, U+06E3 ve
// U+06EB yuvarlak/işmam yuvalarında gerçek glif taşımaz ve yerlerine noktalı
// daire çizer (U+06DF tek başına korpüste ~3988 yerde geçer, çoğul -û ekinde).
// Mushaf sayfası ve ayet detayı bu eşlemeyi zaten uyguluyordu; ana sayfa
// atlanmıştı. Eşleme 1:1'dir, uzunluk korunur, veri değişmez.
import { mushafMetniHazirla } from "../../src/lib/mushafText";


import { useMealOf } from "../../src/lib/englishMeal";
import { useSurahNameOf } from "../../src/lib/surahNames";
import { useStrings, useLang, fmt, localeTag } from "../../src/i18n";
import { localizedVerseTranslit } from "../../src/lib/verseTranslitEn";
import moodStrings from "../../src/i18n/strings/moods";
import homeStrings from "../../src/i18n/strings/home";
import sehirSecStrings from "../../src/i18n/strings/sehirSec";
import prayerNameStrings from "../../src/i18n/strings/prayerNames";
import { consumePrayerCityChanged } from "../../src/lib/prayerCityEvents";
const PRAYER_ORDER = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

const PRAYER_ICONS: Record<string, IoniconName> = {
  Fajr: "moon-outline", Sunrise: "sunny-outline", Dhuhr: "sunny",
  Asr: "partly-sunny-outline", Maghrib: "cloudy-night-outline", Isha: "moon",
};

function formatRemaining(min: number, hs: Record<string, string>): string {
  if (min < 1) return hs.lessThanMin;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return m > 0 ? fmt(hs.hrMin, { h, m }) : fmt(hs.hr, { h });
  return fmt(hs.min, { m });
}

const RUH_HALI: { icon: IoniconName; tone: Tone; label: string; tag: string }[] = [
  { icon: "leaf-outline", tone: "emerald", label: "Huzur", tag: "rahmet" },
  { icon: "shield-outline", tone: "amber", label: "Sabır", tag: "sabır" },
  { icon: "refresh-outline", tone: "violet", label: "Tövbe", tag: "tövbe" },
  { icon: "sparkles-outline", tone: "amber", label: "Şükür", tag: "şükür" },
  { icon: "scale-outline", tone: "sky", label: "Adalet", tag: "adalet" },
  { icon: "wallet-outline", tone: "violet", label: "Geçim Sıkıntısı", tag: "rızık" },
  { icon: "compass-outline", tone: "sky", label: "Hidayet", tag: "hidayet" },
  { icon: "hand-left-outline", tone: "emerald", label: "Dua", tag: "dua" },
  { icon: "radio-button-on-outline", tone: "emerald", label: "Zikir", tag: "zikir" },
  { icon: "sunny-outline", tone: "amber", label: "Tevekkül", tag: "tevekkül" },
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

type QuickAction = {
  id: string;
  icon: IoniconName;
  label: string;
  tone: Tone;
  route?: "/sure-listesi" | "/ne-ogreneyim" | "/kible";
  onPress?: () => void;
};

function HomeContent() {
  const { fontScale } = useWindowDimensions();
  const largePrayerText = Math.max(fontScale, PixelRatio.getFontScale()) >= 1.3;
  const c          = useColors();
  const f          = featureColors(c);
  const lang = useLang();
  const mealOf = useMealOf();
  const surahNameOf = useSurahNameOf();
  const moodS = useStrings(moodStrings) as Record<string, string>;
  const hs = useStrings(homeStrings) as Record<string, string>;
  const cityS = useStrings(sehirSecStrings) as Record<string, string>;
  const pn = useStrings(prayerNameStrings) as unknown as Record<string, string>;
  const moodLabel = (m: { tag: string; label: string }) => moodS[m.tag] ?? m.label;
  // Salt gösterim — seriyi yalnız gerçek okuma (ayet ekranı) ilerletir;
  // uygulamayı açmak "okuma" sayılmaz.
  const { streak, refresh: refreshStreak } = useStreak({ record: false });
  // Ana sayfa tab olarak takılı kalır; ayet okuyup dönünce seri kartı güncellensin.
  useFocusEffect(useCallback(() => { refreshStreak(); }, [refreshStreak]));
  const { verse, dua, prayers, hijriDate, nextPrayer, prayerCity, PRAYER_LABELS, error, verseLoading, duaLoading, prayerLoading, refresh: refreshDaily, refreshHomeLocation } = useDailyContent();
  // Şehir seçiminden dönünce namaz vakitlerini yenile.
  useFocusEffect(useCallback(() => {
    if (consumePrayerCityChanged()) void refreshDaily();
    else void refreshHomeLocation();
  }, [refreshDaily, refreshHomeLocation]));
  // Hicri tarih namaz gününe aittir; Aladhan günlerinde yerel takvim kullanılır.
  const gregorianToday = useMemo(
    () => new Date().toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hs],
  );
  const hijriLabel = formatHijriDate(hijriDate);
  const nextPrayerIdx = nextPrayer ? PRAYER_ORDER.indexOf(nextPrayer.key) : -1;
  // Aşağı çek → günlük içerik + namaz vakitleri + seri kartı yeniden yüklenir
  // ("yüklenemedi" durumlarında uygulama içi tek kurtarma yolu).
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refreshDaily(), refreshStreak()]); }
    finally { setRefreshing(false); }
  }, [refreshDaily, refreshStreak]);
  const [moodLoading, setMoodLoading] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodResult | null>(null);
  const prayerTarget = useTourTarget("home.prayerTimes");
  const qiblaTarget = useTourTarget("home.quick.qibla");
  const scrollRef = useRef<ScrollView>(null);

  const modalEnd = useRef<(() => void) | null>(null);
  const modalMounted = useRef(true);
  const acquireModal = useCallback(() => {
    if (!modalMounted.current || isOverlayBusy()) return false;
    modalEnd.current = beginOverlay();
    return true;
  }, []);
  useEffect(() => {
    if (!selectedMood) { modalEnd.current?.(); modalEnd.current = null; }
  }, [selectedMood]);
  useEffect(() => {
    modalMounted.current = true;
    return () => { modalMounted.current = false; modalEnd.current?.(); modalEnd.current = null; };
  }, []);
  const openTasbih = useCallback(() => { router.push("/tespih"); }, []);

  const handleSearchPress = useCallback(() => {
    logFeature("home_search");
    router.push("/search" as Href);
  }, []);

  // Kur'an-ı Kerim ve Öğren alt sekmelerle aynı işi yaptığı için hızlı kartlardan çıkarıldı.
  const QUICK_ACTIONS: QuickAction[] = useMemo(() => [
    {
      id: "tasbih",
      icon: "radio-button-on-outline",
      label: hs.tasbih,
      tone: "emerald",
      onPress: openTasbih,
    },
    {
      id: "qibla",
      icon: "compass-outline",
      label: hs.qibla,
      route: "/kible",
      tone: "violet",
    },
  ], [openTasbih, hs]);
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
      if (acquireModal()) setSelectedMood({ ...mood, ...result });
    } catch {
      // Fallback: tag aramasına git
      logFeature(AnalyticsEvents.ARAMA);
      router.push({ pathname: "/search", params: { q: tag } });
    } finally {
      setMoodLoading(null);
    }
  }, [moodLoading, acquireModal]);

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
    if (action.onPress) {
      action.onPress();
      return;
    }
    if (action.route) {
      router.push(action.route);
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
    <ScrollView
      ref={scrollRef}
      scrollEventThrottle={32}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.accent}
          colors={[c.accent]}
        />
      }
    >
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={handleSearchPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={hs.searchA11y}
      >
        <Ionicons name="search-outline" size={18} color={c.textMuted} />
        <Text style={[styles.searchText, { color: c.textMuted }]}>{hs.searchPlaceholder}</Text>
      </TouchableOpacity>

      <Text style={[styles.dateLine, { color: c.textMuted }]}>
        {gregorianToday}{hijriLabel ? ` · ${hijriLabel}` : ""}
      </Text>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
          <Text style={[styles.errorBannerText, { color: c.errorText }]}>
            {hs.dailyError}
          </Text>
        </View>
      )}

      <HomeWelcomeCards />

      {/* Streak + Gece modu */}
      <View style={[styles.streakCard, { backgroundColor: f.streak.bg, borderColor: f.streak.border }]}>
        {/* Sabit alev rozeti — animasyonsuz, her donanımda aynı boyutta görünür */}
        <View style={[styles.streakBadge, { backgroundColor: f.streak.badge }]}>
          <Ionicons name="flame" size={22} color={f.streak.icon} />
        </View>
        <View style={{ flex: 1 }}>
          {streak.current > 0 ? (
            <>
              <Text style={[styles.streakTitle, { color: f.streak.title }]}>{fmt(hs.streakDays, { n: streak.current })}</Text>
              <Text style={[styles.streakSub, { color: f.streak.sub }]}>{fmt(hs.streakRecord, { n: streak.longest })}</Text>
            </>
          ) : (
            <Text style={[styles.streakTitle, { color: f.streak.title }]}>{hs.appName}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.75}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={c.isDark ? hs.toLight : hs.toDark}
          style={[styles.themeBtn, {
            backgroundColor: c.cardAlt,
            borderColor: c.border,
          }]}
        >
          <Ionicons
            name={c.isDark ? "sunny" : "moon"}
            size={18}
            color={c.goldText}
          />
        </TouchableOpacity>
      </View>

      {/* Günün Ayeti */}
      <TouchableOpacity
        style={[styles.verseCard, { backgroundColor: f.verse.bg, borderColor: f.verse.border }]}
        onPress={() => verse && router.push(`/ayah/${verse.surah_id}/${verse.ayah_number}`)}
        activeOpacity={0.85}
        disabled={!verse}
        accessibilityRole="button"
        accessibilityLabel={verse ? `${hs.openVerseA11y}. ${surahNameOf(verse.surah_id, verse.surah_name)} ${verse.surah_id}:${verse.ayah_number}. ${mealOf({ surah: verse.surah_id, ayah: verse.ayah_number }, verse.meal ?? "").slice(0, 200)}` : hs.openVerseA11y}
        accessibilityState={{ disabled: !verse }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="sparkles-outline" size={15} color={f.verse.label} />
            <Text style={[styles.cardBadge, { color: f.verse.label }]}>{hs.verseOfDay}</Text>
          </View>
          {verse && <Text style={[styles.cardRef, { color: f.verse.ref }]}>{surahNameOf(verse.surah_id, verse.surah_name)} · {verse.surah_id}:{verse.ayah_number}</Text>}
        </View>
        {!verse ? (
          verseLoading ? <SkeletonAyetCard /> : <Text style={[styles.verseMeal, { color: f.verse.body }]}>{hs.verseFail}</Text>
        ) : (
          <>
            {verse.arabic_text && <Text style={[styles.duaArabic, { color: f.verse.arabic }]}>{mushafMetniHazirla(verse.arabic_text)}</Text>}
            {verse.reading_tr && <Text style={[styles.verseReading, { color: f.verse.arabic }]}>{localizedVerseTranslit({ surah: verse.surah_id, ayah: verse.ayah_number }, verse.reading_tr, lang)}</Text>}
            {verse.meal && <Text style={[styles.verseMeal, { color: f.verse.body }]} numberOfLines={3}>{mealOf({ surah: verse.surah_id, ayah: verse.ayah_number }, verse.meal)}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Namaz Vakitleri (Ruh hâline göre bölümünün üstünde) */}
      <View {...prayerTarget} style={[styles.prayerCard, { backgroundColor: f.prayer.bg, borderColor: f.prayer.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="moon-outline" size={15} color={f.prayer.label} />
            <Text style={[styles.cardBadge, { color: f.prayer.label }]}>{hs.prayerTimes}</Text>
          </View>
          {/* Bildirim ayarları /bildirimler ekranında yönetilir — buraya kısayol. */}
          <TouchableOpacity onPress={() => router.push("/bildirimler")} hitSlop={8} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={hs.prayerNotifA11y}>
            <Ionicons name="notifications-outline" size={19} color={f.prayer.label} />
          </TouchableOpacity>
        </View>
        <View style={[styles.countdownRow, largePrayerText && { flexWrap: "wrap" }]}>
          <Ionicons name="time-outline" size={14} color={f.prayer.icon} />
          <TouchableOpacity
            onPress={() => router.push("/sehir-sec")}
            hitSlop={6}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={cityS.changeCityA11y}
            style={styles.cityBtn}
          >
            <Text numberOfLines={1} style={[styles.countdownCity, { color: f.prayer.strong }]}>{prayerCity}</Text>
            <Ionicons name="chevron-down" size={12} color={f.prayer.icon} />
          </TouchableOpacity>
          {nextPrayer ? (
            <Text numberOfLines={largePrayerText ? undefined : 1} style={[styles.countdown, largePrayerText && { width: "100%" }, { color: f.prayer.strong }]}>
              {largePrayerText ? "" : " · "}{pn["to" + nextPrayer.key] ?? nextPrayer.label}{hs.countdownBefore} <Text style={styles.countdownStrong}>{formatRemaining(nextPrayer.remainingMin, hs)}</Text>{hs.countdownAfter}
            </Text>
          ) : null}
        </View>
        {!prayers && prayerLoading ? (
          <View style={styles.prayerPlaceholder}>
            <ActivityIndicator color={f.prayer.active} />
          </View>
        ) : !prayers ? (
          <View style={styles.prayerPlaceholder}>
            <Text style={[styles.verseMeal, { color: f.prayer.body }]}>
              {hs.prayerFail}
            </Text>
          </View>
        ) : (
          <View style={[styles.prayerRow, largePrayerText && { flexWrap: "wrap", rowGap: 6 }]}>
            {PRAYER_ORDER.map((key, idx) => {
              const isNext = nextPrayer?.key === key;
              // nextPrayerIdx===0 (Fajr) bilerek "geçti" saymıyoruz — hem gün henüz Fajr'a
              // gelmemiş hem de gece yarısından sonra ertesi güne sarkmış olabilir,
              // iki durumda da yanlış soluklaşmayı önlemek daha güvenli.
              const isPassed = nextPrayerIdx > 0 && idx < nextPrayerIdx;
              return (
                <View key={key} style={[
                  styles.prayerItem,
                  largePrayerText && { flex: 0, width: "33.333%", marginHorizontal: 0 },
                  { backgroundColor: f.prayer.chipBg, borderColor: f.prayer.chipBorder },
                  isNext && styles.prayerItemActive,
                  isPassed && styles.prayerItemPassed,
                ]}>
                  <Ionicons
                    name={PRAYER_ICONS[key]}
                    size={15}
                    color={isNext ? "#fff" : (f.prayer.chipLabel)}
                  />
                  <Text numberOfLines={largePrayerText ? undefined : 1} style={[styles.prayerLabel, { color: f.prayer.chipLabel }, isNext && styles.prayerLabelActive]}>{pn[key] ?? PRAYER_LABELS[key]}</Text>
                  <Text style={[styles.prayerTime, { textAlign: "center", width: "100%" }, { color: f.prayer.chipTime }, isNext && styles.prayerTimeActive]}>{prayers[key as keyof typeof prayers]}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Ruh Haline Göre */}
      <View style={[styles.titleRow, styles.sectionHeader]}>
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={c.textMuted} />
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{hs.moodSection}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {RUH_HALI.map(m => (
          <TouchableOpacity
            key={m.tag}
            style={[styles.moodChip, { backgroundColor: c.card, borderColor: c.border, opacity: moodLoading === m.tag ? 0.6 : 1 }]}
            onPress={() => handleMoodPress(m)}
            activeOpacity={0.7}
            disabled={!!moodLoading}
            accessibilityRole="button"
            accessibilityLabel={moodLabel(m)}
            accessibilityState={{ disabled: !!moodLoading, busy: moodLoading === m.tag }}
          >
            {moodLoading === m.tag
              ? <ActivityIndicator size="small" color={c.text} />
              : <Ionicons name={m.icon} size={18} color={toneColors(c, m.tone).fg} />
            }
            <Text style={[styles.moodLabel, { color: c.text }]}>{moodLabel(m)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Günün Duası */}
      <TouchableOpacity
        style={[styles.duaCard, { backgroundColor: f.dua.bg, borderColor: f.dua.border }]}
        onPress={() => dua && router.push(`/ayah/${dua.surah_id}/${dua.ayah_number}`)}
        activeOpacity={0.85}
        disabled={!dua}
        accessibilityRole="button"
        accessibilityLabel={dua ? `${hs.openDuaA11y}. ${surahNameOf(dua.surah_id, dua.surah_name)} ${dua.surah_id}:${dua.ayah_number}. ${mealOf({ surah: dua.surah_id, ayah: dua.ayah_number }, dua.meal ?? "").slice(0, 200)}` : hs.openDuaA11y}
        accessibilityState={{ disabled: !dua }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="hand-left-outline" size={15} color={f.dua.label} />
            <Text style={[styles.cardBadge, { color: f.dua.label }]}>{hs.duaOfDay}</Text>
          </View>
          {dua && <Text style={[styles.cardRef, { color: f.dua.ref }]}>{surahNameOf(dua.surah_id, dua.surah_name)} · {dua.surah_id}:{dua.ayah_number}</Text>}
        </View>
        {!dua ? (
          duaLoading ? <SkeletonAyetCard /> : <Text style={[styles.verseMeal, { color: f.dua.body }]}>{hs.duaFail}</Text>
        ) : (
          <>
            {dua.arabic_text && <Text style={[styles.duaArabic, { color: f.dua.arabic }]}>{mushafMetniHazirla(dua.arabic_text)}</Text>}
            {dua.reading_tr && <Text style={[styles.verseReading, { color: f.dua.arabic }]}>{localizedVerseTranslit({ surah: dua.surah_id, ayah: dua.ayah_number }, dua.reading_tr, lang)}</Text>}
            {dua.meal && <Text style={[styles.verseMeal, { color: f.dua.body }]} numberOfLines={3}>{mealOf({ surah: dua.surah_id, ayah: dua.ayah_number }, dua.meal)}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Bugün ne yapmak istiyorsun? */}
      <View style={[styles.quickWidget, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.quickTitle, { color: c.textMuted }]}>{hs.quickTitle}</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity
              key={a.id}
              {...(a.id === "qibla" ? qiblaTarget : {})}
              style={[styles.quickBtn, { backgroundColor: c.cardAlt, borderColor: c.border }]}
              onPress={() => handleQuickActionPress(a)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: toneColors(c, a.tone).bg }]}>
                <Ionicons name={a.icon} size={22} color={toneColors(c, a.tone).fg} />
              </View>
              <Text style={[styles.quickLabel, { color: c.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
    <Modal
      visible={!!selectedMood}
      transparent
      animationType="fade"
      onRequestClose={closeMoodCard}
    >
      <View style={styles.moodModalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMoodCard} accessibilityRole="button" accessibilityLabel={hs.close} />
        {selectedMood && (
          <View style={[styles.moodModalCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.moodModalHeader}>
              <View style={[styles.moodModalIcon, { backgroundColor: toneColors(c, selectedMood.tone).bg }]}>
                <Ionicons name={selectedMood.icon} size={22} color={toneColors(c, selectedMood.tone).fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moodModalTitle, { color: c.text }]}>{moodLabel(selectedMood)}</Text>
                <Text style={[styles.moodModalSub, { color: c.textMuted }]}>{hs.mealBy}</Text>
              </View>
              <CloseButton onPress={closeMoodCard} accessibilityLabel={hs.close} />
            </View>

            <TouchableOpacity
              onPress={openMoodAyah}
              activeOpacity={0.75}
              style={[styles.moodAyahLink, { backgroundColor: c.cardAlt, borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityLabel={hs.openAyah}
            >
              <Text style={[styles.moodAyahLinkText, { color: c.goldText }]}>
                {surahNameOf(selectedMood.surah_id, selectedMood.surah_name) ?? hs.ayah} · {selectedMood.surah_id}:{selectedMood.ayah_number}
              </Text>
              <Ionicons name="open-outline" size={16} color={c.goldText} />
            </TouchableOpacity>

            <Text style={[styles.moodMeal, { color: c.text }]}>
              {mealOf({ surah: selectedMood.surah_id, ayah: selectedMood.ayah_number }, selectedMood.meal) || hs.mealFail}
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
  content:   { padding: space.gutter, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  searchBar:  { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14,
                borderWidth: 1, minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 },
  searchText: { fontSize: 14, flex: 1 },
  dateLine:   { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 12 },

  streakCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, marginBottom: 12,
  },
  streakBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  streakTitle: { fontSize: 14, fontWeight: "700" },
  streakSub:   { fontSize: 11, marginTop: 2 },

  verseCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  titleRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  cardBadge: { fontSize: 13, fontWeight: "700" },
  cardRef:   { fontSize: 11 },
  verseReading: { fontSize: 13, fontStyle: "italic", marginBottom: 6, lineHeight: 20 },
  verseMeal:    { fontSize: 13, lineHeight: 20 },

  prayerCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cityBtn: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 1 },
  countdown: { fontSize: 14, flexShrink: 1 },
  countdownCity: { fontWeight: "700" },
  countdownStrong: { fontWeight: "800" },
  prayerRow:  { flexDirection: "row", marginTop: 10 },
  // Yüklenirken/hatada yükseklik, dolu satırla aynı kalsın (içerik zıplamasın)
  prayerPlaceholder: { minHeight: 72, marginTop: 10, alignItems: "center", justifyContent: "center" },
  prayerItem: {
    flex: 1, alignItems: "center", gap: 3, paddingVertical: 9,
    marginHorizontal: 2.5, borderRadius: 12, borderWidth: 1,
  },
  prayerItemActive:    { backgroundColor: "#4f46e5", borderColor: "#4f46e5" }, // = featureColors().prayer.active
  prayerItemPassed:    { opacity: 0.45 },
  prayerLabel:         { fontSize: 10, fontWeight: "600" },
  prayerLabelActive:   { color: "#fff" },
  prayerTime:          { fontSize: 11.5, fontWeight: "700" },
  prayerTimeActive:    { color: "#fff" },

  duaCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  // Günün Ayeti ve Günün Duası: ikisi de canonical Hafs metni. Amiri, Hafs
  // imlasının işaretlerini (hançer elif U+0670, küçük vav/ye U+06E5/06E6)
  // taşıyamadığı için harekeler harften kopup yukarıda ayrı bir şerit
  // oluşturuyordu — mushafla aynı fonta alındı.
  duaArabic: { fontSize: 18, textAlign: "right", writingDirection: "rtl", lineHeight: 36, marginBottom: 8, fontFamily: "UthmanicHafs" },

  themeBtn:     { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionHeader:{ marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700" },
  moodChip:  { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, marginRight: 8 },
  moodLabel: { fontSize: 13, fontWeight: "600" },
  moodModalBackdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.45)" },
  moodModalCard: { width: "100%", maxWidth: 420, alignSelf: "center", borderRadius: 16, borderWidth: 1, padding: 18, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  moodModalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  moodModalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  moodModalTitle: { fontSize: 17, fontWeight: "800" },
  moodModalSub: { fontSize: 12, marginTop: 2 },
  moodAyahLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  moodAyahLinkText: { fontSize: 13, fontWeight: "800" },
  moodMeal: { fontSize: 15, lineHeight: 24 },

  // Sayfanın son kartı: alttaki boşluğu yalnız içerik dolgusu (paddingBottom) verir
  quickWidget: { borderRadius: 14, borderWidth: 1, padding: 14 },
  quickTitle:  { fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  quickGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn:    { flexBasis: "48%", flexGrow: 1, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", gap: 8 },
  quickIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  quickLabel:  { fontSize: 12, fontWeight: "600", textAlign: "center" },
  errorBanner:     { borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1 },
  errorBannerText: { fontSize: 13, textAlign: "center" },
});

