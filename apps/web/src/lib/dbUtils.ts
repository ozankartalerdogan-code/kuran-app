/**
 * dbUtils.ts
 *
 * Turso (@libsql/client) veya yerel SQLite (node:sqlite) üzerinde
 * çalışan birleşik veritabanı yardımcıları.
 *
 * TURSO_DB_URL + TURSO_AUTH_TOKEN set ise → Turso kullanılır.
 * Aksi takdirde → local DatabaseSync (dev/test) kullanılır.
 *
 * API  :  dbAll<T>(sql, ...args)  → Promise<T[]>
 *         dbGet<T>(sql, ...args)  → Promise<T | undefined>
 */

import path from "path";
import fs from "fs";
import { createClient, type Client, type InArgs } from "@libsql/client";
import { DatabaseSync as _DatabaseSync } from "node:sqlite";

// ── Turso ─────────────────────────────────────────────────────────────────────

// ── Gömülü (bundle) SQLite tespiti ────────────────────────────────────────────
// Repoda apps/web/data/app_bundle.db varsa, Turso'yu tamamen atla ve veriyi
// kodla birlikte deploy edilen bu dosyadan oku. Böylece "hangi DB" sorunu biter.
function resolveBundlePath(): string | null {
  const candidates = [
    process.env.DATA_PATH ? path.join(process.env.DATA_PATH, "app_bundle.db") : "",
    path.resolve(process.cwd(), "data", "app_bundle.db"),
    path.resolve(process.cwd(), "apps", "web", "data", "app_bundle.db"),
    path.resolve(__dirname, "..", "..", "data", "app_bundle.db"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* ignore */ }
  }
  return null;
}
const BUNDLE_PATH = resolveBundlePath();

const USE_TURSO = !BUNDLE_PATH && !!(
  process.env.TURSO_DB_URL && process.env.TURSO_AUTH_TOKEN
);

// Lazy singleton — sunucu start'ta bir kez oluşturulur
let _tursoClient: Client | null = null;
let _tursoInitialized = false;

function getTursoClient(): Client {
  if (!_tursoClient) {
    _tursoClient = createClient({
      url:       process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return _tursoClient;
}

/**
 * Turso bağlantısı ilk kurulduğunda tüm performans index'lerini
 * otomatik uygular. CREATE INDEX IF NOT EXISTS kullanıldığı için
 * tekrar tekrar çağrılsa da sorun çıkarmaz.
 */
async function ensureTursoIndexes(): Promise<void> {
  if (_tursoInitialized) return;
  _tursoInitialized = true;

  const client = getTursoClient();
  const sqlPath = path.resolve(process.cwd(), "..", "..", "scripts", "indexes.sql");

  if (!fs.existsSync(sqlPath)) {
    console.warn("[dbUtils] indexes.sql bulunamadı, index optimizasyonu atlandı.");
    return;
  }

  const sql = fs.readFileSync(sqlPath, "utf-8");

  // SQL dosyasındaki comment satırlarını temizle, sadece CREATE INDEX'leri çıkar
  const cleanSql = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.toUpperCase().includes("CREATE INDEX"))
    .map((s) => s + ";");

  let applied = 0;
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      applied++;
    } catch {
      // IF NOT EXISTS olduğu için "already exists" güvenli
    }
  }
  console.log(`[dbUtils] ✅ ${applied} performans index'i Turso'da aktif.`);
}

// ── Yerel SQLite (dev / fallback) ─────────────────────────────────────────────

const DB_PATH = BUNDLE_PATH
  ? BUNDLE_PATH
  : process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, "app.db")
  : path.resolve(process.cwd(), "..", "..", "data", "app.db");

const READ_PRAGMAS = `
  PRAGMA cache_size    = -32768;
  PRAGMA mmap_size     = 268435456;
  PRAGMA temp_store    = MEMORY;
  PRAGMA busy_timeout  = 5000;
  PRAGMA journal_mode  = WAL;
`;

let _localDb: _DatabaseSync | null = null;

function getLocalDb(): _DatabaseSync {
  if (_localDb === null) {
    _localDb = new _DatabaseSync(DB_PATH, { readOnly: true });
    // Salt-okunur bundle'da (Vercel read-only FS) WAL pragma hata verebilir;
    // her pragma'yı tek tek dene, başarısız olanı yut.
    for (const stmt of READ_PRAGMAS.split(";").map((s) => s.trim()).filter(Boolean)) {
      try { _localDb.exec(stmt); } catch { /* read-only ortamda yoksay */ }
    }
  }
  return _localDb;
}

// ── Yardımcı: Turso Row → plain object ───────────────────────────────────────

function rowToObj<T>(row: Record<string, unknown>, cols: string[]): T {
  const obj: Record<string, unknown> = {};
  for (const col of cols) obj[col] = row[col] ?? null;
  return obj as T;
}

// ── Genel API ─────────────────────────────────────────────────────────────────

export async function dbAll<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  if (USE_TURSO) {
    await ensureTursoIndexes();
    const client = getTursoClient();
    const res = await client.execute({
      sql,
      // @libsql/client InArgs: (string | number | bigint | null | ArrayBuffer)[]
      args: args as InArgs,
    });
    return res.rows.map((row) => rowToObj<T>(row as Record<string, unknown>, res.columns));
  }

  const db = getLocalDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.prepare(sql).all(...(args as any[])) as T[];
}

export async function dbGet<T>(sql: string, ...args: unknown[]): Promise<T | undefined> {
  if (USE_TURSO) {
    await ensureTursoIndexes();
    const client = getTursoClient();
    const res = await client.execute({
      sql,
      args: args as InArgs,
    });
    if (!res.rows[0]) return undefined;
    return rowToObj<T>(res.rows[0] as Record<string, unknown>, res.columns);
  }

  const db = getLocalDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.prepare(sql).get(...(args as any[])) as T | undefined;
}

