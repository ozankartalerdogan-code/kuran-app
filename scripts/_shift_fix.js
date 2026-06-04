// 6 kayık ayetin kelime↔kök/anlam hizalamasını düzeltir.
// Varsayılan DRY-RUN (sadece önce→sonra basar). APPLY=1 ile uygular (yedek + transaction).
const fs = require("fs");
const path = require("path");
for (const l of fs.readFileSync(path.resolve(__dirname, "..", "apps", "web", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { createClient } = require("@libsql/client");
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.env.APPLY === "1";

// shiftDown: new(i) = old(i-1)  (+1 kayma geri alımı)
// shiftUp:   new(i) = old(i+1)  (-1 kayma geri alımı)
// author:    new(i) = {root, meaning}  (sınır kelimesi)
const CFG = {
  "2:72":  [ { t: "author", i: 5, root: null, meaning: "siz" }, { t: "down", from: 6, to: 11 } ],
  "2:181": [ { t: "author", i: 4, root: null, meaning: "ne" }, { t: "down", from: 5, to: 14 } ],
  "8:6":   [ { t: "author", i: 5, root: null, meaning: "ne" }, { t: "down", from: 6, to: 12 } ],
  "13:37": [ { t: "author", i: 9, root: null, meaning: "ne" }, { t: "down", from: 10, to: 12 },
             { t: "author", i: 15, root: null, meaning: "-den, -dan" }, { t: "down", from: 16, to: 20 } ],
  "15:7":  [ { t: "up", from: 2, to: 6 }, { t: "author", i: 7, root: "صدق", meaning: "sadıklar" } ],
  "36:22": [ { t: "up", from: 3, to: 6 }, { t: "author", i: 7, root: "رجع", meaning: "döndürülürsünüz" } ],
};

(async () => {
  const backup = {};
  const updates = [];
  for (const [vk, ops] of Object.entries(CFG)) {
    const rows = (await db.execute({ sql: "SELECT word_index, arabic, root, meaning_tr FROM words WHERE verse_key=? ORDER BY word_index", args: [vk] })).rows;
    backup[vk] = rows.map(r => ({ word_index: r.word_index, root: r.root, meaning_tr: r.meaning_tr }));
    const old = {};
    for (const r of rows) old[r.word_index] = { root: r.root, meaning: r.meaning_tr, arabic: r.arabic };
    const next = {}; // word_index -> {root, meaning}
    for (const op of ops) {
      if (op.t === "author") next[op.i] = { root: op.root, meaning: op.meaning };
      else if (op.t === "down") for (let i = op.from; i <= op.to; i++) next[i] = { root: old[i - 1].root, meaning: old[i - 1].meaning };
      else if (op.t === "up")   for (let i = op.from; i <= op.to; i++) next[i] = { root: old[i + 1].root, meaning: old[i + 1].meaning };
    }
    console.log(`\n================ ${vk} ================`);
    for (const i of Object.keys(next).map(Number).sort((a, b) => a - b)) {
      const o = old[i], n = next[i];
      const changed = (o.root || null) !== (n.root || null) || (o.meaning || null) !== (n.meaning || null);
      console.log(`  #${String(i).padStart(2)} ${String(o.arabic).padEnd(16)} kök: ${String(o.root || "-").padEnd(7)}→ ${String(n.root || "-").padEnd(7)} | anlam: "${o.meaning || "-"}" → "${n.meaning || "-"}"  ${changed ? "" : "(aynı)"}`);
      if (changed) updates.push({ sql: "UPDATE words SET root=?, meaning_tr=? WHERE verse_key=? AND word_index=?", args: [n.root, n.meaning, vk, i] });
    }
  }
  console.log(`\nToplam değişecek kelime: ${updates.length}`);

  if (!APPLY) { console.log("\n[DRY-RUN] Uygulanmadı. APPLY=1 ile uygula."); return; }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bp = path.resolve(__dirname, `_shift_fix_backup_${stamp}.json`);
  fs.writeFileSync(bp, JSON.stringify(backup, null, 2), "utf8");
  console.log(`\nYedek: ${bp}`);
  await db.batch(updates, "write");
  console.log(`✓ ${updates.length} kelime güncellendi (transaction commit).`);
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
