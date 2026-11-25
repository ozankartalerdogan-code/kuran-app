import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import * as instants from "../lib/prayerInstant.ts";
import type { PrayerDayRecord } from "../lib/prayerDayRepository.ts";

function load(storage?: unknown) {
  const source = readFileSync(new URL("./prayerWidgetFallback.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("require", "exports", "module", compiled)((id: string) => {
    if (id === "../lib/prayerInstant") return instants;
    if (id === "../lib/storage" && storage) return { storage };
    throw new Error(`Native module unavailable: ${id}`);
  }, mod.exports, mod);
  return mod.exports as typeof import("./prayerWidgetFallback");
}
const api = load();
const nowMs = Date.parse("2026-11-19T10:00:00+03:00");
const DAY_MS = 86_400_000;
function day(offset = 0): PrayerDayRecord {
  const date = instants.addDaysYmd("2026-11-19", offset);
  return { cityKey: "geo:41.01,28.98", cityTimeZone: "Europe/Istanbul", sourceDate: date,
    source: "aladhan", revision: "aladhan:geo:41.01,28.98:Europe/Istanbul:abcd", fetchedAt: nowMs,
    atMs: instants.instantsFromWallTimes(date, { Fajr: "06:12", Sunrise: "07:41", Dhuhr: "12:53", Asr: "15:22", Maghrib: "17:42", Isha: "19:06" }, "Europe/Istanbul")!,
    hijri: { day: 10, monthNumber: 6, year: 1448 } };
}
const snapshot = () => ({ city: "İstanbul", tz: "Europe/Istanbul", writtenAtMs: nowMs, records: [day()] });

test("serialization whitelists every level and removes coordinate identities including revision", () => {
  const input = { ...snapshot(), lat: 41.01, lon: 28.98,
    records: [{ ...day(), cityDisplayName: "geo:41.01,28.98", coords: { lat: 41.01, lon: 28.98 },
      atMs: { ...day().atMs, lat: 41.01 }, hijri: { ...day().hijri!, lon: 28.98 } }] };
  const json = api.serializeFallbackSnapshot(input)!;
  for (const leaked of ["geo:", "41.01", "28.98", "lat", "lon", "coords", "cityDisplayName"]) assert.ok(!json.includes(leaked), leaked);
  const parsed = api.parseFallbackSnapshot(json, nowMs)!;
  assert.equal(parsed.v, 1);
  assert.equal(parsed.records[0].cityKey, "fallback");
  assert.equal(parsed.records[0].revision, "fallback");
  assert.deepEqual(parsed.records[0].atMs, day().atMs);
  assert.equal(api.serializeFallbackSnapshot({ ...snapshot(), city: "geo:41.01,28.98" }), null);
  assert.equal(api.serializeFallbackSnapshot({ ...snapshot(), city: "41.01,28.98" }), null);
});

test("malformed JSON and invalid snapshot/record schemas are rejected", () => {
  for (const json of [null, "{", "null", "[]", "{}", "123"]) assert.equal(api.parseFallbackSnapshot(json, nowMs), null);
  const valid = JSON.parse(api.serializeFallbackSnapshot(snapshot())!);
  for (const patch of [{ v: 2 }, { city: "" }, { tz: "invalid" }, { writtenAtMs: "123" }, { records: {} }]) {
    assert.equal(api.parseFallbackSnapshot(JSON.stringify({ ...valid, ...patch }), nowMs), null);
  }
  for (const patch of [{ source: "diyanet" }, { source: "unknown" }, { sourceDate: "2026-02-30" },
    { cityTimeZone: "UTC" }, { atMs: { ...day().atMs, Fajr: null } }, { hijri: { day: 31, monthNumber: 1, year: 1448 } }, { fetchedAt: "123" }]) {
    const input = { ...snapshot(), records: [{ ...day(), ...patch }] };
    assert.equal(api.serializeFallbackSnapshot(input as ReturnType<typeof snapshot>), null);
    assert.equal(api.parseFallbackSnapshot(JSON.stringify({ ...valid, records: [{ ...valid.records[0], ...patch }] }), nowMs), null);
  }
});

test("writer keeps at most 16 distinct days in [-1..14]; parser rejects oversized and out-of-window data", () => {
  const input = { ...snapshot(), records: Array.from({ length: 32 }, (_, i) => day(i - 3)) };
  const parsed = api.parseFallbackSnapshot(api.serializeFallbackSnapshot(input), nowMs)!;
  assert.equal(parsed.records.length, 16);
  assert.equal(parsed.records[0].sourceDate, "2026-11-18");
  assert.equal(parsed.records[15].sourceDate, "2026-12-03");
  assert.equal(api.parseFallbackSnapshot(JSON.stringify({ ...parsed, records: [...parsed.records, day(15)] }), nowMs), null);
  assert.equal(api.parseFallbackSnapshot(JSON.stringify({ ...parsed, records: [day(15)] }), nowMs), null);
  assert.equal(api.parseFallbackSnapshot(JSON.stringify({ ...parsed, records: [day(), day()] }), nowMs), null);
});

test("snapshot expires strictly after 14 days; clock rollback allows at most 5 minutes", () => {
  const json = api.serializeFallbackSnapshot(snapshot());
  assert.ok(api.parseFallbackSnapshot(json, nowMs + 14 * DAY_MS));
  assert.equal(api.parseFallbackSnapshot(json, nowMs + 14 * DAY_MS + 1), null);
  assert.ok(api.parseFallbackSnapshot(json, nowMs - 1));
  assert.ok(api.parseFallbackSnapshot(json, nowMs - 5 * 60_000));
  assert.equal(api.parseFallbackSnapshot(json, nowMs - 5 * 60_000 - 1), null);
  assert.equal(api.parseFallbackSnapshot(json, NaN), null);
});

test("lazy storage helpers write sanitized JSON, read with expiry, and clear only their key", async () => {
  let stored: string | null = null;
  const keys: string[] = [];
  const api = load({
    setString: async (key: string, json: string) => { keys.push(key); stored = json; },
    getString: async (key: string) => { keys.push(key); return stored; },
    remove: async (key: string) => { keys.push(key); stored = null; },
  });
  await api.writePrayerWidgetFallback(snapshot());
  assert.equal((await api.readPrayerWidgetFallback(nowMs))?.records[0].cityKey, "fallback");
  assert.equal(await api.readPrayerWidgetFallback(nowMs + 15 * DAY_MS), null);
  await api.clearPrayerWidgetFallback();
  assert.equal(await api.readPrayerWidgetFallback(nowMs), null);
  assert.ok(keys.every(key => key === "prayerWidgetFallbackV1"));
});

test("unavailable or failing storage stays best effort", async () => {
  for (const api of [load(), load({ getString: async () => { throw Error("read"); }, setString: async () => { throw Error("write"); }, remove: async () => { throw Error("remove"); } })]) {
    assert.equal(await api.readPrayerWidgetFallback(nowMs), null);
    await api.writePrayerWidgetFallback(snapshot());
    await api.clearPrayerWidgetFallback();
  }
});

// sameApproxLocation testleri için elle PrayerDayRecord kurar.
function recordWithShift(sourceDate: string, shiftMs = 0): PrayerDayRecord {
  const baseAt = nowMs;
  const atMs = Object.fromEntries(
    instants.PRAYER_KEYS.map((key, idx) => [key, baseAt + idx * 3_600_000 + shiftMs]),
  ) as PrayerDayRecord["atMs"];
  return {
    sourceDate,
    cityKey: "geo:41.01,28.98",
    cityTimeZone: "Europe/Istanbul",
    source: "aladhan",
    revision: "rev",
    fetchedAt: nowMs,
    hijri: null,
    atMs,
  };
}

test("sameApproxLocation: aynı vakitler true döner", () => {
  assert.equal(api.sameApproxLocation([recordWithShift("2026-11-19")], [recordWithShift("2026-11-19")]), true);
});

test("sameApproxLocation: 2 dk fark tolerans içinde olduğundan true döner", () => {
  assert.equal(
    api.sameApproxLocation([recordWithShift("2026-11-19")], [recordWithShift("2026-11-19", 2 * 60_000)]),
    true,
  );
});

test("sameApproxLocation: 10 dk fark toleransı aştığından false döner", () => {
  assert.equal(
    api.sameApproxLocation([recordWithShift("2026-11-19")], [recordWithShift("2026-11-19", 10 * 60_000)]),
    false,
  );
});

test("sameApproxLocation: ortak gün yoksa false döner", () => {
  assert.equal(
    api.sameApproxLocation([recordWithShift("2026-11-19")], [recordWithShift("2026-11-20")]),
    false,
  );
});
