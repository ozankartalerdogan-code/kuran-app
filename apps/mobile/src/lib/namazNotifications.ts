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
  try {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=13&school=1&midnightMode=0`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await res.json();
    return data?.data?.timings ?? null;
  } catch {
    return null;
  }
}

// Günlük namaz bildirimlerini planla
export async function scheduleNamazNotifications(
  times: PrayerTimes
): Promise<void> {
  // Eski bildirimleri iptal et
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (const { key, label } of VAKITLER) {
    const timeStr = times[key];
    if (!timeStr) continue;

    const [hour, minute] = timeStr.split(":").map(Number);
    const trigger = new Date();
    trigger.setHours(hour, minute, 0, 0);

    // Vakit geçmişse bugün planlamayı atla
    if (trigger <= now) continue;

    // Vakit-spesifik ayet al (hata olursa varsayılan mesaj kullan)
    let body = "Namaz vakti girdi.";
    try {
      const verse = await api.notifications.namazVerse(key.toLowerCase());
      if (verse?.translation) {
        body = verse.translation.slice(0, 120) + (verse.translation.length > 120 ? "…" : "");
      }
    } catch { /* ignore */ }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${label} Vakti`,
        body,
        sound: true,
        data: { route: "/namaz" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  }
}

// Bildirimleri kapat
export async function cancelNamazNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
