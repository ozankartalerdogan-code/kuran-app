import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseEnvFile,
  normalizePlaceList,
  flattenPlaces,
} from "./lib/diyanetPlaces.mjs";

const BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const MIN_REQUEST_DELAY_MS = 400;

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(SCRIPT_PATH), "..");
const ENV_PATH = new URL("../apps/web/.env.local", import.meta.url);
const DATA_DIR = path.join(ROOT_DIR, "data", "diyanet");
const CACHE_DIR = path.join(DATA_DIR, ".crawl-cache");
const OUTPUT_PATH = path.join(DATA_DIR, "places.json");

class CrawlError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.name = "CrawlError";
    this.exitCode = exitCode;
  }
}

let accessToken = null;
let refreshToken = null;
let requestCount = 0;
let maxRequests = 3000;
let lastRequestAt = 0;
let currentCountryIndex = 0;
let currentCountryTotal = 0;

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = { countryId: null, maxRequests: 3000 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--country") {
      const value = argv[index + 1];
      index += 1;
      const countryId = Number(value);
      if (value === undefined || !Number.isInteger(countryId)) {
        throw new CrawlError("--country için tam sayı bir ülke id'si gerekli.", 1);
      }
      args.countryId = countryId;
    } else if (arg === "--max-requests") {
      const value = argv[index + 1];
      index += 1;
      const limit = Number(value);
      if (value === undefined || !Number.isInteger(limit) || limit <= 0) {
        throw new CrawlError("--max-requests için pozitif bir tam sayı gerekli.", 1);
      }
      args.maxRequests = limit;
    } else {
      throw new CrawlError(`Bilinmeyen argüman: ${arg}`, 1);
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
  if (requestCount >= maxRequests) {
    throw new CrawlError(
      `İstek limiti aşıldı (${maxRequests}). Önbellek korundu.`,
      3,
    );
  }

  await sleep(MIN_REQUEST_DELAY_MS - (Date.now() - lastRequestAt));

  lastRequestAt = Date.now();
  requestCount += 1;

  if (requestCount % 25 === 0) {
    console.log(
      `[${requestCount} istek] ülke ${currentCountryIndex}/${currentCountryTotal}`,
    );
  }

  return fetch(url, options);
}

async function readCredentials() {
  const envPath = fileURLToPath(ENV_PATH);

  let text;
  try {
    text = await readFile(envPath, "utf8");
  } catch {
    throw new CrawlError(`Kimlik dosyası okunamadı: ${envPath}`, 1);
  }

  const env = parseEnvFile(text);
  const email = env.DIYANET_API_USER;
  const password = env.DIYANET_API_PASS;

  if (!email || !password) {
    throw new CrawlError(
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
    const message = json?.message ? `: ${json.message}` : "";
    throw new CrawlError(`Giriş başarısız (HTTP ${response.status})${message}`, 2);
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
    const message = json?.message ? `: ${json.message}` : "";
    throw new CrawlError(
      `${pathname} ucunda durdu (HTTP ${response.status})${message}. Önbellek korundu.`,
      2,
    );
  }

  if (!response.ok) {
    const message = json?.message ? `: ${json.message}` : "";
    throw new CrawlError(
      `${pathname} isteği başarısız (HTTP ${response.status})${message}`,
      2,
    );
  }

  if (!json) {
    throw new CrawlError(`${pathname} yanıtı geçerli JSON değil.`, 2);
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  maxRequests = args.maxRequests;

  const credentials = await readCredentials();

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  await login(credentials);

  let countriesJson = await readCache("countries.json");
  if (!countriesJson) {
    countriesJson = await apiGet("/api/Place/Countries", credentials);
    await writeCache("countries.json", countriesJson);
  }

  let countries = normalizePlaceList(countriesJson);
  if (args.countryId !== null) {
    countries = countries.filter((country) => country.id === args.countryId);
  }

  if (countries.length === 0) {
    const suffix = args.countryId !== null ? `: ${args.countryId}` : "";
    throw new CrawlError(`İşlenecek ülke bulunamadı${suffix}.`, 2);
  }

  currentCountryTotal = countries.length;

  const statesByCountry = {};
  const citiesByState = {};
  let stateCount = 0;

  for (let index = 0; index < countries.length; index += 1) {
    const country = countries[index];
    currentCountryIndex = index + 1;

    let statesJson = await readCache(`states-${country.id}.json`);
    if (!statesJson) {
      statesJson = await apiGet(`/api/Place/States/${country.id}`, credentials);
      await writeCache(`states-${country.id}.json`, statesJson);
    }

    const states = normalizePlaceList(statesJson);
    statesByCountry[country.id] = states;
    stateCount += states.length;

    for (const state of states) {
      let citiesJson = await readCache(`cities-${state.id}.json`);
      if (!citiesJson) {
        citiesJson = await apiGet(`/api/Place/Cities/${state.id}`, credentials);
        await writeCache(`cities-${state.id}.json`, citiesJson);
      }

      citiesByState[state.id] = normalizePlaceList(citiesJson);
    }
  }

  const cities = flattenPlaces(countries, statesByCountry, citiesByState);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "awqatsalah.diyanet.gov.tr",
        count: cities.length,
        cities,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `Toplam: ${countries.length} ülke, ${stateCount} eyalet, ${cities.length} şehir, ${requestCount} istek.`,
  );
}

main().catch((error) => {
  const exitCode = error instanceof CrawlError ? error.exitCode : 1;
  console.error(error && error.message ? error.message : String(error));
  process.exitCode = exitCode;
});
