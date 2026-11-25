import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveScreenRotation, headingForScreen } from "./qiblaScreenRotation.ts";

test("iOS her fiziksel cihaz yönünde ekran telafisini sıfır tutar", () => {
  for (const orientation of [0, 90, -90, 180, undefined, 45, 270, -180, NaN, Infinity]) {
    assert.equal(effectiveScreenRotation("ios", orientation), 0);
  }
});

test("Android ekran dönüşünü korur", () => {
  for (const orientation of [0, 90, 180, -90] as const) {
    assert.equal(effectiveScreenRotation("android", orientation), orientation);
  }
});

test("bilinmeyen dönüş veya platform telafi uygulamaz", () => {
  for (const platform of ["ios", "android", "web"]) {
    for (const orientation of [undefined, 45, 270, -180, NaN, Infinity]) {
      assert.equal(effectiveScreenRotation(platform, orientation), 0);
    }
  }
  for (const orientation of [0, 90, 180, -90]) {
    assert.equal(effectiveScreenRotation("web", orientation), 0);
  }
});

test("0 ekran dönüşünde yön birebir korunur", () => {
  for (const heading of [0, 0.1, 45, 90, 180, 270, 359.9]) {
    assert.equal(headingForScreen(heading, 0), heading);
  }
});

test("ekranın üst kenarına göre iki yatay yön ve ters dikey telafi edilir", () => {
  assert.equal(headingForScreen(90, -90), 0); // Fiziksel saat yönünde 90°.
  assert.equal(headingForScreen(270, 90), 0);
  assert.equal(headingForScreen(180, 180), 0);
  assert.equal(headingForScreen(0, 90), 90);
  assert.equal(headingForScreen(0, -90), 270);
  assert.equal(headingForScreen(0, 180), 180);
});

test("360 sınırı her iki yönde sarılır ve sonuç [0, 360) aralığındadır", () => {
  assert.equal(headingForScreen(350, 90), 80);
  assert.equal(headingForScreen(10, -90), 280);
  assert.equal(headingForScreen(360, 0), 0);
  assert.equal(headingForScreen(-10, 0), 350);
  for (const rotation of [0, 90, 180, -90] as const) {
    for (const heading of [-1080, -360, -1, 0, 359, 360, 1080]) {
      const result = headingForScreen(heading, rotation);
      assert.ok(result >= 0 && result < 360);
    }
  }
});
