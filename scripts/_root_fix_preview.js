// SALT-OKUNUR: Latin kök (Awl/Any) düzeltmesi için etkilenecek satırları gösterir.
// Hiçbir yazma yapmaz.
const fs = require("fs");
const path = require("path");

// apps/web/.env.local'dan TURSO creds yükle
const envPath = path.resolve(__dirname, "..", "apps", "web", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  const wc = await db.execute({
    sql: "SELECT root, COUNT(*) AS n FROM words WHERE root IN ('Awl','Any') GROUP BY root",
    args: [],
  });
  console.log("=== words tablosu (Latin kök sayıları) ===");
  for (const r of wc.rows) console.log(`  ${r.root}: ${r.n} satır`);

  const rm = await db.execute({
    sql: "SELECT root, meaning_tr FROM root_meanings WHERE root IN ('Awl','Any','أول','أنى') ORDER BY root",
    args: [],
  });
  console.log("\n=== root_meanings (Latin + Arapça hedefler) ===");
  for (const r of rm.rows) console.log(`  ${r.root}  ->  ${r.meaning_tr}`);

  const sample = await db.execute({
    sql: "SELECT verse_key, word_index, arabic, root, meaning_tr FROM words WHERE root IN ('Awl','Any') ORDER BY root, verse_key LIMIT 6",
    args: [],
  });
  console.log("\n=== örnek kelimeler ===");
  for (const r of sample.rows) console.log(`  ${r.verse_key} #${r.word_index}  ${r.arabic}  [${r.root}]  ${r.meaning_tr}`);

  // words icindeki TUM Arapca-olmayan/bozuk kokler — detayli
  const all = await db.execute({ sql: "SELECT root, COUNT(*) AS n FROM words WHERE root IS NOT NULL AND root <> '' GROUP BY root", args: [] });
  const nonAr = all.rows.filter(r => !/^[؀-ۿ\s]+$/.test(r.root));
  console.log("\n=== words'teki TÜM Arapça-olmayan/BOZUK kökler (detay) ===");
  for (const r of nonAr) {
    const cps = [...r.root].map(ch => "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");
    const ex = await db.execute({ sql: "SELECT arabic, meaning_tr FROM words WHERE root = ? LIMIT 2", args: [r.root] });
    const samples = ex.rows.map(x => `${x.arabic}(${x.meaning_tr})`).join("  ");
    console.log(`\n  kök="${r.root}"  | ${r.n} kelime | kodnoktaları: ${cps}`);
    console.log(`    örnek: ${samples}`);
  }
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
