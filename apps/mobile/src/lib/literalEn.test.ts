/**
 * literalEn.test.ts — İngilizce literal çeviri katmanının saf mantığı.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { literalEnWith, literalEn } from "./literalEn.ts";

const map = { "1:1": "  In (the) name (of) Allah  ", "1:2": "   " };

test("metin trim edilerek döner", () => {
  assert.equal(literalEnWith(map, "1:1"), "In (the) name (of) Allah");
});

test("eksik, boş veya prototip anahtarı null", () => {
  assert.equal(literalEnWith(map, "1:2"), null);
  assert.equal(literalEnWith(map, "1:3"), null);
  assert.equal(literalEnWith({}, "constructor"), null);
});

test("gömülü veriyle uçtan uca (bozuk anahtar güvenli)", () => {
  const r = literalEn("1:1");
  assert.ok(r === null || typeof r === "string");
  assert.equal(literalEn("abc"), null);
  assert.equal(literalEn("999:1"), null);
});
