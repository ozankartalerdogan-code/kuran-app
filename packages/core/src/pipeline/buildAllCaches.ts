import { buildAyahRangeTafsirCaches } from "./buildAyahRangeCaches";
import { auditNormalizedCaches } from "./auditNormalizedCaches";
import { buildCoverageReport } from "./buildCoverageReport";
import { buildFinalReadinessReport } from "./buildFinalReadinessReport";
import { buildMealComparisonCaches } from "./buildMealComparisonCaches";
import { buildNormalizedCaches } from "./buildNormalizedCaches";
import { buildSurahLevelCaches } from "./buildSurahCaches";
import { buildWordAnalysisReports } from "./buildWordAnalysisReports";
import { writeDataJson } from "./shared";

export async function buildAllCaches(): Promise<void> {
  const normalizationReport = await buildNormalizedCaches();
  await writeDataJson(["source-metadata", "normalized-report.json"], normalizationReport);
  await buildSurahLevelCaches();
  await buildAyahRangeTafsirCaches();
  await buildMealComparisonCaches();
  await buildWordAnalysisReports();
  await buildCoverageReport();
  await auditNormalizedCaches();
  await buildFinalReadinessReport();
}
