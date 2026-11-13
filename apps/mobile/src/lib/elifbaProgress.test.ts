import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseElifbaSrs,
  updateElifbaSrs,
  selectQuizQuestionsWithSrs,
  computeLessonBadge,
  parseElifbaProgress,
  parseElifbaQuizScores,
} from "./elifbaProgress.ts";

test("parseElifbaSrs: düz nesne olmayan girdiler boş harita döner", () => {
  for (const raw of [null, undefined, [], ["q:1"], "metin", 42, true]) {
    assert.deepEqual(parseElifbaSrs(raw), {});
  }
});

test("parseElifbaSrs: geçersiz anahtarlar atlanır", () => {
  const raw = JSON.parse(
    '{"__proto__":{"box":1},"a b":{"box":1},"' +
      "a".repeat(65) +
      '":{"box":1},"":{"box":1},"q:104":{"box":2,"wrong":1,"lastTs":2}}',
  );
  assert.deepEqual(parseElifbaSrs(raw), {
    "q:104": { box: 2, wrong: 1, lastTs: 2 },
  });
});

test("parseElifbaSrs: geçersiz box değerleri atlanır", () => {
  const raw = {
    "q:1": { box: 0, wrong: 0, lastTs: 0 },
    "q:2": { box: 4, wrong: 0, lastTs: 0 },
    "q:3": { box: 2.5, wrong: 0, lastTs: 0 },
    "q:4": { box: "2", wrong: 0, lastTs: 0 },
    "q:5": { box: 3, wrong: 0, lastTs: 0 },
  };
  assert.deepEqual(parseElifbaSrs(raw), {
    "q:5": { box: 3, wrong: 0, lastTs: 0 },
  });
});

test("parseElifbaSrs: eksik/geçersiz wrong ve lastTs 0 olur", () => {
  const raw = {
    "harf:14": { box: 1 },
    "q:9": { box: 2, wrong: -1, lastTs: "3" },
    "q:10": { box: 3, wrong: 2.6, lastTs: 4.4 },
  };
  assert.deepEqual(parseElifbaSrs(raw), {
    "harf:14": { box: 1, wrong: 0, lastTs: 0 },
    "q:9": { box: 2, wrong: 0, lastTs: 0 },
    "q:10": { box: 3, wrong: 3, lastTs: 4 },
  });
});

test("parseElifbaProgress: temel ders ilerlemesi", () => {
  const raw = {
    "1": [1, 2, 2, 0, "3"],
    "abc": [1],
    "2": "yaramaz",
  };
  assert.deepEqual(parseElifbaProgress(raw), { "1": [1, 2] });
});

test("parseElifbaQuizScores: temel quiz skorları", () => {
  const raw = {
    "1": { score: 8.4, total: 10 },
    "2": { score: 3, total: 0 },
    "x": { score: 1, total: 1 },
  };
  assert.deepEqual(parseElifbaQuizScores(raw), { "1": { score: 8, total: 10 } });
});

test("updateElifbaSrs: yanlış box 1'e düşürür ve wrong artar", () => {
  const map = { "q:1": { box: 3 as const, wrong: 2, lastTs: 100 } };
  assert.deepEqual(updateElifbaSrs(map, "q:1", false, 200), {
    "q:1": { box: 1, wrong: 3, lastTs: 200 },
  });
  assert.deepEqual(updateElifbaSrs({}, "q:2", false, 50), {
    "q:2": { box: 1, wrong: 1, lastTs: 50 },
  });
});

test("updateElifbaSrs: doğru 1→2→3 ilerler, 3'te kalır", () => {
  let map = { "q:1": { box: 1 as const, wrong: 1, lastTs: 10 } };
  map = updateElifbaSrs(map, "q:1", true, 20) as typeof map;
  assert.equal(map["q:1"].box, 2);
  assert.equal(map["q:1"].wrong, 1);
  assert.equal(map["q:1"].lastTs, 20);

  const second = updateElifbaSrs(map, "q:1", true, 30);
  assert.equal(second["q:1"].box, 3);

  const third = updateElifbaSrs(second, "q:1", true, 40);
  assert.equal(third["q:1"].box, 3);
});

test("updateElifbaSrs: kayıtsız öğe doğru → kayıt eklenmez", () => {
  const map = { "q:1": { box: 2 as const, wrong: 1, lastTs: 10 } };
  assert.deepEqual(updateElifbaSrs(map, "q:99", true, 50), map);
});

test("updateElifbaSrs: girdi haritası değiştirilmez", () => {
  const map = { "q:1": { box: 2 as const, wrong: 1, lastTs: 10 } };
  const before = JSON.parse(JSON.stringify(map));
  updateElifbaSrs(map, "q:1", false, 99);
  updateElifbaSrs(map, "q:2", true, 99);
  assert.deepEqual(map, before);
});

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildPool(size: number): { quiz_id: number }[] {
  return Array.from({ length: size }, (_, i) => ({ quiz_id: i + 1 }));
}

test("selectQuizQuestionsWithSrs: 5 box1 + 3 box2, tekrarsız, en fazla count", () => {
  const pool = buildPool(20);
  const srs: Record<string, { box: 1 | 2 | 3; wrong: number; lastTs: number }> = {};
  for (let id = 1; id <= 7; id++) srs[`q:${id}`] = { box: 1, wrong: 1, lastTs: 1 };
  for (let id = 8; id <= 12; id++) srs[`q:${id}`] = { box: 2, wrong: 1, lastTs: 1 };

  const picked = selectQuizQuestionsWithSrs(pool, srs, 15, makeRng(12345));

  assert.equal(picked.length, 15);
  assert.equal(new Set(picked.map((item) => item.quiz_id)).size, 15);

  const box1Count = picked.filter((item) => srs[`q:${item.quiz_id}`]?.box === 1).length;
  const box2Count = picked.filter((item) => srs[`q:${item.quiz_id}`]?.box === 2).length;
  assert.equal(box1Count, 5);
  assert.equal(box2Count, 3);
});

test("selectQuizQuestionsWithSrs: pool count'tan küçükse hepsi döner", () => {
  const pool = buildPool(3);
  const picked = selectQuizQuestionsWithSrs(pool, {}, 10, makeRng(7));
  assert.equal(picked.length, 3);
  assert.deepEqual(
    picked.map((item) => item.quiz_id).sort((a, b) => a - b),
    [1, 2, 3],
  );
});

test("selectQuizQuestionsWithSrs: count <= 0 → boş dizi", () => {
  assert.deepEqual(selectQuizQuestionsWithSrs(buildPool(5), {}, 0, makeRng(1)), []);
  assert.deepEqual(selectQuizQuestionsWithSrs(buildPool(5), {}, -2, makeRng(1)), []);
});

test("computeLessonBadge: oran eşikleri", () => {
  assert.equal(computeLessonBadge(9, 15, 0), "none");
  assert.equal(computeLessonBadge(10, 15, 0), "pass");
  assert.equal(computeLessonBadge(12, 15, 0), "pass");
  assert.equal(computeLessonBadge(13, 15, 0), "master");
  assert.equal(computeLessonBadge(15, 15, 0), "crown");
  assert.equal(computeLessonBadge(15, 15, 2), "master");
  assert.equal(computeLessonBadge(20, 20, 0), "crown");
  assert.equal(computeLessonBadge(5, 0, 0), "none");
});
