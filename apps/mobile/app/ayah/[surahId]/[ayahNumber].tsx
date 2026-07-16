import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Share,
  StyleSheet,
  Alert,
  Platform,
  Keyboard,
  Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SkeletonAyetCard, SkeletonBox } from "../../../src/components/SkeletonLoader";
import { TajweedText } from "../../../src/components/TajweedText";
import { api, type AyahDetailResponse } from "../../../src/lib/api";
import { useNotes } from "../../../src/hooks/useNotes";
import { useColors } from "../../../src/hooks/useColors";
import { useFavorites } from "../../../src/hooks/useFavorites";
import { useStreak } from "../../../src/hooks/useStreak";
import * as Haptics from 'expo-haptics';
import { logScreen, logFeature, AnalyticsEvents } from '../../../src/lib/analytics';
import { WEB_BASE_URL } from "../../../src/lib/runtimeConfig";
import { useTourTarget, useTourScroller } from "../../../src/tour/AppTourProvider";
import { READING_MAX_WIDTH } from "../../../src/lib/layout";
import { storage, STORAGE_KEYS } from "../../../src/lib/storage";
import { AyahShareModal } from "../../../src/components/AyahShareModal";
import { isImageShareAvailable } from "../../../src/lib/shareImage";
import { useFontScale, FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP } from "../../../src/hooks/useFontScale";
import { arapRakam, ayetinSayfasi } from "../../../src/lib/mushafSayfa";
import { TAJWEED_LEGEND } from "../../../src/lib/tajweed";

// Collator bir kez oluştur — localeCompare(x, "ar") her çağrıda yeni collator yaratır
const arCollator = new Intl.Collator("ar");

// Analiz sekmesindeki "TEMA ETİKETLERİ" kartını göster/gizle. Etiket atamalarının
// doğruluğu teyit edilene kadar kullanıcıya kapalı. Doğrulanınca true yapılabilir.
const SHOW_THEME_TAGS = false;

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

// ── Detaylı morfoloji (QAC kodları → Türkçe) ──────────────────────────────────
// SADECE emin olunan standart kodlar çevrilir; tanınmayan/teknik kodlar (REM, ATT,
// SUP, PRO vb.) listede YOK → atlanır, böylece kullanıcıya ham İngilizce sızmaz.
const MORPH_TR: Record<string, string> = {
  // alt-tür
  PN: "özel isim", PRON: "zamir", ADJ: "sıfat", DEM: "işaret", REL: "ilgi zamiri",
  CONJ: "bağlaç", NEG: "olumsuzluk", DET: "belirli (ال)", INDEF: "belirsiz",
  VOC: "nida", INTG: "soru", COND: "şart", EMPH: "tekid",
  // hâl (irab)
  NOM: "yalın hâl", ACC: "belirtme hâli", GEN: "tamlayan hâli",
  // cinsiyet / sayı
  M: "eril", F: "dişil", MS: "eril tekil", FS: "dişil tekil",
  MP: "eril çoğul", FP: "dişil çoğul", MD: "eril ikil", FD: "dişil ikil", D: "ikil",
  // şahıs
  "1S": "1. tekil", "1P": "1. çoğul",
  "2MS": "2. tekil eril", "2FS": "2. tekil dişil", "2MP": "2. çoğul eril",
  "2FP": "2. çoğul dişil", "2MD": "2. ikil eril", "2FD": "2. ikil dişil", "2D": "2. ikil",
  "3MS": "3. tekil eril", "3FS": "3. tekil dişil", "3MP": "3. çoğul eril",
  "3FP": "3. çoğul dişil", "3MD": "3. ikil eril", "3FD": "3. ikil dişil", "3D": "3. ikil",
  // fiil zaman / kip / çatı
  PERF: "geçmiş zaman", IMPF: "geniş zaman", IMPV: "emir", FUT: "gelecek zaman",
  IND: "haber kipi", SUBJ: "istek kipi", JUS: "cezm",
  PASS: "edilgen", CAUS: "ettirgen",
  ACT_PCPL: "etken ortaç", PASS_PCPL: "edilgen ortaç", VN: "mastar",
};

function parseMorphology(m: string | null): string {
  if (!m) return "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of m.split(/[|:\s]+/)) {
    const tr = MORPH_TR[tok.trim()];
    if (tr && !seen.has(tr)) { seen.add(tr); out.push(tr); }
  }
  return out.join(" · ");
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

function isRootClickable(
  word: AyahDetailResponse["words"][number],
): word is AyahDetailResponse["words"][number] & { root: string } {
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
      accessibilityRole="button"
      accessibilityLabel="Sure hakkında tefsiri aç"
    >
      <View style={styles.accordionHeader}>
        <View style={styles.accordionTitleRow}>
          <Ionicons name="book-outline" size={17} color={colors.accent} />
          <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>Sure tefsirini oku</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
            accessibilityRole="button"
            accessibilityLabel={`${root} kökünü incele`}
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

function AyahJumpBar({ surahId, current, total, colors, onJump }: {
  surahId: number; current: number; total: number; colors: ThemeColors; onJump: () => void;
}) {
  const [surahVal, setSurahVal] = useState(String(surahId));
  const [ayahVal,  setAyahVal]  = useState(String(current));
  const ayahInputRef = useRef<TextInput>(null);

  useEffect(() => { setSurahVal(String(surahId)); }, [surahId]);
  useEffect(() => { setAyahVal(String(current)); },  [current]);

  function jump() {
    Keyboard.dismiss();
    const s = parseInt(surahVal, 10);
    const a = parseInt(ayahVal,  10);
    const targetSurah = s >= 1 && s <= 114 ? s : surahId;
    let targetAyah    = a >= 1 ? a : 1;
    // Aynı surede kalınıyorsa üst sınır belli → kırp. Farklı surenin ayet
    // sayısı burada bilinmiyor; aşarsa mevcut hata ekranı devreye girer.
    if (targetSurah === surahId) targetAyah = Math.min(targetAyah, total);
    onJump();
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
        // "İleri" ayet kutusuna geçer; gitme yalnız ayet onayında / Git düğmesinde.
        onSubmitEditing={() => ayahInputRef.current?.focus()}
        submitBehavior="submit"
        returnKeyType="next"
        selectTextOnFocus
      />
      <Text style={[styles.jumpLabel, { color: colors.textMuted }]}>Ayet:</Text>
      <TextInput
        ref={ayahInputRef}
        style={inputStyle}
        value={ayahVal}
        onChangeText={setAyahVal}
        keyboardType="number-pad"
        onSubmitEditing={jump}
        returnKeyType="go"
        selectTextOnFocus
      />
      <TouchableOpacity style={[styles.jumpBtn, { backgroundColor: colors.accent }]} onPress={jump} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Ayete git">
        <Text style={styles.jumpBtnText}>Git</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Sekme Bileşeni ────────────────────────────────────────────────────────────

type TabId = "meal" | "words" | "roots" | "analysis";

function SegmentedTabs({
  active,
  onChange,
  colors,
  analysisTarget,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
  colors: ThemeColors;
  analysisTarget?: ReturnType<typeof useTourTarget>;
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
            {...(t.id === "analysis" && analysisTarget ? analysisTarget : {})}
            style={[
              styles.tabItem,
              isActive && { backgroundColor: colors.accent },
              isActive && styles.tabItemActive,
            ]}
            onPress={() => onChange(t.id)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t.label}
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

// Ortak useColors paletiyle hizalı (bkz. src/hooks/useColors.ts) + ekrana özgü
// `error`. Ayrı tutulmasının tek sebebi alan adları (textPrimary vb.).
const lightColors: ThemeColors = {
  bg:           "#f5f0e8",
  card:         "#fffdf6",
  surfaceAlt:   "#f5f0e8",
  border:       "#e7dfcc",
  textPrimary:  "#1c1917",
  textSecondary:"#44403c",
  textMuted:    "#78716c",
  accent:       "#059669",
  accentLight:  "#d1fae5",
  error:        "#dc2626",
};

const darkColors: ThemeColors = {
  bg:           "#0f0f0f",
  card:         "#1c1917",
  surfaceAlt:   "#292524",
  border:       "#44403c",
  textPrimary:  "#fafaf9",
  textSecondary:"#d6d3d1",
  textMuted:    "#a8a29e",
  accent:       "#10b981",
  accentLight:  "#064e3b",
  error:        "#f87171",
};

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function AyahDetailScreen() {
  // Uygulama temasını izle (useColors) — doğrudan useColorScheme kullanılsaydı
  // ana sayfadaki tema düğmesi bu ekranı etkilemezdi (yalnız sistem temasını izlerdi).
  const { isDark } = useColors();
  const colors = isDark ? darkColors : lightColors;
  // Mushaf sayfa görünümüyle aynı "kâğıt" estetiği (bkz. mushaf-sayfa.tsx kagit/sureBasligi)
  const paper = isDark
    ? { backgroundColor: "#1c1917", borderColor: "#44403c" }
    : { backgroundColor: "#fffdf6", borderColor: "#e7dfcc" };
  const gold = isDark ? "#c9a84c" : "#a16207";
  const goldBorder = isDark ? "#78716c" : "#c9a84c";
  const insets = useSafeAreaInsets();
  const ayahTarget = useTourTarget("ayah.main");
  const analysisTabTarget = useTourTarget("ayah.analysis");
  const tourScroll = useTourScroller();

  const { surahId: rawS, ayahNumber: rawA } =
    useLocalSearchParams<{ surahId: string; ayahNumber: string }>();
  const surahId    = Number(rawS);
  const ayahNumber = Number(rawA);

  const { getNote, saveNote, loaded: notesLoaded } = useNotes();
  const { isFavorite, toggle: toggleFav, loaded: favLoaded } = useFavorites();
  useStreak(); // Ayet görüntülenince okuma serisini güncelle
  const verseKey = `${surahId}:${ayahNumber}`;

  const [data, setData]       = useState<AyahDetailResponse | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("meal");
  // Sure/ayet atlama çubuğu — yapışkan alt bardaki "x / y" sayacına dokununca açılır.
  const [jumpOpen, setJumpOpen] = useState(false);
  // Edge-to-edge Android'de klavye pencereyi daraltmaz, alttaki barın üzerine
  // biner → yazılan rakamlar klavyenin arkasında kalır. Örtüşme kadar alt boşluk
  // verip barı klavyenin üstüne kaldırıyoruz. screenY tabanlı hesap: pencere
  // kendini yeniden boyutlandırırsa örtüşme 0 çıkar, çifte kaldırma olmaz.
  const [kbOverlap, setKbOverlap] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const winH = Dimensions.get("window").height;
      setKbOverlap(Math.max(0, winH - e.endCoordinates.screenY));
    });
    const hide = Keyboard.addListener(hideEvt, () => setKbOverlap(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  // Tecvid renklendirmesi aç/kapa — kalıcı tercih ("0" = kapalı, varsayılan açık).
  const [tajweed, setTajweed] = useState(() => storage.getStringSync(STORAGE_KEYS.tajweed) !== "0");

  useEffect(() => { logScreen("AyetDetay"); }, []);

  useEffect(() => {
    let alive = true;
    storage.getString(STORAGE_KEYS.tajweed).then((v) => {
      if (alive && v != null) setTajweed(v !== "0");
    });
    return () => { alive = false; };
  }, []);

  const handleTajweedToggle = useCallback(() => {
    setTajweed((prev) => {
      const next = !prev;
      storage.setString(STORAGE_KEYS.tajweed, next ? "1" : "0");
      return next;
    });
  }, []);

  // Yazı boyutu (A− / A+) — Arapça metin, okunuş ve meale uygulanır; mushaf ile
  // ortak kalıcı tercih (useFontScale).
  const { fontScale, changeFontScale } = useFontScale();
  const scaledText = useMemo(() => ({
    // UthmanicHafs harekeler için geniş satır aralığı ister (mushafla aynı ~1.9 oran)
    arabic:  { fontSize: 30 * fontScale, lineHeight: 58 * fontScale },
    reading: { fontSize: 15 * fontScale, lineHeight: 24 * fontScale },
    meal:    { fontSize: 15 * fontScale, lineHeight: 26 * fontScale },
  }), [fontScale]);
  const noteSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Taslak/kayıt erişimi ref üzerinden: aşağıdaki flush cleanup'ı yalnız verseKey
  // değişiminde koşmalı; getNote/saveNote kimlik değişimleri onu tetiklememeli.
  const noteDraftRef = useRef("");
  useEffect(() => { noteDraftRef.current = noteDraft; }, [noteDraft]);
  const getNoteRef = useRef(getNote);
  useEffect(() => { getNoteRef.current = getNote; }, [getNote]);
  const saveNoteRef = useRef(saveNote);
  useEffect(() => { saveNoteRef.current = saveNote; }, [saveNote]);

  // Notlar storage'dan asenkron yükleniyor; verseKey değişmese bile notesLoaded
  // false→true olunca taslağı gerçek notla doldurmalıyız — aksi halde ilk açılışta
  // boş görünür ve "Kaydet" mevcut notu siler. Kullanıcı yükleme bitmeden yazmaya
  // başlarsa hydratedKeyRef bunu işaretler, taslağı ezmeyiz.
  const notesHydratedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!notesLoaded) return;
    if (notesHydratedKeyRef.current === verseKey) return;
    notesHydratedKeyRef.current = verseKey;
    setNoteDraft(getNoteRef.current(verseKey));
  }, [verseKey, notesLoaded]);

  const handleNoteDraftChange = useCallback((text: string) => {
    notesHydratedKeyRef.current = verseKey;
    setNoteDraft(text);
  }, [verseKey]);

  // Ayet değişirken/ekrandan çıkarken KAYDEDİLMEMİŞ dolu taslağı otomatik kaydet
  // — Önceki/Sonraki taslağı sessizce siliyordu. Boş bırakılan taslak kayıtlı
  // notu SİLMEZ (silme yalnız "Notu Sil" ile).
  useEffect(() => {
    return () => {
      const draft = noteDraftRef.current.trim();
      if (draft && draft !== getNoteRef.current(verseKey)) {
        void saveNoteRef.current(verseKey, draft);
      }
    };
  }, [verseKey]);

  // "Kaydedildi" rozeti ayete özgü — ayet değişince taşınmasın. (getNote'a
  // bağlı üstteki effect'e konulamaz: kaydetme sonrası rozeti anında söndürürdü.)
  useEffect(() => {
    setNoteSaved(false);
  }, [verseKey]);

  // Hata ekranındaki "Tekrar Dene" fetch'i yeniden tetikler.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Bozuk/eksik deep link parametresi (örn. dış link, App Links) → sonsuz
    // yükleniyor ekranında kalmasın, mevcut hata ekranına düşsün.
    if (!surahId || !ayahNumber) {
      setError("Geçersiz ayet bağlantısı.");
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);
    // router.replace ile ayet değişince component remount olmaz; okunuş
    // sıfırlanmazsa yeni ayette önceki ayetin okunuşu görünebilir.
    setReading(null);
    // Sadece ayeti bekle → sayfa hemen açılsın. Surenin tüm ayetleri (Bakara'da
    // 286!) yalnız okunuş yedeği içindi; artık kritik yolu bloklamaz, gerekirse
    // arka planda çekilir.
    api.ayah.get(surahId, ayahNumber)
      .then((ayahData) => {
        if (!isMounted) return;
        setData(ayahData);
        if (ayahData.readingTr) {
          setReading(ayahData.readingTr);
        } else {
          // Okunuş yanıtta yoksa: sureyi ayrıca çek (sayfayı bloklamadan).
          api.verses.bySurah(surahId)
            .then((versesData) => {
              if (!isMounted) return;
              const verse = versesData.verses.find(v => v.ayahNumber === ayahNumber);
              if (verse?.reading) setReading(verse.reading);
            })
            .catch(() => { /* okunuş yedeği başarısız — sessiz geç */ });
        }
      })
      .catch(() => { if (isMounted) setError("Ayet yüklenemedi. Bağlantını kontrol et."); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [surahId, ayahNumber, reloadKey]);

  // Kök anlamları doğrudan /api/ayah yanıtından (data.rootMeanings) gelir.
  // Backend root_meanings JOIN ile veriyor; eski fallback /root/[root] fetch'i
  // AYNI tablodan okuduğu için ek anlam getiremiyordu (ölü + ağır) → kaldırıldı.

  const navigate = useCallback(
    (s: number, a: number) => {
      router.replace(`/ayah/${s}/${a}`);
    },
    [],
  );

  const headerTitle = data
    ? `${data.surahName} · ${data.ayahNumber}. Ayet`
    : "Ayet Detayı";

  const navToRoot = useCallback((root: string) => {
    router.push(`/root/${encodeURIComponent(root)}`);
  }, []);

  const handleShareText = useCallback(async () => {
    if (!data) return;
    const webUrl = `${WEB_BASE_URL}/surah/${surahId}/ayah/${ayahNumber}`;
    const title = `${data.surahName} ${data.ayahNumber}. Ayet`;
    const bodyParts = [
      `${data.surahName} · ${data.ayahNumber}. Ayet`,
      data.arabicText ?? "",
      reading ?? "",
      data.meal ?? "",
    ].filter(Boolean);
    // Android'in paylaşım intent'i yalnızca `message` alanını okur, `url`'i yok sayar
    // → link mesaja gömülmeli. iOS ise `url`'i ayrı bir bağlantı önizlemesi olarak
    // gösterir; mesaja da gömülürse link iki kez görünür.
    const shareOptions = Platform.OS === "ios"
      ? { title, message: bodyParts.join("\n\n"), url: webUrl }
      : { title, message: [...bodyParts, webUrl].join("\n\n") };
    try {
      await Share.share(shareOptions);
    } catch { /* kullanıcı iptal etti / paylaşım hatası — sessiz geç */ }
  }, [data, surahId, ayahNumber, reading]);

  // Paylaş düğmesi: görsel paylaşım modülleri build'de varsa kart önizlemesi açılır
  // (görsel/metin seçimi orada); yoksa doğrudan mevcut metin paylaşımı.
  const [shareOpen, setShareOpen] = useState(false);
  const handleShare = useCallback(() => {
    if (!data) return;
    logFeature(AnalyticsEvents.PAYLASIM);
    if (isImageShareAvailable) setShareOpen(true);
    else handleShareText();
  }, [data, handleShareText]);

  useEffect(() => {
    return () => {
      if (noteSavedTimerRef.current) clearTimeout(noteSavedTimerRef.current);
    };
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!notesLoaded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await saveNote(verseKey, noteDraft);
    if (!ok) { Alert.alert("Not kaydedilemedi", "Lütfen tekrar deneyin."); return; }
    setNoteSaved(true);
    if (noteSavedTimerRef.current) clearTimeout(noteSavedTimerRef.current);
    noteSavedTimerRef.current = setTimeout(() => setNoteSaved(false), 2000);
  }, [verseKey, noteDraft, saveNote, notesLoaded]);

  const handleToggleFav = useCallback(() => {
    if (!favLoaded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logFeature(AnalyticsEvents.FAVORI_EKLE);
    toggleFav(verseKey);
  }, [toggleFav, verseKey, favLoaded]);

  const handleMushaftaAc = useCallback(() => {
    logFeature("ayah_mushafta_ac", { verse: verseKey });
    router.push(`/mushaf-sayfa?sayfa=${ayetinSayfasi(surahId, ayahNumber)}`);
  }, [surahId, ayahNumber, verseKey]);

  const handlePrev = useCallback(() => {
    if (data?.prevAyah) navigate(data.prevAyah.surahId, data.prevAyah.ayahNumber);
  }, [data, navigate]);

  const handleNext = useCallback(() => {
    if (data?.nextAyah) navigate(data.nextAyah.surahId, data.nextAyah.ayahNumber);
  }, [data, navigate]);

  const handleDeleteNote = useCallback(() => {
    if (!notesLoaded) return;
    Alert.alert(
      "Not silinsin mi?",
      "Bu ayete ekledi\u011finiz ki\u015fisel not kald\u0131r\u0131lacak.",
      [
        { text: "Vazge\u00e7", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const previousDraft = noteDraft;
            const ok = await saveNote(verseKey, "");
            if (!ok) {
              setNoteDraft(previousDraft);
              Alert.alert("Not silinemedi", "L\u00fctfen tekrar deneyin.");
              return;
            }
            setNoteDraft("");
            setNoteSaved(false);
          },
        },
      ],
    );
  }, [noteDraft, saveNote, verseKey, notesLoaded]);

  // ── Yükleme ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Ayet Detayı" }} />
        <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: insets.top + 16, gap: 14 }}>
          {/* Arapça metin — sağa dayalı */}
          <SkeletonBox width="88%" height={38} borderRadius={8} style={{ alignSelf: "flex-end" }} />
          <SkeletonBox width="66%" height={26} borderRadius={8} style={{ alignSelf: "flex-end", marginBottom: 4 }} />
          {/* okunuş + meal kartları */}
          <SkeletonAyetCard />
          <SkeletonAyetCard />
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
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error ?? "Veri yüklenemedi."}
          </Text>
          {surahId && ayahNumber ? (
            <TouchableOpacity
              onPress={() => setReloadKey((k) => k + 1)}
              style={[styles.backBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Tekrar dene"
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.backBtnText}>Tekrar Dene</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
          >
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Geri Dön</Text>
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
        {...tourScroll}
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ Mushaf Kartı — sayfa görünümüyle aynı kâğıt estetiği ═══ */}
        <View {...ayahTarget} style={[styles.paperCard, paper]}>
          {/* Sure başlığı süslemesi (mushaftaki sureBasligi ile aynı) */}
          <View style={[styles.sureBasligi, { borderColor: goldBorder }]}>
            <Text style={[styles.sureArapca, { color: colors.textPrimary }]} numberOfLines={1}>
              {data.arabicName}
            </Text>
            <Text style={[styles.sureAdi, { color: gold }]} numberOfLines={1}>
              {data.surahId}. {data.surahName} Suresi · {data.ayahNumber}. Ayet
            </Text>
          </View>

          <View style={styles.tajRow}>
            {data.tajweedSpans.length > 0 ? (
              <TouchableOpacity
                style={[
                  styles.tajToggle,
                  tajweed
                    ? { backgroundColor: colors.accentLight, borderColor: colors.accent + "66" }
                    : { borderColor: colors.border },
                ]}
                onPress={handleTajweedToggle}
                activeOpacity={0.75}
                hitSlop={6}
                accessibilityRole="switch"
                accessibilityState={{ checked: tajweed }}
                accessibilityLabel="Tecvid renklendirmesini aç veya kapat"
              >
                <Ionicons name="color-palette-outline" size={14} color={tajweed ? colors.accent : colors.textMuted} />
                <Text style={[styles.tajToggleText, { color: tajweed ? colors.accent : colors.textMuted }]}>
                  Tecvid {tajweed ? "açık" : "kapalı"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <View style={styles.fontBtns}>
              <TouchableOpacity
                style={[styles.fontBtn, { borderColor: colors.border }, fontScale <= FONT_SCALE_MIN && styles.fontBtnDisabled]}
                onPress={() => changeFontScale(-FONT_SCALE_STEP)}
                disabled={fontScale <= FONT_SCALE_MIN}
                activeOpacity={0.7}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Yazıyı küçült"
                accessibilityState={{ disabled: fontScale <= FONT_SCALE_MIN }}
              >
                <MaterialCommunityIcons name="magnify-minus-outline" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fontBtn, { borderColor: colors.border }, fontScale >= FONT_SCALE_MAX && styles.fontBtnDisabled]}
                onPress={() => changeFontScale(FONT_SCALE_STEP)}
                disabled={fontScale >= FONT_SCALE_MAX}
                activeOpacity={0.7}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Yazıyı büyüt"
                accessibilityState={{ disabled: fontScale >= FONT_SCALE_MAX }}
              >
                <MaterialCommunityIcons name="magnify-plus-outline" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Ayet metni + mushaf tarzı altın ﴿ayet numarası﴾. Tecvid yolu dış Text
              KULLANMAZ: stil+numara TajweedText'e gider (native tek-Spannable
              renderer'da metnin bölünmemesi şart — Android shaping bug'ı). */}
          {data.arabicText && data.tajweedSpans.length > 0 && tajweed ? (
            <TajweedText
              text={data.arabicText}
              spans={data.tajweedSpans}
              style={[styles.arabicText, scaledText.arabic, { color: colors.textPrimary }]}
              suffix={{ text: ` ﴿${arapRakam(data.ayahNumber)}﴾`, color: gold }}
            />
          ) : (
            <Text selectable style={[styles.arabicText, scaledText.arabic, { color: colors.textPrimary }]}>
              {data.arabicText ?? "—"}
              <Text style={{ color: gold }}>{` ﴿${arapRakam(data.ayahNumber)}﴾`}</Text>
            </Text>
          )}

          {/* Okunuş — aynı kâğıtta, ince ayraçla */}
          {reading ? (
            <>
              <View style={[styles.arabicDivider, { backgroundColor: paper.borderColor }]} />
              <Text style={[styles.readingText, scaledText.reading, { color: colors.textSecondary }]}>{reading}</Text>
            </>
          ) : null}

          {/* Tecvid lejantı — mushaftaki gibi, renklendirme açıkken */}
          {tajweed && data.tajweedSpans.length > 0 ? (
            <View style={styles.legend}>
              {TAJWEED_LEGEND.map((l) => (
                <View key={l.ad} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.renk }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>{l.ad}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Eylemler — ayrı kart yerine kâğıdın alt kenarında ince satır */}
          <View style={[styles.arabicDivider, { backgroundColor: paper.borderColor }]} />
          <View style={styles.paperActions}>
            <TouchableOpacity
              style={[styles.mushafBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={handleMushaftaAc}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Bu ayeti mushaf sayfasında aç"
            >
              <Ionicons name="albums-outline" size={16} color={colors.accent} />
              <Text style={[styles.mushafBtnText, { color: colors.textSecondary }]}>Mushafta Aç</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={handleShare}
              hitSlop={6}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Ayeti paylaş"
            >
              <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                isFavorite(verseKey)
                  ? { backgroundColor: colors.error + "18", borderColor: colors.error + "55" }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={handleToggleFav}
              disabled={!favLoaded}
              hitSlop={6}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isFavorite(verseKey), disabled: !favLoaded }}
              accessibilityLabel={isFavorite(verseKey) ? "Favorilerden çıkar" : "Favorilere ekle"}
            >
              <Ionicons
                name={isFavorite(verseKey) ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite(verseKey) ? colors.error : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Sekmeler ═══ */}
        <SegmentedTabs active={activeTab} onChange={setActiveTab} colors={colors} analysisTarget={analysisTabTarget} />

        {/* ═══ Sekme İçerikleri ═══ */}
        {activeTab === "meal" && (
          <View style={styles.tabContent}>

            {data.meal ? (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>Elmalılı H. Yazır</Text>
                <Text style={[styles.mealText, scaledText.meal, { color: colors.textSecondary }]}>{data.meal}</Text>
              </View>
            ) : (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.mealText, { color: colors.textMuted }]}>Meal verisi yok.</Text>
              </View>
            )}

          </View>
        )}

        {activeTab === "words" && (
          <View style={styles.tabContent}>
            {data.words.length > 0 ? (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>
                  KELİME ANALİZİ · {data.words.length} KELİME
                </Text>
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
                      <View style={[styles.wordDetailRow, { borderTopColor: colors.border }]}>
                        <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                          Anlam
                        </Text>
                        <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                          {w.meaningTr ?? "Anlam yok"}
                        </Text>
                      </View>

                      {/* Tür */}
                      {w.pos ? (
                        <View style={[styles.wordDetailRow, { borderTopColor: colors.border }]}>
                          <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                            Tür
                          </Text>
                      <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                        {translatePos(w.pos)}
                      </Text>
                        </View>
                      ) : null}

                      {/* Detaylı morfoloji (varsa) */}
                      {parseMorphology(w.morphology) ? (
                        <View style={[styles.wordDetailRow, { borderTopColor: colors.border }]}>
                          <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                            Morfoloji
                          </Text>
                          <Text style={[styles.wordDetailValue, { color: colors.textSecondary }]}>
                            {parseMorphology(w.morphology)}
                          </Text>
                        </View>
                      ) : null}

                      {/* Kök */}
                      <View style={[styles.wordDetailRow, { borderTopColor: colors.border }]}>
                        <Text style={[styles.wordDetailLabel, { color: colors.textMuted }]}>
                          Kök
                        </Text>
                        {isRootClickable(w) ? (
                          <TouchableOpacity
                            onPress={() => navToRoot(w.root)}
                            activeOpacity={0.6}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`${w.root} kökünü incele`}
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
              <UniqueRootList words={data.words} rootMeanings={data.rootMeanings ?? {}} colors={colors} />
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

            {/* Tema Etiketleri — atama doğruluğu teyit edilene kadar kullanıcıya gizli.
                Etiket verisi ve tag'e göre arama DB'de duruyor; yalnızca bu kart gizlendi. */}
            {SHOW_THEME_TAGS && (data.anaTema || data.altTaglar?.length > 0) && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>TEMA ETİKETLERİ</Text>
                <View style={styles.tagRow}>
                  {data.anaTema && (
                    <TouchableOpacity
                      style={[styles.tag, styles.tagPrimary]}
                      onPress={() => { if (data.anaTema) router.push(`/search?tag=${encodeURIComponent(data.anaTema)}&page=1`); }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${data.anaTema} etiketine göre ara`}
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
                      accessibilityRole="button"
                      accessibilityLabel={`${tag} etiketine göre ara`}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Hiç veri yoksa */}
            {!data.literalCeviri && !data.farkAnalizi && data.words.filter((w) => w.meaningTr?.trim()).length === 0 && (
              <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Bu ayet için analiz verisi bulunamadı.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ Sure Tefsiri — derin okuma bağlantısı, içerikten sonra ═══ */}
        <SurahAboutAccordion surahId={surahId} colors={colors} />

        {/* ═══ Kişisel Not ═══ */}
        <View style={[styles.noteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.noteHeader}>
            <View style={styles.noteTitleRow}>
              <Ionicons name="create-outline" size={16} color={colors.accent} />
              <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>Kişisel Not</Text>
            </View>
            {noteSaved && (
              <View style={styles.noteSavedRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <Text style={[styles.noteSavedBadge, { color: colors.accent }]}>Kaydedildi</Text>
              </View>
            )}
          </View>
          <TextInput
            style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            value={noteDraft}
            onChangeText={handleNoteDraftChange}
            placeholder="Bu ayet hakkında notlarınızı buraya yazın…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            // Edge-to-edge'de klavye pencereyi daraltmadığından not alanı klavyenin
            // altında kalabilir; odaklanınca (klavye yerleştikten sonra) sona kaydır.
            onFocus={() => setTimeout(() => tourScroll.ref.current?.scrollToEnd({ animated: true }), 250)}
          />
          <View style={styles.noteActions}>
            {noteDraft.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleDeleteNote}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Notu sil"
              >
                <Text style={[styles.noteDelete, { color: colors.error }]}>Notu Sil</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.noteSaveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSaveNote}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Notu kaydet"
            >
              <Text style={styles.noteSaveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* ═══ Yapışkan Alt Gezinme — kaydırmadan Önceki/Sonraki; sayaca dokununca
          sure/ayet atlama çubuğu açılır. ScrollView'un kardeşi olduğu için
          içerikle çakışmaz (ekran kabı column + ScrollView flex:1). ═══ */}
      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            // Klavye açıkken bar klavyenin üstüne kalkar (kbOverlap); kapalıyken
            // sistem çubuğu güvenli alanı geçerli.
            paddingBottom: (kbOverlap > 0 ? kbOverlap : insets.bottom) + 8,
          },
        ]}
      >
        <View style={styles.stickyBarInner}>
          {jumpOpen ? (
            <AyahJumpBar
              surahId={surahId}
              current={ayahNumber}
              total={data.verseCount}
              colors={colors}
              onJump={() => setJumpOpen(false)}
            />
          ) : null}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.navBtn,
                { backgroundColor: data.prevAyah ? colors.accent : colors.border },
              ]}
              onPress={handlePrev}
              disabled={!data.prevAyah}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Önceki ayet"
              accessibilityState={{ disabled: !data.prevAyah }}
            >
              <Ionicons name="chevron-back" size={16} color={data.prevAyah ? "#fff" : colors.textMuted} />
              <Text
                style={[
                  styles.navBtnText,
                  !data.prevAyah && { color: colors.textMuted },
                ]}
              >
                Önceki
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navCenterWrap}
              onPress={() => setJumpOpen((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: jumpOpen }}
              accessibilityLabel="Sure ve ayet atlama çubuğunu aç veya kapat"
            >
              <View style={styles.navCenterRow}>
                <Text style={[styles.navCenter, { color: colors.textMuted }]}>
                  {data.ayahNumber} / {data.verseCount}
                </Text>
                <Ionicons name={jumpOpen ? "chevron-down" : "chevron-up"} size={12} color={colors.textMuted} />
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.accent,
                      width: `${Math.min(100, Math.max(2, (data.ayahNumber / Math.max(1, data.verseCount)) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navBtn,
                { backgroundColor: data.nextAyah ? colors.accent : colors.border },
              ]}
              onPress={handleNext}
              disabled={!data.nextAyah}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sonraki ayet"
              accessibilityState={{ disabled: !data.nextAyah }}
            >
              <Text
                style={[
                  styles.navBtnText,
                  !data.nextAyah && { color: colors.textMuted },
                ]}
              >
                Sonraki
              </Text>
              <Ionicons name="chevron-forward" size={16} color={data.nextAyah ? "#fff" : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ═══ Görsel Paylaşım Modalı (view-shot build'de varsa) ═══ */}
      <AyahShareModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        surahName={data.surahName}
        ayahNumber={data.ayahNumber}
        arabic={data.arabicText}
        meal={data.meal}
        onShareText={handleShareText}
      />
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Merkez / Durum ──
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 20, gap: 12,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText:   { fontSize: 14, textAlign: "center" },
  backBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    minHeight: 44, borderRadius: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 48, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  // ── Eylem satırı (kâğıt kartının alt kenarında) ──
  paperActions: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 8,
  },
  mushafBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 19, borderWidth: 1,
    paddingHorizontal: 14, minHeight: 38,
  },
  mushafBtnText: { fontSize: 13, fontWeight: "600" },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  // ── Mushaf kartı (kâğıt) ──
  paperCard: {
    borderRadius: 14, padding: 16, marginBottom: 8,
    alignItems: "center", borderWidth: 1,
  },
  sureBasligi: {
    width: "100%", borderWidth: 1.5, borderRadius: 12, alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10,
  },
  sureArapca: { fontFamily: "Amiri-Bold", fontSize: 22, lineHeight: 38 },
  sureAdi:    { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, marginTop: 1 },
  arabicText: {
    fontSize: 30, lineHeight: 58,
    fontFamily: "UthmanicHafs", textAlign: "right",
    writingDirection: "rtl", width: "100%",
  },
  legend:     { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10 },
  tajRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fontBtns: { flexDirection: "row", gap: 6 },
  fontBtn: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
    minWidth: 40, alignItems: "center",
  },
  fontBtnDisabled: { opacity: 0.35 },
  tajToggle: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tajToggleText: { fontSize: 12, fontWeight: "700" },
  arabicDivider: {
    width: "100%", height: StyleSheet.hairlineWidth,
    marginTop: 14, marginBottom: 12,
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
  // borderTopColor tema renginden inline verilir (karanlık modda görünür kalsın)
  wordDetailRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth,
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

  // ── Yapışkan alt gezinme ──
  stickyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingTop: 10,
  },
  stickyBarInner: {
    maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center",
  },
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12,
  },
  navBtn: {
    paddingHorizontal: 16, paddingVertical: 12,
    minHeight: 44, borderRadius: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2,
  },
  navBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  navCenterWrap: { flex: 1, alignItems: "center", gap: 6 },
  navCenterRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  navCenter: { fontSize: 13, fontWeight: "500" },
  progressTrack: {
    width: "100%", maxWidth: 120, height: 4,
    borderRadius: 2, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },

  // ── Hızlı Ayet Atlama (yapışkan barda, gezinme satırının üstünde) ──
  jumpBar:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  jumpLabel:  { fontSize: 12, fontWeight: "500", flexShrink: 0 },
  jumpInput:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, minWidth: 44, maxWidth: 64, textAlign: "center", flexShrink: 1 },
  jumpBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexShrink: 0 },
  jumpBtnText:{ color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Sure Accordion ──
  accordionBox:     { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  accordionHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  accordionTitleRow:{ flexDirection: "row", alignItems: "center", gap: 8 },
  accordionTitle:   { fontSize: 14, fontWeight: "700" },
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
  noteTitleRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  noteTitle:       { fontSize: 14, fontWeight: "700" },
  noteSavedRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
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
