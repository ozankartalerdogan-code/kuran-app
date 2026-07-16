/**
 * Guard for the canonical Quran Arabic field.
 *
 * Unlike normalizeTextValue/repairTextDetailed, this function is deliberately
 * identity-only: it rejects container corruption and returns the exact input
 * string without trim, replace, Unicode normalization, or mark reordering.
 */
export function preserveCanonicalQuranArabic(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value.length === 0) return null;
  if (value.charCodeAt(0) === 0xfeff) throw new Error("Canonical Quran ayah contains a BOM");
  if (value.startsWith("\u0020")) throw new Error("Canonical Quran ayah contains an unexpected leading U+0020");
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(value)) {
    throw new Error("Canonical Quran ayah contains a control character");
  }
  return value;
}
