import { buildPrayerContext, getLocationSilent, rememberCoords, ISTANBUL_FALLBACK } from "./prayerContextDeps";
import type { Coords } from "./prayerContextDeps";
export { getSavedCoords, rememberCoords } from "./prayerContextDeps";
import { SerialQueue, settleJobs } from "./serialQueue";
import { LEGACY_PLAN_CACHE_KEY, PLAN_CACHE_KEY, readNotificationPlan, readNotificationRollback, resolvePlanStamp, shouldRefreshNotifications } from "./notificationRecovery";
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
import { deviceTimeZone } from "./timeZone";
import { formatHmInZone, futureCarry, intlZoneSupported, notificationAtMs } from "./prayerInstant";
import type { PrayerInstants } from "./prayerInstant";
import { getManualCity, prayerCityStampPart } from "./diyanetPrayer";
import { diyanetDeps, localYmdStr } from "./diyanetPrayerDeps";
import { getPrayerDayRepository } from "./prayerDayRepositoryDeps";
import type { PrayerDayRecord } from "./prayerDayRepository";
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
  `${localDayStr()}|${getLang()}|${deviceTimeZone()}|${canScheduleExactAlarms() === false ? "inexact" : "exact"}|t2`;
let activePlan: { base: string; signature: string } | undefined;
const fullSchedStamp = async () => {
  const cityKey = await prayerCityStampPart(diyanetDeps()).catch(() => "-");
  if (cityKey !== "-") activeCityKey = cityKey;
  const base = `${schedStamp()}|${cityKey}`;
  if (activePlan?.base === base) return `${base}|repo2:${activePlan.signature}`;
  const cached = await storage.getJSON<{ version: number; stamp: string }>(PLAN_CACHE_KEY).catch(() => null);
  return cached?.version === 2 && typeof cached.stamp === "string" && cached.stamp.startsWith(`${base}|repo2:`)
    ? cached.stamp : `${base}|repo2:none`;
};

// Hash source/revision before persisting: geo city keys must stay in memory.
function stampForDays(start: string, days: DayTimes[]): string {
  const base = start.split("|repo2:")[0];
  let hash = 2166136261;
  for (const text of days.map(day => `${day.source}:${day.revision}`)) {
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  const sources = [...new Set(days.map(day => day.source ?? "unknown"))].sort().join("+");
  return `${base}|repo2:${sources}:${(hash >>> 0).toString(16)}`;
}

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Konum izni yalnız kullanıcının başlattığı bildirim kurulumunda istenir.
// Reddedilirse/hata olursa İstanbul kullanılır.
async function getLocationRequesting(onPermissionsResolved: () => void): Promise<Coords> {
  const manual = await getManualCity(diyanetDeps());
  if (manual !== null) {
    onPermissionsResolved();
    return { lat: manual.lat, lng: manual.lon };
  }
  try {
    // GPS bekleyişi sayaca dahil, sistem izin penceresi dahil değildir.
    const { status } = await withOverlayBusy(() => Location.requestForegroundPermissionsAsync())
      .finally(onPermissionsResolved);
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
// `at`: vakitlerin mutlak anları; varsa tetikleyiciler cihaz diliminden bağımsız kurulur.
// `carry`: uzak saat diliminde önceki şehir gününden bugüne taşan, hâlâ gelecekteki anlar.
export type DayTimes = {
  date: Date;
  times: PrayerTimes;
  at?: PrayerInstants;
  carry?: Partial<PrayerInstants>;
  source?: PrayerDayRecord["source"];
  revision?: string;
};

// Kaç gün ileriye planlanır. 6 vakit × 7 gün + 2 günlük ayet/dua = 44 bildirim —
// iOS'un 64 planlı bildirim limitinin altında. Eskiden DAILY tetikleyici tek
// güne kuruluyordu; uygulama günlerce açılmazsa vakitler (gün be gün kayar)
// 10+ dk şaşabiliyordu. Şimdi 7 günün GERÇEK vakitleri ayrı ayrı planlanır.
const SCHEDULE_DAYS = 7;


export async function fetchPrayerDays(lat: number, lng: number): Promise<DayTimes[] | null> {
  const context = await buildPrayerContext(lat, lng);
  activeCityKey = context.cityKey;
  subscribeToPrayerRepository();
  const today = new Date(context.nowMs);
  const wanted = Array.from({ length: SCHEDULE_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const previousDay = context.cityTimeZone !== context.deviceTimeZone;
  const prevDate = new Date(today);
  prevDate.setDate(today.getDate() - 1);
  const dates = (previousDay ? [prevDate, ...wanted] : wanted).map(localYmdStr);
  const records = await getPrayerDayRepository().ensureDays(context, dates);
  const days: DayTimes[] = wanted.flatMap(date => {
    const record = records.get(localYmdStr(date));
    if (!record) return [];
    const times = Object.fromEntries(VAKITLER.map(({ key }) => {
      const ms = record.atMs[key as keyof PrayerInstants];
      const local = new Date(ms);
      return [key, intlZoneSupported() ? formatHmInZone(ms, context.deviceTimeZone)
        : `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`];
    }));
    return [{ date, times, at: { ...record.atMs }, source: record.source, revision: record.revision }];
  });
  if (days.length === 0) return null;
  const prev = previousDay ? records.get(localYmdStr(prevDate)) : undefined;
  if (prev) {
    const carry = futureCarry({ ...prev.atMs }, Date.now(), NOTIFY_AFTER_MIN);
    if (Object.keys(carry).length > 0) {
      days[0].carry = carry;
      days[0].revision += `:${prev.source}:${prev.revision}`;
    }
  }
  return days;
}

// One notification two minutes after the prayer starts, including carried instants.
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

// Mutlak andan DATE tetikleyicisi (epoch zaten offset uygulanmış; null = geçmiş).
function dateTriggerAtMs(atMs: number | null, channelId: string) {
  if (atMs === null) return null;
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date(atMs),
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
  const nowMs = Date.now();
  const makePrayerJob = (
    key: string,
    label: string,
    trigger: NonNullable<ReturnType<typeof dateTriggerAtMs>>,
    dayIndex: number,
    friday: boolean,
  ): Notifications.NotificationRequestInput => {
    const v =
      key === "Fajr" ? pickFromPool(sabahPool, dayIndex, 0, 1) ?? pickFromPool(genelPool, dayIndex, 0, OTHER_KEYS.length)
      : key === "Dhuhr" && friday && cumaPool.length > 0 ? pickFromPool(cumaPool, dayIndex, 0, 1)
      : pickFromPool(genelPool, dayIndex, OTHER_KEYS.indexOf(key), OTHER_KEYS.length);
    // EN modda Pickthall (yoksa Türkçe yedek), TR'de sunucu meali.
    const translation = v?.translation ? localizedMeal({ surah: v.surah_id, ayah: v.ayah_number }, v.translation) : null;
    const verseLine = translation
      ? `\n\n📖 ${translation.slice(0, 150)}${translation.length > 150 ? "…" : ""}`
      : "";
    return {
      content: {
        // Güneş namaz vakti değil: "namaza hazırlanın" yerine sabah vaktinin çıktığını söyle.
        title: key === "Sunrise" ? ns.sunriseTitle : fmt(ns.prayerTitle, { label }),
        body:  `${key === "Sunrise" ? ns.sunriseBody : fmt(ns.prayerBody, { label })}${verseLine}`,
        sound: true,
        data:  { route: "/namaz" },
      },
      trigger,
    };
  };

  days.forEach(({ date, times, at }, dayIndex) => {
    for (const { key, label, hour, minute } of parseValid(times)) {
      const instant = at?.[key as keyof PrayerInstants];
      const trigger = typeof instant === "number"
        ? dateTriggerAtMs(notificationAtMs(instant, NOTIFY_AFTER_MIN, nowMs), ANDROID_CHANNEL_ID_PRAYER)
        : dateTriggerAfter(date, hour, minute, NOTIFY_AFTER_MIN, ANDROID_CHANNEL_ID_PRAYER);
      if (!trigger) continue; // bugünün geçmiş vakitleri
      jobs.push(makePrayerJob(key, label, trigger, dayIndex, date.getDay() === 5));
    }
  });

  // İlk günün önceki şehir gününden taşan anları: aynı içerik kuralı, dayIndex 0,
  // cuma kuralı uygulanmaz. Her an için en fazla bir tetikleyici kurulur.
  const carry = days.length > 0 ? days[0].carry : undefined;
  if (carry) {
    for (const { key, label } of parseValid(days[0].times)) {
      const instant = carry[key as keyof PrayerInstants];
      if (typeof instant !== "number") continue;
      const trigger = dateTriggerAtMs(
        notificationAtMs(instant, NOTIFY_AFTER_MIN, nowMs),
        ANDROID_CHANNEL_ID_PRAYER,
      );
      if (!trigger) continue;
      jobs.push(makePrayerJob(key, label, trigger, 0, false));
    }
  }
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
let activeCityKey: string | undefined;
let repositorySubscribed = false;
let upgradePending = false;
function subscribeToPrayerRepository(): void {
  if (repositorySubscribed) return;
  repositorySubscribed = true;
  getPrayerDayRepository().subscribe(event => {
    if (!event.upgradedToDiyanet || event.cityKey !== activeCityKey || upgradePending) return;
    upgradePending = true;
    const cityKey = event.cityKey;
    setTimeout(() => {
      void notificationQueue.run(async () => {
        try {
          const currentCity = await prayerCityStampPart(diyanetDeps());
          if (activeCityKey !== cityKey || (currentCity !== "-" && currentCity !== cityKey)) return;
          await storage.remove(SCHED_DAY_KEY);
          await ensureNotificationsFreshInner();
        } finally { upgradePending = false; }
      }).catch(() => {});
    }, 0);
  });
}
type PlanOptions = { days: DayTimes[]; prayer: boolean; dailyVerse: boolean };
async function applyNotificationsInner(opts: PlanOptions, stamp: string | null, cachedRequests?: Notifications.NotificationRequestInput[]): Promise<void> {
  if ((opts.prayer || opts.dailyVerse) && opts.days.length === 0) throw new Error("no-times");
  await storage.remove(SCHED_DAY_KEY);
  // İçerik ve kanal hazırlığı başarısızsa mevcut plan henüz silinmemiştir.
  const requests: Notifications.NotificationRequestInput[] = cachedRequests ?? [];
  if (!cachedRequests && opts.prayer) requests.push(...await buildPrayerNotifications(opts.days));
  if (!cachedRequests && opts.dailyVerse) requests.push(...await buildDailyVerseNotifications(opts.days));
  if (requests.length) await ensureAndroidChannel();
  const v2 = await storage.getString(PLAN_CACHE_KEY).catch(() => null);
  const restoreSource = v2 ?? await storage.getString(LEGACY_PLAN_CACHE_KEY).catch(() => null);
  const rollback = (opts.prayer || opts.dailyVerse)
    ? readNotificationRollback(restoreSource, opts.prayer, opts.dailyVerse)
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
    await storage.setJSON(PLAN_CACHE_KEY, {
      version: 2, stamp: await resolvePlanStamp(stamp, fullSchedStamp), ...opts,
      days: opts.days.map(day => ({ ...day, revision: day.revision?.includes("geo:")
        ? stampForDays("", [day]).split("repo2:")[1] : day.revision })),
      requests,
    }).then(() => storage.remove(LEGACY_PLAN_CACHE_KEY)).catch(() => {});
  }
}
export function applyNotifications(opts: PlanOptions): Promise<void> {
  return notificationQueue.run(async () => {
    const stamp = await fullSchedStamp();
    await applyNotificationsInner(opts, stampForDays(stamp, opts.days));
  });
}
export function cancelNamazNotifications(): Promise<void> {
  return notificationQueue.run(() => applyNotificationsInner({ days: [], prayer: false, dailyVerse: false }, null));
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
    const [pv, dv] = await Promise.all([storage.getString(NOTIF_KEY), storage.getString(DAILY_VERSE_KEY)]);
    if (pv !== "1" && dv !== "1") {
      await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false }, null);
      return { granted: true, isFallback: false };
    }
    // Kapatılan tür ağ ve konumdan bağımsız iptal edilir; diğer türün mevcut planı korunur.
    if (!enabled) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await settleJobs(scheduled.filter(request => {
        const prayer = request.content.data?.route === "/namaz";
        return key === NOTIF_KEY ? prayer : !prayer;
      }).map(request => Notifications.cancelScheduledNotificationAsync(request.identifier)));
      const cachedPlan = await storage.getJSON<Record<string, unknown>>(PLAN_CACHE_KEY).catch(() => null);
      if (cachedPlan && cachedPlan.version === 2 && Array.isArray(cachedPlan.requests)) {
        const filtered = cachedPlan.requests.filter((request) => {
          const route = (request as { content?: { data?: { route?: unknown } } })?.content?.data?.route;
          return typeof route === "string" && (route === "/namaz" ? pv === "1" : dv === "1");
        });
        await storage.setJSON(PLAN_CACHE_KEY, {
          ...cachedPlan,
          prayer: pv === "1",
          dailyVerse: dv === "1",
          requests: filtered,
        }).catch(() => {});
      }
      return { granted: true, isFallback: false };
    }
    // Planlama işinin başında bir kez okunur; iş sürerken şehir değişse bile bu damga yazılır.
    let stamp = await fullSchedStamp();
    await storage.remove(SCHED_DAY_KEY);
    const coords = await location();
    const days = await fetchPrayerDays(coords.lat, coords.lng);
    if (!days?.length) throw new Error("no-times");
    stamp = stampForDays(stamp, days);
    await applyNotificationsInner({ days, prayer: pv === "1", dailyVerse: dv === "1" }, stamp);
    await storage.setString(SCHED_DAY_KEY, stamp);
    activePlan = { base: stamp.split("|repo2:")[0], signature: stamp.split("|repo2:")[1] };
    return { granted: true, isFallback: coords.isFallback };
  });
}

type FirstRunResult = "enabled" | "denied" | "error";
type FirstRunOptions = { onPermissionsResolved?: () => void };
async function enablePrayerNotificationsFirstRunInner(opts?: FirstRunOptions): Promise<FirstRunResult> {
  let resolved = false;
  const permissionsResolved = () => {
    if (resolved) return;
    resolved = true;
    opts?.onPermissionsResolved?.();
  };
  try {
    const granted = await requestNotificationPermission();
    if (!granted) permissionsResolved();
    await Promise.all([
      storage.setString(NOTIF_KEY, granted ? "1" : "0"),
      storage.setString(DAILY_VERSE_KEY, granted ? "1" : "0"),
    ]);
    await storage.remove(SCHED_DAY_KEY);
    if (!granted) {
      await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false }, null);
      return "denied";
    }
    // Planlama başlamadan önce bir kez okunur; konum/şehir çözümü sürerken değişse bile
    // yazılan damga bu işin başındaki değer olur.
    let stamp = await fullSchedStamp();
    const { lat, lng } = await getLocationRequesting(permissionsResolved);
    try {
      const days = await fetchPrayerDays(lat, lng);
      if (!days?.length) return "error";
      stamp = stampForDays(stamp, days);
      await applyNotificationsInner({ days, prayer: true, dailyVerse: true }, stamp);
      await storage.setString(SCHED_DAY_KEY, stamp);
      activePlan = { base: stamp.split("|repo2:")[0], signature: stamp.split("|repo2:")[1] };
      return "enabled";
    } catch { return "error"; }
  } finally {
    // İzin API'si veya yerel veri okuması hata verse de çağıranı bekletme.
    permissionsResolved();
  }
}
export function enablePrayerNotificationsFirstRun(opts?: FirstRunOptions): Promise<FirstRunResult> {
  return notificationQueue.run(() => enablePrayerNotificationsFirstRunInner(opts));
}
export function declinePrayerNotifications(): Promise<void> {
  return notificationQueue.run(async () => {
    await Promise.all([storage.setString(NOTIF_KEY, "0"), storage.setString(DAILY_VERSE_KEY, "0")]);
    await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false }, null);
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
    if (pv !== null || dv !== null) await applyNotificationsInner({ days: [], prayer: false, dailyVerse: false }, null);
    return;
  }
  let stamp = await fullSchedStamp();
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
    if (!cached) stamp = stampForDays(stamp, days);
    await applyNotificationsInner({ days, prayer: pv === "1", dailyVerse: dv === "1" }, stamp, cached?.requests);
    await storage.setString(SCHED_DAY_KEY, stamp);
    activePlan = { base: stamp.split("|repo2:")[0], signature: stamp.split("|repo2:")[1] };
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

subscribeToPrayerRepository();
