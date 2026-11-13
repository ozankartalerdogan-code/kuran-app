import React, { useState, useCallback, useRef, useEffect, type ComponentProps } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, prefetchAyah } from "../src/lib/api";
import { useColors } from "../src/hooks/useColors";
import rehberRaw from "../src/data/namaz_rehberi.json";
import ozelRaw from "../src/data/ozel_namazlar.json";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { getDevotionalSourceLabel, getEvidenceLabel } from "../src/lib/sourceLabels";

import { useMealOf } from "../src/lib/englishMeal";
import { useSurahNameOf } from "../src/lib/surahNames";
import { useLang, useStrings, fmt, caps } from "../src/i18n";
import { localizedTranslit } from "../src/lib/translitEn";
import { localizedVerseTranslit } from "../src/lib/verseTranslitEn";
import { localizedData, useLocalizedData } from "../src/i18n/localizedData";
import rehberStrings from "../src/i18n/strings/namazRehberi";
// ── Tipler (gevşek — JSON'dan tek cast) ───────────────────────────────────────
interface Kavram { id: string; isim: string; renk: string; aciklama: string; "örnek"?: string }
interface Sure { id: string; isim: string; arapca: string; okunusu: string; anlam: string }
interface Adim {
  id?: string; sira?: number; isim: string; konum?: string; durum?: string; ne_zaman?: string;
  aciklama?: string; dua?: string | null; dua_arapca?: string | null; anlam?: string; not?: string;
  tekrar?: string; farz_notu?: string; anlam_notu?: string; el_pozisyonu_notu?: string;
  durum_detay?: string; parmak_notu?: string; kuran_kaynagi?: string; sureler?: Sure[];
  niyet_ornekleri?: NiyetOrnegi[];
}
interface VakitRow { vakit: string; sunnet: string; farz: string; toplam: string }
interface ComparisonRow { ozellik: string; farz_namaz: string; sunnet_namaz: string }
interface NiyetOrnegi { namaz: string; niyet: string }
interface SelamRow { sira: number; aciklama: string; dua: string; dua_arapca: string; anlam: string }
interface Ozellik { baslik: string; durum: string; aciklama: string }
interface VitirAdim { rekat: string; durum: string; aciklama: string }
interface RekatRow { rekat: string; subhaneke: string; euzu_besmele: string; fatiha: string; zamm_i_sure: string; "oturuş": string }
interface NamazRehberi {
  baslik: string; aciklama: string; kaynak_not: string; kapsam_notu?: string;
  temel_kavramlar: { baslik: string; aciklama: string; kavramlar: Kavram[]; teselli_notu: string };
  farz_sunnet_namaz_farki: { karsilastirma?: ComparisonRow[]; vakit_rekat_tablosu: VakitRow[]; not: string };
  namaz_oncesi: { baslik: string; adimlar: Adim[] };
  namaz_adimlari: Adim[];
  dualar: Adim[];
  selam: { isim: string; aciklama: string; adimlar: SelamRow[]; anlam_notu: string };
  vitir_namazi: { baslik: string; durum: string; rekat: string; ne_zaman: string; aciklama: string; ozellikler: Ozellik[]; adimlar: VitirAdim[]; yaygin_hata: string; not: string };
  rekat_yapisi: { baslik: string; aciklama: string; tablo: RekatRow[]; ozet_notu: string };
  yeni_baslayan_notu: { baslik: string; maddeler: string[] };
}

type RehberFile = { namaz_rehberi: NamazRehberi };
const pickRehber = localizedData<RehberFile>(
  rehberRaw as unknown as RehberFile,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/namaz_rehberi.en.json"),
);

const DURUM: Record<string, { bg: string; border: string; text: string }> = {
  farz:   { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
  vacip:  { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  sunnet: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
};

const DURUM_LABEL_KEY = { farz: "dFarz", vacip: "dVacip", sunnet: "dSunnet" } as const;
const OZEL_DURUM_LABEL_KEY = {
  farz_i_kifaye: "dFarzKifaye", vacip: "dVacip", sunnet_i_muekked: "dMuekked", sunnet_musteap: "dMustehap", sunnet: "dSunnet",
} as const;

// Karanlık modda pastel zeminlerin koyu karşılıkları
const DURUM_DARK: Record<string, { bg: string; border: string; text: string }> = {
  farz:   { bg: "#450a0a", border: "#7f1d1d", text: "#fca5a5" },
  vacip:  { bg: "#431407", border: "#7c2d12", text: "#fdba74" },
  sunnet: { bg: "#052e16", border: "#166534", text: "#86efac" },
};

function durumRenk(key: string, isDark: boolean) {
  const base = DURUM[key];
  if (!base) return undefined;
  return isDark ? { ...base, ...DURUM_DARK[key] } : base;
}

// ── "Namaz Ayetleri" sekmesi verisi (Keşfet'ten taşındı) ──────────────────────
const VAKIT_ROWS = [
  { id: "sabah",    ikon: "🌅", adKey: "vSabah" as const,    bg: "#f0f9ff", border: "#7dd3fc", keys: ["17:78", "20:130", "50:39"] },
  { id: "ogle",     ikon: "☀️", adKey: "vOgle" as const,     bg: "#fffbeb", border: "#fcd34d", keys: ["30:18", "17:78"] },
  { id: "ikindi",   ikon: "🌤️", adKey: "vIkindi" as const,   bg: "#fff7ed", border: "#fdba74", keys: ["2:238", "20:130", "50:39"] },
  { id: "aksam",    ikon: "🌆", adKey: "vAksam" as const,    bg: "#fff1f2", border: "#fda4af", keys: ["11:114", "30:17"] },
  { id: "yatsi",    ikon: "🌙", adKey: "vYatsi" as const,    bg: "#eef2ff", border: "#a5b4fc", keys: ["24:58", "17:78", "11:114"] },
  { id: "teheccud", ikon: "🌌", adKey: "vTeheccud" as const, bg: "#f5f3ff", border: "#c4b5fd", keys: ["17:79", "73:2-3", "25:64", "51:17-18"] },
];

const MOTTO = {
  surahId: 4, ayahNumber: 103, label: "Nisâ 4:103",
  arabic: "فَإِذَا قَضَيْتُمُ ٱلصَّلَوٰةَ فَٱذْكُرُوا۟ ٱللَّهَ قِيَـٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِكُمْ ۚ فَإِذَا ٱطْمَأْنَنتُمْ فَأَقِيمُوا۟ ٱلصَّلَوٰةَ ۚ إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا",
  meal: "Namazı kıldıktan sonra; ayakta, otururken ve yan yatarken Allah'ı anın. Güvene kavuştuğunuzda namazı gereğince kılın. Şüphesiz namaz, müminlere belirli vakitlerde farz kılınmıştır.",
};

const NAMAZ_CATS = [
  { emoji: "🕌", id: "namaz-genel",    labelKey: "catGenel" as const,     tag: "namaz-genel",    renk: "#e0e7ff" },
  { emoji: "⏰", id: "namaz-vakit",    labelKey: "catVakit" as const, tag: "namaz-vakit",    renk: "#fef3c7" },
  { emoji: "🧘", id: "namaz-husu",     labelKey: "catHusu" as const,     tag: "namaz-husu",     renk: "#f0fdf4" },
  { emoji: "🌌", id: "namaz-teheccud", labelKey: "catTeheccud" as const,        tag: "namaz-teheccud", renk: "#ede9fe" },
  { emoji: "📅", id: "namaz-cuma",     labelKey: "catCuma" as const,     tag: "namaz-cuma",     renk: "#dbeafe" },
];

function parseKey(key: string) {
  const [sr, a] = key.split(":");
  const surahId = Number(sr) || 0;
  const ayahNumber = Number(a?.split("-")[0]) || 0;
  return { surahId, ayahNumber };
}

interface VerseRow { verse_key: string; surah_id: number; ayah_number: number; surah_name: string | null; reading_tr: string | null; meal: string | null }

function TagAccordion({ emoji, label, tag, renk }: { emoji: string; label: string; tag: string; renk: string }) {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const lang = useLang();
  const mealOf = useMealOf();
  const surahNameOf = useSurahNameOf();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState(false);

  const fetchVerses = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.tags.filter(tag);
      setVerses((res.results ?? []).slice(0, 20).map(r => ({
        verse_key: r.verse_key, surah_id: r.surah_id, ayah_number: r.ayah_number,
        surah_name: r.surah_name, reading_tr: r.reading_tr, meal: r.meal,
      })));
    } catch {
      // Hata yutulursa boş liste "Ayet bulunamadı" gibi görünür — ayrı durum + retry.
      setError(true);
    }
    setLoading(false);
    setFetched(true);
  }, [tag]);

  const onPress = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) await fetchVerses();
  }, [open, fetched, fetchVerses]);

  return (
    <View style={[na.accCard, { backgroundColor: c.card, borderColor: c.border, borderLeftColor: renk }]}>
      <TouchableOpacity style={na.accHeader} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <Text style={[na.accTitle, { color: c.text }]}>{label}</Text>
        <Text style={[na.accChev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={[na.accBody, { borderTopColor: c.border }]}>
          {loading && <ActivityIndicator color={c.accent} style={{ marginVertical: 10 }} />}
          {!loading && error && (
            <View style={na.errorWrap}>
              <Text style={[na.empty, { color: c.isDark ? "#fca5a5" : "#dc2626" }]}>{tx.versesFailed}</Text>
              <TouchableOpacity style={[na.retryBtn, { backgroundColor: c.accent }]} onPress={fetchVerses} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={tx.retryA11y}>
                <Text style={na.retryText}>{tx.retry}</Text>
              </TouchableOpacity>
            </View>
          )}
          {!loading && !error && fetched && verses.length === 0 && <Text style={[na.empty, { color: c.textMuted }]}>{tx.noVerses}</Text>}
          {!loading && !error && verses.map(v => (
            <TouchableOpacity key={v.verse_key} style={[na.verseRow, { borderBottomColor: c.border }]} onPressIn={() => prefetchAyah(v.surah_id, v.ayah_number)} onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}`)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={fmt(tx.verseA11y, { name: surahNameOf(v.surah_id, v.surah_name) ?? v.verse_key })}>
              <View style={[na.keyBox, { backgroundColor: c.accentLight }]}><Text style={[na.keyText, { color: c.accent }]}>{v.verse_key}</Text></View>
              <View style={{ flex: 1 }}>
                {v.surah_name ? <Text style={[na.vSurah, { color: c.textMuted }]}>{surahNameOf(v.surah_id, v.surah_name)}</Text> : null}
                {v.reading_tr ? <Text style={[na.vReading, { color: c.text }]} numberOfLines={2}>{localizedVerseTranslit(v.verse_key, v.reading_tr, lang)}</Text> : null}
                {v.meal ? <Text style={[na.vMeal, { color: c.textSecondary }]} numberOfLines={2}>{mealOf(v.verse_key, v.meal)}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function VakitTablosu() {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const mealOf = useMealOf();
  const surahNameOf = useSurahNameOf();
  const mottoLabel = fmt(tx.mottoLabel, { sure: surahNameOf(MOTTO.surahId, "Nisâ") });
  return (
    <View>
      <TouchableOpacity style={[na.motto, { backgroundColor: c.isDark ? "#022c22" : "#ecfdf5", borderColor: c.isDark ? "#065f46" : "#a7f3d0" }]} activeOpacity={0.8} onPress={() => router.push(`/ayah/${MOTTO.surahId}/${MOTTO.ayahNumber}`)} accessibilityRole="button" accessibilityLabel={fmt(tx.mottoA11y, { label: mottoLabel })}>
        <View style={na.mottoHead}>
          <Text style={[na.mottoEtiket, { color: c.accent }]}>{caps(tx.mottoTitle)}</Text>
          <View style={[na.mottoKey, { backgroundColor: c.accentLight }]}><Text style={[na.mottoKeyText, { color: c.accent }]}>{mottoLabel}</Text></View>
        </View>
        <Text style={[na.mottoArabic, { color: c.text }]}>{MOTTO.arabic}</Text>
        <Text style={[na.mottoMeal, { color: c.textSecondary }]}>“{mealOf({ surah: MOTTO.surahId, ayah: MOTTO.ayahNumber }, MOTTO.meal)}”</Text>
      </TouchableOpacity>

      <View style={[na.vtCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[na.vtHeader, { borderBottomColor: c.border }]}>
          <Text style={[na.vtHeaderTitle, { color: c.textMuted }]}>{caps(tx.vakitHeader)}</Text>
        </View>
        {VAKIT_ROWS.map(v => (
          <View key={v.id} style={[na.vtRow, { backgroundColor: c.isDark ? c.cardAlt : v.bg, borderLeftColor: v.border, borderBottomColor: c.border }]}>
            <View style={na.vtVakit}>
              <Text style={{ fontSize: 20 }}>{v.ikon}</Text>
              <Text style={[na.vtVakitAd, { color: c.text }]}>{tx[v.adKey]}</Text>
              <Text style={[na.vtVakitSayi, { color: c.textMuted }]}>{fmt(tx.verseCount, { n: v.keys.length })}</Text>
            </View>
            <View style={na.vtKeys}>
              {v.keys.map(k => {
                const { surahId, ayahNumber } = parseKey(k);
                return (
                  <TouchableOpacity key={k} style={[na.vtChip, c.isDark && { backgroundColor: "#052e16", borderColor: "#166534" }]} onPress={() => router.push(`/ayah/${surahId}/${ayahNumber}`)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={fmt(tx.verseOpenA11y, { k })}>
                    <Text style={[na.vtChipText, c.isDark && { color: "#86efac" }]}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function AyetlerTab() {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
      <VakitTablosu />
      <Text style={[s.subHead, { color: c.text, marginTop: 18 }]}>{tx.prayerVerses}</Text>
      {NAMAZ_CATS.map(cat => <TagAccordion key={cat.id} emoji={cat.emoji} label={tx[cat.labelKey]} tag={cat.tag} renk={cat.renk} />)}
    </ScrollView>
  );
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────
function DurumBadge({ durum }: { durum?: string }) {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const d = durum ? durumRenk(durum, c.isDark) : undefined;
  if (!d) return null;
  return (
    <View style={[s.badge, { backgroundColor: d.bg, borderColor: d.border }]}>
      <Text style={[s.badgeText, { color: d.text }]}>{durum && durum in DURUM_LABEL_KEY ? tx[DURUM_LABEL_KEY[durum as keyof typeof DURUM_LABEL_KEY]] : ""}</Text>
    </View>
  );
}

function DuaBlock({ arapca, okunus, anlam, kaynak }: { arapca?: string | null; okunus?: string | null; anlam?: string; kaynak?: string }) {
  const c = useColors();
  const lang = useLang();
  const sourceLabel = getDevotionalSourceLabel({ source: kaynak });
  if (!arapca && !okunus && !anlam) return null;
  return (
    <View style={[s.duaBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      {arapca ? <Text style={[s.arabic, { color: c.text }]}>{arapca}</Text> : null}
      {okunus ? <Text style={[s.okunus, { color: c.text }]}>{localizedTranslit(okunus, lang)}</Text> : null}
      {anlam ? <Text style={[s.anlam, { color: c.textSecondary }]}>{anlam}</Text> : null}
      {kaynak ? <Text style={[s.kaynakChip, { color: c.accent }]}>{sourceLabel}</Text> : null}
    </View>
  );
}

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function Section({ emoji, icon, title, defaultOpen, children }: { emoji?: string; icon?: IoniconName; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={[s.sec, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={s.secHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title}>
        {icon ? <Ionicons name={icon} size={18} color={c.accent} /> : emoji ? <Text style={s.secEmoji}>{emoji}</Text> : null}
        <Text style={[s.secTitle, { color: c.text }]}>{title}</Text>
        <Text style={[s.secChev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={s.secBody}>{children}</View>}
    </View>
  );
}

// ── "Nasıl Kılınır" sekmesi (adım adım rehber) ────────────────────────────────
function GuideTab({ focusZamm }: { focusZamm?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const tx = useStrings(rehberStrings);
  const R = useLocalizedData(pickRehber).namaz_rehberi;
  const zammSureler = R.namaz_adimlari.find(a => a.id === "zamm_i_sure")?.sureler ?? [];
  // Derin link (?bolum=zamm): Zamm-ı Sureler bölümüne otomatik kaydır.
  const scrollRef = useRef<ScrollView>(null);
  const zammY = useRef(0);
  useEffect(() => {
    if (!focusZamm) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, zammY.current - 12), animated: true });
    }, 450);
    return () => clearTimeout(t);
  }, [focusZamm]);
  return (
      <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.intro, { color: c.textSecondary }]}>{R.aciklama}</Text>
        {R.kapsam_notu ? (
          <View style={[s.scopeBox, c.isDark && { backgroundColor: "#172554", borderColor: "#1e40af" }]}>
            <Text style={[s.scopeTitle, c.isDark && { color: "#93c5fd" }]}>{caps(tx.scopeNote)}</Text>
            <Text style={[s.scopeText, { color: c.textSecondary }]}>{R.kapsam_notu}</Text>
          </View>
        ) : null}

        {/* Yeni başlayan — en üstte, ilk gördükleri yer (varsayılan açık) */}
        <Section emoji="🌱" title={R.yeni_baslayan_notu.baslik}>
          {R.yeni_baslayan_notu.maddeler.map((m, i) => (
            <Text key={i} style={[s.madde, { color: c.textSecondary }]}>✓ {m}</Text>
          ))}
        </Section>

        {/* Kavramlar */}
        <Section emoji="📘" title={R.temel_kavramlar.baslik}>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.temel_kavramlar.aciklama}</Text>
          {R.temel_kavramlar.kavramlar.map(k => {
            const d = durumRenk(k.id, c.isDark);
            return (
              <View key={k.id} style={[s.kavram, { backgroundColor: d?.bg ?? c.cardAlt, borderColor: d?.border ?? c.border }]}>
                <Text style={[s.kavramIsim, { color: d?.text ?? c.text }]}>{k.isim}</Text>
                <Text style={[s.p, { color: c.textSecondary }]}>{k.aciklama}</Text>
                {k["örnek"] ? <Text style={[s.small, { color: c.textMuted }]}>{fmt(tx.example, { x: k["örnek"] })}</Text> : null}
              </View>
            );
          })}
          <Text style={[s.teselli, c.isDark && { color: "#6ee7b7", backgroundColor: "#022c22" }]}>💚 {R.temel_kavramlar.teselli_notu}</Text>
        </Section>

        {/* Vakit & rekat */}
        <Section emoji="🕐" title={tx.timesAndRakats}>
          {R.farz_sunnet_namaz_farki.karsilastirma?.map(row => (
            <View key={row.ozellik} style={[s.compareCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.compareTitle, { color: c.text }]}>{row.ozellik}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.farzLine, { x: row.farz_namaz })}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.sunnetLine, { x: row.sunnet_namaz })}</Text>
            </View>
          ))}
          {R.farz_sunnet_namaz_farki.vakit_rekat_tablosu.map(v => (
            <View key={v.vakit} style={[s.vakitRow, { borderColor: c.border }]}>
              <Text style={[s.vakitAd, { color: c.text }]}>{v.vakit}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.small, { color: c.textSecondary }]}>{v.farz}</Text>
                <Text style={[s.small, { color: c.textMuted }]}>{v.sunnet}</Text>
              </View>
              <Text style={[s.vakitToplam, { color: c.accent }]}>{v.toplam}</Text>
            </View>
          ))}
          <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {R.farz_sunnet_namaz_farki.not}</Text>
        </Section>

        {/* Namaza başlamadan önce */}
        <Section emoji="🧼" title={R.namaz_oncesi.baslik}>
          {R.namaz_oncesi.adimlar.map((a, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{a.isim}</Text>
                <DurumBadge durum={a.durum} />
              </View>
              {a.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{a.aciklama}</Text> : null}
              {a.niyet_ornekleri?.length ? (
                <View style={s.exampleWrap}>
                  <Text style={[s.miniLabel, { color: c.accent }]}>{caps(tx.sampleIntentions)}</Text>
                  {a.niyet_ornekleri.map((ornek, idx) => (
                    <View key={idx} style={[s.exampleCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                      <Text style={[s.exampleTitle, { color: c.text }]}>{ornek.namaz}</Text>
                      <Text style={[s.exampleText, { color: c.textSecondary }]}>{ornek.niyet}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </Section>

        {/* Adım adım namaz */}
        <Section emoji="🕌" title={tx.stepByStep}>
          {R.namaz_adimlari.map((a, i) => (
            <View key={a.id ?? i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{a.sira ? `${a.sira}. ` : ""}{a.isim}</Text>
                <DurumBadge durum={a.durum} />
              </View>
              {a.konum ? <Text style={[s.konum, { color: c.accent }]}>{a.konum}</Text> : null}
              {a.ne_zaman ? <Text style={[s.small, { color: c.textMuted }]}>{a.ne_zaman}</Text> : null}
              {a.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{a.aciklama}</Text> : null}
              <DuaBlock arapca={a.dua_arapca} okunus={a.dua} anlam={a.anlam} />
              {a.tekrar ? <Text style={[s.small, { color: c.textMuted }]}>🔁 {a.tekrar}</Text> : null}
              {a.farz_notu ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {a.farz_notu}</Text> : null}
              {a.durum_detay ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {a.durum_detay}</Text> : null}
              {a.not ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {a.not}</Text> : null}
              {a.anlam_notu ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>💡 {a.anlam_notu}</Text> : null}
              {a.sureler ? <Text style={[s.small, { color: c.accent }]}>{tx.surasBelow}</Text> : null}
            </View>
          ))}
        </Section>

        {/* Zamm-ı Sureler — ayrı bölüm (derin link hedefi) */}
        <View onLayout={(e) => { zammY.current = e.nativeEvent.layout.y; }}>
        <Section emoji="📖" title={fmt(tx.zammTitle, { n: zammSureler.length })} defaultOpen={focusZamm}>
          <Text style={[s.p, { color: c.textSecondary }]}>{tx.zammIntro}</Text>
          {zammSureler.map(su => (
            <View key={su.id} style={s.item}>
              <Text style={[s.itemTitle, { color: c.text }]}>{su.isim}</Text>
              <DuaBlock arapca={su.arapca} okunus={su.okunusu} anlam={su.anlam} />
            </View>
          ))}
        </Section>
        </View>

        {/* Dualar */}
        <Section emoji="📿" title={tx.prayerDuas}>
          {R.dualar.map((d, i) => (
            <View key={d.id ?? i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{d.isim}</Text>
                <DurumBadge durum={d.durum} />
              </View>
              {d.ne_zaman ? <Text style={[s.small, { color: c.textMuted }]}>{d.ne_zaman}</Text> : null}
              <DuaBlock arapca={d.dua_arapca} okunus={d.dua} anlam={d.anlam} kaynak={d.kuran_kaynagi} />
              {d.parmak_notu ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>👉 {d.parmak_notu}</Text> : null}
              {d.not ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {d.not}</Text> : null}
            </View>
          ))}
        </Section>

        {/* Selam */}
        <Section emoji="🤲" title={R.selam.isim}>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.selam.aciklama}</Text>
          {R.selam.adimlar.map((a, i) => (
            <View key={i} style={s.item}>
              <Text style={[s.p, { color: c.textSecondary }]}>{a.sira}. {a.aciklama}</Text>
              <DuaBlock arapca={a.dua_arapca} okunus={a.dua} anlam={a.anlam} />
            </View>
          ))}
          <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>💡 {R.selam.anlam_notu}</Text>
        </Section>

        {/* VİTİR NAMAZI */}
        <Section emoji="🌙" title={R.vitir_namazi.baslik}>
          <View style={s.itemHead}>
            <DurumBadge durum={R.vitir_namazi.durum} />
            <Text style={[s.rekatBilgi, { color: c.textMuted }]}>{R.vitir_namazi.rekat}</Text>
          </View>
          <Text style={[s.small, { color: c.textMuted }]}>{R.vitir_namazi.ne_zaman}</Text>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.vitir_namazi.aciklama}</Text>

          <Text style={[s.subHead, { color: c.text }]}>{tx.features}</Text>
          {R.vitir_namazi.ozellikler.map((o, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{o.baslik}</Text>
                <DurumBadge durum={o.durum} />
              </View>
              <Text style={[s.p, { color: c.textSecondary }]}>{o.aciklama}</Text>
            </View>
          ))}

          <Text style={[s.subHead, { color: c.text }]}>{tx.stepsHead}</Text>
          {R.vitir_namazi.adimlar.map((a, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{a.rekat}</Text>
                <DurumBadge durum={a.durum} />
              </View>
              <Text style={[s.p, { color: c.textSecondary }]}>{a.aciklama}</Text>
            </View>
          ))}

          <Text style={[s.note, s.warn, c.isDark && { color: "#fdba74", backgroundColor: "#431407", borderColor: "#7c2d12" }]}>⚠️ {R.vitir_namazi.yaygin_hata}</Text>
          <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {R.vitir_namazi.not}</Text>
        </Section>

        {/* Rekat yapısı */}
        <Section emoji="📋" title={R.rekat_yapisi.baslik}>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.rekat_yapisi.aciklama}</Text>
          {R.rekat_yapisi.tablo.map(t => (
            <View key={t.rekat} style={[s.kavram, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.kavramIsim, { color: c.text }]}>{t.rekat}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.subhaneke, { x: t.subhaneke })}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.euzu, { x: t.euzu_besmele })}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.fatiha, { x: t.fatiha })}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.zamm, { x: t.zamm_i_sure })}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>{fmt(tx.sitting, { x: t["oturuş"] })}</Text>
            </View>
          ))}
          <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>📌 {R.rekat_yapisi.ozet_notu}</Text>
        </Section>

        <Text style={[s.kaynakNot, { color: c.textMuted }]}>{R.kaynak_not}</Text>
      </ScrollView>
  );
}

// ── "Özel Namazlar" sekmesi (ozel_namazlar.json) ──────────────────────────────
// İçerik (namazlar/hızlı bakış) bilinçli olarak polimorfik; üst seviye container
// tiplenir, tek tek namaz kayıtları ilgili kartta yorumlanır.
// ── ozel_namazlar.json tipleri (heterojen içerik; alanların çoğu opsiyonel) ────
interface KuranRef { sure?: string; ayet?: string; metin?: string }
interface Cesit { isim?: string; hicri_tarih?: string; aciklama?: string; tekbir_notu?: string }
interface IstihareSonucu { aciklama?: string; maddeler?: string[] }
interface DuaObject {
  baslik?: string; dua_arapca?: string; dua?: string; anlam?: string;
  kaynagi?: string; dua_kaynagi?: string; kaynak?: string; not?: string;
}
type DuaLike = string | DuaObject;
interface Step {
  isim?: string; aciklama?: string; detay?: string;
  dua?: string; dua_arapca?: string; anlam?: string;
  dua_1?: string; dua_1_arapca?: string; dua_2?: string; dua_2_arapca?: string;
  tesbih?: string; selam?: string; bilmeyenler_icin?: string; not?: string;
}
interface KilinicObj {
  aciklama?: string; "1_rekat"?: string[]; "2_rekat"?: string[];
  adimlar?: string[]; tavsiye_edilen_sureler?: string; not?: string;
}
type KilinicData = string | Array<string | Step> | KilinicObj;
type NiyetData = string | { [k: string]: string | undefined };
interface OzelNamaz {
  id: string; isim: string;
  durum?: string; rekat?: string; durum_aciklama?: string;
  ne_zaman_kilinir?: string; ne_zaman_yapilir?: string; vakit?: string; sebep?: string;
  mezhep_gorusleri?: string; kuran_referansi?: KuranRef;
  cesitleri?: Cesit[]; on_sartlar?: string[];
  niyet?: NiyetData; kilinic?: KilinicData;
  kilinic_hanafi?: string; kilinic_safii_hanbeli?: string; tavsiye_edilen_sureler?: string;
  teheccud_duasi?: DuaLike; istihare_duasi?: DuaLike; hacet_duasi?: DuaLike; anlam?: string;
  tovbe_duasi?: DuaLike; secde_duasi?: DuaLike; dua?: DuaLike;
  teravih_arasi_tesbih?: DuaLike; cenaze_duasi_kisa?: DuaLike;
  istihare_sonucu?: IstihareSonucu; tovbe_sartlari?: string[];
  fazileti?: string | string[]; ozel_notlar?: string[]; hadis_kaynagi?: string;
}

type OzelFile = {
  ozel_namazlar: {
    aciklama: string;
    hizli_bakis_tablosu: Record<string, string>[];
    namazlar: OzelNamaz[];
    kaynak_not: string;
  };
};
const pickOzel = localizedData<OzelFile>(
  ozelRaw as OzelFile,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/ozel_namazlar.en.json"),
);

// hizli_bakis_tablosu[].durum çeviri dışı bırakıldı (görünen serbest metin):
// İngilizce arayüzde terimler burada eşlenir.
const DURUM_TEXT_EN: Array<[RegExp, string]> = [
  [/Farz-ı Kifâye|Farz-ı Kifaye/g, "Fard al-Kifayah"],
  [/Sünnet-i Müekked|Müekked Sünnet/g, "Emphasized Sunnah"],
  [/Vacip/g, "Wajib"],
  [/Müstehap/g, "Mustahab"],
  [/Sünnet/g, "Sunnah"],
  [/4 mezhep/g, "all four schools"],
  [/Hanefî/g, "Hanafi"],
  [/Şâfiî-Mâlikî/g, "Shafi'i-Maliki"],
  [/Hanbelî/g, "Hanbali"],
  [/hasen hadis/g, "hasan hadith"],
];
function durumText(text: string | undefined, lang: string): string {
  if (!text || lang !== "en") return text ?? "";
  return DURUM_TEXT_EN.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

const OZEL_DURUM: Record<string, { bg: string; border: string; text: string }> = {
  farz_i_kifaye:    { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
  vacip:            { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  sunnet_i_muekked: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  sunnet_musteap:   { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  sunnet:           { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
};

const OZEL_DURUM_DARK: Record<string, { bg: string; border: string; text: string }> = {
  farz_i_kifaye:    { bg: "#450a0a", border: "#7f1d1d", text: "#fca5a5" },
  vacip:            { bg: "#431407", border: "#7c2d12", text: "#fdba74" },
  sunnet_i_muekked: { bg: "#172554", border: "#1e40af", text: "#93c5fd" },
  sunnet_musteap:   { bg: "#052e16", border: "#166534", text: "#86efac" },
  sunnet:           { bg: "#052e16", border: "#166534", text: "#86efac" },
};

// Özel namaz kart başlıkları için emoji yerine Ionicons ikon eşlemesi
const OZEL_ICON: Record<string, IoniconName> = {
  cenaze_namazi: "leaf-outline",
  bayram_namazi: "sparkles-outline",
  teheccud_namazi: "cloudy-night-outline",
  kusluk_namazi: "sunny-outline",
  istihare_namazi: "compass-outline",
  teravih_namazi: "moon-outline",
  tahiyyetul_mescid: "home-outline",
  kusuf_husuf: "contrast-outline",
  istiska_namazi: "rainy-outline",
  sukur_secdesi: "heart-outline",
  tovbe_namazi: "refresh-outline",
  hacet_namazi: "hand-left-outline",
};

const NIYET_LABEL_KEY = {
  erkek_cenaze: "niyetMale", kadin_cenaze: "niyetFemale", ramazan: "niyetRamazan", kurban: "niyetKurban",
} as const;

function OzelDurumBadge({ durum }: { durum?: string }) {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const base = durum ? OZEL_DURUM[durum] : undefined;
  const d = base && durum && c.isDark ? { ...base, ...OZEL_DURUM_DARK[durum] } : base;
  if (!d) return null;
  return (
    <View style={[s.badge, { backgroundColor: d.bg, borderColor: d.border }]}>
      <Text style={[s.badgeText, { color: d.text }]}>{durum && durum in OZEL_DURUM_LABEL_KEY ? tx[OZEL_DURUM_LABEL_KEY[durum as keyof typeof OZEL_DURUM_LABEL_KEY]] : ""}</Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  const c = useColors();
  return <>{items.map((m, i) => <Text key={i} style={[s.madde, { color: c.textSecondary }]}>• {m}</Text>)}</>;
}

function Niyet({ niyet }: { niyet?: NiyetData }) {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  if (!niyet) return null;
  if (typeof niyet === "string")
    return <Text style={[s.niyet, { backgroundColor: c.cardAlt, borderColor: c.border, color: c.text }]}>“{niyet}”</Text>;
  return (
    <>
      {Object.entries(niyet).filter(([k]) => k !== "not").map(([k, v]) => (
        <View key={k} style={{ marginTop: 6 }}>
          <Text style={[s.miniLabel, { color: c.accent }]}>{caps(k in NIYET_LABEL_KEY ? tx[NIYET_LABEL_KEY[k as keyof typeof NIYET_LABEL_KEY]] : k)}</Text>
          <Text style={[s.niyet, { backgroundColor: c.cardAlt, borderColor: c.border, color: c.text }]}>“{String(v)}”</Text>
        </View>
      ))}
      {niyet.not ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {niyet.not}</Text> : null}
    </>
  );
}

function StepBlock({ step }: { step: Step }) {
  const c = useColors();
  const lang = useLang();
  return (
    <View style={s.item}>
      {step.isim ? <Text style={[s.itemTitle, { color: c.text }]}>{step.isim}</Text> : null}
      {step.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{step.aciklama}</Text> : null}
      {step.detay ? <Text style={[s.small, { color: c.textMuted }]}>{step.detay}</Text> : null}
      <DuaBlock arapca={step.dua_arapca} okunus={typeof step.dua === "string" ? step.dua : undefined} anlam={step.anlam} />
      {step.dua_1 ? <DuaBlock arapca={step.dua_1_arapca} okunus={step.dua_1} /> : null}
      {step.dua_2 ? <DuaBlock arapca={step.dua_2_arapca} okunus={step.dua_2} /> : null}
      {step.tesbih ? <Text style={[s.okunus, { color: c.text }]}>{localizedTranslit(step.tesbih, lang)}</Text> : null}
      {step.selam ? <Text style={[s.okunus, { color: c.text }]}>{localizedTranslit(step.selam, lang)}</Text> : null}
      {step.bilmeyenler_icin ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {step.bilmeyenler_icin}</Text> : null}
      {step.not ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {step.not}</Text> : null}
    </View>
  );
}

function KilinicObject({ obj }: { obj: KilinicObj }) {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  return (
    <>
      {obj.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{obj.aciklama}</Text> : null}
      {Array.isArray(obj["1_rekat"]) ? (
        <View style={s.item}><Text style={[s.miniLabel, { color: c.accent }]}>{caps(tx.rakat1)}</Text><Bullets items={obj["1_rekat"]} /></View>
      ) : null}
      {Array.isArray(obj["2_rekat"]) ? (
        <View style={s.item}><Text style={[s.miniLabel, { color: c.accent }]}>{caps(tx.rakat2)}</Text><Bullets items={obj["2_rekat"]} /></View>
      ) : null}
      {Array.isArray(obj.adimlar) ? <View style={s.item}><Bullets items={obj.adimlar} /></View> : null}
      {obj.tavsiye_edilen_sureler ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>📖 {obj.tavsiye_edilen_sureler}</Text> : null}
      {obj.not ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {obj.not}</Text> : null}
    </>
  );
}

function Kilinic({ data }: { data?: KilinicData }) {
  const c = useColors();
  if (!data) return null;
  if (typeof data === "string") return <Text style={[s.p, { color: c.textSecondary }]}>{data}</Text>;
  if (Array.isArray(data)) {
    if (data.every((x): x is string => typeof x === "string")) return <Bullets items={data} />;
    return <>{data.map((it, i) => typeof it === "string"
      ? <Text key={i} style={[s.madde, { color: c.textSecondary }]}>• {it}</Text>
      : <StepBlock key={i} step={it} />)}</>;
  }
  return <KilinicObject obj={data} />;
}

function DuaObj({ obj, anlamFallback }: { obj?: DuaLike; anlamFallback?: string }) {
  const c = useColors();
  if (!obj) return null;
  if (typeof obj === "string") return <DuaBlock okunus={obj} anlam={anlamFallback} />;
  return (
    <>
      {obj.baslik ? <Text style={[s.subHead, { color: c.text }]}>{obj.baslik}</Text> : null}
      <DuaBlock arapca={obj.dua_arapca} okunus={obj.dua} anlam={obj.anlam ?? anlamFallback} kaynak={obj.kaynagi ?? obj.dua_kaynagi ?? obj.kaynak} />
      {obj.not ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {obj.not}</Text> : null}
    </>
  );
}

function Fazilet({ data }: { data: string | string[] }) {
  const c = useColors();
  const arr = Array.isArray(data) ? data : [data];
  return <>{arr.map((f, i) => <Text key={i} style={[s.fazilet, c.isDark && { color: "#6ee7b7", backgroundColor: "#022c22" }]}>💎 {f}</Text>)}</>;
}

function OzelNamazCard({ n }: { n: OzelNamaz }) {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const neZaman = n.ne_zaman_kilinir ?? n.ne_zaman_yapilir;
  return (
    <Section icon={OZEL_ICON[n.id] ?? "book-outline"} title={n.isim}>
      <View style={[s.itemHead, { marginBottom: 2 }]}>
        <OzelDurumBadge durum={n.durum} />
        {n.rekat ? <Text style={[s.rekatBilgi, { color: c.textMuted }]}>{n.rekat}</Text> : null}
      </View>
      {n.durum_aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{n.durum_aciklama}</Text> : null}

      {neZaman ? (<><Text style={[s.miniLabel, { color: c.accent, marginTop: 10 }]}>{caps(tx.whenQ)}</Text><Text style={[s.p, { color: c.textSecondary }]}>{neZaman}</Text></>) : null}
      {n.vakit ? <Text style={[s.small, { color: c.textMuted }]}>{fmt(tx.timeLine, { x: n.vakit })}</Text> : null}
      {n.sebep ? (<><Text style={[s.miniLabel, { color: c.accent, marginTop: 10 }]}>{caps(tx.reason)}</Text><Text style={[s.p, { color: c.textSecondary }]}>{n.sebep}</Text></>) : null}

      {n.mezhep_gorusleri ? <Text style={[s.note, s.mezhep, c.isDark && { color: "#c7d2fe", backgroundColor: "#1e1b4b", borderColor: "#3730a3" }]}>⚖️ {n.mezhep_gorusleri}</Text> : null}

      {n.kuran_referansi ? (
        <View style={[s.kavram, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
          <Text style={[s.miniLabel, { color: c.accent }]}>{caps(n.kuran_referansi.sure)} {caps(n.kuran_referansi.ayet)}</Text>
          <Text style={[s.p, { color: c.textSecondary }]}>{n.kuran_referansi.metin}</Text>
        </View>
      ) : null}

      {Array.isArray(n.cesitleri) ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[s.subHead, { color: c.text }]}>{tx.varieties}</Text>
          {n.cesitleri.map((ce, i) => (
            <View key={i} style={[s.kavram, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.kavramIsim, { color: c.text }]}>{ce.isim}</Text>
              {ce.hicri_tarih ? <Text style={[s.small, { color: c.textMuted }]}>{ce.hicri_tarih}</Text> : null}
              {ce.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{ce.aciklama}</Text> : null}
              {ce.tekbir_notu ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>ℹ️ {ce.tekbir_notu}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {Array.isArray(n.on_sartlar) ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.preconditions}</Text><Bullets items={n.on_sartlar} /></>) : null}

      {n.niyet ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.intention}</Text><Niyet niyet={n.niyet} /></>) : null}

      {(n.kilinic || n.kilinic_hanafi || n.kilinic_safii_hanbeli) ? <Text style={[s.subHead, { color: c.text }]}>{tx.howTo}</Text> : null}
      {n.kilinic ? <Kilinic data={n.kilinic} /> : null}
      {n.kilinic_hanafi ? (<><Text style={[s.miniLabel, { color: c.accent, marginTop: 6 }]}>{caps(tx.hanafi)}</Text><Text style={[s.p, { color: c.textSecondary }]}>{n.kilinic_hanafi}</Text></>) : null}
      {n.kilinic_safii_hanbeli ? (<><Text style={[s.miniLabel, { color: c.accent, marginTop: 6 }]}>{caps(tx.shafiHanbali)}</Text><Text style={[s.p, { color: c.textSecondary }]}>{n.kilinic_safii_hanbeli}</Text></>) : null}
      {n.tavsiye_edilen_sureler ? <Text style={[s.note, { color: c.textSecondary, backgroundColor: c.cardAlt }]}>📖 {n.tavsiye_edilen_sureler}</Text> : null}

      {n.teheccud_duasi ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.teheccudDua}</Text><DuaObj obj={n.teheccud_duasi} /></>) : null}
      {n.istihare_duasi ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.istihareDua}</Text><DuaObj obj={n.istihare_duasi} /></>) : null}
      {n.hacet_duasi ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.hacetDua}</Text><DuaObj obj={n.hacet_duasi} anlamFallback={n.anlam} /></>) : null}
      {n.tovbe_duasi ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.tovbeDua}</Text><DuaObj obj={n.tovbe_duasi} /></>) : null}
      {n.secde_duasi ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.secdeDua}</Text><DuaObj obj={n.secde_duasi} /></>) : null}
      {typeof n.dua === "string" ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.dua}</Text><DuaObj obj={n.dua} /></>) : null}
      {n.teravih_arasi_tesbih ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.teravihTesbih}</Text><DuaObj obj={n.teravih_arasi_tesbih} /></>) : null}
      {n.cenaze_duasi_kisa ? <DuaObj obj={n.cenaze_duasi_kisa} /> : null}

      {n.istihare_sonucu ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[s.subHead, { color: c.text }]}>{n.istihare_sonucu.aciklama}</Text>
          <Bullets items={n.istihare_sonucu.maddeler ?? []} />
        </View>
      ) : null}

      {Array.isArray(n.tovbe_sartlari) ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.tovbeConditions}</Text><Bullets items={n.tovbe_sartlari} /></>) : null}

      {n.fazileti ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.virtues}</Text><Fazilet data={n.fazileti} /></>) : null}

      {Array.isArray(n.ozel_notlar) ? (<><Text style={[s.subHead, { color: c.text }]}>{tx.specialNotes}</Text><Bullets items={n.ozel_notlar} /></>) : null}

      {n.hadis_kaynagi ? <Text style={[s.kaynakChip, { color: c.accent }]}>📚 {getEvidenceLabel(n.hadis_kaynagi)}</Text> : null}
    </Section>
  );
}

function OzelNamazlarTab() {
  const c = useColors();
  const tx = useStrings(rehberStrings);
  const lang = useLang();
  const O = useLocalizedData(pickOzel).ozel_namazlar;
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
      <Text style={[s.intro, { color: c.textSecondary }]}>{O.aciklama}</Text>

      <Section icon="grid-outline" title={tx.quickLook}>
        {O.hizli_bakis_tablosu.map((row, i) => (
          <View key={i} style={[s.kavram, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
            <Text style={[s.kavramIsim, { color: c.text }]}>{row.isim}</Text>
            <Text style={[s.small, { color: c.textSecondary }]}>{durumText(row.durum, lang)}</Text>
            <Text style={[s.small, { color: c.textMuted }]}>{row.rekat} · {row.vakit}</Text>
          </View>
        ))}
      </Section>

      {O.namazlar.map((n) => <OzelNamazCard key={n.id} n={n} />)}

      <Text style={[s.kaynakNot, { color: c.textMuted }]}>{O.kaynak_not}</Text>
    </ScrollView>
  );
}

// ── Ana ekran — üst sekmeli (Nasıl Kılınır | Ayetler | Özel Namazlar) ─────────
export default function NamazRehberiScreen() {
  const c = useColors();
  const tx = useStrings(rehberStrings);

  const insets = useSafeAreaInsets();
  const { tab: initialTab, bolum } = useLocalSearchParams<{ tab?: string; bolum?: string }>();
  const focusZamm = bolum === "zamm";
  const [tab, setTab] = useState<"rehber" | "ayetler" | "ozel">(
    focusZamm ? "rehber" : initialTab === "ozel" ? "ozel" : initialTab === "ayetler" ? "ayetler" : "rehber"
  );
  return (
    <>
      <Stack.Screen options={{ title: tx.title }} />
      <View style={[s.tabWrap, { backgroundColor: c.bg, paddingTop: insets.top + 10 }]}>
        <View style={[s.segment, { backgroundColor: c.cardAlt }]}>
          {([["rehber", tx.tabGuide], ["ayetler", tx.tabVerses], ["ozel", tx.tabSpecial]] as const).map(([id, lbl]) => {
            const active = tab === id;
            return (
              <TouchableOpacity key={id} style={[s.segBtn, active && [s.segBtnActive, { backgroundColor: c.card }]]} onPress={() => setTab(id)} activeOpacity={0.85} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={lbl}>
                <Text style={[s.segLabel, { color: active ? c.accent : c.textMuted }]} numberOfLines={1}>{lbl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {tab === "rehber" ? <GuideTab focusZamm={focusZamm} /> : tab === "ayetler" ? <AyetlerTab /> : <OzelNamazlarTab />}
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  intro:   { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  scopeBox: { backgroundColor: "#eff6ff", borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe", padding: 12, marginBottom: 14 },
  scopeTitle: { fontSize: 11, fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  scopeText: { fontSize: 12.5, lineHeight: 19 },

  sec:      { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  secHeader:{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  secEmoji: { fontSize: 18 },
  secTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  secChev:  { fontSize: 12 },
  secBody:  { paddingHorizontal: 14, paddingBottom: 14, gap: 2 },

  p:     { fontSize: 13, lineHeight: 20, marginTop: 4 },
  small: { fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  subHead: { fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 4 },

  badge:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5 },

  item:      { marginTop: 12 },
  itemHead:  { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  itemTitle: { fontSize: 13.5, fontWeight: "700" },
  konum:     { fontSize: 11, fontWeight: "600", marginTop: 1 },

  duaBox:  { borderRadius: 10, borderWidth: 1, padding: 11, marginTop: 6, gap: 4 },
  arabic:  { fontSize: 21, lineHeight: 38, textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", color: "#1c1917" },
  okunus:  { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  anlam:   { fontSize: 12.5, lineHeight: 19 },
  kaynakChip: { fontSize: 10, fontWeight: "700", color: "#047857", marginTop: 2 },

  kavram:    { borderRadius: 10, borderWidth: 1, padding: 11, marginTop: 8 },
  kavramIsim:{ fontSize: 13.5, fontWeight: "800", marginBottom: 2 },

  teselli: { fontSize: 12.5, lineHeight: 19, color: "#047857", backgroundColor: "#f0fdf4", borderRadius: 10, padding: 11, marginTop: 12 },

  vakitRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  vakitAd:    { fontSize: 13, fontWeight: "700", width: 56 },
  vakitToplam:{ fontSize: 11, fontWeight: "700", color: "#059669" },

  note: { fontSize: 12, lineHeight: 18, color: "#57534e", backgroundColor: "#f5f5f4", borderRadius: 8, padding: 9, marginTop: 8 },
  warn: { color: "#9a3412", backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fdba74" },

  rekatBilgi: { fontSize: 12, fontWeight: "600" },

  madde: { fontSize: 13, lineHeight: 21, marginTop: 6 },
  kaynakNot: { fontSize: 11, fontStyle: "italic", marginTop: 16, textAlign: "center" },
  compareCard: { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 8 },
  compareTitle: { fontSize: 12.5, fontWeight: "700", marginBottom: 2 },
  exampleWrap: { marginTop: 8, gap: 6 },
  exampleCard: { borderRadius: 10, borderWidth: 1, padding: 10 },
  exampleTitle: { fontSize: 12, fontWeight: "700", marginBottom: 3 },
  exampleText: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },

  // Özel Namazlar sekmesi
  miniLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 6, marginBottom: 2 },
  niyet:     { fontSize: 13, lineHeight: 20, fontStyle: "italic", borderRadius: 10, borderWidth: 1, padding: 11, marginTop: 4 },
  mezhep:    { color: "#3730a3", backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe", marginTop: 10 },
  fazilet:   { fontSize: 12.5, lineHeight: 19, color: "#047857", backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10, marginTop: 6 },

  // Üst sekme
  tabWrap:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  segment:      { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
  segBtn:       { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
  segBtnActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  segLabel:     { fontSize: 12, fontWeight: "700" },
});

// "Namaz Ayetleri" sekmesi stilleri
const na = StyleSheet.create({
  motto:        { borderRadius: 14, borderWidth: 1, borderColor: "#a7f3d0", backgroundColor: "#ecfdf5", padding: 14, marginBottom: 10 },
  mottoHead:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  mottoEtiket:  { flex: 1, fontSize: 10, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 },
  mottoKey:     { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mottoKeyText: { fontSize: 10, fontWeight: "700", color: "#047857" },
  mottoArabic:  { fontSize: 20, lineHeight: 36, color: "#1c1917", textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", marginBottom: 8 },
  mottoMeal:    { fontSize: 13, lineHeight: 20, fontStyle: "italic" },

  vtCard:        { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  vtHeader:      { padding: 12, borderBottomWidth: 1 },
  vtHeaderTitle: { fontSize: 12, fontWeight: "700", color: "#44403c", textTransform: "uppercase", letterSpacing: 0.5 },
  vtRow:         { flexDirection: "row", borderBottomWidth: 1, borderLeftWidth: 4 },
  vtVakit:       { width: 84, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 3 },
  vtVakitAd:     { fontSize: 11, fontWeight: "700", color: "#374151" },
  vtVakitSayi:   { fontSize: 10, color: "#9ca3af" },
  vtKeys:        { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10, alignContent: "center" },
  vtChip:        { backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac" },
  vtChipText:    { fontSize: 12, color: "#065f46", fontWeight: "600" },

  accCard:   { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, marginBottom: 8, overflow: "hidden" },
  accHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  accTitle:  { flex: 1, fontSize: 14, fontWeight: "600" },
  accChev:   { fontSize: 12 },
  accBody:   { borderTopWidth: 1, padding: 10 },
  empty:     { fontSize: 13, padding: 8 },
  errorWrap: { alignItems: "center", gap: 6, paddingVertical: 6 },
  retryBtn:  { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  retryText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  verseRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  keyBox:    { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  keyText:   { fontSize: 11, fontWeight: "700", color: "#065f46" },
  vSurah:    { fontSize: 11, marginBottom: 1 },
  vReading:  { fontSize: 13, fontStyle: "italic", lineHeight: 20 },
  vMeal:     { fontSize: 11, lineHeight: 17, marginTop: 1 },
});
