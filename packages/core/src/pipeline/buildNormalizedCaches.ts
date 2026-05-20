import { readdir, readFile } from "node:fs/promises";
import type {
  NormalizationReport,
  NormalizedArabicAyah,
  NormalizedAyahTranslations,
  NormalizedSurahMeta,
  NormalizedTafsirRange,
  RevelationType
} from "@quran-app/types";
import {
  hasResidualCorruption,
  repairTextDetailed,
  resolveDataPath
} from "../adapters/shared";
import { writeDataJson } from "./shared";

interface ExternalSurahMetaRecord {
  number: number;
  name: string;
  arabicName: string;
  verses: number;
  revelation: string;
  revelationOrder?: number;
}

interface ExternalSurahVerseRecord {
  verseNumber: number;
  arabic?: string;
}

interface ExternalSurahJsonRecord {
  verses: ExternalSurahVerseRecord[];
}

interface ExternalTranslationVerse {
  chapter: number;
  verse: number;
  text: string;
}

interface ExternalTranslationVerseAlternative {
  surahId: number;
  verseNumber: number;
  text: string;
}

interface ExternalTranslationFileObject {
  quran: ExternalTranslationVerse[];
}

type ExternalTranslationFile =
  | ExternalTranslationFileObject
  | ExternalTranslationVerseAlternative[];

interface ExternalTransliterationSurah {
  id: number;
  transliteration?: string;
  verses?: {
    id: number;
    transliteration?: string;
  }[];
}

const normalizedDirectory = ["normalized"] as const;
const externalDirectory = ["quran", "external", "Kuran"] as const;
const externalTranslationsDirectory = [
  ...externalDirectory,
  "Kuran-Rehberi-main",
  "data",
  "translations"
] as const;
const externalSurahMetaPath = [
  ...externalDirectory,
  "Kuran-Rehberi-main",
  "data",
  "surahs.json"
] as const;
const externalArabicDirectory = [...externalDirectory, "json-main", "sure"] as const;
const externalTafsirDirectory = [...externalDirectory, "json-main", "tafseer", "elmalili"] as const;
const localTransliterationPath = ["quran", "transliteration.json"] as const;

function normalizeRevelationType(value: string | null): RevelationType | null {
  const normalizedValue = value?.toLocaleLowerCase("tr-TR") ?? null;

  if (normalizedValue === "mekki") {
    return "mekki";
  }

  if (normalizedValue === "medeni") {
    return "medeni";
  }

  return null;
}

function normalizeTranslationSource(fileName: string): string {
  return fileName.replace(/^tr\./i, "").replace(/\.json$/i, "").replaceAll("_", "-");
}

function stripMarkdown(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const withoutHeading = value.replace(/^\s*\d+\s*-[^\n:]+:\s*/u, "");

  const normalized = withoutHeading
    .replace(/^\s*-{3,}\s*$/gmu, "")
    .replace(/\\([\\`*_{}[\]()#+.!-])/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/gmu, "$1")
    .replace(/`{1,3}([^`]*)`{1,3}/gmu, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/gmu, "$1")
    .replace(/\n{3,}/gmu, "\n\n")
    .trim();

  return normalized || null;
}

function sortTranslationFiles(fileNames: string[]): string[] {
  return [...fileNames].sort((left, right) => {
    if (left === "tr.diyanet.json") {
      return -1;
    }

    if (right === "tr.diyanet.json") {
      return 1;
    }

    return left.localeCompare(right, "tr");
  });
}

function getTranslationVerses(record: ExternalTranslationFile): ExternalTranslationVerse[] {
  if (Array.isArray(record)) {
    return record
      .map((item) => ({
        chapter: item.surahId,
        verse: item.verseNumber,
        text: item.text
      }))
      .filter(
        (item) =>
          Number.isFinite(item.chapter) && Number.isFinite(item.verse) && typeof item.text === "string"
      );
  }

  return Array.isArray(record.quran) ? record.quran : [];
}

export async function buildNormalizedCaches(): Promise<NormalizationReport> {
  let encodingFixCount = 0;

  const repairTrackedText = (value: string | null | undefined): string | null => {
    const repaired = repairTextDetailed(value);

    if (repaired.changed) {
      encodingFixCount += 1;
    }

    return repaired.text;
  };

  const getTranslationStatus = (text: string | null): "available" | "missing" | "corrupted" => {
    if (text === null) {
      return "missing";
    }

    return hasResidualCorruption(text) ? "corrupted" : "available";
  };

  const [surahMetaContent, translationFileNames, transliterationContent] = await Promise.all([
    readFile(resolveDataPath(...externalSurahMetaPath), "utf8"),
    readdir(resolveDataPath(...externalTranslationsDirectory)),
    readFile(resolveDataPath(...localTransliterationPath), "utf8").catch(() => null)
  ]).catch((err) => { throw new Error(`[buildNormalizedCaches] Dosya yüklenemedi: ${err}`); });

  const externalSurahMeta = JSON.parse(surahMetaContent) as ExternalSurahMetaRecord[];
  const externalTransliteration =
    transliterationContent === null
      ? []
      : (JSON.parse(transliterationContent) as ExternalTransliterationSurah[]);
  const surahTransliterationById = new Map<number, string>();
  const ayahTransliterationByKey = new Map<string, string>();

  for (const surah of externalTransliteration) {
    const surahTransliteration = repairTrackedText(surah.transliteration ?? null);

    if (Number.isFinite(surah.id) && surahTransliteration !== null) {
      surahTransliterationById.set(surah.id, surahTransliteration);
    }

    for (const verse of surah.verses ?? []) {
      const ayahTransliteration = repairTrackedText(verse.transliteration ?? null);

      if (Number.isFinite(surah.id) && Number.isFinite(verse.id) && ayahTransliteration !== null) {
        ayahTransliterationByKey.set(`${surah.id}:${verse.id}`, ayahTransliteration);
      }
    }
  }

  const normalizedSurahMeta: NormalizedSurahMeta[] = externalSurahMeta.map((record) => {
    const turkishName = repairTrackedText(record.name);
    const arabicName = repairTrackedText(record.arabicName);
    const revelationType = normalizeRevelationType(repairTrackedText(record.revelation));
    const transliteration = surahTransliterationById.get(record.number) ?? null;

    return {
      surahId: record.number,
      turkishName,
      arabicName,
      revelationType,
      revelationOrder: Number.isFinite(record.revelationOrder) ? record.revelationOrder ?? null : null,
      verseCount: Number.isFinite(record.verses) ? record.verses : null,
      transliteration,
      transliterationStatus: transliteration === null ? "missing" : "available",
      ayahLevelNuzulStatus: "missing",
      status:
        turkishName !== null && arabicName !== null && revelationType !== null ? "available" : "missing"
    };
  });

  const verseCountBySurah = new Map(
    normalizedSurahMeta.map((record) => [record.surahId, record.verseCount ?? 0])
  );

  const normalizedArabic: NormalizedArabicAyah[] = [];

  for (let surahId = 1; surahId <= 114; surahId += 1) {
    const fileContent = await readFile(
      resolveDataPath(...externalArabicDirectory, `${surahId}.json`),
      "utf8"
    );
    const surahRecord = JSON.parse(fileContent) as ExternalSurahJsonRecord;

    for (const verse of surahRecord.verses) {
      const arabicText = repairTrackedText(verse.arabic ?? null);

      normalizedArabic.push({
        surahId,
        ayahNumber: verse.verseNumber,
        arabicText,
        status: arabicText === null ? "missing" : "available"
      });
    }
  }

  const normalizedTranslationMap = new Map<string, NormalizedAyahTranslations>();
  const translationFiles = sortTranslationFiles(
    translationFileNames.filter((fileName) => /^tr\..+\.json$/iu.test(fileName))
  );

  for (const translationFile of translationFiles) {
    const source = normalizeTranslationSource(translationFile);
    const fileContent = await readFile(
      resolveDataPath(...externalTranslationsDirectory, translationFile),
      "utf8"
    );
    const translationRecord = JSON.parse(fileContent) as ExternalTranslationFile;
    const verses = getTranslationVerses(translationRecord);

    for (const verse of verses) {
      const expectedVerseCount = verseCountBySurah.get(verse.chapter) ?? 0;

      if (verse.verse < 1 || verse.verse > expectedVerseCount) {
        continue;
      }

      const key = `${verse.chapter}:${verse.verse}`;
      const repairedText = repairTrackedText(verse.text);
      const existingRecord =
        normalizedTranslationMap.get(key) ??
        ({
          surahId: verse.chapter,
          ayahNumber: verse.verse,
          translations: [],
          transliteration: ayahTransliterationByKey.get(key) ?? null,
          transliterationStatus: ayahTransliterationByKey.has(key) ? "available" : "missing",
          status: "missing"
        } as NormalizedAyahTranslations);

      existingRecord.translations.push({
        source,
        text: repairedText,
        status: getTranslationStatus(repairedText)
      });
      existingRecord.status = existingRecord.translations.some(
        (translation) => translation.status === "available"
      )
        ? "available"
        : existingRecord.translations.some((translation) => translation.status === "corrupted")
          ? "corrupted"
          : "missing";
      normalizedTranslationMap.set(key, existingRecord);
    }
  }

  const normalizedTranslations = [...normalizedTranslationMap.values()].sort(
    (left, right) => left.surahId - right.surahId || left.ayahNumber - right.ayahNumber
  );

  const tafsirFileNames = (await readdir(resolveDataPath(...externalTafsirDirectory))).filter((fileName) =>
    /\.md$/iu.test(fileName)
  );
  const normalizedTafsir: NormalizedTafsirRange[] = [];

  for (const tafsirFile of tafsirFileNames) {
    const surahId = Number.parseInt(tafsirFile.replace(/\.md$/iu, ""), 10);

    if (!Number.isFinite(surahId)) {
      continue;
    }

    const fileContent = await readFile(
      resolveDataPath(...externalTafsirDirectory, tafsirFile),
      "utf8"
    );
    const repairedText = repairTrackedText(fileContent);
    const plainText = stripMarkdown(repairedText);
    const verseCount = verseCountBySurah.get(surahId) ?? 0;

    normalizedTafsir.push({
      surahId,
      fromAyah: 1,
      toAyah: verseCount,
      level: "surah",
      text: plainText,
      source: "elmalili",
      status: plainText === null ? "missing" : "available"
    });
  }

  normalizedTafsir.sort((left, right) => left.surahId - right.surahId);

  await Promise.all([
    writeDataJson([...normalizedDirectory, "arabic.json"], normalizedArabic),
    writeDataJson([...normalizedDirectory, "translations.json"], normalizedTranslations),
    writeDataJson([...normalizedDirectory, "tafsir.json"], normalizedTafsir),
    writeDataJson([...normalizedDirectory, "surah-meta.json"], normalizedSurahMeta)
  ]);

  return {
    arabicAyahCount: normalizedArabic.filter((record) => record.status === "available").length,
    translationAyahCount: normalizedTranslations.filter((record) => record.status === "available").length,
    translationSourceCount: translationFiles.length,
    tafsirRangeCount: normalizedTafsir.filter((record) => record.status === "available").length,
    encodingFixCount,
    transliterationStatus: ayahTransliterationByKey.size > 0 ? "available" : "missing",
    ayahLevelNuzulStatus: "missing"
  };
}
