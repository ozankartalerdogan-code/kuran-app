/**
 * diyanetPrayer.test.ts — Diyanet vakit çözümü (saf modül, DI) davranışları.
 * Çalıştır: node --test apps/mobile/src/lib/diyanetPrayer.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIYANET_CITY_KEY,
  DIYANET_MANUAL_CITY_KEY,
  DIYANET_MONTHS_KEY,
  getDiyanetDays,
  getManualCity,
  haversineKm,
  isoToLocalHm,
  prayerCityStampPart,
  resolveDiyanetCity,
  roundCoord2,
  searchDiyanetCities,
  setManualCity,
  titleCaseTr,
} from "./diyanetPrayer.ts";
import type { DiyanetCityRef, DiyanetPrayerDeps, ManualCity } from "./diyanetPrayer.ts";

const CITY: DiyanetCityRef = {
  id: 11002,
  name: "İstanbul",
  state: "İstanbul",
  country: "Türkiye",
  tz: "Europe/Istanbul",
};

const OFFSET = 180;
const LAT = 41.01;
const LON = 28.98;
const BASE = new Date(2026, 10, 13, 12, 0, 0).getTime();
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

type Reply = { status: number; body: unknown };
type ReplyFn = (path: string) => Reply | Promise<Reply>;

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function makeDeps(initial: Record<string, unknown> = {}) {
  let now = BASE;
  const store = new Map<string, unknown>();
  for (const [key, value] of Object.entries(initial)) store.set(key, clone(value));
  const calls: { path: string; timeoutMs: number }[] = [];
  let reply: ReplyFn = () => ({ status: 500, body: null });

  const deps: DiyanetPrayerDeps = {
    getJson: async (path, timeoutMs) => {
      calls.push({ path, timeoutMs });
      return reply(path);
    },
    readStore: async (key) => (store.has(key) ? clone(store.get(key)) : null),
    writeStore: async (key, value) => {
      store.set(key, clone(value));
    },
    nowMs: () => now,
  };

  return {
    deps,
    store,
    calls,
    setReply: (fn: ReplyFn) => {
      reply = fn;
    },
    setNow: (value: number) => {
      now = value;
    },
    resetCalls: () => {
      calls.length = 0;
    },
    cityCalls: () => calls.filter((c) => c.path.startsWith("/vakit/sehir")),
    monthCalls: () => calls.filter((c) => c.path.startsWith("/vakit?")),
  };
}

function citySeed(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lat: roundCoord2(LAT),
    lon: roundCoord2(LON),
    off: OFFSET,
    city: CITY,
    at: BASE,
    ...overrides,
  };
}

function serverDay(date: string) {
  const startMin = 5 * 60 + 25;
  const at = (deltaMin: number) => {
    const total = (startMin + deltaMin) % 1440;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${date}T${hh}:${mm}:00+03:00`;
  };
  return {
    date,
    times: {
      imsak: at(0),
      gunes: at(75),
      ogle: at(400),
      ikindi: at(550),
      aksam: at(730),
      yatsi: at(850),
    },
    hijri: { day: 3, month: 6, year: 1448 },
    utcOffsetMin: 180,
  };
}

function monthBody(month: string, days: unknown[], complete = true) {
  return { source: "diyanet", city: CITY, month, complete, days };
}

function monthOf(path: string): string {
  const m = /[?&]month=([^&]+)/.exec(path);
  if (!m) throw new Error(`month parametresi yok: ${path}`);
  return decodeURIComponent(m[1]);
}

const expectedTimes = (raw: ReturnType<typeof serverDay>) => ({
  Fajr: isoToLocalHm(raw.times.imsak),
  Sunrise: isoToLocalHm(raw.times.gunes),
  Dhuhr: isoToLocalHm(raw.times.ogle),
  Asr: isoToLocalHm(raw.times.ikindi),
  Maghrib: isoToLocalHm(raw.times.aksam),
  Isha: isoToLocalHm(raw.times.yatsi),
});

test("isoToLocalHm: cihaz yerel 'HH:MM'; geçersiz ISO null", () => {
  const iso = "2026-11-13T05:25:00+03:00";
  const d = new Date(iso);
  const want = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  assert.equal(isoToLocalHm(iso), want);
  assert.equal(isoToLocalHm("gecersiz"), null);
  assert.equal(isoToLocalHm(""), null);
});

test("roundCoord2 2 ondalık; ~0.18° enlem ≈ 20 km", () => {
  assert.equal(roundCoord2(41.0149), 41.01);
  assert.equal(roundCoord2(28.9849), 28.98);
  const d = haversineKm(LAT, LON, LAT + 0.18, LON);
  assert.ok(d > 15 && d < 25, `mesafe ${d}`);
});

test("şehir 200 → döndürülür ve önbelleğe yazılır", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { city: CITY, distanceKm: 1.2 } }));

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.deepEqual(city, CITY);
  assert.equal(h.cityCalls().length, 1);
  assert.equal(h.cityCalls()[0].timeoutMs, 6000);
  const cache = h.store.get(DIYANET_CITY_KEY) as Record<string, unknown>;
  assert.equal(cache.lat, roundCoord2(LAT));
  assert.equal(cache.lon, roundCoord2(LON));
  assert.equal(cache.off, OFFSET);
  assert.equal(cache.at, BASE);
  assert.deepEqual(cache.city, CITY);
});

test("koordinatlar path'te 2 ondalıkla gönderilir", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { city: CITY } }));

  await resolveDiyanetCity(41.0149, 28.9849, OFFSET, h.deps);

  assert.equal(h.calls[0].path, "/vakit/sehir?lat=41.01&lon=28.98&off=180");
});

test("aynı yerde ikinci çağrı ağa çıkmaz", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { city: CITY } }));

  await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);
  h.resetCalls();
  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.deepEqual(city, CITY);
  assert.equal(h.calls.length, 0);
});

test("20 km uzakta yeniden sorgulanır", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { city: CITY } }));

  await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);
  h.resetCalls();
  await resolveDiyanetCity(LAT + 0.18, LON, OFFSET, h.deps);

  assert.equal(h.cityCalls().length, 1);
});

test("off değişince yeniden sorgulanır", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { city: CITY } }));

  await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);
  h.resetCalls();
  await resolveDiyanetCity(LAT, LON, OFFSET - 60, h.deps);

  assert.equal(h.cityCalls().length, 1);
});

test("404 { error:'no_city' } → null ve önbelleğe null yazılır", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 404, body: { error: "no_city" } }));

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.equal(city, null);
  const cache = h.store.get(DIYANET_CITY_KEY) as Record<string, unknown>;
  assert.equal(cache.city, null);
});

test("404 HTML (body string) → undefined ve önbellek YAZILMAZ", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 404, body: "<html>Not Found</html>" }));

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.equal(city, undefined);
  assert.equal(h.store.has(DIYANET_CITY_KEY), false);
});

test("ağ hatası + eski önbellek → eski şehir döner", async () => {
  const h = makeDeps({
    [DIYANET_CITY_KEY]: citySeed({ at: BASE - 40 * DAY_MS }),
  });
  h.setReply(() => {
    throw new Error("offline");
  });

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.deepEqual(city, CITY);
});

test("ağ hatası + eski 'şehir yok' kaydı → undefined (kesin cevap değil)", async () => {
  const h = makeDeps({
    [DIYANET_CITY_KEY]: citySeed({ city: null, at: BASE - 10 * DAY_MS }),
  });
  h.setReply(() => {
    throw new Error("offline");
  });

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.equal(city, undefined);
});

test("taze 'şehir yok' önbelleği 7 gün ağa çıkmadan kullanılır", async () => {
  const h = makeDeps({
    [DIYANET_CITY_KEY]: citySeed({ city: null, at: BASE - 2 * DAY_MS }),
  });
  h.setReply(() => ({ status: 200, body: { city: CITY } }));

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.equal(city, null);
  assert.equal(h.calls.length, 0);
});

test("ay complete → ikinci çağrıda ağ yok; vakit/hicri/şehir dönüşümü doğru", async () => {
  const h = makeDeps({ [DIYANET_CITY_KEY]: citySeed() });
  const raw = serverDay("2026-11-13");
  h.setReply((path) => ({ status: 200, body: monthBody(monthOf(path), [raw], true) }));

  const first = await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);

  assert.equal(first.size, 1);
  const day = first.get("2026-11-13");
  assert.ok(day);
  assert.deepEqual(day.times, expectedTimes(raw));
  assert.deepEqual(day.hijri, { day: 3, monthNumber: 6, year: 1448 });
  assert.deepEqual(day.city, CITY);
  assert.equal(h.monthCalls()[0].timeoutMs, 8000);

  h.resetCalls();
  const second = await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);
  assert.equal(h.calls.length, 0);
  assert.equal(second.size, 1);
});

test("ay complete:false: 30 dk sonra ağ yok, 2 saat sonra yeniden", async () => {
  const h = makeDeps({ [DIYANET_CITY_KEY]: citySeed() });
  h.setReply((path) => ({
    status: 200,
    body: monthBody(monthOf(path), [serverDay("2026-11-13")], false),
  }));

  await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);
  h.resetCalls();

  h.setNow(BASE + 30 * 60_000);
  await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);
  assert.equal(h.monthCalls().length, 0);

  h.setNow(BASE + 2 * HOUR_MS);
  await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);
  assert.equal(h.monthCalls().length, 1);
});

test("503 + eski ay önbelleği → eski günler kullanılır", async () => {
  const raw = serverDay("2026-11-13");
  const h = makeDeps({
    [DIYANET_CITY_KEY]: citySeed(),
    [DIYANET_MONTHS_KEY]: {
      "11002:2026-11": { complete: false, fetchedAt: BASE - 2 * HOUR_MS, days: [raw] },
    },
  });
  h.setReply(() => ({
    status: 503,
    body: { error: "upstream_unavailable", fallback: "aladhan" },
  }));

  const result = await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);

  assert.equal(result.size, 1);
  assert.deepEqual(result.get("2026-11-13")?.times, expectedTimes(raw));
  assert.equal(h.monthCalls().length, 1);
});

test("7 günlük pencere ay sınırını aşınca iki ay isteği", async () => {
  const h = makeDeps({ [DIYANET_CITY_KEY]: citySeed() });
  h.setReply((path) => ({ status: 200, body: monthBody(monthOf(path), [], true) }));
  const dates = [
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
  ];

  await getDiyanetDays(LAT, LON, OFFSET, dates, h.deps);

  const months = h.monthCalls().map((c) => monthOf(c.path)).sort();
  assert.deepEqual(months, ["2026-10", "2026-11"]);
});

test("ay önbelleği budama: en fazla 6 anahtar, gerekli anahtar korunur", async () => {
  const seed: Record<string, unknown> = {};
  for (let id = 1; id <= 8; id++) {
    seed[`${id}:2026-11`] = {
      complete: false,
      fetchedAt: BASE - id * 1000,
      days: [],
    };
  }
  const h = makeDeps({
    [DIYANET_CITY_KEY]: citySeed(),
    [DIYANET_MONTHS_KEY]: seed,
  });
  h.setReply((path) => ({ status: 200, body: monthBody(monthOf(path), [], true) }));

  await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], h.deps);

  const months = h.store.get(DIYANET_MONTHS_KEY) as Record<string, unknown>;
  const keys = Object.keys(months);
  assert.equal(keys.length, 6);
  assert.ok(keys.includes("11002:2026-11"));
});

test("getDiyanetDays hiçbir durumda fırlatmaz", async () => {
  const deps: DiyanetPrayerDeps = {
    getJson: async () => {
      throw new Error("patladı");
    },
    readStore: async () => {
      throw new Error("patladı");
    },
    writeStore: async () => {
      throw new Error("patladı");
    },
    nowMs: () => BASE,
  };

  const result = await getDiyanetDays(LAT, LON, OFFSET, ["2026-11-13"], deps);
  assert.equal(result.size, 0);
});

const MANUAL: ManualCity = { ...CITY, lat: 40.99, lon: 29.03 };

test("elle şehir varken resolveDiyanetCity ağa çıkmaz ve onu döndürür", async () => {
  const h = makeDeps({ [DIYANET_MANUAL_CITY_KEY]: MANUAL });
  h.setReply(() => {
    throw new Error("ağa çıkılmamalı");
  });

  const city = await resolveDiyanetCity(LAT, LON, OFFSET, h.deps);

  assert.deepEqual(city, CITY);
  assert.equal(h.calls.length, 0);
});

test("setManualCity kaydeder; null sonrası normal akışa döner", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { city: CITY } }));

  await setManualCity(MANUAL, h.deps);
  assert.deepEqual(await getManualCity(h.deps), MANUAL);
  h.resetCalls();
  assert.deepEqual(await resolveDiyanetCity(LAT, LON, OFFSET, h.deps), CITY);
  assert.equal(h.calls.length, 0);

  await setManualCity(null, h.deps);
  assert.equal(h.store.get(DIYANET_MANUAL_CITY_KEY), null);
  assert.equal(await getManualCity(h.deps), null);

  h.resetCalls();
  assert.deepEqual(await resolveDiyanetCity(LAT, LON, OFFSET, h.deps), CITY);
  assert.equal(h.cityCalls().length, 1);
});

test("getManualCity bozuk/eksik kayıtta null döner", async () => {
  const h = makeDeps({ [DIYANET_MANUAL_CITY_KEY]: { id: 1, name: "X" } });
  assert.equal(await getManualCity(h.deps), null);
});

test("titleCaseTr örnekleri", () => {
  assert.equal(titleCaseTr("BÜYÜKÇEKMECE"), "Büyükçekmece");
  assert.equal(titleCaseTr("İSTANBUL"), "İstanbul");
  assert.equal(titleCaseTr("GULF SHORES"), "Gulf Shores");
  assert.equal(titleCaseTr("NORDRHEIN-WESTFALEN"), "Nordrhein-Westfalen");
  assert.equal(titleCaseTr("ŞANLIURFA"), "Şanlıurfa");
  assert.equal(titleCaseTr("IĞDIR"), "Iğdır");
  assert.equal(titleCaseTr("  İSTANBUL  "), "İstanbul");
});

test("searchDiyanetCities: kısa sorgu boş liste, ağ yok", async () => {
  const h = makeDeps();
  assert.deepEqual(await searchDiyanetCities(" a ", h.deps), []);
  assert.equal(h.calls.length, 0);
});

test("searchDiyanetCities: 200 → geçerli öğeler parse edilir", async () => {
  const h = makeDeps();
  h.setReply(() => ({
    status: 200,
    body: {
      cities: [
        MANUAL,
        { id: 2, name: "EKSİK" },
        { ...MANUAL, id: 3, name: "BERLİN", lat: "x" },
      ],
    },
  }));

  const cities = await searchDiyanetCities("ber", h.deps);

  assert.deepEqual(cities, [MANUAL]);
  assert.equal(h.calls[0].timeoutMs, 6000);
});

test("searchDiyanetCities: 500 → null, fırlatan getJson → null", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 500, body: null }));
  assert.equal(await searchDiyanetCities("ber", h.deps), null);

  h.setReply(() => {
    throw new Error("offline");
  });
  assert.equal(await searchDiyanetCities("ber", h.deps), null);
});

test("searchDiyanetCities: q encodeURIComponent ile kodlanır", async () => {
  const h = makeDeps();
  h.setReply(() => ({ status: 200, body: { cities: [] } }));

  await searchDiyanetCities("şan", h.deps);

  assert.equal(h.calls[0].path, "/vakit/sehirler?q=%C5%9Fan");
});

test("prayerCityStampPart: elle şehir → 'm<id>'", async () => {
  const h = makeDeps({ [DIYANET_MANUAL_CITY_KEY]: MANUAL });
  assert.equal(await prayerCityStampPart(h.deps), `m${MANUAL.id}`);
});

test("prayerCityStampPart: önbellekte şehir → 'c<id>'", async () => {
  const h = makeDeps({ [DIYANET_CITY_KEY]: citySeed() });
  assert.equal(await prayerCityStampPart(h.deps), `c${CITY.id}`);
});

test("prayerCityStampPart: önbellekte city:null → '-'", async () => {
  const h = makeDeps({ [DIYANET_CITY_KEY]: citySeed({ city: null }) });
  assert.equal(await prayerCityStampPart(h.deps), "-");
});

test("prayerCityStampPart: hiç kayıt yok → '-'", async () => {
  const h = makeDeps();
  assert.equal(await prayerCityStampPart(h.deps), "-");
});

test("prayerCityStampPart: bozuk JSON/kayıt → '-'", async () => {
  const h = makeDeps({ [DIYANET_CITY_KEY]: "{bozuk" });
  assert.equal(await prayerCityStampPart(h.deps), "-");

  const bad = makeDeps({ [DIYANET_CITY_KEY]: { lat: "x", city: CITY } });
  assert.equal(await prayerCityStampPart(bad.deps), "-");
});

test("prayerCityStampPart: elle şehir önbelleğe göre önceliklidir", async () => {
  const h = makeDeps({
    [DIYANET_MANUAL_CITY_KEY]: MANUAL,
    [DIYANET_CITY_KEY]: citySeed({ city: { ...CITY, id: 99999 } }),
  });
  assert.equal(await prayerCityStampPart(h.deps), `m${MANUAL.id}`);
});

test("prayerCityStampPart: okuma fırlatsa bile '-'", async () => {
  const deps: DiyanetPrayerDeps = {
    getJson: async () => ({ status: 500, body: null }),
    readStore: async () => {
      throw new Error("patladı");
    },
    writeStore: async () => {},
    nowMs: () => BASE,
  };
  assert.equal(await prayerCityStampPart(deps), "-");
});
