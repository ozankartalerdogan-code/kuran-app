import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { MushafPageResponse } from "./api.ts";
import { prepareCanonicalVerseForRender } from "./mushafCanonical.ts";
import { codePointSpansToUtf16Ranges, groupCanonicalTextByWord } from "./tajweed.ts";

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const canonical = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ الٓمٓ";
const basmala = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const endCp = Array.from(basmala).length;
const verse: MushafPageResponse["verses"][number] = {
  surahId: 2,
  ayahNumber: 1,
  arabic: canonical,
  tajweedSpans: [{ startCp: endCp + 1, endCp: endCp + 2, rule: "m", color: "#b91c1c" }],
  basmalaRange: { kind: "prefix", startCp: 0, endCp, bodyStartCp: endCp + 1 },
};

test("generated basmala offsets split and reconstruct the exact canonical string", () => {
  const prepared = prepareCanonicalVerseForRender(verse);
  assert.equal(prepared.basmalaText, basmala);
  assert.equal(prepared.basmalaSeparator, " ");
  assert.equal(`${prepared.basmalaText}${prepared.basmalaSeparator}${prepared.verse.renderArabic}`, canonical);
  assert.equal(prepared.verse.renderArabic, "الٓمٓ");
});

test("tajweed toggle changes ranges only; runtime text SHA-256 is identical", () => {
  const prepared = prepareCanonicalVerseForRender(verse).verse;
  const render = (tajweed: boolean) => ({
    text: prepared.renderArabic,
    ranges: tajweed ? codePointSpansToUtf16Ranges(prepared.renderArabic, prepared.renderTajweedSpans) : [],
  });
  const off = render(false);
  const on = render(true);
  assert.equal(off.text, on.text);
  assert.equal(sha256(off.text), sha256(on.text));
  assert.equal(off.ranges.length, 0);
  assert.ok(on.ranges.length > 0);
});

test("v5 verse (server-split body + canonicalArabic) renders body once and verifies reconstruction", () => {
  const v5: MushafPageResponse["verses"][number] = {
    surahId: 2,
    ayahNumber: 1,
    arabic: "الٓمٓ", // sunucu gövdeyi zaten ayırdı
    tajweed: "[legacy markup]",
    tajweedSpans: [{ startCp: 0, endCp: 1, rule: "m", color: "#b91c1c" }], // gövde koordinatlı
    canonicalArabic: canonical,
    canonicalTajweedSpans: [{ startCp: endCp + 1, endCp: endCp + 2, rule: "m", color: "#b91c1c" }],
    basmalaRange: { kind: "prefix", startCp: 0, endCp, bodyStartCp: endCp + 1 },
    basmalaText: basmala,
  };
  const prepared = prepareCanonicalVerseForRender(v5);
  assert.equal(prepared.verse.renderArabic, "الٓمٓ");
  assert.equal(prepared.basmalaText, basmala);
  assert.equal(`${prepared.basmalaText}${prepared.basmalaSeparator}${prepared.verse.renderArabic}`, canonical);
  // Gövde span'ları sunucudan geldiği gibi kullanılır (yeniden bölme yok).
  assert.deepEqual(prepared.verse.renderTajweedSpans, [{ startCp: 0, endCp: 1, rule: "m", color: "#b91c1c" }]);
});

test("v5 verse without prefix (9:1 shape) must match canonical exactly; tampered body throws", () => {
  const v5: MushafPageResponse["verses"][number] = {
    surahId: 9,
    ayahNumber: 1,
    arabic: "بَرَآءَةٌ",
    tajweedSpans: [],
    canonicalArabic: "بَرَآءَةٌ",
    canonicalTajweedSpans: [],
    basmalaRange: null,
  };
  assert.equal(prepareCanonicalVerseForRender(v5).verse.renderArabic, "بَرَآءَةٌ");
  assert.throws(
    () => prepareCanonicalVerseForRender({ ...v5, arabic: "بَرَآءَةٌ_bozuk" }),
    /Canonical\/body mismatch/,
  );
});

test("v5 split integrity: body that does not reconstruct canonical throws (Kuran metni asla sessizce bozulmaz)", () => {
  const v5: MushafPageResponse["verses"][number] = {
    surahId: 2,
    ayahNumber: 1,
    arabic: "الٓمٓ EKSTRA",
    tajweedSpans: [],
    canonicalArabic: canonical,
    canonicalTajweedSpans: [],
    basmalaRange: { kind: "prefix", startCp: 0, endCp, bodyStartCp: endCp + 1 },
    basmalaText: basmala,
  };
  assert.throws(() => prepareCanonicalVerseForRender(v5), /split changed/);
});

test("old-schema API verse (no tajweedSpans/basmalaRange fields) degrades to uncolored, never crashes", () => {
  // Prod henüz eski /api/mushaf şemasını dönebilir: bu alanlar hiç yok.
  const eski = {
    surahId: 96,
    ayahNumber: 1,
    arabic: canonical,
  } as unknown as MushafPageResponse["verses"][number];
  const prepared = prepareCanonicalVerseForRender(eski);
  assert.equal(prepared.verse.renderArabic, canonical);
  assert.deepEqual(prepared.verse.renderTajweedSpans, []);
  assert.deepEqual(prepared.basmalaSpans, []);
  // Çökme senaryosunun kendisi: undefined span listesi render yolunda iterate ediliyordu.
  const ranges = codePointSpansToUtf16Ranges(prepared.verse.renderArabic, prepared.verse.renderTajweedSpans);
  assert.deepEqual(ranges, []);
});

test("code-point spans convert to UTF-16 without changing text", () => {
  const text = "A😀بِ";
  const before = Buffer.from(text, "utf8");
  const ranges = codePointSpansToUtf16Ranges(text, [{ startCp: 1, endCp: 3, rule: "q", color: "#2563eb" }]);
  assert.deepEqual(ranges, [{ start: 1, end: 4, color: "#2563eb" }]);
  assert.deepEqual(Buffer.from(text, "utf8"), before);
});

test("fallback word coloring joins to the exact canonical string", () => {
  const text = "بِمَآ أُنزِلَ";
  const words = groupCanonicalTextByWord(text, [{ startCp: 0, endCp: 2, rule: "n", color: "#e11d48" }]);
  assert.equal(words.map((word) => word.t).join(""), text);
});

test("native TextView reports SHA-256 readback and direct JS input equality", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const kotlin = readFileSync(path.resolve(here, "../../modules/tajweed-text/android/src/main/java/expo/modules/tajweedtext/TajweedTextModule.kt"), "utf8");
  assert.match(kotlin, /val readback = textView\.text\.toString\(\)/);
  assert.match(kotlin, /"matchesInput" to \(readback == arabicText\)/);
  assert.match(kotlin, /MessageDigest\.getInstance\("SHA-256"\)/);
});
