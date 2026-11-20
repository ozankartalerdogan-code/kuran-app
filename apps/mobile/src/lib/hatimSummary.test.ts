import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeHatim, countFavorites } from "./hatim.ts";

const activeHatim = (readJuz: unknown[]) => JSON.stringify({
  currentId: "active",
  hatims: [{ id: "active", startDate: "2026-11-20", completedDate: null, readJuz }],
});

test("no active hatim returns null", () => {
  for (const raw of [null, "", "invalid", "null", '{"hatims":[],"currentId":null}']) {
    assert.equal(summarizeHatim(raw), null);
  }
  assert.equal(summarizeHatim(JSON.stringify({
    currentId: null,
    hatims: [{ id: "old", startDate: "2026-11-19", completedDate: "2026-11-20", readJuz: [1] }],
  })), null);
});

test("active hatim removes duplicates, non-integers and out-of-range juz", () => {
  const summary = summarizeHatim(activeHatim([1, 1, 2, 30, 0, -1, 31, 1.5, "3", null]));
  assert.deepEqual(summary, { done: 3, readJuz: new Set([1, 2, 30]) });
  assert.deepEqual(summarizeHatim(activeHatim([])), { done: 0, readJuz: new Set() });
});

test("done cannot exceed 30", () => {
  const summary = summarizeHatim(activeHatim(Array.from({ length: 100 }, (_, i) => i % 40)));
  assert.equal(summary?.done, 30);
  assert.equal(summary?.readJuz.size, 30);
});


test("favorites count follows the stored string-array format", () => {
  assert.equal(countFavorites(["1:1", "2:255"]), 2);
  for (const value of [null, [], {}, "1:1", [1]]) assert.equal(countFavorites(value), 0);
});
