/**
 * apply-certain-rollback-v1_8.mjs
 *
 * v1.8 merge'in Codex canlı doğruluk raporuyla YANLIŞ bulunan v1.8-eklenmiş
 * hücrelerini geri çeker (NULL). Kapsam: 65 satır / 111 hücre
 *   • 46 WRONG_LEMMA lemma
 *   • 46 co-added yanlış root (aynı 46 clitic-split token)
 *   • 19 UNRESOLVED root
 * DOKUNULMAZ: 52 WRONG_ROOT proper-name policy root'u, Türkçe kelime anlamları,
 * root_meanings, 691 VALID + 3 VALID_BROAD token.
 *
 * Her UPDATE guard'lı: `SET col=NULL WHERE id=? AND col=?<v1.8 değeri>`.
 *   → mevcut değer v1.8 değilse 0 rowsAffected (fail-closed).
 *   → ikinci uygulama no-op (col artık NULL).
 *
 * Kullanım:
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-certain-rollback-v1_8.mjs         # DRY (yalnız kapı + yedek + artefakt)
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-certain-rollback-v1_8.mjs --apply  # yerel + Turso yazım
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
const FINAL_DIR = path.join(REPO, "data", "candidates", "morphology", "final-v1_8");
const REVIEW = path.join(FINAL_DIR, "merge-review.jsonl");
const OUT_DIR = path.join(FINAL_DIR, "surgical-v1_8");
const BACKUP_DIR = path.join(REPO, "backups");

const EXPECT_SHA_POSTMERGE = "0c24bde1a60fc346ddd0e3ccbb5409d5c471cf039b8d8558cb9c44d95abd9893";
const EXPECT_ROWS = 65, EXPECT_CELLS = 111, EXPECT_LEMMA = 46, EXPECT_ROOT = 65;
const APPLY = process.argv.includes("--apply");

// ── Codex konumları ──────────────────────────────────────────────────────────
const WRONG_LEMMA = ("2:166:11 4:42:9 16:45:8 34:9:15 48:29:43 3:62:3 3:62:13 16:126:10 22:58:16 22:64:10 " +
 "26:9:3 26:68:3 26:104:3 26:122:3 26:140:3 26:159:3 26:175:3 26:191:3 27:16:16 37:60:3 37:106:3 56:95:3 " +
 "29:64:11 2:266:21 3:83:5 4:12:57 4:14:11 4:176:13 6:13:1 6:73:13 7:206:10 16:52:1 16:52:6 21:19:1 23:80:5 " +
 "27:91:10 28:70:12 30:18:1 30:26:1 30:27:10 34:1:11 45:37:1 53:21:3 55:24:1 57:11:10 64:1:11").split(" ");
const UNRESOLVED = ("2:34:8 7:11:12 15:31:2 17:61:8 18:50:8 20:116:8 26:95:2 38:74:2 3:96:7 2:248:9 20:39:4 " +
 "11:40:6 23:27:12 19:56:4 74:26:2 74:27:4 18:31:19 44:53:3 76:21:3").split(" ");
// 52 proper-name roots that MUST remain untouched (post-check guard)
const PROPER_ROOT = ("2:102:21 2:206:10 3:162:11 3:197:5 4:55:10 4:93:6 4:97:25 4:115:18 4:121:3 7:18:10 7:179:3 " +
 "8:16:18 9:73:9 9:95:14 13:18:25 14:16:3 17:97:23 18:106:3 20:74:8 36:63:2 45:10:3 50:30:3 55:43:2 58:8:35 " +
 "66:9:9 72:15:4 78:21:2 89:23:3 2:132:5 2:133:6 2:140:7 6:84:4 19:49:11 2:87:10 2:253:15 4:157:5 5:46:4 " +
 "57:27:7 26:41:5 40:37:12 28:79:16 31:13:3 3:33:5 6:84:7 7:59:3 11:25:3 21:76:1 23:23:3 29:14:3 42:13:8 " +
 "57:26:3 71:1:3").split(" ");

function die(msg) { console.error(`\n✖ FAIL-CLOSED: ${msg}`); process.exit(1); }
const norm = (v) => (v === null || v === undefined ? "" : String(v));
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

// ── 1. Yerel post-merge DB doğrula ───────────────────────────────────────────
if (!fs.existsSync(LOCAL_DB)) die(`local app.db yok: ${LOCAL_DB}`);
const localSha = sha256(LOCAL_DB);
if (localSha !== EXPECT_SHA_POSTMERGE) die(`local app.db SHA post-merge değil\n  beklenen ${EXPECT_SHA_POSTMERGE}\n  gerçek   ${localSha}`);

// ── 2. merge-review index ────────────────────────────────────────────────────
const byf = new Map(); // `${token_id}|${field}` -> record
for (const line of fs.readFileSync(REVIEW, "utf-8").split("\n")) {
  const t = line.trim(); if (!t) continue;
  const e = JSON.parse(t); byf.set(`${e.token_id}|${e.field}`, e);
}
const get = (tid, field) => byf.get(`${tid}|${field}`) || die(`merge-review'de yok: ${tid}/${field}`);

// ── 3. 111 hedef hücre (verdict provenance ile) ──────────────────────────────
const targets = [];
const add = (tid, field, verdict) => {
  const e = get(tid, field);
  if (!(e.previous_value === null || e.previous_value === "")) die(`${verdict} ${tid}/${field}: previous_value boş değil`);
  targets.push({ token_id: tid, field, db_id: Number(e.db_id), new_value: e.new_value, verdict });
};
for (const tid of WRONG_LEMMA) { add(tid, "lemma", "WRONG_LEMMA"); add(tid, "root", "WRONG_LEMMA_COADDED_ROOT"); }
for (const tid of UNRESOLVED) {
  add(tid, "root", "UNRESOLVED");
  if (byf.has(`${tid}|lemma`)) die(`UNRESOLVED ${tid} beklenmeyen lemma hücresi taşıyor (fail-closed)`);
}
const rows = new Set(targets.map((t) => t.db_id)).size;
const lemmaCells = targets.filter((t) => t.field === "lemma").length;
const rootCells = targets.filter((t) => t.field === "root").length;
if (targets.length !== EXPECT_CELLS) die(`hedef hücre ${targets.length} ≠ ${EXPECT_CELLS}`);
if (rows !== EXPECT_ROWS) die(`hedef satır ${rows} ≠ ${EXPECT_ROWS}`);
if (lemmaCells !== EXPECT_LEMMA) die(`lemma ${lemmaCells} ≠ ${EXPECT_LEMMA}`);
if (rootCells !== EXPECT_ROOT) die(`root ${rootCells} ≠ ${EXPECT_ROOT}`);
targets.sort((a, b) => (a.db_id - b.db_id) || a.field.localeCompare(b.field));

// ── 4. GATE: yerel mevcut değer == v1.8 new_value ───────────────────────────
const local = new DatabaseSync(LOCAL_DB, { readOnly: !APPLY });
const selRow = local.prepare("SELECT root, lemma FROM words WHERE id = ?");
for (const t of targets) {
  const r = selRow.get(t.db_id); if (!r) die(`local id=${t.db_id} yok`);
  if (norm(r[t.field]) !== norm(t.new_value)) die(`local id=${t.db_id} ${t.field}=${JSON.stringify(r[t.field])} ≠ beklenen ${JSON.stringify(t.new_value)}`);
}
const wordsCount0 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rmCount0 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
const properSample = PROPER_ROOT.slice(0, 8).map((tid) => {
  const e = get(tid, "root");
  return { db_id: Number(e.db_id), root: e.new_value };
});
console.log("── certain-rollback v1.8 ──");
console.log(`local SHA        : OK (post-merge)`);
console.log(`hedef            : ${rows} satır / ${targets.length} hücre (${lemmaCells} lemma + ${rootCells} root)`);
console.log(`GATE yerel değer : tüm ${targets.length} hücre v1.8 değeriyle eşleşti`);

// ── 5. Turso mevcut durumu + GATE ────────────────────────────────────────────
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) die("TURSO_DB_URL / TURSO_AUTH_TOKEN yok (--env-file=apps/web/.env.local?)");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
const ids = [...new Set(targets.map((t) => t.db_id))];
const properIds = [...new Set(properSample.map((p) => p.db_id))];
const tById = new Map();
const allIds = [...new Set([...ids, ...properIds])];
for (let i = 0; i < allIds.length; i += 400) {
  const slice = allIds.slice(i, i + 400);
  const res = await turso.execute({ sql: `SELECT id, root, lemma FROM words WHERE id IN (${slice.map(() => "?").join(",")})`, args: slice });
  for (const r of res.rows) tById.set(Number(r.id), r);
}
for (const t of targets) {
  const r = tById.get(t.db_id); if (!r) die(`Turso id=${t.db_id} yok`);
  if (norm(r[t.field]) !== norm(t.new_value)) die(`Turso id=${t.db_id} ${t.field}=${JSON.stringify(r[t.field])} ≠ beklenen v1.8 ${JSON.stringify(t.new_value)}`);
}
console.log(`GATE Turso değer : tüm ${targets.length} hücre v1.8 değeriyle eşleşti`);

// ── 6. Artefaktlar: yerel yedek + Turso pre-image backup + reverse SQL ───────
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const localBackup = path.join(BACKUP_DIR, `app-before-certain-rollback-v1_8-${ts}.db`);
fs.copyFileSync(LOCAL_DB, localBackup);

const tursoBackup = ids.map((id) => { const r = tById.get(id); return { id, root: r.root ?? null, lemma: r.lemma ?? null }; });
const tursoBackupPath = path.join(OUT_DIR, "turso-pre-rollback-backup.json");
fs.writeFileSync(tursoBackupPath, JSON.stringify(tursoBackup, null, 2) + "\n", "utf-8");
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const reverse = targets.map((t) => `UPDATE words SET ${t.field}=${sqlStr(t.new_value)} WHERE id=${t.db_id} AND (${t.field} IS NULL OR TRIM(${t.field})='');`);
fs.writeFileSync(path.join(OUT_DIR, "certain-rollback-turso-reverse.sql"),
  `-- Turso reverse: certain-rollback'ı geri al (111 hücreye v1.8 değerini yeniden yaz)\nBEGIN;\n${reverse.join("\n")}\nCOMMIT;\n`, "utf-8");
console.log(`yerel yedek      : ${path.relative(REPO, localBackup)}`);
console.log(`Turso pre-image  : ${path.relative(REPO, tursoBackupPath)} (${tursoBackup.length} satır)`);

if (!APPLY) {
  console.log(`\nDRY bitti — yerel DB ve Turso'ya HİÇBİR şey yazılmadı.`);
  console.log(`Uygulamak için: node --env-file=apps/web/.env.local scripts/morphology/apply-certain-rollback-v1_8.mjs --apply`);
  process.exit(0);
}

// ── 7. Yerel uygulama (guard'lı) ─────────────────────────────────────────────
let localAffected = 0;
local.exec("BEGIN");
try {
  for (const t of targets) {
    const stmt = local.prepare(`UPDATE words SET ${t.field}=NULL WHERE id=? AND ${t.field}=?`);
    const info = stmt.run(t.db_id, t.new_value);
    localAffected += Number(info.changes);
  }
  local.exec("COMMIT");
} catch (e) { local.exec("ROLLBACK"); die(`yerel uygulama hatası: ${e.message}`); }
if (localAffected !== EXPECT_CELLS) die(`yerel rowsAffected ${localAffected} ≠ ${EXPECT_CELLS}`);
// yerel doğrulama
const nulled = targets.filter((t) => selRow.get(t.db_id)[t.field] === null).length;
if (nulled !== EXPECT_CELLS) die(`yerel NULL hücre ${nulled} ≠ ${EXPECT_CELLS}`);
// ikinci çalıştırma no-op
let localSecond = 0;
for (const t of targets) { const s = local.prepare(`UPDATE words SET ${t.field}=NULL WHERE id=? AND ${t.field}=?`); localSecond += Number(s.run(t.db_id, t.new_value).changes); }
if (localSecond !== 0) die(`yerel ikinci çalıştırma no-op değil: ${localSecond}`);
const integrity = local.prepare("PRAGMA integrity_check").get().integrity_check;
const wordsCount1 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rmCount1 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
if (integrity !== "ok") die(`yerel integrity_check ${integrity}`);
if (wordsCount1 !== wordsCount0) die(`words satır sayısı değişti ${wordsCount0}→${wordsCount1}`);
if (rmCount1 !== rmCount0) die(`root_meanings satır sayısı değişti ${rmCount0}→${rmCount1}`);
// proper-name örnekleri değişmemiş
for (const p of properSample) { const r = selRow.get(p.db_id); if (norm(r.root) !== norm(p.root)) die(`proper-name root değişti id=${p.db_id}`); }
console.log(`\nYEREL apply      : ${localAffected} hücre NULL · 2. çalıştırma no-op · integrity=${integrity} · words=${wordsCount1} · root_meanings=${rmCount1}`);
local.close();

// ── 8. Turso uygulama (guard'lı, transactional batch) ────────────────────────
const stmts = targets.map((t) => ({ sql: `UPDATE words SET ${t.field}=NULL WHERE id=? AND ${t.field}=?`, args: [t.db_id, t.new_value] }));
let tursoAffected = 0;
for (let i = 0; i < stmts.length; i += 200) {
  const res = await turso.batch(stmts.slice(i, i + 200), "write");
  tursoAffected += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
}
if (tursoAffected !== EXPECT_CELLS) die(`Turso rowsAffected ${tursoAffected} ≠ ${EXPECT_CELLS} — pre-image ile geri al!`);
// Turso post-verify
const tById2 = new Map();
for (let i = 0; i < allIds.length; i += 400) {
  const slice = allIds.slice(i, i + 400);
  const res = await turso.execute({ sql: `SELECT id, root, lemma FROM words WHERE id IN (${slice.map(() => "?").join(",")})`, args: slice });
  for (const r of res.rows) tById2.set(Number(r.id), r);
}
const tNulled = targets.filter((t) => (tById2.get(t.db_id)?.[t.field] ?? null) === null).length;
if (tNulled !== EXPECT_CELLS) die(`Turso NULL hücre ${tNulled} ≠ ${EXPECT_CELLS}`);
for (const p of properSample) { const r = tById2.get(p.db_id); if (norm(r?.root) !== norm(p.root)) die(`Turso proper-name root değişti id=${p.db_id}`); }
console.log(`TURSO apply      : ${tursoAffected} hücre NULL · post-verify ${tNulled} NULL · proper-name örnekleri korundu`);

// ── 9. Özet artefakt ─────────────────────────────────────────────────────────
const summary = {
  schema_version: "certain-rollback-v1_8-apply",
  applied: true, rows: rows, cells: targets.length, lemma_cells: lemmaCells, root_cells: rootCells,
  local_backup: path.relative(REPO, localBackup),
  turso_pre_image: path.relative(REPO, tursoBackupPath),
  turso_reverse_sql: "data/candidates/morphology/final-v1_8/surgical-v1_8/certain-rollback-turso-reverse.sql",
  local: { rows_affected: localAffected, second_run_noop: localSecond === 0, integrity, words: wordsCount1, root_meanings: rmCount1 },
  turso: { rows_affected: tursoAffected, nulled_verified: tNulled },
  local_sha_after: sha256(LOCAL_DB),
};
fs.writeFileSync(path.join(OUT_DIR, "certain-rollback-apply-report.json"), JSON.stringify(summary, null, 2) + "\n", "utf-8");
console.log(`\napply-report     : data/candidates/morphology/final-v1_8/surgical-v1_8/certain-rollback-apply-report.json`);
console.log(`local SHA sonrası: ${summary.local_sha_after}`);
console.log("\n✔ certain-rollback uygulandı (yerel + Turso).");
