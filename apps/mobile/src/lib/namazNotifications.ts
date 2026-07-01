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

// Vakitten kaç dakika önce tek bildirim (hatırlatma + namaz-taglı ayet birlikte)
const REMIND_BEFORE_MIN = 5;

// Android 8+ bildirim kanalı — yüksek öncelik (heads-up + ses). Olmadan bildirimler
// varsayılan kanalda sessiz/önemsiz görünebilir.
const ANDROID_CHANNEL_ID = "namaz-vakitleri";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name:             "Namaz Vakitleri",
    importance:       Notifications.AndroidImportance.HIGH,
    sound:            "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#059669",
  });
}

// Verilen vakitten offsetMin dakika öncesi için DAILY tetikleyici üretir.
// Negatif/aşan dakikayı Date normalize eder (ör. 05:03 → 04:58).
function dailyTriggerBefore(hour: number, minute: number, offsetMin: number) {
  const at = new Date();
  at.setHours(hour, minute - offsetMin, 0, 0);
  return {
    type:      Notifications.SchedulableTriggerInputTypes.DAILY,
    hour:      at.getHours(),
    minute:    at.getMinutes(),
    channelId: ANDROID_CHANNEL_ID, // iOS'ta yok sayılır
  } as const;
}

// Günlük namaz bildirimlerini planla. Her vakit için TEK bildirim (5 dk önce):
// hatırlatma + namaz-taglı ayet meali birlikte (her yeniden planlamada rastgele →
// dinamik). Ayrı ayet bildirimi kaldırıldı → günde 5 bildirim (10 değil), fatigue azalır.
type ValidVakit = { key: string; label: string; hour: number; minute: number };

export async function scheduleNamazNotifications(
  times: PrayerTimes
): Promise<void> {
  // Eski bildirimleri iptal et + Android kanalını hazırla
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureAndroidChannel();

  // Geçerli vakitleri bir kez ayrıştır
  const valid: ValidVakit[] = [];
  for (const { key, label } of VAKITLER) {
    const timeStr = times[key];
    if (!timeStr) continue;
    const [hour, minute] = timeStr.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
    valid.push({ key, label, hour, minute });
  }

  // Namaz-taglı ayet mealleri — PARALEL çek (seri await toggle'ı yavaşlatıyordu).
  // Başarısız/boş olan vakit reminder-only kalır.
  const verses = await Promise.all(
    valid.map(({ key }) =>
      api.notifications.namazVerse(key.toLowerCase()).catch(() => null)
    )
  );

  // Her vakit için TEK bildirim: hatırlatma + (varsa) namaz-taglı ayet aynı gövdede.
  const jobs = valid.map(({ label, hour, minute }, i) => {
    const translation = verses[i]?.translation;
    const verseLine = translation
      ? `\n\n📖 ${translation.slice(0, 150)}${translation.length > 150 ? "…" : ""}`
      : "";
    return Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${label} Vaktine ${REMIND_BEFORE_MIN} Dakika`,
        body:  `${label} vakti yaklaşıyor, namaza hazırlanın.${verseLine}`,
        sound: true,
        data:  { route: "/namaz" },
      },
      trigger: dailyTriggerBefore(hour, minute, REMIND_BEFORE_MIN),
    });
  });
  await Promise.all(jobs);
}

// Bildirimleri kapat
export async function cancelNamazNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Geliştirme amaçlı: ~5 sn sonra örnek bildirim düşürür (izin + kanal doğrulaması).
// Yalnızca __DEV__ ekranından çağrılır; dağıtılan APK/AAB'de buton görünmez.
export async function sendTestNotification(): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Test Bildirimi",
      body:  "Bildirimler çalışıyor! (Geliştirme test bildirimi)",
      sound: true,
      data:  { route: "/namaz" },
    },
    trigger: {
      type:      Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds:   5,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}
