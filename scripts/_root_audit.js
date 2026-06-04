// SALT-OKUNUR: root_meanings tablosunda anlamsız/şüpheli kökleri tarar.
const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const isAr = s => /^[؀-ۿ\s]+$/.test(s || "");

(async () => {
  const rm = (await db.execute("SELECT id, root, meaning_tr FROM root_meanings")).rows;
  console.log("root_meanings toplam:", rm.rows ? rm.rows.length : rm.length);

  // kelime sayılarını tek sorguda al
  const wc = {};
  for (const r of (await db.execute("SELECT root, COUNT(*) n FROM words WHERE root IS NOT NULL AND root<>'' GROUP BY root")).rows) wc[r.root] = Number(r.n);

  const emptyMeaning = [], nonArabic = [], badLen = [], orphan = [], dup = {};
  const seen = {};
  for (const r of rm) {
    const root = r.root || "";
    seen[root] = (seen[root] || 0) + 1;
    if (!r.meaning_tr || !String(r.meaning_tr).trim()) emptyMeaning.push(root);
    if (!isAr(root)) nonArabic.push(root);
    const len = [...root].length;
    if (len < 2 || len > 5) badLen.push(`${root}(${len})`);
    if (!wc[root]) orphan.push(root);
  }
  for (const [k, v] of Object.entries(seen)) if (v > 1) dup[k] = v;

  console.log("\n— boş anlamlı kök:", emptyMeaning.length, emptyMeaning.slice(0, 20).join(" "));
  console.log("— Arapça-olmayan kök:", nonArabic.length, JSON.stringify(nonArabic.slice(0, 20)));
  console.log("— tuhaf uzunluk (<2 veya >5):", badLen.length, badLen.slice(0, 30).join(" "));
  console.log("— tekrar eden kök:", Object.keys(dup).length, JSON.stringify(dup));
  console.log("— öksüz (0 kelime) kök:", orphan.length);
  if (orphan.length && orphan.length <= 40) console.log("   ", orphan.join(" "));
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
