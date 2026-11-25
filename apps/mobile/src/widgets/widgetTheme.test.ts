import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ts from "typescript";

function load(storageValue: unknown = null, shouldReject = false) {
  const source = readFileSync(new URL("./widgetTheme.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modules: Record<string, unknown> = {
    "../lib/storage": {
      STORAGE_KEYS: { nightMode: "nightMode" },
      storage: {
        getJSON: async () => {
          if (shouldReject) throw new Error("storage unavailable");
          return storageValue;
        },
      },
    },
  };
  const mod = { exports: {} };
  new Function("require", "exports", "module", compiled)((id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected module: ${id}`);
    return modules[id];
  }, mod.exports, mod);
  return mod.exports as typeof import("./widgetTheme");
}

test("applyWidgetTheme returns both light when pref is light", () => {
  const { applyWidgetTheme } = load();
  const pair = { light: { theme: "L" }, dark: { theme: "D" } };
  const result = applyWidgetTheme(pair, "light");
  assert.deepEqual(result, { light: pair.light, dark: pair.light });
  assert.strictEqual(result.light, pair.light);
  assert.strictEqual(result.dark, pair.light);
});

test("applyWidgetTheme returns both dark when pref is dark", () => {
  const { applyWidgetTheme } = load();
  const pair = { light: { theme: "L" }, dark: { theme: "D" } };
  const result = applyWidgetTheme(pair, "dark");
  assert.deepEqual(result, { light: pair.dark, dark: pair.dark });
  assert.strictEqual(result.light, pair.dark);
  assert.strictEqual(result.dark, pair.dark);
});

test("applyWidgetTheme returns the exact same pair reference when pref is null", () => {
  const { applyWidgetTheme } = load();
  const pair = { light: { theme: "L" }, dark: { theme: "D" } };
  const result = applyWidgetTheme(pair, null);
  assert.strictEqual(result, pair);
});

test("readWidgetThemePreference reads valid values and falls back to null on invalid or error", async () => {
  assert.equal(await load("light").readWidgetThemePreference(), "light");
  assert.equal(await load("dark").readWidgetThemePreference(), "dark");
  assert.equal(await load(null).readWidgetThemePreference(), null);
  assert.equal(await load("system").readWidgetThemePreference(), null);
  assert.equal(await load(123).readWidgetThemePreference(), null);
  assert.equal(await load(null, true).readWidgetThemePreference(), null);
});
