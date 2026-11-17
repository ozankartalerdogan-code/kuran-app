import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysYmd,
  formatHmInZone,
  futureCarry,
  instantsFromDiyanetIso,
  instantsFromWallTimes,
  notificationAtMs,
  zonedWallTimeToEpoch,
} from "./prayerInstant.ts";

const ISTANBUL = "Europe/Istanbul";
const NEW_YORK = "America/New_York";
const BERLIN = "Europe/Berlin";

const WALL = {
  Fajr: "05:30",
  Sunrise: "07:00",
  Dhuhr: "12:30",
  Asr: "15:00",
  Maghrib: "18:00",
  Isha: "20:00",
} as const;

test("zonedWallTimeToEpoch: İstanbul ve New York duvar saati doğru ana çevrilir", () => {
  assert.equal(
    zonedWallTimeToEpoch("2026-11-17", "15:41", ISTANBUL),
    Date.parse("2026-11-17T15:41:00+03:00"),
  );
  assert.equal(
    zonedWallTimeToEpoch("2026-11-17", "18:00", NEW_YORK),
    Date.parse("2026-11-17T23:00:00Z"),
  );
});

test("zonedWallTimeToEpoch: ileri atlanan saat ileri, iki kez yaşanan saat ilk ana düşer", () => {
  // Berlin 2026-03-29 02:30 duvar saatinde yok → 03:30'a (01:30Z) kaydırılır.
  assert.equal(
    zonedWallTimeToEpoch("2026-03-29", "02:30", BERLIN),
    Date.parse("2026-03-29T01:30:00Z"),
  );
  // Berlin 2026-10-25 02:30 iki kez yaşanır → ilk an (CEST, 00:30Z).
  assert.equal(
    zonedWallTimeToEpoch("2026-10-25", "02:30", BERLIN),
    Date.parse("2026-10-25T00:30:00Z"),
  );
});

test("zonedWallTimeToEpoch: New York yaz saati kenarları", () => {
  assert.equal(
    zonedWallTimeToEpoch("2026-03-08", "02:30", NEW_YORK),
    Date.parse("2026-03-08T07:30:00Z"),
  );
  assert.equal(
    zonedWallTimeToEpoch("2026-11-01", "01:30", NEW_YORK),
    Date.parse("2026-11-01T05:30:00Z"),
  );
});

test("zonedWallTimeToEpoch: geçersiz gün/saat ve tarih null", () => {
  for (const [ymd, hm] of [
    ["2026-02-30", "10:00"],
    ["2026-13-01", "10:00"],
    ["2026-11-17", "24:00"],
    ["2026-11-17", "12:60"],
    ["17-11-2026", "10:00"],
    ["2026-11-17", "10"],
  ] as const) {
    assert.equal(zonedWallTimeToEpoch(ymd, hm, ISTANBUL), null);
  }
});

test("formatHmInZone: anı dilimin duvar saatinde 24 saatlik sıfır dolgulu verir", () => {
  const at = Date.parse("2026-11-17T15:41:00+03:00");
  assert.equal(formatHmInZone(at, ISTANBUL), "15:41");
  assert.equal(formatHmInZone(Date.parse("2026-11-17T23:00:00Z"), NEW_YORK), "18:00");
  assert.equal(formatHmInZone(Date.parse("2026-11-18T02:00:00+03:00"), ISTANBUL), "02:00");
});

test("addDaysYmd: ay ve yıl sınırını takvimle aşar", () => {
  assert.equal(addDaysYmd("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysYmd("2026-01-01", -1), "2025-12-31");
  assert.equal(addDaysYmd("2026-02-28", 1), "2026-03-01");
  assert.equal(addDaysYmd("2028-02-28", 1), "2028-02-29");
});

test("instantsFromWallTimes: altı vakit anlara dönüşür; Isha gece yarısını aşarsa ertesi gün", () => {
  const at = instantsFromWallTimes("2026-11-17", WALL, ISTANBUL);
  assert.ok(at);
  assert.equal(at.Fajr, Date.parse("2026-11-17T05:30:00+03:00"));
  assert.equal(at.Isha, Date.parse("2026-11-17T20:00:00+03:00"));

  const midnight = instantsFromWallTimes(
    "2026-11-17",
    { ...WALL, Isha: "00:20" },
    ISTANBUL,
  );
  assert.ok(midnight);
  assert.equal(midnight.Isha, Date.parse("2026-11-18T00:20:00+03:00"));
  assert.equal(midnight.Isha, zonedWallTimeToEpoch("2026-11-18", "00:20", ISTANBUL));

  assert.equal(
    instantsFromWallTimes("2026-11-17", { ...WALL, Dhuhr: "bozuk" }, ISTANBUL),
    null,
  );
});

test("instantsFromDiyanetIso: ofsetli ISO aynı ana, ofsetsiz ISO null", () => {
  const raw = {
    imsak: "2026-11-17T05:30:00+03:00",
    gunes: "2026-11-17T07:00:00+03:00",
    ogle: "2026-11-17T12:30:00+03:00",
    ikindi: "2026-11-17T15:00:00+03:00",
    aksam: "2026-11-17T18:00:00-05:00",
    yatsi: "2026-11-17T20:00:00-05:00",
  };
  const at = instantsFromDiyanetIso(raw);
  assert.ok(at);
  assert.equal(at.Fajr, Date.parse(raw.imsak));
  assert.equal(at.Maghrib, Date.parse("2026-11-17T18:00:00-05:00"));
  assert.equal(at.Maghrib, Date.parse("2026-11-17T23:00:00Z"));

  assert.equal(
    instantsFromDiyanetIso({ ...raw, ogle: "2026-11-17T12:30:00" }),
    null,
  );
  assert.equal(instantsFromDiyanetIso({ ...raw, ogle: "bozuk" }), null);
  assert.equal(instantsFromDiyanetIso(null), null);
});

test("instantsFromDiyanetIso: Isha Maghrib'den küçükse 24 saat eklenir", () => {
  const at = instantsFromDiyanetIso({
    imsak: "2026-11-17T05:30:00+03:00",
    gunes: "2026-11-17T07:00:00+03:00",
    ogle: "2026-11-17T12:30:00+03:00",
    ikindi: "2026-11-17T15:00:00+03:00",
    aksam: "2026-11-17T18:00:00+03:00",
    yatsi: "2026-11-17T00:20:00+03:00",
  });
  assert.ok(at);
  assert.equal(
    at.Isha,
    Date.parse("2026-11-17T00:20:00+03:00") + 86_400_000,
  );
});

test("notificationAtMs: offset uygulanır; eşit/geçmiş an planlanmaz", () => {
  const at = Date.parse("2026-11-17T23:59:00+03:00");
  assert.equal(
    notificationAtMs(at, 2, Date.parse("2026-11-17T23:00:00+03:00")),
    Date.parse("2026-11-18T00:01:00+03:00"),
  );
  assert.equal(notificationAtMs(at, 2, at + 120_000), null);
  assert.equal(notificationAtMs(at, 2, at + 120_001), null);
  assert.equal(notificationAtMs(at, 0, at), null);
  assert.equal(
    notificationAtMs(at, 0, at - 1),
    at,
  );
});

test("futureCarry: yalnız bildirimi hâlâ gelecekte olan önceki gün anlarını taşır", () => {
  // New York 16 Kasım akşam/yatsı → İstanbul 17 Kasım 01:00/02:00.
  const prev = {
    Fajr: Date.parse("2026-11-16T05:30:00-05:00"),
    Sunrise: Date.parse("2026-11-16T07:00:00-05:00"),
    Dhuhr: Date.parse("2026-11-16T12:30:00-05:00"),
    Asr: Date.parse("2026-11-16T15:00:00-05:00"),
    Maghrib: Date.parse("2026-11-16T18:00:00-05:00"),
    Isha: Date.parse("2026-11-16T20:00:00-05:00"),
  };
  // İstanbul 17 Kasım 00:30: akşam (02:00) ve yatsı (04:00) gelecekte.
  assert.deepEqual(futureCarry(prev, Date.parse("2026-11-17T00:30:00+03:00"), 2), {
    Maghrib: prev.Maghrib,
    Isha: prev.Isha,
  });
  // Akşamın bildirimi (02:02) henüz gelmediyse an geçmiş olsa da taşınır.
  assert.deepEqual(futureCarry(prev, Date.parse("2026-11-17T02:01:00+03:00"), 2), {
    Maghrib: prev.Maghrib,
    Isha: prev.Isha,
  });
  // Bildirim anı tam eşitse planlanmaz.
  assert.deepEqual(futureCarry(prev, prev.Isha + 120_000, 2), {});
  assert.deepEqual(futureCarry(prev, prev.Isha + 120_001, 2), {});
  // Hepsi geçmişse boş.
  assert.deepEqual(futureCarry(prev, Date.parse("2026-11-17T23:00:00+03:00"), 2), {});
});

test("Türkiye birebir: cihaz dilimi = şehir dilimi iken anlar, HH:MM ve adet değişmez", () => {
  const at = instantsFromWallTimes("2026-11-17", WALL, ISTANBUL);
  assert.ok(at);
  const nowMs = Date.parse("2026-11-17T00:00:00+03:00");
  let count = 0;

  for (const key of Object.keys(WALL) as (keyof typeof WALL)[]) {
    // Eski yol: kaynak günün ertesi günü cihaz diliminde setHours(h, m + 2) →
    // İstanbul'da bu, aynı duvar saatinin +03:00 ofsetli ISO karşılığıdır.
    const legacyMs = Date.parse(`2026-11-17T${WALL[key]}:00+03:00`) + 120_000;
    assert.equal(notificationAtMs(at[key], 2, nowMs), legacyMs);
    assert.equal(formatHmInZone(at[key], ISTANBUL), WALL[key]);
    count++;
  }
  assert.equal(count, 6);
});

test("Türkiye birebir: 3 il × 7 gün Diyanet ISO → yeni tetik = eski HH:MM + setHours(+2) tetiği", () => {
  // Türkiye'de yaz saati yok (sabit +03:00); eski yol cihaz (İstanbul) saatinde
  // setHours(HH, MM + 2) idi → aynı duvar saatinin +03:00 karşılığı + 2 dk.
  const base: Record<string, string[]> = {
    istanbul: ["06:36", "08:04", "13:05", "15:38", "17:57", "19:20"],
    ankara: ["06:07", "07:33", "12:37", "15:12", "17:31", "18:53"],
    izmir: ["06:23", "07:48", "13:01", "15:41", "18:05", "19:24"],
  };
  const keys = ["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"];
  const out = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
  for (const times of Object.values(base)) {
    for (let i = 0; i < 7; i++) {
      const ymd = addDaysYmd("2026-11-17", i);
      const raw = Object.fromEntries(keys.map((k, j) => [k, `${ymd}T${times[j]}:00+03:00`]));
      const at = instantsFromDiyanetIso(raw);
      assert.ok(at);
      out.forEach((key, j) => {
        const legacy = Date.parse(`${ymd}T${times[j]}:00+03:00`) + 120_000;
        assert.equal(notificationAtMs(at[key], 2, 0), legacy);
        assert.equal(formatHmInZone(at[key], ISTANBUL), times[j]);
      });
      const wall = Object.fromEntries(out.map((k, j) => [k, times[j]]));
      const fromWall = instantsFromWallTimes(ymd, wall, ISTANBUL);
      assert.deepEqual(fromWall, at);
    }
  }
});

test("intlZoneSupported: Node'un Intl'i dilim dönüşümünü doğru yapar", async () => {
  const { intlZoneSupported } = await import("./prayerInstant.ts");
  assert.equal(intlZoneSupported(), true);
});
