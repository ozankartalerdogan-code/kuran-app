import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCAL_DB_PATH,
  SOURCE_MANIFEST_PATH,
  SOURCE_PATH,
  buildBasmalaRanges,
  buildRuntimeData,
  codePoints,
  readCanonicalSource,
  sourceRowsToBytes,
} from "./build-quran-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = path.join(ROOT, "data", "generated", "quran");
const EXPECTED_SHA = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(GENERATED, name), "utf8"));

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

test("immutable Tanzil vendor file keeps the declared full-file SHA-256", () => {
  const manifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, "utf8"));
  const bytes = fs.readFileSync(SOURCE_PATH);
  assert.equal(manifest.version, "1.1");
  assert.equal(manifest.license, "CC BY 3.0");
  assert.match(manifest.terms, /verbatim and unmodified/);
  assert.equal(sha256(bytes), EXPECTED_SHA);
});

test("all 6,236 generated ayahs reconstruct the immutable source bytes", () => {
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

test("local DB arabic_text is byte/code-point identical in all 6,236 ayahs", () => {
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

test("basmala metadata is source-derived and every split reconstructs its ayah", () => {
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

test("raw combining sequences and Quran mark inventories are unchanged", () => {
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

test("generated tajweed spans are in bounds and cannot mutate canonical text", () => {
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

test("tajweed alignment failures are explicit uncolored ranges and never receive a color span", () => {
  const verses = readJson("verses.json");
  const byKey = new Map(verses.map((verse) => [verse.verseKey, verse.arabicText]));
  const spansByKey = new Map(readJson("tajweed-spans.json").verses.map((verse) => [verse.verseKey, verse.spans]));
  const coverage = readJson("tajweed-coverage.json");

  assert.deepEqual(coverage.summary.statusCounts, {
    mapped: 6160,
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
  assert.equal(coverage.summary.coverage.percent, 91.5977);
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

test("fresh runtime build is deterministic", () => {
  const runtime = buildRuntimeData();
  assert.equal(runtime.source.sourceSha256, EXPECTED_SHA);
  assert.equal(runtime.source.verses.length, 6236);
  assert.equal(runtime.basmalaRanges.length, 113);
});
