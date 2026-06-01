/**
 * sanitizeQuery.ts
 *
 * Kullanıcı arama terimlerini Türkçe karakter duyarlılığını kaldırarak
 * ASCII‑karşılaştırılabilir forma getirir.  Bu sayede "huşu", "husu",
 * "Huşu", "HUSU" gibi tüm varyantlar aynı temel forma ulaşır.
 *
 * Dönüşüm zinciri:
 *   1. toLocaleLowerCase("tr-TR") → büyük-küçük harf eşitleme (İ→i)
 *   2. normalize("NFD")           → ş → s + ◌̧ (combining cedilla)
 *   3. combining diacritic strip  → s + ◌̧ → s
 *   4. "ı" → "i"                  ← NFD ile ayrışmayan tek karakter
 *
 * Örnek: "HÜŞÛ'da" → "husu'da"
 */

/**
 * Tek bir arama terimini normalize eder.
 * @param q Ham kullanıcı girdisi
 * @returns ASCII‑normalleştirilmiş, küçük harf, boşluksuz sorgu
 */
export function sanitizeSearchQuery(q: string): string {
  return q
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // combining diacritical marks
    .replace(/ı/g, "i")               // dotless i → i (NFD ile ayrışmaz)
    .trim();
}

/**
 * Aynı sorgunun hem orijinal (Türkçe karakterleri korunmuş) hem de
 * ASCII‑normalleştirilmiş varyantlarını Set ile birleştirerek döner.
 * Böylece FTS veya LIKE aramalarında tüm varyantlar denenebilir.
 *
 * @param q Ham kullanıcı girdisi
 * @returns Benzersizleştirilmiş arama varyantları dizisi
 */
export function expandSearchPatterns(q: string): string[] {
  const original = q.toLocaleLowerCase("tr-TR").trim();
  const ascii = sanitizeSearchQuery(q);
  return [...new Set([original, ascii])];
}