import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LISTENING_MAX_ITEMS,
  buildListeningItems,
  type ListeningLetter,
} from "./elifbaListening.ts";
import {
  parseElifbaSrs,
  type ElifbaSrsMap,
} from "./elifbaProgress.ts";
import { countLessonWrong, indexLessonQuestions, selectWrongReview } from "./elifbaReview.ts";

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const GLYPHS = Array.from("ءابتثجحخدذرزسشصضطظعغفقكلمنهوي");

function makeLetters(count: number): ListeningLetter[] {
  return GLYPHS.slice(0, count).map((glyph, i) => ({
    harf_id: i + 1,
    tek_basina: glyph,
    harf_adi: `Harf ${i + 1}`,
  }));
}

test("buildListeningItems: 0-3 benzersiz harfte öğe üretmez", () => {
  for (let count = 0; count <= 3; count++) {
    assert.deepEqual(buildListeningItems(makeLetters(count), makeRng(1)), []);
  }
});

test("buildListeningItems: 4 harfte dört benzersiz şıklı öğeler üretir", () => {
  const letters = makeLetters(4);
  const glyphById = new Map(letters.map((l) => [l.harf_id, l.tek_basina]));
  const items = buildListeningItems(letters, makeRng(7));
  assert.equal(items.length, 4);
  for (const item of items) {
    assert.equal(item.options.length, 4);
    const ids = item.options.map((o) => o.id);
    const labels = item.options.map((o) => o.label);
    assert.equal(new Set(ids).size, 4);
    assert.equal(new Set(labels).size, 4);
    assert.ok(ids.includes(item.correctId));
    assert.equal(
      item.options.find((o) => o.id === item.correctId)?.label,
      glyphById.get(item.correctId),
    );
    assert.equal(item.fallbackLabel, `Harf ${item.audioHarfId}`);
  }
});

test("buildListeningItems: 29 harfte en fazla 15 öğe ve sabit kimlik biçimi", () => {
  const letters = makeLetters(29);
  const items = buildListeningItems(letters, makeRng(42));
  assert.equal(items.length, LISTENING_MAX_ITEMS);
  const audioIds = items.map((item) => item.audioHarfId);
  assert.equal(new Set(audioIds).size, items.length);
  for (const item of items) {
    assert.equal(item.itemId, `listen:harf:${item.audioHarfId}`);
    assert.equal(item.audioHarfId, item.correctId);
    assert.equal(item.options.length, 4);
  }
});

test("buildListeningItems: aynı glifli kayıtları ayıklar, şıklar benzersiz kalır", () => {
  const letters: ListeningLetter[] = [
    { harf_id: 1, tek_basina: "ا", harf_adi: "Elif" },
    { harf_id: 2, tek_basina: "ا", harf_adi: "Elif kopya" },
    { harf_id: 3, tek_basina: "ب", harf_adi: "Be" },
    { harf_id: 4, tek_basina: "ت", harf_adi: "Te" },
    { harf_id: 5, tek_basina: "ث", harf_adi: "Se" },
  ];
  const items = buildListeningItems(letters, makeRng(3));
  assert.equal(items.length, 4);
  for (const item of items) {
    const labels = item.options.map((o) => o.label);
    assert.equal(new Set(labels).size, 4);
    assert.ok(!item.options.some((o) => o.id === 2));
  }
});

test("buildListeningItems: deterministik RNG aynı sonucu verir", () => {
  const letters = makeLetters(20);
  assert.deepEqual(
    buildListeningItems(letters, makeRng(123)),
    buildListeningItems(letters, makeRng(123)),
  );
});

test("buildListeningItems: kaynak diziyi değiştirmez", () => {
  const letters = makeLetters(10);
  const snapshot = JSON.parse(JSON.stringify(letters));
  buildListeningItems(letters, makeRng(5));
  assert.deepEqual(letters, snapshot);
});

test("parseElifbaSrs: listen:harf anahtarlarını korur", () => {
  const parsed = parseElifbaSrs({
    "listen:harf:7": { box: 1, wrong: 2, lastTs: 10 },
    "q:3": { box: 2, wrong: 0, lastTs: 1 },
  });
  assert.deepEqual(parsed, {
    "listen:harf:7": { box: 1, wrong: 2, lastTs: 10 },
    "q:3": { box: 2, wrong: 0, lastTs: 1 },
  });
});

test("Paket 2 sayaçları listen:harf kayıtlarını kapsamaz", () => {
  const catalog = indexLessonQuestions([[{ quiz_id: 1, lesson_id: 1 }]]);
  const srs: ElifbaSrsMap = {
    "q:1": { box: 1, wrong: 1, lastTs: 1 },
    "listen:harf:1": { box: 1, wrong: 5, lastTs: 1 },
    "listen:harf:2": { box: 1, wrong: 5, lastTs: 1 },
  };
  assert.equal(countLessonWrong(srs, catalog, 1), 1);
  assert.deepEqual(
    selectWrongReview([{ quiz_id: 1 }], srs, 15, makeRng(1)).map((q) => q.quiz_id),
    [1],
  );
});
