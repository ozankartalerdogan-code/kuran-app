/**
 * prayerMethod.ts — Diyanet takvimine yakın namaz vakti hesabı (Türkiye + yurt dışı).
 *
 * Türkiye (Europe/Istanbul): Aladhan method=13 olduğu gibi; Diyanet tablosuyla ±2 dk uyumlu.
 * Yurt dışı: Diyanet'in yıllık resmî tablolarından (15 şehir × 365 gün, 2026) geri çıkarılan kural:
 *  - imsak 18°, yatsı Avrupa/Amerika'da 16°, diğer bölgelerde 17°; Diyanet temkinleri (tune).
 *  - |enlem| ≥ 45° ve gece yarısı güneş yeterince inmiyorsa (yaz) imsak/yatsı açısı,
 *    güneşin gece yarısı derinliğiyle (D) orantılı küçültülür: açı = k·D.
 *    Bu kural yokken Avrupa'da yazın sapma 40–50 dk idi; kuralla en fazla ~10 dk.
 * Diyanet'in birebir aynısı DEĞİLDİR; yaklaşık modeldir.
 *
 * Saf modül (import yok) — node --test ile doğrudan test edilir.
 */

const TURKEY_TZ = "Europe/Istanbul";
const rad = Math.PI / 180;

/** Aladhan sorgusunun yöntem kısmı (saat dilimi parametresi hariç). */
export function aladhanMethodQuery(timeZone: string): string {
  // school=0: Türkiye genelinde yaygın ikindi yöntemi (school=1/Hanefi ~1 saat geç verir)
  if (timeZone === TURKEY_TZ) return "method=13&school=0&midnightMode=0";
  const isha = /^(Europe|America)\//.test(timeZone) ? 16 : 17;
  // tune sırası: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight — Diyanet temkinleri
  return `method=99&methodSettings=18,null,${isha}&tune=0,0,-7,5,4,7,7,0,0&school=0&midnightMode=0`;
}

/** Güneş deklinasyonu (derece), yaklaşık formül (±0.01°). */
function declination(year: number, month: number, day: number): number {
  const n = (Date.UTC(year, month - 1, day, 12) - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  return Math.asin(Math.sin(23.439 * rad) * Math.sin(lam)) / rad;
}

/** Güneş ufkun a° altındayken saat açısı (derece). Tanımsızsa sınırlanır (gece yarısı/öğle). */
function hourAngle(lat: number, dec: number, a: number): number {
  const c = (Math.sin(-a * rad) - Math.sin(lat * rad) * Math.sin(dec * rad)) / (Math.cos(lat * rad) * Math.cos(dec * rad));
  return Math.acos(Math.max(-1, Math.min(1, c))) / rad;
}

const parseHM = (v: string | undefined): number | null => {
  const m = typeof v === "string" ? v.match(/^(\d{1,2}):(\d{2})/) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fmtHM = (min: number): string => {
  const x = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/**
 * Yüksek enlem düzeltmesi: Fajr ve Isha'yı Diyanet tarzı küçültülmüş açıyla yeniden hesaplar.
 * Türkiye'de ve |enlem| < 45°'de vakitleri değiştirmez. `date`: o günün yerel takvim tarihi.
 */
export function adjustHighLatitude<T extends Record<string, string>>(
  times: T,
  lat: number,
  date: { year: number; month: number; day: number },
  timeZone: string,
): T {
  const absLat = Math.abs(lat);
  if (timeZone === TURKEY_TZ || absLat < 45 || absLat > 89) return times;
  const dhuhr = parseHM(times.Dhuhr);
  if (dhuhr == null) return times;
  const noon = dhuhr - 5; // Dhuhr'a +5 dk temkin eklenmiş; güneşin tepe noktası
  const dec = declination(date.year, date.month, date.day);
  const D = 90 - absLat - dec * Math.sign(lat); // güneşin gece yarısı derinliği
  // Diyanet tablolarına uydurulmuş katsayılar (enlemle hafif artar)
  const kF = 0.6575 + 0.0045 * (absLat - 50);
  const kI = 0.605 + 0.005 * (absLat - 50);
  const ishaNominal = /^(Europe|America)\//.test(timeZone) ? 16 : 17;
  const out: Record<string, string> = { ...times };
  // Açı 1°'nin altına inmez (gece yarısı güneşi bölgelerinde vakitler gün doğumu/batımına yapışmasın)
  const aF = Math.max(1, kF * D), aI = Math.max(1, kI * D);
  if (aF < 18 && times.Fajr) out.Fajr = fmtHM(noon - hourAngle(lat, dec, aF) * 4);
  if (aI < ishaNominal && times.Isha) out.Isha = fmtHM(noon + hourAngle(lat, dec, aI) * 4);
  return out as T;
}

/** Yerel Date → takvim günü. */
export const localYMD = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
