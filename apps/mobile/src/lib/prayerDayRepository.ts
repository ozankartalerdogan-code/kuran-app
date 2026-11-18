import type { PrayerInstants } from "./prayerInstant";

export type PrayerSource = "diyanet" | "aladhan";
type HijriDate = { day: number; monthNumber: number; year: number };

export type PrayerDayRecord = {
  sourceDate: string;
  cityKey: string;
  cityTimeZone: string;
  cityDisplayName?: string;
  source: PrayerSource;
  revision: string;
  atMs: Readonly<PrayerInstants>;
  hijri: Readonly<HijriDate> | null;
  fetchedAt: number;
};

export type PrayerContext = {
  cityKey: string;
  lat: number;
  lon: number;
  cityTimeZone: string;
  deviceTimeZone: string;
  offMin: number;
  nowMs: number;
};

/** Adapters may supply validated instants, Diyanet ISO, or adjusted Aladhan wall times. */
export type PrayerDayInput = {
  sourceDate: string;
  cityDisplayName?: string;
  hijri?: HijriDate | null;
} & ({ atMs: PrayerInstants } | { rawIso: unknown } | { times: Record<string, string> });

export type PrayerDayRepoDeps = {
  instants: Pick<typeof import("./prayerInstant"),
    "PRAYER_KEYS" | "addDaysYmd" | "instantsFromDiyanetIso" | "instantsFromWallTimes">;
  fetchDiyanetMonth(context: PrayerContext, month: string): Promise<readonly PrayerDayInput[]>;
  fetchAladhanMonth(context: PrayerContext, month: string): Promise<readonly PrayerDayInput[]>;
  storageGet(key: string): Promise<string | null>;
  storageSet(key: string, json: string): Promise<void>;
  nowMs(): number;
};

export type PrayerDayEvent = {
  cityKey: string;
  cityTimeZone: string;
  dates: string[];
  upgradedToDiyanet: boolean;
};

const STORE_KEY = "prayerDayRepoV1";
const MAX_DAYS = 62;
const keyOf = (c: Pick<PrayerContext, "cityKey" | "cityTimeZone">, date: string) =>
  `${c.cityKey}|${c.cityTimeZone}|${date}`;

function validHijri(value: unknown): value is HijriDate {
  if (typeof value !== "object" || value === null) return false;
  const h = value as HijriDate;
  return Number.isInteger(h.day) && h.day >= 1 && h.day <= 30 &&
    Number.isInteger(h.monthNumber) && h.monthNumber >= 1 && h.monthNumber <= 12 &&
    Number.isInteger(h.year) && h.year > 0;
}

function freezeRecord(record: PrayerDayRecord): PrayerDayRecord {
  return Object.freeze({ ...record, atMs: Object.freeze({ ...record.atMs }),
    hijri: record.hijri ? Object.freeze({ ...record.hijri }) : null });
}

export function createPrayerDayRepository(deps: PrayerDayRepoDeps) {
  const { PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso, instantsFromWallTimes } = deps.instants;
  const cache = new Map<string, PrayerDayRecord>();
  const inflight = new Map<string, Promise<void>>();
  const diyanetRetryAt = new Map<string, number>();
  const listeners = new Set<(event: PrayerDayEvent) => void>();
  let hydration: Promise<void> | undefined;
  let writes = Promise.resolve();

  function validDate(date: unknown): date is string {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      addDaysYmd(date, 0) === date;
  }

  function validInstants(value: unknown): value is PrayerInstants {
    return typeof value === "object" && value !== null && PRAYER_KEYS.every((key) =>
      typeof (value as PrayerInstants)[key] === "number" && Number.isFinite((value as PrayerInstants)[key]));
  }

  function revision(source: PrayerSource, c: Pick<PrayerContext, "cityKey" | "cityTimeZone">, atMs: PrayerInstants): string {
    // FNV-1a over a canonical prayer-key order; independent of object insertion order.
    const text = JSON.stringify(PRAYER_KEYS.map((key) => atMs[key]));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${source}:${c.cityKey}:${c.cityTimeZone}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function prune() {
    const cities = new Map<string, PrayerDayRecord[]>();
    for (const record of cache.values()) {
      const days = cities.get(record.cityKey) ?? [];
      days.push(record);
      cities.set(record.cityKey, days);
    }
    for (const days of cities.values()) {
      days.sort((a, b) => b.sourceDate.localeCompare(a.sourceDate) || a.cityTimeZone.localeCompare(b.cityTimeZone));
      for (const day of days.slice(MAX_DAYS)) cache.delete(keyOf(day, day.sourceDate));
    }
  }

  function hydrate(): Promise<void> {
    return hydration ??= (async () => {
      try {
        const json = await deps.storageGet(STORE_KEY);
        if (json === null) return;
        const stored: unknown = JSON.parse(json);
        if (typeof stored !== "object" || stored === null || !("version" in stored) ||
          stored.version !== 1 || !("records" in stored) || !Array.isArray(stored.records)) return;
        for (const value of stored.records) {
          if (typeof value !== "object" || value === null) continue;
          const r = value as PrayerDayRecord;
          if (!validDate(r.sourceDate) || typeof r.cityKey !== "string" || typeof r.cityTimeZone !== "string" ||
            (r.source !== "diyanet" && r.source !== "aladhan") || !validInstants(r.atMs) ||
            !Number.isFinite(r.fetchedAt) || (r.hijri != null && !validHijri(r.hijri)) ||
            (r.cityDisplayName !== undefined && typeof r.cityDisplayName !== "string")) continue;
          const key = keyOf(r, r.sourceDate);
          if (cache.get(key)?.source === "diyanet" && r.source === "aladhan") continue;
          cache.set(key, freezeRecord({ ...r, revision: revision(r.source, r, r.atMs) }));
        }
        prune();
      } catch { /* Storage is best effort; corrupt or unavailable storage is empty. */ }
    })();
  }

  function persist(): Promise<void> {
    const json = JSON.stringify({ version: 1, records: [...cache.values()] });
    // Serialize writes so an older snapshot cannot finish after a newer snapshot.
    writes = writes.then(() => deps.storageSet(STORE_KEY, json)).catch(() => {});
    return writes;
  }

  function put(context: PrayerContext, month: string, source: PrayerSource, input: PrayerDayInput) {
    if (!validDate(input.sourceDate) || !input.sourceDate.startsWith(`${month}-`)) return;
    const atMs = "atMs" in input ? input.atMs : "rawIso" in input
      ? (source === "diyanet" ? instantsFromDiyanetIso(input.rawIso) : null)
      : instantsFromWallTimes(input.sourceDate, input.times, context.cityTimeZone);
    if (!validInstants(atMs)) return;
    const key = keyOf(context, input.sourceDate);
    const previous = cache.get(key);
    if (previous && source === "aladhan") return;
    const nextRevision = revision(source, context, atMs);
    const record = freezeRecord({
      sourceDate: input.sourceDate, cityKey: context.cityKey, cityTimeZone: context.cityTimeZone,
      ...(input.cityDisplayName === undefined ? {} : { cityDisplayName: input.cityDisplayName }),
      source, revision: nextRevision, atMs,
      hijri: validHijri(input.hijri) ? input.hijri : null, fetchedAt: deps.nowMs(),
    });
    cache.set(key, record);
    prune();
    if (previous?.revision === nextRevision) return;
    for (const listener of [...listeners]) {
      try {
        listener({ cityKey: context.cityKey, cityTimeZone: context.cityTimeZone,
          dates: [input.sourceDate], upgradedToDiyanet: previous?.source === "aladhan" && source === "diyanet" });
      } catch { /* One consumer cannot interrupt the others or the month fill. */ }
    }
  }

  function fetchMonth(context: PrayerContext, month: string, source: PrayerSource): Promise<void> {
    const key = `${source}|${keyOf(context, month)}`;
    const existing = inflight.get(key);
    if (existing) return existing;
    if (source === "diyanet" && deps.nowMs() < (diyanetRetryAt.get(key) ?? -Infinity)) return Promise.resolve();
    const request = (async () => {
      let days: readonly PrayerDayInput[];
      try {
        days = await (source === "diyanet" ? deps.fetchDiyanetMonth(context, month) : deps.fetchAladhanMonth(context, month));
      } catch (error) {
        if (source === "diyanet") diyanetRetryAt.set(key, deps.nowMs() + 10 * 60 * 1000);
        throw error;
      }
      if (source === "diyanet") diyanetRetryAt.delete(key);
      for (const day of days) put(context, month, source, day);
      await persist();
    })();
    const settled = request.finally(() => { inflight.delete(key); });
    inflight.set(key, settled);
    return settled;
  }

  async function ensureMonth(context: PrayerContext, month: string): Promise<void> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError("Invalid prayer month");
    await hydrate();
    const dates: string[] = [];
    for (let date = `${month}-01`; date.startsWith(`${month}-`); date = addDaysYmd(date, 1)) dates.push(date);
    if (dates.every((date) => cache.get(keyOf(context, date))?.source === "diyanet")) return;
    // A failed primary source still permits cached/offline data and the fallback.
    try { await fetchMonth(context, month, "diyanet"); } catch { /* Try cache next. */ }
    for (const date of dates) {
      if (!cache.has(keyOf(context, date))) {
        try { await fetchMonth(context, month, "aladhan"); } catch {
          if (![...cache.values()].some((r) => r.cityKey === context.cityKey &&
            r.cityTimeZone === context.cityTimeZone && r.sourceDate.startsWith(`${month}-`))) {
            throw new Error("Prayer month unavailable");
          }
        }
        break;
      }
    }
  }

  async function ensureDays(context: PrayerContext, sourceDates: readonly string[]): Promise<ReadonlyMap<string, PrayerDayRecord>> {
    if (!sourceDates.every(validDate)) throw new RangeError("Invalid prayer date");
    await Promise.all([...new Set(sourceDates.map((date) => date.slice(0, 7)))].map((month) => ensureMonth(context, month)));
    const result = new Map<string, PrayerDayRecord>();
    for (const date of sourceDates) {
      const record = cache.get(keyOf(context, date));
      if (record) result.set(date, record);
    }
    return result;
  }

  async function getDayTimes(context: PrayerContext, sourceDate: string): Promise<PrayerDayRecord | null> {
    return (await ensureDays(context, [sourceDate])).get(sourceDate) ?? null;
  }

  function subscribe(listener: (event: PrayerDayEvent) => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  return { getDayTimes, ensureDays, ensureMonth, subscribe };
}
