import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  StyleSheet,
  useColorScheme,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from "react";
import { api, type AyahDetailResponse } from "../../../src/lib/api";
import { useNotes } from "../../../src/hooks/useNotes";
import { useFavorites } from "../../../src/hooks/useFavorites";
import { useStreak } from "../../../src/hooks/useStreak";

// Collator bir kez oluştur — localeCompare(x, "ar") her çağrıda yeni collator yaratır
const arCollator = new Intl.Collator("ar");

// Meal kaynak adları
const SOURCE_NAMES: Record<string, string> = {
  yazir:   "Elmalılı H. Yazır",
  diyanet: "Diyanet İşleri",
  bulac:   "Ali Bulaç",
  vakfi:   "Diyanet Vakfı",
  ozturk:  "Yaşar Nuri Öztürk",
};

function sourceName(source: string): string {
  const key = source.split("#").at(-1) ?? "";
  return SOURCE_NAMES[key] ?? key.toUpperCase();
}

// ── POS (Part of Speech) Türkçe çeviri ───────────────────────────────────────

const POS_TR_MAP: Record<string, string> = {
  // ── Kısa kodlar (büyük harf) ──
  p:    "Edat",     n:    "İsim",    v:    "Fiil",   adj:  "Sıfat",
  m:    "Eril",     f:    "Dişil",   ms:   "Eril Tekil",  fs: "Dişil Tekil",
  mp:   "Eril Çoğul", fp: "Dişil Çoğul", md: "Eril İkil", fd: "Dişil İkil",
  gen:  "Tamlayan", acc:  "Belirtme", nom: "Yalın",  pref: "Önek",
  lem:  "Lemma",    root: "Kök",     det:  "Belirteç", pn: "Özel İsim",
  neg:  "Olumsuz",  imp:  "Emir",   pass: "Edilgen", act:  "Etken",
  caus: "Ettirgen", subj: "Dilek",  ind:  "Haber",   ins:  "Vasıta",
  dual: "İkil",     pl:   "Çoğul",  sg:   "Tekil",   pron: "Zamir",
  dem:  "İşaret",   rel:  "İlgi",   cond: "Şart",    fut:  "Gelecek",
  past: "Geçmiş",   pres: "Şimdiki",
  // ── İngilizce tam adlar ──
  particle:    "Edat",     noun:        "İsim",     verb:       "Fiil",
  adjective:   "Sıfat",   pronoun:     "Zamir",    adverb:     "Zarf",
  article:     "Belirlilik Takısı",    determiner: "Belirteç",
  preposition: "Edat",    conjunction: "Bağlaç",   other:      "Diğer",
  unknown:     "Bilinmiyor",
  // ── Ek kısa formlar ──
  prpn: "Özel İsim", num: "Sayı", interj: "Ünlem", pax: "Harf / Ek",
};

function translatePos(raw: string | null): string {
  if (!raw) return "—";
  if (!raw.includes("+")) {
    return POS_TR_MAP[raw.toLowerCase()] ?? raw;
  }
  return raw
    .split("+")
    .map((part) => POS_TR_MAP[part.trim().toLowerCase()] ?? part.trim())
    .join(" + ");
}

// ── Yardımcı: Köksüz kelimeler için etiket ────────────────────────────────────

const naturallyRootlessPosLabels: Record<string, string> = {
  particle:     "edat",
  preposition:  "edat",
  conjunction:  "bağlaç",
  article:      "harf",
  determiner:   "harf",
};

function getRootDisplayText(word: AyahDetailResponse["words"][number]): string {
  if (word.root) return word.root;
  if (word.pos && naturallyRootlessPosLabels[word.pos]) {
    return `Kök yok (${naturallyRootlessPosLabels[word.pos]})`;
  }
  return "Kök bilgisi yok";
}

function isRootClickable(word: AyahDetailResponse["words"][number]): boolean {
  return Boolean(word.root && word.root.trim().length > 0);
}

// ── Sure Hakkında Accordion ───────────────────────────────────────────────────

// Tefsir ayrı ekranda (/tafsir/[surahId]) gösteriliyor; ayet sayfasında tekrar
// etmemek için akordiyon yerine o ekrana giden link.
function SurahAboutAccordion({ surahId, colors }: { surahId: number; colors: ThemeColors }) {
  return (
    <TouchableOpacity
      style={[styles.accordionBox, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/tafsir/${surahId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.accordionHeader}>
        <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>📖 Sure tefsirini oku</Text>
        <Text style={[styles.accordionChevron, { color: colors.textMuted }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Ham Anlam Özeti bileşeni ──────────────────────────────────────────────────

function RawMeaningSummary({
  words,
  colors,
}: {
  words: AyahDetailResponse["words"];
  colors: ThemeColors;
}) {
  const meanings = words
    .map((w) => w.meaningTr?.trim())
    .filter((m): m is string => typeof m === "string" && m.length > 0);

  if (meanings.length === 0) return null;

  return (
    <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.analysisCardTitle, { color: colors.textPrimary }]}>
        Ham Anlam Özeti
      </Text>
      <Text style={[styles.analysisCardSubtitle, { color: colors.textMuted }]}>
        Kelimelerin sırasıyla doğrudan anlamları
      </Text>
      <Text style={[styles.analysisCardBody, { color: colors.textSecondary }]}>
        {meanings.join(" ") + "."}
      </Text>
    </View>
  );
}

// ── Eşsiz Kök Listesi ─────────────────────────────────────────────────────────

function UniqueRootList({
  words,
  rootMeanings,
  colors,
}: {
  words: AyahDetailResponse["words"];
  rootMeanings: Record<string, string>;
  colors: ThemeColors;
}) {
  const rootMap = new Map<string, number>();
  for (const w of words) {
    if (w.root?.trim()) {
      rootMap.set(w.root.trim(), (rootMap.get(w.root.trim()) ?? 0) + 1);
    }
  }
  const roots = Array.from(rootMap.entries()).sort((a, b) => arCollator.compare(a[0], b[0]));

  if (roots.length === 0) {
    return (
      <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Bu ayet için kök bilgisi bulunamadı.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.rootsGrid}>
      {roots.map(([root, count]) => {
        const meaning = rootMeanings[root];
        return (
          <TouchableOpacity
            key={root}
            style={[styles.rootChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => router.push(`/root/${encodeURIComponent(root)}`)}
            activeOpacity={0.7}
          >
            <View style={styles.rootChipRow}>
              <Text style={[styles.rootChipArabic, { color: colors.accent }]}>{root}</Text>
              <View style={[styles.rootCountBadge, { backgroundColor: colors.accent + "18" }]}>
                <Text style={[styles.rootCountText, { color: colors.accent }]}>{count} kelime</Text>
              </View>
            </View>
            {meaning ? (
              <Text style={[styles.rootChipMeaning, { color: colors.textSecondary }]} numberOfLines={1}>
                {meaning}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Hızlı Ayet Atlama ────────────────────────────────────────────────────────

function AyahJumpBar({ surahId, current, total, colors, rightContent }: {
  surahId: number; current: number; total: number; colors: ThemeColors;
  rightContent?: React.ReactNode;
}) {
  const [surahVal, setSurahVal] = useState(String(surahId));
  const [ayahVal,  setAyahVal]  = useState(String(current));

  useEffect(() => { setSurahVal(String(surahId)); }, [surahId]);
  useEffect(() => { setAyahVal(String(current)); },  [current]);

  function jump() {
    const s = parseInt(surahVal, 10);
    const a = parseInt(ayahVal,  10);
    const targetSurah = s >= 1 && s <= 114 ? s : surahId;
    const targetAyah  = a >= 1 ? a : 1;
    router.replace(`/ayah/${targetSurah}/${targetAyah}`);
  }

  const inputStyle = [styles.jumpInput, {
    color: colors.textPrimary,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  }];

  return (
    <View style={[styles.jumpBar, { borderColor: colors.border, alignItems: "center" }]}>
      <Text style={[styles.jumpLabel, { color: colors.textMuted }]}>Sure:</Text>
      <TextInput
        style={inputStyle}
        value={surahVal}
        onChangeText={setSurahVal}
        keyboardType="number-pad"
        onSubmitEditing={jump}
        returnKeyType="next"
        selectTextOnFocus
      />
      <Text style={[styles.jumpLabel, { color: colors.textMuted }]}>Ayet:</Text>
      <TextInput
        style={inputStyle}
        value={ayahVal}
        onChangeText={setAyahVal}
        keyboardType="number-pad"
        onSubmitEditing={jump}
        returnKeyType="go"
        selectTextOnFocus
      />
      <TouchableOpacity style={[styles.jumpBtn, { backgroundColor: colors.accent }]} onPress={jump} activeOpacity={0.8}>
        <Text style={styles.jumpBtnText}>Git</Text>
      </TouchableOpacity>
      {rightContent && (
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
          {rightContent}
        </View>
      )}
    </View>
  );
}

// ── Sekme Bileşeni ────────────────────────────────────────────────────────────

type TabId = "meal" | "words" | "roots" | "analysis";

function SegmentedTabs({
  active,
  onChange,
  colors,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
  colors: ThemeColors;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "meal", label: "Meal" },
    { id: "words", label: "Kelimeler" },
    { id: "roots", label: "Kökler" },
    { id: "analysis", label: "Analiz" },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.tabItem,
              isActive && { backgroundColor: colors.accent },
              isActive && styles.tabItemActive,
            ]}
            onPress={() => onChange(t.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? "#ffffff" : colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Tema Renkleri ─────────────────────────────────────────────────────────────

interface ThemeColors {
  bg: string;
  card: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  error: string;
}

const lightColors: ThemeColors = {
  bg:           "#f5f0e8",
  card:         "#ffffff",
  surfaceAlt:   "#f5f0e8",
  border:       "#e7e5e4",
  textPrimary:  "#1c1917",
  textSecondary:"#44403c",
  textMuted:    "#57534e",
  accent:       "#059669",
  accentLight:  "#d1fae5",
  error:        "#dc2626",
};

const darkColors: ThemeColors = {
  bg:           "#171717",
  card:         "#262626",
  surfaceAlt:   "#1f1f1f",
  border:       "#404040",
  textPrimary:  "#fafaf9",
  textSecondary:"#d6d3d1",
  textMuted:    "#78716c",
  accent:       "#10b981",
  accentLight:  "#064e3b",
  error:        "#f87171",
};

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function AyahDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  const { surahId: rawS, ayahNumber: rawA } =
    useLocalSearchParams<{ surahId: string; ayahNumber: string }>();
  const surahId    = Number(rawS);
  const ayahNumber = Number(rawA);

  const { getNote, saveNote } = useNotes();
  const { isFavorite, toggle: toggleFav } = useFavorites();
  useStreak(); // Ayet görüntülenince okuma serisini güncelle
  const verseKey = `${surahId}:${ayahNumber}`;

  const [data, setData]       = useState<AyahDetailResponse | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [translations, setTranslations] = useState<{ source: string; text: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("meal");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  // Mevcut notu yükle
  useEffect(() => {
    setNoteDraft(getNote(verseKey));
  }, [verseKey, getNote]);

  useEffect(() => {
    if (!surahId || !ayahNumber) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.ayah.get(surahId, ayahNumber),
      api.verses.bySurah(surahId),
    ])
      .then(([ayahData, versesData]) => {
        setData(ayahData);
        if (!ayahData.readingTr) {
          const verse = versesData.verses.find(v => v.ayahNumber === ayahNumber);
          if (verse?.reading) setReading(verse.reading);
        } else {
          setReading(ayahData.readingTr);
        }
        if (ayahData.translations?.length) setTranslations(ayahData.translations);
      })
      .catch(() => setError("Ayet yüklenemedi. Bağlantını kontrol et."))
      .finally(() => setLoading(false));
  }, [surahId, ayahNumber]);

  // Kök anlamları — Kökler sekmesi açılınca fetch et
  const [rootMeaningsLocal, setRootMeaningsLocal] = useState<Record<string, string>>({});
  const rootMeaningsFetched = useState(false);

  const fetchRootMeanings = useCallback(async (words: AyahDetailResponse["words"]) => {
    if (rootMeaningsFetched[0]) return;
    rootMeaningsFetched[1](true);
    const existing = data?.rootMeanings ?? {};
    const roots = [...new Set(words.map(w => w.root).filter(Boolean))] as string[];
    const missing = roots.filter(r => !existing[r]);
    if (missing.length === 0) { setRootMeaningsLocal(existing); return; }
    const results: Record<string, string> = { ...existing };
    await Promise.all(missing.map(r =>
      api.roots.detail(r).then(d => { if (d?.meaningTr) results[r] = d.meaningTr; }).catch(() => {})
    ));
    setRootMeaningsLocal(results);
  }, [data, rootMeaningsFetched]);

  const navigate = useCallback(
    (s: number, a: number) => {
      router.replace(`/ayah/${s}/${a}`);
    },
    [],
  );

  const headerTitle = data
    ? `${data.surahName} · ${data.ayahNumber}. Ayet`
    : "Ayet Detayı";

  // Ayet değişince kök anlamı kilidini ve yerel haritayı sıfırla
  useEffect(() => {
    rootMeaningsFetched[1](false);
    setRootMeaningsLocal({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahId, ayahNumber]);

  // Kökler sekmesi açılınca root anlamlarını fetch et
  useEffect(() => {
    if (activeTab !== "roots" || !data || rootMeaningsFetched[0]) return;
    fetchRootMeanings(data.words);
  }, [activeTab, data]);

  const navToRoot = useCallback((root: string) => {
    router.push(`/root/${encodeURIComponent(root)}`);
  }, []);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const webUrl = `https://kuran-app-web-ozan-s-projects8.vercel.app/surah/${surahId}/ayah/${ayahNumber}`;
    const text = [
      `${data.surahName} · ${data.ayahNumber}. Ayet`,
      data.arabicText ?? "",
      data.meal ?? "",
      webUrl,
    ].filter(Boolean).join("\n\n");
    try {
      await Share.share({ message: text, title: `${data.surahName} ${data.ayahNumber}. Ayet` });
    } catch { /* kullanıcı iptal etti / paylaşım hatası — sessiz geç */ }
  }, [data, surahId, ayahNumber]);

  const handleSaveNote = useCallback(async () => {
    const ok = await saveNote(verseKey, noteDraft);
    if (!ok) { Alert.alert("Not kaydedilemedi", "Lütfen tekrar deneyin."); return; }
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }, [verseKey, noteDraft, saveNote]);

  // ── Yükleme ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Ayet Detayı" }} />
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Ayet yükleniyor…
          </Text>
        </View>
      </>
    );
  }

  // ── Hata / Veri yok ──
  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: "Hata" }} />
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error ?? "Veri yüklenemedi."}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ── Veri görünümü ──
  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Başlık ═══ */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {data.surahName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {data.ayahNumber}. Ayet · {data.verseKey}
          </Text>

          {/* JumpBar + paylaş + favori aynı satırda */}
          <AyahJumpBar
            surahId={surahId}
            current={ayahNumber}
            total={data.verseCount}
            colors={colors}
            rightContent={
              <>
                <TouchableOpacity onPress={handleShare} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFav(verseKey)} hitSlop={8} activeOpacity={0.7}>
                  <Text style={{ fontSize: 20 }}>{isFavorite(verseKey) ? "❤️" : "🤍"}</Text>
                </TouchableOpacity>
              </>
            }
          />
        </View>

        {/* ═══ Arapça Metin ═══ */}
        <View style={[styles.arabicBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.arabicText, { color: colors.textPrimary }]}>
            {data.arabicText ?? "—"}
          </Text>
        </View>

        {/* ═══ Okunuş — Arapça metnin hemen altında ═══ */}
        {reading ? (
          <View style={[styles.readingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.readingText, { color: colors.textSecondary }]}>{reading}</Text>
          </View>
        ) : null}

        {/* ═══ Sure Hakkında ═══ */}
        <SurahAboutAccordion surahId={surahId} colors={colors} />

        {/* ═══ Sekmeler ═══ */}
        <SegmentedTabs active={activeTab} onChange={setActiveTab} colors={colors} />

        {/* ═══ Sekme İçerikleri ═══ */}
        {activeTab === "meal" && (
          <View style={styles.tabContent}>

            {/* Çeviriler — API güncellenince çoğalır, şimdilik primary + literal */}
            {translations.length > 0 ? (
              translations.map((t) => (
                <View key={t.source} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.accent }]}>
                    {sourceName(t.source ?? "")}
                  </Text>
                  <Text style={[styles.mealText, { color: colors.textSecondary }]}>{t.text ?? "—"}</Text>
                </View>
              ))
            ) : (
              <>
                {data.meal ? (
                  <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.accent }]}>MEAL</Text>
                    <Text style={[styles.mealText, { color: colors.textSecondary }]}>{data.meal}</Text>
                  </View>
                ) : null}
                {data.literalCeviri ? (
                  <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.accent }]}>LİTERAL ÇEVİRİ</Text>
                    <Text style={[styles.mealText, { color: colors.textSecondary }]}>{data.literalCeviri}</Text>
                  </View>
                ) : null}
                {!data.meal && !data.literalCeviri && (
                  <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.mealText, { color: colors.textMuted }]}>Meal verisi yok.</Text>
                  </View>
                )}
              </>
            )}

          </View>
        )}

        {activeTab === "words" && (
          <View style={styles.tabContent}>
            {data.words.length > 0 ? (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>KELİME ANALİZİ</Text>
                <View style={styles.wordsList}>
                  {data.words.map((w) => (
                    <View
                      key={w.wordIndex}
                      style={[
                        styles.wordCard,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                    >
                      {/* Arapça kelime */}
                      <View style={styles.wordTopRow}>
                        <Text style={[styles.wordIndex, { color: colors.textMuted }]}>
                          #{w.wordIndex + 1}
                        </Text>
                        <Text style={[styles.wordArabicChip, { color: colors.textPrimary }]}>
                          {w.arabic ?? "—"}
                        </Text>
                      </View>

                      {/* Anlam */}
                      <View style={styles.wordDetailRow}>
                        <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                          Anlam
                        </Text>
                        <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                          {w.meaningTr ?? "Anlam yok"}
                        </Text>
                      </View>

                      {/* Tür */}
                      {w.pos ? (
                        <View style={styles.wordDetailRow}>
                          <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                            Tür
                          </Text>
                      <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                        {translatePos(w.pos)}
                      </Text>
                        </View>
                      ) : null}

                      {/* Kök */}
                      <View style={styles.wordDetailRow}>
                        <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                          Kök
                        </Text>
                        {isRootClickable(w) ? (
                          <TouchableOpacity
                            onPress={() => navToRoot(w.root!)}
                            activeOpacity={0.6}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.rootLink, { color: colors.accent }]}>
                              {w.root}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={[styles.wordDetailValue, { color: colors.textMuted }]}>
                            {getRootDisplayText(w)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Kelime analizi verisi yok.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "roots" && (
          <View style={styles.tabContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.accent }]}>KÖKLER</Text>
              <UniqueRootList words={data.words} rootMeanings={Object.keys(rootMeaningsLocal).length > 0 ? rootMeaningsLocal : (data.rootMeanings ?? {})} colors={colors} />
            </View>
          </View>
        )}

        {activeTab === "analysis" && (
          <View style={styles.tabContent}>

            {/* Literal Çeviri */}
            {data.literalCeviri ? (
              <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.analysisCardTitle, { color: colors.textPrimary }]}>Literal Çeviri</Text>
                <Text style={[styles.analysisCardSubtitle, { color: colors.textMuted }]}>
                  Kelimenin kelime karşılığı
                </Text>
                <Text style={[styles.analysisCardBody, { color: colors.textSecondary }]}>
                  {data.literalCeviri}
                </Text>
              </View>
            ) : null}

            {/* Fark Analizi */}
            {data.farkAnalizi ? (
              <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.analysisCardTitle, { color: colors.textPrimary }]}>Fark Analizi</Text>
                <Text style={[styles.analysisCardSubtitle, { color: colors.textMuted }]}>
                  Meal ile literal çeviri arasındaki anlam farkları
                </Text>
                <Text style={[styles.analysisCardBody, { color: colors.textSecondary }]}>
                  {data.farkAnalizi}
                </Text>
              </View>
            ) : null}


            {/* Ham Anlam Özeti */}
            <RawMeaningSummary words={data.words} colors={colors} />

            {/* Tema Etiketleri */}
            {(data.anaTema || data.altTaglar?.length > 0) && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>TEMA ETİKETLERİ</Text>
                <View style={styles.tagRow}>
                  {data.anaTema && (
                    <TouchableOpacity
                      style={[styles.tag, styles.tagPrimary]}
                      onPress={() => router.push(`/search?tag=${encodeURIComponent(data.anaTema!)}&page=1`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.tagTextPrimary}>{data.anaTema}</Text>
                    </TouchableOpacity>
                  )}
                  {data.altTaglar?.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.tag}
                      onPress={() => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Hiç veri yoksa */}
            {!data.farkAnalizi && data.words.filter((w) => w.meaningTr?.trim()).length === 0 && (
              <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Bu ayet için analiz verisi bulunamadı.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ Navigasyon ═══ */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { backgroundColor: data.prevAyah ? colors.accent : colors.border },
            ]}
            onPress={() =>
              data.prevAyah &&
              navigate(data.prevAyah.surahId, data.prevAyah.ayahNumber)
            }
            disabled={!data.prevAyah}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navBtnText,
                !data.prevAyah && { color: colors.textMuted },
              ]}
            >
              ← Önceki
            </Text>
          </TouchableOpacity>

          <Text style={[styles.navCenter, { color: colors.textMuted }]}>
            {data.ayahNumber} / {data.verseCount}
          </Text>

          <TouchableOpacity
            style={[
              styles.navBtn,
              { backgroundColor: data.nextAyah ? colors.accent : colors.border },
            ]}
            onPress={() =>
              data.nextAyah &&
              navigate(data.nextAyah.surahId, data.nextAyah.ayahNumber)
            }
            disabled={!data.nextAyah}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navBtnText,
                !data.nextAyah && { color: colors.textMuted },
              ]}
            >
              Sonraki →
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Kişisel Not ═══ */}
        <View style={[styles.noteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.noteHeader}>
            <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>📝 Kişisel Not</Text>
            {noteSaved && (
              <Text style={[styles.noteSavedBadge, { color: colors.accent }]}>✓ Kaydedildi</Text>
            )}
          </View>
          <TextInput
            style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="Bu ayet hakkında notlarınızı buraya yazın…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={styles.noteActions}>
            {noteDraft.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => { setNoteDraft(""); saveNote(verseKey, ""); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.noteDelete, { color: colors.error }]}>Notu Sil</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.noteSaveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSaveNote}
              activeOpacity={0.8}
            >
              <Text style={styles.noteSaveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Merkez / Durum ──
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 20,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText:   { fontSize: 14, textAlign: "center" },
  backBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    minHeight: 44, justifyContent: "center", borderRadius: 8,
  },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 48 },

  // ── Başlık kartı ──
  headerCard: {
    borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18, fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 4, fontSize: 13, fontWeight: "500",
  },

  // ── Arapça metin ──
  arabicBox: {
    borderRadius: 12, padding: 20, marginBottom: 6,
    alignItems: "center", borderWidth: 1,
  },
  arabicText: {
    fontSize: 36, lineHeight: 60,
    fontFamily: "Amiri", textAlign: "right",
    writingDirection: "rtl", width: "100%",
  },
  readingBox: {
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 10, borderWidth: 1,
  },
  readingText: {
    fontSize: 15, lineHeight: 24, textAlign: "center", fontStyle: "italic",
  },

  // ── Sekmeler ──
  tabBar: {
    flexDirection: "row", borderRadius: 10,
    borderWidth: 1, padding: 3, marginBottom: 10,
  },
  tabItem: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    minHeight: 38,
  },
  tabItemActive: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  tabContent: { gap: 10 },

  // ── Bölüm kartı ──
  sectionCard: {
    borderRadius: 12, padding: 16, borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: "700",
    letterSpacing: 0.5, marginBottom: 10,
  },
  mealText: { fontSize: 15, lineHeight: 26 },
  literalText: { fontSize: 14, lineHeight: 24, fontStyle: "italic" },

  // ── Kelime listesi ──
  wordsList: { gap: 8 },
  wordCard: {
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  wordTopRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 8,
  },
  wordIndex: { fontSize: 11, fontWeight: "700" },
  wordArabicChip: {
    fontSize: 22, fontFamily: "Amiri",
    textAlign: "right", writingDirection: "rtl",
  },
  wordDetailRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  wordDetailLabel: {
    fontSize: 11, fontWeight: "600",
    textTransform: "uppercase",
  },
  wordDetailValue: {
    fontSize: 13, fontWeight: "500",
    flex: 1, textAlign: "right",
  },
  rootLink: {
    fontSize: 16, fontWeight: "700",
    textDecorationLine: "underline",
  },

  // ── Kök listesi ──
  rootsGrid: { gap: 8 },
  rootChip: {
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  rootChipRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  rootChipArabic: {
    fontSize: 22, fontWeight: "700",
    fontFamily: "Amiri", writingDirection: "rtl",
  },
  rootCountBadge: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  rootCountText:   { fontSize: 11, fontWeight: "600" },
  rootChipMeaning: { fontSize: 11, marginTop: 3 },

  tafsirBox:    { marginTop: 12, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tafsirHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  tafsirTitle:  { fontSize: 15, fontWeight: "700" },
  tafsirSub:    { fontSize: 11, marginTop: 2 },
  tafsirBody:   { paddingHorizontal: 16, paddingBottom: 16 },
  tafsirText:   { fontSize: 13, lineHeight: 22 },

  // ── Analiz kartları ──
  analysisCard: {
    borderRadius: 12, padding: 16, borderWidth: 1,
  },
  analysisCardTitle: {
    fontSize: 14, fontWeight: "700",
  },
  analysisCardSubtitle: {
    marginTop: 2, fontSize: 11,
  },
  analysisCardBody: {
    marginTop: 8, fontSize: 14, lineHeight: 24,
  },

  // ── Boş durum ──
  emptyState: {
    borderRadius: 10, borderWidth: 1,
    borderStyle: "dashed", padding: 16, alignItems: "center",
  },
  emptyText: { fontSize: 13 },

  // ── Navigasyon ──
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 14,
  },
  navBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    minHeight: 44, justifyContent: "center", borderRadius: 8,
  },
  navBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  navCenter: { fontSize: 13 },

  // ── Hızlı Ayet Atlama ──
  jumpBar:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  jumpLabel:  { fontSize: 12, fontWeight: "500", flexShrink: 0 },
  jumpInput:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, minWidth: 44, maxWidth: 64, textAlign: "center", flexShrink: 1 },
  jumpBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexShrink: 0 },
  jumpBtnText:{ color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Sure Accordion ──
  accordionBox:    { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  accordionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  accordionTitle:  { fontSize: 14, fontWeight: "700" },
  accordionChevron:{ fontSize: 12 },
  accordionBody:   { paddingHorizontal: 14, paddingBottom: 14 },
  accordionText:   { fontSize: 13, lineHeight: 22 },

  // ── Tema Etiketleri ──
  tagRow:         { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag:            { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#bae6fd" },
  tagPrimary:     { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  tagText:        { fontSize: 11, color: "#0369a1", fontWeight: "500" },
  tagTextPrimary: { fontSize: 11, color: "#4338ca", fontWeight: "600" },

  // ── Kişisel Not ──
  noteBox: {
    borderRadius: 12, padding: 16, marginTop: 14, borderWidth: 1,
  },
  noteHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  noteTitle:       { fontSize: 14, fontWeight: "700" },
  noteSavedBadge:  { fontSize: 12, fontWeight: "600" },
  noteInput: {
    borderRadius: 10, borderWidth: 1, padding: 12,
    fontSize: 14, lineHeight: 22, minHeight: 100,
    marginBottom: 10,
  },
  noteActions:     { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  noteDelete:      { fontSize: 13, fontWeight: "600" },
  noteSaveBtn:     { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 8 },
  noteSaveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // (geriye dönük uyumluluk)
  wordRoot: {
    fontSize: 13, fontWeight: "600",
    textDecorationLine: "underline",
  },
});