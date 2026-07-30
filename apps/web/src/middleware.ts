import { type NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis }     from "@upstash/redis";

// ── CORS ─────────────────────────────────────────────────────────────────────
//
// CORS'un TEK kaynağı burasıdır. Daha önce başlıklar hem burada (yalnız OPTIONS
// preflight'ında) hem next.config.mjs headers() bloğunda kuruluyordu; iki yerin
// production fallback origin'i birbirinden ayrışmıştı ve preflight ile asıl
// yanıt farklı origin'e izin veriyordu. next.config tarafı kaldırıldı.
//
// ALLOWED_ORIGINS virgülle ayrılmış liste olabilir. Access-Control-Allow-Origin
// çoklu değer KABUL ETMEZ; bu yüzden liste parse edilir ve aşağıdaki gerekçeyle
// yalnız ilki (kanonik origin) yayınlanır.

const DEFAULT_ORIGIN = "https://kuran-app-web-ozan-s-projects8.vercel.app";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? DEFAULT_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Production'da TEK bir origin yayınlanır. Origin başına yansıtma yapılamıyor:
// yanıtın origin'e göre değiştiğini belirtecek `Vary: Origin` Next 14'te
// /api yanıtlarına teslim edilemiyor (Next kendi Vary'sini middleware'den sonra
// yazıyor; next.config headers() ve middleware set/append — üçü de ölçüldü,
// üçü de eziliyor). Vary'siz origin-başına ACAO, rotaların `public, s-maxage`
// yanıtlarıyla (ör. /api/surahs bir yıl) birleşince paylaşımlı cache'in bir
// origin'e ait ACAO'yu diğerlerine servis etmesine yol açar. Sabit ACAO bu
// riski tamamen ortadan kaldırır; her istek aynı başlığı aldığı için Vary
// gerekmez. Yerel geliştirme zaten "*" aldığı için localhost etkilenmez.
//
// `?? DEFAULT_ORIGIN`: ALLOWED_ORIGINS tanımlı ama boş/yalnız virgül ise (panelde
// kazara boş kaydedilen bir değer) liste boşalır; `??` yukarıda boş string'i
// yakalamaz. O durumda `Access-Control-Allow-Origin: undefined` yayınlamak yerine
// bilinen production origin'ine düşülür.
const CANONICAL_ORIGIN = ALLOWED_ORIGINS[0] ?? DEFAULT_ORIGIN;

if (ALLOWED_ORIGINS.length > 1) {
  console.warn(
    `[middleware] ALLOWED_ORIGINS ${ALLOWED_ORIGINS.length} origin içeriyor; ` +
      `production'da yalnız ilki (${CANONICAL_ORIGIN}) yayınlanır. Birden çok ` +
      `origin gerçekten gerekiyorsa CORS rota katmanına taşınmalı (Vary: Origin ` +
      `oradan verilebilir).`,
  );
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":
      process.env.NODE_ENV === "development" ? "*" : CANONICAL_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age":       "86400",
  };
}

/**
 * CORS başlıklarını GEÇİŞ (NextResponse.next()) yanıtına uygular.
 *
 * Başlıklar sabit olduğu için burada cache'e dokunmaya gerek yok. (Not:
 * middleware'in `.next()` üzerinde set ettiği başlıklar rota başlıklarının
 * üzerine YAZMAZ, eklenir — bu yüzden Cache-Control gibi rotanın da yazdığı
 * bir başlık buradan güvenilir şekilde değiştirilemez.)
 */
function applyCors(res: NextResponse, cors: Record<string, string>): NextResponse {
  for (const [key, value] of Object.entries(cors)) {
    res.headers.set(key, value);
  }
  return res;
}

// ── Rate Limit ────────────────────────────────────────────────────────────────
//
// Upstash Redis yoksa (local dev) → basit in-memory fallback.
// Prod'da UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN zorunlu.

const USE_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Upstash sliding-window: 200 istek / 60 saniye / IP başına
const ratelimit = USE_REDIS
  ? new Ratelimit({
      redis:   Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(200, "60 s"),
      prefix:  "ratelimit",
    })
  : null;

// In-memory fallback (yalnızca local dev — serverless'ta çalışmaz)
interface Entry { count: number; resetAt: number }
const devMap = new Map<string, Entry>();

function devLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = devMap.get(ip);
  if (!entry || now > entry.resetAt) {
    devMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;        // allowed
  }
  if (entry.count >= 200) return false;  // blocked
  entry.count++;
  return true;
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const cors = corsHeaders();

  // OPTIONS preflight — rate limiter'ı atla, doğrudan 204 dön
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // ── Rate limit kontrolü ──────────────────────────────────────────────────
  if (ratelimit) {
    // Upstash Redis (production)
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Çok fazla istek. Lütfen bir dakika bekleyin." }),
        {
          status: 429,
          headers: {
            ...cors,
            "Content-Type":  "application/json",
            "Retry-After":   "60",
            "X-RateLimit-Limit":     String(limit),
            "X-RateLimit-Reset":     String(reset),
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    }

    const res = applyCors(NextResponse.next(), cors);
    res.headers.set("X-RateLimit-Limit",     String(limit));
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    res.headers.set("X-RateLimit-Reset",     String(reset));
    return res;
  }

  // In-memory fallback (local dev)
  if (!devLimit(ip)) {
    return new NextResponse(
      JSON.stringify({ error: "Çok fazla istek. Lütfen bir dakika bekleyin." }),
      {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", "Retry-After": "60" },
      },
    );
  }

  return applyCors(NextResponse.next(), cors);
}

export const config = {
  matcher: "/api/:path*",
};
