/**
 * ftsQuery.ts — arama sorgusu normalizasyonu ve FTS5 temizleyicisi.
 *
 * Saf (DB/IO bağımsız) fonksiyonlar; arama route'u bunları kullanır.
 * Ayrı modülde olmaları test edilebilirlik içindir (bkz. ftsQuery.test.ts).
 */

/**
 * Kullanıcının yazdığı arama terimini ASCII‑güvenli ve karşılaştırmaya
 * uygun hale getirir.  NFD ayrıştırma + combining diacritic temizliği
 * ile ş→s, ç→c, ğ→g, ü→u, ö→o, î→i, â→a dönüşümü yapar.
 * Sadece "ı" (dotless i) NFD ile ayrışmadığı için özel olarak ele alınır.
 */
export function sanitizeSearchQuery(q: string): string {
  return q
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

/**
 * Aynı sorgunun hem orijinal (Türkçe karakterler korunmuş) hem de
 * ASCII‑normalleştirilmiş varyantlarını döner.  Tekil kalması için
 * Set ile birleştirilir.
 */
export function expandSearchPatterns(q: string): string[] {
  const original = q.toLocaleLowerCase("tr-TR").trim();
  const ascii = sanitizeSearchQuery(q);
  return [...new Set([original, ascii])];
}

/**
 * Sondaki "suresi" / "sûresi" / "sure" / "sûre" kelimesini ayıklar; böylece
 * "Bakara Suresi" araması da "Bakara" gibi sureye eşleşir. Yalnızca önünde
 * boşluk olan son kelimeyi soyar — tek kelimelik sorguları (ör. sadece "sure")
 * olduğu gibi bırakır, boş sorgu üretmez.
 */
export function stripSurahSuffix(q: string): string {
  return q
    .replace(/\s+s[uû]res[iı]$/i, "")
    .replace(/\s+s[uû]re$/i, "")
    .trim();
}

/**
 * FTS5 sorgusunda anlam taşıyan özel karakterleri (tırnak, *, ^, parantez,
 * tire) ve AND/OR/NOT operatörlerini boşlukla değiştirir; böylece kullanıcı
 * girdisi ham FTS sözdizimi olarak yorumlanmaz.
 */
export function escapeFts(q: string): string {
  return q
    .replace(/["*^()-]/g, " ")
    .replace(/\b(AND|OR|NOT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
