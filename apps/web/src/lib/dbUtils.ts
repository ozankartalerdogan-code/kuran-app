/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatabaseSync } from "node:sqlite";
import path from "path";

// ── Tip yardımcıları ──────────────────────────────────────────────────────────

export function dbAll<T>(stmt: { all(...args: any[]): unknown[] }, ...params: any[]): T[] {
  return stmt.all(...params) as unknown as T[];
}

export function dbGet<T>(stmt: { get(...args: any[]): unknown }, ...params: any[]): T | undefined {
  return stmt.get(...params) as unknown as T | undefined;
}

// ── Read-only Singleton ───────────────────────────────────────────────────────
// API route'ları her istekte yeni bağlantı açmak yerine bunu kullanır.
// Next.js dev modunda modül hot-reload ile sıfırlanabilir — bu beklenen davranış.

// Production-safe path: process.cwd() yerine NEXT_PUBLIC_DATA_PATH env var
// veya monorepo kökünü bulmak için package.json konumuna göre çözümleme.
// - Dev  : apps/web/../../data/app.db
// - Prod : DATA_PATH env var ile override edilebilir
const DB_PATH = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, "app.db")
  : path.resolve(process.cwd(), "..", "..", "data", "app.db");

const READ_PRAGMAS = `
  PRAGMA cache_size    = -32768;
  PRAGMA mmap_size     = 268435456;
  PRAGMA temp_store    = MEMORY;
  PRAGMA busy_timeout  = 5000;
  PRAGMA journal_mode  = WAL;
`;

let _apiDb: DatabaseSync | null = null;

export function getApiDb(): DatabaseSync {
  if (_apiDb === null) {
    _apiDb = new DatabaseSync(DB_PATH, { readOnly: true });
    _apiDb.exec(READ_PRAGMAS);
  }
  return _apiDb;
}
