import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, Switch, Alert, Linking,
} from "react-native";
import * as Location from "expo-location";
import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import {
  requestNotificationPermission,
  fetchPrayerDays,
  applyNotifications,
  cancelNamazNotifications,
  NOTIF_KEY,
  DAILY_VERSE_KEY,
  SCHED_DAY_KEY,
  schedStamp,
} from "../src/lib/namazNotifications";
import { storage } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";
import { useStrings, getStrings, fmt } from "../src/i18n";
import personalStrings from "../src/i18n/strings/personal";

const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

async function getUserLocation(): Promise<{ lat: number; lng: number; isFallback: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      const t = getStrings(personalStrings);
      Alert.alert(t.locTitle, t.locDenied, [{ text: t.ok }]);
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
  const [usingFallback, setUsingFallback] = useState(false);

  // Güncel tercih durumunu oku ve göster. Otomatik-planla/tazele artık burada DEĞİL —
  // _layout.tsx her açılışta/ön plana gelişte ensureNotificationsFresh() ile app-wide
  // hallediyor (bu ekran hiç açılmasa bile çalışır). Burası yalnız o sonucu yansıtır.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pv, dv] = await Promise.all([
        storage.getString(NOTIF_KEY),
        storage.getString(DAILY_VERSE_KEY),
      ]);
      if (cancelled) return;
      setNotifEnabled(pv === "1");
      setDailyVerseEnabled(dv === "1");
    })();
    return () => { cancelled = true; };
  }, []);

  // Bildirim izni iste; reddedilirse ayarlara yönlendiren uyarı göster.
  async function ensurePermission(): Promise<boolean> {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
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

  // Ortak: iki toggle durumuna göre bildirimleri yeniden kur (cancelAll orkestratörde).
  async function rescheduleNotifs(prayerOn: boolean, dailyOn: boolean): Promise<boolean> {
    if (!prayerOn && !dailyOn) {
      await cancelNamazNotifications();
      await storage.remove(SCHED_DAY_KEY);
      return false;
    }
    const { lat, lng, isFallback } = await getUserLocation();
    const days = await fetchPrayerDays(lat, lng);
    if (!days) throw new Error("no-times");
    await applyNotifications({ days, prayer: prayerOn, dailyVerse: dailyOn });
    await storage.setString(SCHED_DAY_KEY, schedStamp());
    return isFallback;
  }

  async function toggleNotif(val: boolean) {
    setNotifLoading(true);
    try {
      if (val && !(await ensurePermission())) { setNotifLoading(false); return; }
      const isFallback = await rescheduleNotifs(val, dailyVerseEnabled);
      await storage.setString(NOTIF_KEY, val ? "1" : "0");
      setNotifEnabled(val);
      if (val) {
        setUsingFallback(isFallback);
        const locationMsg = isFallback
          ? t.locFallbackMsg
          : t.locOkMsg;
        Alert.alert(t.notifOnTitle, fmt(t.notifOnBody, { loc: locationMsg }));
      } else if (!dailyVerseEnabled) {
        setUsingFallback(false);
      }
    } catch {
      Alert.alert(t.errorTitle, t.actionFailed);
    } finally {
      setNotifLoading(false);
    }
  }

  async function toggleDailyVerse(val: boolean) {
    setDailyVerseLoading(true);
    try {
      if (val && !(await ensurePermission())) { setDailyVerseLoading(false); return; }
      const isFallback = await rescheduleNotifs(notifEnabled, val);
      await storage.setString(DAILY_VERSE_KEY, val ? "1" : "0");
      setDailyVerseEnabled(val);
      if (val) {
        setUsingFallback(isFallback);
        Alert.alert(t.dailyOnTitle, t.dailyOnBody);
      } else if (!notifEnabled) {
        setUsingFallback(false);
      }
    } catch {
      Alert.alert(t.errorTitle, t.actionFailed);
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
        <Text style={[styles.intro, { color: c.textMuted }]}>
          {notifEnabled || dailyVerseEnabled
            ? t.introOn
            : t.introOff}
        </Text>

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
          {notifLoading
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
          {dailyVerseLoading
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
  note: { fontSize: 11, color: "#a8a29e", paddingHorizontal: 16, paddingTop: 4, lineHeight: 16 },
});
