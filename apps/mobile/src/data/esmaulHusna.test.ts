/**
 * esmaulHusna.test.ts — Esmaül Hüsna verisinin bütünlük testleri.
 * Çalıştır: npm run test:mobile
 *
 * Bu veri uygulamada "güvenilir" kabul edilip doğrudan ekrana basılır
 * (esma.tsx). Elle düzenlenen büyük bir dizi olduğu için regresyon riski
 * yüksek: mükerrer sıra, atlanan numara, eksik alan gibi hatalar sessizce
 * kırık liste gösterir. Bu test o sınıf hataları build/CI'da yakalar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ESMA_UL_HUSNA } from "./esmaulHusna.ts";

test("tam olarak 99 isim vardır", () => {
  assert.equal(ESMA_UL_HUSNA.length, 99);
});

test("sira alanları 1..99 aralığını eksiksiz ve mükerrersiz kapsar", () => {
  const siralar = ESMA_UL_HUSNA.map((e) => e.sira).sort((a, b) => a - b);
  assert.deepEqual(siralar, Array.from({ length: 99 }, (_, i) => i + 1));
});

test("isimler benzersizdir (mükerrer kayıt yok)", () => {
  const isimler = new Set(ESMA_UL_HUSNA.map((e) => e.isim));
  assert.equal(isimler.size, ESMA_UL_HUSNA.length);
});

test("her kaydın zorunlu metin alanları dolu ve string'tir", () => {
  for (const e of ESMA_UL_HUSNA) {
    for (const alan of ["arapca", "isim", "anlam", "kok", "kokAnlam"] as const) {
      assert.equal(typeof e[alan], "string", `sira ${e.sira}: ${alan} string değil`);
      assert.ok(
        (e[alan] as string).trim().length > 0,
        `sira ${e.sira}: ${alan} boş`,
      );
    }
  }
});
