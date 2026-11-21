/**
 * searchNormalize.test.ts — arama metni normalleştirme birim testleri.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText } from "./searchNormalize.ts";
import { ESMA_UL_HUSNA } from "../data/esmaulHusna.ts";

test("şapkalı ünlüler (küçük/büyük ve ayrık) düşürülür", () => {
  assert.equal(normalizeSearchText("Er-Rahmân"), "errahman");
  assert.equal(normalizeSearchText("El-Kerîm"), "elkerim");
  assert.equal(normalizeSearchText("El-Gafûr"), "elgafur");
  assert.equal(normalizeSearchText("El-Âhir"), "elahir");
  assert.equal(normalizeSearchText("Îmân"), "iman");
  assert.equal(normalizeSearchText("Ûlâ"), "ula");
  assert.equal(normalizeSearchText("ÂÎÛâîû"), "aiuaiu");
  assert.equal(normalizeSearchText("a\u0302i\u0302u\u0302I\u0302"), "aiui");
});

test("tr-TR küçük harf kuralları korunur", () => {
  assert.equal(normalizeSearchText("İKRÂM"), "ikram");
  assert.equal(normalizeSearchText("IŞIK"), "ışık");
  assert.equal(normalizeSearchText("ŞÜKRÂN ÇAĞRI ÖĞÜT"), "şükrançağrıöğüt");
});

test("kesme, tire ve boşluk farkları yok sayılır", () => {
  const variants = ["Er-Rahmân", "errahman", "er rahman", "er-rahman", "er–rahman", "  er  rahman  "];
  for (const v of variants) {
    assert.equal(normalizeSearchText(v), "errahman");
  }
  assert.equal(normalizeSearchText("El-Mü'min"), "elmümin");
  assert.equal(normalizeSearchText("El-Mü’min"), "elmümin");
  assert.equal(normalizeSearchText("el mümin"), "elmümin");
  assert.equal(normalizeSearchText("Mâlikü'l-Mülk"), "malikülmülk");
  assert.equal(normalizeSearchText("Zü'l-Celâli ve'l-İkrâm"), "zülcelalivelikram");
});

test("Arapça metin ve kök araması bozulmaz", () => {
  assert.equal(normalizeSearchText("الرحمن"), "الرحمن");
  assert.equal(normalizeSearchText("ر ح م"), "رحم");
  assert.equal(normalizeSearchText("مالك الملك"), "مالكالملك");
  assert.equal(normalizeSearchText("المؤمن"), "المؤمن");
});

test("boş veya yalnız ayraç/boşluk içeren girdiler boş döner", () => {
  assert.equal(normalizeSearchText(""), "");
  assert.equal(normalizeSearchText("   "), "");
  assert.equal(normalizeSearchText("- ' ’ —"), "");
});

test("Esmaül Hüsna verisinde beklenen eşleşmeler", () => {
  const findEsma = (query: string) => {
    const q = normalizeSearchText(query);
    return ESMA_UL_HUSNA.filter(
      (e) =>
        normalizeSearchText(e.isim).includes(q) ||
        normalizeSearchText(e.arapca).includes(q) ||
        normalizeSearchText(e.anlam).includes(q) ||
        normalizeSearchText(e.kok).includes(q) ||
        normalizeSearchText(e.kokAnlam).includes(q),
    );
  };

  for (const query of ["rahman", "errahman", "er rahman", "er-rahman"]) {
    const hits = findEsma(query);
    assert.ok(hits.some((e) => e.sira === 1), `"${query}" Er-Rahmân'ı bulmalı`);
  }
  assert.ok(findEsma("kerim").some((e) => e.sira === 42));
  assert.ok(findEsma("kuddus").some((e) => e.sira === 4));
  assert.ok(findEsma("ikram").some((e) => e.sira === 85));
  assert.ok(findEsma("الرحيم").some((e) => e.sira === 2));
  assert.ok(findEsma("رحم").some((e) => e.sira === 1));
});
