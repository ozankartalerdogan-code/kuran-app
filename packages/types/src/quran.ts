export type AvailabilityStatus = "available" | "missing" | "insufficient_data" | "corrupted";

export type RevelationType = "mekki" | "medeni";

export type TranslationLanguage = "tr";

export interface Translation {
  language: TranslationLanguage;
  source: string | null;
  text: string | null;
  status: AvailabilityStatus;
}

export interface Surah {
  id: number;
  arabicName: string | null;
  turkishName: Translation;
  verseCount: number | null;
  revelationType: RevelationType | null;
  revelationPlace: string | null;
  revelationOrder: number | null;
  shortIntroduction: string | null;
  status: AvailabilityStatus;
}

export interface SurahContextData {
  surahId: number;
  revelationPlace?: string | null;
  revelationOrder?: number | null;
  shortIntroduction?: string | null;
  source?: string;
}

export interface Ayah {
  id: number;
  surahId: number;
  verseNumber: number;
  arabicText: string | null;
  transliteration: string | null;
  translations: Translation[];
  status: AvailabilityStatus;
}

export interface NormalizedTranslationSource {
  source: string;
  text: string | null;
  status: AvailabilityStatus;
}

export interface NormalizedArabicAyah {
  surahId: number;
  ayahNumber: number;
  arabicText: string | null;
  status: AvailabilityStatus;
}

export interface NormalizedAyahTranslations {
  surahId: number;
  ayahNumber: number;
  translations: NormalizedTranslationSource[];
  transliteration: string | null;
  transliterationStatus: AvailabilityStatus;
  status: AvailabilityStatus;
}

export interface NormalizedSurahMeta {
  surahId: number;
  turkishName: string | null;
  arabicName: string | null;
  revelationType: RevelationType | null;
  revelationOrder: number | null;
  verseCount: number | null;
  transliteration: string | null;
  transliterationStatus: AvailabilityStatus;
  ayahLevelNuzulStatus: "missing";
  status: AvailabilityStatus;
}
