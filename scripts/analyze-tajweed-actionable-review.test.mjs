import assert from "node:assert/strict";
import test from "node:test";

import { classifyUnmatchedToken } from "./analyze-tajweed-actionable-review.mjs";

function token(text, rules = []) {
  const items = Array.from(text).map((char, cpIndex) => ({ char, cpIndex, rule: rules[cpIndex] ?? null }));
  return { items, startCp: 0, endCp: items.length };
}

const verse = { verseKey: "1:1", surahId: 1, ayahNumber: 1, arabicText: "éۖ" };

test("unmatched classification separates Unicode, annotation, no-rule and real-rule failures", () => {
  const unicode = classifyUnmatchedToken({
    verse,
    canonicalToken: token("é"),
    sourceToken: token("é", ["n", "n"]),
    finalSpans: [],
  });
  assert.equal(unicode.subreason, "unicode-equivalent-only");
  assert.equal(unicode.occurrence.recommendation, "script geliştirilebilir");

  const daggerSeat = classifyUnmatchedToken({
    verse, canonicalToken: token("ىٰ"), sourceToken: token("ـٰ", ["n", "n"]), finalSpans: [],
  });
  assert.equal(daggerSeat.subreason, "unicode-equivalent-only");

  const tanwinAlif = classifyUnmatchedToken({
    verse, canonicalToken: token("لًا"), sourceToken: token("لاً", ["n", "n", "n"]), finalSpans: [],
  });
  assert.equal(tanwinAlif.subreason, "unicode-equivalent-only");

  const shaddaTanwinAlif = classifyUnmatchedToken({
    verse, canonicalToken: token("\u0644\u0651\u064b\u0627"), sourceToken: token("\u0644\u0627\u064b\u0651", ["n", "n", "n", "n"]), finalSpans: [],
  });
  assert.equal(shaddaTanwinAlif.subreason, "unicode-equivalent-only");

  const annotation = classifyUnmatchedToken({
    verse,
    canonicalToken: token("اۖ"),
    sourceToken: token("ا", ["n"]),
    finalSpans: [],
  });
  assert.equal(annotation.subreason, "waqf-annotation-token-difference");

  const noRule = classifyUnmatchedToken({
    verse,
    canonicalToken: token("ص"),
    sourceToken: token("س"),
    finalSpans: [],
  });
  assert.equal(noRule.subreason, "no-rule-cluster");
  assert.equal(noRule.actionable, false);

  const realRule = classifyUnmatchedToken({
    verse,
    canonicalToken: token("ص"),
    sourceToken: token("س", ["n"]),
    finalSpans: [],
  });
  assert.equal(realRule.subreason, "unmapped-rule-cluster");
  assert.equal(realRule.occurrence.recommendation, "incele");
});
