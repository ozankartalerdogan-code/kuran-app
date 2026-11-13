import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, "data/diyanet/places-with-coords.json");
const outputPath = resolve(root, "apps/web/src/data/diyanetCities.json");

const FIELDS = ["id", "name", "state", "country", "lat", "lon", "tz"];

function round4(value) {
  const rounded = Math.round(value * 10000) / 10000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const source = JSON.parse(readFileSync(inputPath, "utf8"));
if (!source || !Array.isArray(source.cities)) {
  throw new Error(`Beklenen { cities: [...] } bulunamadi: ${inputPath}`);
}

const rows = [];
for (const city of source.cities) {
  if (!city) continue;
  if (!isFiniteNumber(city.lat) || !isFiniteNumber(city.lon)) continue;
  if (!Number.isInteger(city.cityId)) continue;
  if (!nonEmptyString(city.cityName)) continue;
  if (typeof city.stateName !== "string") continue;
  if (!nonEmptyString(city.countryName)) continue;
  if (!nonEmptyString(city.tz)) continue;

  rows.push([
    city.cityId,
    city.cityName,
    city.stateName,
    city.countryName,
    round4(city.lat),
    round4(city.lon),
    city.tz,
  ]);
}

rows.sort((a, b) => a[0] - b[0]);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ v: 1, fields: FIELDS, rows }), "utf8");

const sizeKb = statSync(outputPath).size / 1024;
console.log(`${rows.length} sehir yazildi: ${outputPath}`);
console.log(`Dosya boyutu: ${sizeKb.toFixed(1)} KB`);
