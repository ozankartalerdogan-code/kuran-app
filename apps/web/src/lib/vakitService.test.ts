import { test } from "node:test";
import assert from "node:assert/strict";
import { monthDateRange, normalizeDiyanetDay } from "./diyanetVakit.ts";
import {
  createVakitService,
  UpstreamUnavailableError,
  type StoredDay,
  type VakitStore,
} from "./vakitService.ts";

const NOW = 1_800_000_000;

function monthDates(month: string): string[] {
  const { end } = monthDateRange(month);
  const count = Number(end.slice(8, 10));
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

function storedDay(cityId: number, date: string, gmtOffset = 1): StoredDay {
  return {
    cityId,
    date,
    fajr: "05:25",
    sunrise: "07:18",
    dhuhr: "11:55",
    asr: "14:20",
    maghrib: "16:32",
    isha: "18:00",
    hijriShort: "4.6.1448",
    gmtOffset,
    fetchedAt: NOW,
  };
}

function rawDay(date: string, gmtOffset = 1) {
  const [year, month, day] = date.split("-");
  return {
    fajr: "05:25",
    sunrise: "07:18",
    dhuhr: "11:55",
    asr: "14:20",
    maghrib: "16:32",
    isha: "18:00",
    gregorianDateShort: `${Number(day)}.${Number(month)}.${year}`,
    hijriDateShort: "4.6.1448",
    greenwichMeanTimeZone: gmtOffset,
  };
}

function makeStore(initial: StoredDay[] = []) {
  const days = new Map<string, StoredDay>(
    initial.map((day) => [`${day.cityId}:${day.date}`, day]),
  );
  const putCalls: StoredDay[][] = [];
  let failPut = false;

  const store: VakitStore = {
    async getDays(cityId, startYmd, endYmd) {
      return [...days.values()]
        .filter((day) => day.cityId === cityId && day.date >= startYmd && day.date <= endYmd)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    },
    async putDays(input) {
      if (failPut) throw new Error("put basarisiz");
      putCalls.push(input);
      for (const day of input) {
        days.set(`${day.cityId}:${day.date}`, day);
      }
    },
  };

  return {
    store,
    putCalls,
    setFailPut: (value: boolean) => {
      failPut = value;
    },
  };
}

function makeService(
  store: VakitStore,
  fetchDateRange: (cityId: number, startYmd: string, endYmd: string) => Promise<unknown[]>,
) {
  return createVakitService({
    store,
    fetchDateRange,
    normalize: normalizeDiyanetDay,
    monthDateRange,
    now: () => NOW,
  });
}

test("tam onbellek: Diyanet'e gidilmez", async () => {
  const dates = monthDates("2026-11");
  const fake = makeStore(dates.map((date) => storedDay(11002, date)));
  let calls = 0;

  const service = makeService(fake.store, async () => {
    calls += 1;
    return [];
  });

  const result = await service.getMonth(11002, "2026-11");

  assert.equal(calls, 0);
  assert.equal(result.complete, true);
  assert.equal(result.fromCache, true);
  assert.equal(result.days.length, 30);
  assert.equal(result.days[0]?.date, "2026-11-01");
  assert.equal(result.days[0]?.times.imsak, "2026-11-01T05:25:00+01:00");
});

test("eksik onbellek: bir kez fetch + putDays, gunler sirali", async () => {
  const dates = monthDates("2026-11");
  const raws = dates.map((date) => rawDay(date)).reverse();
  const fake = makeStore();
  let calls = 0;

  const service = makeService(fake.store, async () => {
    calls += 1;
    return raws;
  });

  const result = await service.getMonth(11002, "2026-11");

  assert.equal(calls, 1);
  assert.equal(fake.putCalls.length, 1);
  assert.equal(fake.putCalls[0]?.length, 30);
  assert.equal(result.complete, true);
  assert.equal(result.fromCache, false);
  assert.equal(result.days.length, 30);
  assert.equal(result.days[0]?.date, "2026-11-01");
  assert.equal(result.days[29]?.date, "2026-11-30");
  assert.equal(fake.putCalls[0]?.[0]?.date, "2026-11-01");
  assert.equal(fake.putCalls[0]?.[0]?.fajr, "05:25");
  assert.equal(fake.putCalls[0]?.[0]?.fetchedAt, NOW);
});

test("esazamanli 3 cagri tek fetch paylasir", async () => {
  const dates = monthDates("2026-11");
  const raws = dates.map((date) => rawDay(date));
  const fake = makeStore();
  let calls = 0;
  let release: (value: unknown[]) => void = () => undefined;
  const gate = new Promise<unknown[]>((resolve) => {
    release = resolve;
  });

  const service = makeService(fake.store, () => {
    calls += 1;
    return gate;
  });

  const first = service.getMonth(11002, "2026-11");
  const second = service.getMonth(11002, "2026-11");
  const third = service.getMonth(11002, "2026-11");

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 1);

  release(raws);
  const results = await Promise.all([first, second, third]);

  assert.equal(calls, 1);
  assert.equal(fake.putCalls.length, 1);
  assert.deepEqual(results.map((r) => r.days.length), [30, 30, 30]);
});

test("fetch hatasi + kismi onbellek -> complete false", async () => {
  const fake = makeStore([
    storedDay(11002, "2026-11-01"),
    storedDay(11002, "2026-11-02"),
  ]);

  const service = makeService(fake.store, async () => {
    throw new Error("diyanet kapali");
  });

  const result = await service.getMonth(11002, "2026-11");

  assert.equal(result.complete, false);
  assert.equal(result.fromCache, true);
  assert.equal(result.days.length, 2);
  assert.equal(result.days[0]?.date, "2026-11-01");
});

test("fetch hatasi + bos onbellek -> UpstreamUnavailableError", async () => {
  const fake = makeStore();
  const service = makeService(fake.store, async () => {
    throw new Error("diyanet kapali");
  });

  await assert.rejects(
    service.getMonth(11002, "2026-11"),
    (error: unknown) => error instanceof UpstreamUnavailableError,
  );
});

test("putDays hatasi yaniti bozmaz", async () => {
  const dates = monthDates("2026-11");
  const raws = dates.map((date) => rawDay(date));
  const fake = makeStore();
  fake.setFailPut(true);

  const service = makeService(fake.store, async () => raws);
  const result = await service.getMonth(11002, "2026-11");

  assert.equal(result.complete, true);
  assert.equal(result.days.length, 30);
  assert.equal(fake.putCalls.length, 0);
});

test("yaz saati: 24.10 +02:00, 25.10 +01:00 ve onbellekten ayni donus", async () => {
  const dates = monthDates("2026-10");
  const raws = dates.map((date) => {
    if (date === "2026-10-24") return rawDay(date, 2);
    if (date === "2026-10-25") return rawDay(date, 1);
    return rawDay(date, 2);
  });
  const fake = makeStore();

  const service = makeService(fake.store, async () => raws);
  const result = await service.getMonth(11002, "2026-10");

  const before = result.days.find((day) => day.date === "2026-10-24");
  const after = result.days.find((day) => day.date === "2026-10-25");

  assert.ok(before);
  assert.ok(after);
  assert.equal(before.utcOffsetMin, 120);
  assert.equal(after.utcOffsetMin, 60);
  assert.equal(before.times.imsak, "2026-10-24T05:25:00+02:00");
  assert.equal(after.times.imsak, "2026-10-25T05:25:00+01:00");

  let calls = 0;
  const cachedService = makeService(fake.store, async () => {
    calls += 1;
    return [];
  });
  const cached = await cachedService.getMonth(11002, "2026-10");

  assert.equal(calls, 0);
  assert.equal(cached.fromCache, true);
  assert.equal(cached.complete, true);
  assert.equal(
    cached.days.find((day) => day.date === "2026-10-24")?.times.imsak,
    "2026-10-24T05:25:00+02:00",
  );
  assert.equal(
    cached.days.find((day) => day.date === "2026-10-25")?.times.imsak,
    "2026-10-25T05:25:00+01:00",
  );
});

test("tekrarli tarih: 30 kayitta ayni tarih iki kez gelirse tekillestirilir ve complete:false", async () => {
  const dates = monthDates("2026-11");
  // 30. günü çıkarıp 1. günü iki kez gönderiyoruz (toplam 30 ham kayıt ama 29 benzersiz gün)
  const raws = [...dates.slice(0, 29).map((date) => rawDay(date)), rawDay("2026-11-01")];
  const fake = makeStore();

  const service = makeService(fake.store, async () => raws);
  const result = await service.getMonth(11002, "2026-11");

  assert.equal(result.complete, false);
  assert.equal(result.days.length, 29);
  assert.equal(fake.putCalls[0]?.length, 29);
});

test("baska aya ait gun ve gecersiz gun atilir", async () => {
  const dates = monthDates("2026-11");
  const raws = [
    ...dates.slice(0, 28).map((date) => rawDay(date)),
    rawDay("2026-10-31"),
    rawDay("2026-12-01"),
    { invalid: true },
  ];
  const fake = makeStore();

  const service = makeService(fake.store, async () => raws);
  const result = await service.getMonth(11002, "2026-11");

  assert.equal(result.complete, false);
  assert.equal(result.days.length, 28);
  assert.ok(result.days.every((d) => d.date.startsWith("2026-11-")));
});

test("depoda 20 gun + Diyanet 5 gun (cakisan 2) -> 23 gun doner ve yeni gelen ezer", async () => {
  const dates = monthDates("2026-11");
  const initialStored = dates.slice(0, 20).map((date) => storedDay(11002, date));
  const fake = makeStore(initialStored);

  // Diyanet 19, 20 (çakışan 2) ve 21, 22, 23 (yeni 3) olmak üzere 5 gün döndürür;
  // çakışan 2026-11-20 günü için farklı fajr saati verelim.
  const updated20 = { ...rawDay("2026-11-20"), fajr: "05:40" };
  const raws = [
    rawDay("2026-11-19"),
    updated20,
    rawDay("2026-11-21"),
    rawDay("2026-11-22"),
    rawDay("2026-11-23"),
  ];

  const service = makeService(fake.store, async () => raws);
  const result = await service.getMonth(11002, "2026-11");

  assert.equal(result.complete, false);
  assert.equal(result.fromCache, false);
  assert.equal(result.days.length, 23);
  assert.equal(
    result.days.find((d) => d.date === "2026-11-20")?.times.imsak,
    "2026-11-20T05:40:00+01:00",
  );
  assert.equal(fake.putCalls.length, 1);
  assert.equal(fake.putCalls[0]?.length, 23);
});

test("depoda bozuk satir varken ham satir sayisi 30 olsa da complete:true sayilmaz, tam ay birlesimle complete:true olur", async () => {
  const dates = monthDates("2026-11");
  const broken: StoredDay = { ...storedDay(11002, "2026-11-30"), fajr: "gecersiz" };
  const initialStored = [
    ...dates.slice(0, 29).map((date) => storedDay(11002, date)),
    broken,
  ];
  const fake = makeStore(initialStored);
  let calls = 0;

  const service = makeService(fake.store, async () => {
    calls += 1;
    return [rawDay("2026-11-30")];
  });

  const result = await service.getMonth(11002, "2026-11");

  assert.equal(calls, 1);
  assert.equal(result.complete, true);
  assert.equal(result.days.length, 30);
});
