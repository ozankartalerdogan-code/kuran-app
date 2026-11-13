export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

import { NextRequest, NextResponse } from "next/server";
import citiesJson from "../../../../data/diyanetCities.json";
import { decodeCities } from "../../../../lib/diyanetVakit";
import { searchCities } from "../../../../lib/diyanetSearch";

const cities = decodeCities(citiesJson);

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  if (q.trim() === "" || q.length > 100) {
    return NextResponse.json({ error: "bad_params" }, { status: 400 });
  }

  const results = searchCities(cities, q, 20);

  return NextResponse.json(
    {
      cities: results.map((city) => ({
        id: city.id,
        name: city.name,
        state: city.state,
        country: city.country,
        tz: city.tz,
        lat: city.lat,
        lon: city.lon,
      })),
    },
    { status: 200, headers: CACHE_HEADERS },
  );
}
