/**
 * diyanetPrayer.ts — cihazın kendi sunucumuzdaki Diyanet vakitlerini çözmesi.
 *
 * Saf modül: hiçbir değer importu yoktur (yalnız `import type` serbest). Ağ,
 * depolama ve saat bağımlılıkları `DiyanetPrayerDeps` üzerinden enjekte edilir;
 * böylece node --test ile doğrudan test edilebilir ve `import.meta` /
 * `createRequire` gerekmez. Aladhan yolu silinmez — bu modül yalnız Diyanet
 * yolunu dener; çağıran taraf başarısız olursa Aladhan'a düşer.
 */

export type DiyanetCityRef = {
  id: number;
  name: string;
  state: string;
  country: string;
  tz: string;
};

export type PrayerTimesHm = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

export type DiyanetDayOut = {
  times: PrayerTimesHm;
  hijri: { day: number; monthNumber: number; year: number } | null;
  city: DiyanetCityRef;
};

export type DiyanetPrayerDeps = {
  getJson: (
    path: string,
    timeoutMs: number,
  ) => Promise<{ status: number; body: unknown }>;
  readStore: (key: string) => Promise<unknown>;
  writeStore: (key: string, value: unknown) => Promise<void>;
  nowMs: () => number;
};

export const DIYANET_CITY_KEY = "diyanetCityV1";
export const DIYANET_MONTHS_KEY = "diyanetMonthsV1";

const CITY_REUSE_KM = 15;
const CITY_TIMEOUT_MS = 6000;
const MONTH_TIMEOUT_MS = 8000;
const DAY_MS = 86_400_000;
const CITY_TTL_MS = 30 * DAY_MS;
const NO_CITY_TTL_MS = 7 * DAY_MS;
const PARTIAL_MONTH_TTL_MS = 3_600_000;
const MAX_MONTH_KEYS = 6;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

type MonthEntry = {
  complete: boolean;
  fetchedAt: number;
  days: unknown[];
};

type CityCache = {
  lat: number;
  lon: number;
  off: number;
  city: DiyanetCityRef | null;
  at: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 2 ondalık (gizlilik): koordinatlar sunucuya daha hassas gitmez. */
export function roundCoord2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** ISO zaman damgası → cihazın yerel "HH:MM" değeri; geçersizse null. */
export function isoToLocalHm(iso: string): string | null {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function parseCity(value: unknown): DiyanetCityRef | null {
  if (!isRecord(value)) return null;
  const { id, name, state, country, tz } = value;
  if (!Number.isInteger(id)) return null;
  if (
    typeof name !== "string" ||
    typeof state !== "string" ||
    typeof country !== "string" ||
    typeof tz !== "string"
  ) {
    return null;
  }
  return { id: id as number, name, state, country, tz };
}

function parseCityCache(value: unknown): CityCache | null {
  if (!isRecord(value)) return null;
  if (
    !isFiniteNumber(value.lat) ||
    !isFiniteNumber(value.lon) ||
    !isFiniteNumber(value.off) ||
    !isFiniteNumber(value.at)
  ) {
    return null;
  }
  let city: DiyanetCityRef | null = null;
  if (value.city !== null) {
    city = parseCity(value.city);
    if (city === null) return null;
  }
  return { lat: value.lat, lon: value.lon, off: value.off, city, at: value.at };
}

async function safeRead(
  deps: DiyanetPrayerDeps,
  key: string,
): Promise<unknown> {
  try {
    return await deps.readStore(key);
  } catch {
    return null;
  }
}

async function safeWrite(
  deps: DiyanetPrayerDeps,
  key: string,
  value: unknown,
): Promise<void> {
  try {
    await deps.writeStore(key, value);
  } catch {
    /* önbellek yazımı başarısız olsa da sonuç döndürülür */
  }
}

/**
 * Konuma en yakın Diyanet şehrini çözer.
 * null = kesin "şehir yok" (50 km içinde Diyanet şehri yok),
 * undefined = bilinmiyor (sunucu/ağ sorunu — önbelleğe "yok" yazılmaz).
 */
export async function resolveDiyanetCity(
  lat: number,
  lon: number,
  offMin: number,
  deps: DiyanetPrayerDeps,
): Promise<DiyanetCityRef | null | undefined> {
  const rLat = roundCoord2(lat);
  const rLon = roundCoord2(lon);
  const now = deps.nowMs();
  const cached = parseCityCache(await safeRead(deps, DIYANET_CITY_KEY));

  const near =
    cached !== null &&
    cached.off === offMin &&
    haversineKm(cached.lat, cached.lon, rLat, rLon) <= CITY_REUSE_KM;

  if (near) {
    const ttl = cached.city === null ? NO_CITY_TTL_MS : CITY_TTL_MS;
    if (now - cached.at < ttl) return cached.city;
  }

  // Sorgu başarısız olursa: 15 km içinde AYNI off'ta ESKİ bir şehir önbelleği
  // varsa (süresi geçmiş olsa da) onu kullan — kullanıcıyı vaktisiz bırakma.
  // Eski "şehir yok" kaydı KESİN cevap değildir; bu durumda sonuç bilinmiyordur.
  const staleFallback =
    near && cached !== null && cached.city !== null ? cached.city : undefined;

  let res: { status: number; body: unknown };
  try {
    res = await deps.getJson(
      `/vakit/sehir?lat=${rLat}&lon=${rLon}&off=${offMin}`,
      CITY_TIMEOUT_MS,
    );
  } catch {
    return staleFallback;
  }

  if (res.status === 200) {
    const city = parseCity(isRecord(res.body) ? res.body.city : null);
    if (city === null) return staleFallback;
    await safeWrite(deps, DIYANET_CITY_KEY, {
      lat: rLat,
      lon: rLon,
      off: offMin,
      city,
      at: now,
    });
    return city;
  }

  // Yalnız YAPISAL 404 { error:"no_city" } kesin cevaptır. 404 HTML vb. dahil
  // diğer her şey "bilinmiyor"dur (sunucu bu sürümü henüz yayınlamamış olabilir).
  if (res.status === 404 && isRecord(res.body) && res.body.error === "no_city") {
    await safeWrite(deps, DIYANET_CITY_KEY, {
      lat: rLat,
      lon: rLon,
      off: offMin,
      city: null,
      at: now,
    });
    return null;
  }

  return staleFallback;
}

function parseMonthEntry(value: unknown): MonthEntry | null {
  if (!isRecord(value)) return null;
  if (typeof value.complete !== "boolean") return null;
  if (!isFiniteNumber(value.fetchedAt)) return null;
  if (!Array.isArray(value.days)) return null;
  return {
    complete: value.complete,
    fetchedAt: value.fetchedAt,
    days: value.days,
  };
}

function monthKeyOf(date: string): string | null {
  const month = date.slice(0, 7);
  return MONTH_PATTERN.test(month) ? month : null;
}

function monthIndexOf(month: string): number | null {
  const m = MONTH_PATTERN.exec(month);
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}

function keyMonthIndexOf(key: string): number | null {
  const sep = key.indexOf(":");
  if (sep < 0) return null;
  return monthIndexOf(key.slice(sep + 1));
}

function readMonthsStore(raw: unknown): Record<string, MonthEntry> {
  const out: Record<string, MonthEntry> = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    const entry = parseMonthEntry(value);
    if (entry !== null && keyMonthIndexOf(key) !== null) out[key] = entry;
  }
  return out;
}

function toHm(value: unknown): string | null {
  return typeof value === "string" ? isoToLocalHm(value) : null;
}

function convertTimes(raw: unknown): PrayerTimesHm | null {
  if (!isRecord(raw)) return null;
  const Fajr = toHm(raw.imsak);
  const Sunrise = toHm(raw.gunes);
  const Dhuhr = toHm(raw.ogle);
  const Asr = toHm(raw.ikindi);
  const Maghrib = toHm(raw.aksam);
  const Isha = toHm(raw.yatsi);
  if (
    Fajr === null ||
    Sunrise === null ||
    Dhuhr === null ||
    Asr === null ||
    Maghrib === null ||
    Isha === null
  ) {
    return null;
  }
  return { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha };
}

function convertHijri(raw: unknown): DiyanetDayOut["hijri"] {
  if (!isRecord(raw)) return null;
  const { day, month, year } = raw;
  if (!isFiniteNumber(day) || !isFiniteNumber(month) || !isFiniteNumber(year)) {
    return null;
  }
  return { day, monthNumber: month, year };
}

/**
 * Ay önbelleğini budar: şimdiki aydan 1 aydan eski aylar silinir; en fazla
 * 6 anahtar tutulur (bu çağrının gerekli anahtarları önceliklidir).
 */
function pruneMonths(
  store: Record<string, MonthEntry>,
  requiredKeys: Set<string>,
  now: number,
): Record<string, MonthEntry> {
  const nowDate = new Date(now);
  const currentMonth = monthIndexOf(
    `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`,
  );
  const oldestAllowed = currentMonth === null ? null : currentMonth - 1;

  const kept: Record<string, MonthEntry> = {};
  for (const [key, entry] of Object.entries(store)) {
    const idx = keyMonthIndexOf(key);
    if (idx === null) continue;
    if (oldestAllowed !== null && idx < oldestAllowed) continue;
    kept[key] = entry;
  }

  const keys = Object.keys(kept);
  if (keys.length <= MAX_MONTH_KEYS) return kept;

  const ordered = [...requiredKeys].filter((key) => kept[key] !== undefined);
  const rest = keys
    .filter((key) => !requiredKeys.has(key))
    .sort((a, b) => kept[b].fetchedAt - kept[a].fetchedAt);
  ordered.push(...rest);

  const limited: Record<string, MonthEntry> = {};
  for (const key of ordered.slice(0, MAX_MONTH_KEYS)) limited[key] = kept[key];
  return limited;
}

/**
 * İstenen tarihlerin Diyanet vakitlerini çözer. Bulunamayan tarih Map'te yer
 * almaz; hiçbir şey çözülemezse boş Map döner. ASLA fırlatmaz.
 */
export async function getDiyanetDays(
  lat: number,
  lon: number,
  offMin: number,
  dates: string[],
  deps: DiyanetPrayerDeps,
): Promise<Map<string, DiyanetDayOut>> {
  const out = new Map<string, DiyanetDayOut>();
  try {
    const city = await resolveDiyanetCity(lat, lon, offMin, deps);
    if (!city) return out;

    const datesByMonth = new Map<string, string[]>();
    for (const date of dates) {
      const month = monthKeyOf(date);
      if (month === null) continue;
      const list = datesByMonth.get(month);
      if (list === undefined) datesByMonth.set(month, [date]);
      else if (!list.includes(date)) list.push(date);
    }
    if (datesByMonth.size === 0) return out;

    const now = deps.nowMs();
    const store = readMonthsStore(await safeRead(deps, DIYANET_MONTHS_KEY));
    let dirty = false;

    for (const month of datesByMonth.keys()) {
      const key = `${city.id}:${month}`;
      const cached = store[key];
      const usable =
        cached !== undefined &&
        (cached.complete || now - cached.fetchedAt < PARTIAL_MONTH_TTL_MS);
      if (usable) continue;

      let fetched: MonthEntry | null = null;
      try {
        const res = await deps.getJson(
          `/vakit?cityId=${city.id}&month=${month}`,
          MONTH_TIMEOUT_MS,
        );
        if (
          res.status === 200 &&
          isRecord(res.body) &&
          Array.isArray(res.body.days)
        ) {
          fetched = {
            complete: res.body.complete === true,
            fetchedAt: now,
            days: res.body.days,
          };
        }
      } catch {
        fetched = null;
      }

      if (fetched !== null) {
        store[key] = fetched;
        dirty = true;
      }
      // Fetch başarısızsa varsa eski (süresi geçmiş) önbellek kullanılmaya devam eder.
    }

    if (dirty) {
      const requiredKeys = new Set(
        [...datesByMonth.keys()].map((month) => `${city.id}:${month}`),
      );
      await safeWrite(
        deps,
        DIYANET_MONTHS_KEY,
        pruneMonths(store, requiredKeys, now),
      );
    }

    for (const [month, monthDates] of datesByMonth) {
      const entry = store[`${city.id}:${month}`];
      if (entry === undefined) continue;

      const byDate = new Map<string, unknown>();
      for (const raw of entry.days) {
        if (isRecord(raw) && typeof raw.date === "string") {
          byDate.set(raw.date, raw);
        }
      }

      for (const date of monthDates) {
        const raw = byDate.get(date);
        if (!isRecord(raw)) continue;
        const times = convertTimes(raw.times);
        if (times === null) continue; // herhangi bir vakit çözülemezse günü atla
        out.set(date, { times, hijri: convertHijri(raw.hijri), city });
      }
    }

    return out;
  } catch {
    return out;
  }
}
