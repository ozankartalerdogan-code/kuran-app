/**
 * apply_turso.mjs — apply a surgical-v1_10 batch to the live Turso database and
 * verify it against the already-migrated local database, cell by cell.
 *
 * Statements run as one transactional libsql batch ("write"), so a failure
 * anywhere rolls everything back. Re-running matches nothing (the guards pin the
 * pre-image value), so rowsAffected drops to 0 — a genuine no-op.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/surgical/apply_turso.mjs <batch> [--verify-only]
 */
import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const batch = process.argv[2];
if (!batch) { console.error("usage: apply_turso.mjs <batch> [--verify-only]"); process.exit(2); }
const VERIFY_ONLY = process.argv.includes("--verify-only");
const OUT = path.join(REPO, "data/candidates/morphology/surgical-v1_10", batch);

const COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
  "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"];

const summary = JSON.parse(fs.readFileSync(path.join(OUT, "summary.json"), "utf8"));
const changes = JSON.parse(fs.readFileSync(path.join(OUT, "field-change-manifest.json"), "utf8"));
const invalidation = JSON.parse(fs.readFileSync(path.join(OUT, "sql-invalidation.json"), "utf8"));
const preflight = JSON.parse(fs.readFileSync(path.join(OUT, "preflight-report.json"), "utf8"));
const forwardSql = fs.readFileSync(path.join(OUT, "forward.sql"), "utf8");
const forwardSha256 = crypto.createHash("sha256").update(forwardSql).digest("hex");
const statements = forwardSql
  .split("\n").map((line) => line.trim())
  .filter((line) => line && !line.startsWith("--")
    && line.toUpperCase() !== "BEGIN IMMEDIATE;" && line.toUpperCase() !== "COMMIT;")
  .map((sql) => ({ sql, args: [] }));
const updateIndexes = statements.map((statement, index) =>
  /^UPDATE words SET meaning_tr = /i.test(statement.sql) ? index : -1).filter((index) => index >= 0);

if (forwardSha256 !== invalidation.replacement_sql_sha256["forward.sql"]
    || Object.values(invalidation.invalidated_sql_sha256).includes(forwardSha256)) {
  console.error(`ABORT: forward.sql hash rejected: ${forwardSha256}`);
  process.exit(1);
}
if (preflight.failed !== 0 || preflight.forwardSha256 !== forwardSha256
    || changes.length !== 648 || updateIndexes.length !== 648
    || summary.null_to_nonnull !== 34 || summary.nonnull_to_nonnull !== 614
    || summary.batch_b_c_overlap !== 0
    || changes.some((change) => change.column !== "meaning_tr")) {
  console.error("ABORT: package/preflight/count gate failed");
  process.exit(1);
}

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO_DB_URL / TURSO_AUTH_TOKEN missing"); process.exit(1); }
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });

const failures = [];
const check = (name, ok, detail) => {
  if (!ok) { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(` FAIL  ${name}  (${detail ?? ""})`); }
};
const one = async (sql, args = []) => Number((await turso.execute({ sql, args })).rows[0].n);

let rowsAffected = null;
let totalBatchRowsAffected = null;
const before = await one("SELECT COUNT(*) AS n FROM words");
console.log(`turso rows before: ${before}`);
if (before !== summary.corpus_rows_before) {
  console.error(`ABORT: expected ${summary.corpus_rows_before} rows, found ${before}`);
  process.exit(1);
}

if (!VERIFY_ONLY) {
  console.log(`applying ${statements.length} guarded statements as one transactional batch...`);
  const res = await turso.batch(statements, "write");
  rowsAffected = updateIndexes.reduce(
    (sum, index) => sum + Number(res[index]?.rowsAffected ?? 0), 0);
  totalBatchRowsAffected = res.reduce((sum, result) =>
    sum + Number(result.rowsAffected ?? 0), 0);
  console.log(`turso UPDATE rowsAffected: ${rowsAffected}`);
  if (rowsAffected !== 648) {
    console.error(`ABORT: Turso UPDATE rowsAffected ${rowsAffected} != 648`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
const after = await one("SELECT COUNT(*) AS n FROM words");
check(`turso: rows unchanged at ${summary.corpus_rows_after}`,
  after === summary.corpus_rows_after, `${after}`);
check("turso: ASCII/Buckwalter in root|lemma = 0",
  (await one("SELECT COUNT(*) AS n FROM words WHERE root GLOB '*[A-Za-z]*' OR lemma GLOB '*[A-Za-z]*'")) === 0);

const local = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
const ids = [...new Set(changes.map((c) => c.words_id))];
const remote = (await turso.execute({
  sql: `SELECT id, ${COLUMNS.join(", ")} FROM words
         WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
  args: ids,
})).rows.map((r) => Object.fromEntries(
  ["id", ...COLUMNS].map((k) => [k, r[k] === undefined ? null : r[k]])));
const remoteById = new Map(remote.map((r) => [Number(r.id), r]));

let mismatches = 0;
for (const id of ids) {
  const localRow = local.prepare(
    `SELECT id, ${COLUMNS.join(", ")} FROM words WHERE id = ?`).get(id);
  const mirror = remoteById.get(id);
  if (!mirror) { check(`turso: id ${id} present`, false); continue; }
  for (const col of COLUMNS) {
    const a = localRow[col], b = mirror[col];
    const same = (a === null && b === null) || String(a) === String(b);
    if (!same) { mismatches++; check(`turso id ${id}.${col} equals local`, false, `local=${JSON.stringify(a)} turso=${JSON.stringify(b)}`); }
  }
}
check("turso: every touched cell identical to local", mismatches === 0, `${mismatches}`);

let targetCellsReached = 0;
for (const change of changes) {
  const mirror = remoteById.get(change.words_id);
  const reached = mirror && ((mirror[change.column] ?? null) === (change.after ?? null)
    || String(mirror[change.column]) === String(change.after));
  if (reached) targetCellsReached++;
  check(`turso id ${change.words_id}.${change.column} reached the target value`,
    reached, `${JSON.stringify(mirror?.[change.column])}`);
}

// nothing else moved: content checksum of every row NOT in this batch
const notIn = ids.map(() => "?").join(",");
const remoteSum = (await turso.execute({
  sql: `SELECT SUM(LENGTH(COALESCE(arabic,'')) + LENGTH(COALESCE(root,'')) +
             LENGTH(COALESCE(lemma,'')) + LENGTH(COALESCE(pos,'')) +
             LENGTH(COALESCE(morphology,'')) + LENGTH(COALESCE(meaning_tr,'')) +
             LENGTH(COALESCE(gloss_en,'')) + LENGTH(COALESCE(role,''))) AS n
        FROM words WHERE id NOT IN (${notIn})`,
  args: ids,
})).rows[0].n;
const localSum = local.prepare(
  `SELECT SUM(LENGTH(COALESCE(arabic,'')) + LENGTH(COALESCE(root,'')) +
          LENGTH(COALESCE(lemma,'')) + LENGTH(COALESCE(pos,'')) +
          LENGTH(COALESCE(morphology,'')) + LENGTH(COALESCE(meaning_tr,'')) +
          LENGTH(COALESCE(gloss_en,'')) + LENGTH(COALESCE(role,''))) AS n
     FROM words WHERE id NOT IN (${notIn})`).all(...ids)[0].n;
check("turso: untouched content checksum equals local",
  String(remoteSum) === String(localSum), `turso=${remoteSum} local=${localSum}`);
local.close();

let integrityCheck = null;
try {
  const result = await turso.execute("PRAGMA integrity_check");
  integrityCheck = String(Object.values(result.rows[0] ?? {})[0] ?? "");
} catch (error) {
  integrityCheck = `ERROR: ${error?.message ?? error}`;
}
check("turso: integrity_check = ok", integrityCheck === "ok", integrityCheck);

const fifteenSeven = (await turso.execute({
  sql: "SELECT word_index, meaning_tr FROM words WHERE verse_key = ? AND word_index IN (1, 2) ORDER BY word_index",
  args: ["15:7"],
})).rows.map((row) => ({ wordIndex: Number(row.word_index), meaningTr: row.meaning_tr ?? null }));
check("turso: 15:7 لَوْ مَا = haydi + -sene",
  fifteenSeven.length === 2 && fifteenSeven[0].meaningTr === "haydi"
    && fifteenSeven[1].meaningTr === "-sene", JSON.stringify(fifteenSeven));

let secondRunRaised = null;
let secondRunUpdateRowsAffected = null;
let secondRunNoNetChange = null;
if (!VERIFY_ONLY && failures.length === 0) {
  const targetBeforeSecond = JSON.stringify(remote);
  try {
    const second = await turso.batch(statements, "write");
    secondRunUpdateRowsAffected = updateIndexes.reduce(
      (sum, index) => sum + Number(second[index]?.rowsAffected ?? 0), 0);
  } catch (error) {
    secondRunRaised = `${error?.name ?? "Error"}: ${error?.message ?? error}`;
  }
  const afterSecond = (await turso.execute({
    sql: `SELECT id, ${COLUMNS.join(", ")} FROM words
           WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
    args: ids,
  })).rows.map((row) => Object.fromEntries(
    ["id", ...COLUMNS].map((key) => [key, row[key] === undefined ? null : row[key]])));
  secondRunNoNetChange = JSON.stringify(afterSecond) === targetBeforeSecond
    && await one("SELECT COUNT(*) AS n FROM words") === after;
  check("turso: second guarded run fails closed", secondRunRaised !== null, secondRunRaised ?? "no error");
  check("turso: second guarded run has zero net change", secondRunNoNetChange,
    `updateRowsAffected=${secondRunUpdateRowsAffected}`);
}

const reportName = VERIFY_ONLY ? "turso-postflight-verification.json" : "turso-apply-report.json";
fs.writeFileSync(path.join(OUT, reportName), JSON.stringify({
  ranAt: new Date().toISOString(), batch, verifyOnly: VERIFY_ONLY,
  forwardSha256, preflightReport: path.join(OUT, "preflight-report.json"),
  tursoPreimagePath: preflight.tursoPreimagePath,
  tursoPreimageSha256: preflight.tursoPreimageSha256,
  rowsBefore: before, rowsAfter: after, rowsAffected,
  totalBatchRowsAffected, integrityCheck, fifteenSeven,
  targetCellsReached, touchedColumnMismatches: mismatches,
  untouchedChecksumMatches: String(remoteSum) === String(localSum),
  secondRunRaised, secondRunUpdateRowsAffected, secondRunNoNetChange,
  touchedIds: ids, failures,
}, null, 2), "utf8");

console.log(`\nTURSO GATES: ${failures.length ? "FAIL" : "PASS"} (${failures.length} failures)`);
process.exit(failures.length ? 1 : 0);
