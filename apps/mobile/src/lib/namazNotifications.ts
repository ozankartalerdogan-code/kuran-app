import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { api } from "./api";
import { storage } from "./storage";

const VAKITLER = [
  { key: "Fajr",    label: "İmsak" },
  { key: "Sunrise", label: "Güneş" },
  { key: "Dhuhr",   label: "Öğle"  },
  { key: "Asr",     label: "İkindi" },
  { key: "Maghrib", label: "Akşam" },
  { key: "Isha",    label: "Yatsı"  },
];

export type PrayerTimes = Record<string, string>;

// Bildirim tercihi anahtarları — bildirimler.tsx ve buradaki app-wide "her zaman
// taze tut" mantığı AYNI anahtarları paylaşır (tek kaynak, ikisi ayrışmasın).
export const NOTIF_KEY = "namazNotifEnabled";
export const DAILY_VERSE_KEY = "dailyVerseNotifEnabled";
export const SCHED_DAY_KEY = "namazNotifSchedDay";

const ISTANBUL_FALLBACK = { lat: 41.0082, lng: 28.9784 };

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// İzin SORMADAN mevcut izni okuyarak konum getirir (sessiz arka plan yenilemesi için).
async function getLocationSilent(): Promise<{ lat: number; lng: number }> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return ISTANBUL_FALLBACK;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return ISTANBUL_FALLBACK;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return ISTANBUL_FALLBACK;
  }
}

// İzin İSTEYEREK konum getirir — yalnız ilk-hiç-açılış otomatik-etkinleştirmesinde
// kullanılır (kullanıcı henüz hiçbir yerde karar vermemişse gerçek OS izin
// penceresini açar). Reddedilirse/hata olursa sessizce İstanbul'a düşer.
async function getLocationRequesting(): Promise<{ lat: number; lng: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return ISTANBUL_FALLBACK;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return ISTANBUL_FALLBACK;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return ISTANBUL_FALLBACK;
  }
}

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
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=13&school=0&midnightMode=0&timezonestring=Europe%2FIstanbul`,
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
    // sound belirtilmez → kanal sistem varsayılan bildirim sesini kullanır.
    // Not: string "default" verilirse expo-notifications onu ÖZEL ses dosyası
    // adı sanıp ("Custom sound 'default' not found") hata basıyordu.
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#059669",
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID_DAILY, {
    name:             "Günün Ayeti ve Duası",
    importance:       Notifications.AndroidImportance.HIGH,
    // sound belirtilmez → kanal sistem varsayılan bildirim sesini kullanır.
    // Not: string "default" verilirse expo-notifications onu ÖZEL ses dosyası
    // adı sanıp ("Custom sound 'default' not found") hata basıyordu.
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

// App-wide "her zaman taze tut" — _layout.tsx her açılışta (+ arka plandan öne
// gelince) çağırır. İKİ İŞİ VAR:
//  1) İLK HİÇ AÇILIŞ (iki tercih anahtarı da hiç yazılmamış): bildirimler
//     VARSAYILAN AÇIK denenir (izin verilirse); kullanıcı sonra Bildirimler
//     ekranından kapatabilir.
//  2) Zaten yapılandırılmışsa: içerik/saatler GÜNDE EN AZ BİR KEZ tazelenir.
//     Eskiden bu kontrol yalnız Bildirimler ekranı açılınca çalışıyordu — kullanıcı
//     o ekranı bir daha hiç açmazsa namaz vakti bildirim SAATLERİ (gün be gün kayar)
//     ve günlük ayet/dua İÇERİĞİ (DAILY tetikleyici ilk planlanan içeriği sonsuza
//     dek tekrarlar) donuk kalıyordu. Artık uygulama her ön plana geçtiğinde kontrol
//     edilir → gerçekten "günlük" ve doğru saatli kalır.
export async function ensureNotificationsFresh(): Promise<void> {
  const [pvRaw, dvRaw] = await Promise.all([
    storage.getString(NOTIF_KEY),
    storage.getString(DAILY_VERSE_KEY),
  ]);

  if (pvRaw === null && dvRaw === null) {
    // İlk açılış: bildirim VE konum izinleri istenir. Konum bildirimden
    // BAĞIMSIZDIR — bildirim reddedilse bile konum sorulur, çünkü konum yalnız
    // bildirim için değil, namaz vakitleri ve kıble için de gereklidir.
    const notifGranted = await requestNotificationPermission();
    // Konumu HER DURUMDA iste (OS penceresi bildirim sonucundan bağımsız açılır);
    // reddedilirse getLocationRequesting sessizce İstanbul'a düşer.
    const { lat, lng } = await getLocationRequesting();

    if (!notifGranted) {
      // Bildirim reddedildi → planlama yapılmaz, kapalı işaretlenir (tekrar tekrar
      // sormayı önler). Konum izni yine de istendi; kıble/vakitler kullanabilir.
      // Kullanıcı Bildirimler ekranından elle açarsa oradaki akış tekrar dener
      // (ve gerekirse "Ayarları Aç" yönlendirmesi gösterir).
      await Promise.all([
        storage.setString(NOTIF_KEY, "0"),
        storage.setString(DAILY_VERSE_KEY, "0"),
      ]);
      return;
    }
    try {
      const times = await fetchPrayerTimes(lat, lng);
      if (!times) return; // ağ hatası — anahtar yazılmadı, bir sonraki açılışta tekrar denenir
      await applyNotifications({ times, prayer: true, dailyVerse: true });
      await Promise.all([
        storage.setString(NOTIF_KEY, "1"),
        storage.setString(DAILY_VERSE_KEY, "1"),
        storage.setString(SCHED_DAY_KEY, localDayStr()),
      ]);
    } catch { /* sessiz — bir sonraki açılışta tekrar denenir */ }
    return;
  }

  const prayerOn = pvRaw === "1";
  const dailyOn  = dvRaw === "1";
  if (!prayerOn && !dailyOn) return;

  const today = localDayStr();
  const lastDay = await storage.getString(SCHED_DAY_KEY);
  if (lastDay === today) return;

  try {
    const { lat, lng } = await getLocationSilent();
    const times = await fetchPrayerTimes(lat, lng);
    if (!times) return;
    await applyNotifications({ times, prayer: prayerOn, dailyVerse: dailyOn });
    await storage.setString(SCHED_DAY_KEY, today);
  } catch { /* sessiz — eldeki planlama korunur, bir sonraki açılışta tekrar denenir */ }
}
