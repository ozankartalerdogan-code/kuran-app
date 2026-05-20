import type {
  NormalizedSurahMeta,
  NormalizedTafsirRange,
  SourceMetadata,
  SurahRevelationContextCacheEntry,
  SurahTafsirCacheEntry
} from "@quran-app/types";
import { getRelativeDataPath, readJsonFile } from "../adapters/shared";
import { writeDataJson } from "./shared";

const surahMetaSource = getRelativeDataPath("normalized", "surah-meta.json");
const normalizedTafsirSource = getRelativeDataPath("normalized", "tafsir.json");

export async function buildSurahLevelCaches(): Promise<void> {
  const [surahs, normalizedTafsir] = await Promise.all([
    readJsonFile<NormalizedSurahMeta[]>("normalized", "surah-meta.json"),
    readJsonFile<NormalizedTafsirRange[]>("normalized", "tafsir.json")
  ]).catch((err) => { throw new Error(`[buildSurahLevelCaches] Dosya yüklenemedi: ${err}`); });

  const surahTafsirEntries: SurahTafsirCacheEntry[] = [];
  const surahContextEntries: SurahRevelationContextCacheEntry[] = [];
  const metadataEntries: SourceMetadata[] = [];

  for (const surah of surahs) {
    const matchedTafsir =
      normalizedTafsir.find(
        (record) =>
          record.surahId === surah.surahId &&
          record.level === "surah" &&
          record.fromAyah === 1 &&
          record.toAyah === (surah.verseCount ?? 0)
      ) ?? null;

    const helperSource: SourceMetadata = {
      sourceName: "Normalized sure metadata",
      sourceType: "github",
      surahId: surah.surahId,
      ayahStart: null,
      ayahEnd: null,
      retrievedAt: "2026-04-15",
      originalUrl: surahMetaSource,
      confidence: "medium",
      dataType: "context",
      usageClass: "github_verified",
      license: null
    };

    const contextEntry: SurahRevelationContextCacheEntry = {
      surahId: surah.surahId,
      revelationType: surah.revelationType,
      revelationOrder: surah.revelationOrder,
      summary: null,
      source: surahMetaSource,
      sourceUrl: null,
      status:
        surah.revelationType !== null || surah.revelationOrder !== null
          ? "available"
          : "insufficient_data",
      missingReason:
        surah.revelationType !== null || surah.revelationOrder !== null
          ? null
          : "source_unavailable",
      methodology: [],
      sources: [helperSource]
    };

    const tafsirEntry: SurahTafsirCacheEntry = {
      surahId: surah.surahId,
      level: "surah",
      text: matchedTafsir?.text ?? null,
      source: matchedTafsir?.source ?? null,
      sourceUrl: matchedTafsir ? normalizedTafsirSource : null,
      status: matchedTafsir?.status ?? "missing",
      missingReason: matchedTafsir?.status === "available" ? null : "source_unavailable",
      sources:
        matchedTafsir === null
          ? []
          : [
              {
                sourceName: matchedTafsir.source ?? "elmalili",
                sourceType: "github",
                surahId: surah.surahId,
                ayahStart: matchedTafsir.fromAyah,
                ayahEnd: matchedTafsir.toAyah,
                retrievedAt: "2026-04-15",
                originalUrl: normalizedTafsirSource,
                confidence: "medium",
                dataType: "tafsir",
                usageClass: "github_verified",
                license: null
              }
            ]
    };

    surahContextEntries.push(contextEntry);
    surahTafsirEntries.push(tafsirEntry);
    metadataEntries.push(helperSource);
  }

  await Promise.all([
    writeDataJson(["tafsir", "surah", "index.json"], surahTafsirEntries),
    writeDataJson(["revelation-context", "surah", "index.json"], surahContextEntries),
    writeDataJson(["source-metadata", "surah-level.json"], metadataEntries)
  ]);
}
