import type { TafsirSummary } from "@quran-app/types";
import { getDiyanetTafsirSummary } from "./external/diyanetTafsirAdapter";

export async function getTafsirSummary(
  surahId: number,
  ayahNumber: number
): Promise<TafsirSummary | null> {
  return getDiyanetTafsirSummary(surahId, ayahNumber);
}
