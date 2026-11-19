import test from "node:test";
import assert from "node:assert/strict";
import { parseLastAsked, shouldRequestReview, REVIEW_WAIT_MS, REVIEW_INTERVAL_MS, notifyReviewCompletion, subscribeReviewCompletion } from "./storeReviewPolicy.ts";

test("değerlendirme tamamlanma, üç açılış, boş örtü ve bekleme ister", () => {
  assert.equal(REVIEW_WAIT_MS, 3_000);
  assert.equal(REVIEW_INTERVAL_MS, 259_200_000);
  const nowMs = 1_800_000_000_000;
  const ready = { opens: 3, rated: false, lastAskedMs: null, nowMs,
    completed: true, eligible: true, waitedMs: REVIEW_WAIT_MS };
  assert.equal(shouldRequestReview(ready), true);
  assert.equal(shouldRequestReview({ ...ready, opens: 4 }), true);
  for (const change of [{ opens: 2 }, { opens: NaN }, { rated: true },
    { completed: false }, { eligible: false }, { waitedMs: REVIEW_WAIT_MS - 1 }]) {
    assert.equal(shouldRequestReview({ ...ready, ...change }), false);
  }
  assert.equal(shouldRequestReview({ ...ready, lastAskedMs: nowMs - REVIEW_INTERVAL_MS + 1 }), false);
  assert.equal(shouldRequestReview({ ...ready, lastAskedMs: nowMs - REVIEW_INTERVAL_MS }), true);
  assert.equal(shouldRequestReview({ ...ready, lastAskedMs: NaN }), true);
  assert.equal(shouldRequestReview({ ...ready, lastAskedMs: nowMs + 1 }), true);
});

test("son değerlendirme zamanı eski bayrağı ve bozuk değerleri işler", () => {
  const nowMs = 1_800_000_000_000;
  for (const raw of [null, '', undefined]) {
    assert.equal(parseLastAsked(raw, nowMs), null);
  }
  assert.equal(parseLastAsked('true', nowMs), nowMs);
  assert.equal(parseLastAsked('123', nowMs), 123);
  assert.equal(parseLastAsked('abc', nowMs), null);
});

test("sonuç ekranından çıkış fırsatı iptal eder; abonelik temizlenir", () => {
  let completions = 0;
  let cancellations = 0;
  const unsubscribe = subscribeReviewCompletion(() => {
    completions++;
    return () => { cancellations++; };
  });
  const leave = notifyReviewCompletion();
  assert.equal(completions, 1);
  leave();
  assert.equal(cancellations, 1);
  unsubscribe();
  notifyReviewCompletion();
  assert.equal(completions, 1);
});
