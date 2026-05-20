import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";

const testVerses = [
  { surahId: 1, ayahNumber: 5 },
  { surahId: 1, ayahNumber: 7 },
  { surahId: 2, ayahNumber: 7 },
  { surahId: 2, ayahNumber: 173 },
  { surahId: 112, ayahNumber: 1 }
] as const;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const snapshotPath = path.join(snapshotDirectory, "verse-analysis-context.sample.json");
const previewSnapshotPath = path.join(snapshotDirectory, "verse-analysis-preview.sample.json");
const coreDbSnapshotPath = path.join(snapshotDirectory, "verse-analysis-context.coredb.sample.json");
const coreDbPreviewSnapshotPath = path.join(snapshotDirectory, "verse-analysis-preview.coredb.sample.json");
const qualitySetSnapshotPath = path.join(
  snapshotDirectory,
  "verse-analysis-quality-set.sample.json"
);

function firstOrNone(values: string[]): string {
  return values[0] ?? "yok";
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function matchesAxisHint(axisLines: string[], hints: string[] | undefined): boolean | null {
  if (!hints || hints.length === 0) {
    return null;
  }

  const normalizedAxis = normalizeText(axisLines.join(" "));

  if (!normalizedAxis) {
    return false;
  }

  return hints.some((hint) => normalizedAxis.includes(normalizeText(hint)));
}

async function main(): Promise<void> {
  const jsonSnapshots = [];
  const jsonPreviews = [];
  const coreDbSnapshots = [];
  const coreDbPreviews = [];
  const qualitySetSnapshots = [];

  for (const verse of testVerses) {
    const jsonContext = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, { source: "json" });
    const coreDbContext = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, { source: "coreDb" });
    const jsonPreview = buildVerseAnalysisPreview(jsonContext);
    const coreDbPreview = buildVerseAnalysisPreview(coreDbContext);

    jsonSnapshots.push(jsonContext);
    jsonPreviews.push(jsonPreview);
    coreDbSnapshots.push(coreDbContext);
    coreDbPreviews.push(coreDbPreview);

    for (const [source, preview] of [
      ["json", jsonPreview],
      ["coreDb", coreDbPreview]
    ] as const) {
      console.log(JSON.stringify({
        source,
        verseKey: preview.verseKey,
        selectedProfile: preview.selectedProfile,
        mainMeaningAxisPreview: firstOrNone(preview.mainMeaningAxisPreview),
        keyTermsPreview: preview.keyTermsPreview,
        supportingKeyTermsPreview: preview.supportingKeyTermsPreview,
        translationDifferencesPreview: preview.translationDifferencesPreview,
        weakCorrespondencesPreview: preview.weakCorrespondencesPreview,
        keyTermsPreviewCount: preview.keyTermsPreview.length
      }, null, 2));
    }

    console.log(JSON.stringify({
      verseKey: jsonContext.verseKey,
      jsonWordCount: jsonContext.wordByWord.length,
      coreDbWordCount: coreDbContext.wordByWord.length,
      jsonTranslationCount: jsonContext.translations.length,
      coreDbTranslationCount: coreDbContext.translations.length,
      jsonKeyTermCount: jsonContext.keyTerms.length,
      coreDbKeyTermCount: coreDbContext.keyTerms.length,
      jsonWeakCorrespondenceCount: jsonContext.fidelitySignals.weakOrMissingCorrespondences.length,
      coreDbWeakCorrespondenceCount: coreDbContext.fidelitySignals.weakOrMissingCorrespondences.length
    }, null, 2));
  }

  for (const verse of verseAnalysisQualitySet) {
    const context = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, { source: "json" });
    const preview = buildVerseAnalysisPreview(context);
    const profileMatched = verse.expectedProfile
      ? preview.selectedProfile === verse.expectedProfile
      : null;
    const axisHintMatched = matchesAxisHint(
      preview.mainMeaningAxisPreview,
      verse.expectedAxisHint
    );
    const status =
      profileMatched === false || axisHintMatched === false
        ? "warn"
        : profileMatched === true || axisHintMatched === true
          ? "pass"
          : "observe";

    const qualitySnapshot = {
      verseKey: verse.verseKey,
      category: verse.category,
      source: "json" as const,
      expectedProfile: verse.expectedProfile ?? null,
      expectedAxisHint: verse.expectedAxisHint ?? [],
      shortNote: verse.shortNote,
      selectedProfile: preview.selectedProfile,
      mainMeaningAxisPreview: firstOrNone(preview.mainMeaningAxisPreview),
      keyTermsPreview: preview.keyTermsPreview,
      translationDifferencesPreview: preview.translationDifferencesPreview,
      weakCorrespondencesPreview: preview.weakCorrespondencesPreview,
      profileMatched,
      axisHintMatched,
      status
    };

    qualitySetSnapshots.push(qualitySnapshot);

    console.log(JSON.stringify(qualitySnapshot, null, 2));
  }

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(jsonSnapshots, null, 2)}\n`, "utf8");
  await writeFile(previewSnapshotPath, `${JSON.stringify(jsonPreviews, null, 2)}\n`, "utf8");
  await writeFile(coreDbSnapshotPath, `${JSON.stringify(coreDbSnapshots, null, 2)}\n`, "utf8");
  await writeFile(coreDbPreviewSnapshotPath, `${JSON.stringify(coreDbPreviews, null, 2)}\n`, "utf8");
  await writeFile(qualitySetSnapshotPath, `${JSON.stringify(qualitySetSnapshots, null, 2)}\n`, "utf8");

  const expectedProfileCount = qualitySetSnapshots.filter((entry) => entry.expectedProfile !== null).length;
  const expectedProfileMatchedCount = qualitySetSnapshots.filter((entry) => entry.profileMatched === true).length;
  const warnCount = qualitySetSnapshots.filter((entry) => entry.status === "warn").length;

  console.log(JSON.stringify({
    snapshotPath,
    previewSnapshotPath,
    coreDbSnapshotPath,
    coreDbPreviewSnapshotPath,
    qualitySetSnapshotPath,
    qualitySetSize: qualitySetSnapshots.length,
    expectedProfileCount,
    expectedProfileMatchedCount,
    warnCount
  }, null, 2));
}

main().catch((error) => {
  console.error("inspect-verse-analysis-context failed");
  console.error(error);
  process.exitCode = 1;
});
