import type { NotificationRequestInput } from "expo-notifications";
import type { DayTimes } from "./namazNotifications";

export const PLAN_CACHE_KEY = "namazNotifPlanCacheV1";

export function shouldRefreshNotifications(enabled: boolean, coldStart: boolean, savedStamp: string | null, stamp: string): boolean {
  return enabled && (coldStart || savedStamp !== stamp);
}

type CachedPlan = { days: DayTimes[]; requests: NotificationRequestInput[] };
const prayerKeys = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const clockPart = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;

// JSON içindeki tarihler geri canlandırılır; bozuk/eski/farklı tercihe ait plan kullanılmaz.
export function readNotificationPlan(raw: string | null, stamp: string, prayer: boolean, dailyVerse: boolean, now = new Date()): CachedPlan | null {
  try {
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || value.stamp !== stamp || value.prayer !== prayer || value.dailyVerse !== dailyVerse) return null;
    if (!Array.isArray(value.days) || value.days.length < 1 || value.days.length > 7 || !Array.isArray(value.requests) || value.requests.length > 56) return null;
    const days: DayTimes[] = [];
    const dates = new Set<string>();
    for (const day of value.days) {
      if (!record(day) || typeof day.date !== "string" || !record(day.times)) return null;
      const date = new Date(day.date);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== day.date) return null;
      const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (dates.has(ymd)) return null;
      dates.add(ymd);
      const times: Record<string, string> = {};
      for (const key of prayerKeys) {
        const time = day.times[key];
        if (typeof time !== "string" || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) return null;
        times[key] = time;
      }
      days.push({ date, times });
    }
    if (!dates.has(stamp.split("|")[0])) return null;
    const firstDay = new Date(days[0].date);
    firstDay.setHours(0, 0, 0, 0);
    if (stamp.split("|")[0] !== `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-${String(firstDay.getDate()).padStart(2, "0")}`) return null;
    for (let i = 0; i < days.length; i++) {
      const expected = new Date(firstDay);
      expected.setDate(expected.getDate() + i);
      const actual = days[i].date;
      if (expected.toDateString() !== actual.toDateString()) return null;
    }
    const requests: NotificationRequestInput[] = [];
    const triggers = new Set<string>();
    let dailyRequests = 0;
    for (const request of value.requests) {
      if (!record(request) || !record(request.content) || !record(request.trigger)) return null;
      const { content, trigger } = request;
      if (typeof content.title !== "string" || typeof content.body !== "string" || content.sound !== true || !record(content.data)) return null;
      const route = content.data.route;
      if (typeof route !== "string" || (route !== "/namaz" && !/^\/ayah\/\d+\/\d+$/.test(route))) return null;
      if (route === "/namaz" ? !prayer : !dailyVerse) return null;
      if (trigger.channelId !== (route === "/namaz" ? "namaz-vakitleri" : "gunun-ayeti")) return null;
      const triggerKey = JSON.stringify([trigger.channelId, trigger.type, trigger.date, trigger.hour, trigger.minute]);
      if (triggers.has(triggerKey)) return null;
      triggers.add(triggerKey);
      if (route !== "/namaz") dailyRequests++;
      let restored: NotificationRequestInput["trigger"];
      if (trigger.type === "date" && typeof trigger.date === "string") {
        const date = new Date(trigger.date);
        if (!Number.isFinite(date.getTime()) || date.toISOString() !== trigger.date) return null;
        if (date.getTime() <= now.getTime()) continue;
        restored = { type: "date", date, channelId: trigger.channelId } as NotificationRequestInput["trigger"];
      } else if (trigger.type === "daily" && route !== "/namaz" && clockPart(trigger.hour, 23) && clockPart(trigger.minute, 59)) {
        restored = { type: "daily", hour: trigger.hour, minute: trigger.minute, channelId: trigger.channelId } as NotificationRequestInput["trigger"];
      } else return null;
      requests.push({ content: { title: content.title, body: content.body, sound: true, data: { route } }, trigger: restored });
    }
    // Geçmiş bildirimler elenebilir; kaynak planda etkin türün kayıp olması bozulmadır.
    if (dailyVerse && dailyRequests === 0) return null;
    if (prayer) {
      const expected = days.flatMap(day => prayerKeys.map(key => {
        const [h, m] = day.times[key].split(":").map(Number);
        const date = new Date(day.date);
        date.setHours(h, m + 2, 0, 0);
        return date.getTime();
      })).filter(time => time > now.getTime()).sort((a, b) => a - b);
      const actual = requests.filter(r => r.content.data?.route === "/namaz").map(r =>
        (r.trigger as { date: Date }).date.getTime()).sort((a, b) => a - b);
      if (JSON.stringify(expected) !== JSON.stringify(actual)) return null;
    }
    return { days, requests };
  } catch { return null; }
}

// İptal sonrası native hata olursa son başarılı planın hâlâ geçerli kısmı geri kurulur.
export function readNotificationRollback(raw: string | null, prayer: boolean, dailyVerse: boolean, now = new Date()): NotificationRequestInput[] {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!record(value) || typeof value.stamp !== "string" || typeof value.prayer !== "boolean" || typeof value.dailyVerse !== "boolean") return [];
    const plan = readNotificationPlan(raw, value.stamp, value.prayer, value.dailyVerse, now);
    return plan?.requests.filter(r => r.content.data?.route === "/namaz" ? prayer : dailyVerse) ?? [];
  } catch { return []; }
}
