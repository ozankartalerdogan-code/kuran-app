/**
 * sync_tags_to_turso.mjs — tema etiketlerini (verse_tags + verse_tag_items) yerel
 * DB'den Turso'ya taşır. Yalnız bu iki tablo; başka tabloya dokunmaz.
 *
 *   node --env-file=apps/web/.env.local scripts/themes/sync_tags_to_turso.mjs --db data/app.themes.db --dry
 *   node --env-file=apps/web/.env.local scripts/themes/sync_tags_to_turso.mjs --db data/app.themes.db --backup out.json
 *
 * --dry    : yazmaz; farklı/eksik/fazla satır sayısını gösterir.
 * --backup : yazmadan önce Turso'daki iki tablonun mevcut hâlini JSON'a döker (geri dönüş için).
 * --restore FILE : yedek JSON'u Turso'ya geri yazar.
 *
 * verse_tags   : verse_key bazında farklı satırlar UPSERT, yerelde olmayanlar DELETE.
 * verse_tag_items: değişen ayetlerin satırları silinip yeniden yazılır.
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import { writeFileSync, readFileSync } from "node:fs";

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const DRY = process.argv.includes("--dry");
const DB = arg("--db") ?? "data/app.themes.db";
const BACKUP = arg("--backup");
const RESTORE = arg("--restore");

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Hata: TURSO_DB_URL / TURSO_AUTH_TOKEN yok."); process.exit(1); }
const turso = createClient({ url, authToken });
const BATCH = 200;

async function run(stmts) {
  let n = 0;
  for (let i = 0; i < stmts.length; i += BATCH) {
    const res = await turso.batch(stmts.slice(i, i + BATCH), "write");
    n += res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
  }
  return n;
}

async function readTurso() {
  const tags = (await turso.execute("SELECT verse_key, ana_tema, alt_taglar, updated_at FROM verse_tags")).rows;
  const items = (await turso.execute("SELECT verse_key, tag, isim, aciklama FROM verse_tag_items")).rows;
  return {
    tags: tags.map((r) => ({ verse_key: r.verse_key, ana_tema: r.ana_tema, alt_taglar: r.alt_taglar, updated_at: r.updated_at })),
    items: items.map((r) => ({ verse_key: r.verse_key, tag: r.tag, isim: r.isim, aciklama: r.aciklama })),
  };
}

function writeAll(state, keys) {
  const s = [];
  const tagsBy = new Map(state.tags.map((r) => [r.verse_key, r]));
  const itemsBy = new Map();
  for (const r of state.items) (itemsBy.get(r.verse_key) ?? itemsBy.set(r.verse_key, []).get(r.verse_key)).push(r);
  for (const k of keys) {
    const t = tagsBy.get(k);
    if (t) s.push({ sql: `INSERT INTO verse_tags (verse_key, ana_tema, alt_taglar, updated_at) VALUES (?,?,?,?)
      ON CONFLICT(verse_key) DO UPDATE SET ana_tema=excluded.ana_tema, alt_taglar=excluded.alt_taglar, updated_at=excluded.updated_at`,
      args: [k, t.ana_tema, t.alt_taglar, t.updated_at] });
    else s.push({ sql: "DELETE FROM verse_tags WHERE verse_key = ?", args: [k] });
    s.push({ sql: "DELETE FROM verse_tag_items WHERE verse_key = ?", args: [k] });
    for (const it of itemsBy.get(k) ?? []) s.push({ sql: "INSERT INTO verse_tag_items (verse_key, tag, isim, aciklama) VALUES (?,?,?,?)", args: [k, it.tag, it.isim, it.aciklama] });
  }
  return s;
}

const sig = (t, items) => JSON.stringify([t?.ana_tema ?? null, t?.alt_taglar ?? null, (items ?? []).map((i) => [i.tag, i.isim ?? null, i.aciklama ?? null]).sort()]);
function index(state) {
  const items = new Map();
  for (const r of state.items) (items.get(r.verse_key) ?? items.set(r.verse_key, []).get(r.verse_key)).push(r);
  const tags = new Map(state.tags.map((r) => [r.verse_key, r]));
  const out = new Map();
  for (const k of new Set([...tags.keys(), ...items.keys()])) out.set(k, sig(tags.get(k), items.get(k)));
  return out;
}

if (RESTORE) {
  const st = JSON.parse(readFileSync(RESTORE, "utf8"));
  const remote = await readTurso();
  const keys = new Set([...st.tags.map((r) => r.verse_key), ...remote.tags.map((r) => r.verse_key), ...st.items.map((r) => r.verse_key)]);
  const n = await run(writeAll(st, keys));
  console.log(`Geri yüklendi: ${keys.size} ayet, ${n} satır etkilendi.`);
  process.exit(0);
}

const db = new DatabaseSync(DB, { readOnly: true });
const local = {
  tags: db.prepare("SELECT verse_key, ana_tema, alt_taglar, updated_at FROM verse_tags").all(),
  items: db.prepare("SELECT verse_key, tag, isim, aciklama FROM verse_tag_items").all(),
};
const remote = await readTurso();
const L = index(local), R = index(remote);
const changed = [...new Set([...L.keys(), ...R.keys()])].filter((k) => L.get(k) !== R.get(k));
const onlyRemote = [...R.keys()].filter((k) => !L.has(k)).length;
const onlyLocal = [...L.keys()].filter((k) => !R.has(k)).length;
console.log(`Yerel: ${local.tags.length} ayet / ${local.items.length} öğe · Turso: ${remote.tags.length} ayet / ${remote.items.length} öğe`);
console.log(`Değişecek ayet: ${changed.length} (yalnız Turso'da: ${onlyRemote}, yalnız yerelde: ${onlyLocal})`);
console.log(`Örnek: ${changed.slice(0, 5).join(", ")}`);
if (DRY) process.exit(0);
if (!BACKUP) { console.error("Hata: yazmadan önce --backup <dosya> verilmeli."); process.exit(1); }
writeFileSync(BACKUP, JSON.stringify(remote));
console.log(`Turso yedeği yazıldı: ${remote.tags.length} ayet / ${remote.items.length} öğe`);
const n = await run(writeAll(local, changed));
const after = index(await readTurso());
const still = [...new Set([...L.keys(), ...after.keys()])].filter((k) => L.get(k) !== after.get(k)).length;
console.log(`Yazıldı: ${n} satır etkilendi. Kalan fark: ${still}`);
process.exit(still === 0 ? 0 : 2);
