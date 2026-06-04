// SALT-OKUNUR: 6 kayık ayetin kelime-kök-anlam dökümü.
const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const VERSES = ["2:72", "2:181", "8:6", "13:37", "15:7", "36:22"];

(async () => {
  // sutun adlarini ogren
  const cols = await db.execute("PRAGMA table_info(words)");
  console.log("words sütunları:", cols.rows.map(r => r.name).join(", "), "\n");

  for (const vk of VERSES) {
    const r = await db.execute({
      sql: "SELECT word_index, arabic, root, meaning_tr FROM words WHERE verse_key=? ORDER BY word_index",
      args: [vk],
    });
    console.log(`================ ${vk} ================`);
    for (const w of r.rows) {
      console.log(`  #${String(w.word_index).padStart(2)}  ${String(w.arabic).padEnd(18)}  kök=${String(w.root || "-").padEnd(8)}  ${w.meaning_tr || ""}`);
    }
    console.log("");
  }
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
