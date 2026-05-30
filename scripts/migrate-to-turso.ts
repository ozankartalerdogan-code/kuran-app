#!/usr/bin/env tsx
/**
 * migrate-to-turso.ts
 *
 * Yerel SQLite (data/app.db) → Turso (libSQL) tam veri taşıma scripti.
 *
 * Özellikler:
 *  - 14 tablo, FTS5 virtual table dahil
 *  - 350 000+ satır batch insert (100 satır/batch)
 *  - Upsert: mevcut tabloyu DROP+CREATE eder (temiz geçiş)
 *  - --dry-run: şema oluşturur, veri yüklemez
 *  - --tables=verses,sureler: belirli tabloları yeniden yükle
 *
 * Kullanım:
 *   npx tsx scripts/migrate-to-turso.ts
 *   npx tsx scripts/migrate-to-turso.ts --dry-run
 *   npx tsx scripts/migrate-to-turso.ts --tables=verses,words
 *
 * Gerekli env (.env.local veya ortam):
 *   TURSO_DB_URL        wss://xxx.turso.io
 *   TURSO_AUTH_TOKEN    eyJhbGciOiJF...
 */

import { DatabaseSync }          from "node:sqlite";
import { createClient }          from "@libsql/client";
import path                      from "path";
import fs                        from "fs";

// ── dotenv ────────────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), "apps/web/.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN  = process.argv.includes("--dry-run");
const tablesArg = process.argv.find(a => a.startsWith("--tables="));
const ONLY_TABLES = tablesArg
  ? new Set(tablesArg.replace("--tables=", "").split(",").map(s => s.trim()))
  : null;

const BATCH_SIZE = 100;

const DB_PATH = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, "app.db")
  : path.resolve(process.cwd(), "data", "app.db");

if (!process.env.TURSO_DB_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("\n❌  TURSO_DB_URL ve TURSO_AUTH_TOKEN env gerekli.");
  console.error("   apps/web/.env.local dosyasına ekleyin.\n");
  process.exit(1);
}

// ── Bağlantılar ───────────────────────────────────────────────────────────────

const local  = new DatabaseSync(DB_PATH, { readOnly: true });
local.exec("PRAGMA cache_size=-32768; PRAGMA mmap_size=268435456;");

const turso  = createClient({
  url:       process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function getTableNames(): string[] {
  const rows = local.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as { name: string }[];
  return rows.map(r => r.name);
}

function getCreateStatement(tableName: string): string | null {
  const row = local.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName) as { sql: string } | undefined;
  return row?.sql ?? null;
}

function getIndexStatements(tableName: string): string[] {
  const rows = local.prepare(
    "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL"
  ).all(tableName) as { sql: string }[];
  return rows.map(r => r.sql);
}

function getRowCount(tableName: string): number {
  const row = local.prepare(`SELECT COUNT(*) AS cnt FROM "${tableName}"`).get() as { cnt: number };
  return row.cnt;
}

function getColumnNames(tableName: string): string[] {
  const rows = local.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string }[];
  return rows.map(r => r.name);
}

// FTS5 virtual table'ları için özel handling
function isFtsVirtual(tableName: string): boolean {
  const row = local.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName) as { sql: string | null } | undefined;
  return (row?.sql ?? "").toUpperCase().includes("USING FTS");
}

function isInternalFtsTable(tableName: string): boolean {
  return /_(config|content|data|docsize|idx)$/.test(tableName);
}

// ── Ana geçiş ─────────────────────────────────────────────────────────────────

async function migrateTable(tableName: string): Promise<void> {
  const cols = getColumnNames(tableName);
  const rowCount = getRowCount(tableName);
  const createSql = getCreateStatement(tableName);
  const indexes = getIndexStatements(tableName);

  if (!createSql) {
    console.log(`  ⏭️   ${tableName}: CREATE SQL bulunamadı, atlanıyor`);
    return;
  }

  process.stdout.write(`  📋  ${tableName.padEnd(32)} ${rowCount.toLocaleString().padStart(8)} satır`);

  if (DRY_RUN) { console.log("  [DRY]"); return; }

  // 1. Mevcut tabloyu kaldır + yeniden oluştur
  await turso.execute(`DROP TABLE IF EXISTS "${tableName}"`);
  await turso.execute(createSql);

  // 2. Index'leri oluştur
  for (const idx of indexes) {
    try { await turso.execute(idx); } catch { /* index var olabilir */ }
  }

  if (rowCount === 0) { console.log("  [empty]"); return; }

  // 3. Veriyi batch'ler halinde yükle
  const placeholders = cols.map(() => "?").join(", ");
  const insertSql    = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

  let inserted = 0;
  let offset   = 0;

  while (offset < rowCount) {
    const rows = local.prepare(
      `SELECT * FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
    ).all() as Record<string, unknown>[];

    if (rows.length === 0) break;

    // Turso batch insert
    const statements = rows.map(row => ({
      sql:  insertSql,
      args: cols.map(c => {
        const v = row[c];
        // Turso null güvenliği
        if (v === undefined) return null;
        if (v instanceof Uint8Array) return v.buffer;
        return v as string | number | null;
      }),
    }));

    try {
      await turso.batch(statements, "write");
    } catch (err) {
      console.error(`\n  ❌  ${tableName} batch hatası (offset=${offset}):`, (err as Error).message);
      throw err;
    }

    inserted += rows.length;
    offset   += BATCH_SIZE;

    // İlerleme göster
    const pct = Math.round((inserted / rowCount) * 100);
    process.stdout.write(`\r  📋  ${tableName.padEnd(32)} ${rowCount.toLocaleString().padStart(8)} satır  ${pct}%  `);
  }

  console.log(`\r  ✅  ${tableName.padEnd(32)} ${inserted.toLocaleString().padStart(8)} satır yüklendi`);
}

async function migrateFtsTable(): Promise<void> {
  // ayet_fts virtual table: veriyi FTS5 üzerinden tekrar oluştur
  const ftsName = "ayet_fts";

  process.stdout.write(`  📋  ${ftsName.padEnd(32)} (FTS5 virtual)`);

  if (DRY_RUN) { console.log("  [DRY]"); return; }

  // Virtual table oluştur
  await turso.execute(`DROP TABLE IF EXISTS "${ftsName}"`);
  await turso.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${ftsName}
    USING fts5(
      verse_key UNINDEXED,
      surah_id UNINDEXED,
      ayah_number UNINDEXED,
      meal,
      literal,
      tags,
      tokenize = "unicode61 remove_diacritics 2"
    )
  `);

  // ayet_fts'teki gerçek veriyi çek (content tablosundan)
  const rowCount = getRowCount(ftsName);
  const rows = local.prepare(
    `SELECT verse_key, surah_id, ayah_number, meal, literal, tags FROM "${ftsName}" LIMIT -1`
  ).all() as Record<string, unknown>[];

  let inserted = 0;
  const sql = `INSERT INTO ${ftsName} (verse_key, surah_id, ayah_number, meal, literal, tags) VALUES (?, ?, ?, ?, ?, ?)`;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const statements = batch.map(row => ({
      sql,
      args: [row.verse_key, row.surah_id, row.ayah_number, row.meal, row.literal, row.tags],
    }));
    await turso.batch(statements, "write");
    inserted += batch.length;
    const pct = Math.round((inserted / rowCount) * 100);
    process.stdout.write(`\r  📋  ${ftsName.padEnd(32)} (FTS5) ${pct}%  `);
  }

  console.log(`\r  ✅  ${ftsName.padEnd(32)} ${inserted.toLocaleString().padStart(8)} satır (FTS5)`);
}

// ── Giriş noktası ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n🚀  SQLite → Turso Geçiş Scripti");
  console.log(`    Kaynak  : ${DB_PATH}`);
  console.log(`    Hedef   : ${process.env.TURSO_DB_URL}`);
  console.log(`    Mod     : ${DRY_RUN ? "DRY-RUN" : "CANLI"}`);
  if (ONLY_TABLES) console.log(`    Tablolar: ${[...ONLY_TABLES].join(", ")}`);
  console.log();

  const allTables = getTableNames();

  // FTS5 iç tablolarını filtrele (ayet_fts_config, _content, _data vb.)
  const regularTables = allTables.filter(t =>
    !isInternalFtsTable(t) && !isFtsVirtual(t)
  );
  const ftsTables = allTables.filter(t => isFtsVirtual(t));

  // FK bağımlılık sırası: referenced tablolar önce gelsin
  const FK_ORDER = [
    "sureler", "verses", "verse_tags", "verse_tag_items",
    "words", "translations", "root_meanings",
    "aktif_mealler", "surah_tafsir",
    "context_notes", "fidelity_comparisons", "fidelity_signals", "morfoloji",
    "elifba_harfler", "elifba_dersler", "elifba_harf_ders", "elifba_quiz",
  ];

  const rawList = ONLY_TABLES
    ? regularTables.filter(t => ONLY_TABLES.has(t))
    : regularTables;

  // Önce bilinen FK sırasına göre, geri kalanlar arkaya
  const ordered = [
    ...FK_ORDER.filter(t => rawList.includes(t)),
    ...rawList.filter(t => !FK_ORDER.includes(t)),
  ];

  // sqlite_sequence gibi sistem tablolarını atla
  const skipTables = new Set(["sqlite_sequence", "sqlite_stat1"]);
  const tablesToMigrate = ordered;

  // Turso'da FK zorlamasını kapat (migration süresince)
  if (!DRY_RUN) {
    await turso.execute("PRAGMA foreign_keys = OFF").catch(() => {});
  }

  console.log(`📦  ${tablesToMigrate.length} regular + ${ftsTables.length} FTS5 tablo`);
  console.log();

  const startTime = Date.now();
  let totalRows  = 0;

  for (const table of tablesToMigrate) {
    if (skipTables.has(table)) {
      console.log(`  ⏭️   ${table}: sistem tablosu, atlanıyor`);
      continue;
    }
    await migrateTable(table);
    totalRows += getRowCount(table);
  }

  // FTS5 tablosunu özel şekilde geçir
  if (!ONLY_TABLES || ONLY_TABLES.has("ayet_fts")) {
    await migrateFtsTable();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log();
  console.log(`✅  Geçiş tamamlandı!`);
  console.log(`    Toplam satır : ~${totalRows.toLocaleString()}`);
  console.log(`    Süre         : ${elapsed}s`);
  console.log();
  console.log("🔑  Sonraki adım: .env.local'a ekle");
  console.log("    TURSO_DB_URL=wss://xxx.turso.io");
  console.log("    TURSO_AUTH_TOKEN=eyJ...");
}

main().catch(err => {
  console.error("\n❌  Geçiş başarısız:", err);
  process.exit(1);
});
