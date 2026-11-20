import { test } from "node:test";
import assert from "node:assert/strict";
import { updateLanguageState, type Lang } from "./languageState.ts";

for (const lang of ["tr", "en"] as const) {
  test(`system → ${lang}: aynı dilde tercih seçimi/yüklemesi snapshot'ı değiştirir`, () => {
    const initial = { preference: "system", current: lang } as const;
    const next = updateLanguageState(initial, lang, lang);
    assert.notEqual(next, initial);
    assert.deepEqual(next, { preference: lang, current: lang });
    assert.equal(updateLanguageState(next, lang, lang), next);
  });

  test(`kayıtlı ${lang}: farklı mevcut dili de günceller`, () => {
    const other: Lang = lang === "tr" ? "en" : "tr";
    assert.deepEqual(updateLanguageState({ preference: "system", current: other }, lang, other), {
      preference: lang, current: lang,
    });
  });
}

test("sistem tercihi: aynı dilde de tercih değişir ve sistem dili izlenir", () => {
  const explicit = { preference: "tr", current: "tr" } as const;
  const system = updateLanguageState(explicit, "system", "tr");
  assert.notEqual(system, explicit);
  assert.deepEqual(system, { preference: "system", current: "tr" });
  assert.deepEqual(updateLanguageState(system, "system", "en"), { preference: "system", current: "en" });
});
