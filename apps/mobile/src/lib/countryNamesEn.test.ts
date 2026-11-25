/**
 * countryNamesEn.test.ts — ülke adı çevirisi ve şehir alt satırı.
 * Çalıştır: node --test apps/mobile/src/lib/countryNamesEn.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COUNTRY_NAME_KEYS, citySubtitle, countryNameEn } from "./countryNamesEn.ts";
import { titleCaseTr } from "./diyanetPrayer.ts";

const here = dirname(fileURLToPath(import.meta.url));
const citiesPath = join(here, "../../../web/src/data/diyanetCities.json");

test("Diyanet verisindeki her ülkenin İngilizcesi var", () => {
  const data = JSON.parse(readFileSync(citiesPath, "utf8")) as { fields: string[]; rows: unknown[][] };
  const i = data.fields.indexOf("country");
  const countries = new Set(data.rows.map((r) => String(r[i])));
  const missing = [...countries].filter((c) => countryNameEn(c) === null);
  assert.deepEqual(missing, []);
  assert.ok(COUNTRY_NAME_KEYS.length >= countries.size);
});

test("countryNameEn: büyük/küçük harf ve boşluk fark etmez", () => {
  assert.equal(countryNameEn("FRANSA"), "France");
  assert.equal(countryNameEn(" Almanya "), "Germany");
  assert.equal(countryNameEn("YOKÜLKE"), null);
});

const sub = (name: string, state: string, country: string, lang: "tr" | "en") =>
  citySubtitle({ name, state, country }, lang, country === "TÜRKİYE", titleCaseTr);

test("citySubtitle: İngilizce modda ülke İngilizce, tekrar yok", () => {
  assert.equal(sub("PARIS", "FRANSA", "FRANSA", "en"), "France");
  assert.equal(sub("KOLN", "NORDRHEIN-WESTFALEN", "ALMANYA", "en"), "Nordrhein-Westfalen, Germany");
  assert.equal(sub("HONOLULU", "HAVAI ADALARI", "ABD", "en"), "Hawaii, United States");
});

test("citySubtitle: Türkçe modda Türkçe kalır, 'Fransa, Fransa' olmaz", () => {
  assert.equal(sub("PARIS", "FRANSA", "FRANSA", "tr"), "Fransa");
  // Diyanet adları Türkçe harfsiz gelir; büyük harf düzeni korunur, ABD kısaltması bozulmaz.
  assert.equal(sub("HONOLULU", "HAVAI ADALARI", "ABD", "tr"), "Havai Adalari, ABD");
  assert.equal(sub("NEW YORK", "NEW YORK", "ABD", "tr"), "ABD");
});

test("citySubtitle: Türkiye şehirleri iki dilde de aynı", () => {
  for (const lang of ["tr", "en"] as const) {
    assert.equal(sub("KADIKÖY", "İSTANBUL", "TÜRKİYE", lang), "İstanbul, Türkiye");
    assert.equal(sub("İSTANBUL", "İSTANBUL", "TÜRKİYE", lang), "Türkiye");
  }
});
