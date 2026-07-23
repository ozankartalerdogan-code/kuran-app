/**
 * ayahRefs.ts — ders metnindeki Kur'an ayet referanslarını bulur.
 *
 * Desteklenen format: "5/6", "33:21", "112/1-4" (sure/ayet veya sure:ayet,
 * opsiyonel -aralık). Referanstaki ilk sayı SURE, ikincisi AYET numarasıdır.
 *
 * Yanlış-pozitifleri eler (dış/güvenilmez metin):
 *  - Sure 1..114 dışıysa (ör. "620/621" sayfa no) → link değil
 *  - Ayet, surenin ayet sayısını aşıyorsa (ör. "1/10" → Fatiha 7 ayet) → değil
 *  - Hemen ardından Türkçe ek apostrofu varsa ("2/3'ü", "1/10'u" = kesir) → değil
 *  - Öncesinde rakam varsa ("05:30" içindeki "5:30" gibi saat/parça) → değil
 * Hadis referansları ("Müslim, Taharet 1") zaten X/Y biçiminde olmadığından eşleşmez.
 */

// 114 surenin ayet sayıları (standart Hafs sayımı). Dizin = sure no (1..114);
// index 0 kullanılmaz. Modül kendine-yeter olsun diye burada tutulur (node testi
// relative .ts import'unu çözmüyor); gerekirse dışarıdan da import edilebilir.
export const SURAH_AYAH_COUNTS: readonly number[] = [
  0, // 0 — kullanılmaz
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "ayah"; value: string; surahId: number; ayahNumber: number };

// sure[:/]ayet(-aralık)? — sayılar baştan sıfırsız (saatleri elemeye yardım eder)
const REF_RE = /([1-9]\d{0,2})[:/]([1-9]\d{0,2})(?:-\d{1,3})?/g;

export function isValidSurahId(surahId: number): boolean {
  return Number.isInteger(surahId) && surahId >= 1 && surahId <= 114;
}

export function isValidAyahRef(surahId: number, ayahNumber: number): boolean {
  if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) return false;
  if (surahId < 1 || surahId > 114) return false;
  return ayahNumber >= 1 && ayahNumber <= SURAH_AYAH_COUNTS[surahId];
}

export function parseAyahRefs(text: string): TextSegment[] {
  if (!text) return [{ type: "text", value: text ?? "" }];

  const out: TextSegment[] = [];
  let last = 0;
  REF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = REF_RE.exec(text)) !== null) {
    const full = m[0];
    const start = m.index;
    const end = start + full.length;

    // Öncesinde rakam → "05:30" içindeki "5:30" gibi parça eşleşme, atla.
    const prevChar = start > 0 ? text[start - 1] : "";
    if (/\d/.test(prevChar)) continue;

    // Ardında Türkçe ek apostrofu → kesir/oran ("2/3'ü"), atla.
    const nextChar = text[end] ?? "";
    if (nextChar === "'" || nextChar === "’") continue;

    const surahId = parseInt(m[1], 10);
    const ayahNumber = parseInt(m[2], 10);
    if (!isValidAyahRef(surahId, ayahNumber)) continue;

    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    out.push({ type: "ayah", value: full, surahId, ayahNumber });
    last = end;
  }

  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.length ? out : [{ type: "text", value: text }];
}

/** Metinde en az bir geçerli ayet referansı var mı? (hızlı yol kontrolü) */
export function hasAyahRef(text: string): boolean {
  return parseAyahRefs(text).some((s) => s.type === "ayah");
}

// Arama kutusu için: TÜM sorgu tek başına "sure:ayet"/"sure/ayet" mi? (aralık
// desteklenmez — arama tek ayete gitmek içindir). Eşleşirse API'ye hiç gitmeden
// doğrudan /ayah/{sure}/{ayet}'e yönlendirilebilir — "2:255" yazan kullanıcı
// önceden "sonuç bulunamadı" görüyordu, arama API'si bu notasyonu anlamıyordu.
const DIRECT_REF_RE = /^([1-9]\d{0,2})[:/]([1-9]\d{0,2})$/;

export function parseDirectAyahQuery(query: string): { surahId: number; ayahNumber: number } | null {
  const m = DIRECT_REF_RE.exec(query.trim());
  if (!m) return null;
  const surahId = parseInt(m[1], 10);
  const ayahNumber = parseInt(m[2], 10);
  return isValidAyahRef(surahId, ayahNumber) ? { surahId, ayahNumber } : null;
}
