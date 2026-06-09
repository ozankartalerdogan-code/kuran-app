/**
 * sync-to-turso.mjs
 *
 * Bu oturumda yerel data/app.db'de değişen verileri Turso'ya gönderir:
 *   1. verses.literal_ceviri  → yedek JSON'lardaki verse_key'ler (regenerate edilenler)
 *   2. elifba_quiz            → tüm satırlar (soru/secenekler/dogru_cevap düzeltmeleri)
 *
 * Kullanım:
 *   node --env-file=apps/web/.env.local scripts/sync-to-turso.mjs [--dry]
 */

import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(dir, "..");
const LOCAL_DB = path.join(ROOT, "data", "app.db");

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Hata: TURSO_DB_URL / TURSO_AUTH_TOKEN bulunamadı.");
  process.exit(1);
}

const local = new DatabaseSync(LOCAL_DB, { readOnly: true });
const turso = createClient({ url, authToken });

// ── 1. Değişen verse_key'leri yedeklerden topla ──────────────────────────────
const backups = fs.readdirSync(dir).filter((f) => f.startsWith("_literal_backup_") && f.endsWith(".json"));
const verseKeys = new Set();
for (const b of backups) {
  const arr = JSON.parse(fs.readFileSync(path.join(dir, b), "utf-8"));
  for (const r of arr) verseKeys.add(r.verse_key);
}
console.log(`Yedeklerden ${verseKeys.size} değişen verse_key bulundu (literal_ceviri).`);

// ── 2. elifba_quiz tüm satırlar ──────────────────────────────────────────────
const quizRows = local.prepare("SELECT quiz_id, soru, secenekler, dogru_cevap FROM elifba_quiz").all();
console.log(`elifba_quiz: ${quizRows.length} satır gönderilecek.`);

if (DRY) {
  console.log("\n(DRY) Yazma yapılmadı. Örnek:");
  const sample = local.prepare("SELECT verse_key, literal_ceviri FROM verses WHERE verse_key = ?").get([...verseKeys][0]);
  console.log(" verses:", sample);
  console.log(" quiz[0]:", quizRows[0]);
  process.exit(0);
}

// ── verses.literal_ceviri güncelle ───────────────────────────────────────────
let vOk = 0, vFail = 0;
const sel = local.prepare("SELECT literal_ceviri FROM verses WHERE verse_key = ?");
const keysArr = [...verseKeys];
const BATCH = 100;
for (let i = 0; i < keysArr.length; i += BATCH) {
  const slice = keysArr.slice(i, i + BATCH);
  const stmts = slice.map((vk) => ({
    sql: "UPDATE verses SET literal_ceviri = ? WHERE verse_key = ?",
    args: [sel.get(vk)?.literal_ceviri ?? null, vk],
  }));
  try {
    await turso.batch(stmts, "write");
    vOk += slice.length;
    process.stdout.write(`\r  verses: ${vOk}/${keysArr.length}`);
  } catch (e) {
    vFail += slice.length;
    console.error(`\n  batch hata (${i}):`, e.message);
  }
}
console.log(`\nverses tamam: ${vOk} ok, ${vFail} hata`);

// ── elifba_quiz güncelle ─────────────────────────────────────────────────────
const quizStmts = quizRows.map((r) => ({
  sql: "UPDATE elifba_quiz SET soru = ?, secenekler = ?, dogru_cevap = ? WHERE quiz_id = ?",
  args: [r.soru, r.secenekler, r.dogru_cevap, r.quiz_id],
}));
try {
  await turso.batch(quizStmts, "write");
  console.log(`elifba_quiz tamam: ${quizStmts.length} satır güncellendi.`);
} catch (e) {
  console.error("elifba_quiz hata:", e.message);
}

console.log("\n✅ Sync bitti.");
