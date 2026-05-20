import type {
  EncodingAuditIssue,
  EncodingAuditReport,
  EncodingIssueType,
  NormalizedArabicAyah,
  NormalizedAyahTranslations,
  NormalizedSurahMeta,
  NormalizedTafsirRange
} from "@quran-app/types";
import { debugLog, readJsonFile } from "../adapters/shared";
import { writeDataJson } from "./shared";

const mojibakePattern = /(?:Ã.|Å.|Ä.|Ø.|Ù.|Ð.|Ñ.)/u;
const replacementPattern = /\uFFFD/u;
const controlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const arabicPattern = /[\u0600-\u06FF]/u;
const latinPattern = /[A-Za-z]/u;

function createIssue(
  source: string,
  surahId: number | null,
  ayahNumber: number | null,
  issueType: EncodingIssueType,
  excerpt: string | null
): EncodingAuditIssue {
  return {
    source,
    surahId,
    ayahNumber,
    issueType,
    autoFixed: false,
    requiresManualReview: true,
    excerpt
  };
}

function getExcerpt(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return value.slice(0, 160);
}

function pushStringIssues(
  issues: EncodingAuditIssue[],
  source: string,
  surahId: number | null,
  ayahNumber: number | null,
  value: string | null
): void {
  if (value === null) {
    return;
  }

  const excerpt = getExcerpt(value);

  if (mojibakePattern.test(value)) {
    issues.push(createIssue(source, surahId, ayahNumber, "mojibake", excerpt));
  }

  if (replacementPattern.test(value)) {
    issues.push(createIssue(source, surahId, ayahNumber, "replacement_character", excerpt));
  }

  if (controlCharacterPattern.test(value)) {
    issues.push(createIssue(source, surahId, ayahNumber, "control_character", excerpt));
  }

  if (arabicPattern.test(value) && latinPattern.test(value)) {
    issues.push(createIssue(source, surahId, ayahNumber, "arabic_latin_mix", excerpt));
  }
}

export async function auditNormalizedCaches(): Promise<EncodingAuditReport> {
  const [arabic, translations, tafsir, surahMeta] = await Promise.all([
    readJsonFile<NormalizedArabicAyah[]>("normalized", "arabic.json"),
    readJsonFile<NormalizedAyahTranslations[]>("normalized", "translations.json"),
    readJsonFile<NormalizedTafsirRange[]>("normalized", "tafsir.json"),
    readJsonFile<NormalizedSurahMeta[]>("normalized", "surah-meta.json")
  ]);

  const issues: EncodingAuditIssue[] = [];

  for (const record of arabic) {
    pushStringIssues(issues, "arabic", record.surahId, record.ayahNumber, record.arabicText);
  }

  for (const record of translations) {
    for (const translation of record.translations) {
      pushStringIssues(
        issues,
        `translation:${translation.source}`,
        record.surahId,
        record.ayahNumber,
        translation.text
      );
    }
  }

  for (const record of tafsir) {
    pushStringIssues(issues, "tafsir:elmalili", record.surahId, record.fromAyah, record.text);
  }

  for (const record of surahMeta) {
    pushStringIssues(issues, "surah-meta:turkishName", record.surahId, null, record.turkishName);
    pushStringIssues(issues, "surah-meta:arabicName", record.surahId, null, record.arabicName);
  }

  const report: EncodingAuditReport = {
    generatedAt: new Date().toISOString(),
    filesScanned: [
      "data/normalized/arabic.json",
      "data/normalized/translations.json",
      "data/normalized/tafsir.json",
      "data/normalized/surah-meta.json"
    ],
    issueCount: issues.length,
    issues
  };

  debugLog("encoding-audit", "Normalized cache audit completed", {
    issueCount: report.issueCount
  });

  await writeDataJson(["source-metadata", "encoding-audit.json"], report);

  return report;
}
