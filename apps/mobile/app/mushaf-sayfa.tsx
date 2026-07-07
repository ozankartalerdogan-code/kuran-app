import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, useWindowDimensions,
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
import { SAYFA_SAYISI, sayfaninCuzu, sayfaBasSuresi, arapRakam } from "../src/lib/mushafSayfa";
import { RENK, parseTajweed, TAJWEED_LEGEND } from "../src/lib/tajweed";
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

// Tecvid açıkken ayet metni renkli segmentlerle dizilir (markup yoksa düz metin).
function AyetMetni({ ayet, tajweed }: { ayet: MushafPageResponse["verses"][number]; tajweed: boolean }) {
  if (tajweed && ayet.tajweed) {
    return (
      <>
        {parseTajweed(ayet.tajweed).map((s, i) =>
          s.code && RENK[s.code]
            ? <Text key={i} style={{ color: RENK[s.code] }}>{s.t}</Text>
            : <Text key={i}>{s.t}</Text>,
        )}
      </>
    );
  }
  return <>{ayet.arabic ?? ""}</>;
}

const MushafSayfasi = React.memo(function MushafSayfasi({ page, width, tajweed }: { page: number; width: number; tajweed: boolean }) {
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
              ) : (
                <Text key={`m${i}`} style={[st.arabic, arabicStyle, { color: c.text }]}>
                  {blok.ayetler.map((a) => (
                    <Text
                      key={`${a.surahId}:${a.ayahNumber}`}
                      suppressHighlighting
                      onPress={() => {
                        logFeature("mushaf_sayfa_ayet_ac", { verse: `${a.surahId}:${a.ayahNumber}` });
                        router.push(`/ayah/${a.surahId}/${a.ayahNumber}`);
                      }}
                    >
                      <AyetMetni ayet={a} tajweed={tajweed} />
                      <Text style={{ color: c.accent }}>{` ﴿${arapRakam(a.ayahNumber)}﴾ `}</Text>
                    </Text>
                  ))}
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

export default function MushafSayfaEkrani() {
  useStreak();        // Sayfa görünümünden okumak da okuma serisini ilerletir
  useKeepAwakeSafe(); // Okuma sırasında ekran kararmasın
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { fontScale, changeFontScale } = useFontScale();
  const { sayfa: sayfaParam } = useLocalSearchParams<{ sayfa?: string }>();

  const listRef = useRef<FlatList<number>>(null);
  const [surahList, setSurahList] = useState<SurahListItem[]>([]);
  const [page, setPage] = useState(1);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpVal, setJumpVal] = useState("");
  // Tecvid renklendirmesi — ayet ekranı ve mushaf moduyla ORTAK kalıcı tercih.
  const [tajweed, setTajweed] = useState(() => storage.getStringSync(STORAGE_KEYS.tajweed) !== "0");
  // Başlangıç sayfası hazır olmadan liste kurulmaz (initialScrollIndex için şart).
  const [initialPage, setInitialPage] = useState<number | null>(null);

  useEffect(() => {
    api.surahs.list().then(setSurahList).catch(() => {});
    const paramPage = Number(sayfaParam);
    if (Number.isInteger(paramPage) && paramPage >= 1 && paramPage <= SAYFA_SAYISI) {
      setPage(paramPage);
      setInitialPage(paramPage);
      logFeature("mushaf_sayfa_ac", { sayfa: String(paramPage) });
      return;
    }
    // Param yoksa kaldığı sayfadan devam
    storage.getString(STORAGE_KEYS.mushafPage).then((raw) => {
      const saved = Number(raw);
      const start = Number.isInteger(saved) && saved >= 1 && saved <= SAYFA_SAYISI ? saved : 1;
      setPage(start);
      setInitialPage(start);
      logFeature("mushaf_sayfa_ac", { sayfa: String(start) });
    }).catch(() => { setPage(1); setInitialPage(1); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sayfayaGit = useCallback((hedef: number, animated = false) => {
    const p = Math.min(SAYFA_SAYISI, Math.max(1, Math.trunc(hedef)));
    setPage(p);
    storage.setString(STORAGE_KEYS.mushafPage, String(p)).catch(() => {});
    listRef.current?.scrollToIndex({ index: p - 1, animated });
  }, []);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    const p = Math.min(SAYFA_SAYISI, Math.max(1, index + 1));
    setPage(p);
    storage.setString(STORAGE_KEYS.mushafPage, String(p)).catch(() => {});
  }, [width]);

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

  const handleTajweedToggle = useCallback(() => {
    setTajweed((prev) => {
      const next = !prev;
      storage.setString(STORAGE_KEYS.tajweed, next ? "1" : "0").catch(() => {});
      logFeature("mushaf_sayfa_tajweed_toggle", { enabled: String(next) });
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: number }) => <MushafSayfasi page={item} width={width} tajweed={tajweed} />,
    [width, tajweed],
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
          <TouchableOpacity style={st.headerMid} onPress={() => setJumpOpen((v) => !v)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sayfaya git">
            <Text style={[st.headerTitle, { color: c.text }]} numberOfLines={1}>{surahName}</Text>
            <Text style={[st.headerSub, { color: c.textMuted }]}>Cüz {cuz} · Sayfa {page}/{SAYFA_SAYISI} ▾</Text>
          </TouchableOpacity>
          <View style={st.headerBtns}>
            <TouchableOpacity
              style={[st.fontBtn, { borderColor: tajweed ? c.accent : c.border }]}
              onPress={handleTajweedToggle}
              hitSlop={6} activeOpacity={0.7}
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
              hitSlop={6} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel="Yazıyı küçült"
              accessibilityState={{ disabled: fontScale <= FONT_SCALE_MIN }}
            >
              <MaterialCommunityIcons name="magnify-minus-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fontBtn, { borderColor: c.border }, fontScale >= FONT_SCALE_MAX && st.fontBtnOff]}
              onPress={() => changeFontScale(FONT_SCALE_STEP)}
              disabled={fontScale >= FONT_SCALE_MAX}
              hitSlop={6} activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel="Yazıyı büyüt"
              accessibilityState={{ disabled: fontScale >= FONT_SCALE_MAX }}
            >
              <MaterialCommunityIcons name="magnify-plus-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sayfaya atlama */}
        {jumpOpen && (
          <View style={[st.jumpRow, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <Text style={[st.jumpLabel, { color: c.textMuted }]}>Sayfa (1-{SAYFA_SAYISI}):</Text>
            <TextInput
              style={[st.jumpInput, { color: c.text, borderColor: c.border, backgroundColor: c.cardAlt }]}
              value={jumpVal}
              onChangeText={setJumpVal}
              keyboardType="number-pad"
              autoFocus
              onSubmitEditing={handleJump}
              returnKeyType="go"
              accessibilityLabel="Sayfa numarası"
            />
            <TouchableOpacity style={[st.jumpBtn, { backgroundColor: c.accent }]} onPress={handleJump} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Sayfaya git">
              <Text style={st.jumpBtnText}>Git</Text>
            </TouchableOpacity>
          </View>
        )}

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
  headerSub:   { fontSize: 11, marginTop: 1 },
  headerBtns:  { flexDirection: "row", gap: 6 },
  fontBtn:     { borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, minWidth: 34, alignItems: "center" },
  fontBtnOff:  { opacity: 0.35 },

  jumpRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  jumpLabel: { fontSize: 12, fontWeight: "500" },
  jumpInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, textAlign: "center" },
  jumpBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  jumpBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

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
});
