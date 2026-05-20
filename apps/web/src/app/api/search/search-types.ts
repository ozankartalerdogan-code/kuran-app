export interface SurahMatch {
  surahId: number;
  surahName: string;
}

export type SearchResponse =
  | { type: "surah"; surahId: number; surahName: string }
  | { type: "none" };
