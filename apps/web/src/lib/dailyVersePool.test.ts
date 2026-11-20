import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pool = JSON.parse(readFileSync(new URL("../data/dailyVersePool.json", import.meta.url), "utf8")) as string[];

test("dailyVersePool: en az bir yıllık, tekrarsız, geçerli anahtarlar, kıssa ayeti yok", () => {
  assert.ok(pool.length >= 365, `havuz ${pool.length}`);
  assert.equal(new Set(pool).size, pool.length);
  for (const k of pool) assert.match(k, /^\d{1,3}:\d{1,3}$/);
  assert.ok(!pool.includes("12:29"));
});

const duaPool = JSON.parse(readFileSync(new URL("../data/dailyDuaPool.json", import.meta.url), "utf8")) as string[];

test("dailyDuaPool: tekrarsız, geçerli anahtarlar, kıssa ayeti yok, bilinen dualar var", () => {
  assert.ok(duaPool.length >= 60, `havuz ${duaPool.length}`);
  assert.equal(new Set(duaPool).size, duaPool.length);
  for (const k of duaPool) assert.match(k, /^\d{1,3}:\d{1,3}$/);
  for (const k of ["2:67", "12:23", "36:11"]) assert.ok(!duaPool.includes(k), k);
  for (const k of ["2:201", "2:286", "20:114", "71:28"]) assert.ok(duaPool.includes(k), k);
});
