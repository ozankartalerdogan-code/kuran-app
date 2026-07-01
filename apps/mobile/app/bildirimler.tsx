import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, Switch, Alert, Linking,
} from "react-native";
import * as Location from "expo-location";
import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  requestNotificationPermission,
  fetchPrayerTimes,
  applyNotifications,
  cancelNamazNotifications,
} from "../src/lib/namazNotifications";
import { storage } from "../src/lib/storage";

const NOTIF_KEY = "namazNotifEnabled";
// Bildirimlerin en son hangi gün planlandığı (YYYY-MM-DD) — günde bir kez yeniden planlamak için.
const SCHED_DAY_KEY = "namazNotifSchedDay";
const DAILY_VERSE_KEY = "dailyVerseNotifEnabled";
const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// İzin SORMADAN mevcut izni okuyarak konum getirir (sessiz arka plan yenilemesi için).
async function getUserLocationSilent(): Promise<{ lat: number; lng: number; isFallback: boolean }> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return { ...ISTANBUL, isFallback: true };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return { ...ISTANBUL, isFallback: true };
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, isFallback: false };
  } catch {
    return { ...ISTANBUL, isFallback: true };
  }
}

async function getUserLocation(): Promise<{ lat: number; lng: number; isFallback: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Konum İzni",
        "Konum izni verilmedi. Namaz vakitleri İstanbul için gösterilecek.",
        [{ text: "Tamam" }],
      );
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

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [dailyVerseEnabled, setDailyVerseEnabled] = useState(false);
  const [dailyVerseLoading, setDailyVerseLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pv, dv] = await Promise.all([
        storage.getString(NOTIF_KEY),
        storage.getString(DAILY_VERSE_KEY),
      ]);
      const prayerOn = pv === "1";
      const dailyOn  = dv === "1";
      if (cancelled) return;
      setNotifEnabled(prayerOn);
      setDailyVerseEnabled(dailyOn);
      if (!prayerOn && !dailyOn) return;

      // Vakitler günden güne kaydığı için, açıkken günde bir kez sessizce yeniden planla.
      const today = localDayStr();
      const lastDay = await storage.getString(SCHED_DAY_KEY);
      if (lastDay === today) return;

      try {
        const { lat, lng, isFallback } = await getUserLocationSilent();
        if (cancelled) return;
        const times = await fetchPrayerTimes(lat, lng);
        if (cancelled || !times) return;
        await applyNotifications({ times, prayer: prayerOn, dailyVerse: dailyOn });
        await storage.setString(SCHED_DAY_KEY, today);
        if (!cancelled) setUsingFallback(isFallback);
      } catch { /* sessiz — eldeki planlama korunur */ }
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
  async function rescheduleNotifs(prayerOn: boolean, dailyOn: boolean): Promise<boolean> {
    if (!prayerOn && !dailyOn) {
      await cancelNamazNotifications();
      await storage.remove(SCHED_DAY_KEY);
      return false;
    }
    const { lat, lng, isFallback } = await getUserLocation();
    const times = await fetchPrayerTimes(lat, lng);
    if (!times) throw new Error("no-times");
    await applyNotifications({ times, prayer: prayerOn, dailyVerse: dailyOn });
    await storage.setString(SCHED_DAY_KEY, localDayStr());
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
          ? "Konum izni verilmediği için namaz vakitleri İstanbul'a göre hesaplandı."
          : "Namaz vakitleri bulunduğunuz konuma göre hesaplandı.";
        Alert.alert("Bildirimler Açık", `Her namaz vaktinden 5 dakika önce, içinde namaz temalı bir ayet de bulunan tek bir hatırlatma gönderilecek.\n\n${locationMsg}`);
      } else if (!dailyVerseEnabled) {
        setUsingFallback(false);
      }
    } catch {
      Alert.alert("Hata", "İşlem başarısız. Lütfen tekrar deneyin.");
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
        Alert.alert("Günlük Ayet Açık", "Her gün, namaz vakitleriyle çakışmayan iki farklı saatte Günün Ayeti ve Günün Duası gönderilecek.");
      } else if (!notifEnabled) {
        setUsingFallback(false);
      }
    } catch {
      Alert.alert("Hata", "İşlem başarısız. Lütfen tekrar deneyin.");
    } finally {
      setDailyVerseLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Bildirimler" }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        <Text style={styles.intro}>
          Bildirimleri istediğin zaman buradan açıp kapatabilirsin. İkisi bağımsızdır.
        </Text>

        {/* Namaz Vakti Bildirimleri */}
        <View style={styles.notifCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>🔔 Namaz Vakti Bildirimleri</Text>
            <Text style={styles.notifSub}>
              {notifEnabled
                ? usingFallback
                  ? "İstanbul için bildirim planlandı (konum izni verilmedi)"
                  : "Bulunduğunuz konum için bildirim planlandı"
                : "Her namaz vakti için, içinde namaz temalı ayet bulunan hatırlatma"}
            </Text>
          </View>
          {notifLoading
            ? <ActivityIndicator color="#059669" />
            : <Switch
                value={notifEnabled}
                onValueChange={toggleNotif}
                disabled={dailyVerseLoading}
                trackColor={{ false: "#d4d4d4", true: "#6ee7b7" }}
                thumbColor={notifEnabled ? "#059669" : "#f5f5f5"}
              />
          }
        </View>

        {/* Günlük Ayet & Dua Bildirimi (bağımsız toggle) */}
        <View style={styles.notifCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>📖 Günlük Ayet & Dua</Text>
            <Text style={styles.notifSub}>
              {dailyVerseEnabled
                ? "Her gün 2 kez — namaz vakitleriyle çakışmayan saatlerde"
                : "Günün Ayeti ve Günün Duası'nı bildirimle al"}
            </Text>
          </View>
          {dailyVerseLoading
            ? <ActivityIndicator color="#059669" />
            : <Switch
                value={dailyVerseEnabled}
                onValueChange={toggleDailyVerse}
                disabled={notifLoading}
                trackColor={{ false: "#d4d4d4", true: "#6ee7b7" }}
                thumbColor={dailyVerseEnabled ? "#059669" : "#f5f5f5"}
              />
          }
        </View>

        <Text style={styles.note}>
          Bildirimler için konum (yaklaşık) ve bildirim izni gerekir. Konum verisi cihazınızda işlenir, sunucuya gönderilmez.
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
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#d1fae5",
  },
  notifTitle: { fontSize: 14, fontWeight: "600", color: "#1c1917", marginBottom: 2 },
  notifSub:   { fontSize: 12, color: "#78716c", lineHeight: 17 },
  note: { fontSize: 11, color: "#a8a29e", paddingHorizontal: 16, paddingTop: 4, lineHeight: 16 },
});
