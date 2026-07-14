import { test } from "node:test";
import assert from "node:assert/strict";
import { samePrayerLocation, toPrayerCoords } from "./prayerLocation.ts";

test("ge?erli kay?tl? koordinat? kabul eder", () => {
  assert.deepEqual(toPrayerCoords({ lat: 39.9334, lng: 32.8597 }), { lat: 39.9334, lng: 32.8597 });
});

test("eksik, sonlu olmayan veya aral?k d??? koordinat? reddeder", () => {
  assert.equal(toPrayerCoords(null), null);
  assert.equal(toPrayerCoords({ lat: 41 }), null);
  assert.equal(toPrayerCoords({ lat: Number.NaN, lng: 28 }), null);
  assert.equal(toPrayerCoords({ lat: 91, lng: 28 }), null);
  assert.equal(toPrayerCoords({ lat: 41, lng: 181 }), null);
});

test("namaz cache'i yaln?z ayn? yakla??k konum i?in kullan?labilir", () => {
  assert.equal(samePrayerLocation({ lat: 41.0082, lng: 28.9784 }, { lat: 41.01, lng: 28.98 }), true);
  assert.equal(samePrayerLocation({ lat: 41.0082, lng: 28.9784 }, { lat: 39.9334, lng: 32.8597 }), false);
});
