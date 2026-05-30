"use client";
import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { router, Stack } from "expo-router";
import { api } from "../src/lib/api";

// ── Veri ─────────────────────────────────────────────────────────────────────

const REHBERLER = [
  { emoji: "🛡️", label: "Manevi Sığınak",  sub: "Korunma, şifa ve istiaze",   route: "/manevi-siginak"           as const, bg: "#fce7f3", border: "#f9a8d4" },
  { emoji: "🕋", label: "İsmi Azam",         sub: "Sahih dualar ve uygulamalar", route: "/manevi-siginak/ismi-azam" as const, bg: "#fef3c7", border: "#fcd34d" },
  { emoji: "📿", label: "İbadet Rehberi",    sub: "Namaz, oruç, zekât, abdest",  route: "/ibadet-rehberi"           as const, bg: "#f0fdf4", border: "#86efac" },
  { emoji: "🕌", label: "Namaz & Duaları",   sub: "Namaz sureleri ve vakitleri",  route: "/namaz"                    as const, bg: "#e0e7ff", border: "#a5b4fc" },
];

const DUA_CATS = [
  { emoji: "🛡️", id: "korunma",   label: "Korunma ve Sığınma",    tag: "korunma-genel", renk: "#dbeafe" },
  { emoji: "👤", id: "peygamber", label: "Peygamber Duaları",      tag: "dua-kabul",     renk: "#fef3c7" },
  { emoji: "🤲", id: "rabbena",   label: "Rabbena Duaları",        tag: "dua-sabır",     renk: "#f0fdf4" },
  { emoji: "💚", id: "sifa",      label: "Şifa ve Sıkıntı",        tag: "dua-şifa",      renk: "#dcfce7" },
  { emoji: "⚓", id: "tevekkul",  label: "Tevekkül ve Teslimiyet", tag: "tevekkül",      renk: "#ede9fe" },
  { emoji: "📿", id: "zikir",     label: "Zikir ve Tesbih",        tag: "zikir",         renk: "#fce7f3" },
];

const RUH_HALI = [
  { emoji: "😌", label: "Huzur",           tag: "rahmet",  bg: "#d1fae5" },
  { emoji: "💪", label: "Sabır",           tag: "sabır",   bg: "#fef3c7" },
  { emoji: "🙏", label: "Tövbe",           tag: "tövbe",   bg: "#ede9fe" },
  { emoji: "🌟", label: "Şükür",           tag: "şükür",   bg: "#fef9c3" },
  { emoji: "⚖️", label: "Adalet",          tag: "adalet",  bg: "#e0e7ff" },
  { emoji: "💔", label: "Geçim Sıkıntısı", tag: "rızık",   bg: "#ffe4e6" },
];

// ── Accordion ─────────────────────────────────────────────────────────────────

interface VerseItem { verse_key: string; surah_id: number; ayah_number: number; surah_name: string | null; meal: string | null; }

function DuaAccordion({ emoji, label, tag, renk }: { emoji: string; label: string; tag: string; renk: string }) {
  const [open, setOpen]       = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [verses, setVerses]   = React.useState<VerseItem[]>([]);
  const [fetched, setFetched] = React.useState(false);

  const onPress = React.useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) {
      setLoading(true);
      try {
        const res = await api.tags.filter(tag);
        const items: VerseItem[] = (res.results ?? []).slice(0, 20).map(r => ({
          verse_key: r.verse_key,
          surah_id: r.surah_id,
          ayah_number: r.ayah_number,
          surah_name: r.surah_name,
          meal: r.meal,
        }));
        setVerses(items);
      } catch (e) {
        console.log("DuaAccordion error:", e);
      }
      setLoading(false);
      setFetched(true);
    }
  }, [open, fetched, tag]);

  return (
    <View style={[styles.accordion, { borderLeftColor: renk }]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.accordionEmoji}>{emoji}</Text>
        <Text style={styles.accordionTitle}>{label}</Text>
        <Text style={styles.accordionChev}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.accordionBody}>
          {loading && <ActivityIndicator color="#059669" style={{ marginVertical: 10 }} />}
          {!loading && verses.length === 0 && fetched && (
            <Text style={styles.emptyText}>Ayet bulunamadı.</Text>
          )}
          {!loading && verses.map(v => (
            <TouchableOpacity
              key={v.verse_key}
              style={styles.verseRow}
              onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.verseKeyBox}>
                <Text style={styles.verseKeyText}>{v.verse_key}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {v.surah_name ? <Text style={styles.verseSurah}>{v.surah_name}</Text> : null}
                {v.meal ? <Text style={styles.verseMeal} numberOfLines={2}>{v.meal}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Ekran ─────────────────────────────────────────────────────────────────────

export default function KesfetScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Keşfet" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Özel Rehberler */}
        <Text style={styles.sectionTitle}>✨ Özel Rehberler</Text>
        <View style={styles.rehberGrid}>
          {REHBERLER.map(r => (
            <TouchableOpacity
              key={r.route}
              style={[styles.rehberCard, { backgroundColor: r.bg, borderColor: r.border }]}
              onPress={() => router.push(r.route)}
              activeOpacity={0.75}
            >
              <Text style={styles.rehberEmoji}>{r.emoji}</Text>
              <Text style={styles.rehberLabel}>{r.label}</Text>
              <Text style={styles.rehberSub}>{r.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dua Kategorileri */}
        <Text style={styles.sectionTitle}>🤲 Dua Kategorileri</Text>
        {DUA_CATS.map(cat => (
          <DuaAccordion
            key={cat.id}
            emoji={cat.emoji}
            label={cat.label}
            tag={cat.tag}
            renk={cat.renk}
          />
        ))}

        {/* Ruh Haline Göre */}
        <Text style={styles.sectionTitle}>💭 Ruh Haline Göre</Text>
        <View style={styles.moodGrid}>
          {RUH_HALI.map(m => (
            <TouchableOpacity
              key={m.tag}
              style={[styles.moodChip, { backgroundColor: m.bg }]}
              onPress={() => router.push(`/search?tag=${encodeURIComponent(m.tag)}` as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  content:   { padding: 14, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#78716c",
    textTransform: "uppercase", letterSpacing: 0.5,
    marginTop: 20, marginBottom: 10,
  },

  rehberGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rehberCard:  { width: "47%", borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 4 },
  rehberEmoji: { fontSize: 28 },
  rehberLabel: { fontSize: 13, fontWeight: "700", color: "#1c1917" },
  rehberSub:   { fontSize: 11, color: "#78716c" },

  accordion: {
    borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4",
    borderLeftWidth: 4, backgroundColor: "#fff",
    marginBottom: 8, overflow: "hidden",
  },
  accordionHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  accordionEmoji:  { fontSize: 20 },
  accordionTitle:  { flex: 1, fontSize: 14, fontWeight: "600", color: "#1c1917" },
  accordionChev:   { fontSize: 14, color: "#059669" },
  accordionBody:   { borderTopWidth: 1, borderTopColor: "#f0f0f0", padding: 10 },
  emptyText:       { fontSize: 13, color: "#a8a29e", padding: 8 },

  verseRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4",
  },
  verseKeyBox:  { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  verseKeyText: { fontSize: 11, fontWeight: "700", color: "#065f46" },
  verseSurah:   { fontSize: 11, color: "#78716c", marginBottom: 2 },
  verseMeal:    { fontSize: 13, color: "#292524", lineHeight: 19 },

  moodGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 },
  moodChip:  { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  moodLabel: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
});
