import { SerialQueue, settleJobs } from "./serialQueue";
import { PLAN_CACHE_KEY, readNotificationPlan, readNotificationRollback, shouldRefreshNotifications } from "./notificationRecovery";
import { withOverlayBusy } from "../tour/overlayBusy";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { api } from "./api";
import { storage, STORAGE_KEYS } from "./storage";
import { localizedMeal } from "./englishMeal";
import { getStrings, fmt, getLang } from "../i18n";
import notifStrings from "../i18n/strings/notifications";
import prayerNameStrings from "../i18n/strings/prayerNames";
import { aladhanTzParam, deviceTimeZone } from "./timeZone";
import { adjustHighLatitude, aladhanMethodQuery, localYMD } from "./prayerMethod";
import { getDiyanetDays, getManualCity, prayerCityStampPart } from "./diyanetPrayer";
import { deviceOffsetMin, diyanetDeps, localYmdStr } from "./diyanetPrayerDeps";
import { dedupeVerses, pickFromPool } from "./notifVersePick";
import { canScheduleExactAlarms } from "../../modules/exact-alarm";

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
// Gün + dil + saat dilimi + tam-zamanlı alarm izni + şehir: biri değişince (yolculuk,
// dil tercihi, "Alarmlar ve hatırlatıcılar" izni, elle/otomatik şehir değişimi) ilk
// açılışta yeniden planlanır. İzin sonradan verilirse eski (ertelenebilir) alarmlar
// böylece tam zamanlıya döner.
export const schedStamp = () =>
  `${localDayStr()}|${getLang()}|${deviceTimeZone()}|${canScheduleExactAlarms() === false ? "inexact" : "exact"}`;
const fullSchedStamp = async () =>
  `${schedStamp()}|${await prayerCityStampPart(diyanetDeps()).catch(() => "-")}`;

const ISTANBUL_FALLBACK = { lat: 41.0082, lng: 28.9784 };

// Başarılı her konum çözümü buraya yazılır. Canlı konum alınamadığında (özellikle
// ARKA PLAN görevi: yalnız-ön-plan izinle GPS çağrısı başarısız olur) İstanbul'a
// düşmeden önce kullanıcının son bilinen konumu kullanılır.
const LAST_COORDS_KEY = "lastKnownCoords";

type Coords = { lat: number; lng: number };

export function rememberCoords(c: Coords): void {
  storage.setJSON(LAST_COORDS_KEY, c).catch(() => {});
}

// Son kaydedilen konum (yoksa null) — kıble ekranının anında açılması için.
export async function getSavedCoords(): Promise<Coords | null> {
  try {
    const saved = await storage.getJSON<Coords>(LAST_COORDS_KEY);
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") return saved;
  } catch { /* okunamadı */ }
  return null;
}

async function savedCoordsOrIstanbul(): Promise<Coords> {
  try {
    const saved = await storage.getJSON<Coords>(LAST_COORDS_KEY);
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") return saved;
  } catch { /* okunamadı — İstanbul'a düş */ }
  return ISTANBUL_FALLBACK;
}

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// İzin SORMADAN mevcut izni okuyarak konum getirir (sessiz arka plan yenilemesi için).
async function getLocationSilent(): Promise<Coords> {
  const manual = await getManualCity(diyanetDeps());
  if (manual !== null) return { lat: manual.lat, lng: manual.lon };
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return savedCoordsOrIstanbul();
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return savedCoordsOrIstanbul();
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    rememberCoords(c);
    return c;
  } catch {
    return savedCoordsOrIstanbul();
  }
}

// Konum izni yalnız kullanıcının başlattığı bildirim kurulumunda istenir.
// Reddedilirse/hata olursa İstanbul kullanılır.
async function getLocationRequesting(): Promise<Coords> {
  const manual = await getManualCity(diyanetDeps());
  if (manual !== null) return { lat: manual.lat, lng: manual.lon };
  try {
    const { status } = await withOverlayBusy(() => Location.requestForegroundPermissionsAsync());
    if (status !== "granted") return ISTANBUL_FALLBACK;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return ISTANBUL_FALLBACK;
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    rememberCoords(c);
    return c;
  } catch {
    return ISTANBUL_FALLBACK;
  }
}

// İzin iste
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  // Android 13 (API 33) öncesinde POST_NOTIFICATIONS çalışma zamanı izni yok,
  // ama kullanıcı bildirimleri sistem ayarlarından kapatmış olabilir. Eskiden
  // burada doğrudan true dönülüyordu — bu, kapalı bildirimi "açık" gösterip
  // hiç ulaşmayan bildirimlere yol açıyordu. getPermissionsAsync/requestPermissionsAsync
  // Android'de her sürümde NotificationManagerCompat.areNotificationsEnabled()
  // tabanlı gerçek durumu okur; API 33 altında requestPermissionsAsync sistem
  // diyaloğu göstermeden aynı gerçek durumu döner.
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await withOverlayBusy(() => Notifications.requestPermissionsAsync());
  return status === "granted";
}

// Bir güne ait vakitler + o günün takvim tarihi (çok-günlü planlama için).
export type DayTimes = { date: Date; times: PrayerTimes };

// Kaç gün ileriye planlanır. 6 vakit × 7 gün + 2 günlük ayet/dua = 44 bildirim —
// iOS'un 64 planlı bildirim limitinin altında. Eskiden DAILY tetikleyici tek
// güne kuruluyordu; uygulama günlerce açılmazsa vakitler (gün be gün kayar)
// 10+ dk şaşabiliyordu. Şimdi 7 günün GERÇEK vakitleri ayrı ayrı planlanır.
const SCHEDULE_DAYS = 7;

// Aladhan takvim yanıtındaki saatler "05:03 (+03)" biçiminde gelebilir → "05:03"e indir.
function sanitizeTimes(raw: Record<string, string>): PrayerTimes {
  const out: PrayerTimes = {};
  for (const [k, v] of Object.entries(raw)) {
    const m = typeof v === "string" ? v.match(/^(\d{1,2}:\d{2})/) : null;
    if (m) out[k] = m[1];
  }
  return out;
}

// Aladhan takvim ucundan bir ayın tüm günlerini çek (tek istek/ay).
async function fetchMonthCalendar(
  lat: number,
  lng: number,
  year: number,
  month: number, // 1-12
): Promise<Map<string, PrayerTimes> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      // Yöntem/ikindi/temkin: prayerMethod.ts (Türkiye method=13, yurt dışı Diyanet'e yakın kural)
      `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&${aladhanMethodQuery(deviceTimeZone())}&${aladhanTzParam()}`,
      { headers: { "Accept": "application/json" }, signal: controller.signal }
    );
    const data = await res.json();
    if (!Array.isArray(data?.data)) return null;
    const tz = deviceTimeZone();
    const map = new Map<string, PrayerTimes>();
    for (const day of data.data) {
      const gDate = day?.date?.gregorian?.date; // "DD-MM-YYYY"
      if (typeof gDate === "string" && day?.timings) {
        const [d, m, y] = gDate.split("-").map(Number);
        map.set(gDate, adjustHighLatitude(sanitizeTimes(day.timings), lat, { year: y, month: m, day: d }, tz));
      }
    }
    return map;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function ddmmyyyy(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

// Bugünden itibaren SCHEDULE_DAYS günün vakitlerini getirir. ÖNCE kendi
// sunucumuzdaki Diyanet vakitleri denenir; eksik kalan günler için mevcut
// Aladhan takvim yolu (yalnız o aylar) kullanılır. Hiç gün çözülemezse eski
// davranış: takvim → tek günlük yedek.
export async function fetchPrayerDays(
  lat: number,
  lng: number,
): Promise<DayTimes[] | null> {
  const today = new Date();
  const wanted: Date[] = Array.from({ length: SCHEDULE_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const wantedYmd = wanted.map(localYmdStr);

  const diyanet = await getDiyanetDays(
    lat,
    lng,
    deviceOffsetMin(),
    wantedYmd,
    diyanetDeps(),
  );

  const missing = wanted.filter((_, i) => !diyanet.has(wantedYmd[i]));
  const aladhan = new Map<string, PrayerTimes>();
  if (missing.length > 0) {
    // Pencere ay sınırını aşabilir → yalnız eksik günlerin ayları için istek.
    const months = new Map<string, { year: number; month: number }>();
    for (const d of missing) {
      months.set(`${d.getFullYear()}-${d.getMonth() + 1}`, {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }
    const calendars = await Promise.all(
      [...months.values()].map(({ year, month }) => fetchMonthCalendar(lat, lng, year, month))
    );
    for (const cal of calendars) {
      if (cal) for (const [k, v] of cal) aladhan.set(k, v);
    }
  }

  const days: DayTimes[] = [];
  wanted.forEach((d, i) => {
    const times = diyanet.get(wantedYmd[i])?.times ?? aladhan.get(ddmmyyyy(d));
    if (times) days.push({ date: d, times });
  });
  if (days.length > 0) return days;

  // Hiç gün çözülemedi → tek günlük yedek (eski davranış, en azından bugün doğru).
  const single = await fetchPrayerTimes(lat, lng);
  return single ? [{ date: today, times: single }] : null;
}

// Aladhan API'den namaz vakitlerini al (tek gün — yedek yol ve ana sayfa kullanımı)
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
      // Yöntem/ikindi/temkin: prayerMethod.ts (Türkiye method=13, yurt dışı Diyanet'e yakın kural)
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&${aladhanMethodQuery(deviceTimeZone())}&${aladhanTzParam()}`,
      { headers: { "Accept": "application/json" }, signal: controller.signal }
    );
    const data = await res.json();
    const timings = data?.data?.timings;
    return timings ? adjustHighLatitude(timings, lat, localYMD(today), deviceTimeZone()) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Vakit başlangıcından kaç dakika SONRA tek bildirim gider (hatırlatma +
// namaz-taglı ayet birlikte). Bilerek "önce" değil "sonra": "5 dk kaldı" gibi
// bir metin, cihaz Doze/pil optimizasyonuyla bildirimi geç teslim ederse
// (vakit çoktan geçmişken hâlâ "yaklaşıyor" der) yanlış görünüyordu. "X vakti
// girdi" ifadesi zamanında da gelse geç de gelse hep doğru okunur.
const NOTIFY_AFTER_MIN = 2;

// Android 8+ bildirim kanalları — yüksek öncelik (heads-up + ses). Olmadan bildirimler
// varsayılan kanalda sessiz/önemsiz görünebilir. İKİ AYRI kanal: kullanıcı Android
// sistem ayarlarından (bildirime uzun bas → kanal ayarları) namaz ve günlük ayet
// bildirimlerini birbirinden bağımsız susturabilsin — tek kanalda bu mümkün değildi.
const ANDROID_CHANNEL_ID_PRAYER = "namaz-vakitleri";
const ANDROID_CHANNEL_ID_DAILY  = "gunun-ayeti";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID_PRAYER, {
    name:             getStrings(notifStrings).channelPrayer,
    importance:       Notifications.AndroidImportance.HIGH,
    // sound belirtilmez → kanal sistem varsayılan bildirim sesini kullanır.
    // Not: string "default" verilirse expo-notifications onu ÖZEL ses dosyası
    // adı sanıp ("Custom sound 'default' not found") hata basıyordu.
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#059669",
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID_DAILY, {
    name:             getStrings(notifStrings).channelDaily,
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

// Belirli bir takvim günü + saat için, offsetMin dakika sonrasına tek seferlik
// DATE tetikleyicisi. Geçmişte kalmışsa null (planlanmaz) — ör. uygulama
// vaktin +NOTIFY_AFTER_MIN'inden sonra açılıp yeniden planlama yapılırsa
// bugünkü bu bildirim atlanır, yarınkinden devam eder.
function dateTriggerAfter(day: Date, hour: number, minute: number, offsetMin: number, channelId: string) {
  const at = new Date(day);
  at.setHours(hour, minute + offsetMin, 0, 0);
  if (at.getTime() <= Date.now()) return null;
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: at,
    channelId, // iOS'ta yok sayılır
  } as const;
}

// Günlük namaz bildirimlerini planla. Her vakit için TEK bildirim (vakit
// girdikten NOTIFY_AFTER_MIN dk sonra): hatırlatma + namaz-taglı ayet meali
// birlikte (her yeniden planlamada rastgele → dinamik).
type ValidVakit = { key: string; label: string; hour: number; minute: number };

function parseValid(times: PrayerTimes): ValidVakit[] {
  const valid: ValidVakit[] = [];
  const names = getStrings(prayerNameStrings) as unknown as Record<string, string>;
  for (const { key, label: trLabel } of VAKITLER) {
    const label = names[key] ?? trLabel;
    const timeStr = times[key];
    if (!timeStr) continue;
    const [hour, minute] = timeStr.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
    valid.push({ key, label, hour, minute });
  }
  return valid;
}

// Namaz vakti bildirimleri: her gün × her vakit için TEK bildirim (hatırlatma +
// namaz-taglı ayet), o günün GERÇEK vaktine göre DATE tetikleyicisiyle.
async function buildPrayerNotifications(days: DayTimes[]): Promise<Notifications.NotificationRequestInput[]> {
  // Namaz-taglı ayet HAVUZLARI — paralel çekilir, gün × vakit başına sırayla dağıtılır.
  // Eskiden vakit başına tek ayet 7 günün hepsinde tekrarlanıyordu (ör. Öğle her gün aynı).
  // Sunucu "sabah" ve "cuma" için özel etiket havuzu kullanır; diğerleri genel 'namaz' havuzu.
  const fetchPool = (vakit: string, n: number) =>
    Promise.all(Array.from({ length: n }, () => api.notifications.namazVerse(vakit).catch(() => null)))
      .then((list) => dedupeVerses(list));
  const [sabahPool, cumaPool, genelPool] = await Promise.all([
    fetchPool("sabah", SCHEDULE_DAYS),
    fetchPool("cuma", 2),
    fetchPool("namaz", 12),
  ]);
  const OTHER_KEYS = VAKITLER.map(({ key }) => key).filter((k) => k !== "Fajr");

  const ns = getStrings(notifStrings);
  const jobs: Notifications.NotificationRequestInput[] = [];
  days.forEach(({ date, times }, dayIndex) => {
    for (const { key, label, hour, minute } of parseValid(times)) {
      const trigger = dateTriggerAfter(date, hour, minute, NOTIFY_AFTER_MIN, ANDROID_CHANNEL_ID_PRAYER);
      if (!trigger) continue; // bugünün geçmiş vakitleri
      const v =
        key === "Fajr" ? pickFromPool(sabahPool, dayIndex, 0, 1) ?? pickFromPool(genelPool, dayIndex, 0, OTHER_KEYS.length)
        : key === "Dhuhr" && date.getDay() === 5 && cumaPool.length > 0 ? pickFromPool(cumaPool, dayIndex, 0, 1)
        : pickFromPool(genelPool, dayIndex, OTHER_KEYS.indexOf(key), OTHER_KEYS.length);
      // EN modda Pickthall (yoksa Türkçe yedek), TR'de sunucu meali.
      const translation = v?.translation ? localizedMeal({ surah: v.surah_id, ayah: v.ayah_number }, v.translation) : null;
      const verseLine = translation
        ? `\n\n📖 ${translation.slice(0, 150)}${translation.length > 150 ? "…" : ""}`
        : "";
      jobs.push(
        {
          content: {
            // Güneş namaz vakti değil: "namaza hazırlanın" yerine sabah vaktinin çıktığını söyle.
            title: key === "Sunrise" ? ns.sunriseTitle : fmt(ns.prayerTitle, { label }),
            body:  `${key === "Sunrise" ? ns.sunriseBody : fmt(ns.prayerBody, { label })}${verseLine}`,
            sound: true,
            data:  { route: "/namaz" },
          },
          trigger,
        }
      );
    }
  });
  return jobs;
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

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Günde 2 bildirim: Günün Ayeti + Günün Duası, o günün namaz boşluk saatlerine.
// 7 günün her biri için O GÜNÜN içeriğiyle ayrı DATE bildirimi kurulur (/daily?date=).
// Eskiden DAILY tetikleyici bugünün içeriğini uygulama açılana dek her gün tekrarlıyordu.
// Sunucu date parametresini tanımıyorsa (hepsi aynı gelir) veya istekler düşerse eski
// DAILY yoluna dönülür. Toplam: 42 namaz + 14 = 56 < iOS 64 sınırı.
async function buildDailyVerseNotifications(days: DayTimes[]): Promise<Notifications.NotificationRequestInput[]> {
  const perDay = await Promise.all(days.map((d) => api.daily.forDate(ymd(d.date)).catch(() => null)));
  const keys = perDay.map((x) => x?.verse?.verse_key ?? null);
  const usable = perDay.every((x) => !!x) && new Set(keys).size > 1;
  if (!usable) return buildDailyVerseRepeating(days[0].times);

  const ns = getStrings(notifStrings);
  const jobs: Notifications.NotificationRequestInput[] = [];
  days.forEach(({ date, times }, i) => {
    const daily = perDay[i]!;
    const slots = computeGapSlots(times);
    if (!daily.verse?.meal || !daily.dua?.meal) throw new Error("daily-content-incomplete");
    const items = [
      daily.verse?.meal ? { title: ns.dailyVerse, v: daily.verse, slot: slots[0] } : null,
      daily.dua?.meal ? { title: ns.dailyDua, v: daily.dua, slot: slots[1] } : null,
    ];
    for (const x of items) {
      if (!x || !x.slot) continue;
      const trigger = dateTriggerAfter(date, x.slot.hour, x.slot.minute, 0, ANDROID_CHANNEL_ID_DAILY);
      if (!trigger) continue;
      const body = localizedMeal({ surah: x.v.surah_id, ayah: x.v.ayah_number }, x.v.meal!);
      jobs.push(
        {
          content: {
            title: x.title,
            body:  `${body.slice(0, 150)}${body.length > 150 ? "…" : ""}`,
            sound: true,
            data:  { route: `/ayah/${x.v.surah_id}/${x.v.ayah_number}` },
          },
          trigger,
        }
      );
    }
  });
  return jobs;
}

// Yedek: bugünün içeriği DAILY tetikleyiciyle (eski davranış).
async function buildDailyVerseRepeating(times: PrayerTimes): Promise<Notifications.NotificationRequestInput[]> {
  const daily = await api.daily.get().catch(() => null);
  if (!daily) throw new Error("daily-content-unavailable");
  const slots = computeGapSlots(times);
  const ns = getStrings(notifStrings);
  const items = [
    daily.verse?.meal
      ? { title: ns.dailyVerse, body: localizedMeal({ surah: daily.verse.surah_id, ayah: daily.verse.ayah_number }, daily.verse.meal), sid: daily.verse.surah_id, an: daily.verse.ayah_number, slot: slots[0] }
      : null,
    daily.dua?.meal
      ? { title: ns.dailyDua, body: localizedMeal({ surah: daily.dua.surah_id, ayah: daily.dua.ayah_number }, daily.dua.meal), sid: daily.dua.surah_id, an: daily.dua.ayah_number, slot: slots[1] }
      : null,
  ].filter((x): x is NonNullable<typeof x> => !!x && !!x.slot);

  if (items.length !== 2) throw new Error("daily-content-incomplete");
  const jobs: Notifications.NotificationRequestInput[] = items.map((x) =>
    ({
      content: {
        title: x.title,
        body:  `${x.body.slice(0, 150)}${x.body.length > 150 ? "…" : ""}`,
        sound: true,
        data:  { route: `/ayah/${x.sid}/${x.an}` },
      },
      trigger: dailyTriggerBefore(x.slot.hour, x.slot.minute, 0, ANDROID_CHANNEL_ID_DAILY),
    })
  );
  return jobs;
}

// Bütün tercih, planlama, iptal ve damga işlemleri tek sıradan geçer.
const notificationQueue = new SerialQueue();
let coldStartPending = true;
type PlanOptions = { days: DayTimes[]; prayer: boolean; dailyVerse: boolean };
async function applyNotificationsInner(opts: PlanOptions, cachedRequests?: Notifications.NotificationRequestInput[]): Promise<void> {
  if ((opts.prayer || opts.dailyVerse) && opts.days.length === 0) throw new Error("no-times");
  await storage.remove(SCHED_DAY_KEY);
  // İçerik ve kanal hazırlığı başarısızsa mevcut plan henüz silinmemiştir.
  const requests: Notifications.NotificationRequestInput[] = cachedRequests ?? [];
  if (!cachedRequests && opts.prayer) requests.push(...await buildPrayerNotifications(opts.days));
  if (!cachedRequests && opts.dailyVerse) requests.push(...await buildDailyVerseNotifications(opts.days));
  if (requests.length) await ensureAndroidChannel();
  const rollback = (opts.prayer || opts.dailyVerse)
    ? readNotificationRollback(await storage.getString(PLAN_CACHE_KEY).catch(() => null), opts.prayer, opts.dailyVerse)
    : [];
  await Notifications.cancelAllScheduledNotificationsAsync();
  try {
    await settleJobs(requests.map(request => Notifications.scheduleNotificationAsync(request)));
  } catch (error) {
    // Yarım plan bir sonraki denemede çift bildirim oluşturmamalı.
    await Notifications.cancelAllScheduledNotificationsAsync();
    await settleJobs(rollback.map(request => Notifications.scheduleNotificationAsync(request)));
    throw error;
  }
  if ((opts.prayer || opts.dailyVerse) && !cachedRequests) {
    // Yalnız başarıyla kurulmuş plan saklanır; önbellek hatası çalışan planı bozmaz.
    await storage.setJSON(PLAN_CACHE_KEY, { version: 1, stamp: await fullSchedStamp(), ...opts, requests }).catch(() => {});
  }
}
export function applyNotifications(opts: PlanOptions): Promise<void> {
  return notificationQueue.run(() => applyNotificationsInner(opts));
}
export function cancelNamazNotifications(): Promise<void> {
  return notificationQueue.run(() => applyNotificationsInner({ days: [], prayer: false, dailyVerse: false }));
}

// Ayar ekranının kararı kuyruğa giriş sırasıyla kaydedilir; ağ hatası tercihi geri almaz.
export function changeNotificationPreference(
  key: typeof NOTIF_KEY | typeof DAILY_VERSE_KEY, enabled: boolean,
  permission: () => Promise<boolean>,
  location: () => Promise<Coords & { isFallback: boolean }>,
): Promise<{ granted: boolean; isFallback: boolean }> {
  return notificationQueue.run(async () => {
    if (enabled && !(await permission())) return { granted: false, isFallback: false };
    await storage.setString(key, enabled ? "1" : "0");
    await storage.remove(SCHED_DAY_KEY);
    const [pv, dv] = await Promise.all([storage.getString(NOTIF_KEY), storage.getString(DAILY_VERSE_KEY)]);
    if (pv !== "1" && dv !== "1") {
      await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false });
      return { granted: true, isFallback: false };
    }
    // Kapatılan tür ağdan bağımsız iptal edilir; diğer türün mevcut planı korunur.
    if (!enabled) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await settleJobs(scheduled.filter(request => {
        const prayer = request.content.data?.route === "/namaz";
        return key === NOTIF_KEY ? prayer : !prayer;
      }).map(request => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    }
    const coords = await location();
    const days = await fetchPrayerDays(coords.lat, coords.lng);
    if (!days?.length) throw new Error("no-times");
    await applyNotificationsInner({ days, prayer: pv === "1", dailyVerse: dv === "1" });
    await storage.setString(SCHED_DAY_KEY, await fullSchedStamp());
    return { granted: true, isFallback: coords.isFallback };
  });
}

type FirstRunResult = "enabled" | "denied" | "error";
async function enablePrayerNotificationsFirstRunInner(): Promise<FirstRunResult> {
  const granted = await requestNotificationPermission();
  await Promise.all([
    storage.setString(NOTIF_KEY, granted ? "1" : "0"),
    storage.setString(DAILY_VERSE_KEY, granted ? "1" : "0"),
  ]);
  await storage.remove(SCHED_DAY_KEY);
  if (!granted) {
    await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false });
    return "denied";
  }
  const { lat, lng } = await getLocationRequesting();
  try {
    const days = await fetchPrayerDays(lat, lng);
    if (!days?.length) return "error";
    await applyNotificationsInner({ days, prayer: true, dailyVerse: true });
    await storage.setString(SCHED_DAY_KEY, await fullSchedStamp());
    return "enabled";
  } catch { return "error"; }
}
export function enablePrayerNotificationsFirstRun(): Promise<FirstRunResult> {
  return notificationQueue.run(enablePrayerNotificationsFirstRunInner);
}
export function declinePrayerNotifications(): Promise<void> {
  return notificationQueue.run(async () => {
    await Promise.all([storage.setString(NOTIF_KEY, "0"), storage.setString(DAILY_VERSE_KEY, "0")]);
    await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false });
  });
}

// Yenileme tercihi sıradaki işi başladığında okur; eski bir snapshot son kararı ezmez.
// interactive:false (arka plan görevi) izin penceresi açamaz; ilk kurulum dalı atlanır.
export function ensureNotificationsFresh(opts?: { interactive?: boolean }): Promise<void> {
  return notificationQueue.run(async () => {
    const interactive = opts?.interactive ?? true;
    const coldStart = interactive && coldStartPending;
    if (interactive) coldStartPending = false;
    // Açılıştaki ilk render'a fırsat ver; bütün iş yine aynı kuyruğun içindedir.
    if (coldStart) await new Promise<void>(resolve => setTimeout(resolve, 0));
    await ensureNotificationsFreshInner(interactive, coldStart);
  });
}
async function ensureNotificationsFreshInner(interactive = false, coldStart = false): Promise<void> {
  const [pv, dv] = await Promise.all([storage.getString(NOTIF_KEY), storage.getString(DAILY_VERSE_KEY)]);
  if (pv === null && dv === null) {
    // Onboarding bitmiş ama tercih yazılamamışsa (ör. izin sırasında hata) tekrar-deneme yolu;
    // onboarding sürerken izin burada istenmez.
    if (interactive && await storage.getString(STORAGE_KEYS.onboarding) === "1") await enablePrayerNotificationsFirstRunInner();
    return;
  }
  if (pv !== "1" && dv !== "1") {
    if (pv !== null || dv !== null) await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false });
    return;
  }
  const stamp = await fullSchedStamp();
  const savedStamp = await storage.getString(SCHED_DAY_KEY);
  if (!shouldRefreshNotifications(true, coldStart, savedStamp, stamp)) return;
  try {
    // Force-stop AlarmManager'ı boşaltabilir; Expo'nun deposundaki liste kanıt değildir.
    // Başarısız kurtarmada aynı süreçteki sonraki yenileme de tekrar deneyebilsin.
    await storage.remove(SCHED_DAY_KEY);
    const cached = coldStart && savedStamp === stamp
      ? readNotificationPlan(await storage.getString(PLAN_CACHE_KEY).catch(() => null), stamp, pv === "1", dv === "1")
      : null;
    let days = cached?.days;
    if (!days) {
      const { lat, lng } = await getLocationSilent();
      days = await fetchPrayerDays(lat, lng) ?? undefined;
    }
    if (!days?.length) return;
    await applyNotificationsInner({ days, prayer: pv === "1", dailyVerse: dv === "1" }, cached?.requests);
    await storage.setString(SCHED_DAY_KEY, await fullSchedStamp());
  } catch { /* Damga yazılmaz; sonraki yenileme yeniden dener. */ }
}
export function rescheduleNotifications(): Promise<void> {
  return notificationQueue.run(async () => {
    await storage.remove(SCHED_DAY_KEY);
    await ensureNotificationsFreshInner();
  });
}
export function rescheduleNotificationsForLanguageChange(): Promise<void> {
  return rescheduleNotifications();
}
