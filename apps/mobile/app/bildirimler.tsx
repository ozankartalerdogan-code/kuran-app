import { overlayAlert } from "../src/tour/overlayAlert";
import { withOverlayBusy } from "../src/tour/overlayBusy";
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, Switch, Linking,
  AppState, TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import {
  requestNotificationPermission,
  changeNotificationPreference,
  NOTIF_KEY,
  DAILY_VERSE_KEY,
} from "../src/lib/namazNotifications";
import { storage } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";
import { useStrings, getStrings, fmt } from "../src/i18n";
import personalStrings from "../src/i18n/strings/personal";
import { needsExactAlarmPermission, maybePromptExactAlarm } from "../src/lib/exactAlarmPrompt";
import { openExactAlarmSettings } from "../modules/exact-alarm";

const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

async function getUserLocation(): Promise<{ lat: number; lng: number; isFallback: boolean }> {
  try {
    const { status } = await withOverlayBusy(() => Location.requestForegroundPermissionsAsync());
    if (status !== "granted") {
      const t = getStrings(personalStrings);
      await new Promise<void>(resolve => overlayAlert(t.locTitle, t.locDenied, [{ text: t.ok, onPress: () => resolve() }], { cancelable: true, onDismiss: resolve }));
      return { ...ISTANBUL, isFallback: true };
    }
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) {
      return { ...ISTANBUL, isFallback: true };
    }
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, isFallback: false };
  } catch {
    return { ...ISTANBUL, isFallback: true };
  }
}

export default function BildirimlerScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const t = useStrings(personalStrings);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [dailyVerseEnabled, setDailyVerseEnabled] = useState(false);
  const [dailyVerseLoading, setDailyVerseLoading] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [exactMissing, setExactMissing] = useState(false);

  // "Alarmlar ve hatırlatıcılar" izni: ayardan dönünce (ön plana gelişte) yeniden oku.
  // İzin verildiyse yeniden planlamayı _layout'taki ensureNotificationsFresh yapar
  // (schedStamp izin durumunu içerir).
  useEffect(() => {
    const check = () => { void needsExactAlarmPermission().then(setExactMissing).catch(() => {}); };
    check();
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") check(); });
    return () => sub.remove();
  }, [notifEnabled, dailyVerseEnabled]);

  // Güncel tercih durumunu oku ve göster. Otomatik-planla/tazele artık burada DEĞİL —
  // _layout.tsx her açılışta/ön plana gelişte ensureNotificationsFresh() ile app-wide
  // hallediyor (bu ekran hiç açılmasa bile çalışır). Burası yalnız o sonucu yansıtır.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pv, dv] = await Promise.all([
          storage.getString(NOTIF_KEY),
          storage.getString(DAILY_VERSE_KEY),
        ]);
        if (cancelled) return;
        setNotifEnabled(pv === "1");
        setDailyVerseEnabled(dv === "1");
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Bildirim izni iste; reddedilirse ayarlara yönlendiren uyarı göster.
  async function ensurePermission(): Promise<boolean> {
    // Sistem izin penceresi açıkken rehber/değerlendirme/exact-alarm istemi çıkmaz.
    const granted = await withOverlayBusy(requestNotificationPermission);
    if (!granted) {
      overlayAlert(
        t.permTitle,
        t.permBody,
        [
          { text: t.giveUp, style: "cancel" },
          { text: t.openSettings, onPress: () => { void Linking.openSettings(); } },
        ],
      );
    }
    return granted;
  }

  async function toggleNotif(val: boolean) {
    setNotifLoading(true);
    try {
      const { granted, isFallback } = await changeNotificationPreference(NOTIF_KEY, val, ensurePermission, getUserLocation);
      if (!granted) return;
      setNotifEnabled(val);
      if (val) {
        setUsingFallback(isFallback);
        const locationMsg = isFallback
          ? t.locFallbackMsg
          : t.locOkMsg;
        overlayAlert(t.notifOnTitle, fmt(t.notifOnBody, { loc: locationMsg }), [
          { text: t.ok, onPress: () => { void maybePromptExactAlarm(); } },
        ]);
      } else if (!dailyVerseEnabled) {
        setUsingFallback(false);
      }
    } catch {
      const [pv, dv] = await Promise.all([storage.getString(NOTIF_KEY), storage.getString(DAILY_VERSE_KEY)]);
      setNotifEnabled(pv === "1"); setDailyVerseEnabled(dv === "1");
      overlayAlert(t.errorTitle, t.actionFailed);
    } finally {
      setNotifLoading(false);
    }
  }

  async function toggleDailyVerse(val: boolean) {
    setDailyVerseLoading(true);
    try {
      const { granted, isFallback } = await changeNotificationPreference(DAILY_VERSE_KEY, val, ensurePermission, getUserLocation);
      if (!granted) return;
      setDailyVerseEnabled(val);
      if (val) {
        setUsingFallback(isFallback);
        overlayAlert(t.dailyOnTitle, t.dailyOnBody, [
          { text: t.ok, onPress: () => { void maybePromptExactAlarm(); } },
        ]);
      } else if (!notifEnabled) {
        setUsingFallback(false);
      }
    } catch {
      const [pv, dv] = await Promise.all([storage.getString(NOTIF_KEY), storage.getString(DAILY_VERSE_KEY)]);
      setNotifEnabled(pv === "1"); setDailyVerseEnabled(dv === "1");
      overlayAlert(t.errorTitle, t.actionFailed);
    } finally {
      setDailyVerseLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitle }} />
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 32 + insets.bottom, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}>
        {/*
          Metin duruma göre değişmeli: ilk açılışta ikisi de yalnız BİLDİRİM İZNİ
          VERİLİRSE açılır (enablePrayerNotificationsFirstRun). İzin reddedilirse
          tercihler kapalı yazılır ve bir daha otomatik sorulmaz — o durumda
          koşulsuz "varsayılan olarak açıktır" demek yanıltıcıydı: kullanıcı
          kapalı toggle'ları görüp nedenini anlayamıyordu.
        */}
        {prefsLoaded && (
          <Text style={[styles.intro, { color: c.textMuted }]}>
            {notifEnabled || dailyVerseEnabled
              ? t.introOn
              : t.introOff}
          </Text>
        )}

        {/* Namaz Vakti Bildirimleri */}
        <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.accentLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifTitle, { color: c.text }]}>{t.prayerNotifTitle}</Text>
            <Text style={[styles.notifSub, { color: c.textMuted }]}>
              {notifEnabled
                ? usingFallback
                  ? t.prayerSubFallback
                  : t.prayerSubLoc
                : t.prayerSubOff}
            </Text>
          </View>
          {notifLoading || !prefsLoaded
            ? <ActivityIndicator color="#059669" />
            : <Switch
                value={notifEnabled}
                onValueChange={toggleNotif}
                disabled={dailyVerseLoading}
                trackColor={{ false: c.border, true: c.accentLight }}
                thumbColor={notifEnabled ? c.accent : c.cardAlt}
                accessibilityLabel={t.prayerSwitchA11y}
              />
          }
        </View>

        {/* Günlük Ayet & Dua Bildirimi (bağımsız toggle) */}
        <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.accentLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifTitle, { color: c.text }]}>{t.dailyTitle}</Text>
            <Text style={[styles.notifSub, { color: c.textMuted }]}>
              {dailyVerseEnabled
                ? t.dailySubOn
                : t.dailySubOff}
            </Text>
          </View>
          {dailyVerseLoading || !prefsLoaded
            ? <ActivityIndicator color="#059669" />
            : <Switch
                value={dailyVerseEnabled}
                onValueChange={toggleDailyVerse}
                disabled={notifLoading}
                trackColor={{ false: c.border, true: c.accentLight }}
                thumbColor={dailyVerseEnabled ? c.accent : c.cardAlt}
                accessibilityLabel={t.dailySwitchA11y}
              />
          }
        </View>

        {exactMissing && (
          <View style={[styles.exactCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.notifTitle, { color: c.text }]}>{t.exactCardTitle}</Text>
            <Text style={[styles.notifSub, { color: c.textMuted }]}>{t.exactCardBody}</Text>
            <TouchableOpacity
              style={[styles.exactBtn, { backgroundColor: c.accent }]}
              onPress={() => { openExactAlarmSettings(); }}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.exactBtnText}>{t.exactCardBtn}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.note, { color: c.textMuted }]}>
          {t.privacyNote}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  intro: { fontSize: 13, color: "#78716c", paddingHorizontal: 16, paddingTop: 14, lineHeight: 19 },
  notifCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    margin: 12, padding: 14,
    backgroundColor: "#fffdf6", borderRadius: 12,
    borderWidth: 1, borderColor: "#d1fae5",
  },
  notifTitle: { fontSize: 14, fontWeight: "600", color: "#1c1917", marginBottom: 2 },
  notifSub:   { fontSize: 12, color: "#78716c", lineHeight: 17 },
  exactCard: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  exactBtn: { alignSelf: "flex-start", marginTop: 4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, justifyContent: "center" },
  exactBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  note: { fontSize: 11, color: "#a8a29e", paddingHorizontal: 16, paddingTop: 4, lineHeight: 16 },
});
