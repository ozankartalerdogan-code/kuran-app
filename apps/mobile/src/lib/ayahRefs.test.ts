/**
 * ayahRefs.test.ts — ayet referansı ayrıştırma testleri.
 * Çalıştır: npm run test:mobile
 *
 * Ders metni güvenilmez dış içeriktir; yanlış link (kesir/saat/sayfa no →
 * ayet) kabul edilemez. Bu testler eleme kurallarını sabitler.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAyahRefs, isValidAyahRef, isValidSurahId, hasAyahRef, parseDirectAyahQuery, SURAH_AYAH_COUNTS } from "./ayahRefs.ts";

function ayahs(text: string) {
  return parseAyahRefs(text).filter((s) => s.type === "ayah");
}

test("slash formatı: '5/6' → Maide 6. ayet linki", () => {
  const a = ayahs("Abdest (Maide 5/6) farzdır.");
  assert.equal(a.length, 1);
  assert.deepEqual(
    { s: a[0].type === "ayah" && a[0].surahId, y: a[0].type === "ayah" && a[0].ayahNumber },
    { s: 5, y: 6 },
  );
});

test("colon formatı: '33:21' linklenir", () => {
  const a = ayahs("Peygamber güzel örnektir (33:21).");
  assert.equal(a.length, 1);
  assert.equal(a[0].type === "ayah" && a[0].surahId, 33);
  assert.equal(a[0].type === "ayah" && a[0].ayahNumber, 21);
});

test("aralık: '112/1-4' → sure 112 ayet 1'e gider", () => {
  const a = ayahs("İhlas 112/1-4 okunur.");
  assert.equal(a.length, 1);
  assert.equal(a[0].type === "ayah" && a[0].surahId, 112);
  assert.equal(a[0].type === "ayah" && a[0].ayahNumber, 1);
});

test("kesir elenir: '1/10' Fatiha'da 10. ayet yok (7 ayet)", () => {
  assert.equal(ayahs("malın 1/10 kadarı").length, 0);
});

test("kesir + apostrof elenir: '2/3'ü' ayet değil", () => {
  assert.equal(ayahs("günün 2/3'ü oruçlu").length, 0);
});

test("geçersiz sure elenir: '620/621' (>114)", () => {
  assert.equal(ayahs("sayfa 620/621").length, 0);
});

test("saat elenir: '05:30' içindeki '5:30' parçası", () => {
  assert.equal(ayahs("sabah 05:30 ezanı").length, 0);
});

test("hadis referansı eşleşmez: 'Müslim, Taharet 1'", () => {
  assert.equal(ayahs("(Müslim, Taharet 1)").length, 0);
});

test("çoklu referans: '5/6; 4/43' ikisi de linklenir", () => {
  const a = ayahs("(Maide 5/6; Nisa 4/43)");
  assert.equal(a.length, 2);
});

test("metin bütünlüğü: segmentler birleşince orijinali verir", () => {
  const t = "Namaz (33:21) ve oruç (2/183) emredildi.";
  const joined = parseAyahRefs(t).map((s) => s.value).join("");
  assert.equal(joined, t);
});

test("isValidAyahRef sınırları", () => {
  assert.equal(isValidAyahRef(1, 7), true);    // Fatiha son ayet
  assert.equal(isValidAyahRef(1, 8), false);   // Fatiha'da 8 yok
  assert.equal(isValidAyahRef(2, 286), true);  // Bakara son ayet
  assert.equal(isValidAyahRef(115, 1), false); // sure yok
  assert.equal(isValidAyahRef(0, 1), false);
});

test("hasAyahRef doğru/yanlış", () => {
  assert.equal(hasAyahRef("bkz 33:21"), true);
  assert.equal(hasAyahRef("sadece düz metin"), false);
});

test("parseDirectAyahQuery: arama kutusunda tam ayet referansı", () => {
  assert.deepEqual(parseDirectAyahQuery("2:255"), { surahId: 2, ayahNumber: 255 });
  assert.deepEqual(parseDirectAyahQuery("2/255"), { surahId: 2, ayahNumber: 255 });
  assert.deepEqual(parseDirectAyahQuery("  1:1  "), { surahId: 1, ayahNumber: 1 });
});

test("parseDirectAyahQuery: geçersiz/parçalı sorgular eşleşmez", () => {
  assert.equal(parseDirectAyahQuery("1/10"), null);       // Fatiha'da 10 yok
  assert.equal(parseDirectAyahQuery("620/621"), null);    // sure yok
  assert.equal(parseDirectAyahQuery("sabır"), null);      // düz metin
  assert.equal(parseDirectAyahQuery("bkz 2:255"), null);  // tüm sorgu değil, içinde geçiyor
  assert.equal(parseDirectAyahQuery("112/1-4"), null);    // aralık desteklenmez (arama tek ayete gider)
});

test("ayah route validation accepts valid first and last ayahs", () => {
  assert.equal(isValidAyahRef(1, 1), true);

  const lastAyah = SURAH_AYAH_COUNTS[2];
  assert.equal(isValidAyahRef(2, lastAyah), true);
  assert.equal(isValidAyahRef(2, lastAyah + 1), false);
});

test("ayah route validation rejects malformed and out-of-range params", () => {
  const invalidValues: Array<string | undefined> = [
    undefined,
    "",
    "not-a-number",
    "-1",
    "0",
    "1.5",
    "Infinity",
  ];

  for (const raw of invalidValues) {
    assert.equal(isValidAyahRef(Number(raw), 1), false, `invalid surah: ${raw}`);
    assert.equal(isValidAyahRef(1, Number(raw)), false, `invalid ayah: ${raw}`);
  }
  assert.equal(isValidAyahRef(115, 1), false);
});

test("invalid ayah route params enter the existing error flow before data fetching", () => {
  const source = readFileSync(
    new URL("../../app/ayah/[surahId]/[ayahNumber].tsx", import.meta.url),
    "utf8",
  );
  const guard = source.indexOf("if (!isValidAyahRef(surahId, ayahNumber))");
  const error = source.indexOf("setError(", guard);
  const earlyReturn = source.indexOf("return;", error);
  const request = source.indexOf("api.ayah.get(surahId, ayahNumber)", guard);

  assert.ok(guard >= 0 && error > guard && earlyReturn > error && request > earlyReturn);
});

test("surah route validation accepts 1 and 114 and rejects invalid params", () => {
  assert.equal(isValidSurahId(Number("1")), true);
  assert.equal(isValidSurahId(Number("114")), true);

  for (const raw of [undefined, "", "not-a-number", "0", "-1", "115", "1.5", "Infinity"]) {
    assert.equal(isValidSurahId(Number(raw)), false, `invalid surah: ${raw}`);
  }
});

test("dynamic /surah/1 validates before fetching and keeps the existing route", () => {
  const source = readFileSync(
    new URL("../../app/surah/[id].tsx", import.meta.url),
    "utf8",
  );
  const params = source.indexOf("useLocalSearchParams<{ id: string }>()");
  const guard = source.indexOf("if (!isValidSurahId(surahId))");
  const error = source.indexOf("setError(", guard);
  const earlyReturn = source.indexOf("return;", error);
  const request = source.indexOf("api.verses.bySurah(surahId)", guard);

  assert.ok(params >= 0 && guard > params);
  assert.ok(error > guard && earlyReturn > error && request > earlyReturn);
});

test("dynamic /tafsir/1 validates before fetching and keeps the existing route", () => {
  const source = readFileSync(
    new URL("../../app/tafsir/[surahId].tsx", import.meta.url),
    "utf8",
  );
  const params = source.indexOf("useLocalSearchParams<{ surahId: string; name?: string }>()");
  const localContent = source.indexOf(
    "isValidSurahId(surahId) ? getSimplifiedTafsir(surahId) : null",
  );
  const guard = source.indexOf("if (!isValidSurahId(surahId))");
  const errorFlow = source.indexOf("setTafsir(null)", guard);
  const earlyReturn = source.indexOf("return;", errorFlow);
  const request = source.indexOf("api.tafsir.get(surahId)", guard);

  assert.ok(params >= 0 && localContent > params);
  assert.ok(guard > localContent);
  assert.ok(errorFlow > guard && earlyReturn > errorFlow && request > earlyReturn);
});
