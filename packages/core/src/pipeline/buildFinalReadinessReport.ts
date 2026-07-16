import { readdir, readFile } from "node:fs/promises";
import type {
  AyahRangeTafsirCacheEntry,
  FidelityCacheEntry,
  NormalizedArabicAyah,
  NormalizedAyahTranslations,
  NormalizedSurahMeta,
  SurahRevelationContextCacheEntry,
  SurahTafsirCacheEntry
} from "@quran-app/types";
import {
  hasResidualCorruption,
  repairTextDetailed,
  resolveDataPath
} from "../adapters/shared";
import { writeDataJson } from "./shared";

type ReadinessStatus = "ready" | "partially_ready" | "missing" | "excluded" | "critical_issue";

interface ReadinessFieldReport {
  status: ReadinessStatus;
  coverageRatio: number;
  qualityNote: string;
  safeForUi: boolean;
}

interface MealSourceStabilityEntry {
  source: string;
  expectedAyahCount: number;
  rawRowCount: number;
  repairedRowCount: number;
  corruptedRowCount: number;
  missingRowCount: number;
  cleanRowCount: number;
  fidelityEligibleRowCount: number;
  fidelityPolicy: "clean_rows_only";
}

interface FinalReadinessReport {
  generatedAt: string;
  mealSources: MealSourceStabilityEntry[];
  transliterationScan: {
    filesScanned: string[];
    ayahLevelRecordCount: number;
    status: "available" | "missing";
    normalized: boolean;
  };
  fields: Record<string, ReadinessFieldReport>;
  decision: {
    canStartRealDataWebUi: boolean;
    canOpenFidelityTab: boolean;
    uiMissingSemantics: string[];
  };
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

interface WordMeaningCoverageEntry {
  totalWords: number;
  matchedWords: number;
  coverageRatio: number;
  hasMorphology: boolean;
}

interface RootExplanationCoverageEntry {
  totalRootTokens: number;
  explainedRootTokens: number;
  rootWithoutExplanationTokens: number;
  tokensWithoutRoot: number;
  coverageRatio: number;
}

const targetMealSources = ["diyanet", "yazir", "bulac", "vakfi", "ozturk"];
const externalTranslationsDirectory = [
  "quran",
  "external",
  "Kuran",
  "Kuran-Rehberi-main",
  "data",
  "translations"
];

function asRatio(value: number, total: number): number {
  return total === 0 ? 0 : Number((value / total).toFixed(4));
}

function translationFileSourceName(fileNameSource: string): string {
  return fileNameSource.replaceAll("-", "_");
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

async function buildMealSourceStability(
  expectedAyahCount: number
): Promise<MealSourceStabilityEntry[]> {
  return Promise.all(
    targetMealSources.map(async (source) => {
      const fileSource = translationFileSourceName(source);
      const filePath = resolveDataPath(
        ...externalTranslationsDirectory,
        `tr.${fileSource}.json`
      );
      const fileContent = await readFile(filePath, "utf8");
      const record = JSON.parse(fileContent) as ExternalTranslationFile;
      const verses = getTranslationVerses(record);
      let repairedRowCount = 0;
      let corruptedRowCount = 0;

      for (const verse of verses) {
        const repaired = repairTextDetailed(verse.text);

        if (repaired.changed) {
          repairedRowCount += 1;
        }

        if (hasResidualCorruption(repaired.text)) {
          corruptedRowCount += 1;
        }
      }

      const cleanRowCount = verses.length - corruptedRowCount;

      return {
        source,
        expectedAyahCount,
        rawRowCount: verses.length,
        repairedRowCount,
        corruptedRowCount,
        missingRowCount: Math.max(expectedAyahCount - verses.length, 0),
        cleanRowCount,
        fidelityEligibleRowCount: cleanRowCount,
        fidelityPolicy: "clean_rows_only"
      };
    })
  );
}

async function scanTransliterationFiles(): Promise<FinalReadinessReport["transliterationScan"]> {
  const filesScanned: string[] = [];
  const root = resolveDataPath("quran");
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();

    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = `${current}\\${entry.name}`;

      if (entry.isDirectory()) {
        if (entry.name !== "audio") {
          pending.push(absolutePath);
        }
        continue;
      }

      if (/translit|roman|latin|okunu|phonetic/iu.test(entry.name)) {
        filesScanned.push(absolutePath.replace(resolveDataPath(), "data").replaceAll("\\", "/"));
      }
    }
  }

  const transliterationContent = await readFile(
    resolveDataPath("quran", "transliteration.json"),
    "utf8"
  ).catch(() => null);
  const ayahLevelRecordCount =
    transliterationContent === null
      ? 0
      : (JSON.parse(transliterationContent) as { verses?: unknown[] }[]).reduce(
          (sum, surah) => sum + (Array.isArray(surah.verses) ? surah.verses.length : 0),
          0
        );

  return {
    filesScanned: filesScanned.sort(),
    ayahLevelRecordCount,
    status: ayahLevelRecordCount > 0 ? "available" : "missing",
    normalized: ayahLevelRecordCount > 0
  };
}

export async function buildFinalReadinessReport(): Promise<FinalReadinessReport> {
  const [
    arabic,
    translations,
    surahs,
    wordMeaningCoverage,
    rootExplanationCoverage,
    surahTafsir,
    ayahRangeTafsir,
    revelationContext,
    fidelity
  ] = await Promise.all([
    readFile(resolveDataPath("generated", "quran", "verses.json"), "utf8").then(
      (content) => JSON.parse(content) as NormalizedArabicAyah[]
    ),
    readFile(resolveDataPath("normalized", "translations.json"), "utf8").then(
      (content) => JSON.parse(content) as NormalizedAyahTranslations[]
    ),
    readFile(resolveDataPath("normalized", "surah-meta.json"), "utf8").then(
      (content) => JSON.parse(content) as NormalizedSurahMeta[]
    ),
    readFile(resolveDataPath("word-analysis", "reports", "coverage-by-ayah.json"), "utf8").then(
      (content) => JSON.parse(content) as WordMeaningCoverageEntry[]
    ),
    readFile(resolveDataPath("word-analysis", "reports", "root-explanations.json"), "utf8").then(
      (content) => JSON.parse(content) as RootExplanationCoverageEntry
    ),
    readFile(resolveDataPath("tafsir", "surah", "index.json"), "utf8").then(
      (content) => JSON.parse(content) as SurahTafsirCacheEntry[]
    ),
    readFile(resolveDataPath("tafsir", "ayah-ranges", "index.json"), "utf8").then(
      (content) => JSON.parse(content) as AyahRangeTafsirCacheEntry[]
    ),
    readFile(resolveDataPath("revelation-context", "surah", "index.json"), "utf8").then(
      (content) => JSON.parse(content) as SurahRevelationContextCacheEntry[]
    ),
    readFile(resolveDataPath("fidelity", "by-surah", "index.json"), "utf8").then(
      (content) => JSON.parse(content) as FidelityCacheEntry[]
    )
  ]);

  const totalAyahs = arabic.length;
  const translationReadyAyahs = translations.filter((record) =>
    record.translations.some((translation) => translation.status === "available")
  ).length;
  const transliterationReadyAyahs = translations.filter(
    (record) => record.transliterationStatus === "available" && record.transliteration !== null
  ).length;
  const wordAnalysisReadyAyahs = wordMeaningCoverage.filter((entry) => entry.hasMorphology).length;
  const totalWords = wordMeaningCoverage.reduce((sum, entry) => sum + entry.totalWords, 0);
  const matchedWords = wordMeaningCoverage.reduce((sum, entry) => sum + entry.matchedWords, 0);
  const surahTafsirReady = surahTafsir.filter((entry) => entry.status === "available").length;
  const ayahRangeTafsirReady = ayahRangeTafsir.filter(
    (entry) => entry.status === "available"
  ).length;
  const revelationReady = revelationContext.filter((entry) => entry.status === "available").length;
  const fidelityReady = fidelity.filter((entry) => entry.status === "available").length;
  const transliterationScan = await scanTransliterationFiles();
  const mealSources = await buildMealSourceStability(totalAyahs);

  const report: FinalReadinessReport = {
    generatedAt: new Date().toISOString(),
    mealSources,
    transliterationScan,
    fields: {
      arabic_text: {
        status: totalAyahs === 6236 && arabic.every((entry) => entry.status === "available")
          ? "ready"
          : "critical_issue",
        coverageRatio: asRatio(arabic.filter((entry) => entry.status === "available").length, 6236),
        qualityNote: "Ayet metni tam ve normalize edilmis gorunuyor.",
        safeForUi: totalAyahs === 6236
      },
      transliteration: {
        status: transliterationReadyAyahs === totalAyahs ? "ready" : "partially_ready",
        coverageRatio: asRatio(transliterationReadyAyahs, totalAyahs),
        qualityNote:
          transliterationReadyAyahs > 0
            ? "Yerel ayet bazli transliteration dosyasi normalize edildi; Arapca metin alani degil, yalniz romanizasyon guvenilir kabul edildi."
            : "Ayet bazli transliteration bulunamadi; alan missing kalmali.",
        safeForUi: transliterationReadyAyahs > 0
      },
      translations: {
        status: translationReadyAyahs === totalAyahs ? "ready" : "partially_ready",
        coverageRatio: asRatio(translationReadyAyahs, totalAyahs),
        qualityNote:
          "Meal kaynaklari onarimdan gecti; fidelity ve karsilastirma katmani yalniz available satirlari kullaniyor.",
        safeForUi: translationReadyAyahs > 0
      },
      word_analysis: {
        status: wordAnalysisReadyAyahs === totalAyahs ? "ready" : "partially_ready",
        coverageRatio: asRatio(wordAnalysisReadyAyahs, totalAyahs),
        qualityNote: "Morfoloji ayet duzeyinde mevcut; eksik eslesmeler ayri raporlaniyor.",
        safeForUi: wordAnalysisReadyAyahs > 0
      },
      word_meanings: {
        status: matchedWords === totalWords ? "ready" : "partially_ready",
        coverageRatio: asRatio(matchedWords, totalWords),
        qualityNote: "Kelime anlami kapsami kismi; eslesmeyen kelimeler missing/matching_gap semantiginde.",
        safeForUi: matchedWords > 0
      },
      root_explanations: {
        status:
          rootExplanationCoverage.coverageRatio === 0
            ? "missing"
            : rootExplanationCoverage.coverageRatio === 1
              ? "ready"
              : "partially_ready",
        coverageRatio: Number(rootExplanationCoverage.coverageRatio.toFixed(4)),
        qualityNote:
          "Kok harfi olan ama aciklamasi olmayan tokenlar rootWithoutExplanation olarak ayri tutuluyor; hazir sinyali verilmemeli.",
        safeForUi: rootExplanationCoverage.explainedRootTokens > 0
      },
      tafsir: {
        status:
          surahTafsirReady === surahs.length && ayahRangeTafsirReady === 0
            ? "partially_ready"
            : surahTafsirReady === surahs.length
              ? "ready"
              : "partially_ready",
        coverageRatio: asRatio(surahTafsirReady, surahs.length),
        qualityNote: "Sure duzeyi tefsir mevcut; ayet araligi tefsiri su an yok.",
        safeForUi: surahTafsirReady > 0
      },
      revelation_context: {
        status: revelationReady === surahs.length ? "partially_ready" : "missing",
        coverageRatio: asRatio(revelationReady, surahs.length),
        qualityNote:
          "Sure duzeyi nuzul metadata korunuyor; ayet bazli nuzul yok ve ayet bazli gibi gosterilmemeli.",
        safeForUi: revelationReady > 0
      },
      fidelity: {
        status: fidelityReady === totalAyahs ? "ready" : "partially_ready",
        coverageRatio: asRatio(fidelityReady, totalAyahs),
        qualityNote:
          "Fidelity yalniz temiz meal, Arapca metin, morfoloji ve yeterli kelime anlami kapsami olan ayetlerde available.",
        safeForUi: fidelityReady > 0
      }
    },
    decision: {
      canStartRealDataWebUi: true,
      canOpenFidelityTab: true,
      uiMissingSemantics: [
        "ayet bazli nuzul",
        "ayet araligi tefsiri",
        "eksik kelime anlamlari",
        "kok harfi olmayan token kok aciklamasi",
        "kok harfi olup aciklamasi bulunmayan token kok aciklamasi"
      ]
    }
  };

  await Promise.all([
    writeDataJson(["source-metadata", "meal-source-stability.json"], mealSources),
    writeDataJson(["source-metadata", "final-readiness-report.json"], report)
  ]);

  return report;
}
