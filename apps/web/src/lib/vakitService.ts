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

export function createVakitService(deps: {
  store: VakitStore;
  fetchDateRange: (cityId: number, startYmd: string, endYmd: string) => Promise<unknown[]>;
  normalize: (raw: unknown) => VakitDay | null;
  monthDateRange: (month: string) => { start: string; end: string };
  now: () => number;
}): { getMonth(cityId: number, month: string): Promise<{ days: VakitDay[]; complete: boolean; fromCache: boolean }> } {
  const inflight = new Map<string, Promise<{ days: VakitDay[]; complete: boolean }>>();

  function loadMonth(
    cityId: number,
    month: string,
    startYmd: string,
    endYmd: string,
    expectedDays: number,
  ): Promise<{ days: VakitDay[]; complete: boolean }> {
    const key = `${cityId}:${month}`;
    const existing = inflight.get(key);
    if (existing) return existing;

    const run = Promise.resolve()
      .then(async () => {
        const raws = await deps.fetchDateRange(cityId, startYmd, endYmd);
        const fetchedAt = deps.now();
        const stored: StoredDay[] = [];
        const days: VakitDay[] = [];

        for (const raw of raws) {
          const parsed = rawToStoredDay(raw, cityId, deps.normalize, fetchedAt);
          if (parsed === null) continue;
          stored.push(parsed.stored);
          days.push(parsed.day);
        }

        days.sort(byDate);

        try {
          await deps.store.putDays(stored);
        } catch {
          // Önbellek yazımı başarısız olsa da istek yanıtı bozulmaz.
        }

        return { days, complete: days.length === expectedDays };
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

    // Önbellek okunamazsa (ör. veritabanı kesintisi) boş say ve Diyanet'e git.
    const cached = await deps.store.getDays(cityId, start, end).catch(() => [] as StoredDay[]);
    const cachedDays = cached
      .map((day) => storedToVakit(day, deps.normalize))
      .filter((day): day is VakitDay => day !== null)
      .sort(byDate);

    if (cached.length === expectedDays) {
      return { days: cachedDays, complete: true, fromCache: true };
    }

    try {
      const loaded = await loadMonth(cityId, month, start, end, expectedDays);
      return { days: loaded.days, complete: loaded.complete, fromCache: false };
    } catch (error) {
      if (cachedDays.length > 0) {
        return { days: cachedDays, complete: false, fromCache: true };
      }
      throw new UpstreamUnavailableError(undefined, error);
    }
  }

  return { getMonth };
}
