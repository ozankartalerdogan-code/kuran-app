/**
 * sync-glosses-to-turso.mjs
 * _gloss_all_corrections.json içindeki gloss düzeltmelerini Turso'ya replay eder.
 * Faz A (en dolu): (meaning_tr, gloss_en) ile eşle. Faz B (en boş): (arabic, meaning_tr) ile eşle.
 *   node --env-file=apps/web/.env.local scripts/sync-glosses-to-turso.mjs [--dry]
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const dir = path.dirname(fileURLToPath(import.meta.url));
const corr = JSON.parse(fs.readFileSync(path.join(dir, "_gloss_all_corrections.json"), "utf-8"));

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO bilgileri yok."); process.exit(1); }
const turso = createClient({ url, authToken });

console.log(`Sync edilecek düzeltme: ${corr.length}${DRY ? " (DRY)" : ""}`);

function stmtFor(c) {
  if (c.en && c.en.trim() !== "") {
    return { sql: "UPDATE words SET meaning_tr=? WHERE source='canonical_word_analysis' AND meaning_tr=? AND gloss_en=?", args: [c.dogru, c.tr, c.en] };
  }
  return { sql: "UPDATE words SET meaning_tr=? WHERE source='canonical_word_analysis' AND arabic=? AND meaning_tr=? AND (gloss_en IS NULL OR trim(gloss_en)='')", args: [c.dogru, c.ar, c.tr] };
}

if (DRY) {
  console.log("örnek:", JSON.stringify(stmtFor(corr[0])));
  process.exit(0);
}

let done = 0, affected = 0;
const BATCH = 100;
for (let i = 0; i < corr.length; i += BATCH) {
  const slice = corr.slice(i, i + BATCH);
  const res = await turso.batch(slice.map(stmtFor), "write");
  affected += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
  done += slice.length;
  process.stdout.write(`\r  ${done}/${corr.length} (etkilenen satır: ${affected})`);
}
console.log(`\n✅ Gloss sync bitti. ${done} düzeltme, ${affected} kelime satırı güncellendi.`);

// Doğrulama
const v = await turso.execute("SELECT arabic, meaning_tr FROM words WHERE verse_key='1:6' AND word_index=3");
console.log("Doğrulama 1:6 ٱلۡمُسۡتَقِيمَ →", v.rows[0]?.meaning_tr);
