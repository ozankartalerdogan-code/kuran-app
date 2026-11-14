import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseEnvFile } from "./lib/diyanetPlaces.mjs";
import { classify, compareWithDiyanet, solveLatLon } from "./lib/solarCheck.mjs";

const BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const MIN_REQUEST_DELAY_MS = 400;
const DEFAULT_METHODS = ["state-nearest", "dominant-pop"];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(SCRIPT_PATH), "..");
const ENV_PATH = new URL("../apps/web/.env.local", import.meta.url);
const DATA_DIR = path.join(ROOT_DIR, "data", "diyanet");
const CACHE_DIR = path.join(DATA_DIR, ".crawl-cache");
const PLACES_PATH = path.join(DATA_DIR, "places-with-coords.json");
const OUTPUT_PATH = path.join(DATA_DIR, "coords-verify.json");

const ALLOWED_ERROR_CODES = new Set([
  "BAD_ARGS",
  "ENV_READ_FAILED",
  "MISSING_CREDENTIALS",
  "AUTH_FAILED",
  "UPSTREAM_STOPPED",
  "UPSTREAM_HTTP_ERROR",
  "INVALID_JSON",
  "NO_CITIES",
  "INVALID_DAILY_RESPONSE",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "ABORT_ERR",
]);

class VerifyError extends Error {
  constructor(message, exitCode, code = "VERIFY_ERROR", status = 0) {
    super(message);
    this.name = "VerifyError";
    this.exitCode = exitCode;
    this.code = ALLOWED_ERROR_CODES.has(code) ? code : "VERIFY_ERROR";
    this.status = Number.isInteger(status) ? status : 0;
  }
}

function safeErrorCode(error) {
  if (error instanceof VerifyError) return error.code;
  const rawCode =
    (error && typeof error.code === "string" && error.code) ||
    (error && error.cause && typeof error.cause.code === "string" && error.cause.code) ||
    "";
  return ALLOWED_ERROR_CODES.has(rawCode) ? rawCode : "UNKNOWN_ERROR";
}

let accessToken = null;
let refreshToken = null;
let requestCount = 0;
let requestDelayMs = 1000;
let lastRequestAt = 0;

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (value === undefined || !Number.isInteger(parsed) || parsed <= 0) {
    throw new VerifyError(`${label} için pozitif bir tam sayı gerekli.`, 1);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {
    methods: [...DEFAULT_METHODS],
    samples: [],
    cityIds: null,
    limit: null,
    delay: 1000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === "--methods") {
      index += 1;
      if (value === undefined) {
        throw new VerifyError("--methods için en az bir yöntem gerekli.", 1);
      }
      args.methods = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (args.methods.length === 0) {
        throw new VerifyError("--methods için en az bir yöntem gerekli.", 1);
      }
    } else if (arg === "--sample") {
      index += 1;
      if (value === undefined) {
        throw new VerifyError("--sample değeri <method>:<n> biçiminde olmalı.", 1);
      }
      const separator = value.lastIndexOf(":");
      if (separator <= 0) {
        throw new VerifyError("--sample değeri <method>:<n> biçiminde olmalı.", 1);
      }
      const method = value.slice(0, separator).trim();
      if (!method) {
        throw new VerifyError("--sample için yöntem adı gerekli.", 1);
      }
      args.samples.push({
        method,
        count: parsePositiveInt(value.slice(separator + 1), "--sample"),
      });
    } else if (arg === "--city-ids") {
      index += 1;
      if (value === undefined) {
        throw new VerifyError("--city-ids için virgülle ayrılmış id listesi gerekli.", 1);
      }
      const ids = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => parsePositiveInt(item, "--city-ids"));
      args.cityIds = ids;
    } else if (arg === "--limit") {
      index += 1;
      args.limit = parsePositiveInt(value, "--limit");
    } else if (arg === "--delay") {
      index += 1;
      const delay = Number(value);
      if (value === undefined || !Number.isInteger(delay) || delay < 0) {
        throw new VerifyError("--delay için sıfır veya pozitif bir tam sayı gerekli.", 1);
      }
      args.delay = delay;
    } else {
      throw new VerifyError(`Bilinmeyen argüman: ${arg}`, 1);
    }
  }

  return args;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function rawFetch(url, options = {}) {
  await sleep(Math.max(requestDelayMs, MIN_REQUEST_DELAY_MS) - (Date.now() - lastRequestAt));

  lastRequestAt = Date.now();
  requestCount += 1;

  return fetch(url, options);
}

async function readCredentials() {
  const envPath = fileURLToPath(ENV_PATH);

  let text;
  try {
    text = await readFile(envPath, "utf8");
  } catch {
    throw new VerifyError(`Kimlik dosyası okunamadı: ${envPath}`, 1);
  }

  const env = parseEnvFile(text);
  const email = env.DIYANET_API_USER;
  const password = env.DIYANET_API_PASS;

  if (!email || !password) {
    throw new VerifyError(
      "DIYANET_API_USER veya DIYANET_API_PASS eksik (apps/web/.env.local).",
      1,
    );
  }

  return { email, password };
}

async function login(credentials) {
  const response = await rawFetch(`${BASE_URL}/Auth/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  const json = await readJsonResponse(response);

  if (!response.ok || !json || json.success !== true || !json.data?.accessToken) {
    throw new VerifyError(
      `Giriş başarısız (HTTP ${response.status}, code=AUTH_FAILED)`,
      2,
      "AUTH_FAILED",
      response.status,
    );
  }

  accessToken = json.data.accessToken;
  if (json.data.refreshToken) refreshToken = json.data.refreshToken;
}

async function refreshAuth(credentials) {
  if (!refreshToken) {
    await login(credentials);
    return;
  }

  const response = await rawFetch(
    `${BASE_URL}/Auth/RefreshToken/${encodeURIComponent(refreshToken)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const json = await readJsonResponse(response);

  if (!response.ok || !json || json.success !== true || !json.data?.accessToken) {
    await login(credentials);
    return;
  }

  accessToken = json.data.accessToken;
  if (json.data.refreshToken) refreshToken = json.data.refreshToken;
}

async function apiGet(pathname, credentials) {
  let response = await rawFetch(`${BASE_URL}${pathname}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    await refreshAuth(credentials);
    response = await rawFetch(`${BASE_URL}${pathname}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  const json = await readJsonResponse(response);

  if (response.status === 403 || response.status === 429 || response.status >= 500) {
    throw new VerifyError(
      `${pathname} ucunda durdu (HTTP ${response.status}, code=UPSTREAM_STOPPED). Sonuçlar yazıldı.`,
      2,
      "UPSTREAM_STOPPED",
      response.status,
    );
  }

  if (!response.ok) {
    throw new VerifyError(
      `${pathname} isteği başarısız (HTTP ${response.status}, code=UPSTREAM_HTTP_ERROR)`,
      2,
      "UPSTREAM_HTTP_ERROR",
      response.status,
    );
  }

  if (!json) {
    throw new VerifyError(
      `${pathname} yanıtı geçerli JSON değil (HTTP ${response.status}, code=INVALID_JSON).`,
      2,
      "INVALID_JSON",
      response.status,
    );
  }

  return json;
}

async function readCache(fileName) {
  try {
    return JSON.parse(await readFile(path.join(CACHE_DIR, fileName), "utf8"));
  } catch {
    return null;
  }
}

async function writeCache(fileName, json) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    path.join(CACHE_DIR, fileName),
    `${JSON.stringify(json, null, 2)}\n`,
    "utf8",
  );
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayYmdLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function parseGregorianDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function tzOffsetHoursAt(timeZone, date) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
    const part = formatter
      .formatToParts(date)
      .find((item) => item.type === "timeZoneName");
    if (!part) return null;

    const value = part.value;
    if (value === "GMT") return 0;
    const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(value);
    if (!match) return null;

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = match[3] ? Number(match[3]) : 0;
    return sign * (hours + minutes / 60);
  } catch {
    return null;
  }
}

function dateAtUtcNoon(dateYmd) {
  return new Date(`${dateYmd}T12:00:00Z`);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function round(value, digits) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededSample(list, count, seedKey) {
  const copy = [...list];
  const random = mulberry32(hashString(seedKey));
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy.slice(0, count);
}

function selectCities(cities, args) {
  const usable = cities.filter(
    (city) => Number.isFinite(city.lat) && Number.isFinite(city.lon),
  );

  if (args.cityIds) {
    const wanted = new Set(args.cityIds);
    return usable.filter((city) => wanted.has(city.cityId));
  }

  const byMethod = new Map();
  for (const city of usable) {
    let list = byMethod.get(city.matchMethod);
    if (!list) {
      list = [];
      byMethod.set(city.matchMethod, list);
    }
    list.push(city);
  }

  const picked = new Map();
  for (const method of args.methods) {
    for (const city of byMethod.get(method) || []) {
      picked.set(city.cityId, city);
    }
  }
  for (const sample of args.samples) {
    const pool = byMethod.get(sample.method) || [];
    for (const city of seededSample(pool, sample.count, sample.method)) {
      picked.set(city.cityId, city);
    }
  }

  const selected = [...picked.values()].sort((a, b) => a.cityId - b.cityId);
  return args.limit === null ? selected : selected.slice(0, args.limit);
}

async function readExistingResults() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    if (parsed && parsed.results && typeof parsed.results === "object") {
      return parsed.results;
    }
  } catch {
    // ilk çalıştırma
  }
  return {};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requestDelayMs = args.delay;

  const places = JSON.parse(await readFile(PLACES_PATH, "utf8"));
  const sourceCities = Array.isArray(places.cities) ? places.cities : [];
  const selected = selectCities(sourceCities, args);

  if (selected.length === 0) {
    throw new VerifyError("Doğrulanacak şehir bulunamadı.", 2);
  }

  const credentials = await readCredentials();

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  await login(credentials);

  const results = await readExistingResults();
  const counts = { pass: 0, fail: 0, unknown: 0 };
  const failures = [];
  let tzMismatchCount = 0;
  const today = todayYmdLocal();

  const flush = async () => {
    await writeFile(
      OUTPUT_PATH,
      `${JSON.stringify(
        { generatedAt: new Date().toISOString(), results },
        null,
        2,
      )}\n`,
      "utf8",
    );
  };

  for (let index = 0; index < selected.length; index += 1) {
    const city = selected[index];

    try {
      const cacheName = `daily-${city.cityId}-${today}.json`;
      let daily = await readCache(cacheName);
      if (!daily) {
        daily = await apiGet(`/api/PrayerTime/Daily/${city.cityId}`, credentials);
        await writeCache(cacheName, daily);
      }

      const entry = Array.isArray(daily?.data) ? daily.data[0] : null;
      if (!entry || typeof entry !== "object") {
        throw new VerifyError(
          `${city.cityName} (${city.cityId}) Daily yanıtı geçersiz.`,
          2,
        );
      }

      const dateYmd = parseGregorianDate(entry.gregorianDateShort) || today;
      const offsetHours = Number(entry.greenwichMeanTimeZone);
      const cmp = Number.isFinite(offsetHours)
        ? compareWithDiyanet({
            dateYmd,
            lat: city.lat,
            lon: city.lon,
            astronomicalSunrise: entry.astronomicalSunrise,
            astronomicalSunset: entry.astronomicalSunset,
            offsetHours,
          })
        : null;

      const status = classify(cmp);
      const solved = solveLatLon({
        dateYmd,
        astronomicalSunrise: entry.astronomicalSunrise,
        astronomicalSunset: entry.astronomicalSunset,
        offsetHours,
        latHint: city.lat,
      });

      const tzOffset = city.tz
        ? tzOffsetHoursAt(city.tz, dateAtUtcNoon(dateYmd))
        : null;
      const tzMismatch =
        tzOffset !== null &&
        Number.isFinite(offsetHours) &&
        Math.abs(tzOffset - offsetHours) > 1e-6;

      results[city.cityId] = {
        status,
        lat: city.lat,
        lon: city.lon,
        tz: city.tz ?? null,
        geonameId: city.geonameId ?? null,
        dSunrise: cmp ? round(cmp.dSunrise, 2) : null,
        dSunset: cmp ? round(cmp.dSunset, 2) : null,
        solvedLat: solved ? round(solved.lat, 4) : null,
        solvedLon: solved ? round(solved.lon, 4) : null,
        distanceKmToSolved: solved
          ? round(haversineKm(city.lat, city.lon, solved.lat, solved.lon), 1)
          : null,
        tzMismatch,
        offsetHours: Number.isFinite(offsetHours) ? offsetHours : null,
        date: dateYmd,
      };

      counts[status] += 1;
      if (tzMismatch) tzMismatchCount += 1;
      if (status === "fail" && failures.length < 30) {
        failures.push({
          cityName: city.cityName,
          countryCode: city.countryCode,
          dSunrise: results[city.cityId].dSunrise,
          dSunset: results[city.cityId].dSunset,
          distanceKmToSolved: results[city.cityId].distanceKmToSolved,
        });
      }
    } catch (error) {
      await flush();
      throw error;
    }

    if ((index + 1) % 25 === 0) {
      console.log(`[${index + 1}/${selected.length}] ${city.cityName}`);
    }
  }

  await flush();

  console.log(`Doğrulanan şehir: ${selected.length}`);
  console.log(
    `pass: ${counts.pass}, fail: ${counts.fail}, unknown: ${counts.unknown}`,
  );
  console.log(`tzMismatch: ${tzMismatchCount}`);

  if (failures.length > 0) {
    console.log("İlk fail eden şehirler:");
    for (const item of failures) {
      console.log(
        `  ${item.cityName} (${item.countryCode}) dSunrise=${item.dSunrise} dSunset=${item.dSunset} uzaklık=${item.distanceKmToSolved}km`,
      );
    }
  }
}

main().catch((error) => {
  const exitCode = error instanceof VerifyError ? error.exitCode : 1;
  if (error instanceof VerifyError) {
    console.error(error.message);
  } else {
    console.error(`Beklenmeyen hata (code=${safeErrorCode(error)})`);
  }
  process.exitCode = exitCode;
});
