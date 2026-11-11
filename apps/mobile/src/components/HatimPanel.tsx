import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal,
  type DimensionValue,
} from "react-native";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("lottie-react-native").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UIManager } = require("react-native");
  if (UIManager.hasViewManagerConfig?.("LottieAnimationView")) LottieView = mod;
} catch (_e) { /* noop */ }
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { useColors } from "../hooks/useColors";
import {
  JUZ_DATA, EMPTY_HATIM_STORE, parseHatimStore, hatimFmt, hatimGunSayisi,
  type Hatim, type HatimStore,
} from "../lib/hatim";
import { ayetinSayfasi } from "../lib/mushafSayfa";
import { logFeature } from "../lib/analytics";
import { READING_MAX_WIDTH } from "../lib/layout";
import { useStrings, fmt, localeTag } from "../i18n";
import componentStrings from "../i18n/strings/components";

// ── HatimPanel — mushaf sayfa görünümüne gömülü hatim takibi ─────────────────
// Eski /hatim ekranının "Takip" sekmesi, alttan açılan panel olarak. Veri
// anahtarı ve şekli değişmedi; "Oku →" artık ilgili cüzün mushaf SAYFASINA
// atlar (onOkuPage) — ayrı bir okuyucuya gitmez.

type Props = {
  visible: boolean;
  onClose: () => void;
  onOkuPage: (page: number) => void;
};

export function HatimPanel({ visible, onClose, onOkuPage }: Props) {
  const c = useColors();
  const t = useStrings(componentStrings);
  const loc = localeTag();
  const insets = useSafeAreaInsets();
  const [store, setStore]     = useState<HatimStore>(EMPTY_HATIM_STORE);
  const [mounted, setMounted] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevProgress = useRef(0);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    storage.getString(STORAGE_KEYS.hatimTracking)
      .then((v) => {
        if (!isMounted) return;
        const parsed = parseHatimStore(v);
        // Kutlama yalnız panel AÇIKKEN 29→30 geçişinde oynasın. prevProgress 0'dan
        // başlarsa, tamamlanmış hatimle her açılışta (uygulama yeniden başlayınca)
        // kutlama tekrar patlar — yüklenen ilerlemeyle tohumla.
        prevProgress.current =
          parsed.hatims.find((h) => h.id === parsed.currentId)?.readJuz.length ?? 0;
        setStore(parsed);
      })
      .catch(() => { if (isMounted) setStore(EMPTY_HATIM_STORE); })
      .finally(() => { if (isMounted) setMounted(true); });
    return () => { isMounted = false; };
  }, [visible]);

  const persist = useCallback((next: HatimStore) => {
    setStore(next);
    storage.setString(STORAGE_KEYS.hatimTracking, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const startHatim = () => {
    logFeature("hatim_start");
    const h: Hatim = { id: Date.now().toString(), startDate: new Date().toISOString(), completedDate: null, readJuz: [] };
    persist({ hatims: [h, ...store.hatims], currentId: h.id });
    setConfirm(false);
  };

  const toggleJuz = (n: number) => {
    let status: "read" | "unread" = "read";
    let completedNow = false;
    const next = store.hatims.map((h) => {
      if (h.id !== store.currentId) return h;
      status = h.readJuz.includes(n) ? "unread" : "read";
      const readJuz = status === "unread" ? h.readJuz.filter((j) => j !== n) : [...h.readJuz, n];
      completedNow = readJuz.length === 30 && h.completedDate === null;
      const completedDate = readJuz.length === 30 ? (h.completedDate ?? new Date().toISOString()) : null;
      return { ...h, readJuz, completedDate };
    });
    logFeature("hatim_toggle_juz", { juz: String(n), status });
    if (completedNow) logFeature("hatim_complete");
    persist({ ...store, hatims: next });
  };

  const resetCurrentHatim = useCallback(() => {
    logFeature("hatim_reset");
    persist({ ...store, hatims: store.hatims.map((h) => h.id === store.currentId ? { ...h, readJuz: [], completedDate: null } : h) });
    setConfirm(false);
  }, [persist, store]);

  const okuJuz = (juz: typeof JUZ_DATA[number]) => {
    logFeature("hatim_read", { surahId: String(juz.startSurah), ayahNumber: String(juz.startAyah) });
    onOkuPage(ayetinSayfasi(juz.startSurah, juz.startAyah));
  };

  const current   = store.hatims.find((h) => h.id === store.currentId) ?? null;
  const completed = store.hatims.filter(
    (h): h is Hatim & { completedDate: string } => h.completedDate !== null,
  );
  const progress  = current?.readJuz.length ?? 0;
  const pct       = Math.round((progress / 30) * 100);

  useEffect(() => {
    if (mounted && progress === 30 && prevProgress.current < 30) {
      setShowCelebration(true);
    }
    prevProgress.current = progress;
  }, [progress, mounted]);

  const green     = "#059669";
  const greenSoft = c.isDark ? "#065f46" : "#d1fae5";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t.hatimCloseA11y} />
        <View style={[st.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 8 }]}>
          {/* Panel başlığı */}
          <View style={[st.sheetHeader, { borderBottomColor: c.border }]}>
            <Text style={[st.sheetTitle, { color: c.text }]}>{t.hatimTitle}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.close}>
              <Ionicons name="close" size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {!mounted ? (
            <View style={st.loading}><ActivityIndicator size="large" color={green} /></View>
          ) : (
            <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
              {!current ? (
                <View style={[st.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[st.emptyText, { color: c.textMuted }]}>{t.hatimNone}</Text>
                  <TouchableOpacity style={st.startBtn} onPress={startHatim} accessibilityRole="button" accessibilityLabel={t.hatimStartA11y}>
                    <Text style={st.startBtnText}>{t.hatimStart}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* İlerleme */}
                  <View style={[st.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={st.progressRow}>
                      <View>
                        <Text style={[st.progressDate, { color: c.textMuted }]}>{fmt(t.hatimStarted, { date: hatimFmt(current.startDate, loc) })}</Text>
                        {current.completedDate && (
                          <Text style={st.completedText}>{fmt(t.hatimDone, { n: hatimGunSayisi(current.startDate, current.completedDate) })}</Text>
                        )}
                      </View>
                      <Text style={st.progressCount}>{progress}/30</Text>
                    </View>
                    <View style={[st.progressBg, { backgroundColor: greenSoft }]}>
                      <View style={[st.progressFill, { width: `${pct}%` as DimensionValue }]} />
                    </View>
                    <Text style={[st.progressPct, { color: c.textMuted }]}>%{pct}</Text>

                    {/* Eylemler — inline onay */}
                    <View style={st.progressActions}>
                      {!confirm ? (
                        <TouchableOpacity
                          onPress={() => setConfirm(true)}
                          accessibilityRole="button"
                          accessibilityLabel={t.hatimResetAskA11y}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={st.actionBtn}
                        >
                          <Text style={st.actionText}>{t.hatimReset}</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <Text style={[st.confirmText, { color: c.textMuted }]}>{t.hatimSure}</Text>
                          <TouchableOpacity
                            onPress={resetCurrentHatim}
                            accessibilityRole="button"
                            accessibilityLabel={t.hatimResetA11y}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={st.actionBtn}
                          >
                            <Text style={[st.actionText, { color: "#dc2626", fontWeight: "700" }]}>{t.yes}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setConfirm(false)}
                            accessibilityRole="button"
                            accessibilityLabel={t.hatimCancelA11y}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={st.actionBtn}
                          >
                            <Text style={st.actionText}>{t.no}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  {/* 30 Cüz */}
                  {JUZ_DATA.map((juz) => {
                    const done = current.readJuz.includes(juz.juz);
                    return (
                      <View key={juz.juz} style={[st.juzRow, { backgroundColor: c.card, borderColor: c.border }, done && { backgroundColor: c.isDark ? "#052e16" : "#f0fdf4", borderColor: c.isDark ? "#166534" : "#bbf7d0" }]}>
                        <TouchableOpacity
                          style={st.juzMain}
                          onPress={() => toggleJuz(juz.juz)}
                          activeOpacity={0.7}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: done }}
                          accessibilityLabel={fmt(t.juzMarkA11y, { n: juz.juz })}
                        >
                          <View style={[st.juzCheck, { borderColor: c.border }, done && st.juzCheckDone]}>
                            <Text style={[st.juzNum, { color: c.textMuted }, done && st.juzNumDone]} maxFontSizeMultiplier={1.2}>
                              {done ? "✓" : juz.juz}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[st.juzTitle, { color: done ? green : c.text }]}>{fmt(t.juzTitle, { n: juz.juz })}</Text>
                            <Text style={[st.juzRange, { color: c.textMuted }]}>{juz.startName} {juz.startAyah} – {juz.endName} {juz.endAyah}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[st.juzReadBtn, { borderLeftColor: c.border }]}
                          onPress={() => okuJuz(juz)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={fmt(t.juzReadA11y, { n: juz.juz })}
                        >
                          <Text style={st.juzReadBtnText}>{t.juzRead}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}

              {/* Geçmiş */}
              {completed.length > 0 && (
                <View style={st.historySection}>
                  <Text style={[st.historyTitle, { color: c.textMuted }]}>{fmt(t.hatimHistory, { n: completed.length })}</Text>
                  {completed.map((h, i) => (
                    <View key={h.id} style={[st.historyRow, { backgroundColor: c.card, borderColor: c.border }]}>
                      <View>
                        <Text style={[st.historyLabel, { color: c.text }]}>{fmt(t.hatimOrdinal, { n: completed.length - i })}</Text>
                        <Text style={[st.historyDates, { color: c.textMuted }]}>{hatimFmt(h.startDate, loc)} → {hatimFmt(h.completedDate, loc)}</Text>
                      </View>
                      <Text style={st.historyDays}>{fmt(t.daysUnit, { n: hatimGunSayisi(h.startDate, h.completedDate) })}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Hatim tamamlama kutlaması */}
      <Modal visible={showCelebration} transparent animationType="fade" onRequestClose={() => setShowCelebration(false)}>
        <View style={st.celebrationOverlay}>
          <View style={[st.celebrationCard, { backgroundColor: c.card }]}>
            {LottieView && (
              <LottieView
                source={require("../../assets/Star-Blast.json")}
                autoPlay
                loop={false}
                style={{ width: 200, height: 200 }}
              />
            )}
            <Text style={[st.celebrationTitle, { color: c.text }]}>{t.congrats}</Text>
            <Text style={[st.celebrationSub, { color: c.textMuted }]}>{t.hatimCongrats}</Text>
            <TouchableOpacity
              style={[st.celebrationBtn, { backgroundColor: c.accent }]}
              onPress={() => setShowCelebration(false)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t.celebrationCloseA11y}
            >
              <Text style={st.celebrationBtnText}>{t.ok}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:   { maxHeight: "82%", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  loading:    { padding: 40, alignItems: "center" },
  content:    { padding: 16, paddingBottom: 24, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  emptyCard:    { borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1 },
  emptyText:    { fontSize: 15, marginBottom: 16 },
  startBtn:     { backgroundColor: "#059669", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  progressCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  progressRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  progressDate: { fontSize: 12 },
  completedText:{ fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  progressCount:{ fontSize: 28, fontWeight: "700", color: "#059669" },
  progressBg:   { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#059669", borderRadius: 4 },
  progressPct:     { fontSize: 11, textAlign: "right", marginTop: 2 },
  progressActions: { flexDirection: "row", gap: 16, marginTop: 10, alignItems: "center" },
  actionBtn:       { paddingVertical: 6, paddingHorizontal: 4 },
  actionText:      { fontSize: 13, color: "#ef4444" },
  confirmText:     { fontSize: 12, flex: 1 },

  juzRow:     { flexDirection: "row", alignItems: "center", borderRadius: 12, marginBottom: 6, borderWidth: 1, overflow: "hidden" },
  juzMain:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  juzReadBtn: { paddingHorizontal: 12, paddingVertical: 12, borderLeftWidth: 1, justifyContent: "center" },
  juzReadBtnText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  juzCheck:     { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  juzCheckDone: { backgroundColor: "#059669", borderColor: "#059669" },
  juzNum:     { fontSize: 13, fontWeight: "700" },
  juzNumDone: { color: "#fff" },
  juzTitle:   { fontSize: 13, fontWeight: "600" },
  juzRange:   { fontSize: 11, marginTop: 1 },

  historySection: { marginTop: 20 },
  historyTitle:   { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  historyRow:     { flexDirection: "row", justifyContent: "space-between", borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1 },
  historyLabel:   { fontSize: 13, fontWeight: "600" },
  historyDates:   { fontSize: 11, marginTop: 1 },
  historyDays:    { fontSize: 13, fontWeight: "600", color: "#059669" },

  celebrationOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  celebrationCard:    { borderRadius: 24, padding: 32, alignItems: "center", width: "82%", maxWidth: 340 },
  celebrationTitle:   { fontSize: 24, fontWeight: "700", marginTop: 8, marginBottom: 6 },
  celebrationSub:     { fontSize: 15, textAlign: "center", marginBottom: 24 },
  celebrationBtn:     { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  celebrationBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
