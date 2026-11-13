import { test } from "node:test";
import assert from "node:assert/strict";
import { PendingNavigation } from "./pendingNavigation.ts";

test("soğuk açılış hedefi navigation ve onboarding hazır olunca bir kez tüketilir", () => {
  const pending = new PendingNavigation();
  pending.remember("/ayah/2/255", "notification-1");
  assert.equal(pending.take(false, true), null);
  assert.equal(pending.take(true, false), null);
  assert.equal(pending.take(true, true), "/ayah/2/255");
  pending.remember("/ayah/2/255", "notification-1");
  assert.equal(pending.take(true, true), null);
});
test("onboarding sırasında yeni bağlantı son hedef olur; sıcak bildirim ayrıca tüketilir", () => {
  const pending = new PendingNavigation();
  pending.remember("/sure-listesi");
  pending.remember("/ayah/1/1", "first");
  assert.equal(pending.take(true, true), "/ayah/1/1");
  pending.remember("/namaz", "second");
  assert.equal(pending.take(true, true), "/namaz");
  assert.equal(pending.take(true, true), null);
});
