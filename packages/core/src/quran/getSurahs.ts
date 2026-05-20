import type { Surah } from "@quran-app/types";
import { readSurahsFromLocalData } from "../adapters/quranAdapter";

export async function getSurahs(): Promise<Surah[]> {
  return readSurahsFromLocalData();
}
