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
