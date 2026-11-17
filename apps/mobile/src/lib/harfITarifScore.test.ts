import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HARF_I_TARIF_SCORE_ID,
  mergeHarfITarifScore,
  summarizeHarfITarif,
} from "./harfITarifScore.ts";

const ids = Array.from({ length: 25 }, (_, i) => `q${i + 1}`);

function allAnswers(value: boolean): Record<string, boolean> {
  return Object.fromEntries(ids.map((id) => [id, value]));
}

test("summarizeHarfITarif: boş ID listesi null", () => {
  assert.equal(summarizeHarfITarif([], {}), null);
});

test("summarizeHarfITarif: eksik cevap null", () => {
  const answers = allAnswers(true);
  delete answers.q7;
  assert.equal(summarizeHarfITarif(ids, answers), null);
});

test("summarizeHarfITarif: tam 25 cevap sonucu döner", () => {
  assert.deepEqual(summarizeHarfITarif(ids, allAnswers(true)), {
    score: 25,
    total: 25,
  });
});

test("summarizeHarfITarif: doğru-yanlış karışık sayılır", () => {
  const answers = allAnswers(false);
  answers.q1 = true;
  answers.q5 = true;
  answers.q25 = true;
  assert.deepEqual(summarizeHarfITarif(ids, answers), {
    score: 3,
    total: 25,
  });
});

test("summarizeHarfITarif: fazladan cevaplar sayılmaz", () => {
  const answers = { ...allAnswers(true), extra: true, other: false };
  assert.deepEqual(summarizeHarfITarif(ids, answers), {
    score: 25,
    total: 25,
  });
});

test("summarizeHarfITarif: kopya veya boş ID listesi null", () => {
  assert.equal(summarizeHarfITarif([...ids, "q1"], allAnswers(true)), null);
  assert.equal(summarizeHarfITarif(["q1", ""], { q1: true, "": true }), null);
});

test("mergeHarfITarifScore: yalnız 1000 değişir, diğer skorlar korunur", () => {
  const scores = {
    "1": { score: 8, total: 10 },
    "9": { score: 4, total: 5 },
  };
  const merged = mergeHarfITarifScore(scores, { score: 22, total: 25 });
  assert.deepEqual(merged, {
    "1": { score: 8, total: 10 },
    "9": { score: 4, total: 5 },
    [HARF_I_TARIF_SCORE_ID]: { score: 22, total: 25 },
  });
  assert.notEqual(merged, scores);
  assert.equal(HARF_I_TARIF_SCORE_ID, "1000");
});

test("mergeHarfITarifScore: mevcut 1000 sonucu güncellenir", () => {
  const scores = { "1000": { score: 5, total: 25 } };
  assert.deepEqual(mergeHarfITarifScore(scores, { score: 20, total: 25 }), {
    "1000": { score: 20, total: 25 },
  });
});

test("mergeHarfITarifScore: girdi değişmez", () => {
  const scores = { "1": { score: 8, total: 10 }, "1000": { score: 5, total: 25 } };
  const before = JSON.parse(JSON.stringify(scores));
  const result = { score: 20, total: 25 };
  const resultBefore = JSON.parse(JSON.stringify(result));
  mergeHarfITarifScore(scores, result);
  assert.deepEqual(scores, before);
  assert.deepEqual(result, resultBefore);
});
