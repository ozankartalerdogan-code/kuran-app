import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, useWindowDimensions, Modal,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api, type MushafPageResponse, type SurahListItem } from "../src/lib/api";
import { storage, STORAGE_KEYS } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";
import { useStreak } from "../src/hooks/useStreak";
import { useKeepAwakeSafe } from "../src/hooks/useKeepAwakeSafe";
import { useFontScale, FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP } from "../src/hooks/useFontScale";
import { SAYFA_SAYISI, sayfaninCuzu, sayfaBasSuresi, arapRakam, ayetinSayfasi, mushafMetniHazirla } from "../src/lib/mushafSayfa";
import { RENK, parseTajweed, TAJWEED_LEGEND, segmentsToRanges, groupSegmentsByWord, type TajweedRange } from "../src/lib/tajweed";
import { TajweedNativeText, isTajweedNativeAvailable } from "../modules/tajweed-text";
import { HatimPanel } from "../src/components/HatimPanel";
import { logFeature } from "../src/lib/analytics";
import { READING_MAX_WIDTH } from "../src/lib/layout";

// ── Mushaf Sayfa Görünümü ─────────────────────────────────────────────────────
// 604 sayfalık Medine mushafı düzeni: her sayfanın içeriği basılı mushafla
// birebir aynı ayetler; satırlar cihaza göre akıcı dizilir (hafif metin
// yaklaşımı). Hat: KFGQPC Uthmanic HAFS. Sağa kaydır → sonraki sayfa
// (Arapça kitap yönü, inverted FlatList).

const BESMELE = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

type Blok =
  | { tip: "sure"; surahId: number; arabicName: string; name: string; besmele: boolean }
  | { tip: "metin"; ayetler: MushafPageResponse["verses"] };

function bloklariKur(data: MushafPageResponse): Blok[] {
  const adMap = new Map(data.surahs.map((s) => [s.id, s]));
  const bloklar: Blok[] = [];
  let metin: MushafPageResponse["verses"] = [];
  const metniKapat = () => {
    if (metin.length > 0) { bloklar.push({ tip: "metin", ayetler: metin }); metin = []; }
  };
  for (const v of data.verses) {
    if (v.ayahNumber === 1) {
      metniKapat();
      const meta = adMap.get(v.surahId);
      bloklar.push({
        tip: "sure",
        surahId: v.surahId,
        arabicName: meta?.arabicName ?? "",
        name: meta?.name ?? `Sure ${v.surahId}`,
        // Fatiha'nın 1. ayeti zaten besmele; Tevbe besmelesiz başlar.
        besmele: v.surahId !== 1 && v.surahId !== 9,
      });
    }
    metin.push(v);
  }
  metniKapat();
  return bloklar;
}

// ── Tek sayfa ────────────────────────────────────────────────────────────────

type YuklemeDurumu =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; bloklar: Blok[] };

type SeciliAyet = { surahId: number; ayahNumber: number } | null;

function ayniAyet(a: SeciliAyet, s: number, n: number): boolean {
  return a !== null && a.surahId === s && a.ayahNumber === n;
}

// Tecvid açıkken ayet metni renkli segmentlerle dizilir (markup yoksa düz metin).
// parseTajweed memoize: seçim değişince sayfa yeniden render olur; karakter
// bazlı ayrıştırmayı her dokunuşta 3 sayfa × tüm ayetler için tekrarlamamak şart.
// KELİME-BAZLI fallback: Android'de kelime içine denk gelen nested-Text sınırı
// harf bitişmesini kırar (cihazda A/B ile kanıtlandı) — bu yol yalnız native
// renderer'ın OLMADIĞI eski build'lerde kullanılır; kelime içi bölünme yapmaz.
function AyetMetni({ ayet, tajweed }: { ayet: MushafPageResponse["verses"][number]; tajweed: boolean }) {
  // mushafMetniHazirla parse'tan ÖNCE: eşlenen işaretler markup sözdiziminin
  // parçası değil, parser mark sınıfında aynı kalırlar — parse/renk değişmez.
  const segs = useMemo(
    () => (tajweed && ayet.tajweed ? groupSegmentsByWord(parseTajweed(mushafMetniHazirla(ayet.tajweed))) : null),
    [tajweed, ayet.tajweed],
  );
  if (segs) {
    return (
      <>
        {segs.map((s, i) =>
          s.code && RENK[s.code]
            ? <Text key={i} style={{ color: RENK[s.code] }}>{s.t}</Text>
            : <Text key={i}>{s.t}</Text>,
        )}
      </>
    );
  }
  return <>{mushafMetniHazirla(ayet.arabic ?? "")}</>;
}

// ── Native tecvid bloğu ──────────────────────────────────────────────────────
// Android tek-TextView/tek-Spannable renderer: blok içindeki TÜM ayetler tek
// string olarak akar (basılı mushaf düzeni), tecvid renkleri + ayet numaraları
// UTF-16 aralıklarıyla boyanır; shaping asla bozulmaz (harf düzeyi hassasiyet).
// Dokunma: native, dokunulan karakterin indeksini verir → ayet aralığına eşlenir.
type AyetAralik = { surahId: number; ayahNumber: number; start: number; end: number };

function MetinBloguNative({ ayetler, fontSize, lineHeight, textColor, accent, secili, seciliRenk, onAyetSec }: {
  ayetler: MushafPageResponse["verses"];
  fontSize: number;
  lineHeight: number;
  textColor: string;
  accent: string;
  secili: SeciliAyet;
  seciliRenk: string;
  onAyetSec: (surahId: number, ayahNumber: number) => void;
}) {
  const { text, ranges, araliklar } = useMemo(() => {
    let text = "";
    const ranges: TajweedRange[] = [];
    const araliklar: AyetAralik[] = [];
    for (const a of ayetler) {
      const start = text.length;
      if (a.tajweed) {
        const r = segmentsToRanges(parseTajweed(a.tajweed), text.length);
        text += r.text;
        ranges.push(...r.ranges);
      } else {
        text += a.arabic ?? "";
      }
      const num = ` ﴿${arapRakam(a.ayahNumber)}﴾ `;
      ranges.push({ start: text.length, end: text.length + num.length, color: accent });
      text += num;
      araliklar.push({ surahId: a.surahId, ayahNumber: a.ayahNumber, start, end: text.length });
    }
    // Uyum haritası + NBSP, birleştirilmiş SON metne uygulanır: 1:1 (uzunluk
    // korunur) olduğundan yukarıda hesaplanan tüm aralık/indeksler geçerli
    // kalır; tecvid metnindeki seyrek U+06DF'ler (66 ayet) de böylece düzelir.
    return { text: mushafMetniHazirla(text), ranges, araliklar };
  }, [ayetler, accent]);

  const highlightRanges = useMemo(() => {
    if (!secili) return [];
    const a = araliklar.find((x) => x.surahId === secili.surahId && x.ayahNumber === secili.ayahNumber);
    return a ? [{ start: a.start, end: a.end, color: seciliRenk }] : [];
  }, [araliklar, secili, seciliRenk]);

  return (
    <TajweedNativeText
      text={text}
      ranges={ranges}
      highlightRanges={highlightRanges}
      fontSize={fontSize}
      lineHeight={lineHeight}
      textColor={textColor}
      textAlign="justify"
      onCharPress={(index) => {
        const a = araliklar.find((x) => index >= x.start && index < x.end);
        if (a) onAyetSec(a.surahId, a.ayahNumber);
      }}
    />
  );
}

const MushafSayfasi = React.memo(function MushafSayfasi({ page, width, tajweed, secili, onAyetSec }: {
  page: number;
  width: number;
  tajweed: boolean;
  secili: SeciliAyet;
  onAyetSec: (surahId: number, ayahNumber: number) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useFontScale();
  const [durum, setDurum] = useState<YuklemeDurumu>({ status: "loading" });
  const [denemeNo, setDenemeNo] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDurum({ status: "loading" });
    api.mushaf.page(page)
      .then((data) => { if (!cancelled) setDurum({ status: "ready", bloklar: bloklariKur(data) }); })
      .catch(() => { if (!cancelled) setDurum({ status: "error" }); });
    return () => { cancelled = true; };
  }, [page, denemeNo]);

  const arabicStyle = useMemo(() => ({
    fontSize: 23 * fontScale,
    lineHeight: 44 * fontScale,
  }), [fontScale]);

  const kagit = c.isDark
    ? { backgroundColor: "#1c1917", borderColor: "#44403c" }
    : { backgroundColor: "#fffdf6", borderColor: "#e7dfcc" };

  return (
    <View style={{ width, flex: 1 }}>
      {durum.status === "loading" ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[st.centerText, { color: c.textMuted }]}>Sayfa {page} yükleniyor…</Text>
        </View>
      ) : durum.status === "error" ? (
        <View style={st.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={c.textMuted} />
          <Text style={[st.centerText, { color: c.textMuted }]}>Sayfa yüklenemedi.</Text>
          <TouchableOpacity
            style={[st.retryBtn, { backgroundColor: c.accentLight }]}
            onPress={() => setDenemeNo((n) => n + 1)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Sayfayı tekrar yükle"
          >
            <Text style={[st.retryText, { color: c.accent }]}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[st.pageScroll, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[st.kagit, kagit]}>
            {durum.bloklar.map((blok, i) =>
              blok.tip === "sure" ? (
                <View key={`s${blok.surahId}`} style={[st.sureBasligi, { borderColor: c.isDark ? "#78716c" : "#c9a84c" }]}>
                  <Text style={[st.sureArapca, { color: c.text }]}>{blok.arabicName}</Text>
                  <Text style={[st.sureAdi, { color: c.isDark ? "#c9a84c" : "#a16207" }]}>
                    {blok.surahId}. {blok.name} Suresi
                  </Text>
                  {blok.besmele && (
                    <Text style={[st.besmele, { color: c.text, fontSize: 20 * fontScale, lineHeight: 36 * fontScale }]}>
                      {BESMELE}
                    </Text>
                  )}
                </View>
              ) : tajweed && isTajweedNativeAvailable ? (
                // Tecvid açık + yeni build: native tek-Spannable renderer (harf
                // düzeyi renk, shaping bozulmaz, dokun→seç native indeksle).
                <MetinBloguNative
                  key={`m${i}`}
                  ayetler={blok.ayetler}
                  fontSize={arabicStyle.fontSize}
                  lineHeight={arabicStyle.lineHeight}
                  textColor={c.text}
                  accent={c.accent}
                  secili={secili}
                  // rgba() native parseColor'da yok — aynı renklerin #AARRGGBB eşdeğeri
                  seciliRenk={c.isDark ? "#59CA8A04" : "#8CFDE047"}
                  onAyetSec={onAyetSec}
                />
              ) : (
                <Text key={`m${i}`} style={[st.arabic, arabicStyle, { color: c.text }]}>
                  {blok.ayetler.map((a) => {
                    const isSecili = ayniAyet(secili, a.surahId, a.ayahNumber);
                    return (
                      <Text
                        key={`${a.surahId}:${a.ayahNumber}`}
                        suppressHighlighting
                        // Yanlış dokunma emniyeti: tek dokunuş yalnız SEÇER (vurgular);
                        // detaya gitme alttaki eylem çubuğundan ikinci bir adımla olur.
                        onPress={() => onAyetSec(a.surahId, a.ayahNumber)}
                        style={isSecili && {
                          backgroundColor: c.isDark ? "rgba(202,138,4,0.35)" : "rgba(253,224,71,0.55)",
                        }}
                      >
                        <AyetMetni ayet={a} tajweed={tajweed} />
                        <Text style={{ color: c.accent }}>{` ﴿${arapRakam(a.ayahNumber)}﴾ `}</Text>
                      </Text>
                    );
                  })}
                </Text>
              ),
            )}
            {tajweed && (
              <View style={st.legend}>
                {TAJWEED_LEGEND.map((l) => (
                  <View key={l.ad} style={st.legendItem}>
                    <View style={[st.legendDot, { backgroundColor: l.renk }]} />
                    <Text style={[st.legendText, { color: c.textMuted }]}>{l.ad}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[st.sayfaNo, { color: c.textMuted }]}>— {arapRakam(page)} · {page} —</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
});

// ── Ana ekran ────────────────────────────────────────────────────────────────

const TUM_SAYFALAR = Array.from({ length: SAYFA_SAYISI }, (_, i) => i + 1);

// Sure listesi satır yüksekliği sabit — getItemLayout/initialScrollIndex için şart.
const SURE_ROW_H = 58;

export default function MushafSayfaEkrani() {
  useStreak();        // Sayfa görünümünden okumak da okuma serisini ilerletir
  useKeepAwakeSafe(); // Okuma sırasında ekran kararmasın
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { fontScale, changeFontScale } = useFontScale();
  const { sayfa: sayfaParam, hatim: hatimParam } = useLocalSearchParams<{ sayfa?: string; hatim?: string }>();

  const listRef = useRef<FlatList<number>>(null);
  const [surahList, setSurahList] = useState<SurahListItem[]>([]);
  const [page, setPage] = useState(1);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpVal, setJumpVal] = useState("");
  const [secili, setSecili] = useState<SeciliAyet>(null);
  // ?hatim=1 ile açılırsa (eski /hatim rotasından yönlendirme) panel direkt açılır.
  const [hatimOpen, setHatimOpen] = useState(() => hatimParam === "1");
  // Tecvid renklendirmesi — ayet ekranı ve mushaf moduyla ORTAK kalıcı tercih.
  const [tajweed, setTajweed] = useState(() => storage.getStringSync(STORAGE_KEYS.tajweed) !== "0");
  // Başlangıç sayfası hazır olmadan liste kurulmaz (initialScrollIndex için şart).
  const [initialPage, setInitialPage] = useState<number | null>(null);

  // Sure listesi düşerse atlama paneli sonsuz "yükleniyor"da kalmasın — hata
  // durumu + tekrar dene (sayfa numarasıyla atlama zaten çalışmaya devam eder).
  const [surahListError, setSurahListError] = useState(false);
  const loadSurahList = useCallback(() => {
    setSurahListError(false);
    api.surahs.list().then(setSurahList).catch(() => setSurahListError(true));
  }, []);

  useEffect(() => {
    loadSurahList();
    const paramPage = Number(sayfaParam);
    if (Number.isInteger(paramPage) && paramPage >= 1 && paramPage <= SAYFA_SAYISI) {
      setPage(paramPage);
      setInitialPage(paramPage);
      logFeature("mushaf_sayfa_ac", { sayfa: String(paramPage) });
      return;
    }
    // Param yoksa kaldığı sayfadan devam; o da yoksa eski Mushaf Modu'nun
    // yer imini (surah:ayah) sayfaya çevirip oradan başlat (birleştirme göçü).
    (async () => {
      try {
        const raw = await storage.getString(STORAGE_KEYS.mushafPage);
        const saved = Number(raw);
        let start = Number.isInteger(saved) && saved >= 1 && saved <= SAYFA_SAYISI ? saved : 0;
        if (!start) {
          const bookmark = await storage.getJSON<string>(STORAGE_KEYS.mushafBookmark);
          const [bs, ba] = (bookmark ?? "").split(":").map(Number);
          if (Number.isInteger(bs) && bs >= 1 && bs <= 114 && Number.isInteger(ba) && ba >= 1) {
            start = ayetinSayfasi(bs, ba);
          }
        }
        setPage(start || 1);
        setInitialPage(start || 1);
        logFeature("mushaf_sayfa_ac", { sayfa: String(start || 1) });
      } catch {
        setPage(1); setInitialPage(1);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sayfayaGit = useCallback((hedef: number, animated = false) => {
    const p = Math.min(SAYFA_SAYISI, Math.max(1, Math.trunc(hedef)));
    setPage(p);
    setSecili(null);
    storage.setString(STORAGE_KEYS.mushafPage, String(p)).catch(() => {});
    listRef.current?.scrollToIndex({ index: p - 1, animated });
  }, []);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    const p = Math.min(SAYFA_SAYISI, Math.max(1, index + 1));
    setPage(p);
    setSecili(null); // sayfa değişince seçim ve eylem çubuğu kapanır
    storage.setString(STORAGE_KEYS.mushafPage, String(p)).catch(() => {});
  }, [width]);

  // Dokun = seç/vurgula; aynı ayete tekrar dokunmak seçimi kaldırır.
  const onAyetSec = useCallback((surahId: number, ayahNumber: number) => {
    setSecili((prev) =>
      prev && prev.surahId === surahId && prev.ayahNumber === ayahNumber
        ? null
        : { surahId, ayahNumber },
    );
  }, []);

  const seciliDetayaGit = useCallback(() => {
    if (!secili) return;
    logFeature("mushaf_sayfa_ayet_ac", { verse: `${secili.surahId}:${secili.ayahNumber}` });
    router.push(`/ayah/${secili.surahId}/${secili.ayahNumber}`);
    setSecili(null);
  }, [secili]);

  const hatimdenSayfayaGit = useCallback((p: number) => {
    setHatimOpen(false);
    sayfayaGit(p);
  }, [sayfayaGit]);

  // Ekran dönmesi: genişlik değişince mevcut sayfaya yeniden hizala.
  useEffect(() => {
    if (initialPage === null) return;
    const t = setTimeout(() => listRef.current?.scrollToIndex({ index: page - 1, animated: false }), 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const handleJump = useCallback(() => {
    const hedef = Number(jumpVal);
    if (Number.isInteger(hedef) && hedef >= 1 && hedef <= SAYFA_SAYISI) sayfayaGit(hedef);
    setJumpOpen(false);
    setJumpVal("");
  }, [jumpVal, sayfayaGit]);

  const sureyeGit = useCallback((surahId: number) => {
    logFeature("mushaf_sayfa_sure_sec", { surah: String(surahId) });
    sayfayaGit(ayetinSayfasi(surahId, 1));
    setJumpOpen(false);
    setJumpVal("");
  }, [sayfayaGit]);

  // Panel açılınca liste, o an okunan sayfanın suresinden başlasın.
  const aktifSure = sayfaBasSuresi(page);
  const renderSureRow = useCallback(({ item: s }: { item: SurahListItem }) => {
    const aktif = s.id === aktifSure;
    return (
      <TouchableOpacity
        style={[st.sureRow, { borderBottomColor: c.border }, aktif && { backgroundColor: c.accentLight }]}
        onPress={() => sureyeGit(s.id)}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityLabel={`${s.name} suresine git`}
      >
        <View style={[st.sureNoBadge, { backgroundColor: aktif ? c.accent : c.cardAlt, borderColor: aktif ? c.accent : c.border }]}>
          <Text style={[st.sureNo, { color: aktif ? "#fff" : c.textMuted }]} maxFontSizeMultiplier={1.2}>{s.id}</Text>
        </View>
        <View style={st.sureOrta}>
          <Text style={[st.sureName, { color: c.text }]} numberOfLines={1}>{s.name}</Text>
          <Text style={[st.sureMeta, { color: c.textMuted }]} numberOfLines={1}>
            {s.verseCount} ayet · Sayfa {ayetinSayfasi(s.id, 1)}
          </Text>
        </View>
        <Text style={[st.sureArap, { color: aktif ? c.accent : c.textSecondary }]} numberOfLines={1}>
          {s.arabicName}
        </Text>
      </TouchableOpacity>
    );
  }, [aktifSure, c, sureyeGit]);

  const handleTajweedToggle = useCallback(() => {
    setTajweed((prev) => {
      const next = !prev;
      storage.setString(STORAGE_KEYS.tajweed, next ? "1" : "0").catch(() => {});
      logFeature("mushaf_sayfa_tajweed_toggle", { enabled: String(next) });
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <MushafSayfasi page={item} width={width} tajweed={tajweed} secili={secili} onAyetSec={onAyetSec} />
    ),
    [width, tajweed, secili, onAyetSec],
  );
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  // Başlık bilgisi tamamen yerel: cüz + sayfanın başladığı sure
  const cuz = sayfaninCuzu(page);
  const surahName = useMemo(
    () => surahList.find((s) => s.id === sayfaBasSuresi(page))?.name ?? "",
    [surahList, page],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[st.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        {/* Üst bar */}
        <View style={[st.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Geri">
            <Ionicons name="chevron-back" size={24} color={c.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerMid} onPress={() => setJumpOpen((v) => !v)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sayfaya veya sureye git" accessibilityHint="Sayfa numarası girerek ya da sure seçerek atla">
            <Text style={[st.headerTitle, { color: c.text }]} numberOfLines={1}>{surahName}</Text>
            {/* Hap görünümü + büyüteç: buranın dokunulur bir "sayfaya git" olduğunu belli eder */}
            <View style={[st.headerPill, { borderColor: c.border, backgroundColor: c.cardAlt }]}>
              <Ionicons name="search" size={11} color={c.textMuted} />
              <Text style={[st.headerSub, { color: c.textMuted }]}>Cüz {cuz} · Sayfa {page}/{SAYFA_SAYISI} ▾</Text>
            </View>
          </TouchableOpacity>
          <View style={st.headerBtns}>
            <TouchableOpacity
              style={[st.fontBtn, { borderColor: hatimOpen ? c.accent : c.border }]}
              onPress={() => { logFeature("mushaf_sayfa_hatim_ac"); setHatimOpen(true); }}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Hatim takibini aç"
            >
              <Ionicons name="bookmarks-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, { borderColor: tajweed ? c.accent : c.border }]}
              onPress={handleTajweedToggle}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: tajweed }}
              accessibilityLabel="Tecvid renklendirmesini aç veya kapat"
            >
              <Ionicons name="color-palette-outline" size={16} color={tajweed ? c.accent : c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, { borderColor: c.border }, fontScale <= FONT_SCALE_MIN && st.fontBtnOff]}
              onPress={() => changeFontScale(-FONT_SCALE_STEP)}
              disabled={fontScale <= FONT_SCALE_MIN}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel="Yazıyı küçült"
              accessibilityState={{ disabled: fontScale <= FONT_SCALE_MIN }}
            >
              <MaterialCommunityIcons name="magnify-minus-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, { borderColor: c.border }, fontScale >= FONT_SCALE_MAX && st.fontBtnOff]}
              onPress={() => changeFontScale(FONT_SCALE_STEP)}
              disabled={fontScale >= FONT_SCALE_MAX}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel="Yazıyı büyüt"
              accessibilityState={{ disabled: fontScale >= FONT_SCALE_MAX }}
            >
              <MaterialCommunityIcons name="magnify-plus-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sayfaya / sureye atlama — alttan panel */}
        <Modal visible={jumpOpen} transparent animationType="slide" onRequestClose={() => setJumpOpen(false)}>
          <View style={st.overlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setJumpOpen(false)} accessibilityRole="button" accessibilityLabel="Paneli kapat" />
            <View style={[st.sheet, { backgroundColor: c.bg }]}>
              <View style={[st.sheetHeader, { borderBottomColor: c.border }]}>
                <Text style={[st.sheetTitle, { color: c.text }]}>Sayfaya veya Sureye Git</Text>
                <TouchableOpacity onPress={() => setJumpOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Kapat">
                  <Ionicons name="close" size={22} color={c.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Sayfa numarası */}
              <View style={[st.jumpRow, { borderBottomColor: c.border }]}>
                <Text style={[st.jumpLabel, { color: c.textMuted }]}>Sayfa (1-{SAYFA_SAYISI}):</Text>
                <TextInput
                  style={[st.jumpInput, { color: c.text, borderColor: c.border, backgroundColor: c.cardAlt }]}
                  value={jumpVal}
                  onChangeText={setJumpVal}
                  keyboardType="number-pad"
                  onSubmitEditing={handleJump}
                  returnKeyType="go"
                  accessibilityLabel="Sayfa numarası"
                />
                <TouchableOpacity style={[st.jumpBtn, { backgroundColor: c.accent }]} onPress={handleJump} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Sayfaya git">
                  <Text style={st.jumpBtnText}>Git</Text>
                </TouchableOpacity>
              </View>

              {/* Sure listesi */}
              {surahList.length === 0 ? (
                <View style={st.sureBos}>
                  {surahListError ? (
                    <>
                      <Text style={[st.centerText, { color: c.textMuted }]}>Sure listesi yüklenemedi.</Text>
                      <TouchableOpacity
                        style={[st.retryBtn, { backgroundColor: c.accentLight, marginTop: 0 }]}
                        onPress={loadSurahList}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Sure listesini tekrar yükle"
                      >
                        <Text style={[st.retryText, { color: c.accent }]}>Tekrar Dene</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <ActivityIndicator size="small" color={c.accent} />
                      <Text style={[st.centerText, { color: c.textMuted }]}>Sure listesi yükleniyor…</Text>
                    </>
                  )}
                </View>
              ) : (
                <FlatList
                  style={{ flex: 1 }}
                  data={surahList}
                  keyExtractor={(s) => String(s.id)}
                  renderItem={renderSureRow}
                  getItemLayout={(_, index) => ({ length: SURE_ROW_H, offset: SURE_ROW_H * index, index })}
                  initialScrollIndex={Math.max(0, aktifSure - 1)}
                  initialNumToRender={12}
                  windowSize={7}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Sayfalar — inverted: sağa kaydır → sonraki sayfa (Arapça kitap yönü) */}
        {initialPage === null ? (
          <View style={st.center}><ActivityIndicator size="large" color={c.accent} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={TUM_SAYFALAR}
            horizontal
            inverted
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(n) => String(n)}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialPage - 1}
            onMomentumScrollEnd={onMomentumEnd}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
          />
        )}

        {/* Seçili ayet eylem çubuğu — dokun=seç, detaya gitme ikinci adım */}
        {secili && (
          <View style={[st.seciliBar, { backgroundColor: c.card, borderColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Text style={[st.seciliText, { color: c.text }]} numberOfLines={1}>
              {surahList.find((s) => s.id === secili.surahId)?.name ?? `Sure ${secili.surahId}`} · {secili.surahId}:{secili.ayahNumber}
            </Text>
            <TouchableOpacity
              style={[st.seciliBtn, { backgroundColor: c.accent }]}
              onPress={seciliDetayaGit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ayet detayına git"
            >
              <Text style={st.seciliBtnText}>Detaya Git ›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSecili(null)} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Seçimi kaldır">
              <Ionicons name="close" size={20} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <HatimPanel visible={hatimOpen} onClose={() => setHatimOpen(false)} onOkuPage={hatimdenSayfayaGit} />
      </View>
    </>
  );
}

// ── Stiller ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  headerMid:   { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  headerPill:  {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
  },
  headerSub:   { fontSize: 11 },
  headerBtns:  { flexDirection: "row", gap: 6 },
  fontBtn:     { borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, minWidth: 34, alignItems: "center" },
  fontBtnOff:  { opacity: 0.35 },

  jumpRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  jumpLabel: { fontSize: 12, fontWeight: "500" },
  jumpInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, textAlign: "center" },
  jumpBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  jumpBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Sayfa/Sure paneli ──
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:   { height: "78%", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sureBos:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  sureRow: {
    height: SURE_ROW_H,
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sureNoBadge: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  sureNo:   { fontSize: 12, fontWeight: "700" },
  sureOrta: { flex: 1 },
  sureName: { fontSize: 14, fontWeight: "600" },
  sureMeta: { fontSize: 11, marginTop: 1 },
  sureArap: { fontFamily: "Amiri-Bold", fontSize: 18, lineHeight: 30 },

  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  centerText: { fontSize: 13 },
  retryBtn:   { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, marginTop: 4 },
  retryText:  { fontSize: 13, fontWeight: "700" },

  pageScroll: { padding: 12, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  kagit: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },

  sureBasligi: {
    borderWidth: 1.5, borderRadius: 12, alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 12, marginVertical: 10,
  },
  sureArapca: { fontFamily: "Amiri-Bold", fontSize: 22, lineHeight: 38 },
  sureAdi:    { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, marginTop: 1 },
  besmele:    { fontFamily: "UthmanicHafs", textAlign: "center", marginTop: 6 },

  arabic: {
    fontFamily: "UthmanicHafs",
    textAlign: "justify",
    writingDirection: "rtl",
    width: "100%",
  },

  legend:     { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10 },

  sayfaNo: { textAlign: "center", fontSize: 12, marginTop: 12 },

  seciliBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1,
  },
  seciliText:    { flex: 1, fontSize: 13, fontWeight: "600" },
  seciliBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  seciliBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
