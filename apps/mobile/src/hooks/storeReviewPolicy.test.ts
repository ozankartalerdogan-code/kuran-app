import test from "node:test";
import assert from "node:assert/strict";
import { shouldRequestReview, REVIEW_WAIT_MS, notifyReviewCompletion, subscribeReviewCompletion } from "./storeReviewPolicy.ts";

test("değerlendirme tamamlanma, üç açılış, boş örtü ve bekleme ister", () => {
  const ready = { opens: 3, asked: false, completed: true, eligible: true, waitedMs: REVIEW_WAIT_MS };
  assert.equal(shouldRequestReview(ready), true);
  assert.equal(shouldRequestReview({ ...ready, opens: 4 }), true);
  for (const change of [{ opens: 2 }, { opens: NaN }, { asked: true },
    { completed: false }, { eligible: false }, { waitedMs: REVIEW_WAIT_MS - 1 }]) {
    assert.equal(shouldRequestReview({ ...ready, ...change }), false);
  }
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
