import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useStreak } from "../../src/hooks/useStreak";
import { useDailyContent } from "../../src/hooks/useDailyContent";

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
  { label: "Hatim & Mushaf", icon: "book-multiple-outline",   iconColor: "#14532d", route: "/hatim",     bg: "#f0fdf4", border: "#86efac" },
  { label: "Kıble",          icon: "compass-rose",           iconColor: "#164e63", route: "/kible",     bg: "#ecfeff", border: "#67e8f9" },
  { label: "Favorilerim",    icon: "heart-circle-outline",   iconColor: "#9f1239", route: "/favorites", bg: "#fff1f2", border: "#fca5a5" },
];

const PRAYER_ORDER = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

export default function HomeScreen() {
  const streak = useStreak();
  const { verse, dua, prayers, nextPrayer, PRAYER_LABELS } = useDailyContent();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>📖</Text>
        <Text style={styles.heroTitle}>Kuran Analiz</Text>
        <Text style={styles.heroSub}>Türkçe meal · Kelime analizi · Dua kategorileri</Text>
      </View>

      {/* Streak */}
      {streak.current > 0 && (
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>{streak.current} günlük seri!</Text>
            <Text style={styles.streakSub}>Rekor: {streak.longest} gün</Text>
          </View>
        </View>
      )}

      {/* Günün Ayeti */}
      <TouchableOpacity
        style={styles.verseCard}
        onPress={() => verse && router.push(`/ayah/${verse.surah_id}/${verse.ayah_number}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardBadge}>✨ Günün Ayeti</Text>
          {verse && <Text style={styles.cardRef}>{verse.surah_name} · {verse.surah_id}:{verse.ayah_number}</Text>}
        </View>
        {!verse ? (
          <ActivityIndicator color="#d97706" style={{ marginVertical: 12 }} />
        ) : (
          <>
            {verse.reading_tr && <Text style={styles.verseReading}>{verse.reading_tr}</Text>}
            {verse.meal && <Text style={styles.verseMeal} numberOfLines={3}>{verse.meal}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Namaz Vakitleri */}
      <View style={styles.prayerCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardBadge}>🕌 Namaz Vakitleri</Text>
          <Text style={styles.cardRef}>İstanbul{nextPrayer ? ` · Sonraki: ${nextPrayer.label} ${nextPrayer.time}` : ""}</Text>
        </View>
        {!prayers ? (
          <ActivityIndicator color="#4f46e5" style={{ marginVertical: 8 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {PRAYER_ORDER.map((key) => {
              const isNext = nextPrayer?.label === PRAYER_LABELS[key];
              return (
                <View key={key} style={[styles.prayerItem, isNext && styles.prayerItemActive]}>
                  <Text style={[styles.prayerLabel, isNext && styles.prayerLabelActive]}>{PRAYER_LABELS[key]}</Text>
                  <Text style={[styles.prayerTime, isNext && styles.prayerTimeActive]}>{prayers[key as keyof typeof prayers]}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Günün Duası */}
      <TouchableOpacity
        style={styles.duaCard}
        onPress={() => dua && router.push(`/ayah/${dua.surah_id}/${dua.ayah_number}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardBadge}>🤲 Günün Duası</Text>
          {dua && <Text style={styles.cardRef}>{dua.surah_name} · {dua.surah_id}:{dua.ayah_number}</Text>}
        </View>
        {!dua ? (
          <ActivityIndicator color="#0d9488" style={{ marginVertical: 12 }} />
        ) : (
          <>
            {dua.arabic_text && (
              <Text style={styles.duaArabic} dir="rtl">{dua.arabic_text}</Text>
            )}
            {dua.meal && <Text style={styles.verseMeal} numberOfLines={3}>{dua.meal}</Text>}
          </>
        )}
      </TouchableOpacity>

      {/* Navigasyon kartları */}
      <View style={styles.grid}>
        {NAV_CARDS.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={[styles.card, { backgroundColor: card.bg, borderColor: card.border }]}
            onPress={() => router.push(card.route)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name={card.icon} size={36} color={card.iconColor} />
            <Text style={styles.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  content:   { padding: 16, paddingBottom: 32 },

  hero:      { alignItems: "center", paddingVertical: 20 },
  heroIcon:  { fontSize: 44, marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  heroSub:   { fontSize: 12, color: "#78716c", textAlign: "center" },

  streakCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff7ed", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#fed7aa", marginBottom: 12,
  },
  streakEmoji: { fontSize: 26 },
  streakTitle: { fontSize: 14, fontWeight: "700", color: "#9a3412" },
  streakSub:   { fontSize: 11, color: "#c2410c", marginTop: 2 },

  // Günün Ayeti
  verseCard: {
    backgroundColor: "#fffbeb", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#fcd34d", marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardBadge:  { fontSize: 13, fontWeight: "700", color: "#92400e" },
  cardRef:    { fontSize: 11, color: "#a16207" },
  verseReading: { fontSize: 13, color: "#78350f", fontStyle: "italic", marginBottom: 6, lineHeight: 20 },
  verseMeal:    { fontSize: 13, color: "#451a03", lineHeight: 20 },

  // Namaz
  prayerCard: {
    backgroundColor: "#eef2ff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#a5b4fc", marginBottom: 12,
  },
  prayerItem: {
    alignItems: "center", paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, borderRadius: 10, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e0e7ff", minWidth: 64,
  },
  prayerItemActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  prayerLabel: { fontSize: 11, color: "#6366f1", fontWeight: "600" },
  prayerLabelActive: { color: "#fff" },
  prayerTime:  { fontSize: 13, color: "#312e81", fontWeight: "700", marginTop: 2 },
  prayerTimeActive: { color: "#fff" },

  // Günün Duası
  duaCard: {
    backgroundColor: "#f0fdfa", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#5eead4", marginBottom: 16,
  },
  duaArabic: { fontSize: 18, color: "#134e4a", textAlign: "right", lineHeight: 32, marginBottom: 8 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47%", borderRadius: 14, borderWidth: 1.5,
    padding: 16, alignItems: "center", gap: 6,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, fontWeight: "600", color: "#1c1917", textAlign: "center" },
});
