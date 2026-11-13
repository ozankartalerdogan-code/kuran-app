// Kıble ekranının anlık konum seçimi: bekletmeden pusula açmak için eldeki en iyi konum.
// Kıble yönü şehir içinde neredeyse değişmez; eski konum yaklaşık gösterilir ve arka planda yenilenir.
export type LatLng = { latitude: number; longitude: number };
export type QuickFix = { coords: LatLng; refine: boolean } | null;

// Bu süreden yeni "son bilinen konum" taze sayılır, yenileme yapılmaz.
export const FRESH_FIX_MS = 10 * 60 * 1000;

function valid(c: { latitude?: unknown; longitude?: unknown } | null | undefined): c is LatLng {
  return !!c && typeof c.latitude === "number" && typeof c.longitude === "number" &&
    Number.isFinite(c.latitude) && Number.isFinite(c.longitude) &&
    Math.abs(c.latitude) <= 90 && Math.abs(c.longitude) <= 180 &&
    !(c.latitude === 0 && c.longitude === 0);
}

export function chooseQuickFix(
  lastKnown: { coords: { latitude: number; longitude: number }; timestamp: number } | null,
  saved: { lat: number; lng: number } | null,
  now: number,
): QuickFix {
  if (lastKnown && valid(lastKnown.coords)) {
    const age = now - lastKnown.timestamp;
    return { coords: { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude },
      refine: !(age >= 0 && age <= FRESH_FIX_MS) };
  }
  if (saved) {
    const coords = { latitude: saved.lat, longitude: saved.lng };
    if (valid(coords)) return { coords, refine: true };
  }
  return null;
}
