/**
 * dedup-root-meanings.mjs
 *
 * root_meanings tablosundaki tekrarlı kök kayıtlarını temizler.
 * Her kök için EN İYİ tek satırı tutar:
 *   1) source='root_explanations_seed' (zengin seed açıklaması) öncelikli
 *   2) en uzun (en dolu) meaning_tr
 *   3) en küçük id (stabil/deterministik)
 *
 * Kullanım:
 *   node scripts/dedup-root-meanings.mjs                 → dry-run (local data/app.db)
 *   node scripts/dedup-root-meanings.mjs --apply         → local app.db'de uygula
 *   node scripts/dedup-root-meanings.mjs --turso         → dry-run (Turso; env gerekir)
 *   node scripts/dedup-root-meanings.mjs --turso --apply → Turso'da uygula
 *
 * Turso için env: TURSO_DB_URL, TURSO_AUTH_TOKEN
 */

const apply    = process.argv.includes("--apply");
const useTurso = process.argv.includes("--turso");

// Her kök için TUTULACAK satırların id'leri
const KEEP_SUBQUERY = `
  SELECT r2.id FROM root_meanings r2
  WHERE r2.root = r1.root
  ORDER BY (CASE WHEN r2.source = 'root_explanations_seed' THEN 1 ELSE 0 END) DESC,
           LENGTH(COALESCE(r2.meaning_tr, '')) DESC,
           r2.id ASC
  LIMIT 1`;
const KEEP_IDS  = `SELECT id FROM root_meanings r1 WHERE id = (${KEEP_SUBQUERY})`;
const DELETE_SQL = `DELETE FROM root_meanings WHERE id NOT IN (${KEEP_IDS})`;

async function makeDb() {
  if (useTurso) {
    const url = (process.env.TURSO_DB_URL ?? "").replace(/^libsql:\/\//, "https://");
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      console.error("✗ TURSO_DB_URL / TURSO_AUTH_TOKEN env eksik.");
      process.exit(1);
    }
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url, authToken });
    return {
      all: async (sql, ...args) => (await client.execute({ sql, args })).rows,
      run: async (sql, ...args) => (await client.execute({ sql, args })),
      label: `Turso (${new URL(url).host})`,
      close: () => client.close(),
    };
  }
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync("data/app.db", { readOnly: !apply });
  return {
    all: async (sql, ...args) => db.prepare(sql).all(...args),
    run: async (sql, ...args) => db.prepare(sql).run(...args),
    label: "Local data/app.db",
    close: () => db.close(),
  };
}

const db = await makeDb();
console.log(`Hedef: ${db.label}  |  Mod: ${apply ? "UYGULA (--apply)" : "DRY-RUN"}\n`);

const before = (await db.all("SELECT COUNT(*) n FROM root_meanings"))[0].n;
const uniq   = (await db.all("SELECT COUNT(DISTINCT root) n FROM root_meanings"))[0].n;
const toDelete = await db.all(`SELECT id, root, meaning_tr, source FROM root_meanings WHERE id NOT IN (${KEEP_IDS}) ORDER BY root LIMIT 20`);
const delCount = (await db.all(`SELECT COUNT(*) n FROM root_meanings WHERE id NOT IN (${KEEP_IDS})`))[0].n;

console.log(`Toplam satır: ${before}`);
console.log(`Benzersiz kök: ${uniq}`);
console.log(`Silinecek (tekrarlı) satır: ${delCount}\n`);
console.log("Silinecek örnekler (ilk 20):");
for (const r of toDelete) console.log(`  - sil id=${r.id} ${r.root} "${r.meaning_tr ?? "(boş)"}" [${r.source ?? "?"}]`);

// Tutulan tarafı doğrula (örnek kökler)
console.log("\nKorunacak satır (örnek kökler):");
for (const root of ["قول", "ربب", "رحم", "صلو"]) {
  const kept = await db.all(`SELECT meaning_tr, source FROM root_meanings r1 WHERE root = ? AND id = (${KEEP_SUBQUERY})`, root);
  if (kept[0]) console.log(`  ✓ ${root} → "${kept[0].meaning_tr}" [${kept[0].source}]`);
}

if (apply) {
  await db.run(DELETE_SQL);
  const after = (await db.all("SELECT COUNT(*) n FROM root_meanings"))[0].n;
  const dupLeft = (await db.all("SELECT COUNT(*) n FROM (SELECT root FROM root_meanings GROUP BY root HAVING COUNT(*) > 1)"))[0].n;
  console.log(`\n✓ UYGULANDI. ${before} → ${after} satır. Kalan tekrarlı kök: ${dupLeft}`);
} else {
  console.log("\n(DRY-RUN — hiçbir şey silinmedi. Uygulamak için --apply ekle.)");
}

await db.close();
