import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { selectVerseAnalysisProfile } from "../packages/core/src/analysis/verseAnalysisDecision.ts";
import {
  buildVerseAnalysisEvidenceLayer,
  type RootEasyOnlyEntry
} from "../packages/core/src/analysis/verseAnalysisEvidenceLayer.ts";
import { classifyEvidenceConflict } from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";

interface ArabicVerse {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
}

interface CandidateRow {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  primaryTranslation: string;
  currentProfile: string;
  conflictCount: number;
  needsManualReviewCount: number;
  riskyDropCount: number;
  rootExplanationNeeded: boolean;
  topKeyTerms: string;
  topRoots: string;
  topLemmas: string;
  weakCorrespondenceSummary: string;
  evidenceSummary: string;
  suggestedRequiredConcepts: string;
  suggestedSuppressedTerms: string;
  suggestedProfileBoundTerms: string;
  reviewStatus: "draft";
  curator: string;
  note: string;
  sourceTrace: string;
  score: number;
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const arabicPath = path.join(workspaceRoot, "data", "normalized", "arabic.json");
const rootEasyOnlyPath = path.join(
  workspaceRoot,
  "data2",
  "processed",
  "root_explanations_tr_v2_easy_only.json"
);
const outputPath = path.join(
  workspaceRoot,
  "data",
  "curation",
  "ayah_curation_overlay_400_candidates.csv"
);

function verseKeyOf(surahId: number, ayahNumber: number): string {
  return `${surahId}:${ayahNumber}`;
}

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function truncateList(values: string[], limit: number): string {
  return unique(values).slice(0, limit).join("; ");
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\r\n]/u.test(text)) {
    return `"${text.replace(/"/gu, '""')}"`;
  }
  return text;
}

function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    return typeof text === "string" ? text : "";
  }

  return "";
}

function evidenceSummary(input: {
  totalItems: number;
  userFacingAllowedCount: number;
  sourceSupportTwoPlusCount: number;
  conflictCount: number;
  needsManualReviewCount: number;
  riskyDropCount: number;
}): string {
  return [
    `items=${input.totalItems}`,
    `userFacing=${input.userFacingAllowedCount}`,
    `support2Plus=${input.sourceSupportTwoPlusCount}`,
    `conflicts=${input.conflictCount}`,
    `manual=${input.needsManualReviewCount}`,
    `riskyDrop=${input.riskyDropCount}`
  ].join("; ");
}

function suggestedConcepts(profile: string, keyTerms: string[], riskyTerms: string[]): string {
  return truncateList([...keyTerms, ...riskyTerms, profile.replace(/_/gu, " ")], 8);
}

function sourceTrace(input: {
  qualitySetIncluded: boolean;
  conflictCount: number;
  needsManualReviewCount: number;
  riskyDropCount: number;
  rootExplanationNeeded: boolean;
  profile: string;
}): string {
  const traces = ["vnext_evidence_global_scan"];
  if (input.qualitySetIncluded) traces.push("quality_set");
  if (input.conflictCount > 0) traces.push("conflictAffected");
  if (input.needsManualReviewCount > 0) traces.push("needsManualReview");
  if (input.riskyDropCount > 0) traces.push("riskyDrop");
  if (input.rootExplanationNeeded) traces.push("rootExplanationNeeded");
  traces.push(`profile:${input.profile}`);
  return traces.join("; ");
}

async function main(): Promise<void> {
  const [arabicVerses, rootEasyOnly] = await Promise.all([
    readFile(arabicPath, "utf8").then((content) => JSON.parse(content) as ArabicVerse[]),
    readFile(rootEasyOnlyPath, "utf8").then((content) => JSON.parse(content) as RootEasyOnlyEntry[])
  ]);

  const qualitySetKeys = new Set(verseAnalysisQualitySet.map((item) => item.verseKey));
  const candidates: CandidateRow[] = [];
  const startedAt = Date.now();

  for (let index = 0; index < arabicVerses.length; index += 1) {
    const verse = arabicVerses[index];
    const verseKey = verseKeyOf(verse.surahId, verse.ayahNumber);

    const [context, v4Context] = await Promise.all([
      buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
        source: "json",
        debug: { includeCoverageReport: true }
      }),
      buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
        source: "v4",
        debug: { includeCoverageReport: true }
      })
    ]);

    const evidenceLayer = buildVerseAnalysisEvidenceLayer(context, {
      v4Context,
      rootEasyOnly
    });
    const profile = evidenceLayer.selectedProfile || selectVerseAnalysisProfile(context).profile;
    const conflicts = evidenceLayer.items.flatMap((item) =>
      item.conflictFlags.map((conflict) => ({
        item,
        conflict,
        qualityClass: classifyEvidenceConflict({
          conflictType: conflict.type,
          value: item.value,
          selectedProfile: profile
        }).qualityClass
      }))
    );

    const needsManualReviewConflicts = conflicts.filter(
      (entry) => entry.qualityClass === "needsManualReview"
    );
    const riskyDropConflicts = conflicts.filter((entry) => entry.qualityClass === "likelyRiskyDrop");
    const rootCount = evidenceLayer.summary.kindDistribution.root;
    const rootExplanationCount = evidenceLayer.summary.kindDistribution.rootExplanation;
    const rootExplanationNeeded = rootCount > 0 && rootExplanationCount < rootCount;
    const qualitySetIncluded = qualitySetKeys.has(verseKey);

    const keyTerms = evidenceLayer.items
      .filter((item) => item.kind === "keyTerm" && item.userFacingAllowed)
      .map((item) => displayValue(item.value));
    const roots = evidenceLayer.items
      .filter((item) => item.kind === "root")
      .map((item) => displayValue(item.value));
    const lemmas = evidenceLayer.items
      .filter((item) => item.kind === "lemma")
      .map((item) => displayValue(item.value));
    const weakTerms = evidenceLayer.items
      .filter((item) => item.kind === "weakCorrespondence")
      .map((item) => displayValue(item.value));
    const suggestedSuppressedTerms = conflicts
      .filter((entry) => entry.qualityClass === "genericNeutral")
      .map((entry) => displayValue(entry.item.value));
    const suggestedProfileBoundTerms = conflicts
      .filter((entry) => entry.qualityClass === "needsManualReview")
      .map((entry) => displayValue(entry.item.value));
    const riskyTerms = riskyDropConflicts.map((entry) => displayValue(entry.item.value));

    const score =
      (qualitySetIncluded ? 10_000 : 0) +
      conflicts.length * 10 +
      needsManualReviewConflicts.length * 25 +
      riskyDropConflicts.length * 40 +
      (rootExplanationNeeded ? 20 : 0) +
      evidenceLayer.summary.sourceSupportTwoPlusCount;

    candidates.push({
      verseKey,
      surahId: verse.surahId,
      ayahNumber: verse.ayahNumber,
      arabicText: context.arabicText,
      primaryTranslation: textValue(context.primaryTranslation),
      currentProfile: profile,
      conflictCount: conflicts.length,
      needsManualReviewCount: needsManualReviewConflicts.length,
      riskyDropCount: riskyDropConflicts.length,
      rootExplanationNeeded,
      topKeyTerms: truncateList(keyTerms, 8),
      topRoots: truncateList(roots, 8),
      topLemmas: truncateList(lemmas, 8),
      weakCorrespondenceSummary: truncateList(weakTerms, 6),
      evidenceSummary: evidenceSummary({
        totalItems: evidenceLayer.summary.totalItems,
        userFacingAllowedCount: evidenceLayer.summary.userFacingAllowedCount,
        sourceSupportTwoPlusCount: evidenceLayer.summary.sourceSupportTwoPlusCount,
        conflictCount: conflicts.length,
        needsManualReviewCount: needsManualReviewConflicts.length,
        riskyDropCount: riskyDropConflicts.length
      }),
      suggestedRequiredConcepts: suggestedConcepts(profile, keyTerms, riskyTerms),
      suggestedSuppressedTerms: truncateList(suggestedSuppressedTerms, 8),
      suggestedProfileBoundTerms: truncateList(suggestedProfileBoundTerms, 8),
      reviewStatus: "draft",
      curator: "",
      note: "",
      sourceTrace: sourceTrace({
        qualitySetIncluded,
        conflictCount: conflicts.length,
        needsManualReviewCount: needsManualReviewConflicts.length,
        riskyDropCount: riskyDropConflicts.length,
        rootExplanationNeeded,
        profile
      }),
      score
    });

    if ((index + 1) % 250 === 0 || index + 1 === arabicVerses.length) {
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(`scanned ${index + 1}/${arabicVerses.length} ayahs in ${elapsedSeconds}s`);
    }
  }

  const byVerseKey = new Map(candidates.map((candidate) => [candidate.verseKey, candidate]));
  const selected = new Map<string, CandidateRow>();

  for (const qualityCase of verseAnalysisQualitySet) {
    const candidate = byVerseKey.get(qualityCase.verseKey);
    if (candidate) selected.set(candidate.verseKey, candidate);
  }

  const profiles = unique(candidates.map((candidate) => candidate.currentProfile));
  const profileMinimum = 20;
  for (const profile of profiles) {
    const profileCandidates = candidates
      .filter((candidate) => candidate.currentProfile === profile)
      .sort((left, right) => right.score - left.score);
    for (const candidate of profileCandidates.slice(0, profileMinimum)) {
      selected.set(candidate.verseKey, candidate);
    }
  }

  const highRiskCandidates = [...candidates].sort((left, right) => right.score - left.score);
  for (const candidate of highRiskCandidates) {
    if (selected.size >= 400) break;
    selected.set(candidate.verseKey, candidate);
  }

  const rows = Array.from(selected.values())
    .sort((left, right) => {
      if (qualitySetKeys.has(left.verseKey) && !qualitySetKeys.has(right.verseKey)) return -1;
      if (!qualitySetKeys.has(left.verseKey) && qualitySetKeys.has(right.verseKey)) return 1;
      return right.score - left.score;
    })
    .slice(0, 400);

  const columns: Array<keyof CandidateRow> = [
    "verseKey",
    "surahId",
    "ayahNumber",
    "arabicText",
    "primaryTranslation",
    "currentProfile",
    "conflictCount",
    "needsManualReviewCount",
    "riskyDropCount",
    "rootExplanationNeeded",
    "topKeyTerms",
    "topRoots",
    "topLemmas",
    "weakCorrespondenceSummary",
    "evidenceSummary",
    "suggestedRequiredConcepts",
    "suggestedSuppressedTerms",
    "suggestedProfileBoundTerms",
    "reviewStatus",
    "curator",
    "note",
    "sourceTrace"
  ];
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${csv}\n`, "utf8");

  const profileDistribution = rows.reduce<Record<string, number>>((record, row) => {
    record[row.currentProfile] = (record[row.currentProfile] ?? 0) + 1;
    return record;
  }, {});
  const topConflicts = rows
    .filter((row) => row.conflictCount > 0)
    .sort((left, right) => right.conflictCount - left.conflictCount)
    .slice(0, 20)
    .map((row) => ({
      verseKey: row.verseKey,
      profile: row.currentProfile,
      conflictCount: row.conflictCount,
      needsManualReviewCount: row.needsManualReviewCount,
      riskyDropCount: row.riskyDropCount
    }));

  console.log(
    JSON.stringify(
      {
        outputPath,
        scannedAyahs: arabicVerses.length,
        selectedAyahs: rows.length,
        qualitySetIncluded: rows.filter((row) => qualitySetKeys.has(row.verseKey)).length,
        profileDistribution,
        topConflicts
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
