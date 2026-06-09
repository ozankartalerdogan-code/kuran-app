/**
 * sync-fark-to-turso.mjs
 * Bu oturumda fark_analizi değişen ayetleri (literal'i değişen 583) + 15:6 literal_ceviri'yi
 * yerel app.db'den Turso'ya gönderir. DeepSeek API kullanmaz.
 *
 *   node --env-file=apps/web/.env.local scripts/sync-fark-to-turso.mjs [--dry]
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const dir = path.dirname(fileURLToPath(import.meta.url));
const local = new DatabaseSync(path.resolve(dir, "../data/app.db"), { readOnly: true });

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO bilgileri yok."); process.exit(1); }
const turso = createClient({ url, authToken });

// fark_analizi değişen tüm verse_key'ler = literal_backup'lardaki 583
const keys = new Set();
for (const f of fs.readdirSync(dir)) {
  if (f.startsWith("_literal_backup_") && f.endsWith(".json")) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"))) keys.add(r.verse_key);
  }
}
const arr = [...keys];
console.log(`fark_analizi sync edilecek: ${arr.length} ayet${DRY ? " (DRY)" : ""}`);

const sel = local.prepare("SELECT fark_analizi, literal_ceviri FROM verses WHERE verse_key=?");
if (DRY) {
  const s = sel.get(arr[0]);
  console.log("örnek:", arr[0], "→", (s.fark_analizi || "").slice(0, 70));
  process.exit(0);
}

let ok = 0;
const BATCH = 100;
for (let i = 0; i < arr.length; i += BATCH) {
  const slice = arr.slice(i, i + BATCH);
  const stmts = slice.map((vk) => ({
    sql: "UPDATE verses SET fark_analizi=? WHERE verse_key=?",
    args: [sel.get(vk)?.fark_analizi ?? null, vk],
  }));
  await turso.batch(stmts, "write");
  ok += slice.length;
  process.stdout.write(`\r  ${ok}/${arr.length}`);
}
// 15:6 literal_ceviri de düzeltilmişti
await turso.execute({ sql: "UPDATE verses SET literal_ceviri=? WHERE verse_key='15:6'", args: [sel.get("15:6")?.literal_ceviri ?? null] });
console.log(`\nfark_analizi: ${ok} ayet + 15:6 literal güncellendi. ✅`);
