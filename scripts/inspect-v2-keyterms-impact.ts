import { buildVerseAnalysisContext, type VerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";

type SourceName = "json" | "v2";

interface SourceResult {
  source: SourceName;
  verseKey: string;
  keyTermsPreview: string[];
  confidenceCounts: Record<string, number>;
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function normalizeArabic(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[^\u0600-\u06FF]/gu, "");
}

function summarizeVisibleKeyTermConfidence(
  context: VerseAnalysisContext,
  keyTermsPreview: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const term of keyTermsPreview) {
    const normalizedTerm = normalizeArabic(term);
    const word = context.wordByWord.find((entry) => {
      if (!entry.arabic) {
        return false;
      }

      const normalizedArabic = normalizeArabic(entry.arabic);
      return normalizedArabic.length > 0 && normalizedTerm.includes(normalizedArabic);
    });
    increment(counts, word?.confidence ?? "unknown");
  }

  return counts;
}

async function buildSourceResult(
  surahId: number,
  ayahNumber: number,
  source: SourceName
): Promise<SourceResult> {
  const context = await buildVerseAnalysisContext(surahId, ayahNumber, { source });
  const preview = buildVerseAnalysisPreview(context);

  return {
    source,
    verseKey: context.verseKey,
    keyTermsPreview: preview.keyTermsPreview,
    confidenceCounts: summarizeVisibleKeyTermConfidence(context, preview.keyTermsPreview)
  };
}

function formatConfidenceSummary(counts: Record<string, number>): string {
  const ordered = ["medium", "low-enriched", "low", "missing", "unknown"];
  return ordered
    .filter((key) => counts[key] > 0)
    .map((key) => `${key}:${counts[key]}`)
    .join(", ") || "-";
}

function warningFor(result: SourceResult): string {
  const warnings: string[] = [];

  if ((result.confidenceCounts["low-enriched"] ?? 0) > 0) {
    warnings.push("low-enriched-visible");
  }

  if ((result.confidenceCounts.missing ?? 0) > 0) {
    warnings.push("missing-visible");
  }

  return warnings.join(", ") || "-";
}

async function main(): Promise<void> {
  const rows: Array<{
    verseKey: string;
    oldCount: number;
    newCount: number;
    diff: number;
    warning: string;
    oldTerms: string[];
    newTerms: string[];
    newConfidence: Record<string, number>;
  }> = [];
  const totalConfidence: Record<string, number> = {};

  for (const qualityCase of verseAnalysisQualitySet) {
    const [oldResult, newResult] = await Promise.all([
      buildSourceResult(qualityCase.surahId, qualityCase.ayahNumber, "json"),
      buildSourceResult(qualityCase.surahId, qualityCase.ayahNumber, "v2")
    ]);

    for (const [confidence, count] of Object.entries(newResult.confidenceCounts)) {
      totalConfidence[confidence] = (totalConfidence[confidence] ?? 0) + count;
    }

    rows.push({
      verseKey: qualityCase.verseKey,
      oldCount: oldResult.keyTermsPreview.length,
      newCount: newResult.keyTermsPreview.length,
      diff: newResult.keyTermsPreview.length - oldResult.keyTermsPreview.length,
      warning: warningFor(newResult),
      oldTerms: oldResult.keyTermsPreview,
      newTerms: newResult.keyTermsPreview,
      newConfidence: newResult.confidenceCounts
    });
  }

  const oldEmpty = rows.filter((row) => row.oldCount === 0).length;
  const newEmpty = rows.filter((row) => row.newCount === 0).length;
  const filled = rows.filter((row) => row.oldCount === 0 && row.newCount > 0).length;

  console.log("| verseKey | old keyTerms | v2 keyTerms | diff | v2 confidence | warning |");
  console.log("|---|---:|---:|---:|---|---|");

  for (const row of rows) {
    console.log(
      `| ${row.verseKey} | ${row.oldCount} | ${row.newCount} | ${row.diff >= 0 ? "+" : ""}${row.diff} | ${formatConfidenceSummary(row.newConfidence)} | ${row.warning} |`
    );
  }

  console.log(
    JSON.stringify(
      {
        comparedVerseCount: rows.length,
        oldEmptyKeyTerms: oldEmpty,
        v2EmptyKeyTerms: newEmpty,
        filledEmptyKeyTerms: filled,
        v2LowEnrichedVisibleTerms: totalConfidence["low-enriched"] ?? 0,
        v2MissingVisibleTerms: totalConfidence.missing ?? 0,
        v2ConfidenceSummary: totalConfidence,
        changedVerses: rows
          .filter((row) => row.diff !== 0 || row.warning !== "-")
          .map((row) => ({
            verseKey: row.verseKey,
            oldKeyTerms: row.oldTerms,
            v2KeyTerms: row.newTerms,
            warning: row.warning
          }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("inspect-v2-keyterms-impact failed");
  console.error(error);
  process.exitCode = 1;
});
