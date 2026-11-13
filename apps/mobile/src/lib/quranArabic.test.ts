/**
 * quranArabic.test.ts — gömülü kanonik Arapça Kur'an metni (Tanzil Uthmani 1.1) bütünlüğü.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lookupMeal, type MealTable } from "./mealLookup.ts";

const here = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(join(here, "../data/quran_arabic.json"), "utf8")) as MealTable;
const mushafData = JSON.parse(readFileSync(join(here, "../data/mushaf_sayfalari.json"), "utf8")) as {
  sureAyetSayilari: number[];
};

const BASMALA_SKELETON = "بسم الله الرحمن الرحيم";

function letterSkeleton(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\p{Mn}\p{Cf}ـ]/gu, "")
    .replace(/ٱ/g, "ا");
}

function arabicAt(surahId: number, ayahNumber: number): string | null {
  if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber) || surahId < 1 || ayahNumber < 1) {
    return null;
  }
  return lookupMeal(table, surahId, ayahNumber);
}

test("114 sure, 6236 ayet, boş ayet yok ve sureAyetSayilari ile birebir eşleşir", () => {
  assert.equal(table.length, 114);
  assert.equal(table.reduce((n, r) => n + r.length, 0), 6236);
  assert.equal(mushafData.sureAyetSayilari.length, 114);
  for (let i = 0; i < 114; i += 1) {
    const row = table[i];
    assert.equal(row.length, mushafData.sureAyetSayilari[i], `sure ${i + 1} ayet sayısı`);
    for (const t of row) {
      assert.ok(typeof t === "string" && t.trim().length > 0);
    }
  }
});

test("1:1 besmele içerir", () => {
  const fatiha1 = arabicAt(1, 1);
  assert.ok(fatiha1, "1:1 mevcut olmalı");
  assert.equal(letterSkeleton(fatiha1), BASMALA_SKELETON);
  assert.ok(fatiha1.includes("بِسْمِ"));
});

test('2:1 besmele İÇERMEZ ve "الٓمٓ" ile başlar', () => {
  const bakara1 = arabicAt(2, 1);
  assert.ok(bakara1, "2:1 mevcut olmalı");
  assert.ok(!letterSkeleton(bakara1).startsWith(BASMALA_SKELETON), "2:1 başında besmele olmamalı");
  assert.ok(!bakara1.includes("بِسْمِ"), "2:1 besmele içermemeli");
  assert.ok(bakara1.startsWith("الٓمٓ"), `2:1 "الٓمٓ" ile başlamalı, gelen: ${bakara1}`);
});

test("9:1 besmele içermez", () => {
  const tevbe1 = arabicAt(9, 1);
  assert.ok(tevbe1, "9:1 mevcut olmalı");
  assert.ok(!letterSkeleton(tevbe1).startsWith(BASMALA_SKELETON), "9:1 başında besmele olmamalı");
  assert.ok(!tevbe1.includes("بِسْمِ"), "9:1 besmele içermemeli");
});

test("1 ve 9 dışındaki tüm surelerin 1. ayetleri besmele önekini içermez", () => {
  for (let surahId = 2; surahId <= 114; surahId += 1) {
    if (surahId === 9) continue;
    const firstAyah = arabicAt(surahId, 1);
    assert.ok(firstAyah && firstAyah.length > 0, `${surahId}:1 boş olmamalı`);
    assert.ok(
      !letterSkeleton(firstAyah).startsWith(BASMALA_SKELETON),
      `${surahId}:1 başında besmele kalmamalı`,
    );
  }
});

test("2:255 boş değil ve 114:6 son ayet var", () => {
  const ayetelKursi = arabicAt(2, 255);
  assert.ok(ayetelKursi && ayetelKursi.length > 0, "2:255 boş olmamalı");
  const nas6 = arabicAt(114, 6);
  assert.ok(nas6 && nas6.length > 0, "114:6 son ayet mevcut olmalı");
  assert.equal(letterSkeleton(nas6), "من الجنة والناس");
});

test("sınır dışı → null", () => {
  assert.equal(arabicAt(0, 1), null);
  assert.equal(arabicAt(1, 0), null);
  assert.equal(arabicAt(1, 8), null);
  assert.equal(arabicAt(2, 287), null);
  assert.equal(arabicAt(114, 7), null);
  assert.equal(arabicAt(115, 1), null);
  assert.equal(arabicAt(-1, 1), null);
});
