/**
 * quizUtils.test.ts — ders quiz normalleştirme testleri.
 * Çalıştır: npm run test:mobile
 *
 * normalizeQuizSorular yerel JSON quiz verisini ekran formatına çevirir.
 * Bozuk/eksik veri (boş seçenek, eksik soru) kullanıcıya kırık quiz
 * göstermemeli → bu yüzden eleme kuralları test ediliyor (madde 18).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeQuizSorular, shuffleQuizOptions } from "./quizUtils.ts";

test("dizi formatı: 'A) metin' şıkları harf + metne ayrılır", () => {
  const out = normalizeQuizSorular([
    { id: "1", soru: "Soru?", dogru_cevap: "A", aciklama: "açıklama", secenekler: ["A) Birinci", "B) İkinci"] },
  ]);
  assert.deepEqual(out, [
    {
      id: "1",
      soru: "Soru?",
      dogru: "A",
      aciklama: "açıklama",
      cevaplar: [
        { harf: "A", metin: "Birinci" },
        { harf: "B", metin: "İkinci" },
      ],
    },
  ]);
});

test("nesne formatı: {A:..., B:...} şıklara çevrilir, eksik açıklama boş string", () => {
  const out = normalizeQuizSorular([
    { id: "2", soru: "Soru2", dogru_cevap: "B", secenekler: { A: "Bir", B: "İki" } },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].aciklama, "");
  assert.deepEqual(out[0].cevaplar, [
    { harf: "A", metin: "Bir" },
    { harf: "B", metin: "İki" },
  ]);
});

test("ayraçsız şık: tüm metin korunur, harf ilk karakter", () => {
  const out = normalizeQuizSorular([
    { id: "3", soru: "S", dogru_cevap: "E", secenekler: ["Elma"] },
  ]);
  assert.deepEqual(out[0].cevaplar, [{ harf: "E", metin: "Elma" }]);
});

test("bozuk/eksik sorular elenir (boş id/soru/seçenek)", () => {
  const out = normalizeQuizSorular([
    { id: "", soru: "x", secenekler: ["A) a"] },   // id boş
    { id: "4", soru: "", secenekler: ["A) a"] },    // soru boş
    { id: "5", soru: "ok", secenekler: [] },         // seçenek yok
  ]);
  assert.deepEqual(out, []);
});

test("nesne olmayan öğeler atlanır", () => {
  const out = normalizeQuizSorular([
    null,
    "metin",
    42,
    { id: "6", soru: "s", dogru_cevap: "A", secenekler: ["A) a"] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "6");
});

test("boş girdi → boş dizi", () => {
  assert.deepEqual(normalizeQuizSorular([]), []);
});

test("sayısal id/soru güvenli string'e çevrilir (dış veri güveni)", () => {
  const out = normalizeQuizSorular([
    { id: 7, soru: 123, dogru_cevap: "A", secenekler: ["A) a"] },
  ]);
  assert.equal(out[0].id, "7");
  assert.equal(out[0].soru, "123");
});

test("doğru cevap harfi şıklarda yoksa soru elenir", () => {
  const out = normalizeQuizSorular([
    { id: "8", soru: "s", dogru_cevap: "E", secenekler: ["A) a", "B) b"] },
    { id: "9", soru: "s", dogru_cevap: "", secenekler: ["A) a", "B) b"] },
  ]);
  assert.deepEqual(out, []);
});

test("tekrarlanan şık metni olan soru elenir (shuffle metin eşleşmesine dayanır)", () => {
  const out = normalizeQuizSorular([
    { id: "10", soru: "s", dogru_cevap: "A", secenekler: ["A) aynı", "B) aynı", "C) farklı"] },
    { id: "11", soru: "s", dogru_cevap: "A", secenekler: ["A) bir", "B) iki"] }, // sağlam — kalmalı
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "11");
});

test("shuffleQuizOptions: doğru cevap korunur + harfler A/B/C/D sıralı", () => {
  const soru = normalizeQuizSorular([
    { id: "1", soru: "S?", dogru_cevap: "C", secenekler: ["A) yanlış1", "B) yanlış2", "C) DOĞRU", "D) yanlış3"] },
  ])[0];
  for (let i = 0; i < 25; i++) {
    const s = shuffleQuizOptions(soru);
    assert.deepEqual(s.cevaplar.map((c) => c.harf), ["A", "B", "C", "D"]); // yeniden harfli, sıralı
    const dogruMetin = s.cevaplar.find((c) => c.harf === s.dogru)?.metin;
    assert.equal(dogruMetin, "DOĞRU"); // doğru cevabın METNİ korunur (harf değişse de)
    assert.deepEqual(
      s.cevaplar.map((c) => c.metin).slice().sort(),
      ["DOĞRU", "yanlış1", "yanlış2", "yanlış3"].slice().sort(),
    ); // aynı şık kümesi, kayıp yok
  }
});
