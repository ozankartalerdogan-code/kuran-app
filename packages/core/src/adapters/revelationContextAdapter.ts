import type { RevelationContext } from "@quran-app/types";
import type { SurahRevelationContextCacheEntry } from "@quran-app/types";
import { getRelativeDataPath, readJsonFile } from "./shared";
import { getDiyanetRevelationContext } from "./external/diyanetNuzulAdapter";
import { getTdvMethodologyReference } from "./external/tdvReferenceAdapter";

export async function getRevelationContext(
  surahId: number,
  ayahNumber: number
): Promise<RevelationContext | null> {
  let diyanetContext: Awaited<ReturnType<typeof getDiyanetRevelationContext>>;
  let tdvReference: Awaited<ReturnType<typeof getTdvMethodologyReference>>;
  let surahContexts: SurahRevelationContextCacheEntry[];
  try {
    [diyanetContext, tdvReference, surahContexts] = await Promise.all([
      getDiyanetRevelationContext(surahId, ayahNumber),
      getTdvMethodologyReference("esbab_i_nuzul"),
      readJsonFile<SurahRevelationContextCacheEntry[]>("revelation-context", "surah", "index.json")
    ]);
  } catch (err) {
    console.error(`[getRevelationContext] ${surahId}:${ayahNumber} yüklenemedi:`, err);
    return null;
  }

  const surahContext =
    surahContexts.find((entry) => entry.surahId === surahId && entry.status === "available") ?? null;
  const selectedContext =
    diyanetContext ??
    (surahContext === null
      ? null
      : {
          scope: "surah" as const,
          source: getRelativeDataPath("revelation-context", "surah", "index.json"),
          summary: surahContext.summary,
          relatedSurahId: surahId,
          relatedAyahId: null,
          methodology: surahContext.methodology,
          sources: surahContext.sources,
          status: surahContext.status
        });

  if (selectedContext === null) {
    return null;
  }

  return {
    ...selectedContext,
    methodology: tdvReference?.summary
      ? [...selectedContext.methodology, tdvReference.summary]
      : selectedContext.methodology,
    sources: tdvReference
      ? [...selectedContext.sources, ...tdvReference.sources]
      : selectedContext.sources
  };
}
