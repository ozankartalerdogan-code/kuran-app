import { diyanetDeps } from "./diyanetPrayerDeps";
import { fetchAladhanMonthInputs, fetchDiyanetMonthInputs } from "./prayerDayRepositoryAdapters";
import { createPrayerDayRepository } from "./prayerDayRepository";
import type { PrayerDayRepoDeps } from "./prayerDayRepository";
import { PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso, instantsFromWallTimes, intlZoneSupported } from "./prayerInstant";
import type { PrayerInstants } from "./prayerInstant";
import { storage } from "./storage";

export function prayerDayRepositoryDeps(): PrayerDayRepoDeps {
  return {
    instants: {
      PRAYER_KEYS, addDaysYmd, instantsFromDiyanetIso,
      instantsFromWallTimes: (date, times, zone) => {
        if (intlZoneSupported()) return instantsFromWallTimes(date, times, zone);
        // Legacy Hermes fallback: the adapter requests device-local wall times.
        // Match the old notification setHours path when Intl cannot convert zones.
        const at = {} as PrayerInstants;
        for (const key of PRAYER_KEYS) {
          const match = /^(\d{1,2}):(\d{2})$/.exec(times[key] ?? "");
          if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
          const local = new Date(`${date}T00:00:00`);
          local.setHours(Number(match[1]), Number(match[2]), 0, 0);
          if (!Number.isFinite(local.getTime())) return null;
          at[key] = local.getTime();
        }
        return at;
      },
    },
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
