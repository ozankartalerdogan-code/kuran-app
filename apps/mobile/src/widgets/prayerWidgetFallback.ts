import { PRAYER_KEYS, addDaysYmd, prayerDateInZone } from "../lib/prayerInstant";
import type { PrayerDayRecord } from "../lib/prayerDayRepository";

export const PRAYER_WIDGET_FALLBACK_KEY = "prayerWidgetFallbackV1";
const DAY_MS = 86_400_000;
const MAX_DAYS = 16;

export type PrayerWidgetFallbackV1 = {
  v: 1;
  city: string;
  tz: string;
  writtenAtMs: number;
  records: PrayerDayRecord[];
};
export type PrayerWidgetFallbackInput = Omit<PrayerWidgetFallbackV1, "v">;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function cityLabel(value: unknown): value is string {
  return typeof value === "string" && !!value.trim() && !/geo:/i.test(value) &&
    !/[-+]?\d+(?:\.\d+)?\s*[,;]\s*[-+]?\d+(?:\.\d+)?/.test(value);
}

/** Rebuild every field: repository revisions can contain coordinate identities too. */
function normalize(value: unknown, nowMs: number, truncate: boolean): PrayerWidgetFallbackV1 | null {
  if (!object(value) || value.v !== 1 || !cityLabel(value.city) || typeof value.tz !== "string" ||
    !finite(value.writtenAtMs) || !finite(nowMs) || value.writtenAtMs > nowMs + 5 * 60_000 ||
    nowMs - value.writtenAtMs > 14 * DAY_MS || !Array.isArray(value.records) ||
    (!truncate && value.records.length > MAX_DAYS)) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.tz }).format(value.writtenAtMs);
    const today = prayerDateInZone(value.writtenAtMs, value.tz);
    const first = addDaysYmd(today, -1), last = addDaysYmd(today, 14);
    const records: PrayerDayRecord[] = [];
    const dates = new Set<string>();
    for (const r of value.records) {
      if (!object(r) || r.source !== "aladhan" || r.cityTimeZone !== value.tz ||
        typeof r.sourceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.sourceDate) ||
        addDaysYmd(r.sourceDate, 0) !== r.sourceDate || !finite(r.fetchedAt) ||
        !object(r.atMs) || !PRAYER_KEYS.every(key => finite((r.atMs as Record<string, unknown>)[key]))) return null;
      let hijri: PrayerDayRecord["hijri"] = null;
      if (r.hijri !== null) {
        const h = r.hijri;
        if (!object(h) || !Number.isInteger(h.day) || (h.day as number) < 1 || (h.day as number) > 30 ||
          !Number.isInteger(h.monthNumber) || (h.monthNumber as number) < 1 || (h.monthNumber as number) > 12 ||
          !Number.isInteger(h.year) || (h.year as number) < 1) return null;
        hijri = { day: h.day as number, monthNumber: h.monthNumber as number, year: h.year as number };
      }
      if (r.sourceDate < first || r.sourceDate > last || dates.has(r.sourceDate)) {
        if (truncate) continue;
        return null;
      }
      dates.add(r.sourceDate);
      records.push({ sourceDate: r.sourceDate, cityKey: "fallback", cityTimeZone: value.tz,
        source: "aladhan", revision: "fallback", fetchedAt: r.fetchedAt, hijri,
        atMs: Object.fromEntries(PRAYER_KEYS.map(key => [key, (r.atMs as Record<string, number>)[key]])) as PrayerDayRecord["atMs"],
      });
    }
    records.sort((a, b) => a.sourceDate.localeCompare(b.sourceDate));
    return { v: 1, city: value.city, tz: value.tz, writtenAtMs: value.writtenAtMs, records };
  } catch { return null; }
}

/** Keep the [-1..+14] day window; never copy arbitrary input fields to disk. */
export function serializeFallbackSnapshot(snapshot: PrayerWidgetFallbackInput): string | null {
  const safe = normalize({ ...snapshot, v: 1 }, snapshot.writtenAtMs, true);
  return safe ? JSON.stringify(safe) : null;
}

export function parseFallbackSnapshot(json: string | null, nowMs: number): PrayerWidgetFallbackV1 | null {
  try { return json === null ? null : normalize(JSON.parse(json), nowMs, false); }
  catch { return null; }
}

function fallbackStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return (require("../lib/storage") as typeof import("../lib/storage")).storage;
}

export async function readPrayerWidgetFallback(nowMs = Date.now()): Promise<PrayerWidgetFallbackV1 | null> {
  try { return parseFallbackSnapshot(await fallbackStorage().getString(PRAYER_WIDGET_FALLBACK_KEY), nowMs); }
  catch { return null; }
}

export async function writePrayerWidgetFallback(snapshot: PrayerWidgetFallbackInput): Promise<void> {
  try {
    const json = serializeFallbackSnapshot(snapshot);
    if (json !== null) await fallbackStorage().setString(PRAYER_WIDGET_FALLBACK_KEY, json);
  } catch { /* Widget storage is best effort. */ }
}

export async function clearPrayerWidgetFallback(): Promise<void> {
  try { await fallbackStorage().remove(PRAYER_WIDGET_FALLBACK_KEY); }
  catch { /* Widget storage is best effort. */ }
}
