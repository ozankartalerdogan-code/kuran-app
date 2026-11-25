import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadModule } from "../../test-support/loadModule.ts";

const sourcePath = fileURLToPath(new URL("./offlineTr.ts", import.meta.url));
type Offline = typeof import("./offlineTr");
const { offlineMushafPage, offlineSurahs, offlineVerses, offlineAyah, offlineDaily } = loadModule<Offline>(sourcePath);
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

test("offline ayah keeps the embedded text, navigation boundaries and absent analysis", () => {
  const first = offlineAyah(1, 1)!;
  assert.equal(first.meal, offlineVerses(1)!.verses[0].meal);
  assert.equal(first.arabicText, golden.pages[1].verses[0].arabic);
  assert.equal(first.prevAyah, null);
  assert.deepEqual(offlineAyah(1, 7)!.nextAyah, { surahId: 2, ayahNumber: 1 });
  assert.equal(offlineAyah(114, 6)!.nextAyah, null);
  assert.deepEqual(first.words, []);
  assert.equal(first.farkAnalizi, null);
  for (const n of [0, -1, 8, 1.5, NaN]) assert.equal(offlineAyah(1, n), null);
  const daily = offlineDaily()!;
  assert.ok(daily.verse?.meal);
  assert.equal(daily.dua?.verse_key, "2:201");
  assert.ok(daily.dua?.arabic_text);
});
