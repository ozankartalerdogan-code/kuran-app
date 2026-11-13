import { test } from "node:test";
import assert from "node:assert/strict";
import { needsWelcome } from "./onboardingPolicy.ts";

test("izin sırasında öldürülen kurulum bildirim tercihi olsa da yeni kullanıcıdır", () => {
  for (const pref of [null, "0", "1"]) {
    assert.equal(needsWelcome(null, "1", pref, null, null), true);
    assert.equal(needsWelcome(null, null, pref, null, '{"version":7,"status":"eligible"}'), true);
  }
});
test("mevcut ve tamamlamış kullanıcıya yeniden onboarding gösterilmez", () => {
  assert.equal(needsWelcome("1", "1", "1", null, null), false);
  for (const legacy of ["6", "", "bozuk"]) assert.equal(needsWelcome(null, null, "1", legacy, null), false);
  assert.equal(needsWelcome(null, null, "0", null, "{"), false);
  assert.equal(needsWelcome(null, null, null, null, "{"), false);
  assert.equal(needsWelcome(null, null, null, null, '{"version":7,"status":"completed"}'), false);
  assert.equal(needsWelcome(null, null, null, null, null), true);
});
