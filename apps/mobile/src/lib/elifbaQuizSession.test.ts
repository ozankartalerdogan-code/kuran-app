import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuizQuestions,
  answerOnce,
  type AnswerState,
  type QuizQuestion,
} from "./elifbaQuizSession.ts";
import { updateElifbaSrs } from "./elifbaProgress.ts";

function soru(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    quiz_id: 1,
    lesson_id: 1,
    soru: "Bu harf hangisi?",
    secenekler: ["ا", "ب", "ت"],
    dogru_cevap: "ا",
    ipucu: "İlk harf",
    zorluk: 1,
    ...overrides,
  };
}

function state(overrides: Partial<AnswerState> = {}): AnswerState {
  return { answeredIds: [], score: 0, srs: {}, ...overrides };
}

test("normalizeQuizQuestions: soru, doğru cevap ve en az iki benzersiz şık ister", () => {
  const pool: QuizQuestion[] = [
    soru({ quiz_id: 1 }),
    soru({ quiz_id: 2, soru: "" }),
    soru({ quiz_id: 3, dogru_cevap: "" }),
    soru({ quiz_id: 4, secenekler: ["ا"] }),
    soru({ quiz_id: 5, secenekler: ["ب", "ت"] }),
    soru({ quiz_id: 6, secenekler: ["ا", " ", ""] }),
    soru({ quiz_id: 7, secenekler: [] }),
  ];

  assert.deepEqual(
    normalizeQuizQuestions(pool).map((q) => q.quiz_id),
    [1],
  );
});

test("normalizeQuizQuestions: kopya şıkları siler, sırayı korur", () => {
  const [q] = normalizeQuizQuestions([
    soru({ secenekler: ["ا", "ب", "ا", "ب", "ت"] }),
  ]);

  assert.deepEqual(q.secenekler, ["ا", "ب", "ت"]);
});

test("normalizeQuizQuestions: girdi dizisini değiştirmez", () => {
  const input = [soru({ secenekler: ["ا", "ا", "ب"] })];
  normalizeQuizQuestions(input);
  assert.deepEqual(input[0].secenekler, ["ا", "ا", "ب"]);
});

test("answerOnce: doğru yanıt skoru artırır ve q anahtarını kaydetmez", () => {
  const s = state();
  const q = soru();
  const next = answerOnce(s, q, "ا", 100, updateElifbaSrs);

  assert.deepEqual(next.answeredIds, [1]);
  assert.equal(next.score, 1);
  assert.deepEqual(next.srs, {});
});

test("answerOnce: yanlış yanıt skoru artırmaz ve q anahtarını kaydeder", () => {
  const next = answerOnce(state(), soru(), "ب", 100, updateElifbaSrs);

  assert.deepEqual(next.answeredIds, [1]);
  assert.equal(next.score, 0);
  assert.deepEqual(next.srs, { "q:1": { box: 1, wrong: 1, lastTs: 100 } });
});

test("answerOnce: aynı soruya ikinci yanıt no-op", () => {
  const s = state({ answeredIds: [1], score: 0, srs: {} });
  const next = answerOnce(s, soru(), "ا", 200, updateElifbaSrs);

  assert.deepEqual(next, s);
});

test("answerOnce: şıklarda olmayan yanıt no-op", () => {
  const s = state();
  const next = answerOnce(s, soru(), "ج", 100, updateElifbaSrs);

  assert.deepEqual(next, s);
});

test("answerOnce: girdi state ve SRS haritası değişmez", () => {
  const srs = { "q:9": { box: 2 as const, wrong: 1, lastTs: 10 } };
  const s = state({ srs });
  const q = soru({ secenekler: ["ا", "ب"] });

  const next = answerOnce(s, q, "ب", 100, updateElifbaSrs);

  assert.deepEqual(s, { answeredIds: [], score: 0, srs });
  assert.deepEqual(srs, { "q:9": { box: 2, wrong: 1, lastTs: 10 } });
  assert.notEqual(next, s);
  assert.notEqual(next.srs, srs);
  assert.deepEqual(q.secenekler, ["ا", "ب"]);
});
