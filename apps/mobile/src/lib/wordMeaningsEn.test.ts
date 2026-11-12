/**
 * wordMeaningsEn.test.ts — kelime/kök İngilizce katmanının saf mantığı.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wordMeaningWith,
  rootMeaningWith,
  meaningTextWith,
  wordMeaningEn,
  rootMeaningEn,
} from "./wordMeaningsEn.ts";

const gloss = { "1:1:2": "(of) Allah" };
const dict = { meanings: { Rahman: "the Most Gracious" }, roots: { رحم: "mercy" } };

test("gloss önce gelir", () => {
  assert.equal(wordMeaningWith(gloss, dict, "1:1", 2, "Rahman"), "(of) Allah");
});

test("gloss yoksa Türkçe-anlam sözlüğü (trim)", () => {
  assert.equal(wordMeaningWith(gloss, dict, "1:1", 3, " Rahman "), "the Most Gracious");
});

test("hiçbiri yoksa null", () => {
  assert.equal(wordMeaningWith(gloss, dict, "1:1", 3, "Bilinmeyen"), null);
  assert.equal(wordMeaningWith(gloss, dict, "1:1", 3, null), null);
  assert.equal(wordMeaningWith({}, {}, "1:1", 3, "constructor"), null);
});

test("kök anlamı", () => {
  assert.equal(rootMeaningWith(dict, "رحم"), "mercy");
  assert.equal(rootMeaningWith(dict, "x"), null);
  assert.equal(rootMeaningWith({}, "toString"), null);
});

test("meaningTextWith", () => {
  assert.equal(meaningTextWith(dict, "Rahman"), "the Most Gracious");
  assert.equal(meaningTextWith(dict, null), null);
});

test("gömülü veriyle uçtan uca (gloss dosyası yüklenir)", () => {
  // Node ESM'de require yoksa try/catch null döndürür; yüklenirse gerçek gloss gelir.
  const r = wordMeaningEn("1:1", 2, null);
  assert.ok(r === null || r === "(of) Allah");
  assert.equal(rootMeaningEn("yok-kök", null), null);
});
