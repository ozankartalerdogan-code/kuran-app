/**
 * apply-aad-homograph-fix-v1_8.mjs
 *
 * `عاد / يعود` homograf düzeltmesi: 4 fiil çekimi yanlışlıkla "âd kavmi"
 * (Ād kavmi özel adı) olarak etiketlenmiş. Yalnız `meaning_tr` düzeltilir.
 *
 * DOKUNULMAZ: lemma (عادَ), root (عود), pos, morphology, arabic, confidence,
 * source, Buckwalter/alignment kayıtları, diğer tüm satır ve alanlar.
 * Aynı root'taki 24 gerçek "âd kavmi" ismi (عَادٌ/عَادٍ/…) dokunulmaz.
 *
 * Her UPDATE guard'lı:  SET meaning_tr=? WHERE id=? AND meaning_tr='âd kavmi'
 *   → eski değer eşleşmezse 0 rowsAffected (fail-closed); 2. çalıştırma no-op.
 * Toplam etkilenen hücre tam 4 değilse yazma geri alınır / durulur.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-aad-homograph-fix-v1_8.mjs         # DRY
 *   node --env-file=apps/web/.env.local scripts/morphology/apply-aad-homograph-fix-v1_8.mjs --apply  # yerel + Turso
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

const OLD = "âd kavmi";
const EXPECTED_CELLS = 4;

// arabic/lemma alanları kaynaktaki tam kod noktalarıyla yazıldı (DB NFC-normalize
// DEĞİL: ör. shadda 0651 fatha 064e'den önce geliyor) — normalizasyon-bağımsız gate.
const WORDS = [
  { id: 20692, key: "7:89:19", arabic: "\u0646\u0651\u064e\u0639\u064f\u0648\u062f\u064e", lemma: "\u0639\u0627\u062f\u064e", root: "\u0639\u0648\u062f", old: OLD, neu: "dönersek" },
  { id: 23109, key: "8:38:12", arabic: "\u064a\u064e\u0639\u064f\u0648\u062f\u064f\u0648\u0627\u0652", lemma: "\u0639\u0627\u062f\u064e", root: "\u0639\u0648\u062f", old: OLD, neu: "dönerlerse" },
  { id: 44809, key: "23:107:5", arabic: "\u0639\u064f\u062f\u06e1\u0646\u064e\u0627", lemma: "\u0639\u0627\u062f\u064e", root: "\u0639\u0648\u062f", old: OLD, neu: "dönersek" },
  { id: 70019, key: "58:8:9", arabic: "\u064a\u064e\u0639\u064f\u0648\u062f\u064f\u0648\u0646\u064e", lemma: "\u0639\u0627\u062f\u064e", root: "\u0639\u0648\u062f", old: OLD, neu: "tekrar ediyorlar" },
];

function die(msg) { console.error(`\n✖ FAIL-CLOSED: ${msg}`); process.exit(1); }
const norm = (v) => (v === null || v === undefined ? "" : String(v));
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
function sha256(f) { return crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"); }

if (WORDS.length !== EXPECTED_CELLS) die(`hedef listesi ${WORDS.length} ≠ ${EXPECTED_CELLS}`);
if (!fs.existsSync(LOCAL_DB)) die("local app.db yok");

// ── GATE (yerel): meaning_tr tam 'âd kavmi', lemma/root beklenen ─────────────
const local = new DatabaseSync(LOCAL_DB, { readOnly: !APPLY });
const selW = local.prepare("SELECT verse_key, word_index, arabic, lemma, root, meaning_tr FROM words WHERE id = ?");
for (const t of WORDS) {
  const r = selW.get(t.id);
  if (!r) die(`words id=${t.id} yok`);
  const wantKey = `${r.verse_key}:${r.word_index}`;
  if (wantKey !== t.key) die(`words id=${t.id} konum ${wantKey} ≠ beklenen ${t.key}`);
  if (norm(r.meaning_tr) !== t.old) die(`words id=${t.id} (${t.key}) meaning_tr=${JSON.stringify(r.meaning_tr)} ≠ beklenen ${JSON.stringify(t.old)}`);
  if (norm(r.lemma) !== t.lemma) die(`words id=${t.id} lemma=${JSON.stringify(r.lemma)} ≠ ${t.lemma}`);
  if (norm(r.root) !== t.root) die(`words id=${t.id} root=${JSON.stringify(r.root)} ≠ ${t.root}`);
  if (norm(r.arabic) !== t.arabic) die(`words id=${t.id} arabic=${JSON.stringify(r.arabic)} ≠ ${t.arabic}`);
}
const wc0 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const aad0 = local.prepare("SELECT COUNT(*) c FROM words WHERE meaning_tr = ?").get(OLD).c;
console.log("── عاد/يعود homograf düzeltmesi (v1.8 surgical) ──");
console.log(`GATE yerel : 4/4 id konum+arabic+lemma+root+meaning_tr eşleşti · toplam 'âd kavmi' hücresi=${aad0}`);

// ── GATE (Turso) ─────────────────────────────────────────────────────────────
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) die("TURSO_DB_URL / TURSO_AUTH_TOKEN yok (--env-file=apps/web/.env.local?)");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
async function tget(sql, args) { return (await turso.execute({ sql, args })).rows; }
for (const t of WORDS) {
  const r = (await tget("SELECT verse_key, word_index, arabic, lemma, root, meaning_tr FROM words WHERE id=?", [t.id]))[0];
  if (!r) die(`Turso words id=${t.id} yok`);
  if (`${r.verse_key}:${r.word_index}` !== t.key) die(`Turso id=${t.id} konum ${r.verse_key}:${r.word_index} ≠ ${t.key}`);
  if (norm(r.meaning_tr) !== t.old) die(`Turso id=${t.id} (${t.key}) meaning_tr=${JSON.stringify(r.meaning_tr)} ≠ ${JSON.stringify(t.old)}`);
  if (norm(r.lemma) !== t.lemma) die(`Turso id=${t.id} lemma=${JSON.stringify(r.lemma)} ≠ ${t.lemma}`);
  if (norm(r.root) !== t.root) die(`Turso id=${t.id} root=${JSON.stringify(r.root)} ≠ ${t.root}`);
}
const taad0 = Number((await tget("SELECT COUNT(*) c FROM words WHERE meaning_tr=?", [OLD]))[0].c);
console.log(`GATE Turso : 4/4 eşleşti · toplam 'âd kavmi' hücresi=${taad0}`);
if (aad0 !== taad0) die(`yerel/Turso 'âd kavmi' sayısı farklı: ${aad0} vs ${taad0}`);

// ── Yedek + pre-image + reverse SQL ──────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const localBackup = path.join(BACKUP_DIR, `app-before-aad-homograph-v1_8-${ts}.db`);
fs.copyFileSync(LOCAL_DB, localBackup);

const preImage = {
  schema_version: "aad-homograph-v1_8-pre-image",
  captured_at: new Date().toISOString(),
  source: { local_db: "data/app.db", turso: url.replace(/\?.*$/, "") },
  note: "Turso + yerel pre-image: her iki tarafta da meaning_tr='âd kavmi' doğrulandı.",
  words: WORDS.map((t) => ({ id: t.id, key: t.key, arabic: t.arabic, lemma: t.lemma, root: t.root, meaning_tr: t.old })),
};
const preImagePath = path.join(OUT_DIR, "aad-homograph-pre-image.json");
fs.writeFileSync(preImagePath, JSON.stringify(preImage, null, 2) + "\n", "utf-8");

const reverse = [
  "-- aad-homograph reverse: 4 meaning_tr hücresini 'âd kavmi' değerine geri yaz (guard'lı)",
  "BEGIN;",
  ...WORDS.map((t) => `UPDATE words SET meaning_tr=${sqlStr(t.old)} WHERE id=${t.id} AND meaning_tr=${sqlStr(t.neu)};`),
  "COMMIT;",
];
const reversePath = path.join(OUT_DIR, "aad-homograph-reverse.sql");
fs.writeFileSync(reversePath, reverse.join("\n") + "\n", "utf-8");
console.log(`yerel yedek : ${path.relative(REPO, localBackup).replace(/\\/g, "/")}`);
console.log(`pre-image   : surgical-v1_8/aad-homograph-pre-image.json`);
console.log(`reverse SQL : surgical-v1_8/aad-homograph-reverse.sql`);

console.log("\nDeğişiklikler:");
for (const t of WORDS) console.log(`  ${t.key.padEnd(10)} ${t.arabic.padEnd(12)} "${t.old}" → "${t.neu}"`);

if (!APPLY) {
  console.log(`\nDRY bitti — hiçbir yazım yapılmadı.`);
  console.log(`Uygulamak için: node --env-file=apps/web/.env.local scripts/morphology/apply-aad-homograph-fix-v1_8.mjs --apply`);
  process.exit(0);
}

// ── Yerel uygulama (guard'lı) ────────────────────────────────────────────────
let la = 0;
local.exec("BEGIN");
try {
  for (const t of WORDS) la += Number(local.prepare("UPDATE words SET meaning_tr=? WHERE id=? AND meaning_tr=?").run(t.neu, t.id, t.old).changes);
  if (la !== EXPECTED_CELLS) throw new Error(`rowsAffected ${la} ≠ ${EXPECTED_CELLS}`);
  local.exec("COMMIT");
} catch (e) { local.exec("ROLLBACK"); die(`yerel uygulama hatası (rollback edildi): ${e.message}`); }

// 2. çalıştırma no-op
let la2 = 0;
for (const t of WORDS) la2 += Number(local.prepare("UPDATE words SET meaning_tr=? WHERE id=? AND meaning_tr=?").run(t.neu, t.id, t.old).changes);
if (la2 !== 0) die(`yerel 2. çalıştırma no-op değil: ${la2}`);

const integrity = local.prepare("PRAGMA integrity_check").get().integrity_check;
const wc1 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const aad1 = local.prepare("SELECT COUNT(*) c FROM words WHERE meaning_tr = ?").get(OLD).c;
if (integrity !== "ok") die(`integrity ${integrity}`);
if (wc1 !== wc0) die(`words satır sayısı değişti ${wc0}→${wc1}`);
if (aad1 !== aad0 - EXPECTED_CELLS) die(`'âd kavmi' sayısı ${aad0}→${aad1}, beklenen ${aad0 - EXPECTED_CELLS}`);
// lemma/root dokunulmadı doğrulaması
for (const t of WORDS) {
  const r = selW.get(t.id);
  if (norm(r.lemma) !== t.lemma || norm(r.root) !== t.root) die(`id=${t.id} lemma/root değişmiş!`);
  if (norm(r.meaning_tr) !== t.neu) die(`id=${t.id} post meaning_tr ${JSON.stringify(r.meaning_tr)} ≠ ${t.neu}`);
}
console.log(`\nYEREL apply : ${la} hücre · 2. çalıştırma no-op · integrity=${integrity} · words=${wc1} · 'âd kavmi' ${aad0}→${aad1} · lemma/root sabit`);
local.close();

// ── Turso uygulama (guard'lı, batch) ─────────────────────────────────────────
const res = await turso.batch(
  WORDS.map((t) => ({ sql: "UPDATE words SET meaning_tr=? WHERE id=? AND meaning_tr=?", args: [t.neu, t.id, t.old] })),
  "write",
);
const ta = res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
if (ta !== EXPECTED_CELLS) die(`Turso rowsAffected ${ta} ≠ ${EXPECTED_CELLS} — reverse SQL ile geri al!`);

// post-verify
for (const t of WORDS) {
  const r = (await tget("SELECT lemma, root, meaning_tr FROM words WHERE id=?", [t.id]))[0];
  if (norm(r.meaning_tr) !== t.neu) die(`Turso post id=${t.id} ${JSON.stringify(r.meaning_tr)} ≠ ${t.neu}`);
  if (norm(r.lemma) !== t.lemma || norm(r.root) !== t.root) die(`Turso post id=${t.id} lemma/root değişmiş!`);
}
const taad1 = Number((await tget("SELECT COUNT(*) c FROM words WHERE meaning_tr=?", [OLD]))[0].c);
if (taad1 !== taad0 - EXPECTED_CELLS) die(`Turso 'âd kavmi' ${taad0}→${taad1}, beklenen ${taad0 - EXPECTED_CELLS}`);
console.log(`TURSO apply : ${ta} hücre · post-verify OK · 'âd kavmi' ${taad0}→${taad1}`);

fs.writeFileSync(path.join(OUT_DIR, "aad-homograph-apply-report.json"), JSON.stringify({
  schema_version: "aad-homograph-v1_8-apply", applied: true, cells: EXPECTED_CELLS,
  local_backup: path.relative(REPO, localBackup).replace(/\\/g, "/"),
  pre_image: "data/candidates/morphology/final-v1_8/surgical-v1_8/aad-homograph-pre-image.json",
  reverse_sql: "data/candidates/morphology/final-v1_8/surgical-v1_8/aad-homograph-reverse.sql",
  local: { rows_affected: la, second_run_noop: la2 === 0, integrity, words: wc1, aad_kavmi_before: aad0, aad_kavmi_after: aad1 },
  turso: { rows_affected: ta, aad_kavmi_before: taad0, aad_kavmi_after: taad1 },
  local_sha_after: sha256(LOCAL_DB),
  changes: WORDS.map((t) => ({ key: t.key, id: t.id, arabic: t.arabic, lemma: t.lemma, root: t.root, old: t.old, new: t.neu })),
}, null, 2) + "\n", "utf-8");
console.log(`\napply-report: surgical-v1_8/aad-homograph-apply-report.json`);
console.log("\n✔ عاد/يعود homograf düzeltmesi uygulandı (yerel + Turso).");
