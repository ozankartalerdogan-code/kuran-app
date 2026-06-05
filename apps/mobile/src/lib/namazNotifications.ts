import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

const VAKITLER = [
  { key: "Fajr",    label: "İmsak" },
  { key: "Sunrise", label: "Güneş" },
  { key: "Dhuhr",   label: "Öğle"  },
  { key: "Asr",     label: "İkindi" },
  { key: "Maghrib", label: "Akşam" },
  { key: "Isha",    label: "Yatsı"  },
];

export type PrayerTimes = Record<string, string>;

// İzin iste
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  if (Platform.OS === "android" && Platform.Version < 33) return true;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Aladhan API'den namaz vakitlerini al
export async function fetchPrayerTimes(
  lat: number,
  lng: number
): Promise<PrayerTimes | null> {
  // Kötü ağda donmayı önlemek için 8 sn timeout (AbortController — RN'de geniş uyumlu).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const res = await fetch(
      // school=0: Diyanet İkindi standart yöntemle (school=1/Hanefi ~1 saat geç verir)
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=13&school=0&midnightMode=0`,
      { headers: { "Accept": "application/json" }, signal: controller.signal }
    );
    const data = await res.json();
    return data?.data?.timings ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Vakitten kaç dakika önce bildirim gönderilsin
const NOTIFY_BEFORE_MIN = 5;

// Günlük namaz bildirimlerini planla — her vakitten NOTIFY_BEFORE_MIN dakika önce,
// DAILY tetikleyici ile her gün tekrarlar (tek seferlik değil).
export async function scheduleNamazNotifications(
  times: PrayerTimes
): Promise<void> {
  // Eski bildirimleri iptal et
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const { key, label } of VAKITLER) {
    const timeStr = times[key];
    if (!timeStr) continue;

    const [hour, minute] = timeStr.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    // Vakitten NOTIFY_BEFORE_MIN dakika önceye ayarla.
    // Negatif/aşan dakikayı Date kendisi normalize eder (ör. 05:03 → 04:58).
    const at = new Date();
    at.setHours(hour, minute - NOTIFY_BEFORE_MIN, 0, 0);

    // Vakit-spesifik ayet al (hata olursa varsayılan mesaj kullan)
    let body = `${NOTIFY_BEFORE_MIN} dakika sonra ${label.toLocaleLowerCase("tr-TR")} vakti.`;
    try {
      const verse = await api.notifications.namazVerse(key.toLowerCase());
      if (verse?.translation) {
        body = verse.translation.slice(0, 120) + (verse.translation.length > 120 ? "…" : "");
      }
    } catch { /* ignore */ }

    // DAILY: her gün at.getHours():at.getMinutes() saatinde tekrarlar.
    // Bir sonraki uygun günü expo otomatik seçer; "geçmişse atla" gerekmez.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${label} Vaktine ${NOTIFY_BEFORE_MIN} Dakika`,
        body,
        sound: true,
        data: { route: "/namaz" },
      },
      trigger: {
        type:   Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:   at.getHours(),
        minute: at.getMinutes(),
      },
    });
  }
}

// Bildirimleri kapat
export async function cancelNamazNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
