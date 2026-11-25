import { test } from "node:test";
import assert from "node:assert/strict";
import { calcQibla, calcDist } from "./qiblaMath.ts";

const CITIES: [string, number, number, number][] = [
  ["İstanbul", 41.0082, 28.9784, 151.62],
  ["Ankara", 39.9334, 32.8597, 160.17],
  ["Berlin", 52.52, 13.405, 136.68],
  ["Londra", 51.5074, -0.1278, 118.99],
  ["New York", 40.7128, -74.006, 58.48],
  ["Tokyo", 35.6762, 139.6503, 293.00],
  ["Sidney", -33.8688, 151.2093, 277.50],
  ["Cape Town", -33.9249, 18.4241, 23.35],
  ["Jakarta", -6.2088, 106.8456, 295.15],
  ["Honolulu", 21.3069, -157.8583, 336.89],
  ["Suva", -18.1416, 178.4419, 281.89],
];

function finiteBearing(lat: number, lng: number): number {
  const got = calcQibla(lat, lng);
  assert.notEqual(got, null);
  assert.ok(Number.isFinite(got));
  assert.ok(got! >= 0 && got! < 360, `${lat},${lng}: ${got}`);
  return got!;
}

for (const [city, lat, lng, want] of CITIES) {
  test(`${city}: kıble yönü ±0,05°`, () => {
    const got = finiteBearing(lat, lng);
    assert.ok(Math.abs(got - want) <= 0.05, `${got} ≠ ${want}`);
  });
}

test("180 ve -180 boylamları aynı sonucu verir", () => {
  for (const lat of [-90, -45, 0, 45, 90]) {
    assert.ok(Math.abs(finiteBearing(lat, 180) - finiteBearing(lat, -180)) < 1e-10);
    assert.ok(Math.abs(calcDist(lat, 180)! - calcDist(lat, -180)!) < 1e-10);
  }
});

test("antipot ve Kâbe merkezinde yön ve mesafe sonludur", () => {
  for (const [lat, lng] of [[-21.422487, -140.173794], [21.422487, 39.826206]]) {
    finiteBearing(lat, lng);
    const distance = calcDist(lat, lng);
    assert.notEqual(distance, null);
    assert.ok(Number.isFinite(distance));
    assert.ok(distance! >= 0);
  }
  assert.equal(calcDist(21.422487, 39.826206), 0);
  assert.ok(Math.abs(calcDist(-21.422487, -140.173794)! - Math.PI * 6371) < 0.001);
});

test("İstanbul–Kâbe mesafesi 2405 km ±5 km", () => {
  const got = calcDist(41.0082, 28.9784);
  assert.notEqual(got, null);
  assert.ok(Math.abs(got! - 2405) <= 5, `${got}`);
});

test("NaN ve sonsuz girdiler null döndürür", () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    for (const [lat, lng] of [[invalid, 39], [21, invalid], [invalid, invalid]]) {
      assert.equal(calcQibla(lat, lng), null);
      assert.equal(calcDist(lat, lng), null);
    }
  }
});

test("çok büyük sonlu girdiler de sonlu sonuç verir", () => {
  for (const lat of [-Number.MAX_VALUE, Number.MAX_VALUE]) {
    for (const lng of [-Number.MAX_VALUE, Number.MAX_VALUE]) {
      finiteBearing(lat, lng);
      assert.ok(Number.isFinite(calcDist(lat, lng)));
    }
  }
});
