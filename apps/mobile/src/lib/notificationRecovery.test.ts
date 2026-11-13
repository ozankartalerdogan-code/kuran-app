import { test } from "node:test";
import assert from "node:assert/strict";
import { readNotificationPlan, readNotificationRollback, shouldRefreshNotifications } from "./notificationRecovery.ts";

const day = new Date(2026, 10, 13, 12);
const now = new Date(2026, 10, 13, 0);
const stamp = "2026-11-13|tr|Europe/Istanbul|exact";
const times = { Fajr: "05:30", Sunrise: "07:00", Dhuhr: "12:30", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" };
function fixture() {
  return {
    version: 1, stamp, prayer: true, dailyVerse: true,
    days: [{ date: day.toISOString(), times: { ...times } }],
    requests: [
      ...Object.values(times).map(time => {
        const [h, m] = time.split(":").map(Number);
        const date = new Date(day);
        date.setHours(h, m + 2, 0, 0);
        return { content: { title: "Vakit", body: "Namaz", sound: true, data: { route: "/namaz" } }, trigger: { type: "date", date: date.toISOString(), channelId: "namaz-vakitleri" } };
      }),
      ...[10, 19].map(hour => ({ content: { title: "Ayet", body: "Meal", sound: true, data: { route: "/ayah/1/1" } }, trigger: { type: "daily", hour, minute: 30, channelId: "gunun-ayeti" } })),
    ],
  };
}
const read = (value: unknown, at = now) => readNotificationPlan(JSON.stringify(value), stamp, true, true, at);

test("soğuk açılış aynı damgada yeniler, aynı süreçte ön plana geliş yenilemez", () => {
  assert.equal(shouldRefreshNotifications(true, true, stamp, stamp), true);
  assert.equal(shouldRefreshNotifications(true, false, stamp, stamp), false);
  assert.equal(shouldRefreshNotifications(true, false, null, stamp), true);
  assert.equal(shouldRefreshNotifications(true, false, "eski", stamp), true);
  for (const cold of [true, false]) assert.equal(shouldRefreshNotifications(false, cold, null, stamp), false);
});

test("başarılı plan günlerini ve tetikleyici tarihlerini Date olarak geri okur", () => {
  const plan = read(fixture());
  assert.ok(plan);
  assert.equal(plan.days[0].date.getTime(), day.getTime());
  assert.deepEqual(plan.days[0].times, times);
  assert.equal(plan.requests.length, 8);
  assert.ok((plan.requests[0].trigger as { date: Date }).date instanceof Date);
  assert.equal((plan.requests[6].trigger as { hour: number }).hour, 10);
});

test("geçmiş vakitleri tekrar teslim etmez, kalan planı eksiksiz tutar", () => {
  const plan = read(fixture(), new Date(2026, 10, 13, 13));
  assert.ok(plan);
  assert.equal(plan.requests.length, 5);
  assert.equal(plan.requests.filter(r => r.content.data?.route === "/namaz").length, 3);
});

test("son günlük bildirim de geçmişse boş kalan geçerli plan için ağ gerekmez", () => {
  const value = fixture();
  value.requests.slice(6).forEach((request, i) => {
    Object.assign(request.trigger, { type: "date", date: new Date(2026, 10, 13, 19 + i).toISOString() });
  });
  const plan = read(value, new Date(2026, 10, 13, 23));
  assert.ok(plan);
  assert.deepEqual(plan.requests, []);
});

test("boş, bozuk veya farklı sürümlü önbellek mevcut fetch yoluna düşer", () => {
  for (const raw of [null, "", "{", "null", "[]", "42"]) assert.equal(readNotificationPlan(raw, stamp, true, true, now), null);
  assert.equal(read({ ...fixture(), version: 2 }), null);
  assert.equal(read({ ...fixture(), days: [] }), null);
  assert.equal(read({ ...fixture(), requests: [] }), null);
});

test("gün, dil, saat dilimi, alarm izni veya tercihler farklıysa önbellek reddedilir", () => {
  for (const other of ["2026-11-14|tr|Europe/Istanbul|exact", "2026-11-13|en|Europe/Istanbul|exact", "2026-11-13|tr|UTC|exact", "2026-11-13|tr|Europe/Istanbul|inexact"]) {
    assert.equal(readNotificationPlan(JSON.stringify(fixture()), other, true, true, now), null);
  }
  assert.equal(readNotificationPlan(JSON.stringify(fixture()), stamp, false, true, now), null);
  assert.equal(readNotificationPlan(JSON.stringify(fixture()), stamp, true, false, now), null);
});

test("geçersiz veya eksik vakit verisi ve tarihler reddedilir", () => {
  for (const time of ["24:00", "12:60", "yanlış", null]) {
    const value = fixture();
    Object.assign(value.days[0].times, { Fajr: time });
    assert.equal(read(value), null);
  }
  const invalidDate = fixture();
  invalidDate.days[0].date = "bozuk";
  assert.equal(read(invalidDate), null);
  const wrongDay = fixture();
  wrongDay.days[0].date = new Date(2026, 10, 14).toISOString();
  assert.equal(read(wrongDay), null);
  const duplicateDay = fixture();
  duplicateDay.days.push(duplicateDay.days[0]);
  assert.equal(read(duplicateDay), null);
});

test("eksik/çift namaz isteği ve bozuk tetikleyiciyle eski plan iptal ettirilmez", () => {
  const missing = fixture();
  missing.requests.shift();
  assert.equal(read(missing), null);
  const duplicate = fixture();
  duplicate.requests.push(duplicate.requests[0]);
  assert.equal(read(duplicate), null);
  const duplicateDaily = fixture();
  duplicateDaily.requests.push(duplicateDaily.requests[6]);
  assert.equal(read(duplicateDaily), null);
  for (const patch of [{ type: "unknown" }, { date: "bozuk" }, { channelId: "başka" }]) {
    const value = fixture();
    Object.assign(value.requests[0].trigger, patch);
    assert.equal(read(value), null);
  }
  const daily = fixture();
  Object.assign(daily.requests[6].trigger, { hour: 24 });
  assert.equal(read(daily), null);
});

test("yalnız etkin tür geri kurulur; kapalı tercih geri alınmaz", () => {
  const raw = JSON.stringify(fixture());
  assert.equal(readNotificationRollback(raw, true, false, now).length, 6);
  assert.equal(readNotificationRollback(raw, false, true, now).length, 2);
  assert.deepEqual(readNotificationRollback(raw, false, false, now), []);
  assert.deepEqual(readNotificationRollback("bozuk", true, true, now), []);
});

test("yalnız namaz veya yalnız günlük ayet tercihiyle plan okunabilir", () => {
  for (const prayer of [true, false]) {
    const value = fixture();
    value.prayer = prayer;
    value.dailyVerse = !prayer;
    value.requests = value.requests.filter(r => (r.content.data.route === "/namaz") === prayer);
    assert.ok(readNotificationPlan(JSON.stringify(value), stamp, prayer, !prayer, now));
  }
});
