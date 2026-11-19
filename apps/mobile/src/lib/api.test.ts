import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadModule } from "../../test-support/loadModule.ts";

type Api = typeof import("./api").api;
const offline = loadModule<typeof import("./offlineTr")>(fileURLToPath(new URL("./offlineTr.ts", import.meta.url)));

function loadApi(cached: unknown = null, storageError = false) {
  const writes: unknown[] = [];
  const storage = {
    getJSON: async () => {
      if (storageError) throw new Error("storage unavailable");
      return cached;
    },
    setJSON: async (...args: unknown[]) => { writes.push(args); },
  };
  const { api } = loadModule<{ api: Api }>(fileURLToPath(new URL("./api.ts", import.meta.url)), {
    "./storage": { storage },
    "./runtimeConfig": { API_BASE_URL: "https://offline.invalid" },
    "./offlineTr": offline,
  });
  return { api, writes };
}

const cases = [
  ["surahs", (api: Api) => api.surahs.list(), () => offline.offlineSurahs()],
  ["verses", (api: Api) => api.verses.bySurah(1), () => offline.offlineVerses(1)],
  ["mushaf", (api: Api) => api.mushaf.page(1), () => offline.offlineMushafPage(1)],
] as const;

for (const [name, call, embedded] of cases) {
  test(`${name}: network failure and empty cache uses embedded data`, async t => {
    const { api, writes } = loadApi();
    t.mock.method(globalThis, "fetch", async () => { throw new TypeError("offline"); });
    assert.deepEqual(await call(api), embedded());
    assert.equal(writes.length, 0);
  });

  test(`${name}: successful API takes precedence`, async t => {
    const { api } = loadApi();
    const fresh = { source: "API" };
    t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => fresh }));
    assert.equal(await call(api), fresh);
  });

  test(`${name}: stale cache takes precedence over embedded data`, async t => {
    const stale = { source: "cache" };
    const { api } = loadApi({ ts: 0, data: stale });
    t.mock.method(globalThis, "fetch", async () => { throw new TypeError("offline"); });
    assert.equal(await call(api), stale);
  });
}

const missingCases = [
  ["verses 999", (api: Api) => api.verses.bySurah(999)],
  ["page 605", (api: Api) => api.mushaf.page(605)],
  ["ayah detail", (api: Api) => api.ayah.get(1, 1)],
] as const;
for (const [name, call] of missingCases) {
  test(`${name}: missing identifier or ayah detail retains original error`, async t => {
    const { api } = loadApi();
    const error = new TypeError("offline");
    t.mock.method(globalThis, "fetch", async () => { throw error; });
    await assert.rejects(call(api), err => err === error);
  });
}

test("storage failures still permit the final embedded fallback", async t => {
  const { api } = loadApi(null, true);
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("offline"); });
  assert.deepEqual(await api.verses.bySurah(114), offline.offlineVerses(114));
});
