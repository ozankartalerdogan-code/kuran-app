import { test } from "node:test";
import assert from "node:assert/strict";
import { capsText } from "./capsText.ts";

test("capsText TR: i→İ, ı→I; Widget → WIDGET", () => {
  assert.equal(capsText("Namaz Widget'ları", "tr"), "NAMAZ WIDGET'LARI");
  assert.equal(capsText("Ayet widget'ı", "tr"), "AYET WIDGET'I");
  assert.equal(capsText("Dil seçimi", "tr"), "DİL SEÇİMİ");
  assert.equal(capsText("Işık", "tr"), "IŞIK");
});

test("capsText EN: düz büyütme", () => {
  assert.equal(capsText("Guides", "en"), "GUIDES");
});
