import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import * as homePrayer from "../lib/homePrayer.ts";
import * as instants from "../lib/prayerInstant.ts";
import * as diyanet from "../lib/diyanetPrayer.ts";
import { createPrayerDayRepository } from "../lib/prayerDayRepository.ts";
import type { PrayerDayRecord } from "../lib/prayerDayRepository.ts";

// Same CJS transpile pattern as apiCache.test.ts: native modules stay out of Node.
function load(native: Record<string, unknown> = {}) {
  const source = readFileSync(new URL("./namazWidgetData.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const modules: Record<string, unknown> = { "../lib/homePrayer": homePrayer, "../lib/prayerInstant": instants, "../lib/diyanetPrayer": diyanet, ...native };
  const mod = { exports: {} };
  new Function("require", "exports", "module", compiled)((id: string) => {
    if (!(id in modules)) throw new Error(`Native module unavailable: ${id}`);
    return modules[id];
  }, mod.exports, mod);
  return mod.exports as typeof import("./namazWidgetData");
}
const api = load();
const wall = { Fajr: "06:12", Sunrise: "07:41", Dhuhr: "12:53", Asr: "15:22", Maghrib: "17:42", Isha: "19:06" };
function day(date: string): PrayerDayRecord {
  return { sourceDate: date, cityKey: "m34", cityTimeZone: "Europe/Istanbul", cityDisplayName: "İstanbul", source: "diyanet", revision: "1",
    atMs: instants.instantsFromWallTimes(date, wall, "Europe/Istanbul")!, hijri: { day: 10, monthNumber: 6, year: 1448 }, fetchedAt: 0 };
}
const yesterday = day("2026-11-18"), today = day("2026-11-19"), tomorrow = day("2026-11-20");
const records = [yesterday, today, tomorrow];
const at = (hm: string, date = today.sourceDate) => Date.parse(`${date}T${hm}+03:00`);

test("in prayer interval: six local wall times, next, past, countdown, Hijri and a11y", () => {
  const p = api.buildNamazWidgetData(records, "İstanbul", at("11:15:00"), "tr").prayer!;
  assert.equal(p.name, "Öğle");
  assert.equal(p.countdown, "Öğle'ye 1 sa 38 dk");
  assert.equal(p.remainingLabel, "1 sa 38 dk kaldı");
  assert.equal(p.heading, "İstanbul · 10 Cemaziyelahir");
  assert.deepEqual(p.cells.map(c => c.time), Object.values(wall));
  assert.deepEqual(p.cells.map(c => c.past), [true, true, false, false, false, false]);
  assert.deepEqual(p.cells.map(c => c.next), [false, false, true, false, false, false]);
  for (const text of ["İstanbul", "Öğle", "12:53", "1 sa 38 dk"]) assert.ok(p.accessibilityLabel.includes(text));
  assert.equal(p.focusHeading, "SIRADAKİ · İSTANBUL");
});

test("exact prayer instant selects the following prayer, matching homePrayer", () => {
  for (let i = 0; i < instants.PRAYER_KEYS.length; i++) {
    const key = instants.PRAYER_KEYS[i];
    const p = api.buildNamazWidgetData(records, "İstanbul", today.atMs[key], "en").prayer!;
    assert.equal(p.name, instants.PRAYER_KEYS[(i + 1) % 6]);
    assert.equal(p.atMs, homePrayer.nextPrayerFromInstants(records, today.atMs[key])!.atMs);
  }
});

test("after Isha uses tomorrow's actual six times with no past cells", () => {
  const changed = { ...tomorrow, atMs: { ...tomorrow.atMs, Fajr: tomorrow.atMs.Fajr + 120_000 } };
  const p = api.buildNamazWidgetData([today, changed], "İstanbul", at("23:59:00"), "tr").prayer!;
  assert.equal(p.name, "İmsak");
  assert.equal(p.time, "06:14");
  assert.ok(p.cells.every(c => !c.past));
  assert.equal(p.cells[0].next, true);
  assert.equal(p.cells[0].time, "06:14");
});

test("midnight and month rollover retain the city's day, independent of device timezone", () => {
  const a = day("2026-11-30"), b = day("2026-12-01");
  const p = api.buildNamazWidgetData([a, b], "İstanbul", at("00:00:00", b.sourceDate), "tr").prayer!;
  assert.equal(p.atMs, b.atMs.Fajr);
  assert.ok(p.cells.every(c => !c.past));
  assert.equal(p.remainingLabel, "6 sa 12 dk kaldı");
});

test("empty, exhausted and missing city are localized empty states", () => {
  for (const input of [[], [yesterday]]) assert.equal(api.buildNamazWidgetData(input, "İstanbul", at("11:15:00"), "tr").prayer, null);
  assert.equal(api.buildNamazWidgetData(records, "", at("11:15:00"), "tr").prayer, null);
  assert.equal(api.buildNamazWidgetData([], "", 0, "tr").emptyText, "Vakitler için uygulamayı açın");
  assert.equal(api.buildNamazWidgetData([], "", 0, "en").emptyText, "Open the app to load prayer times");
});

test("all six Turkish dative suffixes use the fixed apostrophe table", () => {
  assert.deepEqual(instants.PRAYER_KEYS.map(k => api.prayerToLabel(k, "tr")), ["İmsak'a", "Güneş'e", "Öğle'ye", "İkindi'ye", "Akşam'a", "Yatsı'ya"]);
});

test("English names, heading and remaining text", () => {
  const p = api.buildNamazWidgetData(records, "İstanbul", at("11:15:00"), "en").prayer!;
  assert.deepEqual(p.cells.map(c => c.name), instants.PRAYER_KEYS);
  assert.equal(p.countdown, "Dhuhr in 1h 38m");
  assert.equal(p.remainingLabel, "in 1h 38m");
  assert.equal(p.focusHeading, "NEXT · ISTANBUL");
});

test("remaining floors minutes, clamps negatives and covers hour/minute/now boundaries", () => {
  for (const [ms, tr, en] of [[5_880_000, "1 sa 38 dk", "1h 38m"], [3_600_000, "1 sa 0 dk", "1h 0m"], [2_339_999, "38 dk", "38m"], [60_000, "1 dk", "1m"], [59_999, "şimdi", "now"], [0, "şimdi", "now"], [-1, "şimdi", "now"]] as const) {
    assert.equal(api.formatPrayerRemaining(ms, "tr"), tr);
    assert.equal(api.formatPrayerRemaining(ms, "en"), en);
  }
  assert.equal(api.buildNamazWidgetData(records, "İstanbul", today.atMs.Dhuhr - 1, "en").prayer!.remainingLabel, "now");
});

test("focus segments use elapsed ratio, past intervals and future tracks", () => {
  const middle = (today.atMs.Sunrise + today.atMs.Dhuhr) / 2;
  const segments = api.focusSegments(records, today, "Dhuhr", middle);
  assert.deepEqual(segments.map(s => s.state), ["past", "current", "future", "future", "future", "future"]);
  assert.equal(segments[1].fraction, 0.5);
  assert.equal(api.focusSegments(records, today, "Sunrise", today.atMs.Fajr)[0].fraction, 0);
  assert.equal(api.focusSegments(records, today, "Dhuhr", today.atMs.Dhuhr)[1].fraction, 1);
});

test("overnight focus interval spans actual Isha to Fajr across midnight", () => {
  const middle = (today.atMs.Isha + tomorrow.atMs.Fajr) / 2;
  const segments = api.focusSegments(records, tomorrow, "Fajr", middle);
  assert.deepEqual(segments.map(s => s.state), ["future", "future", "future", "future", "future", "current"]);
  assert.equal(segments[5].fraction, 0.5);
  assert.equal(api.focusSegments([tomorrow], tomorrow, "Fajr", middle)[5].fraction, 0);
});

test("next refresh ticks just after each clock minute or prayer, never in the past", () => {
  assert.equal(api.nextWidgetRefreshAt(1_000), 60_500);
  assert.equal(api.nextWidgetRefreshAt(60_200), 60_500);
  assert.equal(api.nextWidgetRefreshAt(60_500), 120_500);
  assert.equal(api.nextWidgetRefreshAt(1_000, 50_000), 50_500);
  assert.equal(api.nextWidgetRefreshAt(1_000, 400_000), 60_500);
  assert.equal(api.nextWidgetRefreshAt(1_000, 500), 1_500);
  const p = api.buildNamazWidgetData(records, "İstanbul", today.atMs.Dhuhr - 10_000, "tr").prayer!;
  assert.equal(p.refreshAtMs, today.atMs.Dhuhr + 500);
});

test("prayer transition shares the minute tick and schedules no second tick 500 ms later", () => {
  const prayerAt = today.atMs.Dhuhr;
  const tick = api.nextWidgetRefreshAt(prayerAt - 59_500, prayerAt);
  assert.equal(tick, prayerAt + 500);
  const p = api.buildNamazWidgetData(records, "Istanbul", tick, "en").prayer!;
  assert.equal(p.name, "Asr");
  assert.equal(p.refreshAtMs, prayerAt + 60_500);
  assert.equal(api.nextWidgetRefreshAt(prayerAt - 40, prayerAt), tick);
});

test("Isha after midnight displays yesterday's cells and highlights Isha", () => {
  const lateIsha = { ...yesterday, atMs: { ...yesterday.atMs, Isha: at("00:15:00") } };
  const differentToday = { ...today, atMs: { ...today.atMs, Fajr: today.atMs.Fajr + 120_000 } };
  const p = api.buildNamazWidgetData([lateIsha, differentToday, tomorrow], "Istanbul", at("00:05:00"), "en").prayer!;
  assert.equal(p.name, "Isha");
  assert.equal(p.countdown, "Isha in 10m");
  assert.deepEqual(p.cells.map(c => c.time), [...Object.values(wall).slice(0, 5), "00:15"]);
  assert.deepEqual(p.cells.map(c => c.next), [false, false, false, false, false, true]);
  assert.deepEqual(p.cells.map(c => c.past), [true, true, true, true, true, false]);
});

test("offline cached read hydrates repository without network; active manual city wins", async () => {
  const repo = createPrayerDayRepository({
    instants,
    storageGet: async () => JSON.stringify({ version: 1, records }), storageSet: async () => assert.fail("unexpected write"), nowMs: () => 0,
    fetchDiyanetMonth: async () => assert.fail("unexpected network"), fetchAladhanMonth: async () => assert.fail("unexpected network"),
  });
  const city = { id: 34, name: "İSTANBUL", country: "TÜRKİYE", state: "İSTANBUL", tz: "Europe/Istanbul" };
  const api = load({
    "../lib/storage": { storage: { getString: async () => "en", getJSON: async (key: string) => key === "diyanetManualCityV1" ? city : { city: { ...city, id: 99 } } } },
    "../i18n": { getLang: () => "en" }, "../lib/prayerDayRepositoryDeps": { getPrayerDayRepository: () => repo },
  });
  const result = await api.readNamazWidgetData(at("11:15:00"));
  assert.equal(result.lang, "en");
  assert.equal(result.prayer?.name, "Dhuhr");
  assert.equal(result.prayer?.city, "Istanbul");
});

test("GPS-only, missing city, corrupt storage and unavailable native modules safely stay empty", async () => {
  assert.equal((await api.readNamazWidgetData()).prayer, null);
  for (const city of [null, { id: "bad", name: "x", tz: "bad" }]) {
    const api = load({ "../i18n": { getLang: () => "en" }, "../lib/storage": { storage: { getString: async () => null, getJSON: async () => city } } });
    assert.equal((await api.readNamazWidgetData()).prayer, null);
  }
});

test("automatic city's c identity reads cached data; never falls back to another city", async () => {
  let selected = "";
  const api = load({
    "../i18n": { getLang: () => "tr" },
    "../lib/storage": { storage: { getString: async () => null, getJSON: async (key: string) => key === "diyanetManualCityV1" ? null : { city: { id: 34, name: "İSTANBUL", country: "TÜRKİYE", tz: "Europe/Istanbul" } } } },
    "../lib/prayerDayRepositoryDeps": { getPrayerDayRepository: () => ({ readCachedDays: async ({ cityKey }: { cityKey: string }) => { selected = cityKey; return []; } }) },
  });
  assert.equal((await api.readNamazWidgetData()).prayer, null);
  assert.equal(selected, "c34");
});

test("headless reader waits for asynchronous language hydration before getLang", async () => {
  let ready = false;
  const api = load({
    "../i18n": { languageReady: Promise.resolve().then(() => { ready = true; }), getLang: () => { assert.ok(ready); return "en"; } },
    "../lib/storage": { storage: { getJSON: async () => null } },
  });
  assert.equal((await api.readNamazWidgetData()).lang, "en");
});

test("unavailable offline Hijri calculation leaves only the city", () => {
  const api = load({ "../lib/homePrayer": { ...homePrayer, homeHijriDate: () => null } });
  assert.equal(api.buildNamazWidgetData(records, "İstanbul", at("11:15:00"), "tr").prayer?.heading, "İstanbul");
});

test("corrupt storage and geo-only persisted records cannot load an unrelated city", async () => {
  const api = load({ "../i18n": { getLang: () => "en" }, "../lib/storage": { storage: { getJSON: async () => { throw new SyntaxError("bad JSON"); } } } });
  assert.equal((await api.readNamazWidgetData()).prayer, null);
  const repo = createPrayerDayRepository({ instants,
    storageGet: async () => JSON.stringify({ version: 1, records: [{ ...today, cityKey: "geo:41,29" }] }), storageSet: async () => assert.fail("write"), nowMs: () => 0,
    fetchDiyanetMonth: async () => assert.fail("network"), fetchAladhanMonth: async () => assert.fail("network"),
  });
  assert.deepEqual(await repo.readCachedDays({ cityKey: "geo:41,29", cityTimeZone: "Europe/Istanbul" }, [today.sourceDate]), []);
});
