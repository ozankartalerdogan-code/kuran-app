import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import * as ts from "typescript";

// Match apiCache.test.ts: evaluate transpiled TS with explicit native-module mocks.
export function loadModule<T>(filename: string, mocks: Record<string, unknown> = {}): T {
  const cache = new Map<string, { exports: unknown }>();
  function load(filename: string): unknown {
    const cached = cache.get(filename);
    if (cached) return cached.exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (id: string) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.endsWith(".json")) return createRequire(filename)(id);
      if (!id.startsWith(".")) throw new Error(`Unexpected dependency: ${id}`);
      const target = path.resolve(path.dirname(filename), id);
      return load(existsSync(`${target}.ts`) ? `${target}.ts` : path.join(target, "index.ts"));
    };
    new Function("require", "exports", "module", compiled)(localRequire, mod.exports, mod);
    return mod.exports;
  }
  return load(filename) as T;
}
