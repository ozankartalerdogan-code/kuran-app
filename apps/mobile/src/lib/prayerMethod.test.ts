/**
 * prayerMethod.test.ts — yurt dışı/yüksek enlem vakitleri Diyanet resmî tablosuna yakın olmalı.
 * Girdiler: Aladhan (aladhanMethodQuery ile) yanıtı; beklenen: namazvakitleri.diyanet.gov.tr 2026 tablosu.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { adjustHighLatitude, aladhanMethodQuery } from "./prayerMethod.ts";

const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const diff = (a: string, b: string) => { let d = toMin(a) - toMin(b); if (d > 720) d -= 1440; if (d < -720) d += 1440; return d; };
const K = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const row = (s: string) => Object.fromEntries(s.split(",").map((v, i) => [K[i], v]));

// [şehir, enlem, saat dilimi, tarih, Aladhan, Diyanet]
const CASES: [string, number, string, string, string, string][] = [
  ["Berlin", 52.52, "Europe/Berlin", "2026-06-18", "02:34,04:36,13:13,17:36,21:39,23:27", "03:10,04:36,13:13,17:36,21:39,22:56"],
  ["Paris", 48.8566, "Europe/Paris", "2026-05-21", "03:29,05:55,13:52,18:02,21:40,23:49", "04:19,05:55,13:52,18:02,21:40,23:11"],
  ["Londra", 51.5074, "Europe/London", "2026-07-15", "02:40,04:54,13:12,17:29,21:19,23:17", "03:21,04:54,13:11,17:29,21:19,22:41"],
  ["Oslo", 59.9139, "Europe/Oslo", "2026-06-18", "02:20,03:47,13:23,18:04,22:50,00:06", "02:49,03:53,13:23,18:03,22:49,23:46"],
];

for (const [name, lat, tz, ds, ala, diy] of CASES) {
  test(`yüksek enlem: ${name} ${ds} imsak/yatsı Diyanet'e ±7 dk (model en fazla ~10 dk sapar)`, () => {
    const [year, month, day] = ds.split("-").map(Number);
    const out = adjustHighLatitude(row(ala), lat, { year, month, day }, tz);
    const want = row(diy);
    for (const k of ["Fajr", "Isha"]) {
      const d = diff(out[k], want[k]);
      assert.ok(Math.abs(d) <= 7, `${name} ${k}: ${out[k]} vs Diyanet ${want[k]} (${d} dk)`);
    }
    for (const k of ["Sunrise", "Dhuhr", "Asr", "Maghrib"]) assert.equal(out[k], row(ala)[k]);
  });
}

test("kış (astronomik gece var): Berlin Ocak vakitleri değişmez", () => {
  const t = row("06:06,08:03,12:21,14:04,16:29,18:12");
  assert.deepEqual(adjustHighLatitude(t, 52.52, { year: 2026, month: 1, day: 15 }, "Europe/Berlin"), t);
});

test("Türkiye ve 45° altı: dokunulmaz", () => {
  const t = row("03:20,05:30,13:05,17:00,20:30,22:10");
  assert.deepEqual(adjustHighLatitude(t, 41.0, { year: 2026, month: 6, day: 18 }, "Europe/Istanbul"), t);
  assert.deepEqual(adjustHighLatitude(t, 40.7, { year: 2026, month: 6, day: 18 }, "America/New_York"), t);
});

test("aladhanMethodQuery: Türkiye method=13, yurt dışı bölgesel yatsı açısı", () => {
  assert.equal(aladhanMethodQuery("Europe/Istanbul"), "method=13&school=0&midnightMode=0");
  assert.match(aladhanMethodQuery("Europe/Berlin"), /methodSettings=18,null,16&tune=0,0,-7,5,4,7,7,0,0/);
  assert.match(aladhanMethodQuery("America/New_York"), /methodSettings=18,null,16/);
  assert.match(aladhanMethodQuery("Asia/Tokyo"), /methodSettings=18,null,17/);
});
