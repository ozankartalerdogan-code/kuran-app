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
 *         dbRun(sql, ...args)     → Promise<void>
 */

import path from "path";
import { createClient, type Client, type InArgs } from "@libsql/client";
import { DatabaseSync as _DatabaseSync } from "node:sqlite";

// ── Turso ─────────────────────────────────────────────────────────────────────

const USE_TURSO = !!(
  process.env.TURSO_DB_URL && process.env.TURSO_AUTH_TOKEN
);

// Lazy singleton — sunucu start'ta bir kez oluşturulur
let _tursoClient: Client | null = null;

function getTursoClient(): Client {
  if (!_tursoClient) {
    _tursoClient = createClient({
      url:       process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return _tursoClient;
}

// ── Yerel SQLite (dev / fallback) ─────────────────────────────────────────────

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

let _localDb: _DatabaseSync | null = null;

function getLocalDb(): _DatabaseSync {
  if (_localDb === null) {
    _localDb = new _DatabaseSync(DB_PATH, { readOnly: true });
    _localDb.exec(READ_PRAGMAS);
  }
  return _localDb;
}

// ── Yardımcı: Turso Row → plain object ───────────────────────────────────────

function rowToObj(row: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const col of cols) obj[col] = row[col] ?? null;
  return obj;
}

// ── Genel API ─────────────────────────────────────────────────────────────────

export async function dbAll<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  if (USE_TURSO) {
    const client = getTursoClient();
    const res = await client.execute({
      sql,
      // @libsql/client InArgs: (string | number | bigint | null | ArrayBuffer)[]
      args: args as InArgs,
    });
    return res.rows.map(
      (row) => rowToObj(row as Record<string, unknown>, res.columns) as unknown as T
    );
  }

  const db = getLocalDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.prepare(sql).all(...(args as any[])) as T[];
}

export async function dbGet<T>(sql: string, ...args: unknown[]): Promise<T | undefined> {
  if (USE_TURSO) {
    const client = getTursoClient();
    const res = await client.execute({
      sql,
      args: args as InArgs,
    });
    if (!res.rows[0]) return undefined;
    return rowToObj(res.rows[0] as Record<string, unknown>, res.columns) as unknown as T;
  }

  const db = getLocalDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.prepare(sql).get(...(args as any[])) as T | undefined;
}

export async function dbRun(sql: string, ...args: unknown[]): Promise<void> {
  if (USE_TURSO) {
    const client = getTursoClient();
    await client.execute({
      sql,
      args: args as InArgs,
    });
    return;
  }

  const db = getLocalDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db.prepare(sql).run(...(args as any[]));
}

/**
 * getApiDb() — Geriye dönük uyumluluk için.
 * Yeni kod doğrudan dbAll/dbGet/dbRun kullanmalıdır.
 */
export function getApiDb(): { dbAll: typeof dbAll; dbGet: typeof dbGet; dbRun: typeof dbRun } {
  return { dbAll, dbGet, dbRun };
}
