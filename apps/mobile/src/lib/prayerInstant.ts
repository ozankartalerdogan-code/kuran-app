/**
 * prayerInstant.ts — namaz vakitlerini mutlak anlara (epoch ms) çeviren saf yardımcılar.
 *
 * Vakitler sunucudan şehrin duvar saatiyle (veya açık ofsetli ISO ile) gelir. Bildirim
 * tetikleyicileri cihazın yerel takvimine `setHours` ile yapıştırılırsa cihaz dilimi ile
 * şehrin dilimi farklıysa vakit başka bir güne düşebilir. Bu modül duvar saatini IANA
 * dilimine göre mutlak ana çevirir; böylece planlama cihaz diliminden bağımsız olur.
 *
 * Saf modül: React/Expo importu yoktur; `import.meta` / `createRequire` kullanmaz.
 */

export type PrayerKey = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type PrayerInstants = Record<PrayerKey, number>;

export const PRAYER_KEYS: readonly PrayerKey[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

const DAY_MS = 86_400_000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  const cached = formatterCache.get(timeZone);
  if (cached !== undefined) return cached;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
  } catch {
    return null;
  }
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Verilen anı IANA diliminde duvar saati bileşenlerine çevirir; dilim geçersizse null. */
function zonedParts(atMs: number, timeZone: string): ZonedParts | null {
  const formatter = formatterFor(timeZone);
  if (formatter === null) return null;
  const secondMs = Math.floor(atMs / 1000) * 1000;
  const parts = formatter.formatToParts(new Date(secondMs));
  const out: Partial<ZonedParts> = {};
  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second"
    ) {
      out[part.type] = Number(part.value);
    }
  }
  if (
    out.year === undefined ||
    out.month === undefined ||
    out.day === undefined ||
    out.hour === undefined ||
    out.minute === undefined ||
    out.second === undefined
  ) {
    return null;
  }
  // Bazı Intl uygulamaları (eski Hermes/V8) gece yarısını "24" verir.
  if (out.hour === 24) out.hour = 0;
  return out as ZonedParts;
}

/** Verilen andaki UTC ofseti (ms) = dilimdeki duvar saati − UTC. Geçersiz dilimde null. */
function offsetMsAt(atMs: number, timeZone: string): number | null {
  const parts = zonedParts(atMs, timeZone);
  if (parts === null) return null;
  const secondMs = Math.floor(atMs / 1000) * 1000;
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) - secondMs
  );
}

function matchesWall(
  atMs: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): boolean {
  const parts = zonedParts(atMs, timeZone);
  return (
    parts !== null &&
    parts.year === year &&
    parts.month === month &&
    parts.day === day &&
    parts.hour === hour &&
    parts.minute === minute
  );
}

/**
 * "YYYY-MM-DD" + "HH:MM", verilen IANA diliminin duvar saatiyle → epoch ms. Geçersizse null.
 * Ofset iki adayla bulunur (dönüşümden ±2 gün); yaz saatinde var olmayan saat ileri
 * kaydırılır, iki kez yaşanan saatte ilk an seçilir.
 */
export function zonedWallTimeToEpoch(
  ymd: string,
  hm: string,
  timeZone: string,
): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (dateMatch === null || timeMatch === null) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const target = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const calendar = new Date(target);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return null;
  }

  const offsets: number[] = [];
  for (const probe of [
    target - 2 * DAY_MS,
    target,
    target + 2 * DAY_MS,
  ]) {
    const offset = offsetMsAt(probe, timeZone);
    if (offset === null) return null;
    if (!offsets.includes(offset)) offsets.push(offset);
  }

  const candidates = offsets.map((offset) => target - offset);
  const valid = candidates.filter((candidate) =>
    matchesWall(candidate, year, month, day, hour, minute, timeZone),
  );
  if (valid.length > 0) return Math.min(...valid);

  // Var olmayan duvar saati (ileri atlama): en yakın geçerli an ileri kaydırılmış olandır.
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

/** epoch → verilen dilimde "HH:MM" (24 saat, sıfır dolgulu). Geçersiz dilimde "--:--". */
export function formatHmInZone(atMs: number, timeZone: string): string {
  const parts = zonedParts(atMs, timeZone);
  if (parts === null) return "--:--";
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

/** Takvim günü ekle ("2026-12-31", 1 → "2027-01-01"). Saat hesabı yok. */
export function addDaysYmd(ymd: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (match === null || !Number.isFinite(days)) return ymd;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day + Math.trunc(days)));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Şehrin duvar saatindeki 6 vakit (HH:MM) → anlar. Isha, Maghrib'den önce/eşitse
 * (gece yarısını geçen yatsı) Isha ertesi takvim gününe alınır. Herhangi bir vakit
 * geçersizse null.
 */
export function instantsFromWallTimes(
  ymd: string,
  times: Record<string, string>,
  timeZone: string,
): PrayerInstants | null {
  const out = {} as PrayerInstants;
  for (const key of PRAYER_KEYS) {
    const hm = times[key];
    if (typeof hm !== "string") return null;
    const atMs = zonedWallTimeToEpoch(ymd, hm, timeZone);
    if (atMs === null) return null;
    out[key] = atMs;
  }
  if (out.Isha <= out.Maghrib) {
    const ishaHm = times.Isha;
    const isha = zonedWallTimeToEpoch(addDaysYmd(ymd, 1), ishaHm, timeZone);
    if (isha === null) return null;
    out.Isha = isha;
  }
  return out;
}

const DIYANET_ISO_KEYS: Record<string, PrayerKey> = {
  imsak: "Fajr",
  gunes: "Sunrise",
  ogle: "Dhuhr",
  ikindi: "Asr",
  aksam: "Maghrib",
  yatsi: "Isha",
};

const ISO_WITH_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function parseIsoWithOffset(value: unknown): number | null {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value)) return null;
  const atMs = Date.parse(value);
  return Number.isFinite(atMs) ? atMs : null;
}

/**
 * Diyanet ham ISO vakitleri (anahtarlar: imsak, gunes, ogle, ikindi, aksam, yatsi;
 * açık ±HH:MM ofsetli) → anlar. Ofsetsiz/geçersiz ISO → null. Isha < Maghrib ise
 * Isha'ya 24 saat eklenir (sunucu tüm vakitlere kaynak gününü yazıyor).
 */
export function instantsFromDiyanetIso(raw: unknown): PrayerInstants | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const out = {} as PrayerInstants;
  for (const [sourceKey, key] of Object.entries(DIYANET_ISO_KEYS)) {
    const atMs = parseIsoWithOffset(record[sourceKey]);
    if (atMs === null) return null;
    out[key] = atMs;
  }
  if (out.Isha < out.Maghrib) out.Isha += DAY_MS;
  return out;
}

/** Bildirim anı = atMs + offsetMin dk; nowMs'e eşit/geçmişse null. */
export function notificationAtMs(
  atMs: number,
  offsetMin: number,
  nowMs: number,
): number | null {
  const at = atMs + offsetMin * 60_000;
  return at > nowMs ? at : null;
}
