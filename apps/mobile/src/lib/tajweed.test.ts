/**
 * tajweed.test.ts — AlQuran.cloud tecvid markup parser testleri.
 * Çalıştır: npm run test:mobile
 *
 * Format: kodlu grup "[kod[ ... ]" (açılışta çift köşeli), kodsuz şeffaf grup
 * "[ ... ]". İç içe olabilir; en içteki kod geçerli. Bozuk markup çökmemeli.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTajweed, RENK, TAJWEED_LEGEND } from "./tajweed.ts";

test("markup yok: tek segment, kod null, metin aynen", () => {
  assert.deepEqual(parseTajweed("abc"), [{ code: null, t: "abc" }]);
});

test("basit kodlu grup: [n[XY] → kod n", () => {
  assert.deepEqual(parseTajweed("[n[XY]"), [{ code: "n", t: "XY" }]);
});

test("metin kodlu grubu sarar: a[n[X]b", () => {
  assert.deepEqual(parseTajweed("a[n[X]b"), [
    { code: null, t: "a" },
    { code: "n", t: "X" },
    { code: null, t: "b" },
  ]);
});

test("iç içe: en içteki kod geçerli, dışa dönünce eski kod sürer", () => {
  // [n[ A [q[ B ] C ]  → A:n, B:q, C:n
  assert.deepEqual(parseTajweed("[n[A[q[B]C]"), [
    { code: "n", t: "A" },
    { code: "q", t: "B" },
    { code: "n", t: "C" },
  ]);
});

test("kodsuz grup [..] şeffaf: içerik kod almaz", () => {
  assert.deepEqual(parseTajweed("[X]"), [{ code: null, t: "X" }]);
});

test(":sayı ekli açılış da kabul edilir: [n:2[X]", () => {
  assert.deepEqual(parseTajweed("[n:2[X]"), [{ code: "n", t: "X" }]);
});

test("bitişik aynı kodlu gruplar birleşir: [n[A][n[B] → tek 'n' segmenti 'AB'", () => {
  assert.deepEqual(parseTajweed("[n[A][n[B]"), [{ code: "n", t: "AB" }]);
});

test("bozuk: kapanmamış grup çökmez, kalan metin son kodla gelir", () => {
  assert.deepEqual(parseTajweed("[n[X"), [{ code: "n", t: "X" }]);
});

test("bozuk: fazladan kapanış ']' yok sayılır", () => {
  assert.deepEqual(parseTajweed("X]"), [{ code: null, t: "X" }]);
});

test("boş metin → boş dizi", () => {
  assert.deepEqual(parseTajweed(""), []);
});

test("gerçekçi çok-kurallı dize doğru bölünür", () => {
  // "بِ[n[سْمِ] ٱ[q[للَّهِ]" → bi(null) · سْمِ(n) · " ٱ"(null) · للَّهِ(q)
  const segs = parseTajweed("بِ[n[سْمِ] ٱ[q[للَّهِ]");
  assert.deepEqual(segs.map((s) => s.code), [null, "n", null, "q"]);
  // metin kaybı olmamalı (markup soyulunca orijinal harfler kalır)
  const flat = segs.map((s) => s.t).join("");
  assert.equal(flat, "بِسْمِ ٱللَّهِ");
});

test("her parser kodu RENK tablosunda karşılık bulur (sarkık kod yok)", () => {
  // Parser'ın ürettiği tüm kod harfleri renklenebilmeli.
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
