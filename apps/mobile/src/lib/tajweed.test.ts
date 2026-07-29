/**
 * tajweed.test.ts — tecvid renklendirme testleri.
 * Çalıştır: npm run test:mobile
 *
 * Render yolu: sunucu canonical Tanzil metnini + KOD NOKTASI koordinatlı
 * tajweedSpans gönderir; istemci metni bölmeden basar, span'lar yalnız renk
 * katar. (Eski AlQuran markup parser'ı kaldırıldı: metni canonical'dan
 * saptırıyor ve harf/hareke bölerek ekranda sahipsiz işaret üretiyordu.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tajweedPartsFromSpans, RENK, TAJWEED_LEGEND } from "./tajweed.ts";

test("her tecvid kodu RENK tablosunda karşılık bulur (sarkık kod yok)", () => {
  // Span'ların taşıdığı tüm kural harfleri renklenebilmeli.
  for (const code of ["n", "p", "o", "m", "g", "f", "i", "a", "c", "u", "w", "b", "q", "h", "s", "l", "d"]) {
    assert.ok(RENK[code], `RENK['${code}'] tanımlı olmalı`);
  }
});

test("lejant 4 tecvid grubunu kapsar", () => {
  assert.equal(TAJWEED_LEGEND.length, 4);
  const renkler = TAJWEED_LEGEND.map((l) => l.renk);
  assert.ok(renkler.includes("#e11d48")); // med
  assert.ok(renkler.includes("#16a34a")); // ğunne
  assert.ok(renkler.includes("#2563eb")); // kalkale
  assert.ok(renkler.includes("#9ca3af")); // sessiz
});

// ── Span tabanlı tecvid ───────────────────────────────────────────────────────
// Sunucu canonical metni + kod noktası koordinatlı span'ları gönderir.
// Markup basmanın aksine metin canonical kalır ve harf/hareke bölünmez.

test("span'lar metni renkli/renksiz parçalara böler, metin korunur", () => {
  const parts = tajweedPartsFromSpans("abcdef", [
    { startCp: 2, endCp: 4, rule: "n", color: "#e11d48" },
  ]);
  assert.deepEqual(parts, [
    { color: null, t: "ab" },
    { color: "#e11d48", t: "cd" },
    { color: null, t: "ef" },
  ]);
  assert.equal(parts.map((p) => p.t).join(""), "abcdef");
});

test("span yoksa tek renksiz parça döner", () => {
  assert.deepEqual(tajweedPartsFromSpans("abc", []), [{ color: null, t: "abc" }]);
});

test("koordinatlar KOD NOKTASI bazlıdır (UTF-16 değil)", () => {
  // Her biri tek kod noktası olan Arapça harfler + birleşen işaret.
  const metin = "ذَٰلِكَ";           // ذ َ ٰ ل ِ ك َ  → 7 kod noktası
  const parts = tajweedPartsFromSpans(metin, [
    { startCp: 0, endCp: 3, rule: "n", color: "#e11d48" },
  ]);
  assert.equal(parts[0].color, "#e11d48");
  assert.equal(parts[0].t, "ذَٰ");
  assert.equal(parts.map((p) => p.t).join(""), metin);
});

test("bitişik aynı renkli span'lar tek parçada birleşir", () => {
  const parts = tajweedPartsFromSpans("abcd", [
    { startCp: 0, endCp: 2, rule: "u", color: "#16a34a" },
    { startCp: 2, endCp: 4, rule: "u", color: "#16a34a" },
  ]);
  assert.deepEqual(parts, [{ color: "#16a34a", t: "abcd" }]);
});

test("bozuk span'lar metni bozmadan atlanır", () => {
  const metin = "abcdef";
  const parts = tajweedPartsFromSpans(metin, [
    { startCp: 4, endCp: 2, rule: "n", color: "#e11d48" },   // ters
    { startCp: -5, endCp: 0, rule: "n", color: "#e11d48" },  // boş
    { startCp: 1, endCp: 3, rule: "q", color: "#2563eb" },   // geçerli
    { startCp: 2, endCp: 5, rule: "n", color: "#e11d48" },   // öncekiyle çakışır
    { startCp: 99, endCp: 120, rule: "n", color: "#e11d48" },// aralık dışı
  ]);
  assert.equal(parts.map((p) => p.t).join(""), metin, "metin aynen korunmalı");
  assert.deepEqual(parts, [
    { color: null, t: "a" },
    { color: "#2563eb", t: "bc" },
    { color: null, t: "def" },
  ]);
});

test("rengi boş span RENK tablosundan kuralla renklenir", () => {
  const parts = tajweedPartsFromSpans("abc", [
    { startCp: 0, endCp: 1, rule: "q", color: "" },
  ]);
  assert.equal(parts[0].color, RENK.q);
});
