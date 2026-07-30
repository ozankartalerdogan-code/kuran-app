import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  OUTPUT_PATHS,
  buildManualReview,
  classificationForDiagnosticReason,
  compareRuleRanges,
  findUnicodeWritingDifferences,
  unknownRuleRecords,
} from "./audit-tajweed-source-diff.mjs";

test("range comparison covers exact and four difference classes", () => {
  const verse = { verseKey: "1:1", surahId: 1, ayahNumber: 1, arabicText: "abcde" };
  const records = compareRuleRanges({
    verse,
    currentSpans: [
      { startCp: 0, endCp: 1, rule: "n" },
      { startCp: 1, endCp: 2, rule: "q" },
      { startCp: 3, endCp: 5, rule: "n" },
    ],
    oldSpans: [
      { startCp: 0, endCp: 1, rule: "n" },
      { startCp: 2, endCp: 3, rule: "g" },
      { startCp: 3, endCp: 4, rule: "g" },
      { startCp: 4, endCp: 5, rule: "n" },
    ],
    unicodeDifferences: [{ startCp: 4, endCp: 5, sourceFragment: "E", explanation: "fixture" }],
  });
  assert.deepEqual(records.map((item) => item.classification), [1, 2, 3, 4, 5]);
  assert.deepEqual(records.map((item) => [item.startCp, item.endCp]), [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]);
});

test("diagnostics map to alignment, ambiguity and basmala classes", () => {
  assert.equal(classificationForDiagnosticReason("unmatched-token"), 6);
  assert.equal(classificationForDiagnosticReason("token-count-mismatch"), 6);
  assert.equal(classificationForDiagnosticReason("ambiguous-cluster"), 7);
  assert.equal(classificationForDiagnosticReason("missing-source"), 7);
  assert.equal(classificationForDiagnosticReason("basmala-prefix-not-in-tajweed-source"), 8);
});

test("unknown old-source rule is explicit and has no guessed canonical range", () => {
  const [record] = unknownRuleRecords(
    { verseKey: "1:1", surahId: 1, ayahNumber: 1 },
    "[z[ا][n[ب]",
  );
  assert.deepEqual({ rule: record.oldRule, class: record.classification, startCp: record.startCp }, { rule: "z", class: 7, startCp: null });
});

test("Unicode audit accepts only fully aligned known equivalences", () => {
  const simple = findUnicodeWritingDifferences(`ا\u06df`, `ا\u0652`);
  assert.deepEqual(simple.map(({ startCp, endCp, sourceFragment }) => ({ startCp, endCp, sourceFragment })),
    [{ startCp: 0, endCp: 2, sourceFragment: "ا\u0652" }]);
  const hamza = findUnicodeWritingDifferences(`\u0640\u0654ا`, "أ");
  assert.deepEqual(hamza.map(({ startCp, endCp, sourceFragment }) => ({ startCp, endCp, sourceFragment })),
    [{ startCp: 0, endCp: 3, sourceFragment: "أ" }]);
  assert.deepEqual(findUnicodeWritingDifferences("اب", "ات"), []);
});

test("manual review includes only decision-bearing classes", () => {
  const records = [1, 2, 3, 4, 5, 6, 7, 8].map((classification) => ({
    verseKey: `${classification}:1`, surahId: classification, ayahNumber: 1,
    classification, explanation: `class ${classification}`, canonicalFragment: "x",
  }));
  assert.deepEqual(buildManualReview(records).map((item) => item.surahId), [2, 3, 4, 6, 7]);
});

test("audit database access and output paths are read/write isolated", () => {
  const source = fs.readFileSync(new URL("./audit-tajweed-source-diff.mjs", import.meta.url), "utf8");
  assert.match(source, /new DatabaseSync\(LOCAL_DB_PATH, \{ readOnly: true \}\)/);
  const statements = [...source.matchAll(/db\.prepare\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^SELECT /);
  assert.doesNotMatch(source, /\b(?:writeGeneratedRuntime|applyLocalDatabase)\b/);
  for (const target of Object.values(OUTPUT_PATHS)) {
    assert.match(target, /scripts[\\/]output[\\/]tajweed-source-diff/);
    assert.doesNotMatch(target, /data[\\/]generated|apps[\\/]/);
  }
});
