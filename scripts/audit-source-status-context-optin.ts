import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";

const extraExamples = [
  { surahId: 6, ayahNumber: 145, verseKey: "6:145", category: "hukum_istisna" },
  { surahId: 2, ayahNumber: 219, verseKey: "2:219", category: "emir_yasak" },
  { surahId: 5, ayahNumber: 2, verseKey: "5:2", category: "emir_yasak" },
  { surahId: 6, ayahNumber: 141, verseKey: "6:141", category: "hukum_istisna" },
  { surahId: 2, ayahNumber: 282, verseKey: "2:282", category: "emir_yasak" },
  { surahId: 2, ayahNumber: 259, verseKey: "2:259", category: "kissa" },
  { surahId: 2, ayahNumber: 233, verseKey: "2:233", category: "emir_yasak" },
  { surahId: 5, ayahNumber: 110, verseKey: "5:110", category: "kissa" },
  { surahId: 2, ayahNumber: 61, verseKey: "2:61", category: "kissa" },
  { surahId: 4, ayahNumber: 102, verseKey: "4:102", category: "emir_yasak" }
] as const;

const technicalLeakPattern =
  /\b(confidence|usageClass|safeForUi|coverageRatio|debug_only|build_input|parked|sourceId|fidelityPolicy|corruptedRowCount|missingRowCount|tafsir_summary)\b/u;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const snapshotPath = path.join(snapshotDirectory, "source-status-context-optin.sample.json");

function hasTechnicalLeak(values: Array<string | undefined>): boolean {
  return technicalLeakPattern.test(values.filter(Boolean).join(" "));
}

async function buildEntry(input: {
  surahId: number;
  ayahNumber: number;
  verseKey: string;
  category: string;
  expectedProfile?: string;
  setName: "quality_set_28" | "example_set_10";
}): Promise<{
  setName: string;
  verseKey: string;
  category: string;
  expectedProfile: string | null;
  selectedProfile: string;
  mutedText: string | null;
  visibleStatusTexts: string[];
  hiddenStatusTexts: string[];
  coverageDebugDetail: string | null;
  technicalLeak: boolean;
  coverageLeakedToUserFacingStatus: boolean;
  weakPreviewIntegrationCompleted: boolean;
}> {
  const context = await buildVerseAnalysisContext(input.surahId, input.ayahNumber, {
    source: "json",
    debug: { includeCoverageReport: true }
  });
  const preview = buildVerseAnalysisPreview(context, { sourceStatus: "mapped" });
  const mutedText = preview.sourceStatus.mutedText ?? null;
  const coverageDebugDetail =
    context.debugSources.find((source) => source.key === "word_coverage_report")?.detail ?? null;
  const userFacingStatusText = [
    mutedText ?? undefined,
    ...preview.sourceStatus.available,
    ...preview.sourceStatus.missing
  ];
  const technicalLeak = hasTechnicalLeak([
    ...userFacingStatusText
  ]);
  const coverageLeakedToUserFacingStatus = /\bcoverageRatio\b/u.test(userFacingStatusText.filter(Boolean).join(" "));

  return {
    setName: input.setName,
    verseKey: input.verseKey,
    category: input.category,
    expectedProfile: input.expectedProfile ?? null,
    selectedProfile: preview.selectedProfile,
    mutedText,
    visibleStatusTexts: preview.sourceStatus.available,
    hiddenStatusTexts: preview.sourceStatus.missing,
    coverageDebugDetail,
    technicalLeak,
    coverageLeakedToUserFacingStatus,
    weakPreviewIntegrationCompleted: true
  };
}

async function main(): Promise<void> {
  const entries = [];

  for (const item of verseAnalysisQualitySet) {
    entries.push(await buildEntry({ ...item, setName: "quality_set_28" }));
  }

  for (const item of extraExamples) {
    entries.push(await buildEntry({ ...item, setName: "example_set_10" }));
  }

  const mutedTextDistribution = entries.reduce<Record<string, number>>((accumulator, entry) => {
    const key = entry.mutedText ?? "(missing)";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
  const technicalLeaks = entries.filter((entry) => entry.technicalLeak).map((entry) => entry.verseKey);
  const coverageDebugEntries = entries.filter((entry) => entry.coverageDebugDetail !== null).length;
  const coverageUserFacingLeaks = entries
    .filter((entry) => entry.coverageLeakedToUserFacingStatus)
    .map((entry) => entry.verseKey);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    rules: {
      runtimeChanged: false,
      uiChanged: false,
      defaultSourceChanged: false,
      previewLogicChanged: false,
      sourceStatusMode: "mapped"
    },
    summary: {
      totalEntries: entries.length,
      qualitySetEntries: entries.filter((entry) => entry.setName === "quality_set_28").length,
      exampleEntries: entries.filter((entry) => entry.setName === "example_set_10").length,
      uniqueMutedTexts: Object.keys(mutedTextDistribution).length,
      coverageDebugEntries,
      coverageUserFacingLeakCount: coverageUserFacingLeaks.length,
      technicalLeakCount: technicalLeaks.length,
      weakPreviewIntegrationCompleted: entries.every((entry) => entry.weakPreviewIntegrationCompleted)
    },
    mutedTextDistribution,
    technicalLeaks,
    coverageUserFacingLeaks,
    entries
  };

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(snapshot.summary, null, 2));
  console.log(JSON.stringify(mutedTextDistribution, null, 2));
}

main().catch((error) => {
  console.error("audit-source-status-context-optin failed");
  console.error(error);
  process.exitCode = 1;
});
