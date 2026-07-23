export type AyetKoordinati = { surahId: number; ayahNumber: number };

function karsilastir(s1: number, a1: number, s2: number, a2: number): number {
  return s1 !== s2 ? s1 - s2 : a1 - a2;
}

/**
 * Bir API cevabının ilgili sayfanın ayetlerini tam, sıralı ve tekrarsız
 * taşıdığını yalnız sure/ayet koordinatları üzerinden doğrular.
 */
export function mushafSayfaAyetKoordinatlariGecerli(
  page: number,
  verses: readonly AyetKoordinati[],
  sayfalar: readonly (readonly [number, number])[],
  ayetSayilari: readonly number[],
): boolean {
  if (!Number.isInteger(page) || page < 1 || page > sayfalar.length) return false;

  const beklenen: [number, number][] = [];
  let [surahId, ayahNumber] = sayfalar[page - 1];
  const sonrakiBaslangic = page < sayfalar.length ? sayfalar[page] : null;

  while (
    sonrakiBaslangic
      ? karsilastir(surahId, ayahNumber, sonrakiBaslangic[0], sonrakiBaslangic[1]) < 0
      : surahId <= ayetSayilari.length
  ) {
    beklenen.push([surahId, ayahNumber]);
    if (ayahNumber < ayetSayilari[surahId - 1]) {
      ayahNumber += 1;
    } else {
      surahId += 1;
      ayahNumber = 1;
    }
  }

  return verses.length === beklenen.length && verses.every(
    (verse, index) => verse.surahId === beklenen[index][0] && verse.ayahNumber === beklenen[index][1],
  );
}
