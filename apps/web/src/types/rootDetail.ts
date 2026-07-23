export interface RootDetail {
  root: string;
  meaningTr: string;
  distribution: Record<number, number>;
  /** Optional so cached responses created before truncation metadata remain readable. */
  derivedTotal?: number;
  isTruncated?: boolean;
  derivedWords: Array<{
    word: string;
    meaning: string;
    surahId: number;
    ayahNumber: number;
    wordIndex: number;
  }>;
}