/**
 * Read-only post-fix regression for the 37:130:4 lemma contract.
 *
 * Usage:
 *   node --env-file=apps/web/.env.local \
 *     scripts/morphology/surgical/verify_37_130_lemma_regression.mjs
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "../../..");
const DB_PATH = path.join(REPO, "data/app.db");
const OUT = path.join(
  REPO,
  "data/candidates/morphology/surgical-v1_10",
  "batch-a-37-130-lemma-normalization",
);
const EXPECTED_LEMMA = "إِلْيَاس";
const TARGET_ID = 58040;
const CORE_TABLES = ["words", "verses", "root_meanings"];

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(REPO, relativePath), "utf8"));
const key = (id, column) => `${id}:${column}`;
const failures = [];
const checks = {};
const fail = (name, detail) => failures.push({ name, detail });
const assert = (name, condition, detail = null) => {
  checks[name] = condition;
  if (!condition) fail(name, detail);
};
const sameValue = (a, b) =>
  (a === null && b === null) ||
  (a !== null && b !== null && String(a) === String(b));

const local = new DatabaseSync(DB_PATH, { readOnly: true });
const localCounts = Object.fromEntries(
  CORE_TABLES.map((table) => [
    table,
    Number(local.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n),
  ]),
);
assert(
  "corpus_counts",
  localCounts.words === 77433 &&
    localCounts.verses === 6236 &&
    localCounts.root_meanings === 1703,
  localCounts,
);
assert(
  "local_integrity",
  local.prepare("PRAGMA integrity_check").get().integrity_check === "ok",
);

const target = local.prepare("SELECT * FROM words WHERE id = ?").get(TARGET_ID);
const targetExpected = {
  verse_key: "37:130",
  word_index: 4,
  arabic: "يَاسِينَ",
  root: null,
  lemma: EXPECTED_LEMMA,
  pos: null,
  morphology: null,
  meaning_tr: "yâsîn",
  source: "qac_tanzil_teacher",
};
const targetMismatches = Object.entries(targetExpected)
  .filter(([column, expected]) => !sameValue(target[column], expected))
  .map(([column, expected]) => ({ column, expected, actual: target[column] }));
assert("37_130_4_contract", targetMismatches.length === 0, targetMismatches);

const localApply = readJson(
  "data/candidates/morphology/surgical-v1_10/" +
    "batch-a-37-130-lemma-normalization/local-apply-report.json",
);
const backup = new DatabaseSync(localApply.backup_path, { readOnly: true });
const backupDiffs = [];
for (const table of CORE_TABLES) {
  const columns = local
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
  const orderBy = table === "verses" ? "verse_key" : "id";
  const beforeRows = backup.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
  const afterRows = local.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
  if (beforeRows.length !== afterRows.length) {
    backupDiffs.push({ table, kind: "row_count", before: beforeRows.length, after: afterRows.length });
    continue;
  }
  for (let i = 0; i < beforeRows.length; i++) {
    for (const column of columns) {
      if (!sameValue(beforeRows[i][column], afterRows[i][column])) {
        backupDiffs.push({
          table,
          identity: table === "verses" ? afterRows[i].verse_key : Number(afterRows[i].id),
          column,
          before: beforeRows[i][column],
          after: afterRows[i][column],
        });
      }
    }
  }
}
const expectedBackupDiff = [
  {
    table: "words",
    identity: TARGET_ID,
    column: "lemma",
    before: "إِلْياس",
    after: EXPECTED_LEMMA,
  },
];
assert(
  "only_one_local_cell_changed",
  JSON.stringify(backupDiffs) === JSON.stringify(expectedBackupDiff),
  backupDiffs,
);
backup.close();

const indexGapRows = local
  .prepare(
    `SELECT verse_key, COUNT(*) AS n, COUNT(DISTINCT word_index) AS distinct_n,
            MIN(word_index) AS min_i, MAX(word_index) AS max_i
       FROM words GROUP BY verse_key
      HAVING min_i <> 1 OR max_i <> n OR distinct_n <> n`,
  )
  .all();
const duplicateIndexes = local
  .prepare(
    `SELECT COUNT(*) AS n FROM (
       SELECT verse_key, word_index FROM words
       GROUP BY verse_key, word_index HAVING COUNT(*) <> 1
     )`,
  )
  .get().n;
assert(
  "word_index_alignment",
  indexGapRows.length === 0 && Number(duplicateIndexes) === 0,
  { badVerses: indexGapRows, duplicates: Number(duplicateIndexes) },
);

const versePlan = readJson(
  "data/candidates/morphology/token-realign-v1_9/verse-plan.json",
);
const tanzil = new Map(
  fs
    .readFileSync(
      path.join(REPO, "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt"),
      "utf8",
    )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [surah, ayah, ...rest] = line.split("|");
      return [`${surah}:${ayah}`, rest.join("|")];
    }),
);
const realignmentFailures = [];
for (const verse of versePlan.verses) {
  const liveSurface = local
    .prepare(
      "SELECT arabic FROM words WHERE verse_key = ? ORDER BY word_index",
    )
    .all(verse.verse_key)
    .map((row) => row.arabic);
  const canonical = (tanzil.get(verse.verse_key) ?? "")
    .split(/\s+/)
    .filter((token) => /\p{L}/u.test(token));
  if (JSON.stringify(liveSurface) !== JSON.stringify(verse.target_surface_sequence)) {
    realignmentFailures.push({ verse_key: verse.verse_key, layer: "local_surface" });
  }
  if (JSON.stringify(canonical) !== JSON.stringify(verse.target_token_sequence)) {
    realignmentFailures.push({ verse_key: verse.verse_key, layer: "canonical_tanzil" });
  }
}
assert(
  "nine_realignments",
  versePlan.verses.length === 9 && realignmentFailures.length === 0,
  realignmentFailures,
);

let asciiRootLemma = 0;
let replacementCharacters = 0;
for (const row of local.prepare("SELECT arabic, root, lemma, morphology, meaning_tr FROM words").iterate()) {
  if (/[A-Za-z]/.test(`${row.root ?? ""}${row.lemma ?? ""}`)) asciiRootLemma++;
  if (
    [row.arabic, row.root, row.lemma, row.morphology, row.meaning_tr].some(
      (value) => typeof value === "string" && value.includes("\uFFFD"),
    )
  ) replacementCharacters++;
}
assert("ascii_or_buckwalter_root_lemma", asciiRootLemma === 0, asciiRootLemma);
assert("replacement_character_encoding", replacementCharacters === 0, replacementCharacters);

const properPreimage = readJson(
  "data/candidates/morphology/final-v1_8/surgical-v1_8/" +
    "proper-name-root-null-pre-image.json",
);
const properFailures = properPreimage.filter(
  (item) => local.prepare("SELECT root FROM words WHERE id = ?").get(item.id)?.root !== null,
);
assert(
  "proper_name_roots_null",
  properPreimage.length === 53 && properFailures.length === 0,
  { total: properPreimage.length, failures: properFailures },
);

const bcManifest = readJson(
  "data/candidates/morphology/surgical-v1_10/" +
    "batch-bc-meaning-tr/field-change-manifest.json",
);
const meaningFailures = bcManifest.filter((change) => {
  const row = local.prepare("SELECT meaning_tr FROM words WHERE id = ?").get(change.words_id);
  return !row || row.meaning_tr !== change.after;
});
assert(
  "meaning_648_manifest",
  bcManifest.length === 648 && meaningFailures.length === 0,
  meaningFailures.slice(0, 20),
);
const batchBIds = new Set(
  bcManifest
    .filter((change) => change.source_batch === "batch-b-meanings")
    .map((change) => change.words_id),
);
const batchCIds = new Set(
  bcManifest
    .filter((change) => change.source_batch === "batch-c-gloss")
    .map((change) => change.words_id),
);
const overlap = [...batchBIds].filter((id) => batchCIds.has(id));
assert(
  "batch_b_c_overlap",
  batchBIds.size === 35 && batchCIds.size === 613 && overlap.length === 0,
  { batchB: batchBIds.size, batchC: batchCIds.size, overlap },
);
const emptyMeaningRows = local
  .prepare(
    "SELECT id, verse_key, word_index FROM words " +
      "WHERE meaning_tr IS NULL OR TRIM(meaning_tr) = '' ORDER BY id",
  )
  .all();
assert("empty_meaning_tr", emptyMeaningRows.length === 0, emptyMeaningRows);
const fifteenSeven = local
  .prepare(
    "SELECT word_index, meaning_tr FROM words WHERE verse_key = '15:7' " +
      "AND word_index IN (1,2) ORDER BY word_index",
  )
  .all();
assert(
  "15_7_law_ma",
  fifteenSeven.length === 2 &&
    fifteenSeven[0].meaning_tr === "haydi" &&
    fifteenSeven[1].meaning_tr === "-sene",
  fifteenSeven,
);

const v19Manifest = readJson(
  "data/candidates/morphology/token-realign-v1_9/field-change-manifest.json",
);
const v10Manifests = [
  readJson(
    "data/candidates/morphology/surgical-v1_10/" +
      "batch-a-37-130/field-change-manifest.json",
  ),
  bcManifest,
  readJson(
    "data/candidates/morphology/surgical-v1_10/" +
      "batch-a-37-130-lemma-normalization/field-change-manifest.json",
  ),
];
const v10Expected = new Map();
for (const manifest of v10Manifests) {
  for (const change of manifest) {
    v10Expected.set(key(change.words_id, change.column), change.after);
  }
}
const v10Failures = [];
for (const [cell, expected] of v10Expected) {
  const [id, column] = cell.split(":");
  const actual = local.prepare(`SELECT ${column} AS value FROM words WHERE id = ?`).get(Number(id))?.value;
  if (!sameValue(actual, expected)) v10Failures.push({ cell, expected, actual });
}
assert("v1_10_contract", v10Failures.length === 0, v10Failures.slice(0, 20));

const v19Expected = new Map(
  v19Manifest.map((change) => [key(change.words_id, change.column), change.after]),
);
for (const [cell, expected] of v10Expected) {
  if (v19Expected.has(cell)) v19Expected.set(cell, expected);
}
const v19Failures = [];
for (const [cell, expected] of v19Expected) {
  const [id, column] = cell.split(":");
  const actual = local.prepare(`SELECT ${column} AS value FROM words WHERE id = ?`).get(Number(id))?.value;
  if (!sameValue(actual, expected)) v19Failures.push({ cell, expected, actual });
}
assert("v1_9_contract", v19Failures.length === 0, v19Failures.slice(0, 20));

const mergeSql = fs.readFileSync(
  path.join(REPO, "data/candidates/morphology/final-v1_8/merge-forward.sql"),
  "utf8",
);
const v18Expected = new Map();
for (const match of mergeSql.matchAll(
  /UPDATE words SET (lemma|root)='((?:''|[^'])*)' WHERE id=(\d+)/g,
)) {
  v18Expected.set(key(Number(match[3]), match[1]), match[2].replaceAll("''", "'"));
}
const cleanupSql = fs.readFileSync(
  path.join(
    REPO,
    "data/candidates/morphology/final-v1_8/buckwalter-cleanup-v1_8/forward.sql",
  ),
  "utf8",
);
const cleanup = new Map();
for (const match of cleanupSql.matchAll(
  /UPDATE words SET (lemma|root)='((?:''|[^'])*)' WHERE \1='((?:''|[^'])*)'/g,
)) {
  cleanup.set(key(match[1], match[3].replaceAll("''", "'")), match[2].replaceAll("''", "'"));
}
for (const [cell, expected] of v18Expected) {
  const column = cell.slice(cell.lastIndexOf(":") + 1);
  v18Expected.set(cell, cleanup.get(key(column, expected)) ?? expected);
}
const rollbackSql = fs.readFileSync(
  path.join(
    REPO,
    "data/candidates/morphology/final-v1_8/surgical-v1_8/certain-rollback.sql",
  ),
  "utf8",
);
for (const match of rollbackSql.matchAll(
  /UPDATE words SET (lemma|root)=NULL WHERE id=(\d+)/g,
)) {
  const cell = key(Number(match[2]), match[1]);
  if (v18Expected.has(cell)) v18Expected.set(cell, null);
}
for (const item of properPreimage) {
  const cell = key(item.id, "root");
  if (v18Expected.has(cell)) v18Expected.set(cell, null);
}
for (const [cell, expected] of v19Expected) {
  if (v18Expected.has(cell)) v18Expected.set(cell, expected);
}
for (const [cell, expected] of v10Expected) {
  if (v18Expected.has(cell)) v18Expected.set(cell, expected);
}
const v18Failures = [];
for (const [cell, expected] of v18Expected) {
  const [id, column] = cell.split(":");
  const actual = local.prepare(`SELECT ${column} AS value FROM words WHERE id = ?`).get(Number(id))?.value;
  if (!sameValue(actual, expected)) v18Failures.push({ cell, expected, actual });
}
const v18MeaningReport = readJson(
  "data/candidates/morphology/final-v1_8/surgical-v1_8/" +
    "meaning-corrections-apply-report.json",
);
const v18MeaningFailures = v18MeaningReport.changes
  .filter((change) => change.id && !change.key.startsWith("root_meanings "))
  .filter((change) => {
    const actual = local.prepare("SELECT meaning_tr FROM words WHERE id = ?").get(change.id)?.meaning_tr;
    const later = v10Expected.get(key(change.id, "meaning_tr"));
    return !sameValue(actual, later === undefined ? change.new : later);
  });
const rootMeaningChange = v18MeaningReport.changes.find((change) =>
  change.key.startsWith("root_meanings "),
);
const rootMeaningActual = local
  .prepare("SELECT meaning_tr FROM root_meanings WHERE id = ?")
  .get(rootMeaningChange.id)?.meaning_tr;
const aadReport = readJson(
  "data/candidates/morphology/final-v1_8/surgical-v1_8/" +
    "aad-homograph-apply-report.json",
);
const aadFailures = aadReport.changes.filter((change) => {
  const actual = local.prepare("SELECT meaning_tr FROM words WHERE id = ?").get(change.id)?.meaning_tr;
  const later = v10Expected.get(key(change.id, "meaning_tr"));
  return !sameValue(actual, later === undefined ? change.new : later);
});
assert(
  "v1_8_contract",
  v18Expected.size === 997 &&
    v18Failures.length === 0 &&
    v18MeaningFailures.length === 0 &&
    aadFailures.length === 0 &&
    rootMeaningActual === rootMeaningChange.new,
  {
    additiveCells: v18Expected.size,
    additiveFailures: v18Failures.slice(0, 20),
    meaningFailures: v18MeaningFailures,
    aadFailures,
    rootMeaningExpected: rootMeaningChange.new,
    rootMeaningActual,
  },
);

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("Turso credentials are required");
const turso = createClient({
  url: url.replace(/^libsql:\/\//, "https://"),
  authToken,
});
const remoteIntegrity = String(
  (await turso.execute("PRAGMA integrity_check")).rows[0].integrity_check,
);
assert("turso_integrity", remoteIntegrity === "ok", remoteIntegrity);

let comparedRows = 0;
let comparedFields = 0;
const localTursoDiffs = [];
for (const table of CORE_TABLES) {
  const columns = local
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
  const orderBy = table === "verses" ? "verse_key" : "id";
  const localRows = local.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
  let offset = 0;
  const remoteRows = [];
  while (offset < localRows.length) {
    const result = await turso.execute({
      sql: `SELECT ${columns.join(", ")} FROM ${table} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      args: [2000, offset],
    });
    const rows = result.rows.map((row) =>
      Object.fromEntries(columns.map((column) => [column, row[column] ?? null])),
    );
    remoteRows.push(...rows);
    if (rows.length === 0) break;
    offset += rows.length;
  }
  if (remoteRows.length !== localRows.length) {
    localTursoDiffs.push({
      table,
      kind: "row_count",
      local: localRows.length,
      turso: remoteRows.length,
    });
    continue;
  }
  for (let i = 0; i < localRows.length; i++) {
    comparedRows++;
    for (const column of columns) {
      comparedFields++;
      if (!sameValue(localRows[i][column], remoteRows[i][column])) {
        localTursoDiffs.push({
          table,
          identity: localRows[i][orderBy],
          column,
          local: localRows[i][column],
          turso: remoteRows[i][column],
        });
        if (localTursoDiffs.length >= 100) break;
      }
    }
    if (localTursoDiffs.length >= 100) break;
  }
}
assert("local_turso_field_equality", localTursoDiffs.length === 0, localTursoDiffs);

const report = {
  status: failures.length === 0 ? "PASS" : "FAIL",
  ranAt: new Date().toISOString(),
  expected_37_130_4_lemma: EXPECTED_LEMMA,
  corpus_counts: localCounts,
  checked: {
    local_turso_rows: comparedRows,
    local_turso_fields: comparedFields,
    verses_word_index: 6236,
    realignment_verses: versePlan.verses.length,
    meaning_manifest_cells: bcManifest.length,
    v1_8_cells: v18Expected.size,
    v1_9_cells_after_overlays: v19Expected.size,
    v1_10_cells_after_overlays: v10Expected.size,
    proper_name_roots: properPreimage.length,
  },
  errors: {
    alignment: indexGapRows.length + Number(duplicateIndexes) + realignmentFailures.length,
    lemma: targetMismatches.filter((item) => item.column === "lemma").length,
    root: properFailures.length,
    meaning: meaningFailures.length,
    encoding: asciiRootLemma + replacementCharacters,
  },
  empty_meaning_tr: emptyMeaningRows,
  new_regressions: failures.length,
  local_turso_differences: localTursoDiffs,
  only_local_change_since_backup: backupDiffs,
  checks,
  failures,
};
fs.writeFileSync(
  path.join(OUT, "full-regression-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8",
);
console.log(JSON.stringify(report, null, 2));
turso.close();
local.close();
if (failures.length) process.exit(1);
