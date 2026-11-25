const MECCA = { lat: 21.422487, lng: 39.826206 };

function toRad(d: number) { return d * (Math.PI / 180); }
function toDeg(r: number) { return r * 180 / Math.PI; }

// Büyük çemberin başlangıç yönü, gerçek kuzeye göre [0, 360).
export function calcQibla(lat: number, lng: number): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const dLng = toRad(MECCA.lng - lng);
  const φ1 = toRad(lat), φ2 = toRad(MECCA.lat);
  const x = Math.sin(dLng) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (toDeg(Math.atan2(x, y)) + 360) % 360;
}

// Kâbe'ye büyük çember mesafesi, km.
export function calcDist(lat: number, lng: number): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const R = 6371;
  const dLat = toRad(MECCA.lat - lat);
  const dLng = toRad(MECCA.lng - lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(MECCA.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}
