import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  consumeOnboardingReturnTarget,
  ONBOARDING_RETURN_TARGET_KEY,
  saveOnboardingReturnTarget,
} from "./onboardingReturnTarget.ts";

function createMemoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(ONBOARDING_RETURN_TARGET_KEY, initial);
  return {
    values,
    async getString(key: string) {
      return values.get(key) ?? null;
    },
    async setString(key: string, value: string) {
      values.set(key, value);
    },
    async remove(key: string) {
      values.delete(key);
    },
  };
}

test("restores valid ayah and surah deep links after onboarding", async () => {
  for (const target of ["/ayah/1/1", "/surah/114", "/surah/2/ayah/286"]) {
    const memory = createMemoryStorage();
    await saveOnboardingReturnTarget(target, memory);
    assert.equal(await consumeOnboardingReturnTarget(memory), target);
  }
});

test("normal, malformed, unsupported, and onboarding targets fall back to tabs", async () => {
  for (const target of ["", "/", "/(tabs)", "/onboarding", "/ayah/2/999", "/unknown"]) {
    const memory = createMemoryStorage("/surah/1");
    await saveOnboardingReturnTarget(target, memory);
    const consumed = await consumeOnboardingReturnTarget(memory);
    assert.equal(consumed ?? "/(tabs)", "/(tabs)", `invalid target: ${target}`);
  }
});

test("stored target is consumed once and cleared", async () => {
  const memory = createMemoryStorage("/ayah/1/1");

  assert.equal(await consumeOnboardingReturnTarget(memory), "/ayah/1/1");
  assert.equal(memory.values.has(ONBOARDING_RETURN_TARGET_KEY), false);
  assert.equal(await consumeOnboardingReturnTarget(memory), null);
});

test("layout captures only unfinished-onboarding targets and redirects once", () => {
  const source = readFileSync(new URL("../../app/_layout.tsx", import.meta.url), "utf8");
  const guard = source.indexOf("if (!needsOnboarding || onboardingRedirectStarted.current) return");
  const save = source.indexOf("saveOnboardingReturnTarget(pathname, storage)");
  const redirect = source.indexOf('router.replace("/onboarding")');

  assert.ok(guard >= 0);
  assert.ok(guard < save);
  assert.ok(save < redirect);
  assert.match(source, /onboardingRedirectStarted\.current = true/);
});

test("onboarding consumes the validated target before using the tabs fallback", () => {
  const source = readFileSync(new URL("../../app/onboarding.tsx", import.meta.url), "utf8");
  const complete = source.indexOf("STORAGE_KEYS.onboarding");
  const consume = source.indexOf("consumeOnboardingReturnTarget(storage)");
  const replace = source.indexOf('router.replace(returnTarget ?? "/(tabs)")');

  assert.ok(complete >= 0);
  assert.ok(complete < consume);
  assert.ok(consume < replace);
});
