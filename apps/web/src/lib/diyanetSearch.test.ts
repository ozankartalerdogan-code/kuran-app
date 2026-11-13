import { test } from "node:test";
import assert from "node:assert/strict";
import { foldTr, searchCities } from "./diyanetSearch.ts";
import type { DiyanetCity } from "./diyanetVakit.ts";

function city(
  id: number,
  name: string,
  state: string,
  country: string,
): DiyanetCity {
  return { id, name, state, country, lat: 0, lon: 0, tz: "Europe/Istanbul" };
}

const cities: DiyanetCity[] = [
  city(1, "BÜYÜKÇEKMECE", "İSTANBUL", "TÜRKİYE"),
  city(2, "İSTANBUL", "İSTANBUL", "TÜRKİYE"),
  city(3, "KARTAL", "İSTANBUL", "TÜRKİYE"),
  city(4, "YENİKARTAL", "İSTANBUL", "TÜRKİYE"),
  city(5, "BERLIN", "BERLIN", "ALMANYA"),
  city(6, "BERGAMA", "İZMİR", "TÜRKİYE"),
  city(7, "ANKARA", "ANKARA", "ALMANYA"),
  city(8, "ANKARA", "ANKARA", "TÜRKİYE"),
];

test("foldTr Türkçe küçük harf ve aksanları sadeleştirir", () => {
  assert.equal(foldTr("BÜYÜKÇEKMECE"), "buyukcekmece");
  assert.equal(foldTr("  İSTANBUL   "), "istanbul");
  assert.equal(foldTr("Şişli"), "sisli");
  assert.equal(foldTr("ÇĞÖÜÂÎÛ"), "cgouaiu");
  assert.equal(foldTr("Çok   Boşluk"), "cok bosluk");
});

test("buyukcekmece BÜYÜKÇEKMECE bulur", () => {
  const results = searchCities(cities, "buyukcekmece");
  assert.equal(results[0]?.id, 1);
});

test("İSTANBUL, istanbul ve ıstanbul aynı sonucu verir", () => {
  const upper = searchCities(cities, "İSTANBUL").map((c) => c.id);
  const lower = searchCities(cities, "istanbul").map((c) => c.id);
  const dotless = searchCities(cities, "ıstanbul").map((c) => c.id);
  assert.deepEqual(upper, lower);
  assert.deepEqual(lower, dotless);
});

test("kartal önce KARTAL, sonra içinde geçenler", () => {
  const ids = searchCities(cities, "kartal").map((c) => c.id);
  assert.deepEqual(ids, [3, 4]);
});

test("iki karakterlik sorgu çalışır, tek karakter boş döner", () => {
  assert.ok(searchCities(cities, "be").length > 0);
  assert.deepEqual(searchCities(cities, "b"), []);
});

test("ülke adıyla eşleşir", () => {
  const ids = searchCities(cities, "almanya").map((c) => c.id);
  assert.deepEqual(ids.sort((a, b) => a - b), [5, 7]);
});

test("limit uygulanır", () => {
  assert.equal(searchCities(cities, "be", 1).length, 1);
});

test("aynı puanda TÜRKİYE önce gelir", () => {
  const ids = searchCities(cities, "ankara").map((c) => c.id);
  assert.deepEqual(ids, [8, 7]);
});
