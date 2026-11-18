import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrayerDayRepository } from "./prayerDayRepository.ts";
import type { PrayerContext, PrayerDayEvent, PrayerDayInput, PrayerDayRepoDeps } from "./prayerDayRepository.ts";
import { PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso, instantsFromWallTimes } from "./prayerInstant.ts";

const DATE = "2026-11-18";
const MONTH = "2026-11";
const CONTEXT: PrayerContext = {
  cityKey: "m34", lat: 41, lon: 29, cityTimeZone: "Europe/Istanbul",
  deviceTimeZone: "Europe/Istanbul", offMin: 180, nowMs: 100,
};
const WALL = { Fajr: "05:30", Sunrise: "07:00", Dhuhr: "12:30", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" };
const ISO = Object.fromEntries(["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"].map((key, i) =>
  [key, `${DATE}T${Object.values(WALL)[i]}:00+03:00`]));
const DIYANET: PrayerDayInput[] = [{ sourceDate: DATE, rawIso: ISO }];
const ALADHAN: PrayerDayInput[] = [{ sourceDate: DATE, times: { ...WALL, Fajr: "05:40" } }];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(overrides: Partial<PrayerDayRepoDeps> = {}) {
  let stored: string | null = null;
  const deps: PrayerDayRepoDeps = {
    instants: { PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso, instantsFromWallTimes },
    fetchDiyanetMonth: async () => DIYANET,
    fetchAladhanMonth: async () => [],
    storageGet: async () => stored,
    storageSet: async (key, json) => { assert.equal(key, "prayerDayRepoV1"); stored = json; },
    nowMs: () => 123,
    ...overrides,
  };
  return { deps, repo: createPrayerDayRepository(deps), stored: () => stored };
}

test("singleflight: two concurrent consumers share one request per source and month", async () => {
  const primary = deferred<readonly PrayerDayInput[]>();
  let calls = 0;
  let fallbackCalls = 0;
  const { repo } = setup({ fetchDiyanetMonth: () => { calls++; return primary.promise; },
    fetchAladhanMonth: async () => { fallbackCalls++; return []; } });
  const one = repo.getDayTimes(CONTEXT, DATE);
  const two = repo.ensureDays(CONTEXT, [DATE]);
  primary.resolve(DIYANET);
  const [day, days] = await Promise.all([one, two]);
  assert.equal(calls, 1);
  assert.equal(fallbackCalls, 1);
  assert.equal(day?.revision, days.get(DATE)?.revision);
});

test("singleflight clears both source locks after rejection", async () => {
  let now = 0;
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const { repo } = setup({
    nowMs: () => now,
    fetchDiyanetMonth: async () => { primaryCalls++; throw new Error("offline"); },
    fetchAladhanMonth: async () => { if (++fallbackCalls === 1) throw new Error("offline"); return ALADHAN; },
  });
  await assert.rejects(repo.getDayTimes(CONTEXT, DATE), /Prayer month unavailable/);
  now += 10 * 60 * 1000;
  assert.equal((await repo.getDayTimes(CONTEXT, DATE))?.source, "aladhan");
  assert.equal(primaryCalls, 2);
  assert.equal(fallbackCalls, 2);
});

test("fully cached Diyanet month performs no fetches on a second ensureMonth", async () => {
  const days: PrayerDayInput[] = [];
  for (let date = `${MONTH}-01`; date.startsWith(`${MONTH}-`); date = addDaysYmd(date, 1)) {
    days.push({ sourceDate: date, times: WALL });
  }
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const { repo } = setup({
    fetchDiyanetMonth: async () => { primaryCalls++; return days; },
    fetchAladhanMonth: async () => { fallbackCalls++; return []; },
  });
  await repo.ensureMonth(CONTEXT, MONTH);
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 0);
  await repo.ensureMonth(CONTEXT, MONTH);
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 0);
});

test("Diyanet failure backs off for ten minutes then upgrades a fully cached Aladhan month", async () => {
  const days: PrayerDayInput[] = [];
  for (let date = `${MONTH}-01`; date.startsWith(`${MONTH}-`); date = addDaysYmd(date, 1)) {
    days.push({ sourceDate: date, times: WALL });
  }
  let now = 123;
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const { repo } = setup({
    nowMs: () => now,
    fetchDiyanetMonth: async () => {
      if (++primaryCalls === 1) throw new Error("offline");
      return days;
    },
    fetchAladhanMonth: async () => { fallbackCalls++; return days; },
  });
  assert.equal((await repo.getDayTimes(CONTEXT, DATE))?.source, "aladhan");
  now += 10 * 60 * 1000 - 1;
  await repo.ensureMonth(CONTEXT, MONTH);
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 1);
  now++;
  assert.equal((await repo.getDayTimes(CONTEXT, DATE))?.source, "diyanet");
  assert.equal(primaryCalls, 2);
  assert.equal(fallbackCalls, 1);
});

test("hydrate accepts a stored record without hijri as null", async () => {
  const first = setup();
  const original = await first.repo.getDayTimes(CONTEXT, DATE);
  const stored = JSON.parse(first.stored()!);
  delete stored.records[0].hijri;
  const { repo } = setup({
    storageGet: async () => JSON.stringify(stored),
    fetchDiyanetMonth: async () => { throw new Error("offline"); },
    fetchAladhanMonth: async () => { throw new Error("offline"); },
  });
  assert.deepEqual(await repo.getDayTimes(CONTEXT, DATE), { ...original, hijri: null });
});

test("repository module has no value imports", () => {
  const source = readFileSync(new URL("./prayerDayRepository.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^import (?!type)/m);
});

test("Aladhan upgrades to Diyanet; broken listeners do not interrupt delivery; unsubscribe works", async () => {
  let online = false;
  const { repo } = setup({ fetchDiyanetMonth: async () => online ? DIYANET : [], fetchAladhanMonth: async () => ALADHAN });
  const events: PrayerDayEvent[] = [];
  repo.subscribe(() => { throw new Error("consumer failed"); });
  const unsubscribe = repo.subscribe((event) => events.push(event));
  const fallback = await repo.getDayTimes(CONTEXT, DATE);
  online = true;
  const primary = await repo.getDayTimes(CONTEXT, DATE);
  assert.equal(fallback?.source, "aladhan");
  assert.equal(primary?.source, "diyanet");
  assert.notEqual(primary?.revision, fallback?.revision);
  assert.deepEqual(events.map((e) => e.upgradedToDiyanet), [false, true]);
  assert.deepEqual(events[1].dates, [DATE]);
  unsubscribe();
  await repo.getDayTimes({ ...CONTEXT, cityKey: "other" }, DATE);
  assert.equal(events.length, 2);
});

test("late Aladhan cannot overwrite Diyanet, including persisted state", async () => {
  const fallback = deferred<readonly PrayerDayInput[]>();
  const started = deferred<void>();
  let primaryCalls = 0;
  const { repo, stored } = setup({
    fetchDiyanetMonth: async () => ++primaryCalls === 1 ? [] : DIYANET,
    fetchAladhanMonth: () => { started.resolve(); return fallback.promise; },
  });
  const events: PrayerDayEvent[] = [];
  repo.subscribe((event) => events.push(event));
  const first = repo.getDayTimes(CONTEXT, DATE);
  await started.promise;
  const second = repo.getDayTimes(CONTEXT, DATE);
  // Primary commit happens before the second call joins the still pending fallback.
  const committed = deferred<void>();
  const unsubscribe = repo.subscribe(() => committed.resolve());
  await committed.promise;
  unsubscribe();
  fallback.resolve(ALADHAN);
  const days = await Promise.all([first, second]);
  assert.equal(days[0]?.source, "diyanet");
  assert.equal(days[1]?.revision, days[0]?.revision);
  assert.equal(events.length, 1);
  assert.equal(JSON.parse(stored()!).records[0].source, "diyanet");
});

test("cityKey and cityTimeZone isolate cache, requests, and revisions", async () => {
  let calls = 0;
  const { repo } = setup({ fetchDiyanetMonth: async () => { calls++; return []; }, fetchAladhanMonth: async () => ALADHAN });
  const contexts = [CONTEXT, { ...CONTEXT, cityKey: "m06" }, { ...CONTEXT, cityTimeZone: "America/New_York" }];
  const records = await Promise.all(contexts.map((context) => repo.getDayTimes(context, DATE)));
  assert.equal(calls, 3);
  assert.equal(new Set(records.map((r) => r?.revision)).size, 3);
  records.forEach((r, i) => { assert.equal(r?.cityKey, contexts[i].cityKey); assert.equal(r?.cityTimeZone, contexts[i].cityTimeZone); });
  assert.notEqual(records[0]?.atMs.Fajr, records[2]?.atMs.Fajr);
});

test("unchanged instants and source emit no event despite clock or property order changes", async () => {
  const atMs = instantsFromDiyanetIso(ISO)!;
  let now = 1;
  const { repo } = setup({ nowMs: () => now,
    fetchDiyanetMonth: async () => [{ sourceDate: DATE, atMs: Object.fromEntries(Object.entries(atMs).reverse()) as typeof atMs }] });
  const events: PrayerDayEvent[] = [];
  repo.subscribe((event) => events.push(event));
  const first = await repo.getDayTimes(CONTEXT, DATE);
  now++;
  const second = await repo.getDayTimes(CONTEXT, DATE);
  assert.equal(events.length, 1);
  assert.equal(first?.revision, second?.revision);
  assert.notEqual(first?.fetchedAt, second?.fetchedAt);
});

test("corrupt or unknown storage JSON is empty and never throws", async () => {
  for (const json of ["{broken", "null", "[]", "42", '{"version":2,"records":[]}', '{"version":1,"records":[null,{},false]}']) {
    const { repo } = setup({ storageGet: async () => json });
    assert.equal((await repo.getDayTimes(CONTEXT, DATE))?.source, "diyanet");
  }
});

test("Europe/Istanbul atMs exactly matches instantsFromDiyanetIso", async () => {
  const { repo } = setup();
  const record = await repo.getDayTimes(CONTEXT, DATE);
  assert.deepEqual(record?.atMs, instantsFromDiyanetIso(ISO));
  assert.match(record!.revision, /^diyanet:m34:Europe\/Istanbul:[0-9a-f]{8}$/);
  assert.equal(record?.fetchedAt, 123);
  assert.ok(Object.isFrozen(record?.atMs));
});

test("persisted cache wins over fallback when Diyanet is offline; hydration emits no event", async () => {
  const first = setup();
  const original = await first.repo.getDayTimes(CONTEXT, DATE);
  const { repo } = setup({ storageGet: async (key) => { assert.equal(key, "prayerDayRepoV1"); return first.stored(); },
    fetchDiyanetMonth: async () => { throw new Error("offline"); },
    fetchAladhanMonth: async () => { throw new Error("offline"); } });
  const events: PrayerDayEvent[] = [];
  repo.subscribe((event) => events.push(event));
  assert.deepEqual(await repo.getDayTimes(CONTEXT, DATE), original);
  assert.equal(events.length, 0);
});

test("cached Aladhan also takes precedence over a new fallback response", async () => {
  let fallbackCalls = 0;
  const { repo } = setup({ fetchDiyanetMonth: async () => [],
    fetchAladhanMonth: async () => ++fallbackCalls === 1 ? ALADHAN : [{ sourceDate: DATE, times: WALL }] });
  const first = await repo.getDayTimes(CONTEXT, DATE);
  const second = await repo.getDayTimes(CONTEXT, DATE);
  assert.deepEqual(second, first);
});

test("ensureMonth keeps at most 62 records per cityKey, dropping oldest dates across time zones", async () => {
  const { repo, stored } = setup({ fetchDiyanetMonth: async (_context, month) => {
    const days: PrayerDayInput[] = [];
    for (let day = `${month}-01`; day.startsWith(`${month}-`); day = addDaysYmd(day, 1)) {
      days.push({ sourceDate: day, times: WALL });
    }
    return days;
  } });
  for (const month of ["2026-09", "2026-10", MONTH]) await repo.ensureMonth(CONTEXT, month);
  await repo.ensureMonth({ ...CONTEXT, cityTimeZone: "America/New_York" }, MONTH);
  const records = JSON.parse(stored()!).records;
  assert.equal(records.length, 62);
  assert.equal(records.some((r: { sourceDate: string }) => r.sourceDate.startsWith("2026-09")), false);
});


test("offline month boundary returns cached today even when tomorrow is unavailable", async () => {
  const first = setup({ fetchDiyanetMonth: async () => [{ sourceDate: "2026-11-30", times: WALL }] });
  const today = await first.repo.getDayTimes(CONTEXT, "2026-11-30");
  const { repo } = setup({ storageGet: async () => first.stored(),
    fetchDiyanetMonth: async () => { throw Error("offline"); },
    fetchAladhanMonth: async () => { throw Error("offline"); } });
  const days = await repo.ensureDays(CONTEXT, ["2026-11-30", "2026-12-01"]);
  assert.deepEqual([...days], [["2026-11-30", today]]);
  await assert.rejects(repo.ensureDays(CONTEXT, ["2026-12-01"]), /unavailable/);
  assert.deepEqual([...await repo.ensureDays(CONTEXT, [])], []);
});

test("global cap keeps three cities by latest fetch, with at most 62 days each, including hydration", async () => {
  let now = 0;
  const h = setup({ nowMs: () => ++now, fetchDiyanetMonth: async (_c, month) => {
    const days: PrayerDayInput[] = [];
    for (let date = `${month}-01`; date.startsWith(`${month}-`); date = addDaysYmd(date, 1)) days.push({ sourceDate: date, times: WALL });
    return days;
  } });
  for (const cityKey of ["m1", "m2", "m3"]) {
    for (const month of ["2026-09", "2026-10", "2026-11"]) await h.repo.ensureMonth({ ...CONTEXT, cityKey }, month);
  }
  // Refresh city 1 after cities 2 and 3; city 2 should be evicted next.
  await h.repo.ensureMonth({ ...CONTEXT, cityKey: "m1" }, "2026-12");
  await h.repo.ensureMonth({ ...CONTEXT, cityKey: "m4" }, "2026-11");
  const records = JSON.parse(h.stored()!).records;
  assert.deepEqual([...new Set(records.map((r: any) => r.cityKey))].sort(), ["m1", "m3", "m4"]);
  for (const cityKey of ["m1", "m3", "m4"]) assert.ok(records.filter((r: any) => r.cityKey === cityKey).length <= 62);
  const overflow = { ...records[0], cityKey: "old", fetchedAt: -1 };
  const hydrated = setup({ storageGet: async () => JSON.stringify({ version: 1, records: [...records, overflow] }),
    fetchDiyanetMonth: async () => [], fetchAladhanMonth: async () => [] });
  await hydrated.repo.ensureMonth({ ...CONTEXT, cityKey: "m4" }, "2026-12");
  assert.equal(JSON.parse(hydrated.stored()!).records.some((r: any) => r.cityKey === "old"), false);
});
