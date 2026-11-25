import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import * as homePrayer from "../lib/homePrayer.ts";
import * as instants from "../lib/prayerInstant.ts";
import * as diyanet from "../lib/diyanetPrayer.ts";
import { createPrayerDayRepository } from "../lib/prayerDayRepository.ts";
import type { PrayerDayRecord } from "../lib/prayerDayRepository.ts";

function load(native: Record<string, unknown> = {}, os: "ios" | "android" = "ios") {
  const compile = (file: string, modules: Record<string, unknown>) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    new Function("require", "exports", "module", compiled)((id: string) => {
      if (!(id in modules)) throw new Error(`Native module unavailable: ${id}`);
      return modules[id];
    }, mod.exports, mod);
    return mod.exports;
  };

  const dataApi = compile("./namazWidgetData.ts", {
    "../lib/homePrayer": homePrayer,
    "../lib/prayerInstant": instants,
    "../lib/diyanetPrayer": diyanet,
    ...native,
  }) as typeof import("./namazWidgetData");

  const themeApi = native["./widgetTheme"] ?? {
    readWidgetThemePreference: async () => null,
  };

  return compile("./iosWidget.ts", {
    "react-native": { Platform: { OS: os } },
    "../lib/prayerInstant": instants,
    "./namazWidgetData": dataApi,
    "./widgetTheme": themeApi,
    ...native,
  }) as typeof import("./iosWidget");
}

const api = load();
const wall = { Fajr: "06:12", Sunrise: "07:41", Dhuhr: "12:53", Asr: "15:22", Maghrib: "17:42", Isha: "19:06" };
function day(date: string): PrayerDayRecord {
  return {
    sourceDate: date,
    cityKey: "m34",
    cityTimeZone: "Europe/Istanbul",
    cityDisplayName: "İstanbul",
    source: "diyanet",
    revision: "1",
    atMs: instants.instantsFromWallTimes(date, wall, "Europe/Istanbul")!,
    hijri: { day: 10, monthNumber: 6, year: 1448 },
    fetchedAt: 0,
  };
}

const yesterday = day("2026-11-18");
const today = day("2026-11-19");
const tomorrow = day("2026-11-20");
const nowMs = Date.parse("2026-11-19T11:15:00+03:00");

test("tr: 3 günlük kayıttan payload — names/toLabels/hijri/time/atMs doğru, PRAYER_KEYS sırası, days artan", () => {
  const payload = api.buildIosWidgetPayload({
    records: [tomorrow, yesterday, today],
    city: "İstanbul",
    tz: "Europe/Istanbul",
    lang: "tr",
    theme: "dark",
    nowMs,
  });

  assert.equal(payload.v, 1);
  assert.equal(payload.lang, "tr");
  assert.equal(payload.theme, "dark");
  assert.equal(payload.city, "İstanbul");
  assert.equal(payload.tz, "Europe/Istanbul");
  assert.equal(payload.emptyText, "Vakitler için uygulamayı açın");
  assert.equal(payload.focusHeading, "SIRADAKİ · İSTANBUL");
  assert.equal(payload.nextLabel, "SIRADAKİ");
  assert.equal(payload.a11yNext, "Sıradaki vakit");
  assert.equal(payload.writtenAtMs, nowMs);
  assert.deepEqual(payload.names, {
    Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle", Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı",
  });
  assert.deepEqual(payload.toLabels, {
    Fajr: "İmsak'a", Sunrise: "Güneş'e", Dhuhr: "Öğle'ye", Asr: "İkindi'ye", Maghrib: "Akşam'a", Isha: "Yatsı'ya",
  });
  assert.deepEqual(payload.days.map(d => d.date), ["2026-11-18", "2026-11-19", "2026-11-20"]);
  assert.equal(payload.days[1].hijri, "10 Cemaziyelahir");
  assert.deepEqual(payload.days[1].prayers.map(p => p.key), instants.PRAYER_KEYS);
  assert.deepEqual(payload.days[1].prayers.map(p => p.time), Object.values(wall));
  assert.deepEqual(payload.days[1].prayers.map(p => p.atMs), instants.PRAYER_KEYS.map(k => today.atMs[k]));
});

test("en: city İstanbul → Istanbul, names = anahtarlar, focusHeading NEXT · ISTANBUL", () => {
  const payload = api.buildIosWidgetPayload({
    records: [today],
    city: "İstanbul",
    tz: "Europe/Istanbul",
    lang: "en",
    theme: "light",
    nowMs,
  });

  assert.equal(payload.city, "Istanbul");
  assert.equal(payload.focusHeading, "NEXT · ISTANBUL");
  assert.equal(payload.nextLabel, "NEXT");
  assert.equal(payload.a11yNext, "Next prayer");
  assert.equal(payload.emptyText, "Open the app to load prayer times");
  assert.deepEqual(payload.names, {
    Fajr: "Fajr", Sunrise: "Sunrise", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha",
  });
  assert.deepEqual(payload.toLabels, payload.names);
  assert.equal(payload.days[0].hijri, "10 Jumada al-thani");
});

test("bugün-2 tarihli kayıt atılır; yinelenen tarih tekilleşir; 20 kayıttan en fazla 16 gün", () => {
  const tooOld = day("2026-11-17");
  const dupToday = {
    ...today,
    atMs: { ...today.atMs, Fajr: today.atMs.Fajr + 60_000 },
  };
  const manyDays = Array.from({ length: 20 }, (_, i) => day(instants.addDaysYmd("2026-11-18", i)));
  const payload = api.buildIosWidgetPayload({
    records: [tooOld, dupToday, ...manyDays],
    city: "İstanbul",
    tz: "Europe/Istanbul",
    lang: "tr",
    theme: null,
    nowMs,
  });

  assert.equal(payload.days.length, 16);
  assert.equal(payload.days[0].date, "2026-11-18");
  assert.equal(payload.days[15].date, "2026-12-03");
  // Yinelenen 2026-11-19 için ilk gelen (dupToday) korunur
  const nov19 = payload.days.find(d => d.date === "2026-11-19")!;
  assert.equal(nov19.prayers[0].atMs, dupToday.atMs.Fajr);
});

test("şehir yok → days: [], city: '', emptyText dolu", () => {
  const payload = api.buildIosWidgetPayload({
    records: [yesterday, today, tomorrow],
    city: "",
    tz: "Europe/Istanbul",
    lang: "tr",
    theme: null,
    nowMs,
  });

  assert.deepEqual(payload.days, []);
  assert.equal(payload.city, "");
  assert.equal(payload.tz, "");
  assert.equal(payload.emptyText, "Vakitler için uygulamayı açın");
});

test("writeIosWidgetPayload: Android platformunda ExtensionStorage hiç çağrılmaz", async () => {
  let called = false;
  class StubExtensionStorage {
    constructor() { called = true; }
    set() { called = true; }
    static reloadWidget() { called = true; }
  }
  const androidApi = load({
    "@bacons/apple-targets": { ExtensionStorage: StubExtensionStorage },
  }, "android");

  await androidApi.writeIosWidgetPayload(nowMs);
  assert.equal(called, false);
});

test("writeIosWidgetPayload: iOS'ta set(IOS_WIDGET_KEY, string) ve reloadWidget() çağrılır", async () => {
  const calls: Array<{ type: string; arg1?: string; arg2?: string }> = [];
  class StubExtensionStorage {
    constructor(group: string) {
      calls.push({ type: "init", arg1: group });
    }
    set(key: string, value: string) {
      calls.push({ type: "set", arg1: key, arg2: value });
    }
    static reloadWidget() {
      calls.push({ type: "reload" });
    }
  }

  const repo = createPrayerDayRepository({
    instants,
    storageGet: async () => JSON.stringify({ version: 1, records: [yesterday, today, tomorrow] }),
    storageSet: async () => assert.fail("unexpected write"),
    nowMs: () => 0,
    fetchDiyanetMonth: async () => assert.fail("unexpected network"),
    fetchAladhanMonth: async () => assert.fail("unexpected network"),
  });
  const city = { id: 34, name: "İSTANBUL", country: "TÜRKİYE", state: "İSTANBUL", tz: "Europe/Istanbul" };

  const iosApi = load({
    "@bacons/apple-targets": { ExtensionStorage: StubExtensionStorage },
    "../lib/storage": {
      storage: {
        getJSON: async (key: string) => (key === "diyanetManualCityV1" ? city : null),
      },
    },
    "../i18n": { languageReady: Promise.resolve(), getLang: () => "tr" },
    "../lib/prayerDayRepositoryDeps": { getPrayerDayRepository: () => repo },
    "./widgetTheme": { readWidgetThemePreference: async () => "dark" },
  }, "ios");

  await iosApi.writeIosWidgetPayload(nowMs);

  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], { type: "init", arg1: iosApi.IOS_APP_GROUP });
  assert.equal(calls[1].type, "set");
  assert.equal(calls[1].arg1, iosApi.IOS_WIDGET_KEY);
  const parsed = JSON.parse(calls[1].arg2!);
  assert.equal(parsed.v, 1);
  assert.equal(parsed.theme, "dark");
  assert.equal(parsed.city, "İstanbul");
  assert.equal(parsed.days.length, 3);
  assert.deepEqual(calls[2], { type: "reload" });
});

test("writeIosWidgetPayload: @bacons/apple-targets require throw ederse hata fırlatmaz", async () => {
  await assert.doesNotReject(() => api.writeIosWidgetPayload(nowMs));
});
