// Duplike kökleri tekilleştirir, en iyi anlamlı satırı tutar. Yedek + transaction.
const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.env.APPLY === "1";

const has = s => !!(s && String(s).trim());
function score(r) {
  let s = 0;
  if (has(r.summary_tr)) s += 100000;     // en zengin: özet var
  if (has(r.short_tr)) s += 10000;         // kısa açıklama var
  s += (r.meaning_tr || "").length;        // daha detaylı anlam
  return s;
}

(async () => {
  const rows = (await db.execute("SELECT id, root, meaning_tr, short_tr, summary_tr, source FROM root_meanings")).rows;
  const byRoot = {};
  for (const r of rows) (byRoot[r.root] ??= []).push(r);

  const toDelete = [], decisions = [], backup = [];
  for (const [root, list] of Object.entries(byRoot)) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => score(b) - score(a) || a.id - b.id);
    const keep = sorted[0], drop = sorted.slice(1);
    decisions.push({ root, keep: keep.meaning_tr, drop: drop.map(d => d.meaning_tr) });
    for (const d of drop) { toDelete.push(d.id); }
    for (const r of list) backup.push(r);
  }

  console.log(`duplike kök: ${decisions.length} | silinecek satır: ${toDelete.length}`);
  console.log("\n=== örnek kararlar (ilk 12) ===");
  for (const d of decisions.slice(0, 12)) console.log(`  ${d.root}: TUT="${d.keep}"  |  SİL=${JSON.stringify(d.drop)}`);

  if (!APPLY) { console.log("\n[DRY-RUN] APPLY=1 ile uygula."); return; }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bp = path.resolve(__dirname, `_dedup_backup_${stamp}.json`);
  fs.writeFileSync(bp, JSON.stringify(backup, null, 2), "utf8");
  console.log(`\nyedek: ${bp}`);

  const stmts = toDelete.map(id => ({ sql: "DELETE FROM root_meanings WHERE id=?", args: [id] }));
  await db.batch(stmts, "write");
  console.log(`✓ ${stmts.length} satır silindi.`);

  // doğrula
  const dup = (await db.execute("SELECT root, COUNT(*) n FROM root_meanings GROUP BY root HAVING n>1")).rows;
  console.log(`kalan duplike kök: ${dup.length}`);
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
