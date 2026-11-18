import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPrayerFromInstants, watchHomePrayerDays } from "./homePrayer.ts";
import { instantsFromWallTimes, formatHmInZone, prayerDateInZone } from "./prayerInstant.ts";
import type { PrayerContext, PrayerDayRecord, PrayerDayEvent } from "./prayerDayRepository.ts";

const wall = { Fajr: "05:30", Sunrise: "07:00", Dhuhr: "12:30", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" };
function day(date: string, zone = "Europe/Istanbul", source: PrayerDayRecord["source"] = "aladhan"): PrayerDayRecord {
  return { sourceDate: date, cityKey: "m34", cityTimeZone: zone, source, revision: source,
    atMs: instantsFromWallTimes(date, wall, zone)!, hijri: null, fetchedAt: 0 };
}

test("Istanbul: unchanged HH:MM and minute rounding on a DST-free day", () => {
  const record = day("2026-03-29");
  const next = nextPrayerFromInstants([record], Date.parse("2026-03-29T05:00:30+03:00"))!;
  assert.equal(next.key, "Fajr");
  assert.equal(next.remainingMin, 30);
  assert.equal(formatHmInZone(next.atMs, record.cityTimeZone), "05:30");
  assert.equal(nextPrayerFromInstants([record], record.atMs.Fajr)?.key, "Sunrise");
});

test("after Isha and across midnight uses tomorrow's actual Fajr", () => {
  const today = day("2026-11-18");
  const tomorrow = day("2026-11-19");
  tomorrow.atMs = { ...tomorrow.atMs, Fajr: tomorrow.atMs.Fajr + 2 * 60_000 };
  for (const [now, minutes] of [["2026-11-18T23:30:00+03:00", 362], ["2026-11-19T00:30:00+03:00", 302]] as const) {
    const next = nextPrayerFromInstants([today, tomorrow], Date.parse(now))!;
    assert.equal(next.record, tomorrow);
    assert.equal(next.key, "Fajr");
    assert.equal(next.remainingMin, minutes);
    assert.equal(formatHmInZone(next.atMs, tomorrow.cityTimeZone), "05:32");
  }
  assert.equal(nextPrayerFromInstants([], Date.now()), null);
});

test("Berlin: spring DST countdown measures elapsed instants, city display stays 05:30", () => {
  const records = [day("2026-03-28", "Europe/Berlin"), day("2026-03-29", "Europe/Berlin")];
  const next = nextPrayerFromInstants(records, Date.parse("2026-03-29T01:30:00+01:00"))!;
  assert.equal(next.key, "Fajr");
  assert.equal(next.remainingMin, 180);
  assert.equal(formatHmInZone(next.atMs, next.record.cityTimeZone), "05:30");
  assert.equal(prayerDateInZone(Date.parse("2026-03-28T23:30:00Z"), "Europe/Berlin"), "2026-03-29");
  assert.equal(prayerDateInZone(Date.parse("2026-03-28T22:30:00Z"), "Europe/Istanbul"), "2026-03-29");
});

test("event during the initial read: the older fallback cannot overwrite the upgrade", async () => {
  let listener!: (event: PrayerDayEvent) => void;
  const pending: ((days: Map<string, PrayerDayRecord>) => void)[] = [];
  const applied: string[] = [];
  const stop = watchHomePrayerDays({
    subscribe(fn) { listener = fn; return () => {}; },
    ensureDays: () => new Promise(resolve => pending.push(resolve)),
  }, context, ["2026-11-18"], () => true,
  records => applied.push(records[0].source), () => assert.fail());
  listener({ cityKey: context.cityKey, cityTimeZone: context.cityTimeZone, dates: [], upgradedToDiyanet: true });
  pending[1](new Map([["2026-11-18", day("2026-11-18", context.cityTimeZone, "diyanet")]]));
  await flush();
  pending[0](new Map([["2026-11-18", day("2026-11-18")]]));
  await flush();
  assert.deepEqual(applied, ["diyanet"]);
  stop();
});

const context: PrayerContext = { cityKey: "m34", lat: 0, lon: 0, cityTimeZone: "Europe/Istanbul",
  deviceTimeZone: "Europe/Berlin", offMin: 60, nowMs: 0 };
const flush = () => new Promise(resolve => setImmediate(resolve));

test("subscribes before read; every active-city event re-reads including a Diyanet upgrade", async () => {
  let listener: ((event: PrayerDayEvent) => void) | undefined;
  let current = day("2026-11-18");
  const applied: string[] = [];
  let reads = 0;
  const repo = {
    subscribe(fn: (event: PrayerDayEvent) => void) { listener = fn; return () => { listener = undefined; }; },
    async ensureDays() { assert.ok(listener); reads++; return new Map([[current.sourceDate, current]]); },
  };
  const stop = watchHomePrayerDays(repo, context, [current.sourceDate], () => true,
    records => applied.push(records[0].source), () => assert.fail("unexpected error"));
  await flush();
  const event = { cityKey: context.cityKey, cityTimeZone: context.cityTimeZone, dates: [], upgradedToDiyanet: false };
  listener!({ ...event, cityKey: "m35" });
  assert.equal(reads, 1);
  listener!(event);
  await flush();
  current = day("2026-11-18", context.cityTimeZone, "diyanet");
  listener!({ ...event, upgradedToDiyanet: true });
  await flush();
  assert.deepEqual(applied, ["aladhan", "aladhan", "diyanet"]);
  stop();
  assert.equal(listener, undefined);
});

test("stale city/context and disposed reads cannot update home", async () => {
  for (const dispose of [false, true]) {
    let resolve!: (days: Map<string, PrayerDayRecord>) => void;
    let active = true;
    let applied = false;
    const stop = watchHomePrayerDays({
      subscribe: () => () => {},
      ensureDays: () => new Promise(yes => { resolve = yes; }),
    }, context, ["2026-11-18"], () => active, () => { applied = true; }, () => assert.fail());
    if (dispose) stop(); else active = false;
    resolve(new Map([["2026-11-18", day("2026-11-18")]]));
    await flush();
    assert.equal(applied, false);
    stop();
  }
});
