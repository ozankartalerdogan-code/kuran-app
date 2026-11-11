/**
 * elifbaEn.test.ts — Elif-Ba İngilizce katmanının saf mantığı.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { localizeQuizWith, localizeHarflerWith, localizeDersWith, localizeQuiz } from "./elifbaEn.ts";
import type { ElifbaQuizSoru, ElifbaHarf, ElifbaDers } from "./api.ts";

const q: ElifbaQuizSoru = {
  quiz_id: 1, lesson_id: 1, soru: "Hangisi elif?", secenekler: ["Bir", "İki"],
  dogru_cevap: "Bir", ipucu: "İpucu", zorluk: 1,
} as ElifbaQuizSoru;

const full = { strings: { "Hangisi elif?": "Which is alif?", Bir: "One", "İki": "Two", "İpucu": "Hint" } };

test("tam çeviri: soru, seçenekler, doğru cevap, ipucu çevrilir", () => {
  const [r] = localizeQuizWith(full, [q]);
  assert.equal(r.soru, "Which is alif?");
  assert.deepEqual(r.secenekler, ["One", "Two"]);
  assert.equal(r.dogru_cevap, "One");
  assert.equal(r.ipucu, "Hint");
  assert.ok(r.secenekler.includes(r.dogru_cevap));
});

test("kısmi sözlük: soru Türkçe kalır (aynı referans)", () => {
  const partial = { strings: { "Hangisi elif?": "Which is alif?", Bir: "One" } };
  const [r] = localizeQuizWith(partial, [q]);
  assert.equal(r, q);
});

test("ipucu null ise yalnız diğerleri gerekir", () => {
  const [r] = localizeQuizWith(full, [{ ...q, ipucu: null }]);
  assert.equal(r.soru, "Which is alif?");
  assert.equal(r.ipucu, null);
});

test("tr dilinde aynı referans döner", () => {
  const list = [q];
  assert.equal(localizeQuiz(list, "tr"), list);
});

test("harf: yalnız ad/ses/mahreç değişir, mantık anahtarları korunur", () => {
  const h = { harf_id: 1, harf_adi: "Elif", harf_sesi: "a", mahrec: "boğaz", kalin_ince: "kalın", grup: "birlesen" } as ElifbaHarf;
  const dict = { harfler: { Elif: { harf_adi: "Alif", harf_sesi: "aa", mahrec: "throat" } } };
  const [r] = localizeHarflerWith(dict, [h]);
  assert.equal(r.harf_adi, "Alif");
  assert.equal(r.mahrec, "throat");
  assert.equal(r.kalin_ince, "kalın");
  assert.equal(r.grup, "birlesen");
  const [u] = localizeHarflerWith(dict, [{ ...h, harf_adi: "Ba" }]);
  assert.equal(u.harf_adi, "Ba");
});

test("ders başlığı: yalnız baslik değişir", () => {
  const d = { id: 1, baslik: "1. KONU: X", konu_sirasi: 1, seviye: "temel", harf_sayisi: 3 } as ElifbaDers;
  const [r] = localizeDersWith({ dersBaslik: { "1. KONU: X": "1. LESSON: X" } }, [d]);
  assert.equal(r.baslik, "1. LESSON: X");
  assert.equal(r.seviye, "temel");
});
