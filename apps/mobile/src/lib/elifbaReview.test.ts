import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countLessonWrong,
  indexLessonQuestions,
  resolveLessonBadge,
  selectWrongReview,
} from "./elifbaReview.ts";
import { computeLessonBadge, type ElifbaSrsMap } from "./elifbaProgress.ts";

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function box1(wrong = 1): ElifbaSrsMap[string] {
  return { box: 1, wrong, lastTs: 1 };
}

test("indexLessonQuestions: soruları derslere ayırır", () => {
  const catalog = indexLessonQuestions([
    [
      { quiz_id: 1, lesson_id: 1 },
      { quiz_id: 2, lesson_id: 1 },
    ],
    [{ quiz_id: 3, lesson_id: 2 }],
  ]);
  assert.deepEqual(catalog, { "q:1": 1, "q:2": 1, "q:3": 2 });
});

test("indexLessonQuestions: aynı quiz aynı derste tekrar ederse kalır", () => {
  const catalog = indexLessonQuestions([
    [{ quiz_id: 5, lesson_id: 3 }],
    [{ quiz_id: 5, lesson_id: 3 }],
  ]);
  assert.deepEqual(catalog, { "q:5": 3 });
});

test("indexLessonQuestions: çakışan farklı ders ID'si dışlanır", () => {
  const catalog = indexLessonQuestions([
    [
      { quiz_id: 1, lesson_id: 1 },
      { quiz_id: 2, lesson_id: 1 },
    ],
    [
      { quiz_id: 2, lesson_id: 2 },
      { quiz_id: 3, lesson_id: 2 },
    ],
  ]);
  assert.deepEqual(catalog, { "q:1": 1, "q:3": 2 });
});

test("indexLessonQuestions: boş havuzlar boş katalog", () => {
  assert.deepEqual(indexLessonQuestions([]), {});
  assert.deepEqual(indexLessonQuestions([[], []]), {});
});

test("countLessonWrong: yalnız Kutu1 ve katalogdaki ders sayılır", () => {
  const catalog = indexLessonQuestions([
    [
      { quiz_id: 1, lesson_id: 1 },
      { quiz_id: 2, lesson_id: 1 },
    ],
    [{ quiz_id: 3, lesson_id: 2 }],
  ]);
  const srs: ElifbaSrsMap = {
    "q:1": box1(),
    "q:2": { box: 2, wrong: 1, lastTs: 1 },
    "q:3": box1(2),
    "q:99": box1(),
    "harf:14": box1(),
  };

  assert.equal(countLessonWrong(srs, catalog, 1), 1);
  assert.equal(countLessonWrong(srs, catalog, 2), 1);
  assert.equal(countLessonWrong(srs, catalog, 3), 0);
});

test("countLessonWrong: yetim q ve harf kayıtları N'ye katılmaz", () => {
  const srs: ElifbaSrsMap = {
    "q:7": box1(),
    "harf:3": box1(),
  };
  assert.equal(countLessonWrong(srs, {}, 1), 0);
});

test("selectWrongReview: yalnız Kutu1 ve benzersiz quiz ID'leri", () => {
  const pool = [
    { quiz_id: 1, lesson_id: 1 },
    { quiz_id: 1, lesson_id: 1 },
    { quiz_id: 2, lesson_id: 1 },
    { quiz_id: 3, lesson_id: 1 },
  ];
  const srs: ElifbaSrsMap = {
    "q:1": box1(),
    "q:2": { box: 2, wrong: 1, lastTs: 1 },
    "q:3": box1(),
  };

  const picked = selectWrongReview(pool, srs, 15, makeRng(42));
  assert.deepEqual(
    picked.map((item) => item.quiz_id).sort((a, b) => a - b),
    [1, 3],
  );
});

test("selectWrongReview: 0/15/16 Kutu1 sorusu", () => {
  const srs: ElifbaSrsMap = {};
  for (let id = 1; id <= 16; id += 1) srs[`q:${id}`] = box1();

  const none = Array.from({ length: 5 }, (_, i) => ({ quiz_id: i + 1, lesson_id: 1 }));
  assert.deepEqual(selectWrongReview(none, {}, 15, makeRng(1)), []);

  const fifteen = Array.from({ length: 15 }, (_, i) => ({ quiz_id: i + 1, lesson_id: 1 }));
  assert.equal(selectWrongReview(fifteen, srs, 15, makeRng(2)).length, 15);

  const sixteen = Array.from({ length: 16 }, (_, i) => ({ quiz_id: i + 1, lesson_id: 1 }));
  const capped = selectWrongReview(sixteen, srs, 15, makeRng(3));
  assert.equal(capped.length, 15);
  assert.equal(new Set(capped.map((item) => item.quiz_id)).size, 15);
});

test("selectWrongReview: RNG deterministik ve girdiler değişmez", () => {
  const pool = Array.from({ length: 16 }, (_, i) => ({ quiz_id: i + 1, lesson_id: 1 }));
  const srs: ElifbaSrsMap = {};
  for (let id = 1; id <= 16; id += 1) srs[`q:${id}`] = box1();

  const poolBefore = pool.map((item) => item.quiz_id);
  const srsBefore = JSON.parse(JSON.stringify(srs)) as ElifbaSrsMap;

  const first = selectWrongReview(pool, srs, 15, makeRng(123));
  const second = selectWrongReview(pool, srs, 15, makeRng(123));

  assert.deepEqual(
    first.map((item) => item.quiz_id),
    second.map((item) => item.quiz_id),
  );
  assert.deepEqual(pool.map((item) => item.quiz_id), poolBefore);
  assert.deepEqual(srs, srsBefore);
});

test("selectWrongReview: kilitli ders havuzunu çağıran filtreler", () => {
  const openPool = [
    { quiz_id: 1, lesson_id: 1 },
    { quiz_id: 2, lesson_id: 1 },
  ];
  const lockedPool = [{ quiz_id: 10, lesson_id: 2 }];
  const srs: ElifbaSrsMap = {
    "q:1": box1(),
    "q:2": box1(),
    "q:10": box1(),
  };

  const picked = selectWrongReview([...openPool], srs, 15, makeRng(9));
  assert.deepEqual(
    picked.map((item) => item.quiz_id).sort((a, b) => a - b),
    [1, 2],
  );
  assert.equal(picked.some((item) => item.lesson_id === 2), false);
  assert.equal(lockedPool.length, 1);
});

test("resolveLessonBadge: skor yoksa none", () => {
  assert.equal(resolveLessonBadge(undefined, 0, true, computeLessonBadge), "none");
  assert.equal(resolveLessonBadge(null, 0, true, computeLessonBadge), "none");
});

test("resolveLessonBadge: eksik katalogda taç gösterilmez", () => {
  assert.equal(
    resolveLessonBadge({ score: 15, total: 15 }, 0, true, computeLessonBadge),
    "crown",
  );
  assert.equal(
    resolveLessonBadge({ score: 15, total: 15 }, 0, false, computeLessonBadge),
    "master",
  );
  assert.equal(
    resolveLessonBadge({ score: 10, total: 15 }, 0, false, computeLessonBadge),
    "pass",
  );
});
