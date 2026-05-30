export interface RootDetail {
  root: string;
  meaningTr: string;
  distribution: Record<number, number>;
  derivedWords: Array<{
    word: string;
    meaning: string;
    surahId: number;
    ayahNumber: number;
  }>;
}