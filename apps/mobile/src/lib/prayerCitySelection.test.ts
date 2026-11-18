import { test } from "node:test";
import assert from "node:assert/strict";
import { createLatestCityPicker } from "./prayerCitySelection.ts";

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("screen completes right after save; slow warming does not block navigation", async () => {
  const warm = deferred();
  const events: string[] = [];
  const pick = createLatestCityPicker<string>({
    save: async city => { events.push(`save:${city}`); },
    warm: async city => { events.push(`warm-start:${city}`); await warm.promise; events.push(`warm-end:${city}`); },
    complete: city => { events.push(`reschedule/back:${city}`); },
    onError: () => { events.push("error"); },
    onSettled: () => { events.push("settled"); },
  });
  await pick("ankara");
  assert.deepEqual(events, ["save:ankara", "warm-start:ankara", "reschedule/back:ankara", "settled"]);
  warm.resolve();
  await new Promise(r => setImmediate(r));
  assert.equal(events.at(-1), "warm-end:ankara");
});

test("storage writes stay ordered; stale save failures do not affect the latest pick", async () => {
  for (const failOld of [false, true]) {
    const started = deferred();
    const oldSave = deferred();
    const events: string[] = [];
    let stored = "";
    const pick = createLatestCityPicker<string>({
      save: async city => {
        if (city === "old") { started.resolve(); await oldSave.promise; }
        stored = city;
        events.push(`save:${city}`);
      },
      warm: async city => { events.push(`warm:${city}`); },
      complete: city => { events.push(`complete:${city}`); },
      onError: () => { events.push("error"); },
      onSettled: () => { events.push("settled"); },
    });
    const old = pick("old");
    await started.promise;
    const latest = pick("latest");
    if (failOld) oldSave.reject(new Error("save failed"));
    else oldSave.resolve();
    await Promise.all([old, latest]);
    assert.equal(stored, "latest");
    assert.deepEqual(events, [...(failOld ? [] : ["save:old"]), "save:latest", "warm:latest", "complete:latest", "settled"]);
  }
});

test("current save failure reports an error without warming or completing", async () => {
  const events: string[] = [];
  const pick = createLatestCityPicker<null>({
    save: async () => { throw new Error("save failed"); },
    warm: async () => { events.push("warm"); },
    complete: () => { events.push("complete"); },
    onError: () => { events.push("error"); },
    onSettled: () => { events.push("settled"); },
  });
  await pick(null);
  assert.deepEqual(events, ["error", "settled"]);
});
