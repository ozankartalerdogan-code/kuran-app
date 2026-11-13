import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classify,
  compareWithDiyanet,
  parseHm,
  solveLatLon,
  sunriseSunsetUtcMinutes,
} from "./solarCheck.mjs";

const BERLIN = { lat: 52.52, lon: 13.405 };
const MUNICH = { lat: 48.14, lon: 11.58 };
const DIWANET_BERLIN = {
  dateYmd: "2026-11-13",
  astronomicalSunrise: "07:24",
  astronomicalSunset: "16:17",
  offsetHours: 1,
};

test("Berlin 2026-11-13 Diyanet saatleri pass", () => {
  const cmp = compareWithDiyanet({ ...DIWANET_BERLIN, ...BERLIN });

  assert.ok(cmp);
  assert.ok(Math.abs(cmp.dSunrise) < 3);
  assert.ok(Math.abs(cmp.dSunset) < 3);
  assert.equal(classify(cmp), "pass");
});

test("aynı saatlerle Münih koordinatı fail", () => {
  const cmp = compareWithDiyanet({ ...DIWANET_BERLIN, ...MUNICH });

  assert.ok(cmp);
  assert.ok(Math.abs(cmp.dSunrise) > 3);
  assert.equal(classify(cmp), "fail");
});

test("solveLatLon Berlin girdisinden Berlin'e yakın konum döner", () => {
  const solved = solveLatLon({
    ...DIWANET_BERLIN,
    latHint: BERLIN.lat,
  });

  assert.ok(solved);
  assert.ok(Math.abs(solved.lat - BERLIN.lat) <= 1);
  assert.ok(Math.abs(solved.lon - BERLIN.lon) <= 1);
});

test("parseHm geçerli ve geçersiz değerleri işler", () => {
  assert.equal(parseHm("07:24"), 444);
  assert.equal(parseHm("0:05"), 5);
  assert.equal(parseHm("23:59"), 1439);
  assert.equal(parseHm("7:24"), 444);
  assert.equal(parseHm("24:00"), null);
  assert.equal(parseHm("07:60"), null);
  assert.equal(parseHm("abc"), null);
  assert.equal(parseHm(""), null);
  assert.equal(parseHm(null), null);
});

test("kutup bölgesinde güneş hesabı null, sınıflandırma unknown", () => {
  assert.equal(sunriseSunsetUtcMinutes("2026-06-21", 78, 15), null);

  const cmp = compareWithDiyanet({
    dateYmd: "2026-06-21",
    lat: 78,
    lon: 15,
    astronomicalSunrise: "00:00",
    astronomicalSunset: "23:59",
    offsetHours: 1,
  });

  assert.equal(cmp, null);
  assert.equal(classify(cmp), "unknown");
});

test("classify toleransı dSunrise ve dSunset üzerinden uygular", () => {
  assert.equal(
    classify({ dSunrise: 2.9, dSunset: -2.9 }, { tolMin: 3 }),
    "pass",
  );
  assert.equal(
    classify({ dSunrise: 3.1, dSunset: 0 }, { tolMin: 3 }),
    "fail",
  );
  assert.equal(classify({ dSunrise: 1, dSunset: 1 }, { tolMin: 0.5 }), "fail");
});
