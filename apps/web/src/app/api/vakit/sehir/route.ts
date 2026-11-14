export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

import { NextRequest, NextResponse } from "next/server";
import citiesJson from "../../../../data/diyanetCities.json";
import {
  decodeCities,
  findNearestCity,
  roundCoord,
  tzOffsetMin,
} from "../../../../lib/diyanetVakit";

const cities = decodeCities(citiesJson);

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
};

const NOT_FOUND_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600",
};

function parseNumber(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const lat = parseNumber(params.get("lat"));
  const lon = parseNumber(params.get("lon"));
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "bad_params" }, { status: 400 });
  }

  const offRaw = params.get("off");
  let off: number | null = null;
  if (offRaw !== null) {
    const parsedOff = parseNumber(offRaw);
    if (parsedOff === null || !Number.isInteger(parsedOff) || Math.abs(parsedOff) > 900) {
      return NextResponse.json({ error: "bad_params" }, { status: 400 });
    }
    off = parsedOff;
  }

  // Intl biçimleyici pahalı: aynı istekte her saat dilimi için bir kez hesapla.
  const at = new Date();
  const offsetCache = new Map<string, number | null>();
  const offsetOf = (tz: string): number | null => {
    if (!offsetCache.has(tz)) offsetCache.set(tz, tzOffsetMin(tz, at));
    return offsetCache.get(tz) ?? null;
  };

  const nearest = findNearestCity(roundCoord(lat), roundCoord(lon), cities, {
    maxKm: 50,
    ...(off !== null ? { utcOffsetMin: off, offsetOf } : {}),
  });

  if (nearest === null) {
    return NextResponse.json(
      { error: "no_city" },
      { status: 404, headers: NOT_FOUND_CACHE_HEADERS },
    );
  }

  const { city, distanceKm } = nearest;

  return NextResponse.json(
    {
      city: {
        id: city.id,
        name: city.name,
        state: city.state,
        country: city.country,
        tz: city.tz,
      },
      distanceKm: Math.round(distanceKm * 10) / 10,
    },
    { status: 200, headers: CACHE_HEADERS },
  );
}
