// SALT-OKUNUR: أنى kökünün geçtiği ayetleri ve kelimeyi gösterir (anlamı ayetten çözmek için).
const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const ana = String.fromCodePoint(0x623, 0x646, 0x649);

(async () => {
  const w = (await db.execute({ sql: "SELECT verse_key, arabic, meaning_tr FROM words WHERE root=? ORDER BY verse_key", args: [ana] })).rows;
  console.log(`أنى kökü -> ${w.length} kelime\n`);
  // kelime formları + anlam dağılımı
  const forms = {}, means = {};
  for (const r of w) { forms[r.arabic] = (forms[r.arabic] || 0) + 1; means[r.meaning_tr] = (means[r.meaning_tr] || 0) + 1; }
  console.log("formlar:", JSON.stringify(forms));
  console.log("kelime anlamları:", JSON.stringify(means));
  console.log("\nayet listesi:", w.map(r => r.verse_key).join(", "));

  // birkaç örnek ayetin tam metni (bağlam)
  console.log("\n=== örnek ayetler (bağlam) ===");
  for (const vk of ["2:223", "3:37", "19:8"]) {
    const v = (await db.execute({ sql: "SELECT arabic_text, primary_translation FROM verses WHERE verse_key=?", args: [vk] })).rows[0];
    if (v) console.log(`  ${vk}: ${v.arabic_text}\n     => ${v.primary_translation}`);
  }
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
