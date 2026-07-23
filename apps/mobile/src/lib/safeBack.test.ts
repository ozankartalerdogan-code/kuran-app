import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { goBackOrReplace } from "./safeBack.ts";

function createNavigation(canGoBack: boolean) {
  const calls = { back: 0, replace: [] as unknown[] };
  return {
    calls,
    navigation: {
      canGoBack: () => canGoBack,
      back: () => { calls.back += 1; },
      replace: (target: unknown) => { calls.replace.push(target); },
    },
  };
}

test("uses back and does not replace when navigation history exists", () => {
  for (const fallback of ["/(tabs)", "/dersler"]) {
    const { calls, navigation } = createNavigation(true);
    goBackOrReplace(navigation, fallback);
    assert.equal(calls.back, 1);
    assert.deepEqual(calls.replace, []);
  }
});

test("uses replace with each safe fallback when history is absent", () => {
  for (const fallback of ["/(tabs)", "/dersler"]) {
    const { calls, navigation } = createNavigation(false);
    goBackOrReplace(navigation, fallback);
    assert.equal(calls.back, 0);
    assert.deepEqual(calls.replace, [fallback]);
  }
});

test("only the requested buttons use their screen-specific fallback", () => {
  const list = readFileSync(new URL("../../app/dersler/index.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../../app/dersler/[dersId].tsx", import.meta.url), "utf8");
  const ayah = readFileSync(new URL("../../app/ayah/[surahId]/[ayahNumber].tsx", import.meta.url), "utf8");
  const root = readFileSync(new URL("../../app/root/[root]/index.tsx", import.meta.url), "utf8");

  assert.match(list, /goBackOrReplace\(router, "\/\(tabs\)"\)/);
  assert.equal(detail.match(/goBackOrReplace\(router, "\/dersler"\)/g)?.length, 3);
  assert.equal(ayah.match(/goBackOrReplace\(router, "\/\(tabs\)"\)/g)?.length, 1);
  assert.equal(root.match(/goBackOrReplace\(router, "\/\(tabs\)"\)/g)?.length, 1);
});
