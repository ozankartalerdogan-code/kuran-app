// Arapça-olmayan/bozuk kök düzeltmesi — YEDEK + TRANSACTION + DOĞRULAMA.
// Awl: A seçeneği (mevcut أول'e birleştir, Latin satırı sil).
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", "apps", "web", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// stripped(U+FFFD silinmiş) -> doğru Arapça kök
const MAP = {
  "جي": "جيأ", "رل": "رسل", "كو": "كون", "كر": "كفر",
  "مث": "مثل", "نل": "نزل", "ذب": "كذب",
  "Any": "أنى", "Awl": "أول",
};
const isArabic = (s) => /^[؀-ۿ\s]+$/.test(s);
const strip = (s) => s.replace(/�/g, "");

(async () => {
  // 1) Etkilenen kökleri bul
  const distinct = await db.execute({ sql: "SELECT DISTINCT root FROM words WHERE root IS NOT NULL AND root<>''", args: [] });
  const bad = distinct.rows.map(r => r.root).filter(r => !isArabic(r));

  const plan = [];
  for (const R of bad) {
    const target = MAP[strip(R)];
    if (!target) { console.error(`✋ EŞLEŞMEYEN kök, iptal: "${R}" (strip="${strip(R)}")`); process.exit(1); }
    plan.push({ R, target });
  }
  console.log("=== PLAN ===");
  for (const p of plan) console.log(`  "${p.R}" -> ${p.target}`);

  // 2) YEDEK
  const ph = bad.map(() => "?").join(",");
  const wRows = (await db.execute({ sql: `SELECT verse_key, word_index, arabic, root, meaning_tr FROM words WHERE root IN (${ph})`, args: bad })).rows;
  const rmRows = (await db.execute({ sql: `SELECT root, meaning_tr FROM root_meanings WHERE root IN (${ph})`, args: bad })).rows;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.resolve(__dirname, `_root_fix_backup_${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ when: stamp, words: wRows, root_meanings: rmRows, plan }, null, 2), "utf8");
  console.log(`\n=== YEDEK ===\n  ${wRows.length} words + ${rmRows.length} root_meanings satırı -> ${backupPath}`);

  // 3) Statement'ları kur (target var mı -> sil; yok -> yeniden adlandır)
  const stmts = [];
  for (const { R, target } of plan) {
    const exists = (await db.execute({ sql: "SELECT 1 FROM root_meanings WHERE root=? LIMIT 1", args: [target] })).rows.length > 0;
    stmts.push({ sql: "UPDATE words SET root=? WHERE root=?", args: [target, R] });
    if (exists) stmts.push({ sql: "DELETE FROM root_meanings WHERE root=?", args: [R] });
    else        stmts.push({ sql: "UPDATE root_meanings SET root=? WHERE root=?", args: [target, R] });
  }

  // 4) TRANSACTION
  console.log(`\n=== UYGULANIYOR (${stmts.length} statement, transaction) ===`);
  await db.batch(stmts, "write");
  console.log("  ✓ commit");

  // 5) DOĞRULAMA
  const after = await db.execute({ sql: "SELECT DISTINCT root FROM words WHERE root IS NOT NULL AND root<>''", args: [] });
  const stillBad = after.rows.map(r => r.root).filter(r => !isArabic(r));
  console.log(`\n=== DOĞRULAMA ===`);
  console.log(`  kalan Arapça-olmayan kök: ${stillBad.length} ${stillBad.length ? JSON.stringify(stillBad) : "✓"}`);
  for (const t of [...new Set(plan.map(p => p.target))]) {
    const n = (await db.execute({ sql: "SELECT COUNT(*) AS n FROM words WHERE root=?", args: [t] })).rows[0].n;
    console.log(`  ${t}: ${n} kelime`);
  }
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
