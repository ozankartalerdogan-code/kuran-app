/**
 * resumeReading.test.ts — son okunan sayfa/yer imi ve aktif hatim ilerlemesi testleri.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSavedPage, RESUME_MAX_PAGE as SAYFA_SAYISI } from "./resumeReading.ts";
import { parseActiveHatimProgress } from "./hatim.ts";

// Mushaf JSON'u testte yüklenmez; ayet→sayfa çevirisi için belirlenimci bir taklit kullanılır.
const ayetinSayfasi = (s: number, a: number) => (s * 1000 + a) % 600 + 1;

test("geçerli sayfa doğrudan döner (yer imine bakılmaz)", () => {
  assert.equal(parseSavedPage("1", null, ayetinSayfasi), 1);
  assert.equal(parseSavedPage("42", "114:1", ayetinSayfasi), 42);
  assert.equal(parseSavedPage(String(SAYFA_SAYISI), null, ayetinSayfasi), SAYFA_SAYISI);
});

test("sınır dışı veya bozuk sayfa → yer imine düşer", () => {
  const expected = ayetinSayfasi(2, 255);
  for (const invalidPage of [null, "", "0", "-5", "605", "999", "abc", "12.5"]) {
    assert.equal(parseSavedPage(invalidPage, "2:255", ayetinSayfasi), expected, `sayfa=${String(invalidPage)}`);
  }
});

test('yer imi "2:255" → çeviriciye sure 2, ayet 255 olarak iletilir', () => {
  const calls: [number, number][] = [];
  const page = parseSavedPage(null, "2:255", (s, a) => { calls.push([s, a]); return 42; });
  assert.deepEqual(calls, [[2, 255]]);
  assert.equal(page, 42);
});

test("sayfa ve yer imi ikisi de yoksa veya geçersizse → null", () => {
  assert.equal(parseSavedPage(null, null, ayetinSayfasi), null);
  assert.equal(parseSavedPage("", "", ayetinSayfasi), null);
  assert.equal(parseSavedPage("0", "0:1", ayetinSayfasi), null);
  assert.equal(parseSavedPage("605", "115:1", ayetinSayfasi), null);
  assert.equal(parseSavedPage("bozuk", "2:0", ayetinSayfasi), null);
  assert.equal(parseSavedPage("bozuk", "bozuk", ayetinSayfasi), null);
});

test("hatim yok, boş veya bozuk → null", () => {
  assert.equal(parseActiveHatimProgress(null), null);
  assert.equal(parseActiveHatimProgress(""), null);
  assert.equal(parseActiveHatimProgress("{bozuk"), null);
  assert.equal(parseActiveHatimProgress(JSON.stringify({ hatims: [], currentId: null })), null);
  assert.equal(
    parseActiveHatimProgress(
      JSON.stringify({
        hatims: [{ id: "h1", startDate: "2026-01-01", completedDate: null, readJuz: [1, 2] }],
        currentId: "olmayan-id",
      }),
    ),
    null,
  );
});

test("aktif hatimde okunan cüz sayısı döner", () => {
  const rawZero = JSON.stringify({
    hatims: [{ id: "h1", startDate: "2026-01-01", completedDate: null, readJuz: [] }],
    currentId: "h1",
  });
  assert.equal(parseActiveHatimProgress(rawZero), 0);

  const rawSome = JSON.stringify({
    hatims: [
      { id: "h1", startDate: "2026-01-01", completedDate: null, readJuz: [1, 2, 3, 30] },
      { id: "h2", startDate: "2025-01-01", completedDate: "2025-02-01", readJuz: [1] },
    ],
    currentId: "h1",
  });
  assert.equal(parseActiveHatimProgress(rawSome), 4);
});
