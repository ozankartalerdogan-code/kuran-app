/**
 * Bölüm başlıkları için büyük harf. İngilizce: düz büyütme. Türkçe: i→İ, ı→I elle
 * (Hermes'te locale'li büyütmeye güvenmeyiz); yabancı kökenli "Widget" Türkçe "İ" almaz.
 */
export function capsText(value: string, lang: "tr" | "en"): string {
  if (lang === "en") return value.toUpperCase();
  return value.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase().replace(/WİDGET/g, "WIDGET");
}
