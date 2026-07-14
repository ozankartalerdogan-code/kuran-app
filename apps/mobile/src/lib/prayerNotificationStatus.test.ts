import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPrayerNotificationStatus } from "./prayerNotificationStatus.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const notificationsPath = join(root, "apps/mobile/src/lib/namazNotifications.ts");
const screenPath = join(root, "apps/mobile/app/bildirimler.tsx");

test("konumsuz sessiz yenileme planlanamama durumunu yazar ve yalnız namaz bildirimlerini iptal eder", () => {
  const source = readFileSync(notificationsPath, "utf8");
  const start = source.indexOf("const coords = await getLocationSilent();");
  const end = source.indexOf("const { lat, lng } = coords;", start);
  const noLocationBranch = source.slice(start, end);

  assert.match(noLocationBranch, /cancelScheduledPrayerNotifications\(\)/);
  assert.match(noLocationBranch, /storage\.setString\(PRAYER_SCHEDULE_UNAVAILABLE_KEY, "1"\)/);
  assert.doesNotMatch(noLocationBranch, /cancelNamazNotifications|cancelAllScheduledNotificationsAsync/);

  const cancelStart = source.indexOf("export async function cancelScheduledPrayerNotifications");
  const cancelEnd = source.indexOf("// Bildirimleri kapat", cancelStart);
  const selectiveCancel = source.slice(cancelStart, cancelEnd);
  assert.match(selectiveCancel, /identifier\.startsWith\("namaz-"\)/);
  assert.doesNotMatch(selectiveCancel, /cancelAllScheduledNotificationsAsync/);
});

test("başarılı planlama planlanamama durumunu temizler", () => {
  const source = readFileSync(notificationsPath, "utf8");
  const successStart = source.lastIndexOf("await applyNotifications({ days, prayer: prayerOn, dailyVerse: dailyOn });");
  const successBranch = source.slice(successStart, source.indexOf("} catch", successStart));

  assert.match(successBranch, /storage\.remove\(PRAYER_SCHEDULE_UNAVAILABLE_KEY\)/);
});

test("kullanıcı namaz bildirimlerini kapattığında planlanamama durumu temizlenir", () => {
  const source = readFileSync(screenPath, "utf8");
  const toggleStart = source.indexOf("async function toggleNotif");
  const disableStart = source.indexOf("if (!val)", toggleStart);
  const disableEnd = source.indexOf("if (!(await ensurePermission()))", disableStart);
  const disableBranch = source.slice(disableStart, disableEnd);

  assert.match(disableBranch, /cancelScheduledPrayerNotifications\(\)/);
  assert.match(disableBranch, /storage\.remove\(PRAYER_SCHEDULE_UNAVAILABLE_KEY\)/);
});

test("tercih açık ve konum planlaması başarısızsa planlandı mesajı seçilmez", () => {
  const status = getPrayerNotificationStatus({
    preferenceEnabled: true,
    osPermissionGranted: true,
    scheduleUnavailable: true,
  });

  assert.equal(status.kind, "location-unavailable");
  assert.equal(
    status.message,
    "Konum alınamadığı için namaz bildirimleri şu anda planlanamadı. Konum iznini açtıktan sonra tekrar denenecektir.",
  );
  assert.doesNotMatch(status.message, /bildirim planlandı/);
});

test("bildirim izni kapalı mesajı konum planlanamama mesajından önceliklidir", () => {
  const status = getPrayerNotificationStatus({
    preferenceEnabled: true,
    osPermissionGranted: false,
    scheduleUnavailable: true,
  });

  assert.equal(status.kind, "permission-denied");
});
