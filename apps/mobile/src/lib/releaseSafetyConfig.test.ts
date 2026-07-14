import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("RNFirebase Advertising ID toplamayı kapatır ve manifest engelini korur", () => {
  const firebase = JSON.parse(readFileSync(join(root, "firebase.json"), "utf8")) as {
    "react-native"?: { google_analytics_adid_collection_enabled?: boolean };
  };
  assert.equal(firebase["react-native"]?.google_analytics_adid_collection_enabled, false);

  const appConfig = readFileSync(join(root, "apps/mobile/app.config.js"), "utf8");
  assert.match(appConfig, /com\.google\.android\.gms\.permission\.AD_ID/);
});

test("MMKV silme legacy AsyncStorage temizlenmeden yapılmaz", () => {
  const source = readFileSync(join(root, "apps/mobile/src/lib/storage.ts"), "utf8");
  const singleRemove = source.indexOf("await AsyncStorage.removeItem(key);");
  const mmkvRemove = source.indexOf("mmkv.remove(key);");
  assert.ok(singleRemove >= 0 && mmkvRemove > singleRemove);

  const multiRemove = source.indexOf("await AsyncStorage.multiRemove(keys);");
  const mmkvMultiRemove = source.indexOf("keys.forEach((k) => m.remove(k));");
  assert.ok(multiRemove >= 0 && mmkvMultiRemove > multiRemove);
});

test("konumsuz sessiz akış İstanbul planlamaz, widget güvenli durumda kalır", () => {
  const notifications = readFileSync(join(root, "apps/mobile/src/lib/namazNotifications.ts"), "utf8");
  const widget = readFileSync(join(root, "apps/mobile/src/widgets/prayerWidgetSync.ts"), "utf8");
  assert.doesNotMatch(notifications, /ISTANBUL_FALLBACK/);
  assert.match(notifications, /const coords = await getLocationSilent\(\);[\s\S]*?if \(prayerOn\) \{[\s\S]*?cancelScheduledPrayerNotifications\(\);/);
  assert.match(widget, /const coords = await getLocationSilent\(\);[\s\S]*?if \(!coords\) return;/);
});

test("mobil ve web gizlilik metni yeni cihaz geri yüklemesini garanti etmez", () => {
  const mobile = readFileSync(join(root, "apps/mobile/app/gizlilik.tsx"), "utf8");
  const web = readFileSync(join(root, "apps/web/src/app/privacy/page.tsx"), "utf8");
  assert.match(mobile, /yeni cihazda geri yükleme garanti\s+edilmez/);
  assert.match(web, /yeni cihazda geri yükleme garanti edilmez/);
});
