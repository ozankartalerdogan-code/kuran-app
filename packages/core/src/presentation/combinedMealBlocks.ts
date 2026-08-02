/**
 * Elmalılı Hamdi Yazır mealinin, Arapça cümle yapısı Kur'an ayet sınırını ortadan
 * kestiği için birden fazla ayeti TEK Türkçe cümlede verdiği 50 blok (107 ayet).
 * Bu aralıktaki her ayette `translations.text` (source='yazir') birebir aynıdır —
 * bölünemez, bkz. proje hafızası "birlesik-meal-bloklari". Liste 2026-07-29'da
 * `translations.text` (source='yazir') art arda eşitliğine göre çıkarıldı.
 */
const COMBINED_MEAL_BLOCKS: readonly (readonly [surah: number, start: number, end: number])[] = [
  [3, 3, 4], [3, 166, 167],
  [4, 118, 119], [4, 160, 161],
  [15, 92, 93],
  [26, 75, 76], [26, 92, 93], [26, 95, 96], [26, 151, 152], [26, 198, 199], [26, 200, 201], [26, 225, 226],
  [36, 2, 3], [36, 5, 6], [36, 60, 61],
  [37, 22, 23], [37, 42, 43], [37, 45, 46], [37, 58, 59], [37, 88, 89], [37, 124, 126], [37, 137, 138],
  [37, 143, 144], [37, 151, 152], [37, 161, 163], [37, 164, 166], [37, 167, 169], [37, 171, 173],
  [38, 80, 81],
  [42, 1, 2],
  [43, 2, 3], [43, 68, 69],
  [44, 2, 3], [44, 4, 6], [44, 10, 11],
  [50, 32, 33],
  [51, 15, 16], [51, 20, 21],
  [52, 2, 3],
  [96, 9, 10], [96, 15, 16],
  [99, 4, 5],
  [101, 1, 3], [101, 6, 7], [101, 8, 9],
  [102, 1, 2], [102, 5, 6],
  [104, 1, 2], [104, 6, 7], [104, 8, 9],
];

const COMBINED_MEAL_VERSE_KEYS: ReadonlySet<string> = new Set(
  COMBINED_MEAL_BLOCKS.flatMap(([surah, start, end]) => {
    const keys: string[] = [];
    for (let ayah = start; ayah <= end; ayah++) keys.push(`${surah}:${ayah}`);
    return keys;
  })
);

/** verseKey "3:4" gibi `surah:ayah` biçiminde olmalı. */
export function isCombinedMealVerse(verseKey: string): boolean {
  return COMBINED_MEAL_VERSE_KEYS.has(verseKey);
}

/**
 * Tek bir ayete özgü, Elmalılı'ya atfedilmeyen görüntüleme metni seçer.
 *
 * Elmalılı'nın mealini olduğu-gibi-gösteren yerlerde (ör. "Elmalılı H. Yazır"
 * etiketli meal sekmesi) bu fonksiyon KULLANILMAMALI — o metin gerçekten onun
 * yazdığıdır, birden fazla ayeti kapsasa da yanlış değildir. Bu fonksiyon; tek
 * ayete özgü bir çeviri gösterilmesi gereken ama Elmalılı atfı yapılmayan
 * yerler için (paylaşım metni/kartı, liste önizlemesi gibi) tasarlandı: birleşik
 * blok ayetlerinde meal yerine, o ayete özgü literal çeviriyi döndürür.
 */
export function pickAttributionFreeMealText(
  verseKey: string,
  meal: string | null | undefined,
  literalCeviri: string | null | undefined
): string | null {
  if (isCombinedMealVerse(verseKey) && literalCeviri) return literalCeviri;
  return meal ?? null;
}
