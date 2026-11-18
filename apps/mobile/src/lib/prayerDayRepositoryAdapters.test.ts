import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import type { PrayerContext } from "./prayerDayRepository.ts";
import type { DiyanetPrayerDeps } from "./diyanetPrayer.ts";
import { adjustHighLatitude, aladhanMethodQuery } from "./prayerMethod.ts";
import { instantsFromDiyanetIso, instantsFromWallTimes } from "./prayerInstant.ts";

// App imports use Metro's extensionless resolution. Resolve only this adapter's
// local imports for Node, and remove the hook before running any tests.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith("/prayerDayRepositoryAdapters.ts") &&
    /^\.\/\w+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { aladhanCalendarInputs, fetchAladhanMonthInputs, fetchDiyanetMonthInputs } =
  await import("./prayerDayRepositoryAdapters.ts");
hooks.deregister();

const context: PrayerContext = {
  cityKey: "test", lat: 41.01234, lon: 28.98765, cityTimeZone: "Europe/Istanbul",
  deviceTimeZone: "America/New_York", offMin: 180, nowMs: 0,
};
const wall = { Fajr: "02:00", Sunrise: "04:30", Dhuhr: "13:05", Asr: "17:00", Maghrib: "21:30", Isha: "23:59" };
const calendar = { data: [{ date: { gregorian: { date: "21-06-2026" } },
  timings: Object.fromEntries(Object.entries(wall).map(([key, value]) => [key, `${value} (+03)`])) }] };

test("Aladhan maps calendar dates and strips suffixes, keeping city wall times", () => {
  const inputs = aladhanCalendarInputs(calendar, context);
  assert.deepEqual(inputs, [{ sourceDate: "2026-06-21", times: wall }]);
  assert.ok("times" in inputs[0]);
  const at = instantsFromWallTimes(inputs[0].sourceDate, inputs[0].times, context.cityTimeZone);
  assert.equal(at?.Dhuhr, Date.parse("2026-06-21T13:05:00+03:00"));
});

test("Aladhan adjusts summer twilight above 44 degrees, including the southern hemisphere", () => {
  for (const [lat, date] of [[52, "21-06-2026"], [-52, "21-12-2026"]] as const) {
    const month = lat > 0 ? 6 : 12;
    const body = { data: [{ date: { gregorian: { date } }, timings: wall }] };
    const [input] = aladhanCalendarInputs(body, { ...context, lat, cityTimeZone: "Europe/Berlin" });
    assert.ok("times" in input);
    assert.deepEqual(input.times, adjustHighLatitude(wall, lat,
      { year: 2026, month, day: 21 }, "Europe/Berlin"));
    assert.notEqual(input.times.Fajr, wall.Fajr);
    assert.notEqual(input.times.Isha, wall.Isha);
    assert.equal(input.times.Dhuhr, wall.Dhuhr);
  }
});

test("Europe/Istanbul remains exempt at high latitude; low latitude stays unchanged", () => {
  for (const c of [{ ...context, lat: 52 }, { ...context, lat: 43.9, cityTimeZone: "Europe/Berlin" }]) {
    assert.deepEqual(aladhanCalendarInputs(calendar, c), [{ sourceDate: "2026-06-21", times: wall }]);
  }
});

test("Aladhan ignores malformed calendar entries", () => {
  for (const body of [null, {}, { data: null }, { data: [null, {},
    { date: { gregorian: { date: "31-02-2026" } }, timings: wall }] }]) {
    assert.deepEqual(aladhanCalendarInputs(body, context), []);
  }
});

test("Aladhan transport uses the notification method parameters, raw location and timezone", async () => {
  for (const cityTimeZone of ["Europe/Istanbul", "Europe/Berlin"]) {
    const c = { ...context, cityTimeZone };
    let calls = 0;
    const fakeFetch: typeof fetch = async (url, init) => {
      calls++;
      const actual = new URL(String(url));
      assert.equal(actual.origin + actual.pathname, "https://api.aladhan.com/v1/calendar/2026/6");
      const expected = new URLSearchParams(aladhanMethodQuery(cityTimeZone));
      expected.set("latitude", String(c.lat));
      expected.set("longitude", String(c.lon));
      expected.set("timezonestring", cityTimeZone);
      assert.ok(JSON.stringify([...actual.searchParams].sort()) === JSON.stringify([...expected].sort()));
      assert.deepEqual(init?.headers, { Accept: "application/json" });
      assert.ok(init?.signal instanceof AbortSignal);
      return new Response(JSON.stringify(calendar));
    };
    assert.deepEqual(await fetchAladhanMonthInputs(c, "2026-06", fakeFetch), aladhanCalendarInputs(calendar, c));
    assert.equal(calls, 1);
  }
});

test("Aladhan transport propagates network failures without extra requests", async () => {
  let calls = 0;
  await assert.rejects(fetchAladhanMonthInputs(context, "2026-06", async () => {
    calls++;
    throw new Error("offline");
  }), /offline/);
  assert.equal(calls, 1);
});

test("Diyanet month reuses city/month requests, timeouts and cache, retaining raw ISO and hijri", async () => {
  const date = "2026-02-28";
  const iso = Object.fromEntries(["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"]
    .map((key, i) => [key, `${date}T${Object.values(wall)[i]}:00+03:00`]));
  const city = { id: 34, name: "Test City", state: "", country: "Türkiye", tz: "Europe/Istanbul" };
  const store = new Map<string, unknown>();
  const calls: { path: string; timeout: number }[] = [];
  const deps: DiyanetPrayerDeps = {
    getJson: async (path, timeout) => {
      calls.push({ path, timeout });
      assert.equal(path, "/vakit?cityId=34&month=2026-02");
      return { status: 200, body: { complete: true, days: [
        { date, times: iso, hijri: { day: 11, month: 9, year: 1447 } },
        { date: "2026-02-27", times: {} },
        { date: "2026-03-01", times: iso },
      ] } };
    },
    readStore: async (key) => store.get(key) ?? null,
    writeStore: async (key, value) => { store.set(key, value); },
    nowMs: () => Date.parse("2026-02-01T00:00:00Z"),
  };
  const inputs = await fetchDiyanetMonthInputs({ ...context, cityKey: "m34", diyanetCity: city }, "2026-02", deps);
  assert.deepEqual(inputs, [{ sourceDate: date, rawIso: iso, cityDisplayName: city.name,
    hijri: { day: 11, monthNumber: 9, year: 1447 } }]);
  assert.ok("rawIso" in inputs[0]);
  assert.equal(instantsFromDiyanetIso(inputs[0].rawIso)?.Dhuhr, Date.parse(iso.ogle));
  assert.deepEqual(calls.map(({ timeout }) => timeout), [8000]);
  assert.deepEqual(await fetchDiyanetMonthInputs({ ...context, cityKey: "m34", diyanetCity: city }, "2026-02", deps), inputs);
  assert.equal(calls.length, 1);
});

test("Diyanet unavailable city returns no inputs", async () => {
  assert.deepEqual(await fetchDiyanetMonthInputs(context, "2026-02", {
    getJson: async () => { throw new Error("offline"); },
    readStore: async () => null, writeStore: async () => {}, nowMs: () => 0,
  }), []);
});


test("Diyanet binds both manual and automatic contexts despite a global city switch", async () => {
  const city = { id: 34, name: "A", state: "", country: "T?rkiye", tz: "Europe/Istanbul" };
  const rawTimes = Object.fromEntries(["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"]
    .map((key, i) => [key, `2026-06-21T${Object.values(wall)[i]}:00+03:00`]));
  const deps: DiyanetPrayerDeps = {
    readStore: async key => {
      assert.notEqual(key, "diyanetManualCityV1", "must not re-read the global selection B");
      return null;
    },
    writeStore: async () => {}, nowMs: () => 0,
    getJson: async path => {
      assert.equal(path, "/vakit?cityId=34&month=2026-06");
      return { status: 200, body: { complete: true, days: [{ date: "2026-06-21", times: rawTimes }] } };
    },
  };
  for (const prefix of ["m", "c"]) {
    const bound = { ...context, cityKey: `${prefix}34`, diyanetCity: city };
    assert.equal((await fetchDiyanetMonthInputs(bound, "2026-06", deps)).length, 1);
    assert.deepEqual(await fetchDiyanetMonthInputs({ ...bound, cityKey: `${prefix}6` }, "2026-06", deps), []);
  }
});

test("Aladhan maps numeric Hijri fields and omits invalid Hijri without losing prayer times", () => {
  for (const [raw, expected] of [
    [{ day: "11", month: { number: 9 }, year: "1447" }, { day: 11, monthNumber: 9, year: 1447 }],
    ...[null, {}, { day: 31, month: { number: 9 }, year: 1447 },
      { day: 1, month: { number: 13 }, year: 1447 }, { day: 1.5, month: { number: 1 }, year: 1447 },
      { day: 1, month: { number: 1 }, year: 0 }].map(h => [h, undefined]),
  ]) {
    const input = aladhanCalendarInputs({ data: [{ ...calendar.data[0],
      date: { ...calendar.data[0].date, hijri: raw } }] }, context)[0];
    assert.deepEqual(input.hijri, expected);
    assert.ok("times" in input);
    assert.deepEqual(input.times, wall);
  }
});
