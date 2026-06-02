import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useStreak } from "../../src/hooks/useStreak";
import { useDailyContent } from "../../src/hooks/useDailyContent";
import { useColors, toggleTheme } from "../../src/hooks/useColors";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";

const NAV_CARDS: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  route: string;
  bg: string;
  border: string;
}[] = [
  { label: "Sureler",        icon: "book-open-page-variant", iconColor: "#065f46", route: "/surah",     bg: "#d1fae5", border: "#6ee7b7" },
  { label: "Keşfet",         icon: "magnify-expand",         iconColor: "#1e40af", route: "/kesfet",    bg: "#dbeafe", border: "#93c5fd" },
  { label: "Elif-Ba",        icon: "abjad-arabic",           iconColor: "#92400e", route: "/ogren",     bg: "#fef3c7", border: "#fcd34d" },
  { label: "Kelime Kökü",    icon: "family-tree",            iconColor: "#78350f", route: "/root",      bg: "#fef3c7", border: "#fcd34d" },
  { label: "Hatim & Mushaf", icon: "book-multiple-outline",  iconColor: "#14532d", route: "/hatim",     bg: "#f0fdf4", border: "#86efac" },
  { label: "Kıble",          icon: "compass-rose",           iconColor: "#164e63", route: "/kible",     bg: "#ecfeff", border: "#67e8f9" },
  { label: "Favorilerim",    icon: "heart-circle-outline",   iconColor: "#9f1239", route: "/favorites", bg: "#fff1f2", border: "#fca5a5" },
];

const PRAYER_ORDER = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

const RUH_HALI = [
  { emoji: "😌", label: "Huzur",           tag: "rahmet",  bg: "#d1fae5" },
  { emoji: "💪", label: "Sabır",           tag: "sabır",   bg: "#fef3c7" },
  { emoji: "🙏", label: "Tövbe",           tag: "tövbe",   bg: "#ede9fe" },
  { emoji: "🌟", label: "Şükür",           tag: "şükür",   bg: "#fef9c3" },
  { emoji: "⚖️", label: "Adalet",          tag: "adalet",  bg: "#e0e7ff" },
  { emoji: "💔", label: "Geçim Sıkıntısı", tag: "rızık",   bg: "#ffe4e6" },
];

function HomeContent() {
  const c          = useColors();
  const { streak } = useStreak();
  const { verse, dua, prayers, nextPrayer, prayerCity, PRAYER_LABELS } = useDailyContent();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}

    >
      {/* Streak + Gece modu */}
      <View style={[styles.streakCard, { backgroundColor: c.isDark ? "#431407" : "#fff7ed", borderColor: c.isDark ? "#7c2d12" : "#fed7aa" }]}>
        <Text style={styles.streakEmoji}>🔥</Text>
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
          <ActivityIndicator color="#d97706" style={{ marginVertical: 12 }} />
        ) : (
          <>
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
            style={[styles.moodChip, { backgroundColor: c.isDark ? c.cardAlt : m.bg }]}
            onPress={() => router.push(`/search?tag=${encodeURIComponent(m.tag)}` as any)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
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
          <ActivityIndicator color="#0d9488" style={{ marginVertical: 12 }} />
        ) : (
          <>
            {dua.arabic_text && <Text style={[styles.duaArabic, { color: c.isDark ? "#99f6e4" : "#134e4a" }]}>{dua.arabic_text}</Text>}
            {dua.meal && <Text style={[styles.verseMeal, { color: c.isDark ? "#ccfbf1" : "#134e4a" }]} numberOfLines={3}>{dua.meal}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Navigasyon kartları */}
      <View style={styles.grid}>
        {NAV_CARDS.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={[styles.card, { backgroundColor: c.isDark ? c.card : card.bg, borderColor: c.isDark ? c.border : card.border }]}
            onPress={() => router.push(card.route as any)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name={card.icon} size={36} color={c.isDark ? c.accent : card.iconColor} />
            <Text style={[styles.cardLabel, { color: c.text }]}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
  content:   { padding: 16, paddingTop: 48, paddingBottom: 32 },


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

  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card:      { width: "47%", borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: "center", gap: 6, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
