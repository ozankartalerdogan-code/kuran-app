// Saf metin normalleştirme yardımcıları (React/RN bağımlılığı yok → node --test ile test edilir).

/**
 * Arama karşılaştırmaları için metni normalleştirir:
 * - şapkalı ünlüleri düşürür (Â/â → a, Î/î → i, Û/û → u; ayrık \u0302 dahil)
 * - tr-TR kurallarıyla küçük harfe çevirir (İ → i, I → ı)
 * - boşluk, tire ve kesme işaretlerini kaldırır ("er-rahman", "er rahman", "errahman" eşleşir)
 * Arapça harflere ve Türkçe özel harflere (ç, ğ, ö, ş, ü, ı) dokunmaz.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[Ââ]/g, "a")
    .replace(/[Îî]|I\u0302/g, "i")
    .replace(/[Ûû]/g, "u")
    .replace(/\u0302/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s\-\u2010\u2011–—'’‘ʼʻ`´′]+/g, "");
}
