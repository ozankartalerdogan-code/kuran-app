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
// Gün + dil + saat dilimi + tam-zamanlı alarm izni: biri değişince (yolculuk, dil
// tercihi, "Alarmlar ve hatırlatıcılar" izni) ilk açılışta yeniden planlanır.
// İzin sonradan verilirse eski (ertelenebilir) alarmlar böylece tam zamanlıya döner.
export const schedStamp = () =>
  `${localDayStr()}|${getLang()}|${deviceTimeZone()}|${canScheduleExactAlarms() === false ? "inexact" : "exact"}`;

const ISTANBUL_FALLBACK = { lat: 41.0082, lng: 28.9784 };

// Başarılı her konum çözümü buraya yazılır. Canlı konum alınamadığında (özellikle
// ARKA PLAN görevi: yalnız-ön-plan izinle GPS çağrısı başarısız olur) İstanbul'a
// düşmeden önce kullanıcının son bilinen konumu kullanılır.
const LAST_COORDS_KEY = "lastKnownCoords";

type Coords = { lat: number; lng: number };

function rememberCoords(c: Coords): void {
  storage.setJSON(LAST_COORDS_KEY, c).catch(() => {});
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

// İzin İSTEYEREK konum getirir — yalnız ilk-hiç-açılış otomatik-etkinleştirmesinde
// kullanılır (kullanıcı henüz hiçbir yerde karar vermemişse gerçek OS izin
// penceresini açar). Reddedilirse/hata olursa sessizce İstanbul'a düşer.
async function getLocationRequesting(): Promise<Coords> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
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

  const { status } = await Notifications.requestPermissionsAsync();
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

// Bugünden itibaren SCHEDULE_DAYS günün vakitlerini getirir. Takvim ucu
// başarısız olursa tek günlük uca düşer (eski davranış, en azından bugün doğru).
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

  // Pencere ay sınırını aşabilir → gereken her ay için tek takvim isteği.
  const months = new Map<string, { year: number; month: number }>();
  for (const d of wanted) {
    months.set(`${d.getFullYear()}-${d.getMonth() + 1}`, { year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const calendars = await Promise.all(
    [...months.values()].map(({ year, month }) => fetchMonthCalendar(lat, lng, year, month))
  );
  const byDate = new Map<string, PrayerTimes>();
  for (const cal of calendars) {
    if (cal) for (const [k, v] of cal) byDate.set(k, v);
  }

  const days: DayTimes[] = [];
  for (const d of wanted) {
    const times = byDate.get(ddmmyyyy(d));
    if (times) days.push({ date: d, times });
  }
  if (days.length > 0) return days;

  // Takvim alınamadı → tek günlük yedek.
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
async function schedulePrayerNotifications(days: DayTimes[]): Promise<void> {
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
  const jobs: Promise<string>[] = [];
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
        Notifications.scheduleNotificationAsync({
          content: {
            // Güneş namaz vakti değil: "namaza hazırlanın" yerine sabah vaktinin çıktığını söyle.
            title: key === "Sunrise" ? ns.sunriseTitle : fmt(ns.prayerTitle, { label }),
            body:  `${key === "Sunrise" ? ns.sunriseBody : fmt(ns.prayerBody, { label })}${verseLine}`,
            sound: true,
            data:  { route: "/namaz" },
          },
          trigger,
        })
      );
    }
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

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Günde 2 bildirim: Günün Ayeti + Günün Duası, o günün namaz boşluk saatlerine.
// 7 günün her biri için O GÜNÜN içeriğiyle ayrı DATE bildirimi kurulur (/daily?date=).
// Eskiden DAILY tetikleyici bugünün içeriğini uygulama açılana dek her gün tekrarlıyordu.
// Sunucu date parametresini tanımıyorsa (hepsi aynı gelir) veya istekler düşerse eski
// DAILY yoluna dönülür. Toplam: 42 namaz + 14 = 56 < iOS 64 sınırı.
async function scheduleDailyVerseNotifications(days: DayTimes[]): Promise<void> {
  const perDay = await Promise.all(days.map((d) => api.daily.forDate(ymd(d.date)).catch(() => null)));
  const keys = perDay.map((x) => x?.verse?.verse_key ?? null);
  const usable = perDay.every((x) => !!x) && new Set(keys).size > 1;
  if (!usable) return scheduleDailyVerseRepeating(days[0].times);

  const ns = getStrings(notifStrings);
  const jobs: Promise<string>[] = [];
  days.forEach(({ date, times }, i) => {
    const daily = perDay[i]!;
    const slots = computeGapSlots(times);
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
        Notifications.scheduleNotificationAsync({
          content: {
            title: x.title,
            body:  `${body.slice(0, 150)}${body.length > 150 ? "…" : ""}`,
            sound: true,
            data:  { route: `/ayah/${x.v.surah_id}/${x.v.ayah_number}` },
          },
          trigger,
        })
      );
    }
  });
  await Promise.all(jobs);
}

// Yedek: bugünün içeriği DAILY tetikleyiciyle (eski davranış).
async function scheduleDailyVerseRepeating(times: PrayerTimes): Promise<void> {
  const daily = await api.daily.get().catch(() => null);
  if (!daily) return;
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
// Namaz bildirimleri 7 günün gerçek vakitlerine (DATE), günlük ayet/dua bugünün
// boşluk saatlerine (DAILY) kurulur.
export async function applyNotifications(opts: {
  days: DayTimes[];
  prayer: boolean;
  dailyVerse: boolean;
}): Promise<void> {
  if (opts.days.length === 0) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureAndroidChannel();
  if (opts.prayer) await schedulePrayerNotifications(opts.days);
  if (opts.dailyVerse) await scheduleDailyVerseNotifications(opts.days);
}

// Bildirimleri kapat
export async function cancelNamazNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Onboarding ilk-kurulum akışı ─────────────────────────────────────────────
// "Namaz vakitlerini hatırlatalım mı?" sorusuna EVET: izinleri bağlam içinde
// ister, 7 günü planlar. Dönüş:
//  - "enabled": bildirimler kuruldu (tercihler açık yazıldı)
//  - "denied":  bildirim izni reddedildi (tercihler kapalı yazıldı — tekrar sorulmaz;
//               Bildirimler ekranından elle açılabilir)
//  - "error":   ağ vb. hata — tercih YAZILMAZ, sonraki açılışta otomatik tekrar denenir
export async function enablePrayerNotificationsFirstRun(): Promise<"enabled" | "denied" | "error"> {
  const notifGranted = await requestNotificationPermission();
  // Konum bildirimden BAĞIMSIZ istenir — namaz vakitleri ve kıble için de gerekli;
  // reddedilirse İstanbul'a düşülür.
  const { lat, lng } = await getLocationRequesting();
  if (!notifGranted) {
    await Promise.all([
      storage.setString(NOTIF_KEY, "0"),
      storage.setString(DAILY_VERSE_KEY, "0"),
    ]);
    return "denied";
  }
  try {
    const days = await fetchPrayerDays(lat, lng);
    if (!days) return "error";
    await applyNotifications({ days, prayer: true, dailyVerse: true });
    await Promise.all([
      storage.setString(NOTIF_KEY, "1"),
      storage.setString(DAILY_VERSE_KEY, "1"),
      storage.setString(SCHED_DAY_KEY, schedStamp()),
    ]);
    return "enabled";
  } catch {
    return "error";
  }
}

// Onboarding "Şimdi değil": tercihleri kapalı yaz — ilk-kurulum dalı bir daha
// otomatik istemez; kullanıcı Bildirimler ekranından her zaman açabilir.
export async function declinePrayerNotifications(): Promise<void> {
  await Promise.all([
    storage.setString(NOTIF_KEY, "0"),
    storage.setString(DAILY_VERSE_KEY, "0"),
  ]);
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
// Eşzamanlı çağrıları SERİLEŞTİR: _layout mount + AppState "active" neredeyse
// aynı anda tetikliyor → iki applyNotifications yarışıp (biri cancelAll yaparken
// diğeri henüz schedule etmemişse) ÇİFT bildirim planlanıyordu. In-flight promise
// paylaşımıyla ikinci çağrı birincinin sonucunu bekler (ikinci applyNotifications
// çalışmaz); birinci SCHED_DAY_KEY'i yazınca sonraki açılışlar zaten erken döner.
let freshInFlight: Promise<void> | null = null;

// interactive:false → arka plan görevinden çağrı; OS izin pencereleri AÇILAMAZ,
// bu yüzden ilk-kurulum (izin isteyen) dal atlanır, yalnız mevcut planlama tazelenir.
export function ensureNotificationsFresh(opts?: { interactive?: boolean }): Promise<void> {
  if (freshInFlight) return freshInFlight;
  freshInFlight = ensureNotificationsFreshInner(opts?.interactive ?? true)
    .finally(() => { freshInFlight = null; });
  return freshInFlight;
}

async function ensureNotificationsFreshInner(interactive: boolean): Promise<void> {
  const [pvRaw, dvRaw] = await Promise.all([
    storage.getString(NOTIF_KEY),
    storage.getString(DAILY_VERSE_KEY),
  ]);

  if (pvRaw === null && dvRaw === null) {
    // İlk kurulum izin pencereleri gerektirir — arka planda yapılamaz, gerçek
    // bir uygulama açılışını bekle.
    if (!interactive) return;
    // Onboarding tamamlanmadıysa izinleri BURADA isteme — soru onboarding'de
    // bağlam içinde soruluyor ("Namaz vakitlerini hatırlatalım mı?") ve tercihi
    // o akış yazıyor. Bu dal yalnız onboarding bitmiş ama tercih yazılamamışsa
    // (ör. o sırada ağ hatası) devreye giren tekrar-deneme yoludur.
    const onboarded = await storage.getString(STORAGE_KEYS.onboarding);
    if (onboarded !== "1") return;
    await enablePrayerNotificationsFirstRun();
    return;
  }

  const prayerOn = pvRaw === "1";
  const dailyOn  = dvRaw === "1";
  if (!prayerOn && !dailyOn) return;

  // Damga gün + arayüz dili: sistem dili değişince ("otomatik" tercih) ilk açılışta
  // bildirimler yeni dilde yeniden planlanır.
  const today = schedStamp();
  const lastDay = await storage.getString(SCHED_DAY_KEY);
  if (lastDay === today) return;

  try {
    const { lat, lng } = await getLocationSilent();
    const days = await fetchPrayerDays(lat, lng);
    if (!days) return;
    await applyNotifications({ days, prayer: prayerOn, dailyVerse: dailyOn });
    await storage.setString(SCHED_DAY_KEY, today);
  } catch { /* sessiz — eldeki planlama korunur, bir sonraki açılışta tekrar denenir */ }
}

// Dil değişince planlı bildirim metinleri eski dilde kalır: yalnız bildirimler
// zaten yapılandırılmışsa günlük "taze" damgasını silip yeniden planlatır.
export async function rescheduleNotificationsForLanguageChange(): Promise<void> {
  const [pvRaw, dvRaw] = await Promise.all([
    storage.getString(NOTIF_KEY),
    storage.getString(DAILY_VERSE_KEY),
  ]);
  if (pvRaw !== "1" && dvRaw !== "1") return;
  await storage.remove(SCHED_DAY_KEY);
  await ensureNotificationsFresh();
}
