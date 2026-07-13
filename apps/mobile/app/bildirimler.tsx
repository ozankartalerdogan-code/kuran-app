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
} from "../src/lib/namazNotifications";
import { storage } from "../src/lib/storage";
import { useColors } from "../src/hooks/useColors";

const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const c = useColors();

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
    const days = await fetchPrayerDays(lat, lng);
    if (!days) throw new Error("no-times");
    await applyNotifications({ days, prayer: prayerOn, dailyVerse: dailyOn });
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
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 32 + insets.bottom, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}>
        <Text style={[styles.intro, { color: c.textMuted }]}>
          İkisi de varsayılan olarak açıktır. İstediğin zaman buradan kapatabilirsin, birbirlerinden bağımsızdır.
        </Text>

        {/* Namaz Vakti Bildirimleri */}
        <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.accentLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifTitle, { color: c.text }]}>🔔 Namaz Vakti Bildirimleri</Text>
            <Text style={[styles.notifSub, { color: c.textMuted }]}>
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
            <Text style={[styles.notifSub, { color: c.textMuted }]}>
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
