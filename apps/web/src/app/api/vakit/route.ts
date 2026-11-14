export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import citiesJson from "../../../data/diyanetCities.json";
import {
  decodeCities,
  monthDateRange,
  normalizeDiyanetDay,
} from "../../../lib/diyanetVakit";
import {
  createDiyanetClient,
  DiyanetUpstreamError,
} from "../../../lib/diyanetClient";
import { createVakitService, UpstreamUnavailableError } from "../../../lib/vakitService";
import { getVakitStore } from "../../../lib/vakitStore";

const cities = decodeCities(citiesJson);
const cityById = new Map(cities.map((city) => [city.id, city]));

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const COMPLETE_CACHE = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

const PARTIAL_CACHE = {
  "Cache-Control": "public, s-maxage=600",
};

const USE_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const diyanetRedis = USE_REDIS ? Redis.fromEnv() : null;
const diyanetRatelimit = diyanetRedis
  ? new Ratelimit({
      redis: diyanetRedis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "diyanet:rl",
    })
  : null;

const LOCK_TTL_SECONDS = 15;

async function acquireDiyanetSlot(
  cityId: number,
  startYmd: string,
): Promise<boolean | (() => Promise<void>)> {
  if (!diyanetRedis || !diyanetRatelimit) return true;

  const lockKey = `diyanet:lock:${cityId}:${startYmd}`;
  try {
    const locked = await diyanetRedis.set(lockKey, "1", {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });
    if (!locked) return false;

    const { success } = await diyanetRatelimit.limit("global");
    if (!success) {
      await diyanetRedis.del(lockKey).catch(() => undefined);
      return false;
    }

    return async () => {
      await diyanetRedis.del(lockKey).catch(() => undefined);
    };
  } catch {
    // Paylaşılan altyapı geçici olarak erişilemezse tek örnek sınırına düş.
    return true;
  }
}

let service: ReturnType<typeof createVakitService> | null = null;

function getService(): ReturnType<typeof createVakitService> {
  if (service !== null) return service;

  const store = getVakitStore();

  const client = createDiyanetClient({
    fetch: (input, init) => fetch(input, init),
    now: () => Math.floor(Date.now() / 1000),
    credentials: () => {
      const email = process.env.DIYANET_API_USER;
      const password = process.env.DIYANET_API_PASS;
      return email && password ? { email, password } : null;
    },
    loadAuth: () => store.loadAuth(),
    saveAuth: (state) => store.saveAuth(state),
    acquireSlot: (cityId, startYmd) => acquireDiyanetSlot(cityId, startYmd),
    maxQueue: 10,
    minIntervalMs: 200,
  });

  service = createVakitService({
    store,
    fetchDateRange: (cityId, startYmd, endYmd) =>
      client.fetchDateRange(cityId, startYmd, endYmd),
    normalize: normalizeDiyanetDay,
    monthDateRange,
    now: () => Math.floor(Date.now() / 1000),
  });

  return service;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const rawMonth = params.get("month");
  if (rawMonth === null) {
    return NextResponse.json({ error: "bad_month" }, { status: 400 });
  }

  const monthMatch = MONTH_PATTERN.exec(rawMonth);
  if (!monthMatch) {
    return NextResponse.json({ error: "bad_month" }, { status: 400 });
  }

  const year = Number(monthMatch[1]);
  const monthNumber = Number(monthMatch[2]);
  const now = new Date();
  const current = monthIndex(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const requested = monthIndex(year, monthNumber);

  if (requested < current - 1 || requested > current + 2) {
    return NextResponse.json({ error: "month_out_of_range" }, { status: 400 });
  }

  const rawCityId = params.get("cityId");
  const cityId = rawCityId === null ? NaN : Number(rawCityId);
  const city = Number.isInteger(cityId) ? cityById.get(cityId) : undefined;

  if (!city) {
    return NextResponse.json({ error: "unknown_city" }, { status: 404 });
  }

  try {
    const result = await getService().getMonth(city.id, rawMonth);

    return NextResponse.json(
      {
        source: "diyanet",
        city: {
          id: city.id,
          name: city.name,
          state: city.state,
          country: city.country,
          tz: city.tz,
        },
        month: rawMonth,
        complete: result.complete,
        days: result.days,
      },
      { headers: result.complete ? COMPLETE_CACHE : PARTIAL_CACHE },
    );
  } catch (error) {
    const upstream = error instanceof UpstreamUnavailableError ? error.upstream : error;
    const status = upstream instanceof DiyanetUpstreamError ? upstream.status : 0;
    const detail = upstream instanceof DiyanetUpstreamError ? upstream.detail : "";
    const name = upstream instanceof Error ? upstream.name : "Error";
    console.error(`[api/vakit] ${name} status=${status} detail=${detail} cityId=${city.id}`);

    return NextResponse.json(
      { error: "upstream_unavailable", fallback: "aladhan" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
