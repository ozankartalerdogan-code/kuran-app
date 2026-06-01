#!/usr/bin/env tsx
/**
 * ensure-indexes.ts
 *
 * scripts/indexes.sql dosyasındaki TÜM performans index'lerini hedef
 * veritabanına uygular.
 *
 * Kullanım:
 *   # Yerel SQLite (data/app.db)
 *   npx tsx scripts/ensure-indexes.ts
 *
 *   # Turso (env'den okur)
 *   npx tsx scripts/ensure-indexes.ts --turso
 *
 *   # Her ikisi
 *   npx tsx scripts/ensure-indexes.ts --all
 *
 *   # Dry-run (SQL'i göster ama çalıştırma)
 *   npx tsx scripts/ensure-indexes.ts --dry-run
 */

import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

// ── dotenv ────────────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), "apps/web/.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

// ── Argümanlar ────────────────────────────────────────────────────────────────

const USE_TURSO = process.argv.includes("--turso") || process.argv.includes("--all");
const USE_LOCAL = !process.argv.includes("--turso") || process.argv.includes("--all");
const DRY_RUN = process.argv.includes("--dry-run");

// ── SQL dosyasını oku ─────────────────────────────────────────────────────────

const SQL_PATH = path.resolve(__dirname, "indexes.sql");
if (!fs.existsSync(SQL_PATH)) {
  console.error("\n❌  scripts/indexes.sql bulunamadı:", SQL_PATH);
  process.exit(1);
}

const indexSql = fs.readFileSync(SQL_PATH, "utf-8");

// SQL dosyasındaki comment satırlarını temizle, sadece CREATE INDEX'leri çıkar
const cleanSql = indexSql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

const statements = cleanSql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.toUpperCase().includes("CREATE INDEX"))
  .map((s) => s + ";");

// ═══════════════════════════════════════════════════════════════════════════════

async function applyToTurso(): Promise<void> {
  if (!process.env.TURSO_DB_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("\n❌  TURSO_DB_URL ve TURSO_AUTH_TOKEN env gerekli.");
    console.error("   apps/web/.env.local dosyasına ekleyin.\n");
    return;
  }

  console.log(`\n🚀  Turso'ya index'ler uygulanıyor...`);
  console.log(`    Hedef: ${process.env.TURSO_DB_URL}`);

  const client = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  let applied = 0;
  let skipped = 0;

  for (const stmt of statements) {
    if (DRY_RUN) {
      console.log(`  [DRY] ${stmt.substring(0, 80)}...`);
      continue;
    }

    try {
      await client.execute(stmt);
      applied++;
    } catch (err) {
      const msg = (err as Error).message;
      // "already exists" hatalarını sessizce geç
      if (msg.includes("already exists")) {
        skipped++;
      } else {
        console.error(`  ⚠️  Hata: ${msg.substring(0, 100)}`);
        console.error(`     SQL: ${stmt.substring(0, 80)}...`);
      }
    }
  }

  console.log(`   ✅  ${applied} index oluşturuldu, ${skipped} zaten mevcut.\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════

function applyToLocal(): void {
  const dbPath = process.env.DATA_PATH
    ? path.join(process.env.DATA_PATH, "app.db")
    : path.resolve(process.cwd(), "data", "app.db");

  if (!fs.existsSync(dbPath)) {
    console.error(`\n❌  Yerel veritabanı bulunamadı: ${dbPath}`);
    return;
  }

  console.log(`\n🚀  Yerel SQLite'a index'ler uygulanıyor...`);
  console.log(`    Dosya: ${dbPath}`);

  const db = new DatabaseSync(dbPath);

  // WAL modunda write yapabilmek için
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");

  let applied = 0;
  let skipped = 0;

  for (const stmt of statements) {
    if (DRY_RUN) {
      console.log(`  [DRY] ${stmt.substring(0, 80)}...`);
      continue;
    }

    try {
      db.exec(stmt);
      applied++;
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("already exists")) {
        skipped++;
      } else {
        console.error(`  ⚠️  Hata: ${msg.substring(0, 100)}`);
        console.error(`     SQL: ${stmt.substring(0, 80)}...`);
      }
    }
  }

  db.close();
  console.log(`   ✅  ${applied} index oluşturuldu, ${skipped} zaten mevcut.\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log("\n⚡  Kuran App: Global Index Optimization Script");
  console.log(`    Mod: ${DRY_RUN ? "DRY-RUN" : "CANLI"}`);
  console.log(`    Hedef: ${USE_LOCAL && USE_TURSO ? "Yerel + Turso" : USE_TURSO ? "Turso" : "Yerel"}`);

  const total = statements.length;
  console.log(`    SQL ifadesi: ${total}`);
  console.log();

  if (USE_LOCAL) applyToLocal();
  if (USE_TURSO) await applyToTurso();

  if (!DRY_RUN) {
    console.log("🔑  Index'ler başarıyla entegre edildi.");
    console.log("    Veritabanı her ayağa kalktığında index koruması aktif.\n");
  }
}

main().catch((err) => {
  console.error("\n❌  Index uygulama başarısız:", err);
  process.exit(1);
});