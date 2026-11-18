import { diyanetDeps } from "./diyanetPrayerDeps";
import { fetchAladhanMonthInputs, fetchDiyanetMonthInputs } from "./prayerDayRepositoryAdapters";
import { createPrayerDayRepository } from "./prayerDayRepository";
import type { PrayerDayRepoDeps } from "./prayerDayRepository";
import { PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso, instantsFromWallTimes } from "./prayerInstant";
import { storage } from "./storage";

export function prayerDayRepositoryDeps(): PrayerDayRepoDeps {
  return {
    instants: { PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso, instantsFromWallTimes },
    fetchDiyanetMonth: (context, month) => fetchDiyanetMonthInputs(context, month, diyanetDeps()),
    fetchAladhanMonth: (context, month) => fetchAladhanMonthInputs(context, month, fetch),
    storageGet: (key) => storage.getString(key),
    storageSet: (key, json) => storage.setString(key, json),
    nowMs: Date.now,
  };
}

let repository: ReturnType<typeof createPrayerDayRepository> | undefined;

export function getPrayerDayRepository(): ReturnType<typeof createPrayerDayRepository> {
  return repository ??= createPrayerDayRepository(prayerDayRepositoryDeps());
}
