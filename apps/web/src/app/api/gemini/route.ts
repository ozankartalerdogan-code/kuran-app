export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In‑memory rate limiter – 20 requests per minute per IP
// ---------------------------------------------------------------------------
const rateLimitWindowMs = 60_000;
const rateLimitMax = 20;
const ipHitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHitMap.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }

  if (entry.count >= rateLimitMax) return true;

  entry.count++;
  return false;
}

// Periodic cleanup – prevent memory leak from stale IPs
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipHitMap) {
      if (now > entry.resetAt) ipHitMap.delete(ip);
    }
  }, 120_000);
}

// ---------------------------------------------------------------------------
// Gemini API base URL
// ---------------------------------------------------------------------------
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Allowed models whitelist (prevents model‑enumeration attacks)
// ---------------------------------------------------------------------------
const ALLOWED_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);

// ---------------------------------------------------------------------------
// POST /api/gemini
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // --- Rate limit check ------------------------------------------------
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz bekleyin." },
      {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": "60",
        },
      },
    );
  }

  // --- API key ---------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[gemini] GEMINI_API_KEY tanımlı değil");
    return NextResponse.json(
      { error: "Sunucu yapılandırma hatası" },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  // --- Parse body ------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz JSON gövdesi" },
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  const parsed = body as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json(
      { error: "İstek gövdesi bir JSON nesnesi olmalıdır" },
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  // --- Validate prompt not empty ---------------------------------------
  const contents = parsed.contents;
  if (!contents) {
    return NextResponse.json(
      { error: "Prompt boş olamaz" },
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  if (Array.isArray(contents)) {
    const hasText = contents.some(
      (c: unknown) =>
        c &&
        typeof c === "object" &&
        Array.isArray((c as Record<string, unknown>).parts) &&
        ((c as Record<string, unknown>).parts as Array<unknown>).some(
          (p: unknown) =>
            typeof p === "object" && p !== null && typeof (p as Record<string, unknown>).text === "string" && ((p as Record<string, unknown>).text as string).trim().length > 0,
        ),
    );
    if (!hasText) {
      return NextResponse.json(
        { error: "Prompt boş olamaz" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
      );
    }
  }

  // --- Resolve model ---------------------------------------------------
  const model = typeof parsed.model === "string" ? parsed.model : "gemini-2.0-flash";
  if (!ALLOWED_MODELS.has(model)) {
    return NextResponse.json(
      { error: `Desteklenmeyen model: ${model}. İzin verilen modeller: ${[...ALLOWED_MODELS].join(", ")}` },
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  // --- Determine endpoint ----------------------------------------------
  // Gemini API offers generateContent and streamGenerateContent
  const stream = parsed.stream === true;
  const endpoint = stream ? "streamGenerateContent" : "generateContent";
  const url = `${GEMINI_BASE}/${model}:${endpoint}?key=${apiKey}`;

  // Build the forward payload (strip stream flag – Gemini expects it via
  // endpoint name, not a JSON field)
  const { stream: _stream, model: _model, ...forwardBody } = parsed;

  // --- Forward to Gemini -----------------------------------------------
  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardBody),
    });

    // For streaming, relay the response body directly
    if (stream) {
      return new NextResponse(geminiRes.body, {
        status: geminiRes.status,
        headers: {
          "Content-Type": geminiRes.headers.get("content-type") ?? "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non‑streaming – parse and return JSON
    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("[gemini] upstream error:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: "Gemini API hatası", detail: data },
        { status: geminiRes.status, headers: { "Content-Type": "application/json; charset=utf-8" } },
      );
    }

    return NextResponse.json(data, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("[gemini] fetch error:", err);
    return NextResponse.json(
      { error: "Gemini API'ye bağlanılamadı" },
      { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }
}