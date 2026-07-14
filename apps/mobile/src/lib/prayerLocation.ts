export type PrayerCoords = { lat: number; lng: number };

export function toPrayerCoords(value: unknown): PrayerCoords | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const lat = candidate.lat;
  const lng = candidate.lng;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

export function samePrayerLocation(
  first: PrayerCoords,
  second: PrayerCoords,
  tolerance = 0.01,
): boolean {
  return Math.abs(first.lat - second.lat) <= tolerance && Math.abs(first.lng - second.lng) <= tolerance;
}
