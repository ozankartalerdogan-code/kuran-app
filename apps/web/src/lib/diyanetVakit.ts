export type DiyanetCity = {
  id: number;
  name: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
};

export type VakitKey = "imsak" | "gunes" | "ogle" | "ikindi" | "aksam" | "yatsi";

export type VakitDay = {
  date: string;
  times: Record<VakitKey, string>;
  hijri: { day: number; month: number; year: number } | null;
  utcOffsetMin: number;
};

const REQUIRED_CITY_FIELDS = ["id", "name", "state", "country", "lat", "lon", "tz"] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_SHORT_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const DATE_YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const HIJRI_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{1,4})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function decodeCities(json: unknown): DiyanetCity[] {
  if (!isRecord(json)) throw new Error("Gecersiz sehir verisi: kok nesne bekleniyordu");
  if (json.v !== 1) throw new Error(`Desteklenmeyen sehir verisi surumu: ${String(json.v)}`);
  if (!Array.isArray(json.fields) || !Array.isArray(json.rows)) {
    throw new Error("Gecersiz sehir verisi: fields ve rows dizileri gerekli");
  }

  const index = new Map<string, number>();
  json.fields.forEach((field, i) => {
    if (typeof field === "string") index.set(field, i);
  });

  const missingField = REQUIRED_CITY_FIELDS.some((field) => !index.has(field));
  if (missingField) return [];

  const cities: DiyanetCity[] = [];
  for (const row of json.rows) {
    if (!Array.isArray(row)) continue;

    const id = row[index.get("id")!];
    const name = row[index.get("name")!];
    const state = row[index.get("state")!];
    const country = row[index.get("country")!];
    const lat = row[index.get("lat")!];
    const lon = row[index.get("lon")!];
    const tz = row[index.get("tz")!];

    if (!Number.isInteger(id) || typeof id !== "number") continue;
    if (!isNonEmptyString(name) || typeof state !== "string" || typeof country !== "string") continue;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon) || !isNonEmptyString(tz)) continue;

    cities.push({ id, name, state, country, lat, lon, tz });
  }

  return cities;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function findNearestCity(
  lat: number,
  lon: number,
  cities: DiyanetCity[],
  opts?: { maxKm?: number; utcOffsetMin?: number; offsetOf?: (tz: string) => number | null },
): { city: DiyanetCity; distanceKm: number } | null {
  const maxKm = opts?.maxKm ?? 50;
  const filterByOffset = opts?.utcOffsetMin !== undefined && typeof opts?.offsetOf === "function";

  let best: { city: DiyanetCity; distanceKm: number } | null = null;

  for (const city of cities) {
    if (filterByOffset) {
      const cityOffset = opts!.offsetOf!(city.tz);
      if (cityOffset !== null && cityOffset !== opts!.utcOffsetMin) continue;
    }

    const distanceKm = haversineKm(lat, lon, city.lat, city.lon);
    if (best === null || distanceKm < best.distanceKm) {
      best = { city, distanceKm };
    }
  }

  if (best === null || best.distanceKm > maxKm) return null;
  return best;
}

export function roundCoord(x: number): number {
  return roundTo(x, 2);
}

export function parseDiyanetHijri(
  s: string | null | undefined,
): { day: number; month: number; year: number } | null {
  if (typeof s !== "string") return null;
  const match = HIJRI_PATTERN.exec(s.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!Number.isInteger(day) || day < 1 || day > 30) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 1) return null;

  return { day, month, year };
}

export function formatOffset(min: number): string {
  if (!Number.isFinite(min)) return "+00:00";
  const total = Math.round(min);
  const sign = total < 0 ? "-" : "+";
  const absolute = Math.abs(total);
  return `${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;
}

function parseGregorianDateShort(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = DATE_SHORT_PATTERN.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function normalizeDiyanetDay(raw: unknown): VakitDay | null {
  if (!isRecord(raw)) return null;

  const date = parseGregorianDateShort(raw.gregorianDateShort);
  if (date === null) return null;

  const fajr = raw.fajr;
  const sunrise = raw.sunrise;
  const dhuhr = raw.dhuhr;
  const asr = raw.asr;
  const maghrib = raw.maghrib;
  const isha = raw.isha;

  if (
    !validTime(fajr) ||
    !validTime(sunrise) ||
    !validTime(dhuhr) ||
    !validTime(asr) ||
    !validTime(maghrib) ||
    !validTime(isha)
  ) {
    return null;
  }

  const gmt = raw.greenwichMeanTimeZone;
  if (!isFiniteNumber(gmt)) return null;

  const utcOffsetMin = Math.round(gmt * 60);
  if (!Number.isFinite(utcOffsetMin)) return null;

  const offset = formatOffset(utcOffsetMin);
  const at = (time: string) => `${date}T${time}:00${offset}`;

  return {
    date,
    times: {
      imsak: at(fajr),
      gunes: at(sunrise),
      ogle: at(dhuhr),
      ikindi: at(asr),
      aksam: at(maghrib),
      yatsi: at(isha),
    },
    hijri: parseDiyanetHijri(
      typeof raw.hijriDateShort === "string" ? raw.hijriDateShort : null,
    ),
    utcOffsetMin,
  };
}

export function monthKey(dateYmd: string): string {
  return dateYmd.slice(0, 7);
}

export function monthsToServe(todayYmd: string): string[] {
  const match = DATE_YMD_PATTERN.exec(todayYmd);
  if (!match) throw new Error(`Gecersiz tarih: ${todayYmd}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Gecersiz tarih: ${todayYmd}`);
  }

  const months = [`${year}-${pad2(month)}`];
  if (day > daysInMonth(year, month) - 7) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    months.push(`${nextYear}-${pad2(nextMonth)}`);
  }

  return months;
}

export function monthDateRange(month: string): { start: string; end: string } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) throw new Error(`Gecersiz ay: ${month}`);

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Gecersiz ay: ${month}`);
  }

  return {
    start: `${year}-${pad2(monthNumber)}-01`,
    end: `${year}-${pad2(monthNumber)}-${pad2(daysInMonth(year, monthNumber))}`,
  };
}
