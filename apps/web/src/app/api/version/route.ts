export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { dbGet, getDataSource } from "../../../lib/dbUtils";

interface CountRow { n: number }
interface LitRow { len: number | null }

/**
 * Aktif veri kaynağından BAĞIMSIZ olarak Turso env'ine bağlanmayı dener.
 * Amaç: Vercel'in TURSO_DB_URL/TOKEN'ı doğru DB'ye bağlanıyor mu güvenle
 * doğrulamak. "ok:true + doğru sayılar" derse bağlantı sağlıklıdır.
 */
async function probeTurso() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return { configured: false };
  let host = "";
  try { host = new URL(url.replace(/^libsql:/, "https:")).host; } catch { /* yoksay */ }
  try {
    const c = createClient({ url, authToken });
    const v = await c.execute("SELECT COUNT(*) AS n FROM verses");
    const w = await c.execute("SELECT COUNT(*) AS n FROM words");
    return {
      configured: true,
      ok: true,
      host,
      verses: Number(v.rows[0]?.n ?? 0),
      words: Number(w.rows[0]?.n ?? 0),
    };
  } catch (e) {
    return { configured: true, ok: false, host, error: e instanceof Error ? e.message.split("\n")[0] : String(e) };
  }
}

/**
 * Canlının hangi veriyi sunduğunu tek bakışta gösterir.
 * Sessiz veri uyuşmazlığını görünür kılar:
 *   - source : turso | local-app.db            → "hangi DB" sorusunu bitirir
 *   - commit : deploy'un git SHA'sı            → "kod güncel mi"
 *   - counts : satır sayıları                  → "veri dolu mu"
 *   - sample : 2:255 literal uzunluğu          → "düzeltmeler yansıdı mı" (canlı tazelik sinyali)
 */
export async function GET() {
  const ds = getDataSource();
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const deployedAt = process.env.VERCEL_DEPLOYMENT_ID ? undefined : "dev";

  const payload: Record<string, unknown> = {
    source: ds.source,
    detail: ds.detail,
    commit,
    ...(deployedAt ? { env: deployedAt } : {}),
  };

  try {
    const verses = await dbGet<CountRow>("SELECT COUNT(*) AS n FROM verses");
    const words = await dbGet<CountRow>("SELECT COUNT(*) AS n FROM words");
    const lit = await dbGet<LitRow>(
      "SELECT LENGTH(literal_ceviri) AS len FROM verses WHERE verse_key = ?",
      "2:255",
    );
    payload.counts = { verses: verses?.n ?? 0, words: words?.n ?? 0 };
    payload.sample = { verse: "2:255", literalLen: lit?.len ?? null };
    payload.ok = true;
  } catch (e) {
    payload.ok = false;
    payload.error = e instanceof Error ? e.message.split("\n")[0] : String(e);
  }

  // Bundle'ı kaldırmadan önce Vercel'in Turso env'ini güvenle dene:
  payload.tursoProbe = await probeTurso();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
