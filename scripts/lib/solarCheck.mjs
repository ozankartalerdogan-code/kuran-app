const RAD = Math.PI / 180;
const HORIZON_DEG = 90.833;

function parseDateYmd(dateYmd) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateYmd ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function dayOfYear(year, month, day) {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86400000) + 1;
}

function solarParams(date) {
  const n = dayOfYear(date.year, date.month, date.day);
  const gamma = ((2 * Math.PI) / 365) * (n - 1 + 0.5);
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  return { eqtime, decl };
}

function hourAngleDeg(latDeg, decl) {
  const cosHa =
    Math.cos(HORIZON_DEG * RAD) / (Math.cos(latDeg * RAD) * Math.cos(decl)) -
    Math.tan(latDeg * RAD) * Math.tan(decl);
  return cosHa;
}

export function sunriseSunsetUtcMinutes(dateYmd, lat, lon) {
  const date = parseDateYmd(dateYmd);
  if (!date) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) >= 90 || Math.abs(lon) > 180) return null;

  const { eqtime, decl } = solarParams(date);
  const cosHa = hourAngleDeg(lat, decl);
  if (cosHa > 1 || cosHa < -1) return null;

  const haDeg = Math.acos(cosHa) / RAD;
  return {
    sunrise: 720 - 4 * (lon + haDeg) - eqtime,
    sunset: 720 - 4 * (lon - haDeg) - eqtime,
  };
}

export function parseHm(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function compareWithDiyanet({
  dateYmd,
  lat,
  lon,
  astronomicalSunrise,
  astronomicalSunset,
  offsetHours,
}) {
  if (!Number.isFinite(offsetHours)) return null;

  const localSunrise = parseHm(astronomicalSunrise);
  const localSunset = parseHm(astronomicalSunset);
  if (localSunrise === null || localSunset === null) return null;

  const solar = sunriseSunsetUtcMinutes(dateYmd, lat, lon);
  if (!solar) return null;

  const offsetMinutes = offsetHours * 60;
  const dSunrise = localSunrise - (solar.sunrise + offsetMinutes);
  const dSunset = localSunset - (solar.sunset + offsetMinutes);
  const diyanetNoon = (localSunrise + localSunset) / 2;
  const solarNoon = (solar.sunrise + solar.sunset) / 2 + offsetMinutes;

  return {
    dSunrise,
    dSunset,
    dNoon: diyanetNoon - solarNoon,
    dDayLength: localSunset - localSunrise - (solar.sunset - solar.sunrise),
  };
}

export function classify(cmp, { tolMin = 3 } = {}) {
  if (!cmp || !Number.isFinite(cmp.dSunrise) || !Number.isFinite(cmp.dSunset)) {
    return "unknown";
  }
  return Math.abs(cmp.dSunrise) <= tolMin && Math.abs(cmp.dSunset) <= tolMin
    ? "pass"
    : "fail";
}

export function solveLatLon({
  dateYmd,
  astronomicalSunrise,
  astronomicalSunset,
  offsetHours,
  latHint,
}) {
  const date = parseDateYmd(dateYmd);
  if (!date || !Number.isFinite(offsetHours)) return null;

  const localSunrise = parseHm(astronomicalSunrise);
  const localSunset = parseHm(astronomicalSunset);
  if (localSunrise === null || localSunset === null) return null;

  const offsetMinutes = offsetHours * 60;
  const sunriseUtc = localSunrise - offsetMinutes;
  const sunsetUtc = localSunset - offsetMinutes;
  if (sunsetUtc <= sunriseUtc) return null;

  const { eqtime, decl } = solarParams(date);
  const noonUtc = (sunriseUtc + sunsetUtc) / 2;
  let lon = (720 - eqtime - noonUtc) / 4;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;

  const targetHa = (sunsetUtc - sunriseUtc) / 8;
  if (!(targetHa > 0) || targetHa >= 180) return null;

  const sign = Number.isFinite(latHint) && latHint < 0 ? -1 : 1;

  const haAt = (absLat) => {
    const cosHa = hourAngleDeg(sign * absLat, decl);
    if (cosHa > 1) return 0;
    if (cosHa < -1) return 180;
    return Math.acos(cosHa) / RAD;
  };

  const haAtEquator = haAt(0);
  const haAtPole = haAt(89.9);
  const increasing = haAtPole >= haAtEquator;
  const minHa = Math.min(haAtEquator, haAtPole);
  const maxHa = Math.max(haAtEquator, haAtPole);
  if (targetHa < minHa || targetHa > maxHa) return null;

  let lo = 0;
  let hi = 89.9;
  for (let index = 0; index < 80; index += 1) {
    const mid = (lo + hi) / 2;
    const ha = haAt(mid);
    if (increasing) {
      if (ha < targetHa) lo = mid;
      else hi = mid;
    } else if (ha > targetHa) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { lat: sign * ((lo + hi) / 2), lon };
}
