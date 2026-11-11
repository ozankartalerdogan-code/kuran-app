/**
 * translitEn.test.ts — Türkçe okunuş -> İngilizce yazım dönüşümü.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { trToEnTranslit, localizedTranslit } from "./translitEn.ts";

const cases: [string, string][] = [
  ["Bismillâhirrahmânirrahîm", "Bismillahirrahmanirrahim"],
  ["Sübhâne rabbiyel a'lâ", "Subhane rabbiyel a'la"],
  ["Eûzü billâhi", "Euzu billahi"],
  ["Allâhümme salli", "Allahumme salli"],
  ["Felyabudu rabbe hazel beyt", "Felyabudu rabbe hazel beyt"],
  ["Şükür", "Shukur"],
  ["ve lekel hamd", "wa lekel hamd"],
  ["Ve lekel hamd", "Wa lekel hamd"],
  ["Çağrı İÖÜĞ", "Chaghri IOUGh"],
  ["vel-ard, ve hüve", "wel-ard, wa huwe"],
  ["ya’lemü cinn", "ya’lemu jinn"],
  ["Er-Rahmân", "Er-Rahman"],
  ["بسم 123 ve .", "بسم 123 wa ."],
  ["every", "ewery"],
];

for (const [input, expected] of cases) {
  test(`trToEnTranslit: ${input}`, () => {
    assert.equal(trToEnTranslit(input), expected);
  });
}

test("localizedTranslit: tr değişmez, en dönüştürür, boş değer korunur", () => {
  assert.equal(localizedTranslit("Şükür ve", "tr"), "Şükür ve");
  assert.equal(localizedTranslit("Şükür ve", "en"), "Shukur wa");
  assert.equal(localizedTranslit(null, "en"), null);
  assert.equal(localizedTranslit("", "en"), "");
});
