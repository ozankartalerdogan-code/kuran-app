import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mushafMetniHazirla } from "./mushafText.ts";
import { mushafSayfaAyetKoordinatlariGecerli as dogrulaMushafSayfasi } from "./mushafPageValidation.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_PAGE_DATA = path.resolve(HERE, "../data/mushaf_sayfalari.json");
const WEB_PAGE_DATA = path.resolve(HERE, "../../../../apps/web/src/lib/mushaf_sayfalari.json");

type MushafPageData = {
  sureAyetSayilari: number[];
  sayfaBaslangiclari: [number, number][];
  cuzBaslangiclari: [number, number][];

};

const PAGE_DATA = JSON.parse(readFileSync(MOBILE_PAGE_DATA, "utf8")) as MushafPageData;
const mushafSayfaAyetSirasiGecerli = (page: number, verses: readonly { surahId: number; ayahNumber: number }[]) => dogrulaMushafSayfasi(page, verses, PAGE_DATA.sayfaBaslangiclari, PAGE_DATA.sureAyetSayilari);

test("mushafMetniHazirla maps all Tanzil/KFGQPC compatibility characters", () => {
  const cases = [
    ["\u06DF", "\u0652"],
    ["\u06E3", "\u06DC"],
    ["\u06EB", "\u06EC"],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(mushafMetniHazirla(input), expected, `${input.codePointAt(0)?.toString(16)} mapping`);
  }
});

test("mushafMetniHazirla makes the space before every supported waqf marker NBSP", () => {
  const input = "ا \u06D6ب \u06D9ت \u06DCث";
  const expected = "ا\u00A0\u06D6ب\u00A0\u06D9ت\u00A0\u06DCث";
  assert.equal(mushafMetniHazirla(input), expected);
});

test("mushafMetniHazirla preserves code-point and UTF-16 lengths exactly", () => {
  const input = "A😀ب\u06DF ج\u06E3 د\u06EB ه \u06D6";
  const output = mushafMetniHazirla(input);

  assert.equal(Array.from(output).length, Array.from(input).length, "code-point length changed");
  assert.equal(output.length, input.length, "UTF-16 length changed");
});

test("mobile and web Mushaf page metadata are byte-identical and contain 604 valid monotonic starts", () => {
  const mobileBytes = readFileSync(MOBILE_PAGE_DATA);
  const webBytes = readFileSync(WEB_PAGE_DATA);
  assert.deepEqual(webBytes, mobileBytes, "mobile/web mushaf_sayfalari.json copies diverged");

  const data = JSON.parse(mobileBytes.toString("utf8")) as MushafPageData;
  assert.equal(data.sureAyetSayilari.length, 114);
  assert.equal(data.sayfaBaslangiclari.length, 604);
  assert.deepEqual(data.sayfaBaslangiclari[0], [1, 1]);

  let previous: [number, number] | null = null;
  for (const [index, start] of data.sayfaBaslangiclari.entries()) {
    assert.equal(start.length, 2, `page ${index + 1} start must have two coordinates`);
    const [surahId, ayahNumber] = start;
    assert.ok(Number.isInteger(surahId) && surahId >= 1 && surahId <= 114, `invalid surah at page ${index + 1}`);
    const verseCount = data.sureAyetSayilari[surahId - 1];
    assert.ok(Number.isInteger(ayahNumber) && ayahNumber >= 1 && ayahNumber <= verseCount, `invalid ayah at page ${index + 1}`);
    if (previous) {
      assert.ok(
        surahId > previous[0] || (surahId === previous[0] && ayahNumber > previous[1]),
        `page ${index + 1} start is not strictly monotonic`,
      );
    }
    previous = start;
  }
});

test("requested boundary and transition pages contain the exact ordered verse coordinates", () => {
  const cases = [
    { page: 1, verses: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]] },
    { page: 2, verses: [[2, 1], [2, 2], [2, 3], [2, 4], [2, 5]] },
    { page: 187, verses: [[9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6]] },
    { page: 106, verses: [[4, 176], [5, 1], [5, 2]] },
    { page: 604, verses: [
      [112, 1], [112, 2], [112, 3], [112, 4],
      [113, 1], [113, 2], [113, 3], [113, 4], [113, 5],
      [114, 1], [114, 2], [114, 3], [114, 4], [114, 5], [114, 6],
    ] },
  ] as const;

  for (const fixture of cases) {
    const verses = fixture.verses.map(([surahId, ayahNumber]) => ({ surahId, ayahNumber }));
    assert.equal(mushafSayfaAyetSirasiGecerli(fixture.page, verses), true, `page ${fixture.page}`);
  }
});

test("empty, missing, duplicate and out-of-order page responses are rejected", () => {
  const valid = [1, 2, 3, 4, 5, 6, 7].map((ayahNumber) => ({ surahId: 1, ayahNumber }));
  assert.equal(mushafSayfaAyetSirasiGecerli(1, []), false);
  assert.equal(mushafSayfaAyetSirasiGecerli(1, valid.slice(0, -1)), false);
  assert.equal(mushafSayfaAyetSirasiGecerli(1, [...valid.slice(0, 3), valid[2], ...valid.slice(3)]), false);
  assert.equal(mushafSayfaAyetSirasiGecerli(1, [valid[1], valid[0], ...valid.slice(2)]), false);
});
