import * as Location from "expo-location";
import { storage } from "./storage";
import { getManualCity, resolveDiyanetCity, roundCoord2 } from "./diyanetPrayer";
import { deviceOffsetMin, diyanetDeps } from "./diyanetPrayerDeps";
import { deviceTimeZone } from "./timeZone";
import { intlZoneSupported } from "./prayerInstant";
import type { PrayerContext } from "./prayerDayRepository";

export const ISTANBUL_FALLBACK = { lat: 41.0082, lng: 28.9784 };

// Başarılı her konum çözümü buraya yazılır. Canlı konum alınamadığında (özellikle
// ARKA PLAN görevi: yalnız-ön-plan izinle GPS çağrısı başarısız olur) İstanbul'a
// düşmeden önce kullanıcının son bilinen konumu kullanılır.
const LAST_COORDS_KEY = "lastKnownCoords";

export type Coords = { lat: number; lng: number };

export function rememberCoords(c: Coords): void {
  storage.setJSON(LAST_COORDS_KEY, c).catch(() => {});
}

// Son kaydedilen konum (yoksa null) — kıble ekranının anında açılması için.
export async function getSavedCoords(): Promise<Coords | null> {
  try {
    const saved = await storage.getJSON<Coords>(LAST_COORDS_KEY);
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") return saved;
  } catch { /* okunamadı */ }
  return null;
}

async function savedCoordsOrIstanbul(): Promise<Coords> {
  try {
    const saved = await storage.getJSON<Coords>(LAST_COORDS_KEY);
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") return saved;
  } catch { /* okunamadı — İstanbul'a düş */ }
  return ISTANBUL_FALLBACK;
}

// İzin SORMADAN mevcut izni okuyarak konum getirir (sessiz arka plan yenilemesi için).
export async function getLocationSilent(): Promise<Coords> {
  const manual = await getManualCity(diyanetDeps());
  if (manual !== null) return { lat: manual.lat, lng: manual.lon };
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return savedCoordsOrIstanbul();
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return savedCoordsOrIstanbul();
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    rememberCoords(c);
    return c;
  } catch {
    return savedCoordsOrIstanbul();
  }
}

// Ana sayfa konumu: eski davranış birebir — önce OS'un 10 dk içindeki son bilinen
// konumu (anında), yoksa 15 sn'e kadar canlı GPS; izin yoksa/başarısızsa İstanbul.
export async function getHomeLocation(): Promise<Coords> {
  const manual = await getManualCity(diyanetDeps()).catch(() => null);
  if (manual !== null) return { lat: manual.lat, lng: manual.lon };
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return ISTANBUL_FALLBACK;
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(() => null);
    const pos = lastKnown ?? await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 15000)),
    ]);
    if (pos && "coords" in pos) return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch { /* İstanbul'a düş */ }
  return ISTANBUL_FALLBACK;
}

export async function buildPrayerContext(lat: number, lng: number): Promise<PrayerContext> {
  const deps = diyanetDeps();
  const manual = await getManualCity(deps);
  const matchesManual = manual !== null && Math.abs(manual.lat - lat) < 1e-6 && Math.abs(manual.lon - lng) < 1e-6;
  const offMin = deviceOffsetMin();
  const city = matchesManual ? manual : await resolveDiyanetCity(lat, lng, offMin, deps);
  const deviceTz = deviceTimeZone();
  return {
    cityKey: city ? `${matchesManual ? "m" : "c"}${city.id}` : `geo:${roundCoord2(lat).toFixed(2)},${roundCoord2(lng).toFixed(2)}`,
    diyanetCity: city,
    lat, lon: lng, cityTimeZone: intlZoneSupported() ? city?.tz ?? deviceTz : deviceTz,
    deviceTimeZone: deviceTz, offMin, nowMs: Date.now(),
  };
}

