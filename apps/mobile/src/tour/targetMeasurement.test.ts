import { test } from "node:test";
import assert from "node:assert/strict";
import { measureWithBudget } from "./targetMeasurement.ts";

test("hiç dönmeyen native callback deneme sınırında kullanılabilir çıkışa ulaşır", async () => {
  let calls = 0;
  await new Promise<void>(resolve => {
    measureWithBudget({ measure: () => { calls++; return new Promise(() => {}); }, active: () => true,
      found: () => assert.fail(), unavailable: resolve, attempts: 2, durationMs: 200, attemptMs: 5, retryMs: 1 });
  });
  assert.equal(calls, 2);
});
test("toplam süre dolunca geç gelen ölçüm odağı değiştirmez", async () => {
  let finish!: (value: number) => void;
  const measured = new Promise<number>(resolve => { finish = resolve; });
  let found = false;
  await new Promise<void>(resolve => {
    measureWithBudget({ measure: () => measured, active: () => true, found: () => { found = true; },
      unavailable: resolve, durationMs: 10, attemptMs: 100 });
  });
  finish(1);
  await Promise.resolve();
  assert.equal(found, false);
});
test("arka plana geçiş ölçümü ve sonucu durdurur", async () => {
  let active = true, calls = 0;
  let finish!: (value: number) => void;
  const measured = new Promise<number>(resolve => { finish = resolve; });
  const stop = measureWithBudget({ measure: () => { calls++; return measured; }, active: () => active,
    found: () => assert.fail(), unavailable: () => assert.fail(), durationMs: 50 });
  await Promise.resolve();
  active = false;
  finish(1);
  await Promise.resolve();
  stop();
  assert.equal(calls, 1);
});
