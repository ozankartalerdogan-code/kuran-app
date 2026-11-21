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
import { Button, CloseButton, radius, space } from "./ui";
import {
  JUZ_DATA, EMPTY_HATIM_STORE, parseHatimStore, hatimFmt, hatimGunSayisi,
  type Hatim, type HatimStore,
} from "../lib/hatim";
import { ayetinSayfasi } from "../lib/mushafSayfa";
import { useSurahNameOf } from "../lib/surahNames";
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
  const surahNameOf = useSurahNameOf();
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[st.overlay, { backgroundColor: c.overlay }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t.hatimCloseA11y} />
        <View style={[st.sheet, { backgroundColor: c.card, borderColor: c.border, paddingBottom: insets.bottom + 8 }]}>
          {/* Panel başlığı */}
          <View style={[st.sheetHeader, { borderBottomColor: c.border }]}>
            <View style={st.sheetTitleRow}>
              <Ionicons name="book-outline" size={18} color={c.accent} accessible={false} importantForAccessibility="no" />
              <Text style={[st.sheetTitle, { color: c.text }]}>{t.hatimTitle}</Text>
            </View>
            <CloseButton onPress={onClose} accessibilityLabel={t.close} />
          </View>

          {!mounted ? (
            <View style={st.loading}><ActivityIndicator size="large" color={c.accent} /></View>
          ) : (
            <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
              {!current ? (
                <View style={[st.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[st.emptyText, { color: c.textMuted }]}>{t.hatimNone}</Text>
                  <Button variant="primary" label={t.hatimStart} onPress={startHatim} accessibilityLabel={t.hatimStartA11y} />
                </View>
              ) : (
                <>
                  {/* İlerleme */}
                  <View style={[st.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={st.progressRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.progressDate, { color: c.textMuted }]}>{fmt(t.hatimStarted, { date: hatimFmt(current.startDate, loc) })}</Text>
                        {current.completedDate && (
                          <View style={st.completedRow}>
                            <Ionicons name="checkmark-circle-outline" size={14} color={c.greenText} accessible={false} importantForAccessibility="no" />
                            <Text style={[st.completedText, { color: c.greenText }]}>
                              {fmt(t.hatimDone, { n: hatimGunSayisi(current.startDate, current.completedDate) })}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[st.progressCount, { color: c.accent }]}>{progress}/30</Text>
                    </View>
                    <View style={[st.progressBg, { backgroundColor: c.border }]}>
                      <View style={[st.progressFill, { backgroundColor: c.accent, width: `${pct}%` as DimensionValue }]} />
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
                          <Text style={[st.actionText, { color: c.errorText }]}>{t.hatimReset}</Text>
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
                            <Text style={[st.actionText, { color: c.errorText, fontWeight: "700" }]}>{t.yes}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setConfirm(false)}
                            accessibilityRole="button"
                            accessibilityLabel={t.hatimCancelA11y}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={st.actionBtn}
                          >
                            <Text style={[st.actionText, { color: c.textSecondary }]}>{t.no}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  {/* 30 Cüz */}
                  {JUZ_DATA.map((juz) => {
                    const done = current.readJuz.includes(juz.juz);
                    return (
                      <View
                        key={juz.juz}
                        style={[
                          st.juzRow,
                          done
                            ? { backgroundColor: c.greenBg, borderColor: c.greenBorder }
                            : { backgroundColor: c.cardAlt, borderColor: c.border },
                        ]}
                      >
                        <TouchableOpacity
                          style={st.juzMain}
                          onPress={() => toggleJuz(juz.juz)}
                          activeOpacity={0.7}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: done }}
                          accessibilityLabel={fmt(t.juzMarkA11y, { n: juz.juz })}
                        >
                          <View
                            style={[
                              st.juzCheck,
                              done
                                ? { backgroundColor: c.greenBg, borderColor: c.greenBorder }
                                : { backgroundColor: c.cardAlt, borderColor: c.border },
                            ]}
                          >
                            {done ? (
                              <Ionicons name="checkmark" size={16} color={c.greenText} accessible={false} importantForAccessibility="no" />
                            ) : (
                              <Text style={[st.juzNum, { color: c.text }]} maxFontSizeMultiplier={1.2}>
                                {juz.juz}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[st.juzTitle, { color: done ? c.greenText : c.text }]}>{fmt(t.juzTitle, { n: juz.juz })}</Text>
                            <Text style={[st.juzRange, { color: c.textMuted }]}>{surahNameOf(juz.startSurah, juz.startName)} {juz.startAyah} – {surahNameOf(juz.endSurah, juz.endName)} {juz.endAyah}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[st.juzReadBtn, { borderLeftColor: done ? c.greenBorder : c.border }]}
                          onPress={() => okuJuz(juz)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={fmt(t.juzReadA11y, { n: juz.juz })}
                        >
                          <Text style={[st.juzReadBtnText, { color: c.accent }]}>{t.juzRead}</Text>
                          <Ionicons name="chevron-forward" size={16} color={c.accent} accessible={false} importantForAccessibility="no" />
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
                        <View style={st.historyDatesRow}>
                          <Text style={[st.historyDates, { color: c.textMuted }]}>{hatimFmt(h.startDate, loc)}</Text>
                          <Ionicons name="arrow-forward" size={12} color={c.textMuted} accessible={false} importantForAccessibility="no" />
                          <Text style={[st.historyDates, { color: c.textMuted }]}>{hatimFmt(h.completedDate, loc)}</Text>
                        </View>
                      </View>
                      <Text style={[st.historyDays, { color: c.accent }]}>{fmt(t.daysUnit, { n: hatimGunSayisi(h.startDate, h.completedDate) })}</Text>
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
        <View style={[st.celebrationOverlay, { backgroundColor: c.overlay }]}>
          <View style={[st.celebrationCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {LottieView ? (
              <LottieView
                source={require("../../assets/Star-Blast.json")}
                autoPlay
                loop={false}
                style={{ width: 200, height: 200 }}
              />
            ) : (
              <Ionicons name="trophy-outline" size={40} color={c.goldText} style={{ marginTop: space.xs }} accessible={false} importantForAccessibility="no" />
            )}
            <Text style={[st.celebrationTitle, { color: c.text }]}>{t.congrats}</Text>
            <Text style={[st.celebrationSub, { color: c.textSecondary }]}>{t.hatimCongrats}</Text>
            <Button
              variant="primary"
              fullWidth
              label={t.ok}
              onPress={() => setShowCelebration(false)}
              accessibilityLabel={t.celebrationCloseA11y}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay:         { flex: 1 },
  sheet:           { maxHeight: "82%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, overflow: "hidden" },
  sheetHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: space.gutter, paddingRight: space.xs, paddingVertical: space.xs, borderBottomWidth: 1 },
  sheetTitleRow:   { flexDirection: "row", alignItems: "center", gap: space.xs },
  sheetTitle:      { fontSize: 16, fontWeight: "700" },
  loading:         { padding: 40, alignItems: "center" },
  content:         { padding: space.gutter, paddingBottom: space.lg, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },

  emptyCard:       { borderRadius: radius.lg, padding: space.lg, alignItems: "center", borderWidth: 1 },
  emptyText:       { fontSize: 15, marginBottom: space.md },

  progressCard:    { borderRadius: radius.lg, padding: space.md, marginBottom: space.sm, borderWidth: 1 },
  progressRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  progressDate:    { fontSize: 12 },
  completedRow:    { flexDirection: "row", alignItems: "center", gap: space.xxs, marginTop: 2 },
  completedText:   { fontSize: 12, fontWeight: "600" },
  progressCount:   { fontSize: 28, fontWeight: "700" },
  progressBg:      { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill:    { height: 8, borderRadius: 4 },
  progressPct:     { fontSize: 11, textAlign: "right", marginTop: 2 },
  progressActions: { flexDirection: "row", gap: space.md, marginTop: 10, alignItems: "center" },
  actionBtn:       { paddingVertical: 6, paddingHorizontal: 4 },
  actionText:      { fontSize: 13 },
  confirmText:     { fontSize: 12, flex: 1 },

  juzRow:          { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, marginBottom: 6, borderWidth: 1, overflow: "hidden" },
  juzMain:         { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm },
  juzReadBtn:      { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: space.sm, paddingVertical: space.sm, borderLeftWidth: 1 },
  juzReadBtnText:  { fontSize: 12, fontWeight: "700" },
  juzCheck:        { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  juzNum:          { fontSize: 13, fontWeight: "700" },
  juzTitle:        { fontSize: 13, fontWeight: "600" },
  juzRange:        { fontSize: 11, marginTop: 1 },

  historySection:  { marginTop: 20 },
  historyTitle:    { fontSize: 14, fontWeight: "700", marginBottom: space.xs },
  historyRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: radius.lg, padding: space.sm, marginBottom: 6, borderWidth: 1 },
  historyLabel:    { fontSize: 13, fontWeight: "600" },
  historyDatesRow: { flexDirection: "row", alignItems: "center", gap: space.xxs, marginTop: 2 },
  historyDates:    { fontSize: 11 },
  historyDays:     { fontSize: 13, fontWeight: "600" },

  celebrationOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  celebrationCard:    { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, alignItems: "center", width: "82%", maxWidth: 340 },
  celebrationTitle:   { fontSize: 24, fontWeight: "700", marginTop: space.xs, marginBottom: 6 },
  celebrationSub:     { fontSize: 15, textAlign: "center", marginBottom: space.lg },
});
