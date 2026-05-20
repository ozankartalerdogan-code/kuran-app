import type { SurahContextData } from "@quran-app/types";
import { readSurahContextFromLocalData } from "../adapters/surahContextAdapter";

export async function getSurahContext(surahId: number): Promise<SurahContextData | null> {
  return readSurahContextFromLocalData(surahId);
}
