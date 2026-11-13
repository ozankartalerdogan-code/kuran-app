import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeCities,
  findNearestCity,
  formatOffset,
  haversineKm,
  monthDateRange,
  monthKey,
  monthsToServe,
  normalizeDiyanetDay,
  parseDiyanetHijri,
  roundCoord,
  type DiyanetCity,
} from "./diyanetVakit.ts";

function city(overrides: Partial<DiyanetCity> & Pick<DiyanetCity, "id" | "name" | "tz">): DiyanetCity {
  return {
    state: "",
    country: "",
    lat: 0,
    lon: 0,
    ...overrides,
  };
}

function rawDay(overrides: Record<string, unknown> = {}) {
  return {
    fajr: "05:25",
    sunrise: "07:18",
    dhuhr: "11:55",
    asr: "14:20",
    maghrib: "16:32",
    isha: "18:00",
    gregorianDateShort: "13.11.2026",
    hijriDateShort: "4.6.1448",
    greenwichMeanTimeZone: 1,
    ...overrides,
  };
}

test("decodeCities: gecerli sikistirilmis veriyi cozer", () => {
  const cities = decodeCities({
    v: 1,
    fields: ["id", "name", "state", "country", "lat", "lon", "tz"],
    rows: [
      [11002, "BERLIN", "BERLIN", "ALMANYA", 52.5244, 13.4105, "Europe/Berlin"],
      [1, "ISTANBUL", "ISTANBUL", "TURKIYE", 41.0082, 28.9784, "Europe/Istanbul"],
    ],
  });

  assert.equal(cities.length, 2);
  assert.deepEqual(cities[0], {
    id: 11002,
    name: "BERLIN",
    state: "BERLIN",
    country: "ALMANYA",
    lat: 52.5244,
    lon: 13.4105,
    tz: "Europe/Berlin",
  });
});

test("decodeCities: v !== 1 hata verir", () => {
  assert.throws(
    () => decodeCities({ v: 2, fields: [], rows: [] }),
    /surumu/,
  );
});

test("decodeCities: eksik/bozuk alanli satirlari atlar", () => {
  const cities = decodeCities({
    v: 1,
    fields: ["id", "name", "state", "country", "lat", "lon", "tz"],
    rows: [
      [1, "GECERLI", "S", "C", 10, 20, "Europe/Istanbul"],
      [2, "EKSIK", "S", "C", null, 20, "Europe/Istanbul"],
      [3, "EKSIK", "S", "C", 10, 20],
      null,
      "bozuk",
      [4.5, "GECERSIZ_ID", "S", "C", 10, 20, "Europe/Istanbul"],
    ],
  });

  assert.deepEqual(cities.map((c) => c.id), [1]);
});

test("haversineKm: ayni nokta 0, Istanbul-Ankara yaklasik 350 km", () => {
  assert.equal(haversineKm(41.0082, 28.9784, 41.0082, 28.9784), 0);
  const istanbulAnkara = haversineKm(41.0082, 28.9784, 39.9334, 32.8597);
  assert.ok(istanbulAnkara > 340 && istanbulAnkara < 360, `beklenmeyen mesafe: ${istanbulAnkara}`);
});

test("findNearestCity: en yakin sehri secer", () => {
  const cities = [
    city({ id: 1, name: "YAKIN", tz: "Europe/Istanbul", lat: 41.0, lon: 29.0 }),
    city({ id: 2, name: "UZAK", tz: "Europe/Istanbul", lat: 41.5, lon: 29.5 }),
  ];

  const nearest = findNearestCity(41.001, 29.001, cities);
  assert.equal(nearest?.city.id, 1);
  assert.ok(nearest !== null && nearest.distanceKm < 1);
});

test("findNearestCity: maxKm disinda null doner (varsayilan 50 km)", () => {
  const cities = [city({ id: 1, name: "UZAK", tz: "Europe/Istanbul", lat: 41.0, lon: 29.0 })];
  assert.equal(findNearestCity(0, 0, cities), null);
  assert.equal(findNearestCity(0, 0, cities, { maxKm: 100 }), null);
});

test("findNearestCity: offset filtresi sinir otesindeki daha yakin sehri atlar", () => {
  const cities = [
    city({ id: 1, name: "SINIR_OTESI", tz: "Test/Near", lat: 41.0, lon: 29.0 }),
    city({ id: 2, name: "AYNI_SAAT", tz: "Test/Same", lat: 41.1, lon: 29.1 }),
  ];

  const offsets: Record<string, number> = { "Test/Near": 120, "Test/Same": 60 };
  const nearest = findNearestCity(41.0, 29.0, cities, {
    utcOffsetMin: 60,
    offsetOf: (tz) => offsets[tz] ?? null,
  });

  assert.equal(nearest?.city.id, 2);
});

test("findNearestCity: offsetOf null donerse sehir atlanmaz", () => {
  const cities = [
    city({ id: 1, name: "BILINMEYEN", tz: "Unknown/Zone", lat: 41.0, lon: 29.0 }),
    city({ id: 2, name: "AYNI_SAAT", tz: "Test/Same", lat: 41.1, lon: 29.1 }),
  ];

  const nearest = findNearestCity(41.0, 29.0, cities, {
    utcOffsetMin: 60,
    offsetOf: (tz) => (tz === "Test/Same" ? 60 : null),
  });

  assert.equal(nearest?.city.id, 1);
});

test("roundCoord: 2 ondaliga yuvarlar", () => {
  assert.equal(roundCoord(41.0082), 41.01);
  assert.equal(roundCoord(28.9784), 28.98);
  assert.equal(roundCoord(41.004), 41);
  assert.equal(roundCoord(-0.001), 0);
});

test("parseDiyanetHijri: gecerli ve gecersiz degerler", () => {
  assert.deepEqual(parseDiyanetHijri("4.6.1448"), { day: 4, month: 6, year: 1448 });
  assert.deepEqual(parseDiyanetHijri(" 1.12.1447 "), { day: 1, month: 12, year: 1447 });
  assert.equal(parseDiyanetHijri("4.13.1448"), null);
  assert.equal(parseDiyanetHijri("0.6.1448"), null);
  assert.equal(parseDiyanetHijri("4.6"), null);
  assert.equal(parseDiyanetHijri("abc"), null);
  assert.equal(parseDiyanetHijri(null), null);
  assert.equal(parseDiyanetHijri(undefined), null);
});

test("formatOffset: tam ve kesirli saat farklari", () => {
  assert.equal(formatOffset(60), "+01:00");
  assert.equal(formatOffset(0), "+00:00");
  assert.equal(formatOffset(-330), "-05:30");
  assert.equal(formatOffset(345), "+05:45");
  assert.equal(formatOffset(-90), "-01:30");
});

test("normalizeDiyanetDay: Berlin ornegi (+01:00)", () => {
  const day = normalizeDiyanetDay(rawDay());

  assert.ok(day);
  assert.equal(day.date, "2026-11-13");
  assert.equal(day.utcOffsetMin, 60);
  assert.equal(day.times.imsak, "2026-11-13T05:25:00+01:00");
  assert.equal(day.times.gunes, "2026-11-13T07:18:00+01:00");
  assert.equal(day.times.ogle, "2026-11-13T11:55:00+01:00");
  assert.equal(day.times.ikindi, "2026-11-13T14:20:00+01:00");
  assert.equal(day.times.aksam, "2026-11-13T16:32:00+01:00");
  assert.equal(day.times.yatsi, "2026-11-13T18:00:00+01:00");
  assert.deepEqual(day.hijri, { day: 4, month: 6, year: 1448 });
});

test("normalizeDiyanetDay: Sidney +11, Hindistan +05:30, negatif -03:30", () => {
  const sydney = normalizeDiyanetDay(rawDay({ greenwichMeanTimeZone: 11 }));
  assert.equal(sydney?.utcOffsetMin, 660);
  assert.equal(sydney?.times.imsak, "2026-11-13T05:25:00+11:00");

  const india = normalizeDiyanetDay(rawDay({ greenwichMeanTimeZone: 5.5 }));
  assert.equal(india?.utcOffsetMin, 330);
  assert.equal(india?.times.imsak, "2026-11-13T05:25:00+05:30");

  const negative = normalizeDiyanetDay(rawDay({ greenwichMeanTimeZone: -3.5 }));
  assert.equal(negative?.utcOffsetMin, -210);
  assert.equal(negative?.times.imsak, "2026-11-13T05:25:00-03:30");
});

test("normalizeDiyanetDay: eksik alan, gecersiz saat ve tarih null doner", () => {
  assert.equal(normalizeDiyanetDay(rawDay({ fajr: undefined })), null);
  assert.equal(normalizeDiyanetDay(rawDay({ isha: "24:10" })), null);
  assert.equal(normalizeDiyanetDay(rawDay({ dhuhr: "9:05" })), null);
  assert.equal(normalizeDiyanetDay(rawDay({ gregorianDateShort: "31.02.2026" })), null);
  assert.equal(normalizeDiyanetDay(rawDay({ greenwichMeanTimeZone: "1" })), null);
  assert.equal(normalizeDiyanetDay(null), null);
});

test("normalizeDiyanetDay: yaz saati gecis gunlerinde her gun kendi farkini tasir", () => {
  const before = normalizeDiyanetDay(
    rawDay({ gregorianDateShort: "24.10.2026", greenwichMeanTimeZone: 2 }),
  );
  const after = normalizeDiyanetDay(
    rawDay({ gregorianDateShort: "25.10.2026", greenwichMeanTimeZone: 1 }),
  );

  assert.equal(before?.utcOffsetMin, 120);
  assert.equal(after?.utcOffsetMin, 60);
  assert.equal(before?.times.imsak, "2026-10-24T05:25:00+02:00");
  assert.equal(after?.times.imsak, "2026-10-25T05:25:00+01:00");
});

test("monthKey: YYYY-MM uretir", () => {
  assert.equal(monthKey("2026-11-13"), "2026-11");
  assert.equal(monthKey("2027-01-01"), "2027-01");
});

test("monthsToServe: ayin son 7 gununde sonraki ay da eklenir", () => {
  assert.deepEqual(monthsToServe("2026-11-23"), ["2026-11"]);
  assert.deepEqual(monthsToServe("2026-11-24"), ["2026-11", "2026-12"]);
  assert.deepEqual(monthsToServe("2026-12-31"), ["2026-12", "2027-01"]);
  assert.deepEqual(monthsToServe("2027-02-22"), ["2027-02", "2027-03"]);
  assert.deepEqual(monthsToServe("2028-02-22"), ["2028-02"]);
  assert.deepEqual(monthsToServe("2028-02-23"), ["2028-02", "2028-03"]);
  assert.deepEqual(monthsToServe("2027-12-31"), ["2027-12", "2028-01"]);
});

test("monthDateRange: ay basi/sonu ve artik yil Subat", () => {
  assert.deepEqual(monthDateRange("2026-11"), { start: "2026-11-01", end: "2026-11-30" });
  assert.deepEqual(monthDateRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(monthDateRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  assert.deepEqual(monthDateRange("2026-12"), { start: "2026-12-01", end: "2026-12-31" });
});
