import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCAL_DB_PATH,
  TAJWEED_RULE_COLORS,
  SOURCE_MANIFEST_PATH,
  SOURCE_PATH,
  buildBasmalaRanges,
  buildRuntimeData,
  codePoints,
  readCanonicalSource,
  readTajweedSpanOverrides,
  sourceRowsToBytes,
} from "./build-quran-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = path.join(ROOT, "data", "generated", "quran");
const EXPECTED_SHA = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(GENERATED, name), "utf8"));

// Bu paketin işi kanonik metni DEĞİŞMEZ Tanzil vendor dosyasına karşı doğrulamak;
// 24 testin 23'ü o dosyayı okur. Vendor anlık görüntüsü `/data/` altında yaşar,
// gitignore'lıdır ve her çalışma kopyasında bulunmaz (bkz.
// docs/mushaf-tecvid-handoff.md — AÇIK RİSK). Yokken bu testler ATLANIR;
// dosya geri konduğu anda kendiliğinden devreye girerler. Vendor'dan bağımsız
// olan tek test (builder'ın yazma yolu olmadığı) her durumda koşar.
const VENDOR_FILES = [
  path.join(ROOT, "data", "vendor", "tanzil", "uthmani-1.1", "manifest.json"),
  path.join(ROOT, "data", "vendor", "tanzil", "uthmani-1.1", "quran-uthmani.txt"),
];
const missingVendorFiles = VENDOR_FILES.filter((file) => !fs.existsSync(file));
const vendorGate = missingVendorFiles.length > 0
  ? { skip: `Tanzil vendor anlık görüntüsü yok (${missingVendorFiles.map((f) => path.relative(ROOT, f).replaceAll("\\", "/")).join(", ")}) — kanonik metin doğrulamaları atlandı` }
  : {};

function dbVerses() {
  const db = new DatabaseSync(LOCAL_DB_PATH, { readOnly: true });
  try {
    return db.prepare("SELECT verse_key, surah_id, ayah_number, arabic_text FROM verses ORDER BY surah_id, ayah_number").all().map((row) => ({
      verseKey: String(row.verse_key),
      surahId: Number(row.surah_id),
      ayahNumber: Number(row.ayah_number),
      arabicText: String(row.arabic_text),
    }));
  } finally { db.close(); }
}

function inventory(verses, predicate) {
  const counts = new Map();
  for (const verse of verses) for (const char of codePoints(verse.arabicText)) {
    const cp = char.codePointAt(0);
    if (predicate(cp)) counts.set(cp, (counts.get(cp) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((a, b) => a[0] - b[0]));
}

test("immutable Tanzil vendor file keeps the declared full-file SHA-256", vendorGate, () => {
  const manifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, "utf8"));
  const bytes = fs.readFileSync(SOURCE_PATH);
  assert.equal(manifest.version, "1.1");
  assert.equal(manifest.license, "CC BY 3.0");
  assert.match(manifest.terms, /verbatim and unmodified/);
  assert.equal(sha256(bytes), EXPECTED_SHA);
});

test("all 6,236 generated ayahs reconstruct the immutable source bytes", vendorGate, () => {
  const source = readCanonicalSource();
  const generated = readJson("verses.json");
  assert.equal(generated.length, 6236);
  assert.equal(source.verses.length, 6236);
  let byteMismatch = 0;
  let codePointMismatch = 0;
  for (let index = 0; index < source.verses.length; index += 1) {
    const expected = source.verses[index];
    const actual = generated[index];
    if (Buffer.compare(Buffer.from(actual.arabicText, "utf8"), Buffer.from(expected.arabicText, "utf8")) !== 0) byteMismatch += 1;
    if (codePoints(actual.arabicText).join("|") !== codePoints(expected.arabicText).join("|")) codePointMismatch += 1;
  }
  assert.equal(byteMismatch, 0);
  assert.equal(codePointMismatch, 0);
  assert.equal(sha256(sourceRowsToBytes(generated, source.sourceSuffix)), EXPECTED_SHA);
});

test("local DB arabic_text is byte/code-point identical in all 6,236 ayahs", vendorGate, () => {
  const source = readCanonicalSource();
  const rows = dbVerses();
  assert.equal(rows.length, 6236);
  for (let index = 0; index < rows.length; index += 1) {
    assert.equal(rows[index].verseKey, source.verses[index].verseKey);
    assert.deepEqual(Buffer.from(rows[index].arabicText, "utf8"), Buffer.from(source.verses[index].arabicText, "utf8"));
    assert.deepEqual(codePoints(rows[index].arabicText), codePoints(source.verses[index].arabicText));
  }
  assert.equal(sha256(sourceRowsToBytes(rows, source.sourceSuffix)), EXPECTED_SHA);
});

test("basmala metadata is source-derived and every split reconstructs its ayah", vendorGate, () => {
  const { verses } = readCanonicalSource();
  const ranges = buildBasmalaRanges(verses);
  const byKey = new Map(verses.map((verse) => [verse.verseKey, verse.arabicText]));
  assert.equal(ranges.length, 113);
  assert.equal(ranges.filter((range) => range.kind === "prefix").length, 112);
  for (const range of ranges) {
    const text = byKey.get(range.verseKey);
    const chars = codePoints(text);
    const head = chars.slice(range.startCp, range.endCp).join("");
    const separator = chars.slice(range.endCp, range.bodyStartCp).join("");
    const body = chars.slice(range.bodyStartCp).join("");
    assert.equal(`${head}${separator}${body}`, text);
    if (range.kind === "prefix") assert.equal(separator, " ");
  }
  const verse95 = byKey.get("95:1");
  const range95 = ranges.find((range) => range.verseKey === "95:1");
  assert.equal(codePoints(verse95).slice(0, range95.endCp).join(""), "بِّسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ");
});

test("raw combining sequences and Quran mark inventories are unchanged", vendorGate, () => {
  const source = readCanonicalSource().verses;
  const generated = readJson("verses.json");
  const db = dbVerses();
  const watched = (cp) => cp === 0x0622 || cp === 0x0652 || cp === 0x0653 || cp === 0x0651 || cp === 0x0670 || (cp >= 0x06d6 && cp <= 0x06ed);
  assert.deepEqual(inventory(generated, watched), inventory(source, watched));
  assert.deepEqual(inventory(db, watched), inventory(source, watched));
  const byKey = new Map(source.map((verse) => [verse.verseKey, verse.arabicText]));
  assert.ok(byKey.get("2:4").includes("بِمَا\u0653"));
  assert.ok(!byKey.get("2:4").includes("بِمَ\u0622"));
  assert.ok(byKey.get("2:6").includes("سَوَا\u0653ءٌ"));
  assert.ok(byKey.get("2:8").includes("ٱلْـَٔاخِرِ"));
  assert.ok(byKey.get("2:9").includes("إِلَّا\u0653"));
  assert.ok(byKey.get("2:12").includes("أَلَا\u0653"));
  assert.ok(byKey.get("2:13").includes("كَمَا\u0653"));
  assert.ok(byKey.get("2:14").includes("ءَامَنَّا"));
});

test("generated tajweed spans are in bounds and cannot mutate canonical text", vendorGate, () => {
  const verses = readJson("verses.json");
  const byKey = new Map(verses.map((verse) => [verse.verseKey, verse.arabicText]));
  const generated = readJson("tajweed-spans.json");
  assert.equal(generated.coordinateSystem, "unicode-code-point-half-open");
  assert.equal(generated.verses.length, 6236);
  for (const item of generated.verses) {
    const text = byKey.get(item.verseKey);
    const length = codePoints(text).length;
    let previousEnd = 0;
    for (const span of item.spans) {
      assert.ok(span.startCp >= previousEnd);
      assert.ok(span.endCp > span.startCp && span.endCp <= length);
      previousEnd = span.endCp;
    }
    assert.equal(byKey.get(item.verseKey), text);
  }
});

test("tajweed alignment failures are explicit uncolored ranges and never receive a color span", vendorGate, () => {
  const verses = readJson("verses.json");
  const byKey = new Map(verses.map((verse) => [verse.verseKey, verse.arabicText]));
  const spansByKey = new Map(readJson("tajweed-spans.json").verses.map((verse) => [verse.verseKey, verse.spans]));
  const coverage = readJson("tajweed-coverage.json");

  assert.deepEqual(coverage.summary.statusCounts, {
    mapped: 6146,
    "mapped-with-overrides": 14,
    "token-count-mismatch": 2,
    "no-rule-clusters": 63,
    "unmapped-rule-clusters": 11,
  });
  assert.equal(Object.values(coverage.summary.statusCounts).reduce((sum, count) => sum + count, 0), 6236);
  assert.equal(coverage.totals.unmatchedTokens, 3106);
  assert.equal(coverage.totals.ambiguousClusters, 720);
  assert.equal(coverage.summary.unmatchedTokenVerses, 2257);
  assert.equal(coverage.summary.ambiguousClusterVerses, 625);
  assert.equal(coverage.summary.affectedVerses, 2612);
  assert.equal(coverage.summary.coverage.percent, 91.6254);
  assert.equal(coverage.totals.overrideSpans, 23);
  assert.equal(coverage.totals.overrideRuleClusters, 24);
  assert.equal(coverage.summary.coverage.verseSpanCoveragePercent, 98.7813);
  assert.equal(coverage.summary.coverage.tokenAlignmentPercent, 95.9991);

  // Tanzil sometimes spells a hamza with the decomposed Uthmani convention
  // (tatweel-carried hamza mark + bare seat letter, e.g. ٱلْـَٔاخَرِينَ) where
  // AlQuran.cloud's source always uses the single precomposed hamza letter
  // (ٱلْأَخَرِينَ). Confirms the equivalence recovers a known instance.
  const akhirinItem = coverage.verses.find((item) => item.verseKey === "26:64");
  assert.equal(akhirinItem.status, "mapped");

  // The only two ayahs where AlQuran.cloud's tajweed source genuinely
  // segments a word differently from Tanzil's canonical text ("بَعْدَ مَا"
  // vs the source's joined "بَعْدَمَا"), left uncolored rather than guessed.
  const mismatchKeys = coverage.verses
    .filter((item) => item.status === "token-count-mismatch")
    .map((item) => item.verseKey)
    .sort();
  assert.deepEqual(mismatchKeys, ["13:37", "2:181"]);

  // Every surah-opening ayah with a basmala prefix must report it as an
  // explicit, always-uncolored range (AlQuran.cloud's per-ayah tajweed
  // source never includes the basmala), never as a silently-colored guess.
  const basmalaRanges = readJson("basmala-ranges.json").ranges.filter((range) => range.kind === "prefix");
  assert.equal(basmalaRanges.length, 112);
  const coverageByKey = new Map(coverage.verses.map((item) => [item.verseKey, item]));
  for (const range of basmalaRanges) {
    const item = coverageByKey.get(range.verseKey);
    assert.ok(item.uncoloredRanges.some((uncolored) =>
      uncolored.reason === "basmala-prefix-not-in-tajweed-source" &&
      uncolored.startCp === 0 &&
      uncolored.endCp === range.bodyStartCp,
    ), `${range.verseKey}: missing basmala-prefix uncolored range`);
  }

  for (const item of coverage.verses) {
    const length = codePoints(byKey.get(item.verseKey)).length;
    const spans = spansByKey.get(item.verseKey);
    assert.ok(Array.isArray(spans));
    for (const range of item.uncoloredRanges) {
      assert.ok(range.startCp >= 0 && range.endCp > range.startCp && range.endCp <= length);
      for (const span of spans) {
        const overlaps = span.startCp < range.endCp && range.startCp < span.endCp;
        assert.equal(overlaps, false, `${item.verseKey}: colored span overlaps ${range.reason} range`);
      }
    }
    if (item.status === "token-count-mismatch") {
      assert.equal(spans.length, 0);
      assert.deepEqual(item.uncoloredRanges, [{ startCp: 0, endCp: length, reason: "token-count-mismatch" }]);
    }
    if (item.status === "no-rule-clusters" || item.status === "unmapped-rule-clusters") assert.equal(spans.length, 0);
    if (item.unmatchedTokens > 0) {
      assert.ok(item.uncoloredRanges.some((range) => range.reason === "unmatched-token" || range.reason === "token-count-mismatch"));
    }
    assert.equal(
      item.uncoloredRanges.filter((range) => range.reason === "ambiguous-cluster").length,
      item.ambiguousClusters,
    );
  }
});

test("builder has no production write path and source is never a write target", () => {
  const script = fs.readFileSync(path.join(ROOT, "scripts", "build-quran-runtime.mjs"), "utf8");
  assert.match(script, /local-only/);
  assert.doesNotMatch(script, /writeFileSync\(SOURCE_PATH|copyFileSync\([^\n]*SOURCE_PATH/);
  assert.doesNotMatch(script, /UPDATE\s+verses\s+SET\s+arabic_tajweed/i);
  assert.doesNotMatch(script, /\.normalize\s*\(/);
});

test("fresh runtime build is deterministic", vendorGate, () => {
  const runtime = buildRuntimeData();
  assert.equal(runtime.source.sourceSha256, EXPECTED_SHA);
  assert.equal(runtime.source.verses.length, 6236);
  assert.equal(runtime.basmalaRanges.length, 113);
});

const VERIFIED_OVERRIDE_EXPECTATIONS = {
  "5:3": [[552, 555, "u"], [559, 561, "f"]],
  "7:46": [[67, 71, "i"]],
  "10:15": [[191, 193, "f"]],
  "18:63": [[89, 91, "n"]],
  "24:11": [[123, 124, "h"], [128, 130, "a"]],
  "28:30": [[32, 34, "f"], [34, 36, "n"]],
  "35:43": [[37, 38, "h"], [38, 39, "l"]],
  "42:51": [[71, 73, "a"]],
  "43:58": [[14, 18, "n"]],
  "52:21": [[157, 158, "h"], [162, 165, "i"]],
  "56:23": [[13, 14, "h"], [14, 15, "l"]],
  "70:38": [[17, 18, "h"], [22, 24, "a"]],
  "74:52": [[19, 20, "h"], [24, 26, "a"]],
  "80:37": [[8, 9, "h"], [13, 15, "a"]],
};

for (const [verseKey, expected] of Object.entries(VERIFIED_OVERRIDE_EXPECTATIONS)) {
  test(`verified Tajweed override preserves the exact canonical span for ${verseKey}`, vendorGate, () => {
    const source = readCanonicalSource();
    const text = source.verses.find((verse) => verse.verseKey === verseKey).arabicText;
    const generated = readJson("tajweed-spans.json").verses.find((verse) => verse.verseKey === verseKey).spans;
    const coverage = readJson("tajweed-coverage.json").verses.find((verse) => verse.verseKey === verseKey);
    const overrideFile = readTajweedSpanOverrides();
    const overrideSpans = overrideFile.byVerse.get(verseKey);
    assert.equal(coverage.status, "mapped-with-overrides");
    assert.equal(coverage.baseStatus, "mapped");
    assert.equal(coverage.overrideSpanCount, expected.length);
    assert.equal(overrideSpans.length, expected.length);
    assert.deepEqual(overrideSpans.map((span) => [span.startCp, span.endCp, span.rule]), expected);
    for (const [startCp, endCp, rule] of expected) {
      const override = overrideSpans.find((span) => span.startCp === startCp && span.endCp === endCp && span.rule === rule);
      assert.equal(codePoints(text).slice(startCp, endCp).join(""), override.targetText);
      assert.equal(override.color, TAJWEED_RULE_COLORS[rule]);
      assert.ok(generated.some((span) => span.startCp === startCp && span.endCp === endCp && span.rule === rule && span.color === override.color));
      assert.ok(!coverage.uncoloredRanges.some((range) => startCp < range.endCp && range.startCp < endCp));
    }
  });
}

test("verified Tajweed overrides are deterministic and leave every non-target verse unchanged", vendorGate, () => {
  const base = buildRuntimeData({ applyOverrides: false });
  const final = buildRuntimeData();
  const expectedKeys = new Set(Object.keys(VERIFIED_OVERRIDE_EXPECTATIONS));
  assert.equal(final.source.sourceSha256, base.source.sourceSha256);
  assert.deepEqual(final.source.verses, base.source.verses);
  assert.equal(final.totals.overrideSpans, 23);
  assert.equal(final.totals.overrideRuleClusters, 24);
  for (let index = 0; index < final.tajweedVerses.length; index += 1) {
    const before = base.tajweedVerses[index];
    const after = final.tajweedVerses[index];
    assert.equal(after.verseKey, before.verseKey);
    if (!expectedKeys.has(after.verseKey)) assert.deepEqual(after.spans, before.spans, `${after.verseKey}: unexpected span change`);
  }
  for (const [verseKey, expected] of Object.entries(VERIFIED_OVERRIDE_EXPECTATIONS)) {
    const before = base.tajweedVerses.find((verse) => verse.verseKey === verseKey).spans;
    const after = final.tajweedVerses.find((verse) => verse.verseKey === verseKey).spans;
    const additions = after.filter((span) => !before.some((baseSpan) => baseSpan.startCp === span.startCp && baseSpan.endCp === span.endCp && baseSpan.rule === span.rule && baseSpan.color === span.color));
    assert.deepEqual(additions.map((span) => [span.startCp, span.endCp, span.rule]), expected);
  }
});