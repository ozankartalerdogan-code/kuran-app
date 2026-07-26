/**
 * apply-token-realign-v1_9-turso.mjs — apply the same guarded forward.sql to
 * the live Turso database, then verify it against the already-migrated local
 * database row by row.
 *
 * The statements run as one transactional libsql batch ("write"), so a failure
 * anywhere rolls the whole thing back. Re-running aborts on the INSERTs
 * (UNIQUE on words.id) with no net change — fail-closed, never double-applied.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-token-realign-v1_9-turso.mjs [--verify-only]
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "data/candidates/morphology/token-realign-v1_9");
const VERIFY_ONLY = process.argv.includes("--verify-only");

const TARGETS = ["2:72", "2:181", "8:6", "13:37", "15:7", "27:20", "36:22", "37:164", "41:47"];
const COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
  "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"];
const INSERT_IDS = [77430, 77431, 77432, 77433, 77434];
const DELETE_IDS = [1149];

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO_DB_URL / TURSO_AUTH_TOKEN missing"); process.exit(1); }
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });

const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail && !ok ? `  (${detail})` : ""}`);
};
const one = async (sql, args = []) => Number((await turso.execute({ sql, args })).rows[0].n);

// ---------------------------------------------------------------------------
let rowsAffected = null;
const before = await one("SELECT COUNT(*) AS n FROM words");
console.log(`turso rows before: ${before}`);

if (!VERIFY_ONLY) {
  if (before !== 77429) {
    console.error(`ABORT: expected 77429 rows before, found ${before}`);
    process.exit(1);
  }
  const statements = fs.readFileSync(path.join(OUT, "forward.sql"), "utf8")
    .split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("--")
      && l.toUpperCase() !== "BEGIN IMMEDIATE;" && l.toUpperCase() !== "COMMIT;")
    .map((sql) => ({ sql, args: [] }));
  console.log(`applying ${statements.length} statements as one transactional batch...`);
  const res = await turso.batch(statements, "write");
  rowsAffected = res.reduce((s, r) => s + Number(r.rowsAffected ?? 0), 0);
  console.log(`turso rowsAffected: ${rowsAffected}`);
}

// ---------------------------------------------------------------------------
// gates
// ---------------------------------------------------------------------------
const after = await one("SELECT COUNT(*) AS n FROM words");
check("turso: rows after = 77433", after === 77433, `${after}`);

for (const id of INSERT_IDS) {
  check(`turso: inserted id ${id} present`, (await one("SELECT COUNT(*) AS n FROM words WHERE id = ?", [id])) === 1);
}
for (const id of DELETE_IDS) {
  check(`turso: deleted id ${id} absent`, (await one("SELECT COUNT(*) AS n FROM words WHERE id = ?", [id])) === 0);
}
check("turso: max(id) = 77434", (await one("SELECT MAX(id) AS n FROM words")) === 77434);
check("turso: ASCII/Buckwalter in root|lemma = 0",
  (await one("SELECT COUNT(*) AS n FROM words WHERE root GLOB '*[A-Za-z]*' OR lemma GLOB '*[A-Za-z]*'")) === 0);

// full row-level comparison against the migrated local database
const local = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
const placeholders = TARGETS.map(() => "?").join(",");

const remote = (await turso.execute({
  sql: `SELECT id, ${COLUMNS.join(", ")} FROM words WHERE verse_key IN (${placeholders})
        ORDER BY word_index, segment_index, id`,
  args: TARGETS,
})).rows.map((r) => Object.fromEntries(["id", ...COLUMNS].map((k) => [k, r[k] ?? null])));
const localRows = local.prepare(
  `SELECT id, ${COLUMNS.join(", ")} FROM words WHERE verse_key IN (${placeholders})
   ORDER BY word_index, segment_index, id`
).all(...TARGETS);

check("turso: target rows = 118", remote.length === 118, `${remote.length}`);
check("turso: target row count equals local", remote.length === localRows.length,
  `turso=${remote.length} local=${localRows.length}`);

const remoteById = new Map(remote.map((r) => [Number(r.id), r]));
let cellMismatches = 0;
for (const row of localRows) {
  const mirror = remoteById.get(row.id);
  if (!mirror) { check(`turso: id ${row.id} present`, false); continue; }
  for (const col of COLUMNS) {
    const a = row[col], b = mirror[col];
    const same = (a === null && b === null) || String(a) === String(b);
    if (!same) { cellMismatches++; check(`turso id ${row.id}.${col} equals local`, false, `local=${JSON.stringify(a)} turso=${JSON.stringify(b)}`); }
  }
}
check("turso: every target cell identical to local", cellMismatches === 0, `${cellMismatches} mismatched`);

// per-verse token counts and word_index sequences
const perVerse = {};
for (const verse of TARGETS) {
  const rows = remote.filter((r) => r.verse_key === verse);
  const indexes = rows.map((r) => Number(r.word_index));
  const localIndexes = localRows.filter((r) => r.verse_key === verse).map((r) => r.word_index);
  perVerse[verse] = { rows: rows.length, wordIndexes: indexes };
  check(`turso ${verse}: word_index sequence equals local`,
    JSON.stringify(indexes) === JSON.stringify(localIndexes), JSON.stringify(indexes));
  check(`turso ${verse}: dense 1..N`,
    JSON.stringify(indexes) === JSON.stringify(indexes.map((_, i) => i + 1)));
}

// nothing outside the nine verses moved: compare a checksum of the rest
const remoteOutside = Number((await turso.execute({
  sql: `SELECT COUNT(*) AS n FROM words WHERE verse_key NOT IN (${placeholders})`,
  args: TARGETS,
})).rows[0].n);
check("turso: untargeted rows = 77315", remoteOutside === 77315, `${remoteOutside}`);

const remoteSum = (await turso.execute({
  sql: `SELECT SUM(LENGTH(COALESCE(arabic,'')) + LENGTH(COALESCE(root,'')) +
               LENGTH(COALESCE(lemma,'')) + LENGTH(COALESCE(pos,'')) +
               LENGTH(COALESCE(morphology,'')) + LENGTH(COALESCE(meaning_tr,'')) +
               LENGTH(COALESCE(gloss_en,'')) + LENGTH(COALESCE(role,''))) AS n
          FROM words WHERE verse_key NOT IN (${placeholders})`,
  args: TARGETS,
})).rows[0].n;
const localSum = local.prepare(
  `SELECT SUM(LENGTH(COALESCE(arabic,'')) + LENGTH(COALESCE(root,'')) +
          LENGTH(COALESCE(lemma,'')) + LENGTH(COALESCE(pos,'')) +
          LENGTH(COALESCE(morphology,'')) + LENGTH(COALESCE(meaning_tr,'')) +
          LENGTH(COALESCE(gloss_en,'')) + LENGTH(COALESCE(role,''))) AS n
     FROM words WHERE verse_key NOT IN (${placeholders})`
).all(...TARGETS)[0].n;
check("turso: untargeted content checksum equals local",
  String(remoteSum) === String(localSum), `turso=${remoteSum} local=${localSum}`);

local.close();

fs.writeFileSync(path.join(OUT, "turso-apply-report.json"), JSON.stringify({
  ranAt: new Date().toISOString(),
  verifyOnly: VERIFY_ONLY,
  rowsBefore: before,
  rowsAfter: after,
  rowsAffected,
  insertIds: INSERT_IDS,
  deleteIds: DELETE_IDS,
  perVerse,
  untargetedRows: remoteOutside,
  failures,
}, null, 2), "utf8");

console.log(`\nTURSO GATES: ${failures.length ? "FAIL" : "PASS"} (${failures.length} failures)`);
process.exit(failures.length ? 1 : 0);
