/**
 * cityNamesEn.test.ts — yurt dışı şehir adlarının İngilizce karşılıkları ve takma ad araması.
 * Çalıştır: node --test apps/mobile/src/lib/cityNamesEn.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CITY_NAME_EN_ENTRIES,
  cityAliasTargets,
  cityNameEn,
  searchCitiesWithAliases,
} from "./cityNamesEn.ts";
import { titleCaseTr } from "./diyanetPrayer.ts";
import type { ManualCity } from "./diyanetPrayer.ts";

const here = dirname(fileURLToPath(import.meta.url));
const citiesPath = join(here, "../../../web/src/data/diyanetCities.json");

type CityRow = { id: number; name: string; country: string };

function loadCitiesById(): Map<number, CityRow> {
  const data = JSON.parse(readFileSync(citiesPath, "utf8")) as {
    fields: string[];
    rows: unknown[][];
  };
  const iId = data.fields.indexOf("id");
  const iName = data.fields.indexOf("name");
  const iCountry = data.fields.indexOf("country");
  const map = new Map<number, CityRow>();
  for (const row of data.rows) {
    map.set(Number(row[iId]), {
      id: Number(row[iId]),
      name: String(row[iName]),
      country: String(row[iCountry]),
    });
  }
  return map;
}

test("Tablodaki her id diyanetCities.json'da var, Türkiye dışı ve adı birebir aynı", () => {
  const cities = loadCitiesById();
  for (const [idStr, entry] of Object.entries(CITY_NAME_EN_ENTRIES)) {
    const id = Number(idStr);
    const city = cities.get(id);
    assert.ok(city, `id=${id} (${entry.name}) diyanetCities.json içinde bulunamadı`);
    assert.notEqual(city.country, "TÜRKİYE", `id=${id} Türkiye şehri olmamalı`);
    assert.equal(city.name, entry.name, `id=${id} için name eşleşmiyor`);
  }
});

test("en hiçbir kayıtta Diyanet adının titleCaseTr hâliyle aynı değil (yalnız takma ad için olanlar hariç)", () => {
  for (const [idStr, entry] of Object.entries(CITY_NAME_EN_ENTRIES)) {
    if (entry.aliases?.length) continue;
    assert.notEqual(
      entry.en,
      titleCaseTr(entry.name, false),
      `id=${idStr} (${entry.name}) için gereksiz kayıt: en zaten titleCaseTr ile aynı`,
    );
  }
});

test("cityNameEn: bilinen id'ler ve bilinmeyenler", () => {
  assert.equal(cityNameEn(16309), "Makkah");
  assert.equal(cityNameEn(16308), "Madinah");
  assert.equal(cityNameEn(14096), "London");
  assert.equal(cityNameEn(14588), "Rome");
  // Avustralya'daki ROMA (11287) çevrilmez
  assert.equal(cityNameEn(11287), null);
  assert.equal(cityNameEn(-1), null);
});

test("cityAliasTargets: İngilizce ve takma ad eşleşmeleri, kısa ve gereksiz sorgular", () => {
  assert.ok(cityAliasTargets("mecca").includes("MEKKE"));
  assert.ok(cityAliasTargets("Makk").includes("MEKKE"));
  assert.ok(cityAliasTargets("london").includes("LONDRA"));
  assert.deepEqual(cityAliasTargets("rome"), ["ROMA"]);
  assert.deepEqual(cityAliasTargets("ab"), []);
  assert.deepEqual(cityAliasTargets("paris"), []);
  assert.ok(cityAliasTargets("  Cologne ").includes("KOLN"));
  assert.ok(cityAliasTargets("Zürich").includes("ZURIH"));
});

const city = (id: number, name: string, country = "S. ARABISTAN"): ManualCity => ({
  id,
  name,
  state: country,
  country,
  tz: "Asia/Riyadh",
  lat: 21.4,
  lon: 39.8,
});

test("searchCitiesWithAliases: takma ad sonuçları başa gelir ve id'ye göre tekilleştirir", async () => {
  const mecca = city(16309, "MEKKE");
  const other = city(999999, "MECCATOWN", "ABD");
  const calls: string[] = [];
  const res = await searchCitiesWithAliases("mecca", async (q) => {
    calls.push(q);
    if (q === "mecca") return [other, mecca];
    if (q === "MEKKE") return [mecca, city(999998, "MEKKEDORF", "ALMANYA")];
    return [];
  });
  assert.ok(calls.includes("mecca"));
  assert.ok(calls.includes("MEKKE"));
  assert.deepEqual(res?.map((c) => c.id), [16309, 999999]);
});

test("searchCitiesWithAliases: asıl sorgu null dönerse takma ad sonucu döner", async () => {
  const london = city(14096, "LONDRA", "INGILTERE");
  const res = await searchCitiesWithAliases("london", async (q) => {
    if (q === "london") return null;
    if (q === "LONDRA") return [london];
    return [];
  });
  assert.deepEqual(res?.map((c) => c.id), [14096]);
});

test("searchCitiesWithAliases: takma ad hatası asıl sonucu bozmaz", async () => {
  const other = city(999999, "LONDRA PARK", "ABD");
  const res = await searchCitiesWithAliases("london", async (q) => {
    if (q === "london") return [other];
    return null;
  });
  assert.deepEqual(res?.map((c) => c.id), [999999]);
});

test("searchCitiesWithAliases: tüm aramalar hata verirse null döner", async () => {
  const res = await searchCitiesWithAliases("london", async () => null);
  assert.equal(res, null);
});

test("KKTC şehirleri İngilizcede Türkçe adıyla, uluslararası adla aranabilir", () => {
  assert.equal(cityNameEn(15158), "Lefkoşa");
  assert.equal(cityNameEn(15159), "Girne");
  assert.deepEqual(cityAliasTargets("nicosia"), ["LEFKOSA"]);
  assert.deepEqual(cityAliasTargets("kyrenia"), ["GIRNE"]);
});
