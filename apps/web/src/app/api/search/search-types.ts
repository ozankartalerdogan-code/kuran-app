export interface SurahMatch {
  surahId: number;
  surahName: string;
}

export interface SuggestedSurah {
  id:   number;
  name: string;
}

export type SearchResponse =
  | { type: "surah";  surahId: number; surahName: string }
  | { type: "tag";    tag: string; tagType: "ana_tema" | "alt_tag"; count: number }
  | { type: "verses"; results: Array<{ verse_key: string; meal: string | null; surah_name: string | null; arabic_text: string | null; reading_tr: string | null }>; total: number; suggestedSurah?: SuggestedSurah }
  | { type: "none" };
