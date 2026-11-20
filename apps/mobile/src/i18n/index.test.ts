import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadModule } from "../../test-support/loadModule.ts";

function loadLanguage() {
  let resolveRead!: (value: string) => void;
  const read = new Promise<string>(resolve => { resolveRead = resolve; });
  const language = loadModule<typeof import("./index")>(fileURLToPath(new URL("./index.ts", import.meta.url)), {
    react: { useSyncExternalStore: () => {} },
    "expo-localization": { getLocales: () => [{ languageCode: "tr" }] },
    "../lib/storage": { storage: {
      getStringSync: () => null,
      getString: () => read,
      setString: async () => {},
      remove: async () => {},
    } },
  });
  return { language, resolveRead };
}

test("startup preference is applied when no newer selection exists", async () => {
  const { language, resolveRead } = loadLanguage();
  resolveRead("en");
  await language.languageReady;
  assert.equal(language.getLangPreference(), "en");
  assert.equal(language.getLang(), "en");
});

for (const pref of ["tr", "system"] as const) {
  test(`late startup read cannot overwrite a new ${pref} preference`, async () => {
    const { language, resolveRead } = loadLanguage();
    await language.setLangPreference(pref);
    resolveRead("en");
    await language.languageReady;
    assert.equal(language.getLangPreference(), pref);
    assert.equal(language.getLang(), "tr");
  });
}
