/**
 * rootMeaningGroups.ts — Kök detayındaki türev kelimeleri ANLAMLARINA göre
 * gruplayıp baskın/nadir ("Diğer anlamlar") ayrımını üreten SAF mantık.
 *
 * Component'ten (app/root/[root]/index.tsx) ayrıldı ki test edilebilsin:
 * bu dosyadaki "doğrudan sayım" kuralı, çok-anlamlı formlarda sık anlamları
 * 0'a düşürüp kaybeden eski "form→ilk anlam" bug'ının regresyon kalkanı.
 */

export type Verse = { surahId: number; ayahNumber: number; wordIndex: number };
export type DerivedWord = { word: string; meaning: string; surahId: number; ayahNumber: number; wordIndex: number };
export type MeaningGroup = { forms: string[]; verses: Verse[] };
export type MeaningEntry = [string, MeaningGroup];

export function getRootOccurrenceAyahHref(verse: Verse): string {
  return `/ayah/${verse.surahId}/${verse.ayahNumber}?word=${verse.wordIndex}`;
}

// Bu sayının altında ayette geçen anlamlar "Diğer anlamlar" altına katlanır.
export const PRIMARY_MIN_VERSES = 3;

const normalize = (value: string) => value.normalize("NFC").trim();

/**
 * Türev kelimeleri anlamlarına göre grupla, ayet sayısına göre azalan sırala,
 * eşiğe göre baskın/nadir ayır.
 *
 * KRİTİK: anlamlar `derivedWords` üzerinden DOĞRUDAN sayılır — bir kelime FORMU
 * birden çok anlama girebilir; her anlam kendi gerçek ayet sayısıyla temsil
 * edilir. (Eski "her formun yalnız ilk anlamını al" yaklaşımı قول→"denir" gibi
 * sık anlamları 0'a düşürüp kaybediyordu.)
 */
export function groupRootMeanings(
  derivedWords: DerivedWord[] | undefined | null,
  primaryMinVerses: number = PRIMARY_MIN_VERSES,
): { primary: MeaningEntry[]; others: MeaningEntry[] } {
  if (!derivedWords || derivedWords.length === 0) {
    return { primary: [], others: [] };
  }

  const meaningMap = new Map<string, MeaningGroup>();
  for (const dw of derivedWords) {
    const key = normalize(dw.meaning) || "—";
    let group = meaningMap.get(key);
    if (!group) {
      group = { forms: [], verses: [] };
      meaningMap.set(key, group);
    }
    if (!group.forms.some((form) => normalize(form) === normalize(dw.word))) {
      group.forms.push(dw.word);
    }
    group.verses.push({ surahId: dw.surahId, ayahNumber: dw.ayahNumber, wordIndex: dw.wordIndex });
  }

  const sorted = Array.from(meaningMap.entries()).sort(
    (a, b) => b[1].verses.length - a[1].verses.length,
  );

  let primary = sorted.filter(([, g]) => g.verses.length >= primaryMinVerses);
  let others = sorted.filter(([, g]) => g.verses.length < primaryMinVerses);

  // Hiç baskın anlam yoksa en sık geçeni yine de ana listede göster.
  if (primary.length === 0 && sorted.length > 0) {
    primary = sorted.slice(0, 1);
    others = sorted.slice(1);
  }
  // Tek bir "diğer" anlamı katlamanın anlamı yok → ana listede bırak.
  if (others.length === 1) {
    primary = [...primary, ...others];
    others = [];
  }

  return { primary, others };
}
