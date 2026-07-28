import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as ts from "typescript";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_SOURCE_PATH = path.join(HERE, "api.ts");

// Mushaf cache sözleşmesi (bkz. apps/web/src/lib/mushafCompat.ts):
// /api/mushaf schemaVersion 5'e geçerken ESKİ alanları (arabic, tajweed)
// birebir korudu ve yenilerini yanına ekledi — additive migration. Mobil
// yalnız eski alanları okuduğu için cihazdaki v3 cache'i geçerliliğini
// korur; sürüm artırmak 604 sayfayı boşuna yeniden indirtirdi.
//
// Bu test o dengeyi kilitler: istek sürümü ile yerel cache anahtarının
// sürümü AYNI kalmalı ve mobil, cache'te bulunmayan yeni şema alanlarına
// bağımlı hale gelmemeli. İkisinden biri değişirse burası kırılır.

function loadApi(source: string, persisted: Map<string, unknown>) {
  const readKeys: string[] = [];
  const writtenKeys: string[] = [];
  const storage = {
    getJSON: async (key: string) => {
      readKeys.push(key);
      return persisted.get(key) ?? null;
    },
    setJSON: async (key: string, value: unknown) => {
      writtenKeys.push(key);
      persisted.set(key, value);
    },
  };
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const localRequire = (id: string) => {
    if (id === "./storage") return { storage };
    if (id === "./runtimeConfig") return { API_BASE_URL: "https://api.example.test/v1" };
    throw new Error(`Unexpected api dependency: ${id}`);
  };
  new Function("require", "exports", "module", compiled)(localRequire, mod.exports, mod);
  return {
    api: mod.exports.api as { mushaf: { page: (page: number) => Promise<unknown> } },
    readKeys,
    writtenKeys,
  };
}

/** api.ts'teki mushaf istek sürümü (?v=N), cache anahtarı sürümü (_vN_) ve global namespace. */
function readMushafVersions(source: string) {
  const requestVersion = source.match(/\/mushaf\?page=\$\{page\}&v=(\d+)/)?.[1];
  const cacheKeyVersion = source.match(/cache_mushaf_v(\d+)_p\$\{page\}/)?.[1];
  const cacheNamespace = source.match(/const CACHE_VERSION = "(v\d+)"/)?.[1];
  return { requestVersion, cacheKeyVersion, cacheNamespace };
}

test("mushaf istek sürümü ile cache anahtarı sürümü birlikte hareket eder", () => {
  const source = readFileSync(API_SOURCE_PATH, "utf8");
  const { requestVersion, cacheKeyVersion } = readMushafVersions(source);

  assert.ok(requestVersion, "mushaf isteğinde ?v=N sürüm parametresi bulunamadı");
  assert.ok(cacheKeyVersion, "mushaf cache anahtarında _vN_ sürümü bulunamadı");
  assert.equal(
    cacheKeyVersion,
    requestVersion,
    "CDN sürümü ile yerel cache anahtarı sürümü ayrıştı: biri artırılırsa diğeri de artırılmalı, " +
      "yoksa cihaz eski şemayı yeni sürüm sanıp saklar",
  );
});

test("mushaf sayfası sürümlü anahtardan okur, aynı anahtara yazar ve tekrar kullanır", async () => {
  const source = readFileSync(API_SOURCE_PATH, "utf8");
  const { cacheKeyVersion, cacheNamespace } = readMushafVersions(source);
  assert.ok(cacheNamespace, "api.ts'te CACHE_VERSION namespace'i bulunamadı");
  const expectedKey = `${cacheNamespace}_cache_mushaf_v${cacheKeyVersion}_p1`;

  const persisted = new Map<string, unknown>();
  const { api, readKeys, writtenKeys } = loadApi(source, persisted);
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  const fresh = { schemaVersion: 5, page: 1, juz: 1, verses: [], surahs: [] };
  globalThis.fetch = (async (input: unknown) => {
    requests.push(String(input));
    return { ok: true, json: async () => fresh } as Response;
  }) as typeof fetch;

  try {
    const first = await api.mushaf.page(1);
    const second = await api.mushaf.page(1);

    assert.deepEqual(first, fresh);
    assert.deepEqual(second, fresh, "ikinci çağrı cache'ten aynı veriyi döndürmeli");
    assert.equal(requests.length, 1, "ikinci çağrı ağa tekrar çıkmamalı");
    assert.deepEqual(writtenKeys, [expectedKey]);
    assert.deepEqual(readKeys, [expectedKey, expectedKey]);
    assert.deepEqual(persisted.get(expectedKey), {
      ts: (persisted.get(expectedKey) as { ts: number }).ts,
      data: fresh,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mobil, cihaz cache'inde bulunmayan schemaVersion 5 alanlarına bağımlı değil", () => {
  // Eski cihaz cache'i schemaVersion 5 öncesi yanıtları tutuyor olabilir.
  // Mobil bu yeni alanlardan birini okumaya başlarsa, cache sürümü de
  // artırılmadıkça eski kayıtlarda undefined görür ve mushaf bozulur.
  const additiveOnlyFields = [
    "canonicalArabic",
    "canonicalTajweedSpans",
    "basmalaRange",
    "basmalaText",
  ];
  const source = readFileSync(API_SOURCE_PATH, "utf8");

  for (const field of additiveOnlyFields) {
    assert.ok(
      !source.includes(field),
      `api.ts "${field}" alanını kullanıyor: bu alan eski cihaz cache'inde yok, ` +
        "kullanılacaksa mushaf cache sürümü de artırılmalı",
    );
  }
});
