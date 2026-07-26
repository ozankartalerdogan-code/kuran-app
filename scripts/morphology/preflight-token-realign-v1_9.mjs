/**
 * preflight-token-realign-v1_9.mjs — fail-closed gate before anything is written.
 *
 * Reads local data/app.db read-only, pulls a Turso pre-image, and compares BOTH
 * against the migration manifest id-by-id and field-by-field. Writes only the
 * Turso pre-image file. Exits non-zero on the first divergence; nothing is
 * applied by this script.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/preflight-token-realign-v1_9.mjs
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "data/candidates/morphology/token-realign-v1_9");

const TARGETS = ["2:72", "2:181", "8:6", "13:37", "15:7", "27:20", "36:22", "37:164", "41:47"];
const COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
  "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"];

const EXPECT = {
  localRowsBefore: 77429,
  targetRowsBefore: 114,
  targetRowsAfter: 118,
  inserts: 5,
  deletes: 1,
  changedRows: 71,
  changedCells: 280,
  corpusAfter: 77433,
  insertIds: [77430, 77431, 77432, 77433, 77434],
  deleteIds: [1149],
  meaningVerdicts: {
    MOVE_EXISTING_MEANING: 15,
    REPLACE_WITH_VERIFIED_MEANING: 4,
    SET_NULL_FAIL_CLOSED: 35,
  },
};

const failures = [];
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
const plan = readJson("verse-plan.json");
const preimage = readJson("preimage.json");
const fieldChanges = readJson("field-change-manifest.json");
const adjudication = readJson("meaning-adjudication.json");
const mapping = fs.readFileSync(path.join(OUT, "row-mapping.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l));
const forwardSql = fs.readFileSync(path.join(OUT, "forward.sql"), "utf8");

// ---------------------------------------------------------------------------
// 0. manifest self-consistency
// ---------------------------------------------------------------------------
const c = plan.counts;
check("manifest: affected existing rows = 114", c.affected_existing_rows === EXPECT.targetRowsBefore, `${c.affected_existing_rows}`);
check("manifest: target rows = 118", c.target_rows === EXPECT.targetRowsAfter, `${c.target_rows}`);
check("manifest: inserts = 5", c.rows_to_insert === EXPECT.inserts, `${c.rows_to_insert}`);
check("manifest: deletes = 1", c.rows_to_delete === EXPECT.deletes, `${c.rows_to_delete}`);
check("manifest: changed cells = 280", c.cells_to_change === EXPECT.changedCells, `${c.cells_to_change}`);
check("manifest: changed rows = 71", c.rows_with_at_least_one_changed_cell === EXPECT.changedRows, `${c.rows_with_at_least_one_changed_cell}`);
check("manifest: corpus after = 77433", c.corpus_rows_after === EXPECT.corpusAfter, `${c.corpus_rows_after}`);
check("manifest: 9/9 verses RESOLVED", c.resolved_verses === 9 && c.unresolved_verses === 0);
check("manifest: untargeted no-op gate clean", c.untargeted_verses_failing_noop_gate === 0);

const verdictTally = adjudication.summary.verdicts;
for (const [k, v] of Object.entries(EXPECT.meaningVerdicts)) {
  check(`manifest: meaning verdict ${k} = ${v}`, verdictTally[k] === v, `${verdictTally[k]}`);
}
check("manifest: meaning verdict total = 54", adjudication.summary.pending_cells === 54, `${adjudication.summary.pending_cells}`);

// scope: the SQL must only ever name the nine verses
const verseKeysInSql = new Set([...forwardSql.matchAll(/'(\d+:\d+)'/g)].map((m) => m[1]));
check("forward.sql touches only the nine target verses",
  [...verseKeysInSql].every((k) => TARGETS.includes(k)),
  [...verseKeysInSql].filter((k) => !TARGETS.includes(k)).join(","));

const sqlInsertIds = [...forwardSql.matchAll(/^INSERT INTO words \([^)]*\) VALUES \((\d+),/gm)].map((m) => Number(m[1]));
const sqlDeleteIds = [...forwardSql.matchAll(/^DELETE FROM words WHERE id = (\d+)/gm)].map((m) => Number(m[1]));
check("forward.sql insert ids == manifest", JSON.stringify(sqlInsertIds) === JSON.stringify(EXPECT.insertIds), sqlInsertIds.join(","));
check("forward.sql delete ids == manifest", JSON.stringify(sqlDeleteIds) === JSON.stringify(EXPECT.deleteIds), sqlDeleteIds.join(","));

// the five inserted rows must leave pos/morphology/gloss_en/role NULL
const insertLines = forwardSql.split("\n").filter((l) => l.startsWith("INSERT INTO words"));
check("forward.sql: 5 INSERT statements", insertLines.length === 5, `${insertLines.length}`);
const insertOps = mapping.filter((o) => o.operation === "INSERT_ROW");
for (const op of insertOps) {
  const p = op.target_payload;
  check(`insert ${op.verse_key}:${op.target_word_index} leaves pos/morphology/gloss_en/role NULL`,
    p.pos === null && p.morphology === null && p.gloss_en === null && p.role === null,
    JSON.stringify({ pos: p.pos, morphology: p.morphology, gloss_en: p.gloss_en, role: p.role }));
  check(`insert ${op.verse_key}:${op.target_word_index} carries arabic/root/lemma/confidence/source`,
    !!op.target_arabic && !!p.root && !!p.lemma && !!p.confidence && !!p.source);
}

// ---------------------------------------------------------------------------
// 1. local database
// ---------------------------------------------------------------------------
const local = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
const localTotal = local.prepare("SELECT COUNT(*) AS n FROM words").get().n;
check("local: rows before = 77429", localTotal === EXPECT.localRowsBefore, `${localTotal}`);

const q = (verse) => local.prepare(
  `SELECT id, ${COLUMNS.join(", ")} FROM words WHERE verse_key = ? ORDER BY word_index, segment_index, id`
).all(verse);

const localByVerse = new Map(TARGETS.map((v) => [v, q(v)]));
const localTargetRows = [...localByVerse.values()].reduce((s, r) => s + r.length, 0);
check("local: target rows = 114", localTargetRows === EXPECT.targetRowsBefore, `${localTargetRows}`);

for (const report of plan.verses) {
  const rows = localByVerse.get(report.verse_key);
  check(`local ${report.verse_key}: row count matches manifest (${report.current_row_count})`,
    rows.length === report.current_row_count, `${rows.length}`);
}

const localById = new Map();
for (const rows of localByVerse.values()) for (const r of rows) localById.set(r.id, r);

// every pre-image row must still be byte-identical in the live local db
for (const row of preimage) {
  const live = localById.get(row.id);
  if (!live) { check(`local: preimage id ${row.id} exists`, false); continue; }
  for (const col of COLUMNS) {
    check(`local id ${row.id}: ${col} matches pre-image`, live[col] === row[col],
      `live=${JSON.stringify(live[col])} manifest=${JSON.stringify(row[col])}`);
  }
}

// every field-change "before" must match the live cell
for (const fc of fieldChanges) {
  const live = localById.get(fc.words_id);
  if (!live) { check(`local: change target id ${fc.words_id} exists`, false); continue; }
  check(`local id ${fc.words_id}.${fc.column}: before-image matches`,
    live[fc.column] === fc.before,
    `live=${JSON.stringify(live[fc.column])} manifest=${JSON.stringify(fc.before)}`);
}

// insert ids must be free, delete id must exist
for (const id of EXPECT.insertIds) {
  const hit = local.prepare("SELECT COUNT(*) AS n FROM words WHERE id = ?").get(id).n;
  check(`local: insert id ${id} is free`, hit === 0, `${hit}`);
}
for (const id of EXPECT.deleteIds) {
  const hit = local.prepare("SELECT COUNT(*) AS n FROM words WHERE id = ?").get(id).n;
  check(`local: delete id ${id} exists`, hit === 1, `${hit}`);
}
const maxId = local.prepare("SELECT MAX(id) AS m FROM words").get().m;
check("local: max(id) = 77429 so insert ids do not collide", maxId === 77429, `${maxId}`);

// no ASCII / Buckwalter in root or lemma anywhere
const asciiBefore = local.prepare(
  "SELECT COUNT(*) AS n FROM words WHERE root GLOB '*[A-Za-z]*' OR lemma GLOB '*[A-Za-z]*'"
).get().n;
check("local: ASCII/Buckwalter in root|lemma = 0", asciiBefore === 0, `${asciiBefore}`);

// fingerprint of everything outside the nine verses, for the after-check
const outsideRows = local.prepare(
  `SELECT id, ${COLUMNS.join(", ")} FROM words
    WHERE verse_key NOT IN (${TARGETS.map(() => "?").join(",")}) ORDER BY id`
).all(...TARGETS);
check("local: untargeted rows = 77315", outsideRows.length === 77315, `${outsideRows.length}`);
const { createHash } = await import("node:crypto");
const outsideFingerprint = createHash("sha256")
  .update(outsideRows.map((r) => COLUMNS.map((cn) => String(r[cn])).join("")).join(""))
  .digest("hex");
local.close();

// ---------------------------------------------------------------------------
// 2. Turso pre-image and comparison
// ---------------------------------------------------------------------------
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  check("turso: credentials present", false, "TURSO_DB_URL / TURSO_AUTH_TOKEN missing");
} else {
  const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
  const totalRes = await turso.execute("SELECT COUNT(*) AS n FROM words");
  const tursoTotal = Number(totalRes.rows[0].n);
  check("turso: rows before = 77429", tursoTotal === EXPECT.localRowsBefore, `${tursoTotal}`);

  const placeholders = TARGETS.map(() => "?").join(",");
  const targetRes = await turso.execute({
    sql: `SELECT id, ${COLUMNS.join(", ")} FROM words WHERE verse_key IN (${placeholders})
          ORDER BY word_index, segment_index, id`,
    args: TARGETS,
  });
  const tursoRows = targetRes.rows.map((r) => Object.fromEntries(
    ["id", ...COLUMNS].map((k) => [k, r[k] === undefined ? null : r[k]])));
  check("turso: target rows = 114", tursoRows.length === EXPECT.targetRowsBefore, `${tursoRows.length}`);

  fs.writeFileSync(path.join(OUT, "turso-preimage.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), rowsTotal: tursoTotal, rows: tursoRows },
      null, 2), "utf8");

  const tursoById = new Map(tursoRows.map((r) => [Number(r.id), r]));
  for (const [id, live] of localById) {
    const remote = tursoById.get(id);
    if (!remote) { check(`turso: id ${id} exists`, false); continue; }
    for (const col of COLUMNS) {
      const a = live[col], b = remote[col] === undefined ? null : remote[col];
      check(`turso id ${id}: ${col} identical to local`,
        (a === null && b === null) || String(a) === String(b),
        `local=${JSON.stringify(a)} turso=${JSON.stringify(b)}`);
    }
  }
  for (const id of EXPECT.insertIds) {
    const hit = Number((await turso.execute({ sql: "SELECT COUNT(*) AS n FROM words WHERE id = ?", args: [id] })).rows[0].n);
    check(`turso: insert id ${id} is free`, hit === 0, `${hit}`);
  }
  for (const id of EXPECT.deleteIds) {
    const hit = Number((await turso.execute({ sql: "SELECT COUNT(*) AS n FROM words WHERE id = ?", args: [id] })).rows[0].n);
    check(`turso: delete id ${id} exists`, hit === 1, `${hit}`);
  }
  const tursoAscii = Number((await turso.execute(
    "SELECT COUNT(*) AS n FROM words WHERE root GLOB '*[A-Za-z]*' OR lemma GLOB '*[A-Za-z]*'"
  )).rows[0].n);
  check("turso: ASCII/Buckwalter in root|lemma = 0", tursoAscii === 0, `${tursoAscii}`);
}

// ---------------------------------------------------------------------------
fs.writeFileSync(path.join(OUT, "preflight-report.json"), JSON.stringify({
  ranAt: new Date().toISOString(),
  totalChecks: checks.length,
  failed: failures.length,
  untargetedFingerprintBefore: outsideFingerprint,
  failures,
}, null, 2), "utf8");

console.log(`checks: ${checks.length}, failed: ${failures.length}`);
console.log(`untargeted fingerprint (before): ${outsideFingerprint}`);
if (failures.length) {
  console.error("\nFAIL-CLOSED — nothing will be applied:");
  for (const f of failures.slice(0, 40)) console.error("  " + f);
  process.exit(1);
}
console.log("PREFLIGHT PASS");
