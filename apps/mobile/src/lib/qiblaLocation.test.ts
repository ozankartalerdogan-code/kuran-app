import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseQuickFix, FRESH_FIX_MS } from "./qiblaLocation.ts";

const now = 1_000_000_000;
const ist = { latitude: 41.0, longitude: 28.9 };

test("taze son bilinen konum yenileme gerektirmez", () => {
  assert.deepEqual(chooseQuickFix({ coords: ist, timestamp: now - 1000 }, null, now), { coords: ist, refine: false });
});
test("eski son bilinen konum hemen kullanılır, arka planda yenilenir", () => {
  assert.deepEqual(chooseQuickFix({ coords: ist, timestamp: now - FRESH_FIX_MS - 1 }, null, now), { coords: ist, refine: true });
});
test("gelecekten gelen zaman damgası taze sayılmaz", () => {
  assert.equal(chooseQuickFix({ coords: ist, timestamp: now + 60_000 }, null, now)?.refine, true);
});
test("son bilinen yoksa kayıtlı konum kullanılır ve yenilenir", () => {
  assert.deepEqual(chooseQuickFix(null, { lat: 39.9, lng: 32.8 }, now), { coords: { latitude: 39.9, longitude: 32.8 }, refine: true });
});
test("geçersiz konumlar yok sayılır", () => {
  assert.equal(chooseQuickFix(null, null, now), null);
  assert.equal(chooseQuickFix({ coords: { latitude: 0, longitude: 0 }, timestamp: now }, null, now), null);
  assert.equal(chooseQuickFix(null, { lat: Number.NaN, lng: 10 }, now), null);
  assert.equal(chooseQuickFix(null, { lat: 95, lng: 10 }, now), null);
});
