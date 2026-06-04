"use client";
import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { api } from "../src/lib/api";
import { useColors } from "../src/hooks/useColors";

// ── Sekme tanımları ───────────────────────────────────────────────────────────

type Tab = "temalar" | "dualar" | "namaz";
const TABS: { id: Tab; label: string; ikon: string }[] = [
  { id: "temalar", label: "Temalar",  ikon: "🌟" },
  { id: "dualar",  label: "Dualar",   ikon: "🤲" },
  { id: "namaz",   label: "Namaz",    ikon: "🕌" },
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
  { emoji: "🕌", label: "Esmaül Hüsna",     sub: "Allah'ın 99 güzel ismi",       route: "/esma"                     as const, bg: "#ede9fe", border: "#c4b5fd" },
  { emoji: "📿", label: "İbadet Rehberi",   sub: "Namaz, oruç, zekât, abdest",   route: "/ibadet-rehberi"           as const, bg: "#f0fdf4", border: "#86efac" },
];

// ── Dualar verisi ─────────────────────────────────────────────────────────────

const DUA_CATS = [
  { emoji: "🤲", id: "rabbena",    label: "Rabbena Duaları",      tag: "rabbena",        renk: "#f0fdf4" },
  { emoji: "🛡️", id: "korunma",   label: "Korunma ve Sığınma",   tag: "korunma-genel",  renk: "#dbeafe" },
  { emoji: "💚", id: "sifa",       label: "Şifa ve Sıkıntı",      tag: "dua-şifa",       renk: "#dcfce7" },
  { emoji: "🙏", id: "bagislanma", label: "Tövbe ve Bağışlanma",  tag: "dua-bağışlanma", renk: "#fce7f3" },
  { emoji: "⚓", id: "tevekkul",   label: "Tevekkül ve Sabır",    tag: "tevekkül",       renk: "#ede9fe" },
  { emoji: "📿", id: "zikir",      label: "Zikir ve Tesbih",      tag: "zikir",          renk: "#fef3c7" },
];

// ── Namaz verisi ──────────────────────────────────────────────────────────────

const VAKIT_ROWS = [
  { id: "sabah",    ikon: "🌅", ad: "Sabah",    bg: "#f0f9ff", border: "#7dd3fc", keys: ["17:78","20:130","52:48","11:114"] },
  { id: "ogle",     ikon: "☀️", ad: "Öğle",     bg: "#fffbeb", border: "#fcd34d", keys: ["30:17"] },
  { id: "ikindi",   ikon: "🌤️", ad: "İkindi",   bg: "#fff7ed", border: "#fdba74", keys: ["2:238","50:39"] },
  { id: "aksam",    ikon: "🌆", ad: "Akşam",    bg: "#fff1f2", border: "#fda4af", keys: ["40:55","76:25"] },
  { id: "yatsi",    ikon: "🌙", ad: "Yatsı",    bg: "#eef2ff", border: "#a5b4fc", keys: ["4:103","24:58","78:9"] },
];

const NAMAZ_CATS = [
  { emoji: "🕌", id: "namaz-genel",   label: "Namaz Genel",    tag: "namaz-genel",   renk: "#e0e7ff" },
  { emoji: "⏰", id: "namaz-vakit",   label: "Namaz Vakitleri",tag: "namaz-vakit",   renk: "#fef3c7" },
  { emoji: "🧘", id: "namaz-husu",    label: "Huşu & Kalp",    tag: "namaz-husu",    renk: "#f0fdf4" },
  { emoji: "🌌", id: "namaz-teheccud",label: "Teheccüd",       tag: "namaz-teheccud",renk: "#ede9fe" },
  { emoji: "📅", id: "namaz-cuma",    label: "Cuma Namazı",    tag: "namaz-cuma",    renk: "#dbeafe" },
];

// ── Yardımcı: ayet key parse ──────────────────────────────────────────────────

function parseKey(key: string) {
  const [s, a] = key.split(":").map(Number);
  return { surahId: s || 0, ayahNumber: a || 0 };
}

// ── Liste öğe tipi ────────────────────────────────────────────────────────────

type ListItem =
  | { kind: "section_title"; key: string; title: string }
  | { kind: "featured_grid"; key: string }
  | { kind: "rehber"; key: string; item: typeof REHBERLER[number] }
  | { kind: "theme_accordion"; key: string; grup: typeof AKORDEON_GRUPLARI[number] }
  | { kind: "tag_accordion"; key: string; emoji: string; label: string; tag: string; renk: string }
  | { kind: "vakit_tablosu"; key: string };

// ── Key sabitleri ─────────────────────────────────────────────────────────────

const KEY_MAPPING: Record<Tab, ListItem[]> = (() => {
  const temalar: ListItem[] = [
    { kind: "section_title", key: "st_featured", title: "Öne Çıkan Temalar" },
    { kind: "featured_grid", key: "featured_grid" },
    { kind: "section_title", key: "st_rehber", title: "Özel Rehberler" },
    ...REHBERLER.map((r, i): ListItem => ({ kind: "rehber", key: `rehber_${i}`, item: r })),
    { kind: "section_title", key: "st_all", title: "Tüm Temalar" },
    ...AKORDEON_GRUPLARI.map((g, i): ListItem => ({ kind: "theme_accordion", key: `theme_${i}`, grup: g })),
  ];

  const dualar: ListItem[] = [
    { kind: "section_title", key: "st_dua", title: "Dua Kategorileri" },
    ...DUA_CATS.map(c => ({ kind: "tag_accordion" as const, key: c.id, emoji: c.emoji, label: c.label, tag: c.tag, renk: c.renk })),
  ];

  const namaz: ListItem[] = [
    { kind: "vakit_tablosu", key: "vakit_tablosu" },
    { kind: "section_title", key: "st_namaz", title: "Namaz Kategorileri" },
    ...NAMAZ_CATS.map(c => ({ kind: "tag_accordion" as const, key: c.id, emoji: c.emoji, label: c.label, tag: c.tag, renk: c.renk })),
  ];

  return { temalar, dualar, namaz };
})();

// ── Bileşenler ────────────────────────────────────────────────────────────────

// Öne çıkan tema kartı
function FeaturedCard({ item }: { item: typeof FEATURED_THEMES[number] }) {
  return (
    <TouchableOpacity
      style={[ft.card, { backgroundColor: item.bg }]}
      onPress={() => router.push(`/search?tag=${encodeURIComponent(item.kod)}` as any)}
      activeOpacity={0.8}
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
      <TouchableOpacity style={ta.header} onPress={() => setAcik(p => !p)} activeOpacity={0.75}>
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
              onPress={() => router.push({ pathname: '/search', params: { q: encodeURIComponent(t.kod), type: 'tag' } } as any)}
              activeOpacity={0.7}
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

// Dua / Namaz accordion (lazy fetch)
interface VerseItem { verse_key: string; surah_id: number; ayah_number: number; surah_name: string | null; reading_tr: string | null; meal: string | null; }

const TagAccordion = React.memo(function TagAccordion({ emoji, label, tag, renk }: { emoji: string; label: string; tag: string; renk: string }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses]   = useState<VerseItem[]>([]);
  const [fetched, setFetched] = useState(false);

  const onPress = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) {
      setLoading(true);
      try {
        const res = await api.tags.filter(tag);
        setVerses((res.results ?? []).slice(0, 20).map(r => ({
          verse_key: r.verse_key, surah_id: r.surah_id, ayah_number: r.ayah_number,
          surah_name: r.surah_name, reading_tr: r.reading_tr, meal: r.meal,
        })));
      } catch { /* ignore */ }
      setLoading(false);
      setFetched(true);
    }
  }, [open, fetched, tag]);

  return (
    <View style={[acc.card, { borderLeftColor: renk }]}>
      <TouchableOpacity style={acc.header} onPress={onPress} activeOpacity={0.75}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <Text style={acc.title}>{label}</Text>
        <Text style={acc.chev}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={acc.body}>
          {loading && <ActivityIndicator color="#059669" style={{ marginVertical: 10 }} />}
          {!loading && fetched && verses.length === 0 && (
            <Text style={acc.empty}>Ayet bulunamadı.</Text>
          )}
          {!loading && verses.map(v => (
            <TouchableOpacity
              key={v.verse_key}
              style={acc.verseRow}
              onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}` as any)}
              activeOpacity={0.7}
            >
              <View style={acc.keyBox}>
                <Text style={acc.keyText}>{v.verse_key}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {v.surah_name ? <Text style={acc.surah}>{v.surah_name}</Text> : null}
                {v.reading_tr ? <Text style={acc.reading} numberOfLines={2}>{v.reading_tr}</Text> : null}
                {v.meal       ? <Text style={acc.meal}    numberOfLines={2}>{v.meal}</Text>       : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

// Namaz vakit tablosu
const VakitTablosu = React.memo(function VakitTablosu() {
  return (
    <View style={vt.card}>
      <View style={vt.headerRow}>
        <Text style={vt.headerTitle}>🕐 Namaz Vakitleri</Text>
      </View>
      {VAKIT_ROWS.map(v => (
        <View key={v.id} style={[vt.row, { backgroundColor: v.bg, borderLeftColor: v.border }]}>
          <View style={vt.vakit}>
            <Text style={{ fontSize: 20 }}>{v.ikon}</Text>
            <Text style={vt.vakitAd}>{v.ad}</Text>
            <Text style={vt.vakitSayi}>{v.keys.length} ayet</Text>
          </View>
          <View style={vt.keys}>
            {v.keys.map(k => {
              const { surahId, ayahNumber } = parseKey(k);
              return (
                <TouchableOpacity
                  key={k}
                  style={vt.keyChip}
                  onPress={() => router.push(`/ayah/${surahId}/${ayahNumber}` as any)}
                  activeOpacity={0.7}
                >
                  <Text style={vt.keyText}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
});

// Rehber kartı
const RehberCard = React.memo(function RehberCard({ item }: { item: typeof REHBERLER[number] }) {
  return (
    <TouchableOpacity
      style={[s.rehberCard, { backgroundColor: item.bg, borderColor: item.border }]}
      onPress={() => router.push(item.route)}
      activeOpacity={0.75}
    >
      <Text style={s.rehberEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.rehberLabel}>{item.label}</Text>
        <Text style={s.rehberSub}>{item.sub}</Text>
      </View>
      <Text style={s.rehberChev}>›</Text>
    </TouchableOpacity>
  );
});

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function KesfetScreen() {
  const c = useColors();
  const [aktifTab, setAktifTab] = useState<Tab>("temalar");

  const listData = useMemo(() => KEY_MAPPING[aktifTab], [aktifTab]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.kind) {
      case "section_title":
        return (
          <Text style={[s.sectionTitle, { color: c.textMuted }]}>{item.title}</Text>
        );
      case "featured_grid":
        return <FeaturedGrid />;
      case "rehber":
        return <RehberCard item={item.item} />;
      case "theme_accordion":
        return <ThemeAccordion grup={item.grup} />;
      case "tag_accordion":
        return <TagAccordion emoji={item.emoji} label={item.label} tag={item.tag} renk={item.renk} />;
      case "vakit_tablosu":
        return <VakitTablosu />;
      default:
        return null;
    }
  }, [c.textMuted]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <>
      <Stack.Screen options={{ title: "Keşfet" }} />

      {/* Sekme çubuğu */}
      <View style={[s.tabBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tabBtn, aktifTab === tab.id && s.tabBtnActive]}
            onPress={() => setAktifTab(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={s.tabIcon}>{tab.ikon}</Text>
            <Text style={[s.tabLabel, aktifTab === tab.id && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={[s.container, { backgroundColor: c.bg }]}
        contentContainerStyle={s.content}
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
  tabBar:    { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tabBtn:    { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#059669" },
  tabIcon:   { fontSize: 18 },
  tabLabel:  { fontSize: 11, fontWeight: "600", color: "#9ca3af" },
  tabLabelActive: { color: "#059669" },

  container: { flex: 1, backgroundColor: "#f5f0e8" },
  content:   { padding: 14, paddingBottom: 48 },

  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#78716c",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 18, marginBottom: 10,
  },

  featuredGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },

  rehberCard:  { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 8 },
  rehberEmoji: { fontSize: 24 },
  rehberLabel: { fontSize: 14, fontWeight: "700", color: "#1c1917" },
  rehberSub:   { fontSize: 11, color: "#78716c", marginTop: 1 },
  rehberChev:  { fontSize: 20, color: "#9ca3af" },

  moodGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 },
  moodChip:  { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  moodLabel: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
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
  card:    { borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4", backgroundColor: "#fff", marginBottom: 6, overflow: "hidden" },
  header:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  baslik:  { fontSize: 13, fontWeight: "600", color: "#1c1917", flex: 1 },
  badge:   { backgroundColor: "#f5f0e8", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: "#78716c" },
  chev:    { fontSize: 10, color: "#9ca3af", marginLeft: 6 },
  body:    { borderTopWidth: 1, borderTopColor: "#f5f0e8", paddingHorizontal: 10, paddingVertical: 6 },
  temaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f5f0e8" },
  temaIsim:{ fontSize: 13, color: "#374151", flex: 1 },
  temaBadge:   { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "#e7e5e4" },
  temaBadgeText:{ fontSize: 10, color: "#78716c" },
});

// Tag accordion (dualar / namaz)
const acc = StyleSheet.create({
  card:     { borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4", borderLeftWidth: 4, backgroundColor: "#fff", marginBottom: 8, overflow: "hidden" },
  header:   { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  title:    { flex: 1, fontSize: 14, fontWeight: "600", color: "#1c1917" },
  chev:     { fontSize: 12, color: "#059669" },
  body:     { borderTopWidth: 1, borderTopColor: "#f0f0f0", padding: 10 },
  empty:    { fontSize: 13, color: "#a8a29e", padding: 8 },
  verseRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  keyBox:   { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  keyText:  { fontSize: 11, fontWeight: "700", color: "#065f46" },
  surah:    { fontSize: 11, color: "#78716c", marginBottom: 1 },
  reading:  { fontSize: 13, color: "#1c1917", fontStyle: "italic", lineHeight: 20 },
  meal:     { fontSize: 11, color: "#57534e", lineHeight: 17, marginTop: 1 },
});

// Vakit tablosu
const vt = StyleSheet.create({
  card:      { borderRadius: 14, borderWidth: 1, borderColor: "#e7e5e4", backgroundColor: "#fff", overflow: "hidden", marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#f5f0e8" },
  headerTitle:{ fontSize: 12, fontWeight: "700", color: "#44403c", textTransform: "uppercase", letterSpacing: 0.5 },
  row:       { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f5f0e8", borderLeftWidth: 4 },
  vakit:     { width: 80, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 3 },
  vakitAd:   { fontSize: 11, fontWeight: "700", color: "#374151" },
  vakitSayi: { fontSize: 10, color: "#9ca3af" },
  keys:      { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10, alignContent: "center" },
  keyChip:   { backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac" },
  keyText:   { fontSize: 12, color: "#065f46", fontWeight: "600" },
});