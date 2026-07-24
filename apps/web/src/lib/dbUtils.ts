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

// Veri kaynağı tek ve net: TURSO_DB_URL + TURSO_AUTH_TOKEN set ise Turso,
// aksi halde yerel data/app.db (dev). Sessiz fallback yok.
const USE_TURSO = process.env.QURAN_APP_FORCE_LOCAL_DB !== "1" && !!(
  process.env.TURSO_DB_URL && process.env.TURSO_AUTH_TOKEN
);

// Lazy singleton.
//
// KÖK SORUN (çözüldü): libsql HTTP transport'u global `fetch` kullanır.
// Next.js global fetch'i sarıp isteği (URL + SQL gövdesi) anahtarlayarak
// CACHE'liyordu → aynı SQL metni hep eski sonucu döndürüyordu (force-dynamic
// bile bu iç fetch'i durdurmuyordu; tek boşluk değişince taze geliyordu).
// Çözüm: libsql'e cache:'no-store' uygulayan özel bir fetch ver → Next cache'i
// tamamen baypas, her sorgu taze. (https:// şeması HTTP transport'u seçer ki
// özel fetch devreye girsin.)
let _tursoClient: Client | null = null;
let _tursoInitialized = false;

function getTursoClient(): Client {
  if (!_tursoClient) {
    const url = (process.env.TURSO_DB_URL ?? "").replace(/^libsql:\/\//, "https://");
    _tursoClient = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN!,
      fetch: ((...args: Parameters<typeof fetch>) => {
        const [input, init] = args;
        return fetch(input, { ...init, cache: "no-store" });
      }) as typeof fetch,
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

  // indexes.sql konumu ortama göre değişir (monorepo cwd vs. derlenmiş dosya
  // konumu). Birkaç aday yol dene; ilk bulunanı kullan.
  const sqlCandidates = [
    path.resolve(process.cwd(), "..", "..", "scripts", "indexes.sql"),
    path.resolve(process.cwd(), "scripts", "indexes.sql"),
    path.resolve(__dirname, "..", "..", "..", "..", "scripts", "indexes.sql"),
  ];
  const sqlPath = sqlCandidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  });

  if (!sqlPath) {
    console.warn(
      `[dbUtils] indexes.sql hiçbir aday yolda bulunamadı, index optimizasyonu atlandı. Denenen: ${sqlCandidates.join(", ")}`,
    );
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

const DB_PATH = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, "app.db")
  : path.resolve(process.cwd(), "..", "..", "data", "app.db");

const READ_PRAGMAS = `
  PRAGMA cache_size    = -32768;
  PRAGMA mmap_size     = 268435456;
  PRAGMA temp_store    = MEMORY;
  PRAGMA busy_timeout  = 5000;
`;

let _localDb: _DatabaseSync | null = null;

function getLocalDb(): _DatabaseSync {
  if (_localDb === null) {
    // Vercel'de yerel app.db yoktur; sessizce ona düşmek anlamsız bir
    // "unable to open database file" (ERR_SQLITE_ERROR) üretir. Eksik Turso
    // env'ini gizlemek yerine nedenini söyleyerek başarısız ol.
    if (process.env.VERCEL && process.env.QURAN_APP_FORCE_LOCAL_DB !== "1") {
      throw new Error(
        "[dbUtils] Turso yapılandırılmamış: bu Vercel ortamında (" +
          `VERCEL_ENV=${process.env.VERCEL_ENV ?? "?"}) TURSO_DB_URL ve ` +
          "TURSO_AUTH_TOKEN tanımlı değil. Env değişkenlerini ilgili ortama " +
          "(Production/Preview/Development) ekleyin; yerel SQLite fallback'i " +
          "Vercel'de kullanılamaz.",
      );
    }
    _localDb = new _DatabaseSync(DB_PATH, { readOnly: true });
    // Salt-okunur ortamda bazı PRAGMA'lar hata verebilir;
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

/**
 * Canlının HANGİ veri kaynağını okuduğunu dışa verir.
 * /api/version bununla "bundle mı Turso mu" sorusunu tek istekte yanıtlar;
 * "sessiz veri uyuşmazlığı" hatası böylece görünür hale gelir.
 */
export function getDataSource(): {
  source: "turso" | "local-app.db";
  detail: string;
} {
  if (USE_TURSO) {
    let host = "";
    const u = process.env.TURSO_DB_URL ?? "";
    try { host = new URL(u.replace(/^libsql:/, "https:")).host; } catch { /* yoksay */ }
    return { source: "turso", detail: host };
  }
  return { source: "local-app.db", detail: DB_PATH };
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

