/**
 * apply-meaning-corrections-v1_8.mjs
 *
 * Patch A: 6 kelime `meaning_tr` düzeltmesi (ثَمَّ/فَثَمَّ, ٱلصَّفَا, لَدَى).
 * Patch B: 1 `root_meanings` satırı (معي) — yalnız meaning_tr.
 *
 * DOKUNULMAZ: root, lemma, pos, morphology, short_tr; 52 proper-name root;
 * Yesrib/ثرب; diğer tüm alanlar. Her UPDATE guard'lı:
 *   `SET meaning_tr=? WHERE id=? AND meaning_tr=?<eski yanlış>`
 *   → eski değer eşleşmezse 0 rowsAffected (fail-closed); 2. çalıştırma no-op.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-meaning-corrections-v1_8.mjs         # DRY
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-meaning-corrections-v1_8.mjs --apply  # yerel + Turso
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "../..");
const LOCAL_DB = path.join(REPO, "data", "app.db");
const OUT_DIR = path.join(REPO, "data", "candidates", "morphology", "final-v1_8", "surgical-v1_8");
const BACKUP_DIR = path.join(REPO, "backups");
const APPLY = process.argv.includes("--apply");

// { table, id, key(for report), old, new }
const WORDS = [
  { id: 2046,  key: "2:115:6 فَثَمَّ", old: "sonra, ardından", neu: "orada" },
  { id: 47552, key: "26:64:2 ثَمَّ",  old: "sonra, ardından", neu: "orada" },
  { id: 74841, key: "76:20:3 ثَمَّ",  old: "sonra, ardından", neu: "orada" },
  { id: 75672, key: "81:21:2 ثَمَّ",  old: "sonra, ardından", neu: "orada" },
  { id: 2822,  key: "2:158:2 ٱلصَّفَا", old: "saf ve temiz taş", neu: "Safa (tepe/kutsal mekân)" },
  { id: 60401, key: "40:18:6 لَدَى",  old: "çekişen", neu: "yanında" },
];
const RM = { id: 1780, root: "معي", old: "benimle, yanımda, yanında, taşımak", neu: "beraberlik, eşlik; birlikte bulunma" };

function die(msg) { console.error(`\n✖ FAIL-CLOSED: ${msg}`); process.exit(1); }
const norm = (v) => (v === null || v === undefined ? "" : String(v));
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
function sha256(f) { return crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"); }

if (!fs.existsSync(LOCAL_DB)) die(`local app.db yok`);

// ── GATE (yerel): mevcut meaning_tr == eski yanlış değer ─────────────────────
const local = new DatabaseSync(LOCAL_DB, { readOnly: !APPLY });
const selW = local.prepare("SELECT verse_key, word_index, arabic, meaning_tr FROM words WHERE id = ?");
const selRM = local.prepare("SELECT root, meaning_tr, short_tr FROM root_meanings WHERE id = ?");
for (const t of WORDS) {
  const r = selW.get(t.id); if (!r) die(`words id=${t.id} yok`);
  if (norm(r.meaning_tr) !== t.old) die(`words id=${t.id} meaning_tr=${JSON.stringify(r.meaning_tr)} ≠ beklenen eski ${JSON.stringify(t.old)}`);
}
const rmRow = selRM.get(RM.id); if (!rmRow) die(`root_meanings id=${RM.id} yok`);
if (norm(rmRow.root) !== RM.root) die(`root_meanings id=${RM.id} root=${JSON.stringify(rmRow.root)} ≠ ${RM.root}`);
if (norm(rmRow.meaning_tr) !== RM.old) die(`root_meanings id=${RM.id} meaning_tr=${JSON.stringify(rmRow.meaning_tr)} ≠ beklenen eski ${JSON.stringify(RM.old)}`);
const rmSingle = local.prepare("SELECT COUNT(*) c FROM root_meanings WHERE root = ?").get(RM.root).c;
if (rmSingle !== 1) die(`root='${RM.root}' için ${rmSingle} satır (tek satır bekleniyor)`);
const wc0 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rc0 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
console.log("── meaning-corrections v1.8 ──");
console.log(`GATE yerel: 6 word meaning_tr + 1 root_meanings eski değerleri eşleşti · root='${RM.root}' tek satır`);

// ── GATE (Turso): mevcut değerler eski yanlış değerle eşleşmeli ──────────────
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) die("TURSO_DB_URL / TURSO_AUTH_TOKEN yok (--env-file=apps/web/.env.local?)");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
async function tget(sql, args) { return (await turso.execute({ sql, args })).rows; }
for (const t of WORDS) {
  const r = (await tget("SELECT meaning_tr FROM words WHERE id=?", [t.id]))[0];
  if (!r) die(`Turso words id=${t.id} yok`);
  if (norm(r.meaning_tr) !== t.old) die(`Turso words id=${t.id} meaning_tr=${JSON.stringify(r.meaning_tr)} ≠ eski ${JSON.stringify(t.old)}`);
}
const trm = (await tget("SELECT root, meaning_tr FROM root_meanings WHERE id=?", [RM.id]))[0];
if (!trm || norm(trm.meaning_tr) !== RM.old) die(`Turso root_meanings id=${RM.id} eski değer eşleşmiyor`);
console.log(`GATE Turso: 6 word + 1 root_meanings eski değerleri eşleşti`);

// ── Yedek + reverse SQL ──────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const localBackup = path.join(BACKUP_DIR, `app-before-meaning-corrections-v1_8-${ts}.db`);
fs.copyFileSync(LOCAL_DB, localBackup);
const preImage = {
  words: WORDS.map((t) => ({ id: t.id, key: t.key, meaning_tr: t.old })),
  root_meanings: [{ id: RM.id, root: RM.root, meaning_tr: RM.old }],
};
fs.writeFileSync(path.join(OUT_DIR, "meaning-corrections-pre-image.json"), JSON.stringify(preImage, null, 2) + "\n", "utf-8");
const reverse = [
  "-- meaning-corrections reverse: eski değerleri geri yaz (guard'lı)",
  "BEGIN;",
  ...WORDS.map((t) => `UPDATE words SET meaning_tr=${sqlStr(t.old)} WHERE id=${t.id} AND meaning_tr=${sqlStr(t.neu)};`),
  `UPDATE root_meanings SET meaning_tr=${sqlStr(RM.old)} WHERE id=${RM.id} AND meaning_tr=${sqlStr(RM.neu)};`,
  "COMMIT;",
];
fs.writeFileSync(path.join(OUT_DIR, "meaning-corrections-reverse.sql"), reverse.join("\n") + "\n", "utf-8");
console.log(`yerel yedek : ${path.relative(REPO, localBackup)}`);
console.log(`pre-image   : surgical-v1_8/meaning-corrections-pre-image.json`);

if (!APPLY) {
  console.log(`\nDRY bitti — hiçbir yazım yapılmadı.`);
  console.log(`Uygulamak için: node --env-file=apps/web/.env.local scripts/morphology/apply-meaning-corrections-v1_8.mjs --apply`);
  process.exit(0);
}

// ── Yerel uygulama (guard'lı) ────────────────────────────────────────────────
let la = 0;
local.exec("BEGIN");
try {
  for (const t of WORDS) la += Number(local.prepare("UPDATE words SET meaning_tr=? WHERE id=? AND meaning_tr=?").run(t.neu, t.id, t.old).changes);
  la += Number(local.prepare("UPDATE root_meanings SET meaning_tr=? WHERE id=? AND meaning_tr=?").run(RM.neu, RM.id, RM.old).changes);
  local.exec("COMMIT");
} catch (e) { local.exec("ROLLBACK"); die(`yerel uygulama hatası: ${e.message}`); }
if (la !== 7) die(`yerel rowsAffected ${la} ≠ 7`);
// 2. çalıştırma no-op
let la2 = 0;
for (const t of WORDS) la2 += Number(local.prepare("UPDATE words SET meaning_tr=? WHERE id=? AND meaning_tr=?").run(t.neu, t.id, t.old).changes);
la2 += Number(local.prepare("UPDATE root_meanings SET meaning_tr=? WHERE id=? AND meaning_tr=?").run(RM.neu, RM.id, RM.old).changes);
if (la2 !== 0) die(`yerel 2. çalıştırma no-op değil: ${la2}`);
const integrity = local.prepare("PRAGMA integrity_check").get().integrity_check;
const wc1 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rc1 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
if (integrity !== "ok") die(`integrity ${integrity}`);
if (wc1 !== wc0) die(`words satır sayısı değişti ${wc0}→${wc1}`);
if (rc1 !== rc0) die(`root_meanings satır sayısı değişti ${rc0}→${rc1}`);
console.log(`\nYEREL apply : ${la} hücre (6 word + 1 root_meaning) · 2. çalıştırma no-op · integrity=${integrity} · words=${wc1} · root_meanings=${rc1}`);
local.close();

// ── Turso uygulama (guard'lı, transactional) ─────────────────────────────────
const stmts = [
  ...WORDS.map((t) => ({ sql: "UPDATE words SET meaning_tr=? WHERE id=? AND meaning_tr=?", args: [t.neu, t.id, t.old] })),
  { sql: "UPDATE root_meanings SET meaning_tr=? WHERE id=? AND meaning_tr=?", args: [RM.neu, RM.id, RM.old] },
];
const res = await turso.batch(stmts, "write");
const ta = res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
if (ta !== 7) die(`Turso rowsAffected ${ta} ≠ 7 — pre-image ile geri al!`);
// post-verify
for (const t of WORDS) { const r = (await tget("SELECT meaning_tr FROM words WHERE id=?", [t.id]))[0]; if (norm(r.meaning_tr) !== t.neu) die(`Turso post id=${t.id} ${JSON.stringify(r.meaning_tr)} ≠ ${t.neu}`); }
const trm2 = (await tget("SELECT meaning_tr FROM root_meanings WHERE id=?", [RM.id]))[0];
if (norm(trm2.meaning_tr) !== RM.neu) die(`Turso post root_meanings ${JSON.stringify(trm2.meaning_tr)} ≠ ${RM.neu}`);
console.log(`TURSO apply : ${ta} hücre · post-verify OK`);

fs.writeFileSync(path.join(OUT_DIR, "meaning-corrections-apply-report.json"), JSON.stringify({
  schema_version: "meaning-corrections-v1_8-apply", applied: true,
  word_cells: 6, root_meaning_cells: 1,
  local_backup: path.relative(REPO, localBackup),
  pre_image: "data/candidates/morphology/final-v1_8/surgical-v1_8/meaning-corrections-pre-image.json",
  reverse_sql: "data/candidates/morphology/final-v1_8/surgical-v1_8/meaning-corrections-reverse.sql",
  local: { rows_affected: la, second_run_noop: la2 === 0, integrity, words: wc1, root_meanings: rc1 },
  turso: { rows_affected: ta },
  local_sha_after: sha256(LOCAL_DB),
  changes: [...WORDS.map((t) => ({ key: t.key, id: t.id, old: t.old, new: t.neu })),
            { key: `root_meanings ${RM.root}`, id: RM.id, old: RM.old, new: RM.neu }],
}, null, 2) + "\n", "utf-8");
console.log(`\napply-report: surgical-v1_8/meaning-corrections-apply-report.json`);
console.log("\n✔ meaning-corrections uygulandı (yerel + Turso).");
