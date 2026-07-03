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

// Android 8+ bildirim kanalları — yüksek öncelik (heads-up + ses). Olmadan bildirimler
// varsayılan kanalda sessiz/önemsiz görünebilir. İKİ AYRI kanal: kullanıcı Android
// sistem ayarlarından (bildirime uzun bas → kanal ayarları) namaz ve günlük ayet
// bildirimlerini birbirinden bağımsız susturabilsin — tek kanalda bu mümkün değildi.
const ANDROID_CHANNEL_ID_PRAYER = "namaz-vakitleri";
const ANDROID_CHANNEL_ID_DAILY  = "gunun-ayeti";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID_PRAYER, {
    name:             "Namaz Vakitleri",
    importance:       Notifications.AndroidImportance.HIGH,
    sound:            "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#059669",
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID_DAILY, {
    name:             "Günün Ayeti ve Duası",
    importance:       Notifications.AndroidImportance.HIGH,
    sound:            "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#059669",
  });
}

// Verilen vakitten offsetMin dakika öncesi için DAILY tetikleyici üretir.
// Negatif/aşan dakikayı Date normalize eder (ör. 05:03 → 04:58).
function dailyTriggerBefore(hour: number, minute: number, offsetMin: number, channelId: string) {
  const at = new Date();
  at.setHours(hour, minute - offsetMin, 0, 0);
  return {
    type:      Notifications.SchedulableTriggerInputTypes.DAILY,
    hour:      at.getHours(),
    minute:    at.getMinutes(),
    channelId, // iOS'ta yok sayılır
  } as const;
}

// Günlük namaz bildirimlerini planla. Her vakit için TEK bildirim (5 dk önce):
// hatırlatma + namaz-taglı ayet meali birlikte (her yeniden planlamada rastgele →
// dinamik). Ayrı ayet bildirimi kaldırıldı → günde 5 bildirim (10 değil), fatigue azalır.
type ValidVakit = { key: string; label: string; hour: number; minute: number };

function parseValid(times: PrayerTimes): ValidVakit[] {
  const valid: ValidVakit[] = [];
  for (const { key, label } of VAKITLER) {
    const timeStr = times[key];
    if (!timeStr) continue;
    const [hour, minute] = timeStr.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
    valid.push({ key, label, hour, minute });
  }
  return valid;
}

// Namaz vakti bildirimleri: her vakit için TEK bildirim (hatırlatma + namaz-taglı ayet).
async function schedulePrayerNotifications(times: PrayerTimes): Promise<void> {
  const valid = parseValid(times);
  // Namaz-taglı ayet mealleri — PARALEL çek (seri await toggle'ı yavaşlatıyordu).
  const verses = await Promise.all(
    valid.map(({ key }) =>
      api.notifications.namazVerse(key.toLowerCase()).catch(() => null)
    )
  );
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
      trigger: dailyTriggerBefore(hour, minute, REMIND_BEFORE_MIN, ANDROID_CHANNEL_ID_PRAYER),
    });
  });
  await Promise.all(jobs);
}

// Günlük ayet bildirimlerini, namaz vakitleri arasındaki en büyük 2 boşluğun ortasına
// yerleştir → namaz bildirimleriyle çakışmaz. (En az 2 vakit yoksa makul sabit saatler.)
function computeGapSlots(times: PrayerTimes): { hour: number; minute: number }[] {
  const mins: number[] = [];
  for (const { key } of VAKITLER) {
    const t = times[key];
    if (!t) continue;
    const [h, m] = t.split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) mins.push(h * 60 + m);
  }
  mins.sort((a, b) => a - b);
  if (mins.length < 2) return [{ hour: 10, minute: 30 }, { hour: 20, minute: 0 }];
  const gaps: { size: number; mid: number }[] = [];
  for (let i = 0; i < mins.length - 1; i++) {
    gaps.push({ size: mins[i + 1] - mins[i], mid: Math.round((mins[i] + mins[i + 1]) / 2) });
  }
  gaps.sort((a, b) => b.size - a.size);
  const picks = gaps.slice(0, 2).map((g) => g.mid).sort((a, b) => a - b);
  return picks.map((mid) => ({ hour: Math.floor(mid / 60), minute: mid % 60 }));
}

// Günde 2 bağımsız bildirim: Günün Ayeti + Günün Duası (/api/daily), boşluk saatlerine.
async function scheduleDailyVerseNotifications(times: PrayerTimes): Promise<void> {
  const daily = await api.daily.get().catch(() => null);
  if (!daily) return;
  const slots = computeGapSlots(times);
  const items = [
    daily.verse?.meal
      ? { title: "📖 Günün Ayeti", body: daily.verse.meal, sid: daily.verse.surah_id, an: daily.verse.ayah_number, slot: slots[0] }
      : null,
    daily.dua?.meal
      ? { title: "🤲 Günün Duası", body: daily.dua.meal, sid: daily.dua.surah_id, an: daily.dua.ayah_number, slot: slots[1] }
      : null,
  ].filter((x): x is NonNullable<typeof x> => !!x && !!x.slot);

  const jobs = items.map((x) =>
    Notifications.scheduleNotificationAsync({
      content: {
        title: x.title,
        body:  `${x.body.slice(0, 150)}${x.body.length > 150 ? "…" : ""}`,
        sound: true,
        data:  { route: `/ayah/${x.sid}/${x.an}` },
      },
      trigger: dailyTriggerBefore(x.slot.hour, x.slot.minute, 0, ANDROID_CHANNEL_ID_DAILY),
    })
  );
  await Promise.all(jobs);
}

// Orkestratör: cancelAll bir kez → iki bildirim türünü bağımsız toggle'lara göre planlar.
export async function applyNotifications(opts: {
  times: PrayerTimes;
  prayer: boolean;
  dailyVerse: boolean;
}): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureAndroidChannel();
  if (opts.prayer) await schedulePrayerNotifications(opts.times);
  if (opts.dailyVerse) await scheduleDailyVerseNotifications(opts.times);
}

// Bildirimleri kapat
export async function cancelNamazNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
