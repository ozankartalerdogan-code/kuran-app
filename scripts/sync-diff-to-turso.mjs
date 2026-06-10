/**
 * sync-diff-to-turso.mjs
 *
 * Marker/yedek dosyalarına HİÇ güvenmeden, yerel master app.db'yi Turso ile
 * kıyaslar ve SADECE farklı satırları gönderir. Anahtar:
 *   - verses : verse_key
 *   - words  : id (PK)
 *
 * Senkronlanan kolonlar:
 *   verses.literal_ceviri, verses.fark_analizi
 *   words.meaning_tr, words.root, words.gloss_en
 *
 * Kullanım:
 *   node --env-file=apps/web/.env.local scripts/sync-diff-to-turso.mjs [--dry]
 *
 * --dry: hiçbir şey yazmaz, sadece kaç satır farklı olduğunu ve örnek gösterir.
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const dir = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB = path.resolve(dir, "../data/app.db");

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Hata: TURSO_DB_URL / TURSO_AUTH_TOKEN yok."); process.exit(1); }

const local = new DatabaseSync(LOCAL_DB, { readOnly: true });
const turso = createClient({ url, authToken });

const norm = (v) => (v === null || v === undefined ? "" : String(v));
const BATCH = 100;

async function flush(stmts) {
  if (DRY || stmts.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < stmts.length; i += BATCH) {
    const res = await turso.batch(stmts.slice(i, i + BATCH), "write");
    n += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
  }
  return n;
}

// ── VERSES (verse_key) ───────────────────────────────────────────────────────
{
  const lrows = local.prepare("SELECT verse_key, literal_ceviri, fark_analizi FROM verses").all();
  const tmap = new Map();
  const tres = await turso.execute("SELECT verse_key, literal_ceviri, fark_analizi FROM verses");
  for (const r of tres.rows) tmap.set(r.verse_key, r);

  const stmts = [];
  const sample = [];
  for (const l of lrows) {
    const t = tmap.get(l.verse_key);
    if (!t) continue;
    const dLit = norm(l.literal_ceviri) !== norm(t.literal_ceviri);
    const dFark = norm(l.fark_analizi) !== norm(t.fark_analizi);
    if (!dLit && !dFark) continue;
    stmts.push({
      sql: "UPDATE verses SET literal_ceviri=?, fark_analizi=? WHERE verse_key=?",
      args: [l.literal_ceviri ?? null, l.fark_analizi ?? null, l.verse_key],
    });
    if (sample.length < 3) sample.push(`${l.verse_key}${dLit ? " [literal]" : ""}${dFark ? " [fark]" : ""}`);
  }
  console.log(`VERSES farklı: ${stmts.length}${DRY ? " (DRY)" : ""}`);
  sample.forEach((s) => console.log("  ", s));
  const applied = await flush(stmts);
  if (!DRY) console.log(`  → Turso'da güncellenen: ${applied}`);
}

// ── WORDS (id PK) ─────────────────────────────────────────────────────────────
{
  const lrows = local.prepare("SELECT id, meaning_tr, root, gloss_en FROM words").all();
  const lmap = new Map(lrows.map((r) => [Number(r.id), r]));

  const stmts = [];
  const sample = [];
  let offset = 0; const page = 20000;
  while (true) {
    const res = await turso.execute({ sql: "SELECT id, meaning_tr, root, gloss_en FROM words ORDER BY id LIMIT ? OFFSET ?", args: [page, offset] });
    if (res.rows.length === 0) break;
    for (const t of res.rows) {
      const l = lmap.get(Number(t.id));
      if (!l) continue;
      const dM = norm(l.meaning_tr) !== norm(t.meaning_tr);
      const dR = norm(l.root) !== norm(t.root);
      const dG = norm(l.gloss_en) !== norm(t.gloss_en);
      if (!dM && !dR && !dG) continue;
      stmts.push({
        sql: "UPDATE words SET meaning_tr=?, root=?, gloss_en=? WHERE id=?",
        args: [l.meaning_tr ?? null, l.root ?? null, l.gloss_en ?? null, Number(t.id)],
      });
      if (sample.length < 3) sample.push(`#${t.id}${dM ? " [tr]" : ""}${dR ? " [root]" : ""}${dG ? " [gloss]" : ""}`);
    }
    offset += page;
  }
  console.log(`WORDS farklı: ${stmts.length}${DRY ? " (DRY)" : ""}`);
  sample.forEach((s) => console.log("  ", s));
  const applied = await flush(stmts);
  if (!DRY) console.log(`  → Turso'da güncellenen: ${applied}`);
}

console.log(DRY ? "DRY bitti — hiçbir şey yazılmadı." : "Sync tamam.");
