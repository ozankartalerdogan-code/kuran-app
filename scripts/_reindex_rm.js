const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
(async () => {
  const idx = await db.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='root_meanings'");
  console.log("root_meanings indexleri:");
  for (const r of idx.rows) console.log("  -", r.name, "|", r.sql || "(auto)");
  await db.execute("REINDEX root_meanings");
  console.log("REINDEX root_meanings OK");
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
