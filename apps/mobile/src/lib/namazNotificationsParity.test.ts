import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import * as instants from "./prayerInstant.ts";
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

function setup(city = fixtures[0], options: { fail?: boolean; automatic?: boolean; noCity?: boolean; zone?: string; intl?: boolean } = {}) {
  const values = new Map<string, any>([["namazNotifEnabled", "1"], ["dailyVerseNotifEnabled", "0"]]);
  const writes: string[] = [];
  let cancels = 0, subscribes = 0, fills = 0;
  const scheduled: any[] = [];
  const listeners: ((event: any) => void)[] = [];
  const repo = createPrayerDayRepository({
    instants, nowMs: () => NOW,
    storageGet: async key => values.get(key) ?? null,
    storageSet: async (key, json) => { values.set(key, json); },
    fetchDiyanetMonth: async () => { fills++; if (options.fail) throw Error("offline"); return city.days; },
    fetchAladhanMonth: async () => { throw Error("offline"); },
  });
  const contexts: any[] = [];
  const repository = { ...repo,
    ensureDays: async (context: any, dates: string[]) => { contexts.push({ ...context, dates }); return repo.ensureDays(context, dates); },
    subscribe: (fn: (event: any) => void) => { subscribes++; listeners.push(fn); return repo.subscribe(fn); },
  };
  const storage = {
    getString: async (key: string) => values.get(key) ?? null,
    getJSON: async (key: string) => values.get(key) ?? null,
    setString: async (key: string, value: any) => { writes.push(key); values.set(key, value); },
    setJSON: async (key: string, value: any) => { writes.push(key); values.set(key, value); },
    remove: async (key: string) => { values.delete(key); },
  };
  const dependencies = {
    "./serialQueue": queue, "./notificationRecovery": recovery,
    "../tour/overlayBusy": { withOverlayBusy: (fn: any) => fn() },
    "expo-notifications": {
      SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily" },
      cancelAllScheduledNotificationsAsync: async () => { cancels++; scheduled.length = 0; },
      scheduleNotificationAsync: async (request: any) => { scheduled.push(request); return "id"; },
    },
    "expo-device": { isDevice: true }, "expo-location": { getForegroundPermissionsAsync: async () => ({ status: "denied" }) },
    "react-native": { Platform: { OS: "ios" } },
    "./api": { api: { notifications: { namazVerse: async () => null } } },
    "./storage": { storage, STORAGE_KEYS: {} }, "./englishMeal": { localizedMeal: () => "" },
    "../i18n": { getStrings: () => ({}), fmt: () => "", getLang: () => "tr" },
    "../i18n/strings/notifications": {}, "../i18n/strings/prayerNames": {},
    "./timeZone": { deviceTimeZone: () => ZONE },
    "./prayerInstant": { ...instants, intlZoneSupported: () => options.intl !== false },
    "./diyanetPrayer": {
      getManualCity: async () => options.automatic ? null : { ...city, tz: options.zone ?? city.tz },
      resolveDiyanetCity: async () => options.noCity ? null : { ...city, tz: options.zone ?? city.tz },
      prayerCityStampPart: async () => options.noCity ? "-" : `${options.automatic ? "c" : "m"}${city.id}`,
      roundCoord2: (n: number) => Math.round(n * 100) / 100,
    },
    "./diyanetPrayerDeps": { diyanetDeps: () => ({}), deviceOffsetMin: () => 180,
      localYmdStr: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` },
    "./prayerDayRepositoryDeps": { getPrayerDayRepository: () => repository },
    "./notifVersePick": { dedupeVerses: () => [], pickFromPool: () => null },
    "../../modules/exact-alarm": { canScheduleExactAlarms: () => true },
  };
  const source = readFileSync(new URL("./namazNotifications.ts", import.meta.url), "utf8");
  const app = load(source + "\nexport { buildPrayerNotifications, computeGapSlots };", dependencies);
  const legacy = load(readFileSync(new URL("./__fixtures__/namazNotificationsLegacy.ts.txt", import.meta.url), "utf8"), dependencies);
  return { app, legacy, values, writes, scheduled, contexts, emit: (event: any) => listeners.forEach(fn => fn(event)),
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
