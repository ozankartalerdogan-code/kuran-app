import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_LESSON_TERMS,
  extractArabicCells,
  parseDersIcerik,
} from "./elifbaLessonContent.ts";

const HARFLER_TABLE =
  "| Sonda | Ortada | Başta | Harfler |\n" +
  "| --- | --- | --- | --- |\n" +
  "| بدا | سال | احد | ا |\n" +
  "| حسب | جبل | بعث | ب |";

const EMPTY = { aciklama: null, kelimeler: [] };

test("parseDersIcerik: eksik, boş ve bozuk girdilerde boş sonuç döner", () => {
  const inputs: Array<string | null | undefined> = [
    undefined,
    null,
    "",
    "   ",
    "bozuk {",
    "[]",
    "[1,2]",
    "42",
    '"metin"',
    "true",
  ];
  for (const raw of inputs) {
    assert.deepEqual(parseDersIcerik(raw), EMPTY);
  }
});

test("parseDersIcerik: yanlış alan tipleri ilgili alanı boş bırakır", () => {
  const raw = JSON.stringify({
    aciklama: 5,
    alistirma: ["x"],
    ek_tablolar: "yok",
  });
  assert.deepEqual(parseDersIcerik(raw), EMPTY);
});

test("parseDersIcerik: Harfler tablosunda ilk üç hücre alınır, harf sütunu atlanır", () => {
  const raw = JSON.stringify({
    aciklama: `Giriş.\n\n${HARFLER_TABLE}`,
    alistirma: null,
    ek_tablolar: [],
  });
  const parsed = parseDersIcerik(raw);
  assert.equal(parsed.aciklama, "Giriş.");
  assert.deepEqual(parsed.kelimeler, ["بدا", "سال", "احد", "حسب", "جبل", "بعث"]);
});

test("extractArabicCells: tablo hücrelerini ve düz satırları kaynak sırasıyla ayırır", () => {
  assert.deepEqual(
    extractArabicCells("رَزَقَ | رَجَعَ\nقَرَأَ ضَرَبَ"),
    ["رَزَقَ", "رَجَعَ", "قَرَأَ", "ضَرَبَ"],
  );
  assert.deepEqual(
    extractArabicCells(HARFLER_TABLE),
    ["بدا", "سال", "احد", "حسب", "جبل", "بعث"],
  );
});

test("parseDersIcerik: alistirma null ise kelime üretmez, dolu ise tablo/satır ayrıştırır", () => {
  const empty = parseDersIcerik(JSON.stringify({
    aciklama: "Kısa açıklama.",
    alistirma: null,
    ek_tablolar: [],
  }));
  assert.deepEqual(empty, { aciklama: "Kısa açıklama.", kelimeler: [] });

  const filled = parseDersIcerik(JSON.stringify({
    aciklama: "Kısa açıklama.",
    alistirma: "رَزَقَ | رَجَعَ | قَرَأَ\nظَهَرَ يَدَكَ",
    ek_tablolar: [],
  }));
  assert.deepEqual(
    filled.kelimeler,
    ["رَزَقَ", "رَجَعَ", "قَرَأَ", "ظَهَرَ", "يَدَكَ"],
  );
});

test("parseDersIcerik: ek tabloları sırayla toplar, bozuk girişleri atlar", () => {
  const raw = JSON.stringify({
    aciklama: null,
    alistirma: null,
    ek_tablolar: [
      { baslik: "Harf Tablosu 1", icerik: HARFLER_TABLE },
      null,
      { icerik: 5 },
      { icerik: "| Sonda | Ortada | Başta | Harfler |\n| --- | --- | --- | --- |\n| نبذ | عذب | ذبح | ذ |" },
    ],
  });
  const parsed = parseDersIcerik(raw);
  assert.equal(parsed.aciklama, null);
  assert.deepEqual(
    parsed.kelimeler,
    ["بدا", "سال", "احد", "حسب", "جبل", "بعث", "نبذ", "عذب", "ذبح"],
  );
});

test("parseDersIcerik: kaynak sırası açıklama tablosu → alıştırma → ek tablo", () => {
  const raw = JSON.stringify({
    aciklama: HARFLER_TABLE,
    alistirma: "بَ",
    ek_tablolar: [{ icerik: "تَ" }],
  });
  const parsed = parseDersIcerik(raw);
  assert.equal(parsed.aciklama, null);
  assert.deepEqual(
    parsed.kelimeler,
    ["بدا", "سال", "احد", "حسب", "جبل", "بعث", "بَ", "تَ"],
  );
});

test("parseDersIcerik: aynı ham metin tekrarını kaldırır", () => {
  const raw = JSON.stringify({
    aciklama: null,
    alistirma: "بَ بَ | بَ\nتَ بَ تَ",
    ek_tablolar: [{ icerik: "بَ تَ" }],
  });
  assert.deepEqual(parseDersIcerik(raw).kelimeler, ["بَ", "تَ"]);
});

test("parseDersIcerik: Arapça harf ve harekeleri aynen korur", () => {
  const raw = JSON.stringify({
    aciklama: null,
    alistirma: "أَبْ إِبْ أُبْ",
    ek_tablolar: [],
  });
  const parsed = parseDersIcerik(raw);
  assert.deepEqual(parsed.kelimeler, ["أَبْ", "إِبْ", "أُبْ"]);
  assert.equal(parsed.kelimeler[0], "أَبْ");
  assert.ok(parsed.kelimeler.every((word) => word.includes("\u0652")));
});

test("parseDersIcerik: Türkçe açıklama metni kelimeye çevrilmez", () => {
  const raw = JSON.stringify({
    aciklama: "Harflerin okunmasını sağlayan işaretlere hareke denir.",
    alistirma: "Bu bir Türkçe alıştırma satırıdır.",
    ek_tablolar: [],
  });
  const parsed = parseDersIcerik(raw);
  assert.equal(
    parsed.aciklama,
    "Harflerin okunmasını sağlayan işaretlere hareke denir.",
  );
  assert.deepEqual(parsed.kelimeler, []);
});

test("parseDersIcerik: gerçek ve literal satır sonlarını aynı biçimde işler", () => {
  const realNewline = parseDersIcerik(JSON.stringify({
    aciklama: "Birinci\nİkinci",
    alistirma: "قُلْ\nلَمْ",
    ek_tablolar: [],
  }));
  assert.equal(realNewline.aciklama, "Birinci\nİkinci");
  assert.deepEqual(realNewline.kelimeler, ["قُلْ", "لَمْ"]);

  const literalNewline = parseDersIcerik(JSON.stringify({
    aciklama: "Birinci\\nİkinci",
    alistirma: "قُلْ\\nلَمْ",
    ek_tablolar: [],
  }));
  assert.equal(literalNewline.aciklama, "Birinci\nİkinci");
  assert.deepEqual(literalNewline.kelimeler, ["قُلْ", "لَمْ"]);
});

test("parseDersIcerik: tüm geçerli kelimeleri döndürür, gösterim sınırını uygulamaz", () => {
  const tokens = "ابتثجحخدذرزسش".split("").map((letter) => `${letter}َ`);
  const raw = JSON.stringify({
    aciklama: null,
    alistirma: tokens.join(" "),
    ek_tablolar: [],
  });
  const parsed = parseDersIcerik(raw);
  assert.equal(tokens.length, 13);
  assert.deepEqual(parsed.kelimeler, tokens);
  assert.ok(parsed.kelimeler.length > MAX_LESSON_TERMS);
});
