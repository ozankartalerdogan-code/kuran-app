/**
 * resumeReading.ts — Kur'an sekmesindeki "Kaldığın yerden devam et" kartı için
 * kayıtlı sayfa / yer imi ayrıştırıcısı.
 * Büyük mushaf JSON'unu içe aktarmaz; ayet→sayfa çevirisi çağırandan gelir
 * (böylece Node testlerinden doğrudan çağrılabilir).
 */

/** Standart Medine mushafının sayfa sayısı (mushafSayfa.SAYFA_SAYISI ile aynı). */
export const RESUME_MAX_PAGE = 604;

/**
 * Kayıtlı mushaf sayfasını (1..604) döner; geçersiz/boş ise yer imini ("sure:ayet")
 * pageOfAyah ile mushaf sayfasına çevirir. İkisi de yoksa/geçersizse null döner.
 */
export function parseSavedPage(
  rawPage: string | null,
  bookmark: string | null,
  pageOfAyah: (surah: number, ayah: number) => number,
): number | null {
  const saved = Number(rawPage);
  if (rawPage && Number.isInteger(saved) && saved >= 1 && saved <= RESUME_MAX_PAGE) {
    return saved;
  }
  const [bs, ba] = (bookmark ?? "").split(":").map(Number);
  if (Number.isInteger(bs) && bs >= 1 && bs <= 114 && Number.isInteger(ba) && ba >= 1) {
    return pageOfAyah(bs, ba);
  }
  return null;
}
