import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, useWindowDimensions, Modal, PanResponder, Platform, KeyboardAvoidingView,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, type MushafPageResponse, type SurahListItem } from "../src/lib/api";
import { storage, STORAGE_KEYS } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";
import { useStreak } from "../src/hooks/useStreak";
import { notifyReviewCompletion } from "../src/hooks/storeReviewPolicy";
import { useKeepAwakeSafe } from "../src/hooks/useKeepAwakeSafe";
import { useFontScale, FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP } from "../src/hooks/useFontScale";
import { SAYFA_SAYISI, sayfaninCuzu, sayfaBasSuresi, arapRakam, ayetinSayfasi, mushafMetniHazirla } from "../src/lib/mushafSayfa";
import { joinAcrossColorBoundaries, tajweedPartsFromSpans, TAJWEED_LEGEND } from "../src/lib/tajweed";
import { HatimPanel } from "../src/components/HatimPanel";
import { logFeature } from "../src/lib/analytics";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useStrings, fmt } from "../src/i18n";
import mushafStrings from "../src/i18n/strings/mushaf";
import storageErrorStrings from "../src/i18n/strings/storageErrors";
import { useSurahNameOf } from "../src/lib/surahNames";
import { BackButton, Button, Callout, paperColors } from "../src/components/ui";

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

// Tecvid açıkken ayet metni renkli parçalarla dizilir.
//
// Metin HER ZAMAN canonical `arabic` (Tanzil) — tecvid yalnız renk katar.
// Eskiden AlQuran markup metni basılıyordu; o metin canonical'dan farklı
// (6236 ayetin 4280'inde) ve grup sınırları harf/hareke arasından geçtiği için
// ekranda renkli benekler oluşuyordu. Span'lar canonical koordinatlarda gelir.
//
// memoize: seçim değişince sayfa yeniden render olur; 3 sayfa × tüm ayetler
// için bölmeyi her dokunuşta tekrarlamamak şart.
function AyetMetni({ ayet, tajweed }: { ayet: MushafPageResponse["verses"][number]; tajweed: boolean }) {
  // KFGQPC uyum haritası: font U+06DF/06E3/06EB için gerçek glif taşımıyor,
  // o yuvalarda "noktalı daire + siyah top" placeholder çizimi var. Eşleme
  // 1:1 ve uzunluk korur — tajweedSpans'in kod noktası indeksleri kaymaz.
  const metin = useMemo(() => mushafMetniHazirla(ayet.arabic ?? ""), [ayet.arabic]);
  const parcalar = useMemo(
    () => (tajweed && ayet.tajweedSpans?.length
      ? joinAcrossColorBoundaries(tajweedPartsFromSpans(metin, ayet.tajweedSpans))
      : null),
    [tajweed, metin, ayet.tajweedSpans],
  );
  if (parcalar) {
    return (
      <>
        {parcalar.map((p, i) =>
          p.color
            ? <Text key={i} style={{ color: p.color }}>{p.t}</Text>
            : p.t,
        )}
      </>
    );
  }
  return <>{metin}</>;
}

const MushafSayfasi = React.memo(function MushafSayfasi({ page, width, height, tajweed, secili, onAyetSec }: {
  page: number;
  width: number;
  height: number;
  tajweed: boolean;
  secili: SeciliAyet;
  onAyetSec: (surahId: number, ayahNumber: number) => void;
}) {
  const c = useColors();
  const t = useStrings(mushafStrings);
  const tj = useStrings(storageErrorStrings);
  const surahNameOf = useSurahNameOf();
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

  const p = paperColors(c);

  return (
    <View style={{ width, height: height > 0 ? height : "100%" }}>
      {durum.status === "loading" ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[st.centerText, { color: c.textMuted }]}>{fmt(t.pageLoading, { n: page })}</Text>
        </View>
      ) : durum.status === "error" ? (
        <View style={st.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={c.textMuted} />
          <Callout tone="error">{t.pageError}</Callout>
          <Button
            variant="secondary"
            label={t.retry}
            onPress={() => setDenemeNo((n) => n + 1)}
            accessibilityLabel={t.reloadPageA11y}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[st.pageScroll, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={[st.kagit, { backgroundColor: p.bg, borderColor: p.border }]}>
            {durum.bloklar.map((blok, i) =>
              blok.tip === "sure" ? (
                <View key={`s${blok.surahId}`} style={[st.sureBasligi, { borderColor: p.goldBorder }]}>
                  <Text style={[st.sureArapca, { color: c.text }]}>{blok.arabicName}</Text>
                  <Text style={[st.sureAdi, { color: p.gold }]}>
                    {fmt(t.surahHeading, { id: blok.surahId, name: surahNameOf(blok.surahId, blok.name) })}
                  </Text>
                  {blok.besmele && (
                    <Text style={[st.besmele, { color: c.text, fontSize: 20 * fontScale, lineHeight: 36 * fontScale }]}>
                      {BESMELE}
                    </Text>
                  )}
                </View>
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
                    <Text style={[st.legendText, { color: c.textMuted }]}>{(tj as unknown as Record<string, string>)[l.renk] ?? l.ad}</Text>
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
  const { reviewMoment } = useStreak();        // Sayfa görünümünden okumak da okuma serisini ilerletir
  useEffect(() => { if (reviewMoment > 0) return notifyReviewCompletion(); }, [reviewMoment]);
  useKeepAwakeSafe(); // Okuma sırasında ekran kararmasın
  const c = useColors();
  const t = useStrings(mushafStrings);
  const surahNameOf = useSurahNameOf();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compactHeader = width < 640;
  const { fontScale, changeFontScale } = useFontScale();
  const { sayfa: sayfaParam, hatim: hatimParam } = useLocalSearchParams<{ sayfa?: string; hatim?: string }>();

  const listRef = useRef<FlatList<number>>(null);
  const retryScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (retryScrollTimerRef.current) clearTimeout(retryScrollTimerRef.current);
  }, []);
  const [surahList, setSurahList] = useState<SurahListItem[]>([]);
  const [page, setPage] = useState(1);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpVal, setJumpVal] = useState("");
  const [secili, setSecili] = useState<SeciliAyet>(null);
  // ?hatim=1 ile açılırsa (eski /hatim rotasından yönlendirme) panel direkt açılır.
  const [hatimOpen, setHatimOpen] = useState(() => hatimParam === "1");
  // Tecvid renklendirmesi — ayet ekranı ve mushaf moduyla ORTAK kalıcı tercih.
  const [tajweed, setTajweed] = useState(true);
  const tajweedTouchedRef = useRef(false);
  useEffect(() => {
    let alive = true;
    storage.getString(STORAGE_KEYS.tajweed).then((v) => {
      if (alive && v != null && !tajweedTouchedRef.current) setTajweed(v !== "0");
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // Başlangıç sayfası hazır olmadan liste kurulmaz (initialScrollIndex için şart).
  const [initialPage, setInitialPage] = useState<number | null>(null);
  const [listHeight, setListHeight] = useState(0);

  // PanResponder bir kez kurulur; güncel sayfa ve genişliği ref'ten okur.
  const pageRef = useRef(1);
  const widthRef = useRef(width);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { widthRef.current = width; }, [width]);

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
      storage.setString(STORAGE_KEYS.mushafPage, String(paramPage)).catch(() => {});
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

  // Sayfa çevirme tamamen JS'te: yerel yatay kaydırma kapalı olduğu için
  // Android'in dokunuşu x farkına göre erken kapması sorunu oluşmaz.
  const suruklemeBaslangicRef = useRef(0);
  // RN capture ile sahiplenince gestureState'i sıfırlar; yakalama öncesi dx'i ve zamanı ref'te tutuyoruz.
  const yakalamaDxRef = useRef(0);
  const yakalamaZamaniRef = useRef(0);
  const yakalanmaliMi = (g: { dx: number; dy: number }) => {
    const yakala = Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2;
    if (yakala) {
      yakalamaDxRef.current = g.dx;
      yakalamaZamaniRef.current = Date.now();
    }
    return yakala;
  };
  const bitirSurukleme = (dx: number, vx: number, sureMs: number) => {
    const w = widthRef.current;
    const p = pageRef.current;
    let hedef = p;
    if (Math.abs(dx) > w * 0.25) {
      // Parmak SAĞA (dx>0) → SONRAKİ sayfa; inverted listede index/offset artar.
      hedef = p + (dx > 0 ? 1 : -1);
    } else if (Math.abs(vx) > 0.3) {
      hedef = p + (vx > 0 ? 1 : -1);
    } else if (Math.abs(dx) > 40 && sureMs < 250) {
      // Hızlı fiske: hız sıfırlansa da mesafe + kısa süre yeter.
      hedef = p + (dx > 0 ? 1 : -1);
    }
    yakalamaDxRef.current = 0;
    sayfayaGit(hedef, true);
  };
  const panResponder = useRef(
    PanResponder.create({
      // Ayete dokunma seçimi bozulmasın: başlangıçta sahiplenme yok.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Yalnız belirgin yatay hareket sayfa çevirir; dikey/çapraz iç ScrollView'de kalır.
      onMoveShouldSetPanResponder: (_, g) => yakalanmaliMi(g),
      onMoveShouldSetPanResponderCapture: (_, g) => yakalanmaliMi(g),
      // Yatay sürükleme başladıysa bırakma.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        suruklemeBaslangicRef.current = (pageRef.current - 1) * widthRef.current;
      },
      onPanResponderMove: (_, g) => {
        // inverted liste: parmak SAĞA (dx>0) → SONRAKİ sayfa (offset artar).
        const toplamDx = yakalamaDxRef.current + g.dx;
        const w = widthRef.current;
        const max = (SAYFA_SAYISI - 1) * w;
        const offset = Math.max(0, Math.min(max, suruklemeBaslangicRef.current + toplamDx));
        listRef.current?.scrollToOffset({ offset, animated: false });
      },
      onPanResponderRelease: (_, g) =>
        bitirSurukleme(
          yakalamaDxRef.current + g.dx,
          g.vx,
          Date.now() - yakalamaZamaniRef.current,
        ),
      onPanResponderTerminate: (_, g) =>
        bitirSurukleme(
          yakalamaDxRef.current + g.dx,
          g.vx,
          Date.now() - yakalamaZamaniRef.current,
        ),
    }),
  ).current;


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
        accessibilityLabel={fmt(t.goToSurahA11y, { name: surahNameOf(s.id, s.name) })}
      >
        <View style={[st.sureNoBadge, { backgroundColor: aktif ? c.actionBg : c.cardAlt, borderColor: aktif ? c.actionBg : c.border }]}>
          <Text style={[st.sureNo, { color: aktif ? c.actionText : c.textMuted }]} maxFontSizeMultiplier={1.2}>{s.id}</Text>
        </View>
        <View style={st.sureOrta}>
          <Text style={[st.sureName, { color: c.text }]} numberOfLines={1}>{surahNameOf(s.id, s.name)}</Text>
          <Text style={[st.sureMeta, { color: c.textMuted }]} numberOfLines={1}>
            {fmt(t.verseCountPage, { n: s.verseCount, p: ayetinSayfasi(s.id, 1) })}
          </Text>
        </View>
        <Text style={[st.sureArap, { color: aktif ? c.accent : c.textSecondary }]} numberOfLines={1}>
          {s.arabicName}
        </Text>
      </TouchableOpacity>
    );
  }, [aktifSure, c, sureyeGit, t, surahNameOf]);

  const handleTajweedToggle = useCallback(() => {
    tajweedTouchedRef.current = true;
    setTajweed((prev) => {
      const next = !prev;
      storage.setString(STORAGE_KEYS.tajweed, next ? "1" : "0").catch(() => {});
      logFeature("mushaf_sayfa_tajweed_toggle", { enabled: String(next) });
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <MushafSayfasi
        page={item}
        width={width}
        height={listHeight}
        tajweed={tajweed}
        secili={secili}
        onAyetSec={onAyetSec}
      />
    ),
    [width, listHeight, tajweed, secili, onAyetSec],
  );
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  // Başlık bilgisi tamamen yerel: cüz + sayfanın başladığı sure
  const cuz = sayfaninCuzu(page);
  const surahName = useMemo(
    () => {
      const s = surahList.find((x) => x.id === sayfaBasSuresi(page));
      return s ? surahNameOf(s.id, s.name) : "";
    },
    [surahList, page, surahNameOf],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[st.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        {/* Üst bar */}
        <View style={[st.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <View style={compactHeader ? undefined : { width: 210 }}>
            <BackButton color={c.accent} accessibilityLabel={t.backA11y} />
          </View>
          <TouchableOpacity style={st.headerMid} onPress={() => setJumpOpen((v) => !v)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t.jumpA11y} accessibilityHint={t.jumpHint}>
            <Text style={[st.headerTitle, { color: c.text }]} numberOfLines={1}>{surahName}</Text>
            {/* Hap görünümü + büyüteç: buranın dokunulur bir "sayfaya git" olduğunu belli eder */}
            <View style={[st.headerPill, { borderColor: c.border, backgroundColor: c.cardAlt }]}>
              <Ionicons name="search" size={11} color={c.textMuted} />
              <Text
                style={[st.headerSub, { color: c.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {fmt(t.headerSub, { j: cuz, p: page, t: SAYFA_SAYISI })}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[st.headerBtns, !compactHeader && st.headerBtnsWide]}>
            <TouchableOpacity
              style={[st.fontBtn, !compactHeader && st.fontBtnWide, { borderColor: hatimOpen ? c.accent : c.border }]}
              onPress={() => { logFeature("mushaf_sayfa_hatim_ac"); setHatimOpen(true); }}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t.openHatimA11y}
            >
              <Ionicons name="bookmarks-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, !compactHeader && st.fontBtnWide, { borderColor: tajweed ? c.accent : c.border }]}
              onPress={handleTajweedToggle}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: tajweed }}
              accessibilityLabel={t.tajweedA11y}
            >
              <Ionicons name="color-palette-outline" size={16} color={tajweed ? c.accent : c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, !compactHeader && st.fontBtnWide, { borderColor: c.border }, fontScale <= FONT_SCALE_MIN && st.fontBtnOff]}
              onPress={() => changeFontScale(-FONT_SCALE_STEP)}
              disabled={fontScale <= FONT_SCALE_MIN}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel={t.shrinkA11y}
              accessibilityState={{ disabled: fontScale <= FONT_SCALE_MIN }}
            >
              <Text style={[st.fontBtnText, { color: c.textSecondary }]}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, !compactHeader && st.fontBtnWide, { borderColor: c.border }, fontScale >= FONT_SCALE_MAX && st.fontBtnOff]}
              onPress={() => changeFontScale(FONT_SCALE_STEP)}
              disabled={fontScale >= FONT_SCALE_MAX}
              hitSlop={10} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel={t.growA11y}
              accessibilityState={{ disabled: fontScale >= FONT_SCALE_MAX }}
            >
              <Text style={[st.fontBtnText, { color: c.textSecondary }]}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sayfaya / sureye atlama — alttan panel */}
        <Modal visible={jumpOpen} transparent animationType="slide" onRequestClose={() => setJumpOpen(false)}>
          <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setJumpOpen(false)} accessibilityRole="button" accessibilityLabel={t.closePanelA11y} />
            <View style={[st.sheet, { backgroundColor: c.bg }]}>
              <View style={[st.sheetHeader, { borderBottomColor: c.border }]}>
                <Text style={[st.sheetTitle, { color: c.text }]}>{t.jumpTitle}</Text>
                <TouchableOpacity onPress={() => setJumpOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.close}>
                  <Ionicons name="close" size={22} color={c.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Sayfa numarası */}
              <View style={[st.jumpRow, { borderBottomColor: c.border }]}>
                <Text style={[st.jumpLabel, { color: c.textMuted }]}>{fmt(t.pageLabel, { max: SAYFA_SAYISI })}</Text>
                <TextInput
                  style={[st.jumpInput, { color: c.text, borderColor: c.border, backgroundColor: c.cardAlt }]}
                  value={jumpVal}
                  onChangeText={setJumpVal}
                  keyboardType="number-pad"
                  onSubmitEditing={handleJump}
                  returnKeyType="go"
                  accessibilityLabel={t.pageNumberA11y}
                  accessibilityHint={fmt(t.pageNumberHint, { max: SAYFA_SAYISI })}
                />
                <TouchableOpacity style={[st.jumpBtn, { backgroundColor: c.actionBg }]} onPress={handleJump} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t.goA11y}>
                  <Text style={[st.jumpBtnText, { color: c.actionText }]}>{t.go}</Text>
                </TouchableOpacity>
              </View>

              {/* Sure listesi */}
              {surahList.length === 0 ? (
                <View style={st.sureBos}>
                  {surahListError ? (
                    <View style={{ flex: 1, gap: 10, alignItems: "center" }}>
                      <Callout tone="error" style={{ alignSelf: "stretch" }}>{t.surahListError}</Callout>
                      <Button
                        variant="secondary"
                        label={t.retry}
                        onPress={loadSurahList}
                        accessibilityLabel={t.reloadListA11y}
                      />
                    </View>
                  ) : (
                    <>
                      <ActivityIndicator size="small" color={c.accent} />
                      <Text style={[st.centerText, { color: c.textMuted }]}>{t.surahListLoading}</Text>
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
          </KeyboardAvoidingView>
        </Modal>

        {/* Sayfalar — inverted: sağa kaydır → sonraki sayfa (Arapça kitap yönü) */}
        {initialPage === null ? (
          <View style={st.center}><ActivityIndicator size="large" color={c.accent} /></View>
        ) : (
          <View style={{ flex: 1 }} {...panResponder.panHandlers}>
            <FlatList
              ref={listRef}
              style={{ flex: 1 }}
              data={TUM_SAYFALAR}
              horizontal
              inverted
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(n) => String(n)}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialPage - 1}
              onScrollToIndexFailed={(info) => {
                if (retryScrollTimerRef.current) clearTimeout(retryScrollTimerRef.current);
                retryScrollTimerRef.current = setTimeout(() => {
                  listRef.current?.scrollToOffset({
                    offset: info.index * width,
                    animated: false,
                  });
                }, 50);
              }}
              onLayout={(e) => {
                const h = Math.round(e.nativeEvent.layout.height);
                if (h > 0 && h !== listHeight) setListHeight(h);
              }}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews={Platform.OS === "android"}
            />
          </View>
        )}

        {/* Seçili ayet eylem çubuğu — dokun=seç, detaya gitme ikinci adım */}
        {secili && (
          <View style={st.seciliBarWrap} pointerEvents="box-none">
            <View style={[st.seciliBar, { backgroundColor: c.card, borderColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
              <Text style={[st.seciliText, { color: c.text }]} numberOfLines={1}>
                {(() => { const sr = surahList.find((s) => s.id === secili.surahId); return sr ? surahNameOf(sr.id, sr.name) : fmt(t.surahFallback, { n: secili.surahId }); })()} · {secili.surahId}:{secili.ayahNumber}
              </Text>
              <TouchableOpacity
                style={[st.seciliBtn, { backgroundColor: c.actionBg }]}
                onPress={seciliDetayaGit}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t.openDetailA11y}
              >
                <Text style={[st.seciliBtnText, { color: c.actionText }]}>{t.openDetail}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSecili(null)} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t.clearSelectionA11y}>
                <Ionicons name="close" size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>
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
  headerMid:   { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", maxWidth: "100%" },
  headerPill:  {
    flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
  },
  headerSub:   { fontSize: 11, flexShrink: 1 },
  headerBtns:  { flexDirection: "row", gap: 6 },
  headerBtnsWide: { width: 210, justifyContent: "flex-end" },
  fontBtnText: { fontSize: 15, fontWeight: "700" },
  fontBtn:     { borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, minWidth: 36, minHeight: 34, alignItems: "center", justifyContent: "center" },
  fontBtnWide: { minWidth: 48, minHeight: 48 },
  fontBtnOff:  { opacity: 0.35 },

  jumpRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  jumpLabel: { fontSize: 12, fontWeight: "500" },
  jumpInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, textAlign: "center" },
  jumpBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  jumpBtnText: { fontSize: 13, fontWeight: "700" },

  // ── Sayfa/Sure paneli ──
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:   { height: "78%", width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
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

  seciliBarWrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    alignItems: "center",
  },
  seciliBar: {
    width: "100%", maxWidth: READING_MAX_WIDTH,
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1,
  },
  seciliText:    { flex: 1, fontSize: 13, fontWeight: "600" },
  seciliBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  seciliBtnText: { fontSize: 13, fontWeight: "700" },
});
