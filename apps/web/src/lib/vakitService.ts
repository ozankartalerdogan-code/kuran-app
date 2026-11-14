import type { VakitDay } from "./diyanetVakit";

export type StoredDay = {
  cityId: number;
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  hijriShort: string | null;
  gmtOffset: number;
  fetchedAt: number;
};

export interface VakitStore {
  getDays(cityId: number, startYmd: string, endYmd: string): Promise<StoredDay[]>;
  putDays(days: StoredDay[]): Promise<void>;
}

export class UpstreamUnavailableError extends Error {
  /** Alttaki hata (teşhis için; route yalnız sınıf/status/detail loglar). */
  upstream: unknown;

  constructor(message = "Diyanet kaynagi kullanilamiyor", upstream: unknown = null) {
    super(message);
    this.name = "UpstreamUnavailableError";
    this.upstream = upstream;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function byDate(a: { date: string }, b: { date: string }): number {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
}

function storedToVakit(
  day: StoredDay,
  normalize: (raw: unknown) => VakitDay | null,
): VakitDay | null {
  const [year, month, date] = day.date.split("-");
  if (!year || !month || !date) return null;

  return normalize({
    fajr: day.fajr,
    sunrise: day.sunrise,
    dhuhr: day.dhuhr,
    asr: day.asr,
    maghrib: day.maghrib,
    isha: day.isha,
    gregorianDateShort: `${Number(date)}.${Number(month)}.${year}`,
    hijriDateShort: day.hijriShort,
    greenwichMeanTimeZone: day.gmtOffset,
  });
}

function rawToStoredDay(
  raw: unknown,
  cityId: number,
  normalize: (raw: unknown) => VakitDay | null,
  now: number,
): { stored: StoredDay; day: VakitDay } | null {
  const day = normalize(raw);
  if (day === null || !isRecord(raw)) return null;

  const gmt = raw.greenwichMeanTimeZone;
  const gmtOffset =
    typeof gmt === "number" && Number.isFinite(gmt) ? gmt : day.utcOffsetMin / 60;
  const hijriShort =
    typeof raw.hijriDateShort === "string" && raw.hijriDateShort.length > 0
      ? raw.hijriDateShort
      : null;

  return {
    day,
    stored: {
      cityId,
      date: day.date,
      fajr: day.times.imsak.slice(11, 16),
      sunrise: day.times.gunes.slice(11, 16),
      dhuhr: day.times.ogle.slice(11, 16),
      asr: day.times.ikindi.slice(11, 16),
      maghrib: day.times.aksam.slice(11, 16),
      isha: day.times.yatsi.slice(11, 16),
      hijriShort,
      gmtOffset,
      fetchedAt: now,
    },
  };
}

const COMPLETE_MONTH_STALE_SECONDS = 14 * 86400;
const STALE_RETRY_COOLDOWN_SECONDS = 300;

function isValidMonthDate(date: string, startYmd: string, endYmd: string): boolean {
  return date.length === 10 && date >= startYmd && date <= endYmd;
}

function isCurrentOrNextMonth(month: string, nowSec: number): boolean {
  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));
  if (!Number.isInteger(year) || !Number.isInteger(monthNum)) return false;
  const nowDate = new Date(nowSec * 1000);
  const currentIdx = nowDate.getUTCFullYear() * 12 + nowDate.getUTCMonth();
  const requestedIdx = year * 12 + (monthNum - 1);
  return requestedIdx === currentIdx || requestedIdx === currentIdx + 1;
}

function oldestFetchedAt(
  cachedMap: Map<string, { stored: StoredDay; day: VakitDay }>,
): number {
  let oldest = Infinity;
  for (const { stored } of cachedMap.values()) {
    if (stored.fetchedAt < oldest) oldest = stored.fetchedAt;
  }
  return oldest;
}

function normalizeStoredDays(
  rows: StoredDay[],
  startYmd: string,
  endYmd: string,
  normalize: (raw: unknown) => VakitDay | null,
): Map<string, { stored: StoredDay; day: VakitDay }> {
  const byDateMap = new Map<string, { stored: StoredDay; day: VakitDay }>();
  for (const stored of rows) {
    if (!isValidMonthDate(stored.date, startYmd, endYmd)) continue;
    const day = storedToVakit(stored, normalize);
    if (day === null || day.date !== stored.date) continue;
    byDateMap.set(day.date, { stored, day });
  }
  return byDateMap;
}

export function createVakitService(deps: {
  store: VakitStore;
  fetchDateRange: (cityId: number, startYmd: string, endYmd: string) => Promise<unknown[]>;
  normalize: (raw: unknown) => VakitDay | null;
  monthDateRange: (month: string) => { start: string; end: string };
  now: () => number;
  staleAfterSeconds?: number;
}): { getMonth(cityId: number, month: string): Promise<{ days: VakitDay[]; complete: boolean; fromCache: boolean }> } {
  const inflight = new Map<string, Promise<{ days: VakitDay[]; complete: boolean; updatedCount: number }>>();
  const staleRetryAfter = new Map<string, number>();

  function loadMonth(
    cityId: number,
    month: string,
    startYmd: string,
    endYmd: string,
    expectedDays: number,
    initialCached: Map<string, { stored: StoredDay; day: VakitDay }>,
  ): Promise<{ days: VakitDay[]; complete: boolean; updatedCount: number }> {
    const key = `${cityId}:${month}`;
    const existing = inflight.get(key);
    if (existing) return existing;

    const run = Promise.resolve()
      .then(async () => {
        const raws = await deps.fetchDateRange(cityId, startYmd, endYmd);
        const fetchedAt = deps.now();
        const merged = new Map<string, { stored: StoredDay; day: VakitDay }>(initialCached);
        let updatedCount = 0;

        for (const raw of raws) {
          const parsed = rawToStoredDay(raw, cityId, deps.normalize, fetchedAt);
          if (parsed === null) continue;
          if (!isValidMonthDate(parsed.day.date, startYmd, endYmd)) continue;
          merged.set(parsed.day.date, parsed);
          updatedCount += 1;
        }

        const entries = [...merged.values()].sort((a, b) => byDate(a.day, b.day));
        const stored = entries.map((entry) => entry.stored);
        const days = entries.map((entry) => entry.day);

        try {
          if (stored.length > 0) {
            await deps.store.putDays(stored);
          }
        } catch {
          // Önbellek yazımı başarısız olsa da istek yanıtı bozulmaz.
        }

        return { days, complete: days.length === expectedDays, updatedCount };
      })
      .finally(() => {
        if (inflight.get(key) === run) inflight.delete(key);
      });

    inflight.set(key, run);
    return run;
  }

  async function getMonth(
    cityId: number,
    month: string,
  ): Promise<{ days: VakitDay[]; complete: boolean; fromCache: boolean }> {
    const { start, end } = deps.monthDateRange(month);
    const expectedDays = Number(end.slice(8, 10));
    const key = `${cityId}:${month}`;

    // Önbellek okunamazsa (ör. veritabanı kesintisi) boş say ve Diyanet'e git.
    const cached = await deps.store.getDays(cityId, start, end).catch(() => [] as StoredDay[]);
    const cachedMap = normalizeStoredDays(cached, start, end, deps.normalize);
    const cachedDays = [...cachedMap.values()].map((entry) => entry.day).sort(byDate);
    const isCompleteCache = cachedDays.length === expectedDays;

    if (isCompleteCache) {
      const now = deps.now();
      const staleAfter = deps.staleAfterSeconds ?? COMPLETE_MONTH_STALE_SECONDS;
      const isStale = now - oldestFetchedAt(cachedMap) >= staleAfter;
      const retryAfter = staleRetryAfter.get(key) ?? 0;

      if (!isStale || !isCurrentOrNextMonth(month, now) || now < retryAfter) {
        return { days: cachedDays, complete: true, fromCache: true };
      }
    }

    try {
      const loaded = await loadMonth(cityId, month, start, end, expectedDays, cachedMap);
      if (isCompleteCache && loaded.updatedCount < expectedDays) {
        staleRetryAfter.set(key, deps.now() + STALE_RETRY_COOLDOWN_SECONDS);
      } else {
        staleRetryAfter.delete(key);
      }
      return { days: loaded.days, complete: loaded.complete, fromCache: false };
    } catch (error) {
      if (isCompleteCache) {
        staleRetryAfter.set(key, deps.now() + STALE_RETRY_COOLDOWN_SECONDS);
      }
      if (cachedDays.length > 0) {
        return { days: cachedDays, complete: isCompleteCache, fromCache: true };
      }
      throw new UpstreamUnavailableError(undefined, error);
    }
  }

  return { getMonth };
}
