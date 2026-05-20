import type { Ayah } from "@quran-app/types";
import { readAyahFromLocalData } from "../adapters/quranAdapter";

export async function getAyah(surahId: number, verseNumber: number): Promise<Ayah> {
  return readAyahFromLocalData(surahId, verseNumber);
}
