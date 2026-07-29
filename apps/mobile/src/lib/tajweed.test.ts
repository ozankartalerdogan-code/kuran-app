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

// ── Küme başına hizalama ─────────────────────────────────────────────────────
// Sunucu span'ları harf ile ona bağlanan işaretin arasından geçebiliyor. Ayrı
// <Text>'e düşen işaret Android'de noktalı daire (U+25CC) ile çizilir; sınır
// bu yüzden istemcide küme başına çekilir.

test("işaretle başlayan span taşıyıcı harfi de kapsar (gerçek 2:54 vakası)", () => {
  // ...إِنَّهُۥ — `هُ` düz metinde, `ۥ` (U+06E5) tek başına kırmızı span'daydı.
  const metin = "هُۥ";                                  // ه ُ ۥ → 3 kod noktası
  const parts = tajweedPartsFromSpans(metin, [
    { startCp: 2, endCp: 3, rule: "n", color: "#e11d48" },
  ]);
  assert.equal(parts.length, 1, "işaret taşıyıcısından ayrılmamalı");
  assert.equal(parts[0].t, "هُۥ");
  assert.equal(parts[0].color, "#e11d48");
  assert.equal(parts.map((p) => p.t).join(""), metin);
});

test("hizalama yalnız işaretleri yutar, önceki harfleri düz bırakır", () => {
  const metin = "أَنفُسَهُۥ";
  const parts = tajweedPartsFromSpans(metin, [
    { startCp: Array.from(metin).length - 1, endCp: Array.from(metin).length, rule: "n", color: "#e11d48" },
  ]);
  assert.equal(parts.map((p) => p.t).join(""), metin, "metin aynen korunmalı");
  assert.equal(parts.at(-1)!.color, "#e11d48");
  assert.equal(parts.at(-1)!.t, "هُۥ", "yalnız taşıyıcı + işaretleri almalı");
});

test("geriye alınamayan işaret önceki parçaya katılır (sahipsiz kalmaz)", () => {
  // İki bitişik span: ilki taşıyıcıda biter, ikincisi işaretle başlar.
  // Geriye alma önceki span'a çarpar; işaret o parçanın rengine katılır.
  const metin = "هُۥ";
  const parts = tajweedPartsFromSpans(metin, [
    { startCp: 0, endCp: 2, rule: "q", color: "#2563eb" },
    { startCp: 2, endCp: 3, rule: "n", color: "#e11d48" },
  ]);
  assert.equal(parts.map((p) => p.t).join(""), metin);
  assert.equal(parts.length, 1, "işaret ayrı parçaya düşmemeli");
  assert.equal(parts[0].color, "#2563eb");
});

test("hiçbir parça birleşen işaretle başlamaz", () => {
  // Değişmez: her parça tek başına çizilebilir olmalı.
  const metin = "فَتُوبُوٓا۟ إِلَىٰ بَارِئِكُمْ إِنَّهُۥ هُوَ";
  const cps = Array.from(metin);
  // Kasten küme ortalarından geçen span'lar üret.
  const spans = [];
  for (let i = 3; i < cps.length; i += 4) {
    spans.push({ startCp: i, endCp: Math.min(i + 2, cps.length), rule: "n", color: "#e11d48" });
  }
  const parts = tajweedPartsFromSpans(metin, spans);
  assert.equal(parts.map((p) => p.t).join(""), metin, "metin aynen korunmalı");
  for (const [i, p] of parts.entries()) {
    if (i === 0) continue;  // ilk parçanın öncesi yok
    assert.ok(!/^[\p{Mn}ۥۦ]/u.test(p.t), `parça ${i} işaretle başlıyor: "${p.t}"`);
  }
});

test("rengi boş span RENK tablosundan kuralla renklenir", () => {
  const parts = tajweedPartsFromSpans("abc", [
    { startCp: 0, endCp: 1, rule: "q", color: "" },
  ]);
  assert.equal(parts[0].color, RENK.q);
});
