import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveScreenRotation, headingForScreen } from "./qiblaScreenRotation.ts";

test("iOS dikey arayüzde fiziksel cihaz dönüşünü yok sayar", () => {
  for (const orientation of [0, 90, -90, 180]) {
    assert.equal(effectiveScreenRotation("ios", orientation, false), 0);
  }
});

test("iOS yatay arayüzde yalnız iki yatay dönüşü kullanır", () => {
  assert.equal(effectiveScreenRotation("ios", 90, true), 90);
  assert.equal(effectiveScreenRotation("ios", -90, true), -90);
  assert.equal(effectiveScreenRotation("ios", 180, true), 0);
  assert.equal(effectiveScreenRotation("ios", 0, true), 0);
});

test("Android arayüz oranından bağımsız olarak ekran dönüşünü korur", () => {
  for (const uiLandscape of [false, true]) {
    for (const orientation of [0, 90, 180, -90] as const) {
      assert.equal(effectiveScreenRotation("android", orientation, uiLandscape), orientation);
    }
  }
});

test("bilinmeyen dönüş veya platform telafi uygulamaz", () => {
  for (const uiLandscape of [false, true]) {
    for (const platform of ["ios", "android", "web"]) {
      for (const orientation of [undefined, 45, 270, -180, NaN, Infinity]) {
        assert.equal(effectiveScreenRotation(platform, orientation, uiLandscape), 0);
      }
    }
    for (const orientation of [0, 90, 180, -90]) {
      assert.equal(effectiveScreenRotation("web", orientation, uiLandscape), 0);
    }
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
