/** Düzeltilemeyen encoding hatalarını tespit eder */
export function hasEncodingError(text: string): boolean {
  const lower = text.toLocaleLowerCase("tr-TR");
  if (/\ballah(?:['''ʼ]in)?\s+adiyl[ae]\b/u.test(lower)) return true; // ASCII Türkçe kaybı
  if (/[A-Za-zÇĞİÖŞÜçğıöşü]['']?[01][A-Za-zÇĞİÖŞÜçğıöşü]/u.test(text)) return true; // rakam ikamesi
  if (/[Ã�]|(?:Ù|Ø)/u.test(text)) return true; // bozuk encoding
  return false;
}

/** Düzeltilebilir sorunları temizler; tamamen bozuksa null döner */
export function cleanMealText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const cleaned = text
    .replace(/^\(\d+(?:-\d+)+\)\s*/u, "")  // başındaki dipnot (1-2)
    .replace(/\[\d+\]/gu, "")               // [1] dipnot işaretleri
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned || hasEncodingError(cleaned)) return null;
  return cleaned;
}
