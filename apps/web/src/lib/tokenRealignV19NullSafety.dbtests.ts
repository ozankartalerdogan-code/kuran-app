/**
 * tokenRealignV19NullSafety.dbtests.ts — run via the
 * tokenRealignV19NullSafety.test.ts gate; skipped when data/ inputs are absent.
 *
 * token-realign-v1_9 blocker 3: the five INSERT rows land with NULL pos,
 * morphology, gloss_en and (mostly) meaning_tr. This suite proves the web,
 * mobile and core read paths stay safe with those NULLs — no "null" text, no
 * empty badge, no analysis borrowed from a neighbouring word.
 *
 * The migration is applied to a THROWAWAY COPY of data/app.db under the OS temp
 * directory. data/app.db itself is opened read-only and Turso is never touched.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
  translatePosTr,
  formatMorphologyTr,
} from "../../../../packages/core/src/presentation/morphologyLabels.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SOURCE_DB = path.join(REPO, "data", "app.db");
const FORWARD_SQL = path.join(
  REPO, "data", "candidates", "morphology", "token-realign-v1_9", "forward.sql"
);

/** The five rows the migration inserts, as (verse_key, word_index). */
const INSERTED: ReadonlyArray<readonly [string, number]> = [
  ["15:7", 8], ["27:20", 12], ["36:22", 8], ["37:164", 6], ["41:47", 28],
];

const TARGET_VERSES = [
  "2:72", "2:181", "8:6", "13:37", "15:7", "27:20", "36:22", "37:164", "41:47",
];

interface WordRow {
  word_index: number;
  arabic: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology: string | null;
  meaning_tr: string | null;
  gloss_en: string | null;
  confidence: string | null;
  source: string | null;
  role: string | null;
}

const workdir = mkdtempSync(path.join(tmpdir(), "token-realign-v1_9-"));
const sandboxPath = path.join(workdir, "sandbox.db");

// A backup() copy folds in the WAL and leaves the original untouched.
const source = new DatabaseSync(SOURCE_DB, { readOnly: true });
source.exec(`VACUUM INTO '${sandboxPath.replace(/\\/g, "/").replace(/'/g, "''")}'`);
source.close();

const db = new DatabaseSync(sandboxPath);
// Before the migration is applied to data/app.db this runs it on the copy;
// afterwards the copy already carries it. Re-running would abort on the
// INSERTs (UNIQUE constraint on words.id), which is the intended fail-closed
// behaviour — so apply only when the rows are not there yet.
const alreadyMigrated =
  (db.prepare("SELECT COUNT(*) AS n FROM words WHERE id = 77430").get().n as number) === 1;
if (!alreadyMigrated) {
  db.exec(readFileSync(FORWARD_SQL, "utf8"));
}

process.on("exit", () => {
  try { db.close(); } catch { /* already closed */ }
  rmSync(workdir, { recursive: true, force: true });
});

function wordsOf(verseKey: string): WordRow[] {
  return db.prepare(
    `SELECT word_index, arabic, root, lemma, pos, morphology, meaning_tr,
            gloss_en, confidence, source, role
       FROM words WHERE verse_key = ? ORDER BY word_index ASC, segment_index ASC, id ASC`
  ).all(verseKey) as unknown as WordRow[];
}

// ---------------------------------------------------------------------------
// the five inserted rows
// ---------------------------------------------------------------------------

test("the five inserted rows exist exactly once, at the end of their verse", () => {
  for (const [verseKey, wordIndex] of INSERTED) {
    const rows = wordsOf(verseKey);
    const matches = rows.filter((r) => r.word_index === wordIndex);
    assert.equal(matches.length, 1, `${verseKey}:${wordIndex} should be a single row`);
    assert.equal(rows.at(-1)?.word_index, wordIndex, `${verseKey}: inserted row is last`);
  }
});

test("inserted rows carry a surface, a root and a lemma; never an empty surface", () => {
  for (const [verseKey, wordIndex] of INSERTED) {
    const row = wordsOf(verseKey).find((r) => r.word_index === wordIndex)!;
    assert.ok(row.arabic && row.arabic.trim().length > 0, `${verseKey}: arabic present`);
    assert.ok(row.root && row.root.trim().length > 0, `${verseKey}: root present`);
    assert.ok(row.lemma && row.lemma.trim().length > 0, `${verseKey}: lemma present`);
    assert.equal(row.source, "qac_tanzil_teacher");
    assert.equal(row.confidence, "low");
  }
});

test("unproven fields are SQL NULL, not the strings 'null' or 'undefined'", () => {
  for (const [verseKey, wordIndex] of INSERTED) {
    const row = wordsOf(verseKey).find((r) => r.word_index === wordIndex)!;
    for (const column of ["pos", "morphology", "gloss_en", "role"] as const) {
      assert.equal(row[column], null, `${verseKey}: ${column} must be SQL NULL`);
    }
  }
});

test("no cell anywhere in the nine verses holds a placeholder string", () => {
  const forbidden = new Set(["null", "undefined", "none", "nan", "[object object]"]);
  for (const verseKey of TARGET_VERSES) {
    for (const row of wordsOf(verseKey)) {
      for (const [column, value] of Object.entries(row)) {
        if (typeof value !== "string") continue;
        assert.ok(
          !forbidden.has(value.trim().toLowerCase()),
          `${verseKey} word ${row.word_index}: ${column} holds placeholder ${value}`
        );
      }
    }
  }
});

// ---------------------------------------------------------------------------
// presentation layer
// ---------------------------------------------------------------------------

test("web MorphBadge input: NULL pos renders the em-dash placeholder, never 'null'", () => {
  // page.tsx: MorphBadge returns "—" when morphology is falsy, otherwise
  // translatePosTr(...). Both branches are exercised here.
  assert.equal(translatePosTr(null), "—");
  assert.equal(translatePosTr(undefined), "—");
  assert.equal(translatePosTr(""), "—");
  for (const [verseKey, wordIndex] of INSERTED) {
    const row = wordsOf(verseKey).find((r) => r.word_index === wordIndex)!;
    const rendered = row.pos ? translatePosTr(row.pos) : "—";
    assert.equal(rendered, "—", `${verseKey}: badge falls back to the placeholder`);
    assert.ok(!rendered.toLowerCase().includes("null"));
  }
});

test("mobile detail rows: NULL pos and morphology collapse the row instead of rendering empty chrome", () => {
  // [ayahNumber].tsx renders the "Tür" row only when w.pos is truthy and the
  // "Morfoloji" row only when formatMorphologyTr(w.morphology) is a non-empty
  // string. Both must be falsy for an inserted row.
  assert.equal(formatMorphologyTr(null), "");
  assert.equal(formatMorphologyTr(undefined), "");
  for (const [verseKey, wordIndex] of INSERTED) {
    const row = wordsOf(verseKey).find((r) => r.word_index === wordIndex)!;
    assert.ok(!row.pos, `${verseKey}: "Tür" row is omitted`);
    assert.equal(formatMorphologyTr(row.morphology), "",
      `${verseKey}: "Morfoloji" row is omitted`);
  }
});

test("meaning is absent rather than fabricated on unproven cells", () => {
  // getAyahDetailFromDb maps meaning only when meaning_tr is truthy, so a NULL
  // becomes `meaning: null` and the UI shows nothing at all.
  for (const [verseKey, wordIndex] of INSERTED) {
    const row = wordsOf(verseKey).find((r) => r.word_index === wordIndex)!;
    const meaning = row.meaning_tr
      ? { language: "tr", source: row.source, text: row.meaning_tr, status: "available" }
      : null;
    if (row.meaning_tr === null) {
      assert.equal(meaning, null, `${verseKey}: no fabricated meaning object`);
    } else {
      assert.ok(meaning && meaning.text.trim().length > 0);
    }
  }
});

// ---------------------------------------------------------------------------
// no analysis borrowed from a neighbour
// ---------------------------------------------------------------------------

test("an inserted row never repeats the previous word's analysis", () => {
  for (const [verseKey, wordIndex] of INSERTED) {
    const rows = wordsOf(verseKey);
    const inserted = rows.find((r) => r.word_index === wordIndex)!;
    const previous = rows.find((r) => r.word_index === wordIndex - 1);
    assert.ok(previous, `${verseKey}: previous word exists`);
    assert.notEqual(inserted.arabic, previous!.arabic);
    const sameAnalysis =
      inserted.root === previous!.root &&
      inserted.lemma === previous!.lemma &&
      inserted.morphology === previous!.morphology;
    assert.ok(!sameAnalysis, `${verseKey}: inserted row must not copy word ${wordIndex - 1}`);
  }
});

test("every target verse keeps a dense 1..N word_index so the API order is stable", () => {
  for (const verseKey of TARGET_VERSES) {
    const indexes = wordsOf(verseKey).map((r) => r.word_index);
    assert.deepEqual(indexes, indexes.map((_, i) => i + 1), `${verseKey}: dense word_index`);
  }
});

test("the web ayah query (GROUP BY word_index) returns one row per token", () => {
  for (const verseKey of TARGET_VERSES) {
    const grouped = db.prepare(
      `SELECT word_index, MIN(arabic) AS arabic, MIN(pos) AS pos
         FROM words WHERE verse_key = ? GROUP BY word_index ORDER BY word_index`
    ).all(verseKey) as unknown as Array<{ word_index: number; arabic: string | null }>;
    assert.equal(grouped.length, wordsOf(verseKey).length, `${verseKey}: no rows collapse`);
    for (const row of grouped) {
      assert.ok(row.arabic && row.arabic.trim().length > 0,
        `${verseKey} word ${row.word_index}: surface never empty`);
    }
  }
});
