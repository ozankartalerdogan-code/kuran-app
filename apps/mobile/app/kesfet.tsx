import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState, useCallback } from "react";
import { router, Stack } from "expo-router";
import { api, type TagFilterResult } from "../src/lib/api";

// ── Özel Rehberler ────────────────────────────────────────────────────────────
const REHBERLER = [
  { emoji: "🛡️", label: "Manevi Sığınak",  sub: "Korunma, şifa ve istiaze",  route: "/manevi-siginak",           bg: "#fce7f3", border: "#f9a8d4" },
  { emoji: "🕋", label: "İsmi Azam",         sub: "Sahih dualar ve uygulamalar",route: "/manevi-siginak/ismi-azam", bg: "#fef3c7", border: "#fcd34d" },
  { emoji: "📿", label: "İbadet Rehberi",    sub: "Namaz, oruç, zekât, abdest", route: "/ibadet-rehberi",           bg: "#f0fdf4", border: "#86efac" },
  { emoji: "🕌", label: "Namaz & Duaları",   sub: "Namaz sureleri ve vakitleri", route: "/namaz",                   bg: "#e0e7ff", border: "#a5b4fc" },
];

// ── Dua Kategorileri ──────────────────────────────────────────────────────────
const DUA_CATS = [
  { emoji: "🛡️", id: "korunma",   label: "Korunma ve Sığınma",    tag: "korunma-genel",  renk: "#dbeafe" },
  { emoji: "👤", id: "peygamber", label: "Peygamber Duaları",      tag: "dua-kabul",      renk: "#fef3c7" },
  { emoji: "🤲", id: "rabbena",   label: "Rabbena Duaları",        tag: "dua-sabır",      renk: "#f0fdf4" },
  { emoji: "💚", id: "sifa",      label: "Şifa ve Sıkıntı",        tag: "dua-şifa",       renk: "#dcfce7" },
  { emoji: "⚓", id: "tevekkul",  label: "Tevekkül ve Teslimiyet", tag: "tevekkül",       renk: "#ede9fe" },
  { emoji: "📿", id: "zikir",     label: "Zikir ve Tesbih",        tag: "zikir",          renk: "#fce7f3" },
];

// ── Ruh Hali ─────────────────────────────────────────────────────────────────
const RUH_HALI = [
  { emoji: "😌", label: "Huzur & Rahmet",  tag: "rahmet",  bg: "#d1fae5" },
  { emoji: "💪", label: "Sabır",           tag: "sabır",   bg: "#fef3c7" },
  { emoji: "🙏", label: "Tövbe",           tag: "tövbe",   bg: "#ede9fe" },
  { emoji: "🌟", label: "Şükür",           tag: "şükür",   bg: "#fef9c3" },
  { emoji: "⚖️", label: "Adalet",          tag: "adalet",  bg: "#e0e7ff" },
  { emoji: "💔", label: "Geçim Sıkıntısı", tag: "rızık",   bg: "#ffe4e6" },
];

// ── Accordion bileşeni ────────────────────────────────────────────────────────
function DuaAccordion({ cat }: { cat: typeof DUA_CATS[0] }) {
  const [open, setOpen]       = useState(false);
  const [verses, setVerses]   = useState<TagFilterResult[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!open && verses.length === 0) {
      setLoading(true);
      try {
        const res = await api.tags.filter(cat.tag);
        setVerses(res.results.slice(0, 20));
      } catch {}
      setLoading(false);
    }
    setOpen(p => !p);
  }, [open, verses, cat.tag]);

  return (
    <View style={[s.accordion, { borderColor: cat.renk }]}>
      <TouchableOpacity style={s.accordionHeader} onPress={toggle} activeOpacity={0.75}>
        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
        <Text style={s.accordionTitle}>{cat.label}</Text>
        <Text style={s.accordionChev}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.accordionBody}>
          {loading ? (
            <ActivityIndicator color="#059669" style={{ marginVertical: 12 }} />
          ) : verses.length === 0 ? (
            <Text style={s.emptyText}>Ayet bulunamadı.</Text>
          ) : (
            verses.map(v => (
              <TouchableOpacity
                key={v.verse_key}
                style={s.verseRow}
                onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}`)}
                activeOpacity={0.7}
              >
                <View style={s.verseKey}>
                  <Text style={s.verseKeyText}>{v.verse_key}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {v.surah_name && <Text style={s.verseSurah} numberOfLines={1}>{v.surah_name}</Text>}
                  {v.meal && <Text style={s.verseMeal} numberOfLines={2}>{v.meal}</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────
export default function KesfetScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Keşfet" }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Özel Rehberler */}
        <Text style={s.sectionTitle}>✨ Özel Rehberler</Text>
        <View style={s.rehberGrid}>
          {REHBERLER.map(r => (
            <TouchableOpacity
              key={r.route}
              style={[s.rehberCard, { backgroundColor: r.bg, borderColor: r.border }]}
              onPress={() => router.push(r.route as any)}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
              <Text style={s.rehberLabel}>{r.label}</Text>
              <Text style={s.rehberSub}>{r.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dua Kategorileri */}
        <Text style={s.sectionTitle}>🤲 Dua Kategorileri</Text>
        {DUA_CATS.map(cat => (
          <DuaAccordion key={cat.id} cat={cat} />
        ))}

        {/* Ruh Haline Göre */}
        <Text style={s.sectionTitle}>💭 Ruh Haline Göre</Text>
        <View style={s.moodGrid}>
          {RUH_HALI.map(m => (
            <TouchableOpacity
              key={m.tag}
              style={[s.moodChip, { backgroundColor: m.bg }]}
              onPress={() => router.push(`/search?tag=${encodeURIComponent(m.tag)}` as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              <Text style={s.moodLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  content:   { padding: 14, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#78716c",
    textTransform: "uppercase", letterSpacing: 0.5,
    marginTop: 20, marginBottom: 10,
  },

  rehberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rehberCard: {
    width: "47%", borderRadius: 14, borderWidth: 1.5,
    padding: 14, gap: 4,
  },
  rehberLabel: { fontSize: 13, fontWeight: "700", color: "#1c1917" },
  rehberSub:   { fontSize: 11, color: "#78716c" },

  accordion: {
    borderRadius: 12, borderWidth: 1.5,
    backgroundColor: "#fff", marginBottom: 8, overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14,
  },
  accordionTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1c1917" },
  accordionChev:  { fontSize: 14, color: "#059669" },
  accordionBody:  { borderTopWidth: 1, borderTopColor: "#f0f0f0", padding: 10 },
  emptyText:      { fontSize: 13, color: "#a8a29e", padding: 8 },

  verseRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4",
  },
  verseKey:     { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  verseKeyText: { fontSize: 11, fontWeight: "700", color: "#065f46" },
  verseSurah:   { fontSize: 11, color: "#78716c", marginBottom: 2 },
  verseMeal:    { fontSize: 13, color: "#292524", lineHeight: 19 },

  moodGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodChip:  {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
  },
  moodLabel: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
});
