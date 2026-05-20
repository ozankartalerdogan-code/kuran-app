import type {
  AyahRangeTafsirCacheEntry,
  NormalizedTafsirRange,
  SourceMetadata
} from "@quran-app/types";
import { getRelativeDataPath, readJsonFile } from "../adapters/shared";
import { writeDataJson } from "./shared";

const normalizedTafsirSource = getRelativeDataPath("normalized", "tafsir.json");

export async function buildAyahRangeTafsirCaches(): Promise<void> {
  const records = (await readJsonFile<NormalizedTafsirRange[]>("normalized", "tafsir.json")).filter(
    (record) => record.level === "ayah_range"
  );

  const normalizedEntries: AyahRangeTafsirCacheEntry[] = records.map((record) => {
    const sources: SourceMetadata[] = [
      {
        sourceName: record.source ?? "elmalili",
        sourceType: "github",
        surahId: record.surahId,
        ayahStart: record.fromAyah,
        ayahEnd: record.toAyah,
        retrievedAt: "2026-04-15",
        originalUrl: normalizedTafsirSource,
        confidence: "medium",
        dataType: "tafsir",
        usageClass: "github_verified",
        license: null
      }
    ];

    return {
      surahId: record.surahId,
      fromAyah: record.fromAyah,
      toAyah: record.toAyah,
      level: record.level,
      text: record.text,
      source: record.source,
      sourceUrl: normalizedTafsirSource,
      status: record.status,
      missingReason: record.status === "available" ? null : "source_unavailable",
      sources
    };
  });

  await writeDataJson(["tafsir", "ayah-ranges", "index.json"], normalizedEntries);
}
