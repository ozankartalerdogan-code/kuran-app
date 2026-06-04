// SALT-OKUNUR: bozuk satırların anlamlarına karşılık gelen gerçek köklerin var olup olmadığını + أنى anlamını kontrol eder.
const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// silinen bozuk satırların temsil ettiği gerçek kökler + adayları
const CHECK = ["جهد", "رجل", "قوي", "قوة", "جذب", "أنى", "كفر", "مثل", "نزل", "جيأ", "رسل", "كون", "كذب"];

(async () => {
  console.log("kök            | root_meanings anlam              | words");
  for (const r of CHECK) {
    const rm = await db.execute({ sql: "SELECT meaning_tr FROM root_meanings WHERE root=?", args: [r] });
    const w = await db.execute({ sql: "SELECT COUNT(*) n FROM words WHERE root=?", args: [r] });
    console.log(`  ${r.padEnd(6)} | ${rm.rows.length ? (rm.rows[0].meaning_tr || "(boş)") : "YOK"}`.padEnd(60) + ` | words=${w.rows[0].n}`);
  }
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
