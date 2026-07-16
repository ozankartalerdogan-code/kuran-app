import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVerseAnalysisContext,
  type VerseAnalysisContext
} from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";

type AuditSource = "json" | "v2" | "v3" | "v4";

type RiskType =
  | "preview_error"
  | "missing_axis"
  | "empty_key_terms"
  | "empty_translation_differences"
  | "empty_weak_correspondences"
  | "source_missing"
  | "overly_noisy_preview";

interface VerseSeed {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  status?: string;
}

interface AuditEntry {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  selectedProfile: string | null;
  mainMeaningAxisPreview: string[];
  keyTermsPreview: string[];
  translationDifferencesPreview: string[];
  weakCorrespondencesPreview: string[];
  sourceStatus: {
    available: string[];
    missing: string[];
  } | null;
  keyTermConfidenceSummary: Record<string, number>;
  visibleLowConfidenceKeyTerms: string[];
  coverageNotices: string[];
  actionableSourceMissing: string[];
  riskTypes: RiskType[];
  riskScore: number;
  emptyKeyTermsReason?: string;
  error?: string;
}

interface GlobalAuditOutput {
  generatedAt: string;
  durationMs: number;
  totalVerses: number;
  successfulPreviewCount: number;
  previewErrorCount: number;
  profileDistribution: Record<string, number>;
  emptyAxisCount: number;
  emptyKeyTermsCount: number;
  emptyTranslationDifferencesCount: number;
  emptyWeakCorrespondencesCount: number;
  sourceMissingCount: number;
  coverageNoticeCount: number;
  overlyNoisyPreviewCount: number;
  dominantProblemType: RiskType | null;
  sourceMissingSummary: Record<string, number>;
  coverageNoticeSummary: Record<string, number>;
  emptyKeyTermsByProfile: Record<string, { count: number; examples: string[] }>;
  emptyKeyTermsReasonSummary: Record<string, number>;
  keyTermConfidenceSummary: Record<string, number>;
  riskTypeCounts: Record<RiskType, number>;
  riskiestVerses: AuditEntry[];
  baseline?: {
    source: AuditSource;
    emptyKeyTermsCount: number;
  };
  keyTermComparison?: {
    baselineSource: AuditSource;
    comparedSource: AuditSource;
    baselineTotalVisibleKeyTerms: number;
    comparedTotalVisibleKeyTerms: number;
    increasedVerseCount: number;
    decreasedVerseCount: number;
    sameVerseCount: number;
    newlyFilledEmptyKeyTermsCount: number;
    becameEmptyKeyTermsCount: number;
    visibleKeyTermsDelta: number;
    visibleLowConfidenceKeyTermCount: number;
    examples: Array<{
      verseKey: string;
      baselineCount: number;
      comparedCount: number;
      addedTerms: string[];
      removedTerms: string[];
    }>;
    lowConfidenceExamples: Array<{
      verseKey: string;
      terms: string[];
    }>;
  };
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const defaultSnapshotPath = path.join(snapshotDirectory, "verse-analysis-global-audit.sample.json");
const defaultMarkdownPath = path.join(workspaceRoot, "docs", "KANITLI_ANALIZ_GLOBAL_AUDIT.md");
const v2Audit100Path = path.join(snapshotDirectory, "verse-analysis-v2-audit-100.json");
const v3Audit100Path = path.join(snapshotDirectory, "verse-analysis-v3-audit-100.json");
const v4Audit100Path = path.join(snapshotDirectory, "verse-analysis-v4-audit-100.json");
const arabicPath = path.join(workspaceRoot, "data", "generated", "quran", "verses.json");
const checkpointPath = path.join(snapshotDirectory, "verse-analysis-global-audit.checkpoint.json");

const riskWeights: Record<RiskType, number> = {
  preview_error: 100,
  missing_axis: 40,
  empty_key_terms: 24,
  empty_translation_differences: 10,
  empty_weak_correspondences: 4,
  source_missing: 8,
  overly_noisy_preview: 12
};

function firstLine(values: string[]): string {
  return values[0] ?? "yok";
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function sumRiskScore(riskTypes: RiskType[]): number {
  return riskTypes.reduce((total, risk) => total + riskWeights[risk], 0);
}

function isKnownCoverageNotice(value: string): boolean {
  const normalized = value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ç", "c");

  return normalized.includes("ayet bazli tefsir ozeti sinirli");
}

function splitSourceMissing(missing: string[]): {
  coverageNotices: string[];
  actionableSourceMissing: string[];
} {
  const coverageNotices: string[] = [];
  const actionableSourceMissing: string[] = [];

  for (const item of missing) {
    if (isKnownCoverageNotice(item)) {
      coverageNotices.push(item);
    } else {
      actionableSourceMissing.push(item);
    }
  }

  return { coverageNotices, actionableSourceMissing };
}

function describeEmptyKeyTermsReason(input: {
  selectedProfile: string | null;
  mainMeaningAxisPreview: string[];
  translationDifferencesPreview: string[];
  weakCorrespondencesPreview: string[];
}): string {
  if (!input.selectedProfile) {
    return "preview_error_or_missing_profile";
  }

  if (
    input.translationDifferencesPreview.length === 0 &&
    input.weakCorrespondencesPreview.length === 0
  ) {
    return "low_preview_signal_after_readability_filters";
  }

  if (input.selectedProfile === "genel_karma") {
    return "broad_profile_without_visible_core_terms";
  }

  if (input.mainMeaningAxisPreview.length > 0) {
    return "profile_detected_but_terms_filtered";
  }

  return "unknown";
}

function detectRisks(input: {
  mainMeaningAxisPreview: string[];
  keyTermsPreview: string[];
  translationDifferencesPreview: string[];
  weakCorrespondencesPreview: string[];
  sourceStatus: { available: string[]; missing: string[] };
}): RiskType[] {
  const risks: RiskType[] = [];
  const { actionableSourceMissing } = splitSourceMissing(input.sourceStatus.missing);

  if (input.mainMeaningAxisPreview.length === 0) {
    risks.push("missing_axis");
  }

  if (input.keyTermsPreview.length === 0) {
    risks.push("empty_key_terms");
  }

  if (input.translationDifferencesPreview.length === 0) {
    risks.push("empty_translation_differences");
  }

  if (input.weakCorrespondencesPreview.length === 0) {
    risks.push("empty_weak_correspondences");
  }

  if (actionableSourceMissing.length > 0) {
    risks.push("source_missing");
  }

  const totalPreviewItems =
    input.keyTermsPreview.length +
    input.translationDifferencesPreview.length +
    input.weakCorrespondencesPreview.length;
  const longestWeak = Math.max(...input.weakCorrespondencesPreview.map((item) => item.length), 0);

  if (
    input.keyTermsPreview.length > 5 ||
    input.translationDifferencesPreview.length > 2 ||
    input.weakCorrespondencesPreview.length > 3 ||
    totalPreviewItems > 9 ||
    longestWeak > 80
  ) {
    risks.push("overly_noisy_preview");
  }

  return risks;
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function parseLimit(): number | null {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) {
    return null;
  }

  const parsed = Number(limitArg.slice("--limit=".length));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function parseSource(): AuditSource {
  const sourceArg = process.argv.find((arg) => arg.startsWith("--source="));
  const source = sourceArg?.slice("--source=".length);
  if (source === "v3") {
    return "v3";
  }

  if (source === "v4") {
    return "v4";
  }

  return source === "v2" ? "v2" : "json";
}

function getOutputPaths(source: AuditSource): {
  snapshotPath: string;
  markdownPath: string | null;
} {
  if (source === "v2") {
    return {
      snapshotPath: v2Audit100Path,
      markdownPath: null
    };
  }

  if (source === "v3") {
    return {
      snapshotPath: v3Audit100Path,
      markdownPath: null
    };
  }

  if (source === "v4") {
    return {
      snapshotPath: v4Audit100Path,
      markdownPath: null
    };
  }

  return {
    snapshotPath: defaultSnapshotPath,
    markdownPath: defaultMarkdownPath
  };
}

function normalizeArabic(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[^\u0600-\u06FF]/gu, "");
}

function summarizeKeyTermConfidence(
  context: VerseAnalysisContext,
  keyTermsPreview: string[]
): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const term of keyTermsPreview) {
    const normalizedTerm = normalizeArabic(term);
    const matchedWord = context.wordByWord.find((word) => {
      if (!word.arabic) {
        return false;
      }

      const normalizedArabic = normalizeArabic(word.arabic);
      return normalizedArabic.length > 0 && normalizedTerm.includes(normalizedArabic);
    });
    increment(summary, matchedWord?.confidence ?? "unknown");
  }

  return summary;
}

function collectVisibleLowConfidenceKeyTerms(
  context: VerseAnalysisContext,
  keyTermsPreview: string[]
): string[] {
  const terms: string[] = [];

  for (const term of keyTermsPreview) {
    const normalizedTerm = normalizeArabic(term);
    const matchedWord = context.wordByWord.find((word) => {
      if (!word.arabic) {
        return false;
      }

      const normalizedArabic = normalizeArabic(word.arabic);
      return normalizedArabic.length > 0 && normalizedTerm.includes(normalizedArabic);
    });

    if (matchedWord?.confidence && matchedWord.confidence !== "medium" && matchedWord.confidence !== "high") {
      terms.push(term);
    }
  }

  return terms;
}

function compareKeyTerms(
  baselineEntries: AuditEntry[],
  comparedEntries: AuditEntry[],
  comparedSource: AuditSource
): GlobalAuditOutput["keyTermComparison"] {
  const baselineByVerse = new Map(baselineEntries.map((entry) => [entry.verseKey, entry]));
  const examples: NonNullable<GlobalAuditOutput["keyTermComparison"]>["examples"] = [];
  const lowConfidenceExamples: NonNullable<GlobalAuditOutput["keyTermComparison"]>["lowConfidenceExamples"] = [];
  let baselineTotalVisibleKeyTerms = 0;
  let comparedTotalVisibleKeyTerms = 0;
  let increasedVerseCount = 0;
  let decreasedVerseCount = 0;
  let sameVerseCount = 0;
  let newlyFilledEmptyKeyTermsCount = 0;
  let becameEmptyKeyTermsCount = 0;
  let visibleLowConfidenceKeyTermCount = 0;

  for (const comparedEntry of comparedEntries) {
    const baselineEntry = baselineByVerse.get(comparedEntry.verseKey);

    if (!baselineEntry) {
      continue;
    }

    const baselineCount = baselineEntry.keyTermsPreview.length;
    const comparedCount = comparedEntry.keyTermsPreview.length;
    baselineTotalVisibleKeyTerms += baselineCount;
    comparedTotalVisibleKeyTerms += comparedCount;

    if (comparedCount > baselineCount) {
      increasedVerseCount += 1;
    } else if (comparedCount < baselineCount) {
      decreasedVerseCount += 1;
    } else {
      sameVerseCount += 1;
    }

    if (baselineCount === 0 && comparedCount > 0) {
      newlyFilledEmptyKeyTermsCount += 1;
    }

    if (baselineCount > 0 && comparedCount === 0) {
      becameEmptyKeyTermsCount += 1;
    }

    const addedTerms = comparedEntry.keyTermsPreview.filter((term) => !baselineEntry.keyTermsPreview.includes(term));
    const removedTerms = baselineEntry.keyTermsPreview.filter((term) => !comparedEntry.keyTermsPreview.includes(term));

    if ((addedTerms.length > 0 || removedTerms.length > 0) && examples.length < 20) {
      examples.push({
        verseKey: comparedEntry.verseKey,
        baselineCount,
        comparedCount,
        addedTerms,
        removedTerms
      });
    }

    if (comparedEntry.visibleLowConfidenceKeyTerms.length > 0) {
      visibleLowConfidenceKeyTermCount += comparedEntry.visibleLowConfidenceKeyTerms.length;

      if (lowConfidenceExamples.length < 20) {
        lowConfidenceExamples.push({
          verseKey: comparedEntry.verseKey,
          terms: comparedEntry.visibleLowConfidenceKeyTerms
        });
      }
    }
  }

  return {
    baselineSource: "json",
    comparedSource,
    baselineTotalVisibleKeyTerms,
    comparedTotalVisibleKeyTerms,
    increasedVerseCount,
    decreasedVerseCount,
    sameVerseCount,
    newlyFilledEmptyKeyTermsCount,
    becameEmptyKeyTermsCount,
    visibleKeyTermsDelta: comparedTotalVisibleKeyTerms - baselineTotalVisibleKeyTerms,
    visibleLowConfidenceKeyTermCount,
    examples,
    lowConfidenceExamples
  };
}

function buildMarkdownReport(result: GlobalAuditOutput): string {
  const profileLines = Object.entries(result.profileDistribution)
    .sort((left, right) => right[1] - left[1])
    .map(([profile, count]) => `- \`${profile}\`: ${count}`)
    .join("\n");

  const sourceMissingLines = Object.entries(result.sourceMissingSummary)
    .sort((left, right) => right[1] - left[1])
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");

  const coverageNoticeLines = Object.entries(result.coverageNoticeSummary)
    .sort((left, right) => right[1] - left[1])
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");

  const emptyKeyTermsProfileLines = Object.entries(result.emptyKeyTermsByProfile)
    .sort((left, right) => right[1].count - left[1].count)
    .map(([profile, summary]) => {
      const examples = summary.examples.length > 0 ? ` | examples: ${summary.examples.join(", ")}` : "";
      return `- \`${profile}\`: ${summary.count}${examples}`;
    })
    .join("\n");

  const emptyKeyTermsReasonLines = Object.entries(result.emptyKeyTermsReasonSummary)
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => `- \`${reason}\`: ${count}`)
    .join("\n");

  const riskLines = Object.entries(result.riskTypeCounts)
    .sort((left, right) => right[1] - left[1])
    .map(([risk, count]) => `- \`${risk}\`: ${count}`)
    .join("\n");

  const riskiestLines = result.riskiestVerses.slice(0, 20).map((entry) => {
    const profile = entry.selectedProfile ?? "preview_error";
    const axis = firstLine(entry.mainMeaningAxisPreview);
    const risks = entry.riskTypes.join(", ");
    return `- \`${entry.verseKey}\` → \`${profile}\` | score: ${entry.riskScore} | risks: ${risks} | axis: ${truncate(axis, 120)}`;
  });

  return `# Kanitli Analiz Global Audit

- Toplam ayet: ${result.totalVerses}
- Basarili preview: ${result.successfulPreviewCount}
- Preview error: ${result.previewErrorCount}
- Empty axis: ${result.emptyAxisCount}
- Empty key terms: ${result.emptyKeyTermsCount}
- Empty translation differences: ${result.emptyTranslationDifferencesCount}
- Empty weak correspondences: ${result.emptyWeakCorrespondencesCount}
- Actionable source missing: ${result.sourceMissingCount}
- Coverage notices: ${result.coverageNoticeCount}
- Overly noisy preview: ${result.overlyNoisyPreviewCount}
- Dominant problem type: \`${result.dominantProblemType ?? "yok"}\`
- Sure: ${result.durationMs} ms

## Profile Dagilimi

${profileLines || "- yok"}

## Source Missing Ozet

${sourceMissingLines || "- yok"}

## Kapsam Notlari

${coverageNoticeLines || "- yok"}

## Empty Key Terms Profile Dagilimi

${emptyKeyTermsProfileLines || "- yok"}

## Empty Key Terms Sebep Ozeti

${emptyKeyTermsReasonLines || "- yok"}

## Risk Tipi Sayilari

${riskLines || "- yok"}

## En Riskli 20 Ayet

${riskiestLines.join("\n")}
`;
}

function emptyRiskTypeCounts(): Record<RiskType, number> {
  return {
    preview_error: 0,
    missing_axis: 0,
    empty_key_terms: 0,
    empty_translation_differences: 0,
    empty_weak_correspondences: 0,
    source_missing: 0,
    overly_noisy_preview: 0
  };
}

function summarizeEntries(
  entries: AuditEntry[],
  startedAt: number,
  baseline?: GlobalAuditOutput["baseline"],
  keyTermComparison?: GlobalAuditOutput["keyTermComparison"]
): GlobalAuditOutput {
  const profileDistribution: Record<string, number> = {};
  const sourceMissingSummary: Record<string, number> = {};
  const coverageNoticeSummary: Record<string, number> = {};
  const emptyKeyTermsByProfile: Record<string, { count: number; examples: string[] }> = {};
  const emptyKeyTermsReasonSummary: Record<string, number> = {};
  const keyTermConfidenceSummary: Record<string, number> = {};
  const riskTypeCounts = emptyRiskTypeCounts();

  for (const entry of entries) {
    if (entry.selectedProfile) {
      increment(profileDistribution, entry.selectedProfile);
    }

    for (const riskType of entry.riskTypes) {
      riskTypeCounts[riskType] += 1;
    }

    for (const missing of entry.actionableSourceMissing) {
      increment(sourceMissingSummary, missing);
    }

    for (const notice of entry.coverageNotices) {
      increment(coverageNoticeSummary, notice);
    }

    for (const [confidence, count] of Object.entries(entry.keyTermConfidenceSummary)) {
      keyTermConfidenceSummary[confidence] = (keyTermConfidenceSummary[confidence] ?? 0) + count;
    }

    if (entry.keyTermsPreview.length === 0 && !entry.error) {
      const profile = entry.selectedProfile ?? "unknown";
      emptyKeyTermsByProfile[profile] ??= { count: 0, examples: [] };
      emptyKeyTermsByProfile[profile].count += 1;

      if (emptyKeyTermsByProfile[profile].examples.length < 8) {
        emptyKeyTermsByProfile[profile].examples.push(entry.verseKey);
      }

      increment(emptyKeyTermsReasonSummary, entry.emptyKeyTermsReason ?? "unknown");
    }
  }

  const previewErrorCount = riskTypeCounts.preview_error;
  const successfulPreviewCount = entries.length - previewErrorCount;
  const dominantProblemType =
    (Object.entries(riskTypeCounts)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])[0]?.[0] as RiskType | undefined) ?? null;

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    totalVerses: entries.length,
    successfulPreviewCount,
    previewErrorCount,
    profileDistribution,
    emptyAxisCount: riskTypeCounts.missing_axis,
    emptyKeyTermsCount: riskTypeCounts.empty_key_terms,
    emptyTranslationDifferencesCount: riskTypeCounts.empty_translation_differences,
    emptyWeakCorrespondencesCount: riskTypeCounts.empty_weak_correspondences,
    sourceMissingCount: riskTypeCounts.source_missing,
    coverageNoticeCount: Object.values(coverageNoticeSummary).reduce((total, count) => total + count, 0),
    overlyNoisyPreviewCount: riskTypeCounts.overly_noisy_preview,
    dominantProblemType,
    sourceMissingSummary,
    coverageNoticeSummary,
    emptyKeyTermsByProfile,
    emptyKeyTermsReasonSummary,
    keyTermConfidenceSummary,
    riskTypeCounts,
    riskiestVerses: entries
      .filter((entry) => entry.riskTypes.length > 0)
      .sort((left, right) => right.riskScore - left.riskScore || left.verseKey.localeCompare(right.verseKey))
      .slice(0, 50),
    baseline,
    keyTermComparison
  };
}

async function writeAuditOutputs(
  result: GlobalAuditOutput,
  paths: { snapshotPath: string; markdownPath: string | null }
): Promise<void> {
  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(paths.snapshotPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  if (paths.markdownPath) {
    await writeFile(paths.markdownPath, `${buildMarkdownReport(result)}\n`, "utf8");
  }
}

async function writeCheckpoint(entries: AuditEntry[], startedAt: number): Promise<void> {
  const checkpoint = summarizeEntries(entries, startedAt);
  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
}

async function auditVerse(verse: VerseSeed, source: AuditSource): Promise<AuditEntry> {
  const verseKey = `${verse.surahId}:${verse.ayahNumber}`;

  try {
    const context = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
      source
    });
    const preview = buildVerseAnalysisPreview(context);
    const keyTermConfidenceSummary = summarizeKeyTermConfidence(context, preview.keyTermsPreview);
    const visibleLowConfidenceKeyTerms = collectVisibleLowConfidenceKeyTerms(context, preview.keyTermsPreview);
    const sourceSplit = splitSourceMissing(preview.sourceStatus.missing);
    const riskTypes = detectRisks({
      mainMeaningAxisPreview: preview.mainMeaningAxisPreview,
      keyTermsPreview: preview.keyTermsPreview,
      translationDifferencesPreview: preview.translationDifferencesPreview,
      weakCorrespondencesPreview: preview.weakCorrespondencesPreview,
      sourceStatus: preview.sourceStatus
    });

    return {
      verseKey,
      surahId: verse.surahId,
      ayahNumber: verse.ayahNumber,
      selectedProfile: preview.selectedProfile,
      mainMeaningAxisPreview: preview.mainMeaningAxisPreview,
      keyTermsPreview: preview.keyTermsPreview,
      translationDifferencesPreview: preview.translationDifferencesPreview,
      weakCorrespondencesPreview: preview.weakCorrespondencesPreview,
      sourceStatus: preview.sourceStatus,
      keyTermConfidenceSummary,
      visibleLowConfidenceKeyTerms,
      coverageNotices: sourceSplit.coverageNotices,
      actionableSourceMissing: sourceSplit.actionableSourceMissing,
      riskTypes,
      riskScore: sumRiskScore(riskTypes),
      emptyKeyTermsReason:
        preview.keyTermsPreview.length === 0
          ? describeEmptyKeyTermsReason({
              selectedProfile: preview.selectedProfile,
              mainMeaningAxisPreview: preview.mainMeaningAxisPreview,
              translationDifferencesPreview: preview.translationDifferencesPreview,
              weakCorrespondencesPreview: preview.weakCorrespondencesPreview
            })
          : undefined
    };
  } catch (error) {
    return {
      verseKey,
      surahId: verse.surahId,
      ayahNumber: verse.ayahNumber,
      selectedProfile: null,
      mainMeaningAxisPreview: [],
      keyTermsPreview: [],
      translationDifferencesPreview: [],
      weakCorrespondencesPreview: [],
      sourceStatus: null,
      keyTermConfidenceSummary: {},
      visibleLowConfidenceKeyTerms: [],
      coverageNotices: [],
      actionableSourceMissing: [],
      riskTypes: ["preview_error"],
      riskScore: sumRiskScore(["preview_error"]),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const source = parseSource();
  const outputPaths = getOutputPaths(source);
  const allVerseSeeds = JSON.parse(await readFile(arabicPath, "utf8")) as VerseSeed[];
  const limit = parseLimit();
  const verseSeeds = limit === null ? allVerseSeeds : allVerseSeeds.slice(0, limit);
  const entries: AuditEntry[] = [];
  let baseline: GlobalAuditOutput["baseline"] | undefined;
  let baselineEntries: AuditEntry[] = [];

  if (source === "v2" || source === "v3" || source === "v4") {
    const baselineStartedAt = Date.now();
    for (const verseSeed of verseSeeds) {
      baselineEntries.push(await auditVerse(verseSeed, "json"));
    }

    const baselineSummary = summarizeEntries(baselineEntries, baselineStartedAt);
    baseline = {
      source: "json",
      emptyKeyTermsCount: baselineSummary.emptyKeyTermsCount
    };
  }

  for (let index = 0; index < verseSeeds.length; index += 1) {
    entries.push(await auditVerse(verseSeeds[index], source));

    if ((index + 1) % 100 === 0 || index + 1 === verseSeeds.length) {
      console.log(JSON.stringify({
        processed: index + 1,
        total: verseSeeds.length,
        durationMs: Date.now() - startedAt
      }));
    }

    if ((index + 1) % 250 === 0 || index + 1 === verseSeeds.length) {
      await writeCheckpoint(entries, startedAt);
    }
  }

  const keyTermComparison =
    baselineEntries.length > 0 ? compareKeyTerms(baselineEntries, entries, source) : undefined;
  const result = summarizeEntries(entries, startedAt, baseline, keyTermComparison);
  await writeAuditOutputs(result, outputPaths);

  console.log(
    JSON.stringify(
      {
        source,
        snapshotPath: outputPaths.snapshotPath,
        markdownPath: outputPaths.markdownPath,
        totalVerses: result.totalVerses,
        successfulPreviewCount: result.successfulPreviewCount,
        previewErrorCount: result.previewErrorCount,
        profileDistribution: result.profileDistribution,
        emptyAxisCount: result.emptyAxisCount,
        emptyKeyTermsCount: result.emptyKeyTermsCount,
        emptyTranslationDifferencesCount: result.emptyTranslationDifferencesCount,
        emptyWeakCorrespondencesCount: result.emptyWeakCorrespondencesCount,
        sourceMissingCount: result.sourceMissingCount,
        coverageNoticeCount: result.coverageNoticeCount,
        overlyNoisyPreviewCount: result.overlyNoisyPreviewCount,
        dominantProblemType: result.dominantProblemType,
        emptyKeyTermsByProfile: result.emptyKeyTermsByProfile,
        emptyKeyTermsReasonSummary: result.emptyKeyTermsReasonSummary,
        keyTermConfidenceSummary: result.keyTermConfidenceSummary,
        baseline: result.baseline,
        keyTermComparison: result.keyTermComparison,
        durationMs: result.durationMs,
        riskiestVerseKeys: result.riskiestVerses.slice(0, 20).map((entry) => ({
          verseKey: entry.verseKey,
          selectedProfile: entry.selectedProfile,
          riskTypes: entry.riskTypes,
          riskScore: entry.riskScore
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("audit-verse-analysis-global failed");
  console.error(error);
  process.exitCode = 1;
});
