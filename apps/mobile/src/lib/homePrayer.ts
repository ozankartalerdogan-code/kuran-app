import type { PrayerDayRecord, PrayerContext, PrayerDayEvent } from "./prayerDayRepository";
import type { PrayerKey } from "./prayerInstant";

/** Select the earliest future instant, including tomorrow's actual Fajr. */
export function nextPrayerFromInstants(records: readonly PrayerDayRecord[], nowMs: number) {
  let next: { key: PrayerKey; atMs: number; record: PrayerDayRecord; remainingMin: number } | null = null;
  for (const record of records) {
    for (const [key, atMs] of Object.entries(record.atMs)) {
      if (atMs > nowMs && (!next || atMs < next.atMs)) {
        next = { key: key as PrayerKey, atMs, record, remainingMin: Math.ceil((atMs - nowMs) / 60_000) };
      }
    }
  }
  return next;
}

type Repository = {
  ensureDays(context: PrayerContext, dates: readonly string[]): Promise<ReadonlyMap<string, PrayerDayRecord>>;
  subscribe(listener: (event: PrayerDayEvent) => void): () => void;
};

/** Subscribe before the first read. A newer read or disposed context owns the result. */
export function watchHomePrayerDays(
  repository: Repository, context: PrayerContext, dates: readonly string[],
  isCurrent: () => boolean, apply: (records: readonly PrayerDayRecord[]) => void,
  onError: () => void,
) {
  let active = true;
  let readId = 0;
  const read = async () => {
    const id = ++readId;
    try {
      const days = await repository.ensureDays(context, dates);
      if (active && isCurrent() && id === readId) apply([...days.values()]);
    } catch {
      if (active && isCurrent() && id === readId) onError();
    }
  };
  const unsubscribe = repository.subscribe(event => {
    if (event.cityKey === context.cityKey && event.cityTimeZone === context.cityTimeZone) void read();
  });
  void read();
  return () => { active = false; unsubscribe(); };
}
