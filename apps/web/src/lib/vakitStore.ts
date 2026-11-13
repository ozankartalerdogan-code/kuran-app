import { dbAll, dbBatch, dbGet, dbRun, getDataSource } from "./dbUtils";
import type { DiyanetAuthState } from "./diyanetClient";
import type { StoredDay, VakitStore } from "./vakitService";

export type VakitStoreWithAuth = VakitStore & {
  loadAuth(): Promise<DiyanetAuthState | null>;
  saveAuth(state: DiyanetAuthState): Promise<void>;
};

function byDate(a: { date: string }, b: { date: string }): number {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
}

function createMemoryStore(): VakitStoreWithAuth {
  const days = new Map<string, StoredDay>();
  let auth: DiyanetAuthState | null = null;

  return {
    async getDays(cityId: number, startYmd: string, endYmd: string): Promise<StoredDay[]> {
      const result: StoredDay[] = [];
      for (const day of days.values()) {
        if (day.cityId !== cityId) continue;
        if (day.date < startYmd || day.date > endYmd) continue;
        result.push({ ...day });
      }
      result.sort(byDate);
      return result;
    },

    async putDays(input: StoredDay[]): Promise<void> {
      for (const day of input) {
        days.set(`${day.cityId}:${day.date}`, { ...day });
      }
    },

    async loadAuth(): Promise<DiyanetAuthState | null> {
      return auth ? { ...auth } : null;
    },

    async saveAuth(state: DiyanetAuthState): Promise<void> {
      auth = { ...state };
    },
  };
}

interface PrayerRow {
  city_id: number;
  date_ymd: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  hijri_short: string | null;
  gmt_offset: number;
  fetched_at: number;
}

interface AuthRow {
  access_token: string | null;
  access_expires_at: number | null;
  refresh_token: string | null;
  refresh_expires_at: number | null;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady === null) {
    schemaReady = dbBatch([
      {
        sql: `CREATE TABLE IF NOT EXISTS diyanet_prayer_times (
          city_id INTEGER NOT NULL,
          date_ymd TEXT NOT NULL,
          fajr TEXT NOT NULL,
          sunrise TEXT NOT NULL,
          dhuhr TEXT NOT NULL,
          asr TEXT NOT NULL,
          maghrib TEXT NOT NULL,
          isha TEXT NOT NULL,
          hijri_short TEXT,
          gmt_offset REAL NOT NULL,
          fetched_at INTEGER NOT NULL,
          PRIMARY KEY (city_id, date_ymd)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS diyanet_auth_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          access_token TEXT,
          access_expires_at INTEGER,
          refresh_token TEXT,
          refresh_expires_at INTEGER,
          updated_at INTEGER
        )`,
        args: [],
      },
    ]).catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function createTursoStore(): VakitStoreWithAuth {
  return {
    async getDays(cityId: number, startYmd: string, endYmd: string): Promise<StoredDay[]> {
      await ensureSchema();
      const rows = await dbAll<PrayerRow>(
        `SELECT city_id, date_ymd, fajr, sunrise, dhuhr, asr, maghrib, isha,
                hijri_short, gmt_offset, fetched_at
         FROM   diyanet_prayer_times
         WHERE  city_id = ? AND date_ymd >= ? AND date_ymd <= ?
         ORDER  BY date_ymd`,
        cityId,
        startYmd,
        endYmd,
      );

      return rows.map((row) => ({
        cityId: Number(row.city_id),
        date: String(row.date_ymd),
        fajr: String(row.fajr),
        sunrise: String(row.sunrise),
        dhuhr: String(row.dhuhr),
        asr: String(row.asr),
        maghrib: String(row.maghrib),
        isha: String(row.isha),
        hijriShort: row.hijri_short === null ? null : String(row.hijri_short),
        gmtOffset: Number(row.gmt_offset),
        fetchedAt: Number(row.fetched_at),
      }));
    },

    async putDays(input: StoredDay[]): Promise<void> {
      if (input.length === 0) return;
      await ensureSchema();
      await dbBatch(
        input.map((day) => ({
          sql: `INSERT OR REPLACE INTO diyanet_prayer_times
                  (city_id, date_ymd, fajr, sunrise, dhuhr, asr, maghrib, isha,
                   hijri_short, gmt_offset, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            day.cityId,
            day.date,
            day.fajr,
            day.sunrise,
            day.dhuhr,
            day.asr,
            day.maghrib,
            day.isha,
            day.hijriShort,
            day.gmtOffset,
            day.fetchedAt,
          ],
        })),
      );
    },

    async loadAuth(): Promise<DiyanetAuthState | null> {
      await ensureSchema();
      const row = await dbGet<AuthRow>(
        `SELECT access_token, access_expires_at, refresh_token, refresh_expires_at
         FROM   diyanet_auth_state
         WHERE  id = 1`,
      );

      if (!row || typeof row.access_token !== "string" || row.access_token.length === 0) {
        return null;
      }

      return {
        accessToken: row.access_token,
        accessExpiresAt: Number(row.access_expires_at ?? 0),
        refreshToken:
          typeof row.refresh_token === "string" && row.refresh_token.length > 0
            ? row.refresh_token
            : null,
        refreshExpiresAt:
          row.refresh_expires_at === null || row.refresh_expires_at === undefined
            ? null
            : Number(row.refresh_expires_at),
      };
    },

    async saveAuth(state: DiyanetAuthState): Promise<void> {
      await ensureSchema();
      await dbRun(
        `INSERT INTO diyanet_auth_state
           (id, access_token, access_expires_at, refresh_token, refresh_expires_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           access_token = excluded.access_token,
           access_expires_at = excluded.access_expires_at,
           refresh_token = excluded.refresh_token,
           refresh_expires_at = excluded.refresh_expires_at,
           updated_at = excluded.updated_at`,
        state.accessToken,
        state.accessExpiresAt,
        state.refreshToken,
        state.refreshExpiresAt,
        Math.floor(Date.now() / 1000),
      );
    },
  };
}

let cachedStore: VakitStoreWithAuth | null = null;

export function getVakitStore(): VakitStoreWithAuth {
  if (cachedStore) return cachedStore;

  const useMemory =
    process.env.VAKIT_STORE === "memory" || getDataSource().source !== "turso";

  cachedStore = useMemory ? createMemoryStore() : createTursoStore();
  return cachedStore;
}
