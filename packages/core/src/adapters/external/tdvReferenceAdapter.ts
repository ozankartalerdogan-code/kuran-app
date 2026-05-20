import type { SourceMetadata } from "@quran-app/types";
import { readJsonFile, repairText } from "../shared";

interface TdvReferenceRecord {
  topic: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  license: string | null;
}

export interface TdvReferenceNote {
  topic: string;
  summary: string | null;
  sources: SourceMetadata[];
}

export async function getTdvMethodologyReference(topic: string): Promise<TdvReferenceNote | null> {
  const records = await readJsonFile<TdvReferenceRecord[]>(
    "revelation-context",
    "tdv-methodology.json"
  );
  const record = records.find((item) => item.topic === topic) ?? null;

  if (record === null) {
    return null;
  }

  return {
    topic: record.topic,
    summary: repairText(record.summary),
    sources: [
      {
        sourceName: record.sourceName,
        sourceType: "reference",
        surahId: null,
        ayahStart: null,
        ayahEnd: null,
        retrievedAt: record.retrievedAt,
        originalUrl: record.sourceUrl,
        confidence: "high",
        dataType: "nuzul",
        usageClass: "secondary",
        license: record.license
      }
    ]
  };
}
