import { type NextRequest, NextResponse } from "next/server";

// Mobil istemciler aynı IP paylaşımlı NAT arkasından gelir; limit yükseltildi.
const LIMIT     = 200;
const WINDOW_MS = 60_000;

interface Entry { count: number; resetAt: number }
const rateMap = new Map<string, Entry>();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age":       "86400",
};

export function middleware(req: NextRequest): NextResponse {
  // OPTIONS preflight — rate limiter'ı atla, doğrudan 204 dön
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now   = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (entry.count >= LIMIT) {
    return new NextResponse(
      JSON.stringify({ error: "Çok fazla istek. Lütfen bir dakika bekleyin." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After":  "60",
        },
      },
    );
  }

  entry.count++;
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
