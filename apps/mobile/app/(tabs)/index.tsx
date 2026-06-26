import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStreak } from "../../src/hooks/useStreak";
import { useDailyContent } from "../../src/hooks/useDailyContent";
import { useColors, toggleTheme } from "../../src/hooks/useColors";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import { SkeletonAyetCard } from "../../src/components/SkeletonLoader";
import { api } from "../../src/lib/api";
import { requestNotificationPermission, sendTestNotification } from "../../src/lib/namazNotifications";
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


const PRAYER_ORDER = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

const RUH_HALI = [
  { emoji: "😌", label: "Huzur",           tag: "rahmet",   bg: "#d1fae5" },
  { emoji: "💪", label: "Sabır",           tag: "sabır",    bg: "#fef3c7" },
  { emoji: "🙏", label: "Tövbe",           tag: "tövbe",    bg: "#ede9fe" },
  { emoji: "🌟", label: "Şükür",           tag: "şükür",    bg: "#fef9c3" },
  { emoji: "⚖️", label: "Adalet",          tag: "adalet",   bg: "#e0e7ff" },
  { emoji: "💔", label: "Geçim Sıkıntısı", tag: "rızık",    bg: "#ffe4e6" },
  { emoji: "🧭", label: "Hidayet",         tag: "hidayet",  bg: "#ffedd5" },
  { emoji: "🤲", label: "Dua",             tag: "dua",      bg: "#cffafe" },
  { emoji: "📿", label: "Zikir",           tag: "zikir",    bg: "#fae8ff" },
  { emoji: "🍃", label: "Tevekkül",        tag: "tevekkül", bg: "#ecfccb" },
];

function HomeContent() {
  const c          = useColors();
  const { streak } = useStreak();
  const { verse, dua, prayers, nextPrayer, prayerCity, PRAYER_LABELS, error } = useDailyContent();
  const [moodLoading, setMoodLoading] = useState<string | null>(null);
  const [tasbihOpen, setTasbihOpen]   = useState(false);

  const openTasbih = useCallback(() => setTasbihOpen(true), []);

  const QUICK_ACTIONS: { emoji: string; label: string; bg: string; route?: string; onPress?: () => void }[] = [
    { emoji: "📖", label: "Kur'an-ı Kerim", route: "/sure-listesi", bg: "#d1fae5" },
    { emoji: "🎓", label: "Öğren",          route: "/ne-ogreneyim", bg: "#fef3c7" },
    { emoji: "📿", label: "Tespih",         bg: "#dcfce7",          onPress: openTasbih },
    { emoji: "🧭", label: "Kıble",          route: "/kible",        bg: "#ede9fe" },
  ];
  // Tag bazında gösterilen TÜM ayetler — exclude olarak gönderilir, böylece o tag'in
  // havuzu bitene kadar aynı ayet bir daha gelmez. Havuz tükenince (hepsi exclude'da →
  // sunucu "ayet bulunamadı" döner) ilgili tag sıfırlanıp yeni tur başlar.
  // Ayrıca her istek benzersiz olduğundan no-store'a rağmen oluşan kısa-pencere cache'i atlanır.
  const moodSeen = useRef<Record<string, string[]>>({});

  useEffect(() => { logScreen('AnaSayfa'); }, []);

  const handleMoodPress = useCallback(async (tag: string) => {
    if (moodLoading) return;
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
      router.push({
        pathname: "/ayah/[surahId]/[ayahNumber]",
        params: { surahId: result.surah_id, ayahNumber: result.ayah_number },
      });
    } catch {
      // Fallback: tag aramasına git
      logFeature(AnalyticsEvents.ARAMA);
      router.push({ pathname: "/search", params: { q: tag } });
    } finally {
      setMoodLoading(null);
    }
  }, [moodLoading]);

  // Sadece geliştirme (__DEV__) — 5 sn sonra test bildirimi düşürür.
  const handleTestNotif = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (!granted) { Alert.alert("İzin Gerekli", "Test için bildirim izni gerekli."); return; }
    await sendTestNotification();
    Alert.alert("Test Planlandı", "5 saniye içinde bir test bildirimi gelecek. İstersen uygulamayı arka plana al.");
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Günlük içerik yüklenemedi. İnternet bağlantınızı kontrol edin.</Text>
        </View>
      )}

      {/* Test butonu — YALNIZCA geliştirme (__DEV__). APK/AAB'de görünmez. */}
      {__DEV__ && (
        <TouchableOpacity onPress={handleTestNotif} style={styles.testNotifBtn} activeOpacity={0.7}>
          <Text style={styles.testNotifText}>🔔 Bildirimi Test Et (5 sn) · DEV</Text>
        </TouchableOpacity>
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
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardBadge, { color: c.isDark ? "#fbbf24" : "#92400e" }]}>✨ Günün Ayeti</Text>
          {verse && <Text style={[styles.cardRef, { color: c.isDark ? "#d97706" : "#a16207" }]}>{verse.surah_name} · {verse.surah_id}:{verse.ayah_number}</Text>}
        </View>
        {!verse ? (
          <SkeletonAyetCard />
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
            style={[styles.moodChip, { backgroundColor: c.isDark ? c.cardAlt : m.bg, opacity: moodLoading === m.tag ? 0.6 : 1 }]}
            onPress={() => handleMoodPress(m.tag)}
            activeOpacity={0.7}
            disabled={!!moodLoading}
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
      <View style={[styles.prayerCard, { backgroundColor: c.isDark ? "#0f0a2a" : "#eef2ff", borderColor: c.isDark ? "#3730a3" : "#a5b4fc" }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardBadge, { color: c.isDark ? "#818cf8" : "#3730a3" }]}>🕌 Namaz Vakitleri</Text>
          <Text style={[styles.cardRef, { color: c.isDark ? "#6366f1" : "#4338ca" }]}>{prayerCity}{nextPrayer ? ` · Sonraki: ${nextPrayer.label} ${nextPrayer.time}` : ""}</Text>
        </View>
        {!prayers ? (
          <ActivityIndicator color="#4f46e5" style={{ marginVertical: 8 }} />
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

        {/* Bildirim toggle'ı /namaz ekranında — buraya kısayol (eskiden erişilemiyordu) */}
        <TouchableOpacity onPress={() => router.push("/namaz")} activeOpacity={0.7} style={styles.prayerNotifLink}>
          <Text style={[styles.prayerNotifLinkText, { color: c.isDark ? "#a5b4fc" : "#4338ca" }]}>🔔 Namaz vakti bildirimleri →</Text>
        </TouchableOpacity>
      </View>

      {/* Günün Duası */}
      <TouchableOpacity
        style={[styles.duaCard, { backgroundColor: c.isDark ? "#042f2e" : "#f0fdfa", borderColor: c.isDark ? "#0f766e" : "#5eead4" }]}
        onPress={() => dua && router.push(`/ayah/${dua.surah_id}/${dua.ayah_number}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardBadge, { color: c.isDark ? "#2dd4bf" : "#0f766e" }]}>🤲 Günün Duası</Text>
          {dua && <Text style={[styles.cardRef, { color: c.isDark ? "#14b8a6" : "#0d9488" }]}>{dua.surah_name} · {dua.surah_id}:{dua.ayah_number}</Text>}
        </View>
        {!dua ? (
          <SkeletonAyetCard />
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
              key={a.label}
              style={[styles.quickBtn, { backgroundColor: c.isDark ? c.cardAlt : a.bg }]}
              onPress={() => {
                Haptics.selectionAsync();
                if (a.onPress) { a.onPress(); return; }
                if (a.route) router.push(a.route as any);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.quickEmoji}>{a.emoji}</Text>
              <Text style={[styles.quickLabel, { color: c.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dersler — featured kart */}
      <TouchableOpacity
        style={[styles.derslerCard, { backgroundColor: c.card, borderColor: "#c9a84c" }]}
        onPress={() => { Haptics.selectionAsync(); router.push("/dersler" as any); }}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.derslerTitle}>📚 Dersler — İslam'ı Öğren</Text>
          <Text style={[styles.derslerSub, { color: c.textMuted }]}>Kart kart öğren, kendini test et</Text>
        </View>
        <Text style={styles.derslerChev}>›</Text>
      </TouchableOpacity>
    </ScrollView>
    <TasbihModal visible={tasbihOpen} onClose={() => setTasbihOpen(false)} />
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
  content:   { padding: 16, paddingBottom: 32 },


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
  moodChip:  { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  moodLabel: { fontSize: 13, fontWeight: "600" },
  testNotifBtn:  { marginBottom: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fca5a5", backgroundColor: "#fef2f2", alignItems: "center" },
  testNotifText: { fontSize: 13, fontWeight: "600", color: "#b91c1c" },

  quickWidget: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
  quickTitle:  { fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  quickGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn:    { width: "47%", borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  quickEmoji:  { fontSize: 30, lineHeight: 36 },
  quickLabel:  { fontSize: 12, fontWeight: "600", textAlign: "center" },
  errorBanner:     { backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#fca5a5" },
  errorBannerText: { fontSize: 13, color: "#b91c1c", textAlign: "center" },
  derslerCard:   { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1.5,
                   paddingVertical: 16, paddingHorizontal: 14, marginBottom: 16 },
  derslerTitle:  { fontSize: 15, fontWeight: "800", color: "#c9a84c", marginBottom: 4 },
  derslerSub:    { fontSize: 12 },
  derslerChev:   { fontSize: 24, color: "#c9a84c", fontWeight: "600" },
});
