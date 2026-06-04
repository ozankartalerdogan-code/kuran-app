// SALT-OKUNUR: hedef Arapça köklerin DB'de var olup olmadığını + bozuk köklerin root_meanings kaydını kontrol eder.
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "..", "apps", "web", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const targets = ["أول", "أنى", "جيأ", "جيء", "رسل", "كون", "كفر", "مثل", "نزل", "كذب"];

(async () => {
  console.log("=== hedef köklerin root_meanings + words varlığı ===");
  for (const t of targets) {
    const rm = await db.execute({ sql: "SELECT meaning_tr FROM root_meanings WHERE root=?", args: [t] });
    const wc = await db.execute({ sql: "SELECT COUNT(*) AS n FROM words WHERE root=?", args: [t] });
    console.log(`  ${t}: root_meanings=${rm.rows.length ? '"'+rm.rows[0].meaning_tr+'"' : "YOK"} | words=${wc.rows[0].n}`);
  }

  console.log("\n=== bozuk/Latin köklerin root_meanings kaydı var mı? ===");
  const all = await db.execute({ sql: "SELECT DISTINCT root FROM words WHERE root IS NOT NULL AND root <> ''", args: [] });
  const nonAr = all.rows.map(r => r.root).filter(r => !/^[؀-ۿ\s]+$/.test(r));
  for (const r of nonAr) {
    const rm = await db.execute({ sql: "SELECT meaning_tr FROM root_meanings WHERE root=?", args: [r] });
    console.log(`  "${r}": root_meanings=${rm.rows.length ? '"'+rm.rows[0].meaning_tr+'"' : "YOK"}`);
  }
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
