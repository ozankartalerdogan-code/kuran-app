import { test } from "node:test";
import assert from "node:assert/strict";
import { clipTarget, placeTourCard, tourSpotlight } from "./tourGeometry.ts";
const bounds = { x: 0, y: 24, width: 360, height: 752 };

test("hedef görünür alana dört yönden kırpılır", () => {
  assert.deepEqual(clipTarget({ x: -10, y: 0, width: 60, height: 80 }, bounds), { x: 0, y: 24, width: 50, height: 56 });
  assert.deepEqual(clipTarget({ x: 340, y: 750, width: 60, height: 80 }, bounds), { x: 340, y: 750, width: 20, height: 26 });
});
test("ölçülmemiş, ekran dışı veya bozuk hedef için kesit yok", () => {
  for (const target of [
    { x: 0, y: 30, width: 0, height: 20 }, { x: 0, y: 30, width: -1, height: 20 },
    { x: NaN, y: 30, width: 20, height: 20 }, { x: 500, y: 30, width: 20, height: 20 },
    { x: 0, y: 900, width: 20, height: 20 }, { x: 0, y: 0, width: 20, height: 20 },
  ]) assert.equal(clipTarget(target, bounds), null);
});
test("alt sekme hedefinde kart yukarıda, ok hedef merkezine yönelir", () => {
  const target = { x: 80, y: 700, width: 60, height: 48 };
  const card = placeTourCard(target, bounds, 220);
  assert.equal(card.arrow, "down");
  assert.ok(card.y + 220 < target.y);
  assert.equal(card.x + card.arrowX, 110);
});
test("üstte yer yoksa kart alta geçer", () => {
  const target = { x: 80, y: 40, width: 60, height: 48 };
  const card = placeTourCard(target, bounds, 220);
  assert.equal(card.arrow, "up");
  assert.ok(card.y > target.y + target.height);
});
test("iki tarafa sığmayan büyük yazı kartı oksuz ve ekranla sınırlıdır", () => {
  const card = placeTourCard({ x: 80, y: 350, width: 60, height: 48 }, bounds, 1200);
  assert.equal(card.arrow, null);
  assert.equal(card.maxHeight, bounds.height - 32);
  assert.ok(card.y >= bounds.y);
});
test("tablet, yatay ve küçük ekranlarda kart yatay ortalı ve ok kart içinde", () => {
  for (const [width, height] of [[360, 752], [1024, 1300], [720, 300], [240, 300]]) {
    const area = { x: 10, y: 20, width, height };
    for (const x of [10, width - 30]) {
      const card = placeTourCard({ x, y: 100, width: 30, height: 40 }, area, 200);
      assert.equal(card.x + card.width / 2, area.x + width / 2);
      assert.ok(card.arrowX >= 24 && card.arrowX <= card.width - 24);
      assert.ok(card.y >= area.y);
    }
  }
});

test("kesit sekme içeriğini aşmaz; örtüden ayrıca alt inset düşülmez", () => {
  const overlay = { x: 0, y: 24, width: 360, height: 752 };
  const tab = { x: 72, y: 728, width: 72, height: 48 };
  assert.deepEqual(tourSpotlight(tab, overlay), tab);
  assert.deepEqual(tourSpotlight({ ...tab, y: 752 }, overlay), { ...tab, y: 752, height: 24 });
});
test("kart ile kesit arasında 16 birim mesafe korunur", () => {
  const tab = { x: 72, y: 700, width: 72, height: 48 };
  const card = placeTourCard(tab, bounds, 240);
  assert.equal(tab.y - (card.y + 240), 16);
});
