import assert from "node:assert/strict";
import { test } from "node:test";
import { getRootOccurrenceAyahHref, groupRootMeanings } from "./rootMeaningGroups.ts";
import { resolveWordDeepLink } from "./ayahWordTarget.ts";

test("wordIndex 0 ile occurrence rozet hedefi ham indeksi korur", () => {
  assert.equal(getRootOccurrenceAyahHref({ surahId: 9, ayahNumber: 22, wordIndex: 0 }), "/ayah/9/22?word=0");
});

test("aynı ayetteki occurrence'lar ayrı word hedefleri taşır", () => {
  const grouped = groupRootMeanings([
    { word: "و", meaning: "ve", surahId: 9, ayahNumber: 22, wordIndex: 2 },
    { word: "و", meaning: "ve", surahId: 9, ayahNumber: 22, wordIndex: 5 },
  ]);
  const verses = grouped.primary[0][1].verses;
  assert.deepEqual(verses.map(getRootOccurrenceAyahHref), ["/ayah/9/22?word=2", "/ayah/9/22?word=5"]);
});

test("geçersiz veya bulunamayan word hedefi Meal davranışını korur", () => {
  const words = [{ wordIndex: 0 }, { wordIndex: 3 }];
  assert.equal(resolveWordDeepLink(words, undefined), null);
  assert.equal(resolveWordDeepLink(words, "-1"), null);
  assert.equal(resolveWordDeepLink(words, "3.5"), null);
  assert.equal(resolveWordDeepLink(words, "9"), null);
});

test("geçerli word hedefi Kelimeler sekmesini açar", () => {
  assert.deepEqual(resolveWordDeepLink([{ wordIndex: 0 }], "0"), { wordIndex: 0, tab: "words" });
});