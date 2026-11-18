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

test("Aladhan transport uses the notification method parameters, rounded location and timezone", async () => {
  for (const cityTimeZone of ["Europe/Istanbul", "Europe/Berlin"]) {
    const c = { ...context, cityTimeZone };
    let calls = 0;
    const fakeFetch: typeof fetch = async (url, init) => {
      calls++;
      const actual = new URL(String(url));
      assert.equal(actual.origin + actual.pathname, "https://api.aladhan.com/v1/calendar/2026/6");
      const expected = new URLSearchParams(aladhanMethodQuery(cityTimeZone));
      expected.set("latitude", String(Math.round(c.lat * 100) / 100));
      expected.set("longitude", String(Math.round(c.lon * 100) / 100));
      expected.set("timezonestring", cityTimeZone);
      assert.deepEqual([...actual.searchParams].sort(), [...expected].sort());
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
      if (path.startsWith("/vakit/sehir?")) {
        // Compare privately; no coordinate values are printed or logged.
        const params = new URL(`https://example.invalid${path}`).searchParams;
        assert.ok(params.get("lat") === String(Math.round(context.lat * 100) / 100));
        assert.ok(params.get("lon") === String(Math.round(context.lon * 100) / 100));
        assert.equal(params.get("off"), "180");
        return { status: 200, body: { city } };
      }
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
  const inputs = await fetchDiyanetMonthInputs(context, "2026-02", deps);
  assert.deepEqual(inputs, [{ sourceDate: date, rawIso: iso, cityDisplayName: city.name,
    hijri: { day: 11, monthNumber: 9, year: 1447 } }]);
  assert.ok("rawIso" in inputs[0]);
  assert.equal(instantsFromDiyanetIso(inputs[0].rawIso)?.Dhuhr, Date.parse(iso.ogle));
  assert.deepEqual(calls.map(({ timeout }) => timeout), [6000, 8000]);
  assert.deepEqual(await fetchDiyanetMonthInputs(context, "2026-02", deps), inputs);
  assert.equal(calls.length, 2);
});

test("Diyanet unavailable city returns no inputs", async () => {
  assert.deepEqual(await fetchDiyanetMonthInputs(context, "2026-02", {
    getJson: async () => { throw new Error("offline"); },
    readStore: async () => null, writeStore: async () => {}, nowMs: () => 0,
  }), []);
});
