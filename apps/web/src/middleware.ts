import { type NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis }     from "@upstash/redis";

// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  process.env.NODE_ENV === "development"
    ? "*"
    : (process.env.ALLOWED_ORIGINS ?? "https://kuranapp.vercel.app"),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age":       "86400",
  "Vary":                         "Origin",
};

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
  // OPTIONS preflight — rate limiter'ı atla, doğrudan 204 dön
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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
            "Content-Type":  "application/json",
            "Retry-After":   "60",
            "X-RateLimit-Limit":     String(limit),
            "X-RateLimit-Reset":     String(reset),
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    }

    const res = NextResponse.next();
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
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
