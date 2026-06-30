/**
 * ftsQuery.test.ts — arama sorgusu normalizasyonu ve FTS5 temizleyici testleri.
 * Çalıştır: npm test
 *
 * Bu fonksiyonlar kullanıcı arama girdisini işler; bir regresyon Türkçe
 * aramayı bozabilir veya ham FTS sözdizimini sızdırabilir.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeSearchQuery, expandSearchPatterns, escapeFts } from "./ftsQuery.ts";

test("sanitizeSearchQuery: Türkçe karakterleri ASCII'ye indirger", () => {
  assert.equal(sanitizeSearchQuery("Güneş"), "gunes");
  assert.equal(sanitizeSearchQuery("Çağrı"), "cagri");
  assert.equal(sanitizeSearchQuery("Öğüt"), "ogut");
  // İ/ı tuzağı: "Işık" tr-TR küçük harf "ışık" → "isik"
  assert.equal(sanitizeSearchQuery("Işık"), "isik");
});

test("sanitizeSearchQuery: baş/son boşlukları kırpar", () => {
  assert.equal(sanitizeSearchQuery("  sabır  "), "sabir");
});

test("expandSearchPatterns: orijinal + ASCII varyant döner", () => {
  // Türkçe karakter içerince iki ayrı varyant
  assert.deepEqual(expandSearchPatterns("Işık"), ["ışık", "isik"]);
});

test("expandSearchPatterns: ASCII sorgu tek varyant (dedupe)", () => {
  assert.deepEqual(expandSearchPatterns("Namaz"), ["namaz"]);
});

test("escapeFts: FTS özel karakterlerini ve operatörleri boşluğa çevirir", () => {
  assert.equal(escapeFts('"sabır" AND (namaz)'), "sabır namaz");
  assert.equal(escapeFts("a-b*c"), "a b c");
  assert.equal(escapeFts("hayır OR şükür"), "hayır şükür");
});

test("escapeFts: fazla boşlukları daraltır ve kırpar", () => {
  assert.equal(escapeFts("  çok    boşluk  "), "çok boşluk");
});

test("escapeFts: 'AND' alt-dizgesi olan kelimeyi bozmaz (kelime sınırı)", () => {
  // "anda" içinde AND var ama \b sınırı yüzünden silinmez
  assert.equal(escapeFts("anda"), "anda");
});
