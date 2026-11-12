// Cihazın IANA saat dilimi (ör. "Europe/Berlin"). Namaz vakitleri bu dilimde
// istenmeli: bildirimler ve geri sayım saatleri cihazın yerel saatine göre kurulur.
// Eskiden "Europe/Istanbul" sabitti → Türkiye dışındaki kullanıcıda vakitler
// saatlerce kayıyordu. Saf modül: expo-localization yoksa (test/web) Intl'e düşer.
const FALLBACK = "Europe/Istanbul";

export function deviceTimeZone(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loc = require("expo-localization") as { getCalendars?: () => { timeZone?: string | null }[] };
    const tz = loc.getCalendars?.()[0]?.timeZone;
    if (tz) return tz;
  } catch { /* native modül yok */ }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch { /* Intl yok */ }
  return FALLBACK;
}

/** Aladhan sorgu parametresi: `timezonestring=<cihaz dilimi>` */
export const aladhanTzParam = () => `timezonestring=${encodeURIComponent(deviceTimeZone())}`;
