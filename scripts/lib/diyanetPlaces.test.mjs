import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseEnvFile,
  normalizePlaceList,
  flattenPlaces,
} from "./diyanetPlaces.mjs";

test("parseEnvFile yorumları, tırnakları ve \\r\\n satırlarını işler", () => {
  const text = [
    "# yorum satırı",
    "",
    "DIYANET_API_USER=ornek@example.com",
    'DIYANET_API_PASS="gizli sifre"',
    "BASKA='tek tirnak'",
    "SORGÜ=a=b=c",
    "BOS=",
  ].join("\r\n");

  assert.deepEqual(parseEnvFile(text), {
    DIYANET_API_USER: "ornek@example.com",
    DIYANET_API_PASS: "gizli sifre",
    BASKA: "tek tirnak",
    SORGÜ: "a=b=c",
    BOS: "",
  });
});

test("normalizePlaceList geçerli listeyi normalize eder", () => {
  const result = normalizePlaceList({
    data: [
      { id: 13, code: "GERMANY", name: "ALMANYA" },
      { id: 11002, code: "BERLIN", name: "BERLIN" },
    ],
  });

  assert.deepEqual(result, [
    { id: 13, code: "GERMANY", name: "ALMANYA" },
    { id: 11002, code: "BERLIN", name: "BERLIN" },
  ]);
});

test("normalizePlaceList success:false yanıtında message ile hata fırlatır", () => {
  assert.throws(
    () => normalizePlaceList({ success: false, message: "Yetkisiz istek" }),
    /Yetkisiz istek/,
  );
});

test("normalizePlaceList sayısal olmayan id'leri atlar, sayısal metinleri çevirir", () => {
  const result = normalizePlaceList({
    data: [
      { id: "abc", code: "X", name: "Geçersiz" },
      { id: "11002", code: "BERLIN", name: "BERLIN" },
      { id: 7, name: null },
    ],
  });

  assert.deepEqual(result, [
    { id: 11002, code: "BERLIN", name: "BERLIN" },
    { id: 7, code: "", name: "" },
  ]);
});

test("flattenPlaces ülke, eyalet ve şehirleri sırayla düzleştirir", () => {
  const countries = [
    { id: 1, code: "TR", name: "TÜRKİYE" },
    { id: 2, code: "DE", name: "ALMANYA" },
  ];

  const statesByCountry = {
    1: [{ id: 10, code: "ANKARA", name: "ANKARA" }],
  };

  const citiesByState = {
    10: [{ id: 100, code: "CANKAYA", name: "ÇANKAYA" }],
    11: [{ id: 200, code: "BERLIN", name: "BERLIN" }],
  };

  const result = flattenPlaces(countries, statesByCountry, citiesByState);

  assert.deepEqual(result, [
    {
      cityId: 100,
      cityName: "ÇANKAYA",
      cityCode: "CANKAYA",
      stateId: 10,
      stateName: "ANKARA",
      countryId: 1,
      countryName: "TÜRKİYE",
      countryCode: "TR",
    },
  ]);
});

test("flattenPlaces eksik eyalet listesini atlar", () => {
  const countries = [
    { id: 1, code: "TR", name: "TÜRKİYE" },
    { id: 2, code: "DE", name: "ALMANYA" },
  ];

  const statesByCountry = {
    2: [{ id: 20, code: "BERLIN", name: "BERLIN" }],
  };

  const citiesByState = {
    20: [{ id: 300, code: "BERLIN", name: "BERLIN" }],
  };

  const result = flattenPlaces(countries, statesByCountry, citiesByState);

  assert.equal(result.length, 1);
  assert.equal(result[0].countryId, 2);
});

test("flattenPlaces tekrarlanan cityId'yi ikinci kez eklemez", () => {
  const countries = [{ id: 1, code: "TR", name: "TÜRKİYE" }];
  const statesByCountry = {
    1: [
      { id: 10, code: "A", name: "A" },
      { id: 11, code: "B", name: "B" },
    ],
  };
  const citiesByState = {
    10: [{ id: 100, code: "CITY", name: "ŞEHİR" }],
    11: [{ id: 100, code: "CITY", name: "ŞEHİR" }],
  };

  const result = flattenPlaces(countries, statesByCountry, citiesByState);

  assert.equal(result.length, 1);
  assert.equal(result[0].stateId, 10);
});
