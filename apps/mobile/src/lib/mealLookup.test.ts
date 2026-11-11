/**
 * mealLookup.test.ts — gömülü İngilizce meal (Pickthall) bütünlüğü.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lookupMeal, parseVerseKey, searchMealTable, type MealTable } from "./mealLookup.ts";

const here = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(join(here, "../data/meal_en_pickthall.json"), "utf8")) as MealTable;
// data/ Git dışında; temiz clone'da bu çapraz kontrol atlanır.
let surahs: { verses: number }[] | null = null;
try {
  surahs = JSON.parse(readFileSync(join(here, "../../../../data/quran/surahs.json"), "utf8"));
} catch {
  surahs = null;
}

test("114 sure, 6236 ayet, boş ayet yok", () => {
  assert.equal(table.length, 114);
  assert.equal(table.reduce((n, r) => n + r.length, 0), 6236);
  for (const row of table) for (const t of row) assert.ok(typeof t === "string" && t.trim().length > 0);
});

test("sure başına ayet sayısı kanonik listeyle aynı", { skip: !surahs }, () => {
  surahs!.forEach((s, i) => assert.equal(table[i].length, s.verses, `sure ${i + 1}`));
});

test("bilinen ayetler", () => {
  assert.equal(lookupMeal(table, 1, 1), "In the name of Allah, the Beneficent, the Merciful.");
  assert.equal(lookupMeal(table, 112, 1), "Say: He is Allah, the One!");
  assert.equal(lookupMeal(table, 114, 6), "Of the jinn and of mankind.");
});

test("sınır dışı → null", () => {
  assert.equal(lookupMeal(table, 0, 1), null);
  assert.equal(lookupMeal(table, 1, 8), null);
  assert.equal(lookupMeal(table, 115, 1), null);
});

test("parseVerseKey", () => {
  assert.deepEqual(parseVerseKey("2:255"), [2, 255]);
  assert.deepEqual(parseVerseKey(" 1:1 "), [1, 1]);
  assert.equal(parseVerseKey("2-255"), null);
  assert.equal(parseVerseKey(null), null);
});

test("searchMealTable: AND, büyük/küçük harf duyarsız, limit", () => {
  const mini: MealTable = [["The Merciful Lord", "Lord of the worlds"], ["Say: He is Allah"]];
  assert.deepEqual(searchMealTable(mini, "lord"), ["1:1", "1:2"]);
  assert.deepEqual(searchMealTable(mini, "MERCIFUL lord"), ["1:1"]);
  assert.deepEqual(searchMealTable(mini, "merciful worlds"), []);
  assert.deepEqual(searchMealTable(mini, "lord", 1), ["1:1"]);
  assert.deepEqual(searchMealTable(mini, "  ,, "), []);
  assert.deepEqual(searchMealTable(mini, "allah,"), ["2:1"]);
});

test("searchMealTable: gerçek tablo", () => {
  assert.ok(searchMealTable(table, "Allah the One", 6236).includes("112:1"));
  assert.equal(searchMealTable(table, "allah", 50).length, 50);
});
