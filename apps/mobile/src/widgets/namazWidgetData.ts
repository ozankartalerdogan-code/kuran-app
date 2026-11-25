import { homeHijriDate, nextPrayerFromInstants } from "../lib/homePrayer";
import { PRAYER_KEYS, addDaysYmd, formatHmInZone, prayerDateInZone } from "../lib/prayerInstant";
import { titleCaseTr, isTurkeyCountry } from "../lib/diyanetPrayer";
import type { DiyanetCityRef } from "../lib/diyanetPrayer";
import type { PrayerDayRecord } from "../lib/prayerDayRepository";
import type { PrayerKey } from "../lib/prayerInstant";
import type { Lang } from "../i18n";

export const PRAYER_WIDGET_NAMES = ["NamazSerit", "NamazOdak"] as const;
export type PrayerWidgetName = typeof PRAYER_WIDGET_NAMES[number];
export const TR_NAMES: Record<PrayerKey, string> = { Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle", Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı" };
const TR_TO = { Fajr: "İmsak'a", Sunrise: "Güneş'e", Dhuhr: "Öğle'ye", Asr: "İkindi'ye", Maghrib: "Akşam'a", Isha: "Yatsı'ya" };
export const MONTHS = {
  tr: ["Muharrem", "Safer", "Rebiülevvel", "Rebiülahir", "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce"],
  en: ["Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani", "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"],
};

export function hijriText(record: Pick<PrayerDayRecord, "source" | "sourceDate" | "hijri">, lang: Lang): string {
  const hijri = homeHijriDate(record);
  return hijri ? `${hijri.day} ${MONTHS[lang][hijri.monthNumber - 1]}` : "";
}

export function formatPrayerRemaining(remainingMs: number, lang: Lang): string {
  const minutes = Math.max(0, Math.floor(remainingMs / 60_000));
  if (minutes < 1) return lang === "tr" ? "şimdi" : "now";
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return lang === "tr"
    ? hours ? `${hours} sa ${rest} dk` : `${minutes} dk`
    : hours ? `${hours}h ${rest}m` : `${minutes}m`;
}

export function prayerToLabel(key: PrayerKey, lang: Lang): string {
  return lang === "tr" ? TR_TO[key] : key;
}

/** Native alarm integration (2b) can use this without loading React or storage. */
// Remaining time is floored to whole minutes and prayer times sit on minute
// boundaries, so the label changes exactly at each clock minute. Tick just
// after the boundary (small lag so the floor has already flipped).
const MINUTE_MS = 60_000;
const TICK_LAG_MS = 500;
export function nextWidgetRefreshAt(nowMs: number, nextPrayerAtMs?: number | null): number {
  const nextMinute = Math.floor((nowMs - TICK_LAG_MS) / MINUTE_MS) * MINUTE_MS + MINUTE_MS + TICK_LAG_MS;
  return Math.min(nextMinute, Math.max(nowMs + TICK_LAG_MS, (nextPrayerAtMs ?? Infinity) + TICK_LAG_MS));
}

export type PrayerSegment = { state: "past" | "current" | "future"; fraction: number };
export function focusSegments(records: readonly PrayerDayRecord[], display: PrayerDayRecord, nextKey: PrayerKey, nowMs: number): PrayerSegment[] {
  const nextIndex = PRAYER_KEYS.indexOf(nextKey);
  // Segment i is the interval from prayer i to prayer i+1. Before Fajr,
  // the previous day's Isha→Fajr interval is the last segment.
  const current = nextIndex === 0 ? 5 : nextIndex - 1;
  const end = display.atMs[nextKey];
  const start = nextIndex === 0
    ? records.find(r => r.sourceDate === addDaysYmd(display.sourceDate, -1))?.atMs.Isha
    : display.atMs[PRAYER_KEYS[current]];
  const fraction = start === undefined || end <= start ? 0 : Math.max(0, Math.min(1, (nowMs - start) / (end - start)));
  return PRAYER_KEYS.map((_, i) => ({
    state: i === current ? "current" : nextIndex > 0 && i < current ? "past" : "future",
    fraction: i === current ? fraction : nextIndex > 0 && i < current ? 1 : 0,
  }));
}

export function buildNamazWidgetData(records: readonly PrayerDayRecord[], city: string, nowMs: number, lang: Lang, approximate = false) {
  if (lang === "en") city = city.replace(/İ/g, "I");
  const emptyText = lang === "tr" ? "Vakitler için uygulamayı açın" : "Open the app to load prayer times";
  const next = city ? nextPrayerFromInstants(records, nowMs) : null;
  if (!next) return { lang, emptyText, prayer: null };
  const today = prayerDateInZone(nowMs, next.record.cityTimeZone);
  const display = next.record;
  const dateRecord = records.find(r => r.sourceDate === today);
  const hijriLabel = dateRecord ? hijriText(dateRecord, lang) : "";
  const name = lang === "tr" ? TR_NAMES[next.key] : next.key;
  const time = formatHmInZone(next.atMs, next.record.cityTimeZone) ?? "";
  const remaining = formatPrayerRemaining(next.atMs - nowMs, lang);
  const countdown = lang === "tr" ? `${prayerToLabel(next.key, lang)} ${remaining}` : `${name} in ${remaining}`;
  const remainingLabel = remaining === "şimdi" || remaining === "now" ? remaining : lang === "tr" ? `${remaining} kaldı` : `in ${remaining}`;
  const headingCity = approximate ? `${city} (~)` : city;
  return { lang, emptyText, prayer: {
    city, heading: [headingCity, hijriLabel].filter(Boolean).join(" · "),
    focusHeading: `${lang === "tr" ? "Sıradaki" : "Next"} · ${headingCity}`.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US"),
    name, time, countdown, remainingLabel, atMs: next.atMs,
    refreshAtMs: nextWidgetRefreshAt(nowMs, next.atMs),
    accessibilityLabel: `${city}. ${lang === "tr" ? "Sıradaki vakit" : "Next prayer"}: ${name}, ${time}. ${remainingLabel}.${approximate ? lang === "tr" ? " Yaklaşık vakitler." : " Approximate times." : ""}`,
    cells: PRAYER_KEYS.map(key => ({ key, name: lang === "tr" ? TR_NAMES[key] : key,
      time: formatHmInZone(display.atMs[key], display.cityTimeZone) ?? "",
      next: next.record.sourceDate === display.sourceDate && key === next.key,
      past: display.atMs[key] <= nowMs,
    })),
    segments: focusSegments(records, next.record, next.key, nowMs),
  } };
}
export type NamazWidgetData = ReturnType<typeof buildNamazWidgetData>;

export type PrayerWidgetSource =
  | { lang: Lang; city: string; tz: string; records: PrayerDayRecord[]; approximate?: boolean }
  | { lang: Lang; city: ""; tz: ""; records: []; approximate?: boolean };

/** All native/storage imports are lazy; no location resolution or network calls. */
export async function readPrayerWidgetSource(nowMs: number, dayOffsets: readonly number[]): Promise<PrayerWidgetSource> {
  let lang: Lang = "tr";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { storage } = require("../lib/storage") as typeof import("../lib/storage");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const i18n = require("../i18n") as typeof import("../i18n");
    await i18n.languageReady;
    lang = i18n.getLang();
    const manual = await storage.getJSON<DiyanetCityRef>("diyanetManualCityV1");
    const cached = manual ? null : await storage.getJSON<{ city: DiyanetCityRef | null }>("diyanetCityV1");
    const city = manual ?? cached?.city;
    if (!city) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { readPrayerWidgetFallback } = require("./prayerWidgetFallback") as typeof import("./prayerWidgetFallback");
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { deviceTimeZone } = require("../lib/timeZone") as typeof import("../lib/timeZone");
      const snapshot = await readPrayerWidgetFallback(nowMs);
      if (snapshot && snapshot.tz === deviceTimeZone()) {
        const today = prayerDateInZone(nowMs, snapshot.tz);
        const dates = new Set(dayOffsets.map(offset => addDaysYmd(today, offset)));
        const records = snapshot.records.filter(record => dates.has(record.sourceDate));
        if (records.length) return { lang, city: snapshot.city, tz: snapshot.tz, records, approximate: true };
      }
      return { lang, city: "", tz: "", records: [] };
    }
    if (!city || !Number.isFinite(city.id) || !city.name || !city.tz) return { lang, city: "", tz: "", records: [] };
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getPrayerDayRepository } = require("../lib/prayerDayRepositoryDeps") as typeof import("../lib/prayerDayRepositoryDeps");
    const today = prayerDateInZone(nowMs, city.tz);
    const dates = dayOffsets.map(offset => (offset === 0 ? today : addDaysYmd(today, offset)));
    const records = await getPrayerDayRepository().readCachedDays(
      { cityKey: `${manual ? "m" : "c"}${city.id}`, cityTimeZone: city.tz },
      dates,
    );
    const name = titleCaseTr(city.name, isTurkeyCountry(city.country));
    return { lang, city: name, tz: city.tz, records, approximate: false };
  } catch {
    return { lang, city: "", tz: "", records: [] };
  }
}

export async function readNamazWidgetData(nowMs = Date.now()): Promise<NamazWidgetData> {
  const source = await readPrayerWidgetSource(nowMs, [-1, 0, 1]);
  return buildNamazWidgetData(source.records, source.city, nowMs, source.lang, source.approximate);
}
