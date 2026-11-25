import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import { SerialQueue, settleJobs } from "./serialQueue.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };

// Gerçek kuyruk ve izin/GPS akışı; yalnız native, depo ve ağ sınırları stub.
function harness(manual = false) {
  const notification = deferred<{ status: string }>();
  const location = deferred<{ status: string }>();
  const gps = deferred<never>();
  const events: string[] = [];
  const noop = async () => {};
  const modules: Record<string, unknown> = {
    "./serialQueue": { SerialQueue, settleJobs },
    "./prayerContextDeps": { ISTANBUL_FALLBACK: { lat: 41, lng: 29 },
      buildPrayerContext: async () => { events.push("network"); throw new Error("offline"); } },
    "../tour/overlayBusy": { withOverlayBusy: (fn: () => unknown) => fn() },
    "expo-device": { isDevice: true },
    "expo-notifications": {
      getPermissionsAsync: async () => ({ status: "undetermined" }),
      requestPermissionsAsync: () => { events.push("notification"); return notification.promise; },
      cancelAllScheduledNotificationsAsync: noop,
    },
    "expo-location": { Accuracy: { Balanced: 1 },
      requestForegroundPermissionsAsync: () => { events.push("location"); return location.promise; },
      getCurrentPositionAsync: () => { events.push("gps"); return gps.promise; } },
    "react-native": { Platform: { OS: "ios" } },
    "./storage": { storage: { getString: async () => null, getJSON: async () => null,
      setString: noop, remove: noop }, STORAGE_KEYS: {} },
    "./diyanetPrayer": { getManualCity: async () => manual ? { lat: 41, lon: 29 } : null,
      prayerCityStampPart: async () => "manual" },
    "./diyanetPrayerDeps": { diyanetDeps: () => ({}) },
    "./prayerDayRepositoryDeps": { getPrayerDayRepository: () => ({ subscribe: () => () => {} }) },
    "../i18n": { getLang: () => "tr" },
    "./timeZone": { deviceTimeZone: () => "Europe/Istanbul" },
    "../../modules/exact-alarm": { canScheduleExactAlarms: () => true },
  };
  const source = readFileSync(new URL("./namazNotifications.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "exports", "module", "setTimeout", compiled)(
    (id: string) => modules[id] ?? {}, mod.exports, mod,
    () => { events.push("gps-timeout"); return 0; },
  );
  const api = mod.exports as typeof import("./namazNotifications");
  return { api, events, notification, location, gps };
}

test("izin pencereleri sayacı başlatmaz; GPS ve ağ izin yanıtından sonra gelir", async () => {
  const h = harness();
  const run = h.api.enablePrayerNotificationsFirstRun({ onPermissionsResolved: () => h.events.push("resolved") });
  await flush();
  assert.deepEqual(h.events, ["notification"]);
  h.notification.resolve({ status: "granted" });
  await flush();
  assert.deepEqual(h.events, ["notification", "location"]);
  h.location.resolve({ status: "granted" });
  await flush();
  assert.deepEqual(h.events, ["notification", "location", "resolved", "gps", "gps-timeout"]);
  h.gps.reject(new Error("no GPS"));
  assert.equal(await run, "error");
  assert.equal(h.events.filter(e => e === "resolved").length, 1);
  assert.ok(h.events.indexOf("network") > h.events.indexOf("resolved"));
});

test("bildirim reddi, konum reddi, manuel şehir ve izin hatası tam bir kez bildirir", async () => {
  for (const scenario of ["notification-denied", "location-denied", "manual", "permission-error"]) {
    const h = harness(scenario === "manual");
    let resolved = 0;
    const run = h.api.enablePrayerNotificationsFirstRun({ onPermissionsResolved: () => resolved++ });
    await flush();
    if (scenario === "permission-error") {
      h.notification.reject(new Error("permission API failed"));
      await assert.rejects(run, /permission API failed/);
    } else {
      h.notification.resolve({ status: scenario === "notification-denied" ? "denied" : "granted" });
      await flush();
      if (scenario === "location-denied") h.location.resolve({ status: "denied" });
      assert.equal(await run, scenario === "notification-denied" ? "denied" : "error");
    }
    assert.equal(resolved, 1, scenario);
    assert.equal(h.events.includes("gps"), false, scenario);
    assert.equal(h.events.includes("location"), scenario === "location-denied", scenario);
  }
});

test("kuyruk izinleri seri tutar ve seçenek vermeyen çağıran çalışır", async () => {
  const h = harness();
  let resolved = 0;
  const first = h.api.enablePrayerNotificationsFirstRun({ onPermissionsResolved: () => resolved++ });
  const second = h.api.enablePrayerNotificationsFirstRun();
  await flush();
  assert.deepEqual(h.events, ["notification"]);
  h.notification.resolve({ status: "denied" });
  assert.deepEqual(await Promise.all([first, second]), ["denied", "denied"]);
  assert.equal(resolved, 1);
  assert.deepEqual(h.events, ["notification", "notification"]);
});
