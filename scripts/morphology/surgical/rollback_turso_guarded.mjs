/** Guarded rollback for batch-bc-meaning-tr. Does nothing without --apply. */
import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const batch = process.argv[2];
const APPLY = process.argv.includes("--apply");
if (!batch) { console.error("usage: rollback_turso_guarded.mjs <batch> --apply"); process.exit(2); }
if (!APPLY) { console.error("DRY STOP: add --apply to execute the guarded rollback"); process.exit(2); }
const OUT = path.join(REPO, "data/candidates/morphology/surgical-v1_10", batch);
const changes = JSON.parse(fs.readFileSync(path.join(OUT, "field-change-manifest.json"), "utf8"));
const summary = JSON.parse(fs.readFileSync(path.join(OUT, "summary.json"), "utf8"));
const invalidation = JSON.parse(fs.readFileSync(path.join(OUT, "sql-invalidation.json"), "utf8"));
const reverseSql = fs.readFileSync(path.join(OUT, "reverse.sql"), "utf8");
const reverseSha256 = crypto.createHash("sha256").update(reverseSql).digest("hex");
if (reverseSha256 !== invalidation.replacement_sql_sha256["reverse.sql"]
    || Object.values(invalidation.invalidated_sql_sha256).includes(reverseSha256)) {
  console.error(`ABORT: reverse.sql hash rejected: ${reverseSha256}`); process.exit(1);
}
const statements = reverseSql.split("\n").map((line) => line.trim())
  .filter((line) => line && !line.startsWith("--")
    && line.toUpperCase() !== "BEGIN IMMEDIATE;" && line.toUpperCase() !== "COMMIT;")
  .map((sql) => ({ sql, args: [] }));
const updateIndexes = statements.map((statement, index) =>
  /^UPDATE words SET meaning_tr = /i.test(statement.sql) ? index : -1).filter((index) => index >= 0);
if (changes.length !== 648 || updateIndexes.length !== 648
    || changes.some((change) => change.column !== "meaning_tr")) {
  console.error("ABORT: rollback package/count gate failed"); process.exit(1);
}
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO_DB_URL / TURSO_AUTH_TOKEN missing"); process.exit(1); }
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
const ids = [...new Set(changes.map((change) => change.words_id))];
const before = Number((await turso.execute("SELECT COUNT(*) AS n FROM words")).rows[0].n);
if (before !== summary.corpus_rows_after) { console.error(`ABORT: rows=${before}`); process.exit(1); }
const live = (await turso.execute({
  sql: `SELECT id, meaning_tr FROM words WHERE id IN (${ids.map(() => "?").join(",")})`, args: ids,
})).rows;
const liveById = new Map(live.map((row) => [Number(row.id), row.meaning_tr ?? null]));
const drift = changes.filter((change) => liveById.get(change.words_id) !== (change.after ?? null));
if (drift.length) { console.error(`ABORT: ${drift.length} target cells drifted`); process.exit(1); }
const result = await turso.batch(statements, "write");
const rowsAffected = updateIndexes.reduce(
  (sum, index) => sum + Number(result[index]?.rowsAffected ?? 0), 0);
if (rowsAffected !== 648) { console.error(`ABORT: rollback rowsAffected=${rowsAffected}`); process.exit(1); }
const restored = (await turso.execute({
  sql: `SELECT id, meaning_tr FROM words WHERE id IN (${ids.map(() => "?").join(",")})`, args: ids,
})).rows;
const restoredById = new Map(restored.map((row) => [Number(row.id), row.meaning_tr ?? null]));
const failures = changes.filter((change) => restoredById.get(change.words_id) !== (change.before ?? null));
const rowsAfter = Number((await turso.execute("SELECT COUNT(*) AS n FROM words")).rows[0].n);
const integrity = String(Object.values((await turso.execute("PRAGMA integrity_check")).rows[0] ?? {})[0] ?? "");
const report = { ranAt: new Date().toISOString(), batch, reverseSha256, rowsAffected,
  rowsBefore: before, rowsAfter, integrityCheck: integrity, failures: failures.map((row) => row.words_id) };
fs.writeFileSync(path.join(OUT, "turso-rollback-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length || rowsAfter !== before || integrity !== "ok" ? 1 : 0);