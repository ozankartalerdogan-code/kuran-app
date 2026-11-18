/** Platform-free adapters; transport and Diyanet storage are injected for tests. */
import { getDiyanetDays } from "./diyanetPrayer";
import type { DiyanetPrayerDeps } from "./diyanetPrayer";
import { adjustHighLatitude, aladhanMethodQuery } from "./prayerMethod";
import { addDaysYmd } from "./prayerInstant";
import type { PrayerContext, PrayerDayInput } from "./prayerDayRepository";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function aladhanCalendarInputs(body: unknown, context: PrayerContext): PrayerDayInput[] {
  if (!isRecord(body) || !Array.isArray(body.data)) return [];
  const inputs: PrayerDayInput[] = [];
  for (const day of body.data) {
    if (!isRecord(day) || !isRecord(day.date) || !isRecord(day.date.gregorian) ||
      !isRecord(day.timings)) continue;
    const date = day.date.gregorian.date;
    if (typeof date !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(date)) continue;
    const [d, m, y] = date.split("-");
    const sourceDate = `${y}-${m}-${d}`;
    if (addDaysYmd(sourceDate, 0) !== sourceDate) continue;
    const times: Record<string, string> = {};
    // Match the notification calendar's sanitization, including timezone suffixes.
    for (const [key, value] of Object.entries(day.timings)) {
      const match = typeof value === "string" ? value.match(/^(\d{1,2}:\d{2})/) : null;
      if (match) times[key] = match[1];
    }
    const h = day.date.hijri;
    const hijri = isRecord(h) && isRecord(h.month)
      ? { day: Number(h.day), monthNumber: Number(h.month.number), year: Number(h.year) } : null;
    const validHijri = hijri && Number.isInteger(hijri.day) && hijri.day >= 1 && hijri.day <= 30 &&
      Number.isInteger(hijri.monthNumber) && hijri.monthNumber >= 1 && hijri.monthNumber <= 12 &&
      Number.isInteger(hijri.year) && hijri.year > 0;
    inputs.push({ sourceDate, ...(validHijri ? { hijri } : {}), times: adjustHighLatitude(times, context.lat,
      { year: Number(y), month: Number(m), day: Number(d) }, context.cityTimeZone) });
  }
  return inputs;
}

export async function fetchDiyanetMonthInputs(
  context: PrayerContext, month: string, deps: DiyanetPrayerDeps,
): Promise<PrayerDayInput[]> {
  const dates: string[] = [];
  for (let date = `${month}-01`; date.startsWith(`${month}-`); date = addDaysYmd(date, 1)) {
    dates.push(date);
  }
  const days = await getDiyanetDays(context.lat, context.lon, context.offMin, dates, deps, context.diyanetCity ?? null);
  return [...days].filter(([, day]) => context.cityKey === `m${day.city.id}` || context.cityKey === `c${day.city.id}`).map(([sourceDate, day]) => ({ sourceDate,
    rawIso: day.rawTimes, hijri: day.hijri, cityDisplayName: day.city.name }));
}

export async function fetchAladhanMonthInputs(
  context: PrayerContext, month: string, fetchCalendar: typeof fetch,
): Promise<PrayerDayInput[]> {
  const [year, monthNumber] = month.split("-").map(Number);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchCalendar(
      `https://api.aladhan.com/v1/calendar/${year}/${monthNumber}?latitude=${context.lat}&longitude=${context.lon}&${aladhanMethodQuery(context.cityTimeZone)}&timezonestring=${encodeURIComponent(context.cityTimeZone)}`,
      { headers: { Accept: "application/json" }, signal: controller.signal },
    );
    if (!response.ok) throw new Error(`Aladhan calendar HTTP ${response.status}`);
    return aladhanCalendarInputs(await response.json(), context);
  } finally {
    clearTimeout(timer);
  }
}
