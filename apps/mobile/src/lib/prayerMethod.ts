/**
 * prayerMethod.ts — Diyanet takvimine yakın namaz vakti hesabı (Türkiye + yurt dışı).
 *
 * Türkiye (Europe/Istanbul): Aladhan method=13 olduğu gibi; Diyanet tablosuyla ±2 dk uyumlu.
 * Yurt dışı: Diyanet'in yıllık resmî tablolarından (2026; ~75 şehir × 365 gün) geri çıkarılan kural:
 *  - imsak 18°, yatsı ülkeye göre 16° veya 17° (ishaAngle); Diyanet temkinleri (tune).
 *    44° altında bu kuralla imsak/yatsı Diyanet'e ±2 dk.
 *  - |enlem| ≥ 44° ve gece yarısı güneş yeterince inmiyorsa (yaz) imsak/yatsı açısı,
 *    güneşin gece yarısı derinliğiyle (D) orantılı küçültülür: açı = k(enlem, D)·D.
 *    Kuralsız yazın sapma 40–50 dk; kuralla 44–60° arası çoğu gün ±5 dk, en kötü günler ~8–10 dk.
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
  const isha = ishaAngle(timeZone);
  // tune sırası: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight — Diyanet temkinleri
  return `method=99&methodSettings=18,null,${isha}&tune=0,0,-7,5,4,7,7,0,0&school=0&midnightMode=0`;
}

// Diyanet yatsıda 17° kullanan Avrupa ülkeleri (İspanya, Yunanistan, Bulgaristan, Kıbrıs) ve Güney Amerika.
// Kalan Avrupa + Kuzey Amerika + Çin + İzlanda 16°; diğer bölgeler 17°. 2026 tablolarından doğrulandı.
const ISHA17_EUROPE = new Set(["Europe/Madrid", "Europe/Athens", "Europe/Sofia", "Europe/Nicosia", "Asia/Nicosia", "Asia/Famagusta", "Africa/Ceuta", "Atlantic/Canary"]);
const SOUTH_AMERICA = /^America\/(Argentina\/.+|Buenos_Aires|Cordoba|Mendoza|Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Maceio|Araguaina|Santarem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Noronha|Montevideo|Asuncion|Santiago|Punta_Arenas|La_Paz|Lima|Bogota|Guayaquil|Caracas|Guyana|Paramaribo|Cayenne)$/;
const ISHA16_OTHER = new Set(["Asia/Shanghai", "Asia/Urumqi", "Asia/Chongqing", "Asia/Harbin", "Atlantic/Reykjavik"]);

/** Diyanet'in yatsı açısı (derece) — saat diliminden ülke tahmini. */
export function ishaAngle(timeZone: string): 16 | 17 {
  if (ISHA16_OTHER.has(timeZone)) return 16;
  if (ISHA17_EUROPE.has(timeZone)) return 17;
  if (timeZone.startsWith("Europe/")) return 16;
  if (timeZone.startsWith("America/")) return SOUTH_AMERICA.test(timeZone) ? 17 : 16;
  return 17;
}

/**
 * 44–50.5° için k(D) = a + b·d + c·d² (d = D − 20) katsayı tablosu; enlemle doğrusal ara değer.
 * Şehir başına (yalnız açının düştüğü günlerden) uydurulup düğüm çevresindeki şehirlerin medyanı alındı;
 * uydurmaya katılmayan Lyon, Viyana, Strazburg, Brüksel ile doğrulandı. [enlem, imsak a,b,c, yatsı a,b,c]
 */
const K_TABLE: readonly (readonly number[])[] = [
  [44, 0.876, -0.06335, 0.006344, 0.854, -0.09108, 0.01032],
  [45.5, 0.7783, -0.02548, 0.002299, 0.7345, -0.04161, 0.005116],
  [47.4, 0.6871, -0.005161, 0.00098, 0.6302, -0.001289, -0.0001199],
  [48.1, 0.6546, -0.001411, 0.0006547, 0.6015, -0.00008235, 0.0007423],
  [48.9, 0.6453, -0.0002217, 0.0004999, 0.598, 0.0006171, 0.0007423],
  [50.5, 0.6584, -0.00001946, 0.0003114, 0.6085, 0.0005446, 0.0004511],
];
const BLEND_LO = 49.5, BLEND_HI = 50.5;

/** [kİmsak, kYatsı]: 44–49.5° tablo, ≥50.5° sade formül, arası yumuşak geçiş (vakitte sıçrama olmasın). */
function twilightK(absLat: number, D: number): [number, number] {
  // ≥50°: 8 şehirle uydurulup 6 farklı şehirde doğrulanmış formül
  const kF2 = 0.66 + 0.001 * (absLat - 50) + 0.0002 * (D - 21) ** 2;
  const kI2 = 0.605 + 0.001 * (absLat - 50) + 0.0004 * (D - 19) ** 2;
  if (absLat >= BLEND_HI) return [kF2, kI2];
  const j = Math.max(1, K_TABLE.findIndex((r) => r[0] > absLat));
  const a = K_TABLE[j - 1], b = K_TABLE[j];
  const t = Math.min(1, Math.max(0, (absLat - a[0]) / (b[0] - a[0])));
  const c = a.map((v, i) => v + t * (b[i] - v));
  const d = D - 20;
  const kF1 = c[1] + c[2] * d + c[3] * d * d, kI1 = c[4] + c[5] * d + c[6] * d * d;
  if (absLat <= BLEND_LO) return [kF1, kI1];
  const w = (absLat - BLEND_LO) / (BLEND_HI - BLEND_LO);
  return [kF1 + w * (kF2 - kF1), kI1 + w * (kI2 - kI1)];
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
 * Türkiye'de ve |enlem| < 44°'de vakitleri değiştirmez. `date`: o günün yerel takvim tarihi.
 */
export function adjustHighLatitude<T extends Record<string, string>>(
  times: T,
  lat: number,
  date: { year: number; month: number; day: number },
  timeZone: string,
): T {
  const absLat = Math.abs(lat);
  if (timeZone === TURKEY_TZ || absLat < 44 || absLat > 89) return times;
  const dhuhr = parseHM(times.Dhuhr);
  if (dhuhr == null) return times;
  const noon = dhuhr - 5; // Dhuhr'a +5 dk temkin eklenmiş; güneşin tepe noktası
  const dec = declination(date.year, date.month, date.day);
  const D = 90 - absLat - dec * Math.sign(lat); // güneşin gece yarısı derinliği
  if (D >= 30) return times; // güneş yeterince iniyor: 18° / 16–17° olduğu gibi
  const [kF, kI] = twilightK(absLat, D);
  const ishaNominal = ishaAngle(timeZone);
  const out: Record<string, string> = { ...times };
  // Açı 1°'nin altına inmez (gece yarısı güneşi bölgelerinde vakitler gün doğumu/batımına yapışmasın)
  const aF = Math.max(1, kF * D), aI = Math.max(1, kI * D);
  if (aF < 18 && times.Fajr) out.Fajr = fmtHM(noon - hourAngle(lat, dec, aF) * 4);
  if (aI < ishaNominal && times.Isha) out.Isha = fmtHM(noon + hourAngle(lat, dec, aI) * 4);
  return out as T;
}

/** Yerel Date → takvim günü. */
export const localYMD = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
