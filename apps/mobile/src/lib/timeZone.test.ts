/**
 * timeZone.test.ts — namaz vakti istekleri cihaz saat dilimini kullanmalı.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceTimeZone, aladhanTzParam } from "./timeZone.ts";

test("deviceTimeZone: cihazın IANA dilimini döndürür (sabit İstanbul değil)", () => {
  assert.equal(deviceTimeZone(), Intl.DateTimeFormat().resolvedOptions().timeZone);
});

test("aladhanTzParam: dilimi URL-kodlu verir", () => {
  assert.equal(aladhanTzParam(), `timezonestring=${encodeURIComponent(deviceTimeZone())}`);
  assert.ok(!aladhanTzParam().includes("/"));
});
