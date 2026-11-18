import { test } from "node:test";
import assert from "node:assert/strict";
import { API_LIMIT, createApiRateLimit } from "./apiRateLimit.ts";

test("Redis failure uses a per-IP 200/60s fallback and resets at the boundary", async () => {
  let now = 1000;
  const limit = createApiRateLimit({ limit: async () => { throw new Error("quota"); } }, () => now);
  for (let i = 0; i < API_LIMIT; i++) assert.equal((await limit("a")).success, true);
  const blocked = await limit("a");
  assert.equal(blocked.success, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.reset, 61_000);
  assert.equal((await limit("b")).success, true);
  now = 61_000;
  assert.equal((await limit("a")).success, true);
});

test("fallback evicts the oldest IP after 5000 entries", async () => {
  const limit = createApiRateLimit(null, () => 1000);
  for (let i = 0; i < API_LIMIT; i++) await limit("oldest");
  for (let i = 0; i < 4999; i++) await limit(String(i));
  assert.equal((await limit("oldest")).success, false);
  await limit("new");
  assert.equal((await limit("oldest")).success, true);
});

test("healthy Redis decisions pass through and do not consume the fallback", async () => {
  let failing = false;
  const result = { success: false, limit: 200, remaining: 0, reset: 1234 };
  const limit = createApiRateLimit({ limit: async () => {
    if (failing) throw new Error("offline");
    return result;
  } });
  assert.equal(await limit("a"), result);
  failing = true;
  assert.equal((await limit("a")).remaining, 199);
});

test("Upstash timeout success also uses the fallback", async () => {
  const limit = createApiRateLimit({ limit: async () => ({
    success: true, reason: "timeout", limit: 200, reset: 0, remaining: 200,
  }) });
  for (let i = 0; i < API_LIMIT; i++) await limit("a");
  assert.equal((await limit("a")).success, false);
});
