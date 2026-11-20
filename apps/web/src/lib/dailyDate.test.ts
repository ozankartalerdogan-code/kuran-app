/**
 * dailyDate.test.ts — /api/daily?date= tohumu: geçerli tarih, eski davranışla aynı seçim.
 * Çalıştır: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDailyOffset, parseDailyDate } from "./dailyDate.ts";

test("parseDailyDate: geçerli YYYY-MM-DD", () => {
  assert.deepEqual(parseDailyDate("2026-11-12"), { y: 2026, m: 11, d: 12 });
});

test("parseDailyDate: geçersiz/eksik → null", () => {
  for (const s of [null, "", "2026-2-1", "2026-02-30", "abc", "2026-13-01"]) assert.equal(parseDailyDate(s), null);
});

test("getDailyOffset: tarih verilmezse bugünkü tohum (eski davranış), günler arası farklı", () => {
  const n = new Date();
  assert.equal(getDailyOffset(4000), getDailyOffset(4000, { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }));
  assert.notEqual(getDailyOffset(4000, { y: 2026, m: 11, d: 12 }), getDailyOffset(4000, { y: 2026, m: 11, d: 13 }));
  assert.equal(getDailyOffset(0, null), 0);
});

test("getDailyPoolIndex: havuz büyüklüğü kadar ardışık günde tekrar yok, yayılır", async () => {
  const { getDailyPoolIndex } = await import("./dailyDate.ts");
  const n = 387;
  const seen = new Set<number>();
  const start = Date.UTC(2026, 10, 20);
  let prev = -1, adjacent = 0;
  for (let i = 0; i < n; i++) {
    const dt = new Date(start + i * 86_400_000);
    const idx = getDailyPoolIndex(n, { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
    assert.ok(idx >= 0 && idx < n);
    seen.add(idx);
    if (prev >= 0 && Math.abs(idx - prev) <= 2) adjacent++;
    prev = idx;
  }
  assert.equal(seen.size, n);
  assert.equal(adjacent, 0);
  assert.equal(getDailyPoolIndex(0), 0);
});
