import { test } from "node:test";
import assert from "node:assert/strict";
import { beginOverlay, isOverlayBusy, withOverlayBusy } from "./overlayBusy.ts";

test("bir örtü kapanınca diğer örtünün engeli korunur; kapatma idempotenttir", () => {
  const first = beginOverlay();
  const second = beginOverlay();
  assert.equal(isOverlayBusy(), true);
  first();
  first();
  assert.equal(isOverlayBusy(), true);
  second();
  assert.equal(isOverlayBusy(), false);
});

test("izin/değerlendirme beklerken engel sürer, başarıda ve hatada kalkar", async () => {
  let finish!: () => void;
  const waiting = withOverlayBusy(() => new Promise<void>(resolve => { finish = resolve; }));
  assert.equal(isOverlayBusy(), true);
  finish();
  await waiting;
  assert.equal(isOverlayBusy(), false);
  await assert.rejects(withOverlayBusy(async () => { throw new Error("test"); }));
  assert.equal(isOverlayBusy(), false);
});
