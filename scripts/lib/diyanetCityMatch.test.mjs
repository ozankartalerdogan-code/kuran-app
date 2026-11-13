import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizePlaceName,
  nameVariants,
  buildGeoIndex,
  buildNameIndex,
  matchCity,
  matchTurkeyCity,
  matchOtherCountryCities,
  haversineKm,
} from "./diyanetCityMatch.mjs";

test("normalizePlaceName Türkçe ve Latin harflerini sadeleştirir", () => {
  assert.equal(normalizePlaceName("Düsseldorf"), "DUSSELDORF");
  assert.equal(normalizePlaceName("BEYLİKDÜZÜ"), "BEYLIKDUZU");
  assert.equal(normalizePlaceName("St. Gallen"), "ST GALLEN");
  assert.equal(normalizePlaceName("ŞİLE"), "SILE");
});

test("nameVariants parantez ve aziz kısaltmalarını üretir", () => {
  const watford = nameVariants("WATFORD (LONDRA)");
  assert.deepEqual(watford, ["WATFORD", "WATFORD LONDRA", "LONDRA"]);

  const sankt = nameVariants("SANKT GALLEN");
  assert.ok(sankt.includes("SANKT GALLEN"));
  assert.ok(sankt.includes("ST GALLEN"));
  assert.ok(sankt.includes("SAINT GALLEN"));
});

test("matchCity aynı addaki şehirlerde stateName'e uyanı seçer", () => {
  const rows = [
    {
      id: 1,
      name: "BAYAT",
      ascii: "BAYAT",
      alts: [],
      lat: 40.6,
      lon: 34.8,
      fcode: "PPLA2",
      iso: "TR",
      admin1: "19",
      pop: 5000,
      tz: "Europe/Istanbul",
    },
    {
      id: 2,
      name: "BAYAT",
      ascii: "BAYAT",
      alts: [],
      lat: 38.8,
      lon: 30.7,
      fcode: "PPLA2",
      iso: "TR",
      admin1: "03",
      pop: 8000,
      tz: "Europe/Istanbul",
    },
  ];
  const index = buildGeoIndex(rows);
  const admin1NameByKey = new Map([
    ["TR.19", "Çorum"],
    ["TR.03", "Afyonkarahisar"],
  ]);

  const result = matchCity(
    { cityName: "BAYAT", stateName: "ÇORUM" },
    "TR",
    index,
    admin1NameByKey,
  );

  assert.equal(result.geonameId, 1);
  assert.equal(result.method, "exact");
});

test("matchCity il merkezi adında PPLA kaydını seçer", () => {
  const rows = [
    {
      id: 10,
      name: "ANKARA",
      ascii: "ANKARA",
      alts: [],
      lat: 39.93,
      lon: 32.86,
      fcode: "PPL",
      iso: "TR",
      admin1: "68",
      pop: 5000000,
      tz: "Europe/Istanbul",
    },
    {
      id: 11,
      name: "ANKARA",
      ascii: "ANKARA",
      alts: [],
      lat: 39.92,
      lon: 32.85,
      fcode: "PPLA",
      iso: "TR",
      admin1: "68",
      pop: 1000,
      tz: "Europe/Istanbul",
    },
  ];
  const index = buildGeoIndex(rows);
  const admin1NameByKey = new Map([["TR.68", "Ankara"]]);

  const result = matchCity(
    { cityName: "ANKARA", stateName: "ANKARA" },
    "TR",
    index,
    admin1NameByKey,
  );

  assert.equal(result.geonameId, 11);
});

test("matchCity alternatif adla eşleşir", () => {
  const rows = [
    {
      id: 20,
      name: "London",
      ascii: "London",
      alts: ["Londra", "Londres"],
      lat: 51.5,
      lon: -0.12,
      fcode: "PPLC",
      iso: "GB",
      admin1: "ENG",
      pop: 9000000,
      tz: "Europe/London",
    },
  ];
  const index = buildGeoIndex(rows);
  const admin1NameByKey = new Map([["GB.ENG", "England"]]);

  const result = matchCity(
    { cityName: "LONDRA", stateName: "LONDRA" },
    "GB",
    index,
    admin1NameByKey,
  );

  assert.equal(result.geonameId, 20);
  assert.equal(result.method, "exact");
});

test("matchCity eşleşme yoksa null döner", () => {
  const index = buildGeoIndex([]);
  const result = matchCity(
    { cityName: "OLMAYAN", stateName: "YOK" },
    "TR",
    index,
    new Map(),
  );
  assert.equal(result, null);
});

test("haversineKm İstanbul-Ankara mesafesini yaklaşık verir", () => {
  const distance = haversineKm(41.0082, 28.9784, 39.9334, 32.8597);
  assert.ok(Math.abs(distance - 350) <= 10, `mesafe: ${distance}`);
});

test("nameVariants parantez öncesi adı ilk sırada dener", () => {
  assert.equal(nameVariants("HALLE (NRW)")[0], "HALLE");
  assert.equal(nameVariants("SENDEN(NRW)")[0], "SENDEN");
});

function geoRow({ id, name, lat, lon, pop = 0, iso = "ZZ", admin1 = "A" }) {
  return {
    id,
    name,
    ascii: name,
    alts: [],
    lat,
    lon,
    fclass: "P",
    fcode: "PPL",
    iso,
    admin1,
    pop,
    tz: "UTC",
  };
}

test("matchTurkeyCity yalnız başka ilde aday varsa null döner", () => {
  const kilisPpl = buildNameIndex([
    geoRow({
      id: 1,
      name: "Kartal",
      lat: 36.7,
      lon: 37.1,
      pop: 1000,
      iso: "TR",
      admin1: "79",
    }),
  ]);

  const ctx = {
    stateCodeByNorm: new Map([["ISTANBUL", "34"]]),
    capitalRowsByAdmin1: new Map(),
    adm2NameIndexByAdmin1: new Map([["34", buildNameIndex([])]]),
    pplNameIndexByAdmin1: new Map([["79", kilisPpl]]),
  };

  const result = matchTurkeyCity(
    { cityName: "KARTAL", stateName: "İSTANBUL" },
    ctx,
  );
  assert.equal(result, null);
});

test("matchTurkeyCity aynı ildeki ADM2 kaydını seçer", () => {
  const istanbulAdm2 = buildNameIndex([
    geoRow({
      id: 2,
      name: "Kartal",
      lat: 40.91,
      lon: 29.21,
      iso: "TR",
      admin1: "34",
    }),
  ]);
  const kilisPpl = buildNameIndex([
    geoRow({
      id: 1,
      name: "Kartal",
      lat: 36.7,
      lon: 37.1,
      pop: 1000,
      iso: "TR",
      admin1: "79",
    }),
  ]);

  const ctx = {
    stateCodeByNorm: new Map([["ISTANBUL", "34"]]),
    capitalRowsByAdmin1: new Map(),
    adm2NameIndexByAdmin1: new Map([["34", istanbulAdm2]]),
    pplNameIndexByAdmin1: new Map([["79", kilisPpl]]),
  };

  const result = matchTurkeyCity(
    { cityName: "KARTAL", stateName: "İSTANBUL" },
    ctx,
  );
  assert.equal(result.geonameId, 2);
  assert.equal(result.method, "tr-adm2");
});

test("matchOtherCountryCities medyana en yakın adayı seçer ve 400 km dışını reddeder", () => {
  const rows = [
    geoRow({ id: 1, name: "ANCHOR1", lat: 0, lon: 0 }),
    geoRow({ id: 2, name: "ANCHOR2", lat: 0, lon: 2 }),
    geoRow({ id: 3, name: "ANCHOR3", lat: 10, lon: 10 }),
    geoRow({ id: 4, name: "ANCHOR4", lat: 10, lon: 12 }),
    geoRow({ id: 5, name: "NEARFAR", lat: 0, lon: 1 }),
    geoRow({ id: 6, name: "NEARFAR", lat: 0, lon: 20 }),
    geoRow({ id: 7, name: "FARONLY", lat: 0, lon: 30 }),
  ];
  const cities = [
    { cityId: 1, cityName: "ANCHOR1", stateName: "ALPHA", stateId: 1, countryCode: "TEST" },
    { cityId: 2, cityName: "ANCHOR2", stateName: "ALPHA", stateId: 1, countryCode: "TEST" },
    { cityId: 3, cityName: "ANCHOR3", stateName: "BETA", stateId: 2, countryCode: "TEST" },
    { cityId: 4, cityName: "ANCHOR4", stateName: "BETA", stateId: 2, countryCode: "TEST" },
    { cityId: 5, cityName: "NEARFAR", stateName: "ALPHA", stateId: 1, countryCode: "TEST" },
    { cityId: 6, cityName: "FARONLY", stateName: "ALPHA", stateId: 1, countryCode: "TEST" },
  ];

  const { matches } = matchOtherCountryCities(cities, "ZZ", {
    index: buildGeoIndex(rows),
    admin1NameByKey: new Map(),
  });

  assert.equal(matches.get(5).geonameId, 5);
  assert.equal(matches.get(5).method, "state-nearest");
  assert.equal(matches.get(6), null);
});

test("matchOtherCountryCities tek eyalette belirsiz adayı reddeder, baskını seçer", () => {
  const rows = [
    geoRow({ id: 10, name: "TIES", lat: 1, lon: 1, pop: 1000 }),
    geoRow({ id: 11, name: "TIES", lat: 2, lon: 2, pop: 900 }),
    geoRow({ id: 12, name: "DOMINANT", lat: 1, lon: 1, pop: 5000 }),
    geoRow({ id: 13, name: "DOMINANT", lat: 2, lon: 2, pop: 900 }),
  ];
  const cities = [
    { cityId: 10, cityName: "TIES", stateName: "ONLY", stateId: 1, countryCode: "TEST" },
    { cityId: 11, cityName: "DOMINANT", stateName: "ONLY", stateId: 1, countryCode: "TEST" },
  ];

  const { matches, ambiguousList } = matchOtherCountryCities(cities, "ZZ", {
    index: buildGeoIndex(rows),
    admin1NameByKey: new Map(),
  });

  assert.equal(matches.get(10), null);
  assert.equal(ambiguousList.length, 1);
  assert.equal(ambiguousList[0].candidateCount, 2);
  assert.equal(matches.get(11).geonameId, 12);
  assert.equal(matches.get(11).method, "dominant-pop");
});
