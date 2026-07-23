import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { TAJWEED_RULE_COLORS } from "../../../../scripts/build-quran-runtime.mjs";
import type { CanonicalRenderVerse } from "./mushafCanonical.ts";
import {
  mushafMetinBloguHazirla,
  seciliAyetVurguAraliklari,
  utf16IndeksindekiAyetiBul,
} from "./mushafTextBlock.ts";
import { RENK, type QuranCodePointSpan } from "./tajweed.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(HERE, "../..");
const NATIVE_VIEW_KT = path.join(
  MOBILE_ROOT,
  "modules/tajweed-text/android/src/main/java/expo/modules/tajweedtext/TajweedTextModule.kt",
);
const EXPECTED_UTHMANIC_HAFS_SHA256 = "a0636e68e375af9552470d67773936f54d536e6586ce2608311b2fe7f9cbec3a";

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function verse(
  ayahNumber: number,
  renderArabic: string,
  spans: QuranCodePointSpan[],
): CanonicalRenderVerse {
  return {
    surahId: 1,
    ayahNumber,
    arabic: renderArabic,
    tajweedSpans: spans,
    basmalaRange: null,
    renderArabic,
    renderTajweedSpans: spans,
  };
}

test("mobile and native UthmanicHafs fonts are byte-identical and keep the production SHA-256", () => {
  const mobileFont = readFileSync(path.join(MOBILE_ROOT, "assets/fonts/UthmanicHafs.ttf"));
  const nativeFont = readFileSync(path.join(
    MOBILE_ROOT,
    "modules/tajweed-text/android/src/main/assets/fonts/UthmanicHafs.ttf",
  ));

  assert.deepEqual(nativeFont, mobileFont);
  assert.equal(sha256(nativeFont), sha256(mobileFont));
  assert.equal(sha256(mobileFont), EXPECTED_UTHMANIC_HAFS_SHA256);
});

// Mushaf sayfası tek satıra düşüp orada kilitlenen regresyon, aşağıdaki üç
// native kuralın her biri tek başına ihlal edildiğinde geri geliyor. Kotlin'i
// burada çalıştıramadığımız için kaynak düzeyinde bekçilik ediyoruz; ayrıntılı
// gerekçe docs/TAJWEED_MUSHAF_RENDER_ARCHITECTURE.md "Ölçüm sözleşmesi".
test("native renderer keeps the three measurement-contract protections", () => {
  const kt = readFileSync(NATIVE_VIEW_KT, "utf8");

  assert.match(
    kt,
    /uiHandler\.post\s*\{/,
    "spannable apply main-looper Handler ile ertelenmeli",
  );
  assert.doesNotMatch(
    kt,
    /^\s*post\s*\{/m,
    "View.post kullanılamaz: view detached iken runnable hiç çalışmaz (removeClippedSubviews)",
  );

  assert.match(
    kt,
    /textView\.text\?\.length\s*\?:\s*0\)\s*!=\s*arabicText\.length/,
    "metin uygulanmadan ölçüm yapılmamalı (boş TextView tek satır ölçer)",
  );

  const applyBlock = kt.slice(
    kt.indexOf("private fun applySpannableIfChanged"),
    kt.indexOf("private fun parseColorOrNull"),
  );
  assert.ok(applyBlock.length > 0, "applySpannableIfChanged bulunamadı");
  assert.match(
    applyBlock,
    /textView\.requestLayout\(\)/,
    "setText sonrası taze ölçüm zorlanmalı (View.measure aksi halde kısa devre yapar)",
  );
  assert.match(
    applyBlock,
    /lastDispatchedHeight\s*=\s*-1/,
    "apply sonrası bildirim guard'ı sıfırlanmalı",
  );
});

test("builder and mobile tajweed color tables match for every rule", () => {
  assert.deepEqual(
    Object.keys(RENK).sort(),
    Object.keys(TAJWEED_RULE_COLORS).sort(),
    "tajweed rule sets diverged",
  );
  for (const rule of Object.keys(TAJWEED_RULE_COLORS)) {
    assert.equal(RENK[rule], TAJWEED_RULE_COLORS[rule], `color mismatch for rule ${rule}`);
  }
});

test("multi-ayah native block keeps badge, tajweed, highlight and touch UTF-16 boundaries aligned", () => {
  const accent = "#d4a017";
  const highlight = "#334455";
  const first = verse(1, "A😀ب\u06DF", [
    { startCp: 1, endCp: 3, rule: "q", color: "#111111" },
  ]);
  const second = verse(2, "ت \u06D6ج", [
    { startCp: 0, endCp: 2, rule: "n", color: "#222222" },
  ]);

  const on = mushafMetinBloguHazirla([first, second], true, accent);
  const firstBadge = " ﴿١﴾ ";
  const secondBadge = " ﴿٢﴾ ";
  const secondBase = first.renderArabic.length + firstBadge.length;

  assert.equal(secondBase, 10, "fixture must exercise a surrogate pair before the second base offset");
  assert.equal(on.text, `A😀ب\u0652${firstBadge}ت\u00A0\u06D6ج${secondBadge}`);
  assert.deepEqual(on.araliklar, [
    { surahId: 1, ayahNumber: 1, start: 0, end: secondBase },
    { surahId: 1, ayahNumber: 2, start: secondBase, end: on.text.length },
  ]);
  assert.deepEqual(on.ranges, [
    { start: 1, end: 4, color: "#111111" },
    { start: first.renderArabic.length, end: secondBase, color: accent },
    { start: secondBase, end: secondBase + 2, color: "#222222" },
    { start: secondBase + second.renderArabic.length, end: on.text.length, color: accent },
  ]);

  assert.deepEqual(
    seciliAyetVurguAraliklari(on.araliklar, { surahId: 1, ayahNumber: 2 }, highlight),
    [{ start: secondBase, end: on.text.length, color: highlight }],
  );
  assert.equal(utf16IndeksindekiAyetiBul(on.araliklar, secondBase - 1)?.ayahNumber, 1);
  assert.equal(utf16IndeksindekiAyetiBul(on.araliklar, secondBase)?.ayahNumber, 2);
  assert.equal(utf16IndeksindekiAyetiBul(on.araliklar, on.text.length - 1)?.ayahNumber, 2);
  assert.equal(utf16IndeksindekiAyetiBul(on.araliklar, on.text.length), undefined);

  const off = mushafMetinBloguHazirla([first, second], false, accent);
  assert.equal(off.text, on.text, "tajweed toggle changed the rendered string");
  assert.deepEqual(off.araliklar, on.araliklar);
  assert.deepEqual(off.ranges, [
    { start: first.renderArabic.length, end: secondBase, color: accent },
    { start: secondBase + second.renderArabic.length, end: on.text.length, color: accent },
  ]);
});
