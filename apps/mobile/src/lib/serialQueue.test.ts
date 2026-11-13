import { test } from "node:test";
import assert from "node:assert/strict";
import { SerialQueue, settleJobs } from "./serialQueue.ts";

test("yenileme sürerken gelen kapatma en son çalışır, sonraki açma sırasını korur", async () => {
  const queue = new SerialQueue();
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let plan = "old";
  const refresh = queue.run(async () => { await waiting; plan = "refreshed"; });
  const disable = queue.run(async () => { plan = ""; });
  release();
  await Promise.all([refresh, disable]);
  assert.equal(plan, "");
  await queue.run(async () => { plan = "new"; });
  assert.equal(plan, "new");
});
test("başarısız işin native çağrıları bitmeden iptal başlamaz; hata damga yazdırmaz", async () => {
  const queue = new SerialQueue();
  let release!: () => void;
  const events: string[] = [];
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const failed = queue.run(async () => {
    await settleJobs([Promise.reject(new Error("schedule")), waiting.then(() => { events.push("native-end"); })]);
    events.push("stamp");
  });
  const rejected = assert.rejects(failed, /schedule/);
  const retry = queue.run(async () => { events.push("cancel", "retry", "stamp"); });
  await Promise.resolve();
  assert.deepEqual(events, []);
  release();
  await Promise.all([rejected, retry]);
  assert.deepEqual(events, ["native-end", "cancel", "retry", "stamp"]);
});
