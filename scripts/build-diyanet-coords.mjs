import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DIYANET_COUNTRY_ISO } from "./lib/diyanetCountryIso.mjs";
import {
  buildGeoIndex,
  buildTurkeyContext,
  findSuspiciousCities,
  matchOtherCountryCities,
  matchTurkeyCityDetailed,
  normalizePlaceName,
} from "./lib/diyanetCityMatch.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");

const placesPath = join(rootDir, "data", "diyanet", "places.json");
const admin1Path = join(
  rootDir,
  "data",
  "external",
  "geonames",
  "admin1CodesASCII.txt",
);
const citiesPath = join(
  rootDir,
  "data",
  "external",
  "geonames",
  "cities500.txt",
);
const trPath = join(rootDir, "data", "external", "geonames", "TR.txt");
const outputPath = join(rootDir, "data", "diyanet", "places-with-coords.json");
const reportPath = join(rootDir, "data", "diyanet", "coords-report.json");
const verifyPath = join(rootDir, "data", "diyanet", "coords-verify.json");

const wantedIso = new Set(Object.values(DIYANET_COUNTRY_ISO));

async function loadAdmin1Names() {
  const names = new Map();
  const lines = createInterface({
    input: createReadStream(admin1Path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const columns = line.split("\t");
    if (columns.length < 2) continue;
    names.set(columns[0], columns[1]);
  }

  return names;
}

async function loadGeonamesFile(path, isoFilter) {
  const rows = [];
  const lines = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of lines) {
    if (!rawLine) continue;
    const columns = rawLine.split("\t");
    if (columns.length < 18) continue;

    const iso = columns[8];
    if (isoFilter && !isoFilter.has(iso)) continue;

    const id = Number.parseInt(columns[0], 10);
    if (!Number.isInteger(id)) continue;

    rows.push({
      id,
      name: columns[1],
      ascii: columns[2],
      alts: columns[3] ? columns[3].split(",") : [],
      lat: Number.parseFloat(columns[4]),
      lon: Number.parseFloat(columns[5]),
      fclass: columns[6],
      fcode: columns[7],
      iso,
      admin1: columns[10],
      pop: Number.parseInt(columns[14], 10) || 0,
      tz: columns[17],
    });
  }

  return rows;
}

function printSummary(report) {
  const matchedPercent =
    report.total === 0 ? 0 : (report.matched / report.total) * 100;

  console.log(`Toplam: ${report.total}`);
  console.log(
    `Eşleşen: ${report.matched} (${matchedPercent.toFixed(1)}%)`,
  );
  console.log(`Eşleşmeyen: ${report.unmatched}`);
  console.log(`Belirsiz (birden çok aday): ${report.ambiguousList.length}`);
  console.log(`Şüpheli: ${report.suspicious.length}`);
  console.log("Yöntem dağılımı:");
  for (const [method, count] of Object.entries(report.methodCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${method}: ${count}`);
  }

  const ranking = Object.entries(report.byCountry)
    .filter(([, value]) => value.total > 0)
    .map(([countryCode, value]) => ({
      countryCode,
      total: value.total,
      matched: value.matched,
      ratio: value.matched / value.total,
    }))
    .sort((a, b) => a.ratio - b.ratio || b.total - a.total)
    .slice(0, 15);

  console.log("Eşleşme oranı en düşük 15 ülke:");
  for (const item of ranking) {
    console.log(
      `  ${item.countryCode}: ${item.matched}/${item.total} (${(item.ratio * 100).toFixed(1)}%)`,
    );
  }
}

async function main() {
  const places = JSON.parse(readFileSync(placesPath, "utf8"));
  const sourceCities = Array.isArray(places.cities) ? places.cities : [];

  const admin1NameByKey = await loadAdmin1Names();
  const citiesRows = await loadGeonamesFile(citiesPath, wantedIso);
  const trRows = await loadGeonamesFile(trPath, new Set(["TR"]));
  const index = buildGeoIndex(citiesRows);
  const turkeyContext = buildTurkeyContext(admin1NameByKey, citiesRows, trRows);

  const stateCountByCountry = new Map();
  for (const city of sourceCities) {
    let set = stateCountByCountry.get(city.countryCode);
    if (!set) {
      set = new Set();
      stateCountByCountry.set(city.countryCode, set);
    }
    set.add(city.stateId);
  }
  const stateCount = new Map(
    [...stateCountByCountry].map(([code, set]) => [code, set.size]),
  );

  const trStateNames = [
    ...new Set(
      sourceCities
        .filter((city) => city.countryCode === "TÜRKİYE")
        .map((city) => city.stateName),
    ),
  ];
  const trMissing = trStateNames.filter(
    (name) => !turkeyContext.stateCodeByNorm.has(normalizePlaceName(name)),
  );

  const groups = new Map();
  for (const city of sourceCities) {
    let group = groups.get(city.countryCode);
    if (!group) {
      group = [];
      groups.set(city.countryCode, group);
    }
    group.push(city);
  }

  const resultsByCity = new Map();
  const ambiguousList = [];
  let noIso = 0;

  for (const [countryCode, group] of groups) {
    const iso = DIYANET_COUNTRY_ISO[countryCode];
    if (!iso) {
      noIso += group.length;
      for (const city of group) resultsByCity.set(city, { match: null });
      continue;
    }

    if (iso === "TR") {
      for (const city of group) {
        const { match, ambiguousCount } = matchTurkeyCityDetailed(
          city,
          turkeyContext,
        );
        resultsByCity.set(city, { match });
        if (!match && ambiguousCount > 0) {
          ambiguousList.push({
            cityId: city.cityId,
            cityName: city.cityName,
            stateName: city.stateName,
            countryCode: city.countryCode,
            candidateCount: ambiguousCount,
          });
        }
      }
      continue;
    }

    const { matches, ambiguousList: countryAmbiguous } =
      matchOtherCountryCities(group, iso, {
        index,
        admin1NameByKey,
      });
    for (const city of group) {
      resultsByCity.set(city, { match: matches.get(city.cityId) || null });
    }
    ambiguousList.push(...countryAmbiguous);
  }

  const cities = [];
  const unmatchedList = [];
  const byCountry = {};
  const methodCounts = {};
  let matched = 0;

  for (const city of sourceCities) {
    const { match } = resultsByCity.get(city) || { match: null };

    if (!byCountry[city.countryCode]) {
      byCountry[city.countryCode] = { total: 0, matched: 0 };
    }
    byCountry[city.countryCode].total += 1;

    if (match) {
      matched += 1;
      byCountry[city.countryCode].matched += 1;
      methodCounts[match.method] = (methodCounts[match.method] || 0) + 1;
      cities.push({
        ...city,
        lat: match.lat,
        lon: match.lon,
        tz: match.tz,
        geonameId: match.geonameId,
        matchMethod: match.method,
      });
    } else {
      unmatchedList.push({
        cityId: city.cityId,
        cityName: city.cityName,
        stateName: city.stateName,
        countryCode: city.countryCode,
      });
      cities.push({
        ...city,
        lat: null,
        lon: null,
        tz: null,
        geonameId: null,
        matchMethod: null,
      });
    }
  }

  let rejectedSolar = null;
  let rejectedTzCount = 0;
  try {
    const verify = JSON.parse(readFileSync(verifyPath, "utf8"));
    if (verify && verify.results && typeof verify.results === "object") {
      rejectedSolar = [];
      for (const city of cities) {
        const result = verify.results[city.cityId];
        if (!result) continue;

        if (result.status === "fail") {
          city.lat = null;
          city.lon = null;
          city.tz = null;
          city.matchMethod = "rejected-solar";
          rejectedSolar.push({
            cityId: city.cityId,
            cityName: city.cityName,
            stateName: city.stateName,
            countryCode: city.countryCode,
            dSunrise: result.dSunrise ?? null,
            dSunset: result.dSunset ?? null,
          });
        } else if (result.tzMismatch === true) {
          city.lat = null;
          city.lon = null;
          city.tz = null;
          city.matchMethod = "rejected-tz-mismatch";
          rejectedTzCount += 1;
        } else if (result.status === "pass") {
          city.verified = true;
        }
      }
    }
  } catch {
    // coords-verify.json yok; mevcut davranış korunur
  }

  const suspicious = findSuspiciousCities(cities, stateCount);

  const output = {
    generatedAt: new Date().toISOString(),
    source: "awqatsalah.diyanet.gov.tr + GeoNames cities500 (CC BY 4.0)",
    count: cities.length,
    matched,
    cities,
  };

  const report = {
    total: cities.length,
    matched,
    unmatched: cities.length - matched,
    byCountry,
    unmatchedList,
    ambiguousList,
    methodCounts,
    suspicious,
    ...(rejectedSolar
      ? { rejectedSolarCount: rejectedSolar.length, rejectedSolar }
      : {}),
  };

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`GeoNames cities500 satırı: ${citiesRows.length}`);
  console.log(`GeoNames TR satırı: ${trRows.length}`);
  console.log(`ISO tablosunda olmayan şehir: ${noIso}`);
  console.log(
    `TR eyalet eşleşmeyen: ${trMissing.length === 0 ? "yok" : trMissing.join(", ")}`,
  );
  printSummary(report);
  if (rejectedSolar) {
    console.log(`Solar doğrulama ile reddedilen: ${rejectedSolar.length}`);
    console.log(`Saat dilimi uyuşmazlığı (tzMismatch) ile çıkarılan: ${rejectedTzCount}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
