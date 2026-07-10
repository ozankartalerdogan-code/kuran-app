"use client";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, Platform, BackHandler,
} from "react-native";
import { router, Stack } from "expo-router";
import type { Href } from "expo-router";
import { useColors } from "../src/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";

// ── Sekme tanımları ───────────────────────────────────────────────────────────

type Tab = "temalar";

// Hub'daki "Konuya Göre Keşfet" kartları (dokununca o bölüm açılır)
// NOT: Namaz → /namaz-rehberi'ye taşındı. Dualar → UI'dan kaldırıldı (sıfırdan kurulacak).
const SECTIONS: { id: Tab; emoji: string; label: string; sub: string; bg: string; border: string }[] = [
  { id: "temalar", emoji: "🌟", label: "Temalar", sub: "Konuya göre ayetler (A–G)", bg: "#fef3c7", border: "#fcd34d" },
];

// ── Temalar verisi ────────────────────────────────────────────────────────────

const FEATURED_THEMES = [
  { kod: "E1_KEVNI_AYETLER",     baslik: "Evren ve Yaratılış",  aciklama: "Göklerin, yerin ve tabiatın varoluşundaki ilahi deliller", ikon: "🌌", bg: "#f97316" },
  { kod: "A1_ALLAH_ULUHIYET",    baslik: "Allah & Uluhiyet",    aciklama: "Allah'ın isim, sıfat ve birliği",                          ikon: "✨", bg: "#6366f1" },
  { kod: "A6_AHIRET_MEAD",       baslik: "Ahiret & Ötesi",      aciklama: "Ölüm, kıyamet, cennet ve cehennem",                        ikon: "🌙", bg: "#3b82f6" },
  { kod: "B2_SERI_IBADETLER",    baslik: "İbadetler",           aciklama: "Namaz, oruç, zekât, hac",                                  ikon: "🤲", bg: "#10b981" },
  { kod: "E2_INSANIN_MAHIYETI",  baslik: "İnsan ve Mahiyeti",   aciklama: "İnsanın yaratılış aşamaları, nefis, ruh ve fıtrat",        ikon: "🧠", bg: "#0ea5e9" },
  { kod: "D5_TOPLUMSAL_DUZEN",   baslik: "Toplum & Adalet",     aciklama: "Adalet, şura, emanet, fitne",                              ikon: "⚖️", bg: "#f43f5e" },
];

const AKORDEON_GRUPLARI = [
  {
    baslik: "A — İnanç Esasları", ikon: "🌟",
    temalar: [
      { kod: "A1_ALLAH_ULUHIYET",        isim: "Allah & Uluhiyet",         ayet: 619  },
      { kod: "A2_VAHIY_KITAPLAR",        isim: "Vahiy & Kitaplar",         ayet: 332  },
      { kod: "A3_NUBUVVET_PEYGAMBERLIK", isim: "Peygamberlik",             ayet: 286  },
      { kod: "A4_MELEKLER_GAYB_ALEMI",   isim: "Melekler & Gayb",          ayet: 163  },
      { kod: "A5_KADER_ILAHI_TAKDIR",    isim: "Kader ve İrade",           ayet: 137  },
      { kod: "A6_AHIRET_MEAD",           isim: "Ahiret Hayatı",            ayet: 1393 },
    ],
  },
  {
    baslik: "B — İbadet", ikon: "🤲",
    temalar: [
      { kod: "B1_TAHARET_TEMIZLIK", isim: "Taharet & Temizlik",                    ayet: 7   },
      { kod: "B2_SERI_IBADETLER",   isim: "Şer'i İbadetler (Namaz, Oruç...)",     ayet: 123 },
      { kod: "B3_KALBI_IBADETLER",  isim: "Kalbi İbadetler (Dua, Tövbe...)",      ayet: 192 },
    ],
  },
  {
    baslik: "C — Ahlak & Değerler", ikon: "💎",
    temalar: [
      { kod: "C1_BIREYSEL_ERDEMLER",    isim: "Bireysel Erdemler",        ayet: 204 },
      { kod: "C2_BIREYSEL_REZILETLER",  isim: "Bireysel Reziletler",      ayet: 398 },
      { kod: "C3_ILETISIM_SOZ_AHLAKI",  isim: "İletişim & Söz Ahlakı",   ayet: 46  },
      { kod: "C4_ILIM_AKIL_TEFEKKUR",   isim: "İlim, Akıl & Tefekkür",   ayet: 53  },
    ],
  },
  {
    baslik: "D — Hukuk & Toplum", ikon: "⚖️",
    temalar: [
      { kod: "D1_AILE_HUKUKU",       isim: "Aile Hukuku",           ayet: 98  },
      { kod: "D2_CINSEL_AHLAK",      isim: "Cinsel Ahlak",          ayet: 29  },
      { kod: "D3_CEZA_HUKUKU_HUDUD", isim: "Ceza Hukuku & Hudud",  ayet: 37  },
      { kod: "D4_IKTISADI_HAYAT",    isim: "İktisadi Hayat",        ayet: 116 },
      { kod: "D5_TOPLUMSAL_DUZEN",   isim: "Toplumsal Düzen",       ayet: 182 },
      { kod: "D6_HELAL_HARAM",       isim: "Helal & Haramlar",      ayet: 46  },
    ],
  },
  {
    baslik: "E — Kâinat & İnsan", ikon: "🌍",
    temalar: [
      { kod: "E1_KEVNI_AYETLER",    isim: "Evren ve Kevni Ayetler", ayet: 320 },
      { kod: "E2_INSANIN_MAHIYETI", isim: "İnsanın Mahiyeti",       ayet: 103 },
      { kod: "E3_TARIH_SUNNETULLAH",isim: "Tarih & Sünnetullah",    ayet: 148 },
    ],
  },
  {
    baslik: "F — Kıssalar & Tarih", ikon: "📖",
    temalar: [
      { kod: "F1_PEYGAMBER_KISSALARI", isim: "Peygamber Kıssaları", ayet: 802 },
      { kod: "F2_HELAK_KAVIMLER",      isim: "Helak Kavimler",      ayet: 151 },
      { kod: "F3_SIYER_SAHABE",        isim: "Siyer & Sahabe",      ayet: 29  },
    ],
  },
  {
    baslik: "G — Kur'an & Dinlerarası", ikon: "📜",
    temalar: [
      { kod: "G1_KURAN_HAKKINDA",    isim: "Kur'an Hakkında",        ayet: 39  },
      { kod: "G2_DINLER_MENSUPLARI", isim: "Dinlerin Mensupları",    ayet: 140 },
      { kod: "G3_MESELLER_TEMSILLER",isim: "Meseller & Temsiller",   ayet: 43  },
    ],
  },
];

const REHBERLER = [
  { emoji: "🛡️", label: "Manevi Sığınak",  sub: "Korunma, şifa ve istiaze",    route: "/manevi-siginak"           as const, bg: "#fce7f3", border: "#f9a8d4" },
  { emoji: "✨",  label: "İsmi Azam",        sub: "Sahih dualar ve uygulamalar",  route: "/manevi-siginak/ismi-azam" as const, bg: "#fef3c7", border: "#fcd34d" },
  { emoji: "🤲", label: "Dualar ve Zikirler", sub: "Korunma, şifa, sabah-akşam (89 dua)", route: "/dualar"           as const, bg: "#dcfce7", border: "#86efac" },
  { emoji: "🕌", label: "Esmaül Hüsna",     sub: "Allah'ın 99 güzel ismi",       route: "/esma"                     as const, bg: "#ede9fe", border: "#c4b5fd" },
  { emoji: "📿", label: "İbadet Rehberi",   sub: "Namaz, oruç, zekât, abdest",   route: "/ibadet-rehberi"           as const, bg: "#f0fdf4", border: "#86efac" },
  { emoji: "🧎", label: "Namaz Rehberi",    sub: "Adım adım namaz, dualar, vitir", route: "/namaz-rehberi"          as const, bg: "#e0f2fe", border: "#7dd3fc" },
  { emoji: "☪️", label: "Siyer-i Nebî",       sub: "Hz. Muhammed'in hayatı, 8 dönem · 49 olay", route: "/siyer"                as const, bg: "#f0f4ff", border: "#a5b4fc" },
  { emoji: "📜", label: "Peygamber Kıssaları", sub: "Kur'an'da 25 peygamberin kıssası ve dersleri",  route: "/peygamber-kissalari" as const, bg: "#fdf4ff", border: "#d8b4fe" },
  { emoji: "🌙", label: "Mübarek Günler",      sub: "13 gün ve gece — dayanak seviyeleriyle",         route: "/mubarek-gunler"     as const, bg: "#f0fdf4", border: "#86efac" },
  { emoji: "📖", label: "Hadisler",            sub: "114 sahih hadis · 27 konu · 7 grup",           route: "/hadisler"           as const, bg: "#fef9f0", border: "#fcd34d" },
];

// ── Liste öğe tipi ────────────────────────────────────────────────────────────

type ListItem =
  | { kind: "section_title"; key: string; title: string }
  | { kind: "featured_grid"; key: string }
  | { kind: "theme_accordion"; key: string; grup: typeof AKORDEON_GRUPLARI[number] };

// ── Key sabitleri ─────────────────────────────────────────────────────────────

const KEY_MAPPING: Record<Tab, ListItem[]> = (() => {
  const temalar: ListItem[] = [
    { kind: "section_title", key: "st_featured", title: "Öne Çıkan Temalar" },
    { kind: "featured_grid", key: "featured_grid" },
    { kind: "section_title", key: "st_all", title: "Tüm Temalar" },
    ...AKORDEON_GRUPLARI.map((g, i): ListItem => ({ kind: "theme_accordion", key: `theme_${i}`, grup: g })),
  ];

  return { temalar };
})();

// ── Bileşenler ────────────────────────────────────────────────────────────────

// Öne çıkan tema kartı
function FeaturedCard({ item }: { item: typeof FEATURED_THEMES[number] }) {
  return (
    <TouchableOpacity
      style={[ft.card, { backgroundColor: item.bg }]}
      onPress={() => router.push(`/search?tag=${encodeURIComponent(item.kod)}` as Href)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${item.baslik}: ${item.aciklama}`}
    >
      <Text style={ft.ikon}>{item.ikon}</Text>
      <Text style={ft.baslik}>{item.baslik}</Text>
      <Text style={ft.aciklama} numberOfLines={2}>{item.aciklama}</Text>
    </TouchableOpacity>
  );
}

const FeaturedGrid = React.memo(function FeaturedGrid() {
  return (
    <View style={s.featuredGrid}>
      {FEATURED_THEMES.map(t => <FeaturedCard key={t.kod} item={t} />)}
    </View>
  );
});

// Tüm Temalar accordion grubu
const ThemeAccordion = React.memo(function ThemeAccordion({ grup }: { grup: typeof AKORDEON_GRUPLARI[number] }) {
  const [acik, setAcik] = useState(false);
  const toplam = useMemo(() => grup.temalar.reduce((s, t) => s + t.ayet, 0), [grup]);

  return (
    <View style={ta.card}>
      <TouchableOpacity style={ta.header} onPress={() => setAcik(p => !p)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: acik }} accessibilityLabel={grup.baslik}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 16 }}>{grup.ikon}</Text>
          <Text style={ta.baslik}>{grup.baslik}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={ta.badge}>
            <Text style={ta.badgeText}>{toplam.toLocaleString("tr-TR")} ayet</Text>
          </View>
          <Text style={[ta.chev, acik && { transform: [{ rotate: "180deg" }] }]}>▼</Text>
        </View>
      </TouchableOpacity>
      {acik && (
        <View style={ta.body}>
          {grup.temalar.map(t => (
            <TouchableOpacity
              key={t.kod}
              style={ta.temaRow}
              onPress={() => router.push({ pathname: '/search', params: { q: encodeURIComponent(t.kod), type: 'tag' } } as Href)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${t.isim}, ${t.ayet} ayet`}
            >
              <Text style={ta.temaIsim}>{t.isim}</Text>
              <View style={ta.temaBadge}>
                <Text style={ta.temaBadgeText}>{t.ayet.toLocaleString("tr-TR")}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

// Hub kartı — hem araç/rehber hem bölüm kartları için ortak
function HubCard({ emoji, label, sub, bg, border, onPress }: {
  emoji: string; label: string; sub: string; bg: string; border: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[tools.card, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${sub}`}
    >
      <Text style={tools.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={tools.cardLabel} numberOfLines={1}>{label}</Text>
        <Text style={tools.cardSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={tools.chev}>›</Text>
    </TouchableOpacity>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function KesfetScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [bolum, setBolum] = useState<Tab | null>(null);

  // Bir bölümdeyken Android donanım geri tuşu → hub'a dön (ekrandan çıkma)
  useEffect(() => {
    if (bolum === null) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { setBolum(null); return true; });
    return () => sub.remove();
  }, [bolum]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.kind) {
      case "section_title":
        return (
          <Text style={[s.sectionTitle, { color: c.textMuted }]}>{item.title}</Text>
        );
      case "featured_grid":
        return <FeaturedGrid />;
      case "theme_accordion":
        return <ThemeAccordion grup={item.grup} />;
      default:
        return null;
    }
  }, [c.textMuted]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  // ── HUB: kart ızgarası ──────────────────────────────────────────────────────
  if (bolum === null) {
    return (
      <>
        <Stack.Screen options={{ title: "Keşfet" }} />
        <ScrollView
          style={[s.container, { backgroundColor: c.bg }]}
          contentContainerStyle={[s.content, { paddingTop: insets.top, paddingBottom: 48 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={tools.grid}>
            {REHBERLER.map(r => (
              <HubCard key={r.route} emoji={r.emoji} label={r.label} sub={r.sub} bg={r.bg} border={r.border} onPress={() => router.push(r.route as Href)} />
            ))}
            {SECTIONS.map(sec => (
              <HubCard key={sec.id} emoji={sec.emoji} label={sec.label} sub={sec.sub} bg={sec.bg} border={sec.border} onPress={() => setBolum(sec.id)} />
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // ── BÖLÜM: seçilen kategorinin içeriği ───────────────────────────────────────
  // bolum her zaman geçerli bir SECTIONS id'sidir; yine de bulunamazsa ilk bölüme düş.
  const meta = SECTIONS.find(x => x.id === bolum) ?? SECTIONS[0];
  return (
    <>
      <Stack.Screen options={{ title: meta.label }} />
      <TouchableOpacity
        style={[s.backRow, { backgroundColor: c.card, borderBottomColor: c.border }]}
        onPress={() => setBolum(null)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Keşfet'e geri dön"
      >
        <Text style={[s.backText, { color: c.accent }]}>‹ Keşfet</Text>
        <Text style={[s.backTitle, { color: c.text }]}>{meta.emoji} {meta.label}</Text>
      </TouchableOpacity>

      <FlatList
        data={KEY_MAPPING[bolum]}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={[s.container, { backgroundColor: c.bg }]}
        contentContainerStyle={[s.content, { paddingTop: insets.top, paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  content:   { padding: 14, paddingBottom: 48, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  // Hub grup başlığı

  // Bölüm üst geri satırı
  backRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backText:  { fontSize: 14, fontWeight: "700" },
  backTitle: { fontSize: 14, fontWeight: "600", flex: 1 },

  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#78716c",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 18, marginBottom: 10,
  },

  featuredGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },

});

// Araçlar & Rehberler — üst sabit grid
const tools = StyleSheet.create({
  grid:      { gap: 9 },
  card:      { flexDirection: "row", alignItems: "center", gap: 13, borderRadius: 14, borderWidth: 1.5, paddingVertical: 15, paddingHorizontal: 15 },
  emoji:     { fontSize: 25 },
  cardLabel: { fontSize: 15, fontWeight: "700", color: "#1c1917" },
  cardSub:   { fontSize: 11.5, color: "#78716c", marginTop: 1.5 },
  chev:      { fontSize: 22, color: "#a8a29e", fontWeight: "600" },
});

// Öne çıkan kart
const ft = StyleSheet.create({
  card:     { width: "48%", borderRadius: 14, padding: 14, gap: 4, minHeight: 110 },
  ikon:     { fontSize: 26 },
  baslik:   { fontSize: 13, fontWeight: "700", color: "#fff" },
  aciklama: { fontSize: 10, color: "rgba(255,255,255,0.8)", lineHeight: 15 },
});

// Tema accordion
const ta = StyleSheet.create({
  card:    { borderRadius: 12, borderWidth: 1, borderColor: "#e7dfcc", backgroundColor: "#fffdf6", marginBottom: 6, overflow: "hidden" },
  header:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  baslik:  { fontSize: 13, fontWeight: "600", color: "#1c1917", flex: 1 },
  badge:   { backgroundColor: "#f5f0e8", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: "#78716c" },
  chev:    { fontSize: 10, color: "#9ca3af", marginLeft: 6 },
  body:    { borderTopWidth: 1, borderTopColor: "#f5f0e8", paddingHorizontal: 10, paddingVertical: 6 },
  temaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f5f0e8" },
  temaIsim:{ fontSize: 13, color: "#374151", flex: 1 },
  temaBadge:   { backgroundColor: "#fffdf6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "#e7dfcc" },
  temaBadgeText:{ fontSize: 10, color: "#78716c" },
});