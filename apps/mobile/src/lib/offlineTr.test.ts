import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadModule } from "../../test-support/loadModule.ts";

const sourcePath = fileURLToPath(new URL("./offlineTr.ts", import.meta.url));
type Offline = typeof import("./offlineTr");
const { offlineMushafPage, offlineSurahs, offlineVerses } = loadModule<Offline>(sourcePath);
const golden = JSON.parse(readFileSync(new URL("./__fixtures__/offlineTr.golden.json", import.meta.url), "utf8"));

test("fixed local route golden responses survive lossless decoding", () => {
  for (const [page, body] of Object.entries(golden.pages)) assert.deepEqual(offlineMushafPage(Number(page)), body);
  for (const [id, body] of Object.entries(golden.surahs)) assert.deepEqual(offlineVerses(Number(id)), body);
});

test("complete embedded coverage, with no I/O dependency", () => {
  assert.equal(offlineSurahs()!.length, 114);
  let verses = 0;
  let pageVerses = 0;
  for (let id = 1; id <= 114; id++) verses += offlineVerses(id)!.verses.length;
  for (let page = 1; page <= 604; page++) pageVerses += offlineMushafPage(page)!.verses.length;
  assert.equal(verses, 6236);
  assert.equal(pageVerses, 6236);
});

for (const id of [0, -1, 999, 1.5, NaN, Infinity]) {
  test(`invalid identifier ${id} returns null`, () => {
    assert.equal(offlineVerses(id), null);
    assert.equal(offlineMushafPage(id), null);
  });
}

test("missing or corrupt embedded data never throws", () => {
  const offline = loadModule<Offline>(sourcePath, {
    "../data/offlineTr": {
      loadSurahs: () => { throw new Error("missing"); },
      verseLoaders: {}, juzLoaders: {}, pageJuz: [],
    },
  });
  assert.equal(offline.offlineSurahs(), null);
  assert.equal(offline.offlineVerses(1), null);
  assert.equal(offline.offlineMushafPage(1), null);
});
