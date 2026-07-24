/**
 * sync-additive-v1_8-to-turso.mjs
 *
 * v1.8 additive morfoloji merge'inin (949 satır / 997 hücre: 664 lemma + 333
 * root) yerel doğrulanmış `data/app.db`'den Turso `words` tablosuna
 * ADDITIVE ve IDEMPOTENT senkronizasyonunu hazırlar.
 *
 * Garantiler:
 *   • Yalnız Turso'da BOŞ (NULL/blank) olan hedef hücreler doldurulur.
 *   • Dolu hiçbir Turso hücresi ezilmez (write-time guard + sınıflandırma).
 *   • Hedef dışı hiçbir satır/kolona dokunulmaz.
 *   • İkinci uygulama mantıksal no-op'tur (guard'lı WHERE → 0 rowsAffected).
 *   • 949 satır / 997 hücre beklenir; herhangi bir sapmada FAIL-CLOSED durur.
 *
 * Fail-closed tetikleri: local SHA uyuşmazlığı, review satır/hücre sayısı
 * sapması, local hücre ≠ review new_value, Turso'da eksik id, Turso'da dolu &
 * farklı değer (CONFLICT).
 *
 * Kullanım:
 *   node --env-file=apps/web/.env.local scripts/morphology/sync-additive-v1_8-to-turso.mjs         # dry-run (varsayılan)
 *   node --env-file=apps/web/.env.local scripts/morphology/sync-additive-v1_8-to-turso.mjs --apply  # canlı yazım (guard'lı)
 *
 * Bu tur YALNIZ dry-run çalıştırılır; --apply komutu raporlanır, çalıştırılmaz.
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
const OUT_DIR = path.join(FINAL_DIR, "turso-sync");

const EXPECT_SHA = "0c24bde1a60fc346ddd0e3ccbb5409d5c471cf039b8d8558cb9c44d95abd9893";
const EXPECT_ROWS = 949;
const EXPECT_CELLS = 997;
const EXPECT_LEMMA = 664;
const EXPECT_ROOT = 333;
const FIELDS = new Set(["root", "lemma"]);

const APPLY = process.argv.includes("--apply");

function die(msg) {
  console.error(`\n✖ FAIL-CLOSED: ${msg}`);
  process.exit(1);
}

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

function sha256(file) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

// ── 1. Local DB, doğrulanmış merge çıktısı mı? ───────────────────────────────
if (!fs.existsSync(LOCAL_DB)) die(`local app.db yok: ${LOCAL_DB}`);
const localSha = sha256(LOCAL_DB);
if (localSha !== EXPECT_SHA) {
  die(`local app.db SHA uyuşmuyor (doğrulanmış merge değil)\n  beklenen ${EXPECT_SHA}\n  gerçek   ${localSha}`);
}

// ── 2. Review artefaktından hedef kümesi ─────────────────────────────────────
const targets = [];
for (const line of fs.readFileSync(REVIEW, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t) continue;
  const e = JSON.parse(t);
  if (!FIELDS.has(e.field)) die(`beklenmeyen field: ${e.field}`);
  targets.push({
    db_id: Number(e.db_id),
    token_id: e.token_id,
    verse_key: e.verse_key,
    word_index: e.word_index,
    field: e.field,
    new_value: e.new_value,
    previous_value: e.previous_value,
    risk_class: e.risk_class,
  });
}
targets.sort((a, b) => (a.db_id - b.db_id) || a.field.localeCompare(b.field));

const distinctRows = new Set(targets.map((t) => t.db_id)).size;
const lemmaCells = targets.filter((t) => t.field === "lemma").length;
const rootCells = targets.filter((t) => t.field === "root").length;
if (targets.length !== EXPECT_CELLS) die(`review hücre sayısı ${targets.length} ≠ ${EXPECT_CELLS}`);
if (distinctRows !== EXPECT_ROWS) die(`review satır sayısı ${distinctRows} ≠ ${EXPECT_ROWS}`);
if (lemmaCells !== EXPECT_LEMMA) die(`lemma hücresi ${lemmaCells} ≠ ${EXPECT_LEMMA}`);
if (rootCells !== EXPECT_ROOT) die(`root hücresi ${rootCells} ≠ ${EXPECT_ROOT}`);

// ── 3. Local hücreler review new_value ile birebir mi? ───────────────────────
const local = new DatabaseSync(LOCAL_DB, { readOnly: true });
const localRow = local.prepare("SELECT id, verse_key, word_index, root, lemma FROM words WHERE id = ?");
for (const t of targets) {
  const row = localRow.get(t.db_id);
  if (!row) die(`local id=${t.db_id} yok`);
  if (row.verse_key !== t.verse_key || Number(row.word_index) !== Number(t.word_index)) {
    die(`local id=${t.db_id} konumu review ile uyuşmuyor (${row.verse_key}:${row.word_index} vs ${t.verse_key}:${t.word_index})`);
  }
  if (norm(row[t.field]) !== norm(t.new_value)) {
    die(`local id=${t.db_id} ${t.field}=${JSON.stringify(row[t.field])} ≠ review new_value=${JSON.stringify(t.new_value)}`);
  }
}
function norm(v) { return v === null || v === undefined ? "" : String(v); }

// ── 4. Turso mevcut durumu ───────────────────────────────────────────────────
const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) die("TURSO_DB_URL / TURSO_AUTH_TOKEN yok (--env-file=apps/web/.env.local?)");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });

const ids = [...new Set(targets.map((t) => t.db_id))];
const tursoById = new Map();
const CHUNK = 400;
for (let i = 0; i < ids.length; i += CHUNK) {
  const slice = ids.slice(i, i + CHUNK);
  const placeholders = slice.map(() => "?").join(",");
  const res = await turso.execute({
    sql: `SELECT id, verse_key, word_index, root, lemma FROM words WHERE id IN (${placeholders})`,
    args: slice,
  });
  for (const r of res.rows) tursoById.set(Number(r.id), r);
}

// ── 5. Sınıflandırma ─────────────────────────────────────────────────────────
const review = [];
const fillCells = [];
const buckets = { FILL: 0, ALREADY_SYNCED: 0, CONFLICT: 0, MISSING_ID: 0 };
for (const t of targets) {
  const tr = tursoById.get(t.db_id);
  let action, turso_current = null;
  if (!tr) {
    action = "MISSING_ID";
  } else {
    turso_current = tr[t.field] ?? null;
    if (isEmpty(turso_current)) {
      action = "FILL";
    } else if (norm(turso_current) === norm(t.new_value)) {
      action = "ALREADY_SYNCED";
    } else {
      action = "CONFLICT";
    }
  }
  buckets[action]++;
  const rec = {
    db_id: t.db_id, token_id: t.token_id, verse_key: t.verse_key,
    word_index: t.word_index, field: t.field,
    turso_current, new_value: t.new_value, risk_class: t.risk_class, action,
  };
  review.push(rec);
  if (action === "FILL") fillCells.push({ ...t, turso_prev: turso_current });
}

// ── 6. Artefaktlar ───────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(OUT_DIR, name),
  typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", "utf-8");

// 6a. Dry-run review (her hedef hücre; token konumu + mevcut + yeni + risk)
write("sync-review.jsonl", review.map((r) => JSON.stringify(r)).join("\n") + "\n");

// 6b. Turso hedef kayıtlarının yedeği (949 satırın sync ÖNCESİ tam durumu)
const backup = ids.map((id) => {
  const r = tursoById.get(id);
  return r ? { id, verse_key: r.verse_key, word_index: r.word_index, root: r.root ?? null, lemma: r.lemma ?? null }
           : { id, missing: true };
});
write("turso-target-backup.json", backup);

// 6c. Rollback SQL: doldurulacak hücreleri sync ÖNCESİ değerine geri al
const rollback = fillCells.map((c) =>
  `UPDATE words SET ${c.field}=${sqlStr(c.turso_prev)} WHERE id=${c.db_id};`);
write("sync-rollback.sql",
  `-- v1.8 additive Turso sync rollback (yalnız doldurulan ${fillCells.length} hücre)\n` +
  `BEGIN;\n${rollback.join("\n")}\nCOMMIT;\n`);

// 6d. Forward apply SQL (guard'lı, idempotent): yalnız boş hücreyi doldurur
const forward = fillCells.map((c) =>
  `UPDATE words SET ${c.field}=${sqlStr(c.new_value)} WHERE id=${c.db_id} AND (${c.field} IS NULL OR TRIM(${c.field})='');`);
write("sync-forward.sql",
  `-- v1.8 additive Turso sync forward (${fillCells.length} hücre; guard'lı, ikinci uygulama no-op)\n` +
  `BEGIN;\n${forward.join("\n")}\nCOMMIT;\n`);

const summary = {
  schema_version: "additive-turso-sync-v1_8",
  local_sha256: localSha,
  target_rows: distinctRows,
  target_cells: targets.length,
  lemma_cells: lemmaCells,
  root_cells: rootCells,
  buckets,
  actionable_fill: buckets.FILL,
  fail_closed: buckets.CONFLICT > 0 || buckets.MISSING_ID > 0,
  second_apply_noop_guard: "WHERE ... AND (col IS NULL OR TRIM(col)='')",
};
write("sync-summary.json", summary);

// ── 7. Özet + fail-closed ────────────────────────────────────────────────────
console.log("── v1.8 additive Turso sync (DRY) ─────────────────────────");
console.log(`local app.db SHA : ${localSha === EXPECT_SHA ? "OK" : "MISMATCH"}`);
console.log(`hedef            : ${distinctRows} satır / ${targets.length} hücre (${lemmaCells} lemma + ${rootCells} root)`);
console.log(`FILL             : ${buckets.FILL}`);
console.log(`ALREADY_SYNCED   : ${buckets.ALREADY_SYNCED}`);
console.log(`CONFLICT         : ${buckets.CONFLICT}`);
console.log(`MISSING_ID       : ${buckets.MISSING_ID}`);
console.log(`artefaktlar      : ${path.relative(REPO, OUT_DIR)}/`);

if (buckets.CONFLICT > 0 || buckets.MISSING_ID > 0) {
  die(`Turso hedefinde ${buckets.CONFLICT} CONFLICT + ${buckets.MISSING_ID} MISSING_ID — yazım reddedildi.`);
}
if (buckets.FILL + buckets.ALREADY_SYNCED !== EXPECT_CELLS) {
  die(`FILL+ALREADY_SYNCED ${buckets.FILL + buckets.ALREADY_SYNCED} ≠ ${EXPECT_CELLS}`);
}

if (!APPLY) {
  console.log(`\nDRY bitti — Turso'ya HİÇBİR şey yazılmadı.`);
  console.log(`Uygulamak için:\n  node --env-file=apps/web/.env.local scripts/morphology/sync-additive-v1_8-to-turso.mjs --apply`);
  process.exit(0);
}

// ── 8. Apply (guard'lı) ──────────────────────────────────────────────────────
if (buckets.FILL === 0) {
  console.log("\nFILL=0 — no-op (idempotent). Yazım yok.");
  process.exit(0);
}
const stmts = fillCells.map((c) => ({
  sql: `UPDATE words SET ${c.field}=? WHERE id=? AND (${c.field} IS NULL OR TRIM(${c.field})='')`,
  args: [c.new_value, c.db_id],
}));
let affected = 0;
const BATCH = 200;
for (let i = 0; i < stmts.length; i += BATCH) {
  const res = await turso.batch(stmts.slice(i, i + BATCH), "write");
  affected += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
}
console.log(`\n→ Turso rowsAffected: ${affected} (beklenen ${fillCells.length})`);
if (affected !== fillCells.length) die(`rowsAffected ${affected} ≠ beklenen ${fillCells.length}`);
console.log("Apply tamam (additive, guard'lı).");
