import { test } from "node:test";
import assert from "node:assert/strict";
import { acquireDiyanetSlot } from "./diyanetSlot.ts";

test("healthy shared budget keeps lock and releases it after use", async () => {
  const deleted: string[] = [];
  const redis = {
    set: async () => "OK",
    del: async (key: string) => { deleted.push(key); },
  };
  const slot = await acquireDiyanetSlot(redis, { limit: async (key) => {
    assert.equal(key, "global");
    return { success: true };
  } }, 11002, "2026-11-01");
  assert.equal(typeof slot, "function");
  if (typeof slot === "function") await slot();
  assert.deepEqual(deleted, ["diyanet:lock:11002:2026-11-01"]);
});

test("shared budget denial and timeout cannot authorize Diyanet", async () => {
  for (const result of [{ success: false }, { success: true, reason: "timeout" }]) {
    let deleted = false;
    const slot = await acquireDiyanetSlot({
      set: async () => "OK",
      del: async () => { deleted = true; },
    }, { limit: async () => result }, 11002, "2026-11-01");
    assert.equal(slot, false);
    assert.equal(deleted, true);
  }
});
