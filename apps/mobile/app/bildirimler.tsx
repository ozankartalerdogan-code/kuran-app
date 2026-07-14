import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, Switch, Alert, Linking,
} from "react-native";
import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  fetchPrayerDays,
  applyNotifications,
  cancelNamazNotifications,
  cancelScheduledPrayerNotifications,
  NOTIF_KEY,
  DAILY_VERSE_KEY,
  SCHED_DAY_KEY,
  PRAYER_SCHEDULE_UNAVAILABLE_KEY,
  getLocationRequesting,
} from "../src/lib/namazNotifications";
import { storage } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";
import { getPrayerNotificationStatus } from "../src/lib/prayerNotificationStatus";

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


export default function BildirimlerScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [dailyVerseEnabled, setDailyVerseEnabled] = useState(false);
  const [dailyVerseLoading, setDailyVerseLoading] = useState(false);
  // Uygulama TERCİHİNDEN (yukarıdaki iki state) kasıtlı olarak AYRI tutulur:
  // kullanıcı sistem ayarlarından bildirimleri kapatmış olabilir — bu durumda
  // tercih "açık" kalır (niyet kaybolmaz) ama gerçek OS izni burada gösterilir.
  const [osPermissionGranted, setOsPermissionGranted] = useState(true);
  const [prayerScheduleUnavailable, setPrayerScheduleUnavailable] = useState(false);

  // Güncel tercih durumunu VE gerçek OS izin durumunu oku/göster. Otomatik-planla/
  // tazele artık burada DEĞİL — _layout.tsx her açılışta/ön plana gelişte
  // ensureNotificationsFresh() ile app-wide hallediyor (bu ekran hiç açılmasa
  // bile çalışır). Burası yalnız o sonucu yansıtır.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pv, dv, granted, scheduleUnavailable] = await Promise.all([
        storage.getString(NOTIF_KEY),
        storage.getString(DAILY_VERSE_KEY),
        getNotificationPermissionStatus(),
        storage.getString(PRAYER_SCHEDULE_UNAVAILABLE_KEY),
      ]);
      if (cancelled) return;
      setNotifEnabled(pv === "1");
      setDailyVerseEnabled(dv === "1");
      setOsPermissionGranted(granted);
      setPrayerScheduleUnavailable(scheduleUnavailable === "1");
    })();
    return () => { cancelled = true; };
  }, []);

  // Bildirim izni iste; reddedilirse ayarlara yönlendiren uyarı göster.
  async function ensurePermission(): Promise<boolean> {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        "Bildirim İzni Gerekli",
        "Bildirimler için izne ihtiyaç var. Ayarlardan \"Bildirimler\"i açabilirsiniz.",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Ayarları Aç", onPress: () => { void Linking.openSettings(); } },
        ],
      );
    }
    return granted;
  }

  // Ortak: iki toggle durumuna göre bildirimleri yeniden kur (cancelAll orkestratörde).
  async function rescheduleNotifs(prayerOn: boolean, dailyOn: boolean): Promise<void> {
    if (!prayerOn && !dailyOn) {
      await cancelNamazNotifications();
      await Promise.all([
        storage.remove(SCHED_DAY_KEY),
        storage.remove(PRAYER_SCHEDULE_UNAVAILABLE_KEY),
      ]);
      setPrayerScheduleUnavailable(false);
      return;
    }
    const coords = await getLocationRequesting();
    if (!coords) {
      if (prayerOn) {
        try {
          await cancelScheduledPrayerNotifications();
        } finally {
          if (notifEnabled) {
            await storage.setString(PRAYER_SCHEDULE_UNAVAILABLE_KEY, "1");
            setPrayerScheduleUnavailable(true);
          }
        }
      }
      throw new Error("location-unavailable");
    }
    const { lat, lng } = coords;
    const days = await fetchPrayerDays(lat, lng);
    if (!days) throw new Error("no-times");
    await applyNotifications({ days, prayer: prayerOn, dailyVerse: dailyOn });
    await Promise.all([
      storage.setString(SCHED_DAY_KEY, localDayStr()),
      storage.remove(PRAYER_SCHEDULE_UNAVAILABLE_KEY),
    ]);
    setPrayerScheduleUnavailable(false);
  }

  async function toggleNotif(val: boolean) {
    setNotifLoading(true);
    try {
      if (!val) {
        await cancelScheduledPrayerNotifications();
        const updates: Promise<void>[] = [
          storage.setString(NOTIF_KEY, "0"),
          storage.remove(PRAYER_SCHEDULE_UNAVAILABLE_KEY),
        ];
        if (!dailyVerseEnabled) updates.push(storage.remove(SCHED_DAY_KEY));
        await Promise.all(updates);
        setPrayerScheduleUnavailable(false);
        setNotifEnabled(false);
        return;
      }
      if (!(await ensurePermission())) { setNotifLoading(false); return; }
      setOsPermissionGranted(true);
      await rescheduleNotifs(true, dailyVerseEnabled);
      await storage.setString(NOTIF_KEY, "1");
      setNotifEnabled(true);
      Alert.alert("Bildirimler Açık", "Her namaz vakti girdikten kısa süre sonra, içinde namaz temalı bir ayet de bulunan tek bir hatırlatma gönderilecek.\n\nNamaz vakitleri bulunduğunuz konuma göre hesaplandı.");
    } catch (error) {
      Alert.alert(
        "Bildirimler Açılamadı",
        error instanceof Error && error.message === "location-unavailable"
          ? "Konum alınamadığı için namaz bildirimleri açılmadı. Konum iznini verip yeniden deneyin."
          : "İşlem başarısız. Lütfen tekrar deneyin.",
      );
    } finally {
      setNotifLoading(false);
    }
  }

  async function toggleDailyVerse(val: boolean) {
    setDailyVerseLoading(true);
    try {
      if (val && !(await ensurePermission())) { setDailyVerseLoading(false); return; }
      if (val) setOsPermissionGranted(true);
      await rescheduleNotifs(notifEnabled, val);
      await storage.setString(DAILY_VERSE_KEY, val ? "1" : "0");
      setDailyVerseEnabled(val);
      if (val) {
        Alert.alert("Günlük Ayet Açık", "Her gün, namaz vakitleriyle çakışmayan iki farklı saatte Günün Ayeti ve Günün Duası gönderilecek.");
      }
    } catch (error) {
      Alert.alert(
        "Bildirimler Açılamadı",
        error instanceof Error && error.message === "location-unavailable"
          ? "Konum alınamadığı için bildirim saatleri güvenle planlanamadı. Konum iznini verip yeniden deneyin."
          : "İşlem başarısız. Lütfen tekrar deneyin.",
      );
    } finally {
      setDailyVerseLoading(false);
    }
  }

  const prayerStatus = getPrayerNotificationStatus({
    preferenceEnabled: notifEnabled,
    osPermissionGranted,
    scheduleUnavailable: prayerScheduleUnavailable,
  });
  const prayerStatusIsWarning =
    prayerStatus.kind === "permission-denied" || prayerStatus.kind === "location-unavailable";

  return (
    <>
      <Stack.Screen options={{ title: "Bildirimler" }} />
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 32 + insets.bottom, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}>
        <Text style={[styles.intro, { color: c.textMuted }]}>
          İkisi de varsayılan olarak açıktır. İstediğin zaman buradan kapatabilirsin, birbirlerinden bağımsızdır.
        </Text>

        {/* Namaz Vakti Bildirimleri */}
        <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.accentLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifTitle, { color: c.text }]}>🔔 Namaz Vakti Bildirimleri</Text>
            <Text style={[styles.notifSub, { color: prayerStatusIsWarning ? "#b45309" : c.textMuted }]}>
              {prayerStatus.message}
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
                accessibilityLabel="Namaz vakti bildirimleri"
              />
          }
        </View>

        {/* Günlük Ayet & Dua Bildirimi (bağımsız toggle) */}
        <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.accentLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifTitle, { color: c.text }]}>📖 Günlük Ayet & Dua</Text>
            <Text style={[styles.notifSub, { color: dailyVerseEnabled && !osPermissionGranted ? "#b45309" : c.textMuted }]}>
              {dailyVerseEnabled
                ? !osPermissionGranted
                  ? "Sistem bildirim izni kapalı — hiçbir bildirim ulaşmaz. Ayarlardan tekrar açabilirsiniz."
                  : "Her gün 2 kez — namaz vakitleriyle çakışmayan saatlerde"
                : "Günün Ayeti ve Günün Duası'nı bildirimle al"}
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
                accessibilityLabel="Günlük ayet ve dua bildirimi"
              />
          }
        </View>

        <Text style={[styles.note, { color: c.textMuted }]}>
          Bildirimler için konum (yaklaşık) ve bildirim izni gerekir. Namaz vakitlerini hesaplamak için konumunuz Aladhan.com servisine gönderilir; bizim sunucularımızda saklanmaz.
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
