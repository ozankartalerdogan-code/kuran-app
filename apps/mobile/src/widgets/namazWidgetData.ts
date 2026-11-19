import { homeHijriDate, nextPrayerFromInstants } from "../lib/homePrayer";
import { PRAYER_KEYS, addDaysYmd, formatHmInZone, prayerDateInZone } from "../lib/prayerInstant";
import { titleCaseTr, isTurkeyCountry } from "../lib/diyanetPrayer";
import type { DiyanetCityRef } from "../lib/diyanetPrayer";
import type { PrayerDayRecord } from "../lib/prayerDayRepository";
import type { PrayerKey } from "../lib/prayerInstant";
import type { Lang } from "../i18n";

export const PRAYER_WIDGET_NAMES = ["NamazSerit", "NamazOdak"] as const;
export type PrayerWidgetName = typeof PRAYER_WIDGET_NAMES[number];
const TR_NAMES = { Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle", Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı" };
const TR_TO = { Fajr: "İmsak'a", Sunrise: "Güneş'e", Dhuhr: "Öğle'ye", Asr: "İkindi'ye", Maghrib: "Akşam'a", Isha: "Yatsı'ya" };
const MONTHS = {
  tr: ["Muharrem", "Safer", "Rebiülevvel", "Rebiülahir", "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce"],
  en: ["Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani", "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"],
};

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
export function nextWidgetRefreshAt(nowMs: number, nextPrayerAtMs?: number | null): number {
  return Math.min(nowMs + 5 * 60_000, Math.max(nowMs, nextPrayerAtMs ?? Infinity));
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

export function buildNamazWidgetData(records: readonly PrayerDayRecord[], city: string, nowMs: number, lang: Lang) {
  if (lang === "en") city = city.replace(/İ/g, "I");
  const emptyText = lang === "tr" ? "Vakitler için uygulamayı açın" : "Open the app to load prayer times";
  const next = city ? nextPrayerFromInstants(records, nowMs) : null;
  if (!next) return { lang, emptyText, prayer: null };
  const today = prayerDateInZone(nowMs, next.record.cityTimeZone);
  const display = records.find(r => r.sourceDate === today && nowMs < r.atMs.Isha) ?? next.record;
  const dateRecord = records.find(r => r.sourceDate === today);
  const hijri = dateRecord ? homeHijriDate(dateRecord) : null;
  const hijriText = hijri ? `${hijri.day} ${MONTHS[lang][hijri.monthNumber - 1]}` : "";
  const name = lang === "tr" ? TR_NAMES[next.key] : next.key;
  const time = formatHmInZone(next.atMs, next.record.cityTimeZone) ?? "";
  const remaining = formatPrayerRemaining(next.atMs - nowMs, lang);
  const countdown = lang === "tr" ? `${prayerToLabel(next.key, lang)} ${remaining}` : `${name} in ${remaining}`;
  const remainingLabel = remaining === "şimdi" || remaining === "now" ? remaining : lang === "tr" ? `${remaining} kaldı` : `in ${remaining}`;
  return { lang, emptyText, prayer: {
    city, heading: [city, hijriText].filter(Boolean).join(" · "),
    focusHeading: `${lang === "tr" ? "Sıradaki" : "Next"} · ${city}`.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US"),
    name, time, countdown, remainingLabel, atMs: next.atMs,
    refreshAtMs: nextWidgetRefreshAt(nowMs, next.atMs),
    accessibilityLabel: `${city}. ${lang === "tr" ? "Sıradaki vakit" : "Next prayer"}: ${name}, ${time}. ${remainingLabel}.`,
    cells: PRAYER_KEYS.map(key => ({ key, name: lang === "tr" ? TR_NAMES[key] : key,
      time: formatHmInZone(display.atMs[key], display.cityTimeZone) ?? "",
      next: next.record.sourceDate === display.sourceDate && key === next.key,
      past: display.atMs[key] <= nowMs,
    })),
    segments: focusSegments(records, next.record, next.key, nowMs),
  } };
}
export type NamazWidgetData = ReturnType<typeof buildNamazWidgetData>;

/** All native/storage imports are lazy; no location resolution or network calls. */
export async function readNamazWidgetData(nowMs = Date.now()): Promise<NamazWidgetData> {
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
    if (!city || !Number.isFinite(city.id) || !city.name || !city.tz) return buildNamazWidgetData([], "", nowMs, lang);
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getPrayerDayRepository } = require("../lib/prayerDayRepositoryDeps") as typeof import("../lib/prayerDayRepositoryDeps");
    const today = prayerDateInZone(nowMs, city.tz);
    const records = await getPrayerDayRepository().readCachedDays({ cityKey: `${manual ? "m" : "c"}${city.id}`, cityTimeZone: city.tz },
      [addDaysYmd(today, -1), today, addDaysYmd(today, 1)]);
    const name = titleCaseTr(city.name, isTurkeyCountry(city.country));
    return buildNamazWidgetData(records, name, nowMs, lang);
  } catch { return buildNamazWidgetData([], "", nowMs, lang); }
}
