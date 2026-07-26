/**
 * preflight.mjs — fail-closed gate for a surgical-v1_10 batch.
 *
 * Reads local data/app.db read-only, pulls a Turso pre-image, and compares BOTH
 * against the batch manifest cell by cell. Writes only the Turso pre-image and a
 * report. Exits non-zero on the first divergence; applies nothing.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/surgical/preflight.mjs <batch>
 */
import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const batch = process.argv[2];
if (!batch) { console.error("usage: preflight.mjs <batch>"); process.exit(2); }
const OUT = path.join(REPO, "data/candidates/morphology/surgical-v1_10", batch);

const COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
  "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"];

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
const changes = readJson("field-change-manifest.json");
const preimage = readJson("preimage.json");
const summary = readJson("summary.json");
const invalidation = readJson("sql-invalidation.json");
const forwardSql = fs.readFileSync(path.join(OUT, "forward.sql"), "utf8");
const forwardSha256 = crypto.createHash("sha256").update(forwardSql).digest("hex");

const failures = [];
let checks = 0;
function check(name, ok, detail) {
  checks++;
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// 0. manifest shape
// ---------------------------------------------------------------------------
check("manifest: at least one cell to change", changes.length > 0, `${changes.length}`);
check("manifest: cell count matches summary",
  changes.length === summary.cells_to_change, `${changes.length} vs ${summary.cells_to_change}`);
check("manifest: row count unchanged by design",
  summary.corpus_rows_before === summary.corpus_rows_after);

const statementCount = forwardSql.split("\n").filter((l) => l.startsWith("UPDATE ")).length;
check("forward.sql: one UPDATE per changed cell",
  statementCount === changes.length, `${statementCount} vs ${changes.length}`);
const sqlLines = forwardSql.split("\n").map((line) => line.trim()).filter(Boolean);
const realDataWrites = sqlLines.filter((line) =>
  /^(INSERT|DELETE)\b/i.test(line) && !/^INSERT INTO _surgical_meaning_guard\b/i.test(line));
const invalidUpdates = sqlLines.filter((line) =>
  /^UPDATE\b/i.test(line) && !/^UPDATE words SET meaning_tr = /i.test(line));
check("forward.sql: only guard INSERTs; no data INSERT or DELETE",
  realDataWrites.length === 0, realDataWrites.slice(0, 3).join(" | "));
check("forward.sql: every UPDATE targets words.meaning_tr only",
  invalidUpdates.length === 0, invalidUpdates.slice(0, 3).join(" | "));
check("forward.sql: hash is the approved replacement",
  forwardSha256 === invalidation.replacement_sql_sha256["forward.sql"], forwardSha256);
check("forward.sql: invalidated hashes are rejected",
  !Object.values(invalidation.invalidated_sql_sha256).includes(forwardSha256), forwardSha256);

const versesInSql = new Set([...forwardSql.matchAll(/verse_key = '([^']+)'/g)].map((m) => m[1]));
check("forward.sql: touches only the verses named in the summary",
  [...versesInSql].every((v) => summary.verses_touched.includes(v)),
  [...versesInSql].filter((v) => !summary.verses_touched.includes(v)).join(","));

// ---------------------------------------------------------------------------
// 1. local database
// ---------------------------------------------------------------------------
const local = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
const localTotal = local.prepare("SELECT COUNT(*) AS n FROM words").get().n;
check(`local: rows = ${summary.corpus_rows_before}`,
  localTotal === summary.corpus_rows_before, `${localTotal}`);

const selectById = local.prepare(
  `SELECT id, ${COLUMNS.join(", ")} FROM words WHERE id = ?`);

for (const row of preimage) {
  const live = selectById.get(row.id);
  if (!live) { check(`local: preimage id ${row.id} exists`, false); continue; }
  for (const col of COLUMNS) {
    check(`local id ${row.id}: ${col} matches pre-image`, live[col] === row[col],
      `live=${JSON.stringify(live[col])} manifest=${JSON.stringify(row[col])}`);
  }
}
for (const change of changes) {
  const live = selectById.get(change.words_id);
  if (!live) { check(`local: target id ${change.words_id} exists`, false); continue; }
  check(`local id ${change.words_id}.${change.column}: before-image matches`,
    live[change.column] === change.before,
    `live=${JSON.stringify(live[change.column])} manifest=${JSON.stringify(change.before)}`);
  check(`local id ${change.words_id}.${change.column}: is not already at target`,
    live[change.column] !== change.after);
}

const asciiBefore = local.prepare(
  "SELECT COUNT(*) AS n FROM words WHERE root GLOB '*[A-Za-z]*' OR lemma GLOB '*[A-Za-z]*'"
).get().n;
check("local: ASCII/Buckwalter in root|lemma = 0", asciiBefore === 0, `${asciiBefore}`);
local.close();

// ---------------------------------------------------------------------------
// 2. Turso pre-image and comparison
// ---------------------------------------------------------------------------
let tursoPreimagePath = null;
let tursoPreimageSha256 = null;
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  check("turso: credentials present", false, "TURSO_DB_URL / TURSO_AUTH_TOKEN missing");
} else {
  const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
  const tursoTotal = Number((await turso.execute("SELECT COUNT(*) AS n FROM words")).rows[0].n);
  check(`turso: rows = ${summary.corpus_rows_before}`,
    tursoTotal === summary.corpus_rows_before, `${tursoTotal}`);

  const ids = [...new Set(changes.map((c) => c.words_id))];
  const remote = (await turso.execute({
    sql: `SELECT id, ${COLUMNS.join(", ")} FROM words
           WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
    args: ids,
  })).rows.map((r) => Object.fromEntries(
    ["id", ...COLUMNS].map((k) => [k, r[k] === undefined ? null : r[k]])));

  const capturedAt = new Date().toISOString();
  const stamp = capturedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  tursoPreimagePath = path.join(OUT, `turso-preimage-${stamp}.json`);
  const tursoPreimageText = JSON.stringify(
    { capturedAt, rowsTotal: tursoTotal, rows: remote }, null, 2) + "\n";
  fs.writeFileSync(tursoPreimagePath, tursoPreimageText, "utf8");
  tursoPreimageSha256 = crypto.createHash("sha256").update(tursoPreimageText).digest("hex");

  const remoteById = new Map(remote.map((r) => [Number(r.id), r]));
  check("turso: every target row present", remoteById.size === ids.length,
    `${remoteById.size} of ${ids.length}`);
  for (const row of preimage) {
    const mirror = remoteById.get(row.id);
    if (!mirror) { check(`turso: id ${row.id} exists`, false); continue; }
    for (const col of COLUMNS) {
      const a = row[col], b = mirror[col];
      check(`turso id ${row.id}: ${col} identical to local pre-image`,
        (a === null && b === null) || String(a) === String(b),
        `local=${JSON.stringify(a)} turso=${JSON.stringify(b)}`);
    }
  }
}

fs.writeFileSync(path.join(OUT, "preflight-report.json"), JSON.stringify({
  ranAt: new Date().toISOString(), batch, totalChecks: checks,
  forwardSha256, tursoPreimagePath, tursoPreimageSha256,
  failed: failures.length, failures,
}, null, 2), "utf8");

console.log(`checks: ${checks}, failed: ${failures.length}`);
if (failures.length) {
  console.error("\nFAIL-CLOSED — nothing will be applied:");
  for (const f of failures.slice(0, 40)) console.error("  " + f);
  process.exit(1);
}
console.log("PREFLIGHT PASS");
