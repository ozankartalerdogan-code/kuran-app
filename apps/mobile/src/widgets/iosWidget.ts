import { Platform } from "react-native";
import { PRAYER_KEYS, addDaysYmd, formatHmInZone, prayerDateInZone } from "../lib/prayerInstant";
import type { PrayerDayRecord } from "../lib/prayerDayRepository";
import type { PrayerKey } from "../lib/prayerInstant";
import type { Lang } from "../i18n";
import { TR_NAMES, hijriText, prayerToLabel, readPrayerWidgetSource } from "./namazWidgetData";
import { readWidgetThemePreference } from "./widgetTheme";
import type { WidgetThemePreference } from "./widgetTheme";

export const IOS_APP_GROUP = "group.com.kuranapp.mobile";
export const IOS_WIDGET_KEY = "namazWidgetV1";

const MAX_IOS_WIDGET_DAYS = 16;
const DAY_OFFSETS = Array.from({ length: MAX_IOS_WIDGET_DAYS }, (_, i) => i - 1);

export type IosWidgetPayload = {
  v: 1;
  lang: "tr" | "en";
  theme: "light" | "dark" | null;
  city: string;
  tz: string;
  emptyText: string;
  focusHeading: string;
  nextLabel: string;
  a11yNext: string;
  names: Record<PrayerKey, string>;
  toLabels: Record<PrayerKey, string>;
  days: Array<{
    date: string;
    hijri: string;
    prayers: Array<{ key: PrayerKey; atMs: number; time: string }>;
  }>;
  writtenAtMs: number;
};

type BuildIosWidgetPayloadInput = {
  records: readonly PrayerDayRecord[];
  city: string;
  tz: string;
  lang: Lang;
  theme: WidgetThemePreference;
  nowMs: number;
};

export function buildIosWidgetPayload(input: BuildIosWidgetPayloadInput): IosWidgetPayload {
  const { lang, theme, nowMs } = input;
  const city = input.city ? (lang === "en" ? input.city.replace(/İ/g, "I") : input.city) : "";
  const tz = city ? input.tz : "";
  const emptyText = lang === "tr" ? "Vakitler için uygulamayı açın" : "Open the app to load prayer times";
  const focusHeading = city
    ? `${lang === "tr" ? "Sıradaki" : "Next"} · ${city}`.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US")
    : "";
  const names = Object.fromEntries(
    PRAYER_KEYS.map(k => [k, lang === "tr" ? TR_NAMES[k] : k]),
  ) as Record<PrayerKey, string>;
  const toLabels = Object.fromEntries(
    PRAYER_KEYS.map(k => [k, prayerToLabel(k, lang)]),
  ) as Record<PrayerKey, string>;

  let days: IosWidgetPayload["days"] = [];
  if (city && tz) {
    const today = prayerDateInZone(nowMs, tz);
    if (today) {
      const minDate = addDaysYmd(today, -1);
      const sorted = input.records
        .filter(r => r.sourceDate >= minDate)
        .sort((a, b) => (a.sourceDate < b.sourceDate ? -1 : a.sourceDate > b.sourceDate ? 1 : 0));
      const seen = new Set<string>();
      const unique: PrayerDayRecord[] = [];
      for (const record of sorted) {
        if (seen.has(record.sourceDate)) continue;
        seen.add(record.sourceDate);
        unique.push(record);
        if (unique.length === MAX_IOS_WIDGET_DAYS) break;
      }
      days = unique.map(record => ({
        date: record.sourceDate,
        hijri: hijriText(record, lang),
        prayers: PRAYER_KEYS.map(key => ({
          key,
          atMs: record.atMs[key],
          time: formatHmInZone(record.atMs[key], record.cityTimeZone) ?? "",
        })),
      }));
    }
  }

  return {
    v: 1,
    lang,
    theme,
    city,
    tz,
    emptyText,
    focusHeading,
    nextLabel: lang === "tr" ? "SIRADAKİ" : "NEXT",
    a11yNext: lang === "tr" ? "Sıradaki vakit" : "Next prayer",
    names,
    toLabels,
    days,
    writtenAtMs: nowMs,
  };
}

/** App Group user defaults'a iOS widget verisini yazar; Android'de ve eksik native modülde sessiz no-op. */
export async function writeIosWidgetPayload(nowMs = Date.now()): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { ExtensionStorage } = require("@bacons/apple-targets") as {
      ExtensionStorage: {
        new (appGroup: string): { set: (key: string, value: string) => void };
        reloadWidget: (name?: string) => void;
      };
    };
    if (!ExtensionStorage) return;
    const [source, theme] = await Promise.all([
      readPrayerWidgetSource(nowMs, DAY_OFFSETS),
      readWidgetThemePreference(),
    ]);
    const payload = buildIosWidgetPayload({
      records: source.records,
      city: source.city,
      tz: source.tz,
      lang: source.lang,
      theme,
      nowMs,
    });
    new ExtensionStorage(IOS_APP_GROUP).set(IOS_WIDGET_KEY, JSON.stringify(payload));
    ExtensionStorage.reloadWidget();
  } catch {
    /* build-gated: @bacons/apple-targets veya App Group yoksa sessiz no-op */
  }
}
