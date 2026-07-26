/**
 * apply-proper-name-root-null-v1_8.mjs
 *
 * PROPER_NAME_ROOT_NULL_PER_TOKEN: 52 proper-name + 1 Yesrib = 53 token.
 * Yalnız `words.root` → NULL. lemma / meaning_tr / pos / morphology DOKUNULMAZ.
 * Hiçbir root_meanings satırı değişmez; suppressedVisibleRoots'a ekleme yapılmaz.
 * Her UPDATE guard'lı: `SET root=NULL WHERE id=? AND root=?<beklenen>`.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-proper-name-root-null-v1_8.mjs         # DRY
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-proper-name-root-null-v1_8.mjs --apply  # yerel + Turso
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
const EXPECT = 53;

// { root(expected) : "s:a:w ..." }
const GROUPS = {
  "جهنم": "2:206:10 3:162:11 3:197:5 4:55:10 4:93:6 4:97:25 4:115:18 4:121:3 7:18:10 7:179:3 8:16:18 9:73:9 9:95:14 13:18:25 14:16:3 17:97:23 18:106:3 20:74:8 36:63:2 45:10:3 50:30:3 55:43:2 58:8:35 66:9:9 72:15:4 78:21:2 89:23:3",
  "نوح": "3:33:5 6:84:7 7:59:3 11:25:3 21:76:1 23:23:3 29:14:3 42:13:8 57:26:3 71:1:3",
  "عقب": "2:132:5 2:133:6 2:140:7 6:84:4 19:49:11",
  "عيس": "2:87:10 2:253:15 4:157:5 5:46:4 57:27:7",
  "فرعن": "26:41:5 40:37:12",
  "ببل": "2:102:21",
  "قرن": "28:79:16",
  "لقم": "31:13:3",
  "ثرب": "33:13:6",
};

function die(msg) { console.error(`\n✖ FAIL-CLOSED: ${msg}`); process.exit(1); }
const norm = (v) => (v === null || v === undefined ? "" : String(v));
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
function sha256(f) { return crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"); }

if (!fs.existsSync(LOCAL_DB)) die("local app.db yok");

// ── hedef listesi (konum → tek DB satırı) ────────────────────────────────────
const local = new DatabaseSync(LOCAL_DB, { readOnly: !APPLY });
const targets = [];
for (const [expRoot, poss] of Object.entries(GROUPS)) {
  for (const tid of poss.split(" ")) {
    const [s, a, w] = tid.split(":");
    const verse_key = `${s}:${a}`;
    const rows = local.prepare("SELECT id, root, lemma, meaning_tr FROM words WHERE verse_key=? AND word_index=?").all(verse_key, Number(w));
    if (rows.length !== 1) die(`${tid}: ${rows.length} satır eşleşti (tek satır bekleniyor)`);
    const r = rows[0];
    if (norm(r.root) !== expRoot) die(`${tid} root=${JSON.stringify(r.root)} ≠ beklenen ${JSON.stringify(expRoot)}`);
    targets.push({ token_id: tid, verse_key, word_index: Number(w), db_id: Number(r.id), expected_root: expRoot, lemma: r.lemma });
  }
}
if (targets.length !== EXPECT) die(`hedef ${targets.length} ≠ ${EXPECT}`);
if (new Set(targets.map((t) => t.db_id)).size !== EXPECT) die("db_id benzersiz değil");
targets.sort((a, b) => a.db_id - b.db_id);
const wc0 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rc0 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
console.log("── proper-name root NULL (per token) ──");
console.log(`GATE yerel : ${targets.length} konum tek satır + root beklenenle eşleşti`);

// ── Turso mevcut durum + GATE ────────────────────────────────────────────────
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) die("TURSO_DB_URL / TURSO_AUTH_TOKEN yok (--env-file=apps/web/.env.local?)");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
const ids = targets.map((t) => t.db_id);
const tById = new Map();
for (let i = 0; i < ids.length; i += 400) {
  const slice = ids.slice(i, i + 400);
  const res = await turso.execute({ sql: `SELECT id, root FROM words WHERE id IN (${slice.map(() => "?").join(",")})`, args: slice });
  for (const r of res.rows) tById.set(Number(r.id), r);
}
for (const t of targets) {
  const r = tById.get(t.db_id); if (!r) die(`Turso id=${t.db_id} yok`);
  if (norm(r.root) !== t.expected_root) die(`Turso id=${t.db_id} root=${JSON.stringify(r.root)} ≠ beklenen ${JSON.stringify(t.expected_root)}`);
}
console.log(`GATE Turso : ${targets.length} konum root beklenenle eşleşti`);

// ── yedek + reverse SQL ──────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const localBackup = path.join(BACKUP_DIR, `app-before-proper-name-root-null-v1_8-${ts}.db`);
fs.copyFileSync(LOCAL_DB, localBackup);
const preImage = targets.map((t) => ({ id: t.db_id, token_id: t.token_id, root: t.expected_root, lemma: t.lemma }));
fs.writeFileSync(path.join(OUT_DIR, "proper-name-root-null-pre-image.json"), JSON.stringify(preImage, null, 2) + "\n", "utf-8");
const reverse = ["-- proper-name root NULL reverse: eski root'ları guard'lı geri yaz", "BEGIN;",
  ...targets.map((t) => `UPDATE words SET root=${sqlStr(t.expected_root)} WHERE id=${t.db_id} AND (root IS NULL OR TRIM(root)='');`), "COMMIT;"];
fs.writeFileSync(path.join(OUT_DIR, "proper-name-root-null-reverse.sql"), reverse.join("\n") + "\n", "utf-8");
console.log(`yerel yedek: ${path.relative(REPO, localBackup)}`);
console.log(`pre-image  : surgical-v1_8/proper-name-root-null-pre-image.json`);

if (!APPLY) {
  console.log(`\nDRY bitti — hiçbir yazım yapılmadı.`);
  console.log(`Uygulamak için: node --env-file=apps/web/.env.local scripts/morphology/apply-proper-name-root-null-v1_8.mjs --apply`);
  process.exit(0);
}

// ── yerel uygulama (guard'lı) ────────────────────────────────────────────────
let la = 0;
local.exec("BEGIN");
try {
  for (const t of targets) la += Number(local.prepare("UPDATE words SET root=NULL WHERE id=? AND root=?").run(t.db_id, t.expected_root).changes);
  local.exec("COMMIT");
} catch (e) { local.exec("ROLLBACK"); die(`yerel uygulama hatası: ${e.message}`); }
if (la !== EXPECT) die(`yerel rowsAffected ${la} ≠ ${EXPECT}`);
const nulled = targets.filter((t) => local.prepare("SELECT root FROM words WHERE id=?").get(t.db_id).root === null).length;
if (nulled !== EXPECT) die(`yerel NULL ${nulled} ≠ ${EXPECT}`);
let la2 = 0;
for (const t of targets) la2 += Number(local.prepare("UPDATE words SET root=NULL WHERE id=? AND root=?").run(t.db_id, t.expected_root).changes);
if (la2 !== 0) die(`yerel 2. çalıştırma no-op değil: ${la2}`);
const integrity = local.prepare("PRAGMA integrity_check").get().integrity_check;
const wc1 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rc1 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
if (integrity !== "ok") die(`integrity ${integrity}`);
if (wc1 !== wc0) die(`words satır sayısı değişti ${wc0}→${wc1}`);
if (rc1 !== rc0) die(`root_meanings satır sayısı değişti ${rc0}→${rc1}`);
// lemma korundu mu?
for (const t of targets) { const r = local.prepare("SELECT lemma FROM words WHERE id=?").get(t.db_id); if (norm(r.lemma) !== norm(t.lemma)) die(`lemma değişti id=${t.db_id}`); }
console.log(`\nYEREL apply: ${la} root NULL · 2. çalıştırma no-op · integrity=${integrity} · words=${wc1} · root_meanings=${rc1} · lemma korundu`);
local.close();

// ── Turso uygulama (guard'lı, transactional) ─────────────────────────────────
const stmts = targets.map((t) => ({ sql: "UPDATE words SET root=NULL WHERE id=? AND root=?", args: [t.db_id, t.expected_root] }));
let ta = 0;
for (let i = 0; i < stmts.length; i += 200) {
  const res = await turso.batch(stmts.slice(i, i + 200), "write");
  ta += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
}
if (ta !== EXPECT) die(`Turso rowsAffected ${ta} ≠ ${EXPECT} — pre-image ile geri al!`);
const tById2 = new Map();
for (let i = 0; i < ids.length; i += 400) {
  const slice = ids.slice(i, i + 400);
  const res = await turso.execute({ sql: `SELECT id, root FROM words WHERE id IN (${slice.map(() => "?").join(",")})`, args: slice });
  for (const r of res.rows) tById2.set(Number(r.id), r);
}
const tNulled = targets.filter((t) => (tById2.get(t.db_id)?.root ?? null) === null).length;
if (tNulled !== EXPECT) die(`Turso NULL ${tNulled} ≠ ${EXPECT}`);
console.log(`TURSO apply: ${ta} root NULL · post-verify ${tNulled} NULL`);

fs.writeFileSync(path.join(OUT_DIR, "proper-name-root-null-apply-report.json"), JSON.stringify({
  schema_version: "proper-name-root-null-v1_8-apply", applied: true, tokens: EXPECT, cells: EXPECT,
  local_backup: path.relative(REPO, localBackup),
  pre_image: "data/candidates/morphology/final-v1_8/surgical-v1_8/proper-name-root-null-pre-image.json",
  reverse_sql: "data/candidates/morphology/final-v1_8/surgical-v1_8/proper-name-root-null-reverse.sql",
  local: { rows_affected: la, second_run_noop: la2 === 0, integrity, words: wc1, root_meanings: rc1 },
  turso: { rows_affected: ta, nulled_verified: tNulled },
  local_sha_after: sha256(LOCAL_DB),
}, null, 2) + "\n", "utf-8");
console.log(`\napply-report: surgical-v1_8/proper-name-root-null-apply-report.json`);
console.log("\n✔ proper-name root NULL uygulandı (yerel + Turso).");
