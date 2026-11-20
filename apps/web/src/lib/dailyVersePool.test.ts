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
