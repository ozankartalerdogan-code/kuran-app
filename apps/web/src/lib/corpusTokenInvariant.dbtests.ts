/**
 * corpusTokenInvariant.dbtests.ts — pins the relationship between the frozen
 * Tanzil token map and the number of analysis rows in `words`.
 *
 * Run via the corpusTokenInvariant.test.ts gate; skipped when data/ inputs are
 * absent (CI checkout has neither app.db nor the frozen token map).
 *
 * WHY THIS FILE EXISTS
 *
 * The frozen token map counts 77,429 `arabic_word` spans. The database holds
 * 77,433 analysis rows. That four-row gap is NOT drift — it is a known bug in
 * the token map builder, and the database is on the correct side of it.
 *
 * `scripts/morphology/camel-poc/build-token-map.py` excludes the opening basmala
 * of every sura's first ayah:
 *
 *     opening_start = 0 if verse.ayah == 1 and verse.surah != 9 and 0 in windows
 *
 * For suras 2..114 that is right — there the basmala is a PREFIX to ayah 1. In
 * al-Fatiha the basmala IS ayah 1:1, a counted verse in the Hafs numbering, so
 * the rule swallows the entire verse. The builder even labels the case
 * (`basmala_classification: "opening_fatiha"`) without changing the behaviour.
 *
 * Everything else in the project already treats 1:1 as a counted ayah:
 * `quran_verse_metadata.basmala_kind` is 'ayah' for 1:1 and 'prefix' for 2:1,
 * `data/generated/quran/basmala-ranges.json` agrees, and `words` carries four
 * fully curated rows for 1:1 and none for the 112 prefix basmalas.
 *
 * So the official corpus invariant is:
 *
 *     expected_rows = token_map(arabic_word spans)   // 77,429
 *                   + fatiha 1:1 basmala words       // +4
 *                   = 77,433
 *
 * DO NOT "fix" this by changing the number. Fixing it properly means changing
 * the builder rule, regenerating the map, and re-freezing the v1.7/v1.8 chain
 * (`scripts/morphology/resources/frozen-*-manifest.json` pin the map's sha256
 * and `analysis_words: 77429`). That is a separate, deliberately deferred
 * project. Until it happens, this test is what keeps the two numbers honest.
 */

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TOKEN_MAP = path.join(
  REPO, "data/candidates/morphology/hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl");

const ARABIC_WORD_SPANS = 77_429;
const FATIHA_BASMALA_WORDS = 4;
const EXPECTED_ROWS = ARABIC_WORD_SPANS + FATIHA_BASMALA_WORDS; // 77,433
const EXCLUDED_BASMALA_SPANS = 452;                             // 113 openings x 4

interface Span {
  verse_key: string;
  word_index: number | null;
  tokenization_rule: string;
  basmala_classification: string;
}

const spans: Span[] = fs.readFileSync(TOKEN_MAP, "utf8")
  .split("\n").filter(Boolean).map((line) => JSON.parse(line) as Span);

const db = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
process.on("exit", () => { try { db.close(); } catch { /* already closed */ } });

// ---------------------------------------------------------------------------
// the token map side
// ---------------------------------------------------------------------------

test("token map holds exactly 77,429 arabic_word spans", () => {
  const n = spans.filter((s) => s.tokenization_rule === "arabic_word").length;
  assert.equal(n, ARABIC_WORD_SPANS);
});

test("token map excludes 452 opening-basmala words, 4 of them al-Fatiha's", () => {
  const excluded = spans.filter((s) => s.tokenization_rule === "opening_basmala_excluded");
  assert.equal(excluded.length, EXCLUDED_BASMALA_SPANS);
  const fatiha = excluded.filter((s) => s.basmala_classification === "opening_fatiha");
  assert.equal(fatiha.length, FATIHA_BASMALA_WORDS);
  assert.deepEqual([...new Set(fatiha.map((s) => s.verse_key))], ["1:1"]);
});

test("1:1 is the only verse whose exclusion swallows the entire verse", () => {
  const spansByVerse = new Map<string, Span[]>();
  for (const span of spans) {
    const list = spansByVerse.get(span.verse_key) ?? [];
    list.push(span);
    spansByVerse.set(span.verse_key, list);
  }
  const swallowed = [...spansByVerse.entries()]
    .filter(([, list]) => list.every((s) => s.tokenization_rule === "opening_basmala_excluded"))
    .map(([verseKey]) => verseKey);
  assert.deepEqual(swallowed, ["1:1"],
    "if this grows, the builder rule changed and the invariant below is stale");
});

// ---------------------------------------------------------------------------
// the runtime side already disagrees with the map, and is right
// ---------------------------------------------------------------------------

test("quran_verse_metadata treats 1:1 as an ayah and 2:1 as a prefix", () => {
  const kind = (verseKey: string) => (db.prepare(
    "SELECT basmala_kind AS k FROM quran_verse_metadata WHERE verse_key = ?"
  ).get(verseKey) as { k: string } | undefined)?.k;
  assert.equal(kind("1:1"), "ayah");
  assert.equal(kind("2:1"), "prefix");
});

test("words carries al-Fatiha's basmala but not the 112 prefix basmalas", () => {
  const count = (verseKey: string) => (db.prepare(
    "SELECT COUNT(*) AS n FROM words WHERE verse_key = ?"
  ).get(verseKey) as { n: number }).n;
  assert.equal(count("1:1"), FATIHA_BASMALA_WORDS);
  // 2:1 is بِسْمِ … الٓمٓ in the source; only الٓمٓ is an analysis word
  assert.equal(count("2:1"), 1);
  assert.equal(count("3:1"), 1);
});

// ---------------------------------------------------------------------------
// the invariant itself
// ---------------------------------------------------------------------------

test("words row count equals arabic_word spans plus al-Fatiha's basmala", () => {
  const rows = (db.prepare("SELECT COUNT(*) AS n FROM words").get() as { n: number }).n;
  assert.equal(rows, EXPECTED_ROWS,
    `expected ${ARABIC_WORD_SPANS} + ${FATIHA_BASMALA_WORDS} = ${EXPECTED_ROWS}; ` +
    "read the header of this file before changing the number");
});

test("every verse of the token map has as many rows as it has arabic_word spans", () => {
  const spansPerVerse = new Map<string, number>();
  for (const span of spans) {
    if (span.word_index === null) continue;
    spansPerVerse.set(span.verse_key, (spansPerVerse.get(span.verse_key) ?? 0) + 1);
  }
  const rowsPerVerse = new Map<string, number>();
  for (const row of db.prepare(
    "SELECT verse_key, COUNT(*) AS n FROM words GROUP BY verse_key"
  ).all() as Array<{ verse_key: string; n: number }>) {
    rowsPerVerse.set(row.verse_key, row.n);
  }
  const mismatched: string[] = [];
  for (const [verseKey, n] of spansPerVerse) {
    if (rowsPerVerse.get(verseKey) !== n) {
      mismatched.push(`${verseKey}: map=${n} db=${rowsPerVerse.get(verseKey)}`);
    }
  }
  assert.deepEqual(mismatched, []);
  // 1:1 is in the database but has no arabic_word span in the map — the gap
  const dbOnly = [...rowsPerVerse.keys()].filter((k) => !spansPerVerse.has(k));
  assert.deepEqual(dbOnly, ["1:1"]);
});

test("word_index is dense 1..N in all 6,236 verses", () => {
  const verses = db.prepare(
    "SELECT verse_key FROM words GROUP BY verse_key"
  ).all() as Array<{ verse_key: string }>;
  assert.equal(verses.length, 6236);
  const broken: string[] = [];
  const stmt = db.prepare(
    "SELECT word_index AS i FROM words WHERE verse_key = ? ORDER BY word_index");
  for (const { verse_key } of verses) {
    const indexes = (stmt.all(verse_key) as Array<{ i: number }>).map((r) => r.i);
    if (indexes.some((value, position) => value !== position + 1)) broken.push(verse_key);
  }
  assert.deepEqual(broken, []);
});
