#!/usr/bin/env node
/**
 * Elmalili-only migration sonrasi local master (data/app.db) ile Turso arasindaki
 * meal katmani farkini dogrular. Fark 0 olmalidir.
 *
 * Kullanim:
 *   node --env-file=apps/web/.env.local scripts/verify-elmalili-local-vs-turso.mjs
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("TURSO_DB_URL / TURSO_AUTH_TOKEN yok");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });

const norm = (v) => (v === null || v === undefined ? "" : String(v));
const hashRows = (rows) => {
  const h = createHash("sha256");
  for (const r of rows) {
    for (const v of Object.values(r)) h.update(norm(v));
    h.update("");
  }
  return `${rows.length}:${h.digest("hex")}`;
};

const CHECKS = [
  ["translations", "SELECT verse_key, source, text FROM translations ORDER BY verse_key, source"],
  ["aktif_mealler", "SELECT source, display_name, aktif, sira FROM aktif_mealler ORDER BY source"],
  ["verses.primary_translation", "SELECT verse_key, primary_translation FROM verses ORDER BY verse_key"],
  ["ayet_fts.meal", "SELECT verse_key, meal FROM ayet_fts ORDER BY verse_key"],
  ["fidelity_comparisons", "SELECT verse_key, source_name FROM fidelity_comparisons ORDER BY verse_key, source_name"],
];

let diffs = 0;
for (const [label, sql] of CHECKS) {
  const localRows = local.prepare(sql).all();
  const remoteRows = (await turso.execute(sql)).rows.map((r) => ({ ...r }));
  const lh = hashRows(localRows);
  const rh = hashRows(remoteRows);
  const same = lh === rh;
  if (!same) diffs += 1;
  console.log(`${same ? "OK  " : "DIFF"}  ${label.padEnd(28)} local=${lh.slice(0, 20)} turso=${rh.slice(0, 20)}`);
}

console.log(diffs === 0 ? "\nlocal-Turso farki: 0" : `\nlocal-Turso farki: ${diffs} tabloda SAPMA`);
local.close();
process.exit(diffs === 0 ? 0 : 1);
