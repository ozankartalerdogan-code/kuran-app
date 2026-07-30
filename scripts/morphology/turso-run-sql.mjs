/**
 * turso-run-sql.mjs — bir .sql dosyasındaki guard'lı UPDATE'leri Turso'ya
 * transactional batch olarak uygular. certain-rollback geri alımı için:
 *   node --env-file=apps/web/.env.local scripts/morphology/turso-run-sql.mjs \
 *     data/candidates/morphology/final-v1_8/surgical-v1_8/certain-rollback-turso-reverse.sql
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("kullanım: turso-run-sql.mjs <path.sql>"); process.exit(1); }
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO_DB_URL / TURSO_AUTH_TOKEN yok"); process.exit(1); }
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });

const stmts = fs.readFileSync(file, "utf-8").split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("--") && l.toUpperCase() !== "BEGIN;" && l.toUpperCase() !== "COMMIT;")
  .map((sql) => ({ sql, args: [] }));
if (!stmts.length) { console.error("çalıştırılacak statement yok"); process.exit(1); }

let affected = 0;
for (let i = 0; i < stmts.length; i += 200) {
  const res = await turso.batch(stmts.slice(i, i + 200), "write");
  affected += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
}
console.log(`${file}: ${stmts.length} statement · rowsAffected=${affected}`);
