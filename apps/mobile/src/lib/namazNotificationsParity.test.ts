import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import * as instants from "./prayerInstant.ts";
import * as method from "./prayerMethod.ts";
import * as diyanet from "./diyanetPrayer.ts";
import * as recovery from "./notificationRecovery.ts";
import * as queue from "./serialQueue.ts";
import { createPrayerDayRepository } from "./prayerDayRepository.ts";

const ZONE = "Europe/Istanbul";
const NOW = Date.parse("2026-11-18T00:00:00+03:00");
// Fixed Diyanet-shaped raw ISO fixtures, seven varying days per city.
const fixtures = [
  { id: 9541, name: "Istanbul", lat: 41.0082, lon: 28.9784, hours: ["06:25", "07:55", "12:54", "15:18", "17:43", "19:07"] },
  { id: 9206, name: "Ankara", lat: 39.9334, lon: 32.8597, hours: ["06:10", "07:39", "12:38", "15:02", "17:27", "18:51"] },
  { id: 9560, name: "Izmir", lat: 38.4237, lon: 27.1428, hours: ["06:31", "07:58", "13:06", "15:39", "18:04", "19:26"] },
].map(city => ({ ...city, tz: ZONE, days: Array.from({ length: 7 }, (_, i) => {
  const sourceDate = instants.addDaysYmd("2026-11-18", i);
  const rawIso = Object.fromEntries(["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"].map((key, k) => {
    const [h, m] = city.hours[k].split(":").map(Number);
    const minutes = h * 60 + m + i;
    return [key, `${sourceDate}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+03:00`];
  }));
  return { sourceDate, rawIso };
}) }));

function load(source: string, deps: Record<string, unknown>) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const mod = { exports: {} as any };
  new Function("require", "exports", "module", compiled)((id: string) => {
    if (!(id in deps)) throw new Error(`Unexpected dependency ${id}`);
    return deps[id];
  }, mod.exports, mod);
  return mod.exports;
}

function setup(city = fixtures[0], options: { fail?: boolean; automatic?: boolean; noCity?: boolean; zone?: string; intl?: boolean; aladhan?: boolean; now?: number; scheduleFail?: boolean; writeFail?: boolean; contentFail?: boolean; verseMeal?: string; android?: boolean; deleteChannelFail?: boolean; dailyRepeating?: boolean; legacyDailyImportance?: number } = {}) {
  const values = new Map<string, any>([["namazNotifEnabled", "1"], ["dailyVerseNotifEnabled", "0"]]);
  const writes: string[] = [];
  let cancels = 0, subscribes = 0, fills = 0;
  let failed = false;
  const urls: string[] = [];
  const calendarFetch: typeof fetch = async url => {
    urls.push(String(url));
    const path = new URL(String(url)).pathname.split("/");
    const month = `${path.at(-2)}-${path.at(-1)!.padStart(2, "0")}`;
    return new Response(JSON.stringify({ data: city.days.filter(day => day.sourceDate.startsWith(month)).map(day => ({
      date: { gregorian: { date: day.sourceDate.split("-").reverse().join("-") } },
      timings: Object.fromEntries(instants.PRAYER_KEYS.map((key, i) => [key, `${Object.values(day.rawIso)[i].slice(11, 16)} (+03)`])),
    })) }));
  };
  const adapters = load(readFileSync(new URL("./prayerDayRepositoryAdapters.ts", import.meta.url), "utf8"), {
    "./prayerInstant": instants, "./prayerMethod": method, "./diyanetPrayer": diyanet,
  });
  const scheduled: any[] = [];
  const channels = new Map<string, any>();
  const deletedChannels: string[] = [];
  const daily = (key: string) => ({
    verse: { verse_key: key, surah_id: 1, ayah_number: 1, meal: "Daily verse" },
    dua: { surah_id: 2, ayah_number: 201, meal: "Daily dua" },
  });
  const listeners: ((event: any) => void)[] = [];
  const repo = createPrayerDayRepository({
    instants, nowMs: () => options.now ?? NOW,
    storageGet: async key => values.get(key) ?? null,
    storageSet: async (key, json) => { values.set(key, json); },
    fetchDiyanetMonth: async () => { fills++; if (options.fail || options.aladhan) throw Error("offline"); return city.days; },
    fetchAladhanMonth: async (context, month) => { if (options.aladhan) return adapters.fetchAladhanMonthInputs(context, month, calendarFetch); throw Error("offline"); },
  });
  const contexts: any[] = [];
  const cachedReads: string[][] = [];
  const repository = { ...repo,
    readCachedDays: async (context: any, dates: string[]) => { cachedReads.push(dates); return repo.readCachedDays(context, dates); },
    ensureDays: async (context: any, dates: string[]) => { contexts.push({ ...context, dates }); return repo.ensureDays(context, dates); },
    subscribe: (fn: (event: any) => void) => { subscribes++; listeners.push(fn); return repo.subscribe(fn); },
  };
  const storage = {
    getString: async (key: string) => { const value = values.get(key); return value == null ? null : typeof value === "string" ? value : JSON.stringify(value); },
    getJSON: async (key: string) => values.get(key) ?? null,
    setString: async (key: string, value: any) => { writes.push(key); values.set(key, value); },
    setJSON: async (key: string, value: any) => { if (options.writeFail && key === recovery.PLAN_CACHE_KEY) throw Error("storage"); writes.push(key); values.set(key, value); },
    remove: async (key: string) => { values.delete(key); },
  };
  const dependencies = {
    "./prayerMethod": method, "./serialQueue": queue, "./notificationRecovery": recovery,
    "../tour/overlayBusy": { withOverlayBusy: (fn: any) => fn() },
    "expo-notifications": {
      SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily" },
      AndroidImportance: { HIGH: 4, DEFAULT: 3 },
      getNotificationChannelAsync: async (id: string) => channels.get(id) ?? (id === "gunun-ayeti" && options.legacyDailyImportance !== undefined ? { id, importance: options.legacyDailyImportance } : null),
      setNotificationChannelAsync: async (id: string, channel: any) => { channels.set(id, channel); },
      deleteNotificationChannelAsync: async (id: string) => { deletedChannels.push(id); if (options.deleteChannelFail) throw Error("channel"); },
      cancelAllScheduledNotificationsAsync: async () => { cancels++; scheduled.length = 0; },
      scheduleNotificationAsync: async (request: any) => { if (options.scheduleFail && !failed) { failed = true; throw Error("native"); } scheduled.push(request); return "id"; },
    },
    "expo-device": { isDevice: true }, "expo-location": { getForegroundPermissionsAsync: async () => ({ status: "denied" }) },
    "react-native": { Platform: { OS: options.android ? "android" : "ios" } },
    "./api": { api: {
      notifications: { namazVerse: () => { if (options.contentFail) throw Error("content"); return Promise.resolve(options.verseMeal ? { surah_id: 1, ayah_number: 1, translation: options.verseMeal } : null); } },
      daily: { forDate: async (date: string) => daily(options.dailyRepeating ? "same" : date), get: async () => daily("today") },
    } },
    "./storage": { storage, STORAGE_KEYS: {} }, "./englishMeal": { localizedMeal: (_verse: unknown, meal: string) => meal },
    "../widgets/prayerWidgetFallback": load(readFileSync(new URL("../widgets/prayerWidgetFallback.ts", import.meta.url), "utf8"), {
      "../lib/prayerInstant": instants, "../lib/storage": { storage },
    }),
    "../i18n": { getStrings: () => ({ sunriseTitle: "Sunrise", sunriseBody: "Sunrise", channelPrayer: "Prayer", channelDaily: "Daily", dailyVerse: "Verse", dailyDua: "Dua" }), fmt: () => "Prayer body", getLang: () => "tr" },
    "../i18n/strings/notifications": {}, "../i18n/strings/prayerNames": {},
    "./timeZone": { deviceTimeZone: () => ZONE },
    "./prayerInstant": { ...instants, intlZoneSupported: () => options.intl !== false },
    "./diyanetPrayer": {
      getDiyanetDays: async () => new Map(),
      getManualCity: async () => options.automatic ? null : { ...city, tz: options.zone ?? city.tz },
      resolveDiyanetCity: async () => options.noCity ? null : { ...city, tz: options.zone ?? city.tz },
      prayerCityStampPart: async () => options.noCity ? "-" : `${options.automatic ? "c" : "m"}${city.id}`,
      roundCoord2: (n: number) => Math.round(n * 100) / 100,
    },
    "./diyanetPrayerDeps": { diyanetDeps: () => ({}), deviceOffsetMin: () => 180,
      localYmdStr: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` },
    "./prayerDayRepositoryDeps": { getPrayerDayRepository: () => repository },
    "./notifVersePick": { dedupeVerses: (list: unknown[]) => list.filter(Boolean), pickFromPool: (pool: unknown[]) => pool[0] ?? null },
    "../../modules/exact-alarm": { canScheduleExactAlarms: () => true },
  };
  const source = readFileSync(new URL("./namazNotifications.ts", import.meta.url), "utf8");
  const contextDeps = load(readFileSync(new URL("./prayerContextDeps.ts", import.meta.url), "utf8"), dependencies);
  const app = load(source + "\nexport { buildPrayerNotifications, buildDailyVerseNotifications, computeGapSlots };", {
    ...dependencies, "./prayerContextDeps": contextDeps,
  });
  const legacy = load(readFileSync(new URL("./__fixtures__/namazNotificationsLegacy.ts.txt", import.meta.url), "utf8"), dependencies);
  return { app, legacy, calendarFetch, urls, values, writes, scheduled, channels, deletedChannels, contexts, cachedReads, emit: (event: any) => listeners.forEach(fn => fn(event)),
    counts: () => ({ cancels, subscribes, fills }) };
}

async function fixedTime(fn: () => Promise<void>, now = NOW) {
  const previous = process.env.TZ;
  process.env.TZ = ZONE;
  const NativeDate = Date;
  globalThis.Date = class extends NativeDate {
    constructor(value?: any) { super(value === undefined ? now : value); }
    static now() { return now; }
  } as DateConstructor;
  try { await fn(); } finally { globalThis.Date = NativeDate; if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
}

test("vakitler (Güneş dahil) timeSensitive ve tek satır aralıklı; günlük ayet/dua active varsayılanında", async () => fixedTime(async () => {
  for (const verseMeal of [undefined, "Kısa meal", "a".repeat(151)]) {
    const h = setup(fixtures[0], { verseMeal });
    const days = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
    const jobs = await h.app.buildPrayerNotifications(days);
    assert.equal(jobs.length, 42);
    assert.equal(jobs.filter((job: any) => job.content.title === "Sunrise").length, 7);
    for (const { content } of jobs) {
      assert.equal(content.interruptionLevel, "timeSensitive");
      assert.deepEqual(content.data, verseMeal ? { route: "/namaz", open: "/ayah/1/1" } : { route: "/namaz" });
      assert.equal(content.body.includes("\n\n"), false);
      const base = content.title === "Sunrise" ? "Sunrise" : "Prayer body";
      assert.equal(content.body, base + (verseMeal ? `\n📖 ${verseMeal.slice(0, 150)}${verseMeal.length > 150 ? "…" : ""}` : ""));
    }
  }
  for (const dailyRepeating of [false, true]) {
    const h = setup(fixtures[0], { dailyRepeating });
    const days = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
    const jobs = await h.app.buildDailyVerseNotifications(days);
    assert.equal(jobs.length, dailyRepeating ? 2 : 14);
    for (const job of jobs) {
      assert.equal(Object.hasOwn(job.content, "interruptionLevel"), false);
      assert.equal(job.trigger.channelId, "gunun-ayeti-v2");
    }
  }
}));

test("Android günlük kanal DEFAULT'a taşınır; eski kanal silme hatası planlamayı engellemez", async () => fixedTime(async () => {
  for (const deleteChannelFail of [false, true]) {
    const h = setup(fixtures[0], { android: true, deleteChannelFail });
    const days = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
    await h.app.applyNotifications({ days, prayer: true, dailyVerse: true });
    assert.deepEqual(h.channels.get("namaz-vakitleri"), {
      name: "Prayer", importance: 4, vibrationPattern: [0, 250, 250, 250], lightColor: "#059669",
    });
    assert.deepEqual(h.channels.get("gunun-ayeti-v2"), { name: "Daily", importance: 3, lightColor: "#059669" });
    assert.deepEqual(h.deletedChannels, ["gunun-ayeti"]);
    assert.equal(h.scheduled.length, 56);
  }
}));

test("Android günlük kanal geçişi eski kanalın kısık/kapalı önemini korur, yükseltmez", async () => fixedTime(async () => {
  for (const [legacy, expected] of [[1, 1], [0, 0], [4, 3]] as const) {
    const h = setup(fixtures[0], { android: true, legacyDailyImportance: legacy });
    const days = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
    await h.app.applyNotifications({ days, prayer: true, dailyVerse: true });
    assert.equal(h.channels.get("gunun-ayeti-v2").importance, expected);
    assert.deepEqual(h.deletedChannels, ["gunun-ayeti"]);
  }
}));

for (const city of fixtures) test(`${city.name}: 7-day Diyanet triggers and gap epochs match pre-migration code to 0 ms`, async () => fixedTime(async () => {
  const { app, legacy } = setup(city);
  // Original Diyanet branch: source date + device wall times + raw ISO instants.
  const oldDays = city.days.map(day => ({ date: new Date(`${day.sourceDate}T00:00:00+03:00`),
    times: Object.fromEntries(instants.PRAYER_KEYS.map((key, i) => [key, Object.values(day.rawIso)[i].slice(11, 16)])),
    at: instants.instantsFromDiyanetIso(day.rawIso),
  }));
  const days = await app.fetchPrayerDays(city.lat, city.lon);
  assert.equal(days.length, 7);
  const epochs = (jobs: any[]) => jobs.map(job => job.trigger.date.getTime());
  const oldEpochs = epochs(await legacy.buildPrayerNotifications(oldDays));
  assert.equal(oldEpochs.length, 42);
  assert.deepEqual(epochs(await app.buildPrayerNotifications(days)), oldEpochs);
  assert.equal(oldEpochs[0], Date.parse(city.days[0].rawIso.imsak) + 120_000);
  const gaps = (input: any[], compute: any) => input.flatMap(day => compute(day.times).map((slot: any) => {
    const at = new Date(day.date); at.setHours(slot.hour, slot.minute, 0, 0); return at.getTime();
  }));
  assert.deepEqual(gaps(days, app.computeGapSlots), gaps(oldDays, legacy.computeGapSlots));
  assert.equal(gaps(days, app.computeGapSlots).length, 14);
}));

test("upgrade bursts enqueue exactly one reschedule; other cities and non-upgrades are ignored", async () => fixedTime(async () => {
  const h = setup();
  await h.app.ensureNotificationsFresh();
  await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
  assert.equal(h.counts().subscribes, 1);
  assert.equal(h.counts().cancels, 1);
  h.emit({ cityKey: "m9206", upgradedToDiyanet: true });
  h.emit({ cityKey: "m9541", upgradedToDiyanet: false });
  for (let i = 0; i < 7; i++) h.emit({ cityKey: "m9541", upgradedToDiyanet: true });
  await new Promise(resolve => setTimeout(resolve, 20));
  await h.app.ensureNotificationsFresh({ interactive: false });
  assert.equal(h.counts().cancels, 2);
}));

test("v1 offline rebuild leaves existing native alarms and success stamp unwritten", async () => fixedTime(async () => {
  const h = setup(fixtures[0], { fail: true });
  h.values.set("namazNotifPlanCacheV1", { version: 1 });
  h.values.set("namazNotifSchedDay", "old-v1-stamp");
  h.scheduled.push({ identifier: "existing-alarm" });
  await h.app.ensureNotificationsFresh();
  assert.equal(h.counts().cancels, 0);
  assert.deepEqual(h.scheduled, [{ identifier: "existing-alarm" }]);
  assert.equal(h.values.has("namazNotifSchedDay"), false);
  assert.equal(h.writes.includes("namazNotifSchedDay"), false);
  assert.equal(h.writes.includes(recovery.PLAN_CACHE_KEY), false);
}));

test("successful v2 stamp retains its city and source and changes with repository revision", async () => fixedTime(async () => {
  const city = { ...fixtures[0], days: fixtures[0].days.map(day => ({ ...day, rawIso: { ...day.rawIso } })) };
  const h = setup(city);
  await h.app.ensureNotificationsFresh();
  const before = h.values.get("namazNotifSchedDay");
  assert.match(before, /\|m9541\|repo2:diyanet:/);
  assert.equal(h.values.get(recovery.PLAN_CACHE_KEY).version, 2);
  city.days[0].rawIso.imsak = "2026-11-18T06:26:00+03:00";
  await h.app.rescheduleNotifications();
  const after = h.values.get("namazNotifSchedDay");
  assert.notEqual(after, before);
  assert.equal(h.values.get(recovery.PLAN_CACHE_KEY).stamp, after);
}));

test("automatic and geo contexts use existing coordinates; geo keys never persist", async () => fixedTime(async () => {
  for (const noCity of [false, true]) {
    const h = setup(fixtures[0], { automatic: true, noCity });
    h.values.set("lastKnownCoords", { lat: 41.0082, lng: 28.9784 });
    await h.app.ensureNotificationsFresh();
    assert.equal(h.contexts[0].cityKey, noCity ? "geo:41.01,28.98" : "c9541");
    assert.equal(h.contexts[0].lat, 41.0082);
    assert.equal(h.contexts[0].lon, 28.9784);
    assert.equal(JSON.stringify([...h.values]).includes("geo:"), false);
  }
}));

test("geo widget fallback: mevcut şehir korunur, [-1..+14] okunur ve bildirim günleri değişmez", async () => fixedTime(async () => {
  const h = setup(fixtures[0], { automatic: true, noCity: true, aladhan: true });
  const before = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
  assert.equal(h.values.has("prayerWidgetFallbackV1"), false);
  assert.equal(h.cachedReads.length, 0);
  h.values.set("prayerWidgetFallbackV1", JSON.stringify({
    v: 1, city: "Berlin", tz: ZONE, writtenAtMs: NOW - 1000,
    records: [{ sourceDate: "2026-11-18", cityKey: "fallback", cityTimeZone: ZONE,
      source: "aladhan", revision: "fallback", fetchedAt: NOW - 1000, hijri: null, atMs: before[0].at }],
  }));
  const after = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
  assert.deepEqual(after, before);
  assert.deepEqual(h.cachedReads, [Array.from({ length: 16 }, (_, i) => instants.addDaysYmd("2026-11-18", i - 1))]);
  const json = h.values.get("prayerWidgetFallbackV1");
  const snapshot = JSON.parse(json);
  assert.equal(snapshot.city, "Berlin");
  assert.equal(snapshot.writtenAtMs, NOW);
  assert.equal(snapshot.records.length, 7);
  assert.ok(snapshot.records.every((r: any) => r.cityKey === "fallback" && r.source === "aladhan"));
  assert.equal(json.includes("geo:"), false);
  assert.equal(json.includes("41.01"), false);
  assert.equal(json.includes("28.98"), false);
}));

test("different city zone requests previous day; unsupported Intl uses device zone", async () => fixedTime(async () => {
  for (const intl of [true, false]) {
    const h = setup(fixtures[0], { zone: "America/New_York", intl });
    await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
    assert.equal(h.contexts[0].dates.length, intl ? 8 : 7);
    assert.equal(h.contexts[0].cityTimeZone, intl ? "America/New_York" : ZONE);
  }
}));

test("previous source-day carry retains its epoch and +2-minute trigger", async () => fixedTime(async () => {
  const city = { ...fixtures[0], days: [{ sourceDate: "2026-11-17", rawIso: {
    imsak: "2026-11-17T05:00:00-05:00", gunes: "2026-11-17T07:00:00-05:00",
    ogle: "2026-11-17T12:00:00-05:00", ikindi: "2026-11-17T15:00:00-05:00",
    aksam: "2026-11-17T17:00:00-05:00", yatsi: "2026-11-17T23:30:00-05:00",
  } }, ...fixtures[0].days] };
  const h = setup(city, { zone: "America/New_York" });
  const days = await h.app.fetchPrayerDays(city.lat, city.lon);
  const previous = instants.instantsFromDiyanetIso(city.days[0].rawIso)!;
  assert.deepEqual(days[0].carry, instants.futureCarry(previous, NOW, 2));
  const epochs = (jobs: any[]) => jobs.map(job => job.trigger.date.getTime());
  const actual = epochs(await h.app.buildPrayerNotifications(days));
  assert.deepEqual(actual, epochs(await h.legacy.buildPrayerNotifications(days)));
  assert.ok(actual.includes(previous.Isha + 120_000));
}));

test("production repository dependencies preserve local setHours when Intl is unsupported", async () => fixedTime(async () => {
  const depsModule = load(readFileSync(new URL("./prayerDayRepositoryDeps.ts", import.meta.url), "utf8"), {
    "./diyanetPrayerDeps": {}, "./prayerDayRepositoryAdapters": {},
    "./prayerDayRepository": {}, "./storage": {},
    "./prayerInstant": { ...instants, intlZoneSupported: () => false },
  });
  const convert = depsModule.prayerDayRepositoryDeps().instants.instantsFromWallTimes;
  const times = { Fajr: "05:30", Sunrise: "07:00", Dhuhr: "12:30", Asr: "15:00", Maghrib: "18:00", Isha: "00:30" };
  const at = convert("2026-11-18", times, ZONE);
  for (const key of instants.PRAYER_KEYS) {
    const old = new Date("2026-11-18T00:00:00");
    const [h, m] = times[key].split(":").map(Number);
    old.setHours(h, m, 0, 0);
    assert.equal(at[key], old.getTime());
  }
  assert.equal(convert("2026-11-18", { ...times, Fajr: "bad" }, ZONE), null);
}));


for (const start of ["2026-11-18", "2026-11-30"]) test(`Aladhan fallback ${start}: master URLs and trigger epochs match across months`, async () => {
  const now = Date.parse(`${start}T00:00:00+03:00`);
  await fixedTime(async () => {
    const city = { ...fixtures[0], days: fixtures[0].days.map((day, i) => {
      const sourceDate = instants.addDaysYmd(start, i);
      return { sourceDate, rawIso: Object.fromEntries(Object.entries(day.rawIso).map(([key, iso]) =>
        [key, sourceDate + iso.slice(10)])) };
    }) };
    const h = setup(city, { aladhan: true, now });
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = h.calendarFetch;
    try {
      const oldDays = await h.legacy.fetchPrayerDays(city.lat, city.lon);
      const oldUrls = h.urls.splice(0);
      const newDays = await h.app.fetchPrayerDays(city.lat, city.lon);
      assert.equal(newDays.length, 7);
      assert.equal(oldUrls.length, start.endsWith("30") ? 2 : 1);
      // Boolean comparisons keep coordinate values out of assertion logs.
      assert.ok(JSON.stringify(h.urls.slice().sort()) === JSON.stringify(oldUrls.sort()));
      for (const url of h.urls) {
        const params = new URL(url).searchParams;
        assert.ok(params.get("latitude") === `${city.lat}` && params.get("longitude") === `${city.lon}`);
      }
      const epochs = (jobs: any[]) => jobs.map(job => job.trigger.date.getTime());
      const expected = epochs(await h.legacy.buildPrayerNotifications(oldDays));
      assert.equal(expected.length, 42);
      assert.deepEqual(epochs(await h.app.buildPrayerNotifications(newDays)), expected);
    } finally { globalThis.fetch = nativeFetch; }
  }, now);
});

async function legacyRestoreFixture(h: ReturnType<typeof setup>, wallOnly = false) {
  const days = await h.app.fetchPrayerDays(fixtures[0].lat, fixtures[0].lon);
  const requests = await h.app.buildPrayerNotifications(days);
  const value = { version: 1, stamp: "2026-11-18|legacy", prayer: true, dailyVerse: false,
    days: days.map((day: any) => wallOnly ? { date: day.date, times: day.times } : day), requests };
  h.values.set(recovery.LEGACY_PLAN_CACHE_KEY, JSON.stringify(value));
  return requests;
}

test("first v2 native failure restores v1, including legacy Aladhan wall-only days", async () => fixedTime(async () => {
  for (const wallOnly of [false, true]) {
    const h = setup(fixtures[0], { scheduleFail: true });
    const previous = await legacyRestoreFixture(h, wallOnly);
    await h.app.ensureNotificationsFresh();
    assert.equal(h.counts().cancels, 2);
    assert.deepEqual(h.scheduled, previous);
    assert.equal(h.values.has(recovery.PLAN_CACHE_KEY), false);
    assert.equal(h.values.has(recovery.LEGACY_PLAN_CACHE_KEY), true);
    await h.app.ensureNotificationsFresh();
    assert.equal(h.values.get(recovery.PLAN_CACHE_KEY).version, 2);
    assert.equal(h.values.has(recovery.LEGACY_PLAN_CACHE_KEY), false);
  }
}));

test("v1 survives failed v2 storage write and request construction never cancels alarms", async () => fixedTime(async () => {
  const h = setup(fixtures[0], { writeFail: true });
  await legacyRestoreFixture(h);
  await h.app.ensureNotificationsFresh();
  assert.equal(h.values.has(recovery.LEGACY_PLAN_CACHE_KEY), true);
  assert.equal(h.values.has(recovery.PLAN_CACHE_KEY), false);
  const incomplete = setup(fixtures[0], { contentFail: true });
  incomplete.scheduled.push({ identifier: "existing" });
  await incomplete.app.ensureNotificationsFresh();
  assert.equal(incomplete.counts().cancels, 0);
  assert.deepEqual(incomplete.scheduled, [{ identifier: "existing" }]);
}));

test("offline boundary planner uses today's partial window under its existing sufficiency rule", async () => {
  const now = Date.parse("2026-11-30T00:00:00+03:00");
  await fixedTime(async () => {
    const city = { ...fixtures[0], days: [{ sourceDate: "2026-11-30", rawIso: Object.fromEntries(
      Object.entries(fixtures[0].days[0].rawIso).map(([key, iso]) => [key, "2026-11-30" + iso.slice(10)])) }] };
    const options = { now, fail: false };
    const h = setup(city, options);
    await h.app.fetchPrayerDays(city.lat, city.lon);
    options.fail = true;
    await h.app.ensureNotificationsFresh();
    assert.equal(h.counts().cancels, 1);
    assert.equal(h.scheduled.length, 6);
  }, now);
});
