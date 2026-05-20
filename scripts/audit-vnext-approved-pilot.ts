import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import {
  buildVerseAnalysisEvidenceLayer,
  type RootEasyOnlyEntry
} from "../packages/core/src/analysis/verseAnalysisEvidenceLayer.ts";
import {
  classifyEvidenceConflict,
  type EvidenceConflictQualityClass
} from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";

interface ArabicVerse {
  surahId: number;
  ayahNumber: number;
}

interface PilotRow {
  verseKey: string;
  surahId: string;
  ayahNumber: string;
  currentProfile: string;
  requiredConcepts: string;
  suppressedTerms: string;
  profileBoundTerms: string;
  reviewStatus: string;
}

interface PilotAyahAudit {
  verseKey: string;
  selectedProfile: string;
  reviewStatus: string;
  conflictCount: number;
  needsManualReviewCount: number;
  curationSupportedSuppression: string[];
  curationRequiredConceptMissing: string[];
  curationProfileBoundHit: string[];
  riskyCollisions: string[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const arabicPath = path.join(workspaceRoot, "data", "normalized", "arabic.json");
const pilotPath = path.join(
  workspaceRoot,
  "data",
  "curation",
  "ayah_curation_overlay_approved_pilot_100.csv"
);
const manualReviewPoolPath = path.join(
  workspaceRoot,
  "data",
  "curation",
  "ayah_curation_overlay_manual_review_pool.csv"
);
const rootEasyOnlyPath = path.join(
  workspaceRoot,
  "data2",
  "processed",
  "root_explanations_tr_v2_easy_only.json"
);
const snapshotPath = path.join(
  workspaceRoot,
  "data",
  "analysis-snapshots",
  "vnext-approved-pilot-audit.limit-1000.json"
);
const markdownPath = path.join(workspaceRoot, "docs", "VNEXT_APPROVED_PILOT_AUDIT_LIMIT_1000.md");

function parseArgs(): { limit: number } {
  const limitArg = process.argv.slice(2).find((arg) => arg.startsWith("--limit="));
  if (!limitArg) return { limit: 1000 };
  const limit = Number(limitArg.split("=")[1]);
  return { limit: Number.isFinite(limit) && limit > 0 ? limit : 1000 };
}

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) return [];
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/u, ""), record[index] ?? ""]))
  );
}

function splitTerms(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(";")
        .map((term) => term.trim())
        .filter(Boolean)
    )
  );
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function termMatches(term: string, value: string): boolean {
  const left = normalize(term);
  const right = normalize(value);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function matchesAny(term: string, values: string[]): boolean {
  return values.some((value) => termMatches(term, value));
}

async function main(): Promise<void> {
  const { limit } = parseArgs();
  const [arabicVerses, pilotCsv, manualCsv, rootEasyOnly] = await Promise.all([
    readFile(arabicPath, "utf8").then((content) => JSON.parse(content) as ArabicVerse[]),
    readFile(pilotPath, "utf8"),
    readFile(manualReviewPoolPath, "utf8"),
    readFile(rootEasyOnlyPath, "utf8").then((content) => JSON.parse(content) as RootEasyOnlyEntry[])
  ]);
  const pilotRows = (parseCsv(pilotCsv) as unknown as PilotRow[]).filter(
    (row) => row.reviewStatus === "approved_candidate"
  );
  const manualRows = parseCsv(manualCsv) as unknown as PilotRow[];
  const manualVerseKeys = new Set(manualRows.map((row) => row.verseKey));
  const pilotRowsExcludingManual = pilotRows.filter((row) => !manualVerseKeys.has(row.verseKey));
  const pilotByVerse = new Map(pilotRowsExcludingManual.map((row) => [row.verseKey, row]));
  const targetVerses = arabicVerses.slice(0, limit);

  let matchedPilotAyahs = 0;
  let curationSupportedSuppressionCount = 0;
  let curationRequiredConceptMissingCount = 0;
  let curationProfileBoundHitCount = 0;
  let riskyCollisionCount = 0;
  let currentNeedsManualReview = 0;
  const profileDistribution: Record<string, number> = {};
  const reviewStatusDistribution: Record<string, number> = {};
  const conflictQualityDistribution: Partial<Record<EvidenceConflictQualityClass, number>> = {};
  const pilotAudits: PilotAyahAudit[] = [];
  const riskyExamples: PilotAyahAudit[] = [];
  const startedAt = Date.now();

  for (let index = 0; index < targetVerses.length; index += 1) {
    const verse = targetVerses[index];
    const verseKey = `${verse.surahId}:${verse.ayahNumber}`;
    const pilot = pilotByVerse.get(verseKey);

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
    const evidenceLayer = buildVerseAnalysisEvidenceLayer(context, { v4Context, rootEasyOnly });
    const selectedProfile = evidenceLayer.selectedProfile;
    const conflictEntries = evidenceLayer.items.flatMap((item) =>
      item.conflictFlags.map((conflict) => {
        const quality = classifyEvidenceConflict({
          conflictType: conflict.type,
          value: item.value,
          selectedProfile
        }).qualityClass;
        conflictQualityDistribution[quality] = (conflictQualityDistribution[quality] ?? 0) + 1;
        if (quality === "needsManualReview") currentNeedsManualReview += 1;
        return {
          display: displayValue(item.value),
          quality
        };
      })
    );
    const allEvidence = evidenceLayer.items.map((item) => displayValue(item.value));
    const userFacingEvidence = evidenceLayer.items
      .filter((item) => item.userFacingAllowed)
      .map((item) => displayValue(item.value));

    if (pilot) {
      matchedPilotAyahs += 1;
      profileDistribution[selectedProfile] = (profileDistribution[selectedProfile] ?? 0) + 1;
      reviewStatusDistribution[pilot.reviewStatus] = (reviewStatusDistribution[pilot.reviewStatus] ?? 0) + 1;
      const suppressedTerms = splitTerms(pilot.suppressedTerms);
      const requiredConcepts = splitTerms(pilot.requiredConcepts);
      const profileBoundTerms = splitTerms(pilot.profileBoundTerms);
      const conflictDisplays = conflictEntries.map((entry) => entry.display);
      const manualConflictDisplays = conflictEntries
        .filter((entry) => entry.quality === "needsManualReview")
        .map((entry) => entry.display);
      const riskyDropDisplays = conflictEntries
        .filter((entry) => entry.quality === "likelyRiskyDrop")
        .map((entry) => entry.display);
      const supportedSuppression = suppressedTerms.filter((term) => matchesAny(term, conflictDisplays));
      const requiredConceptMissing = requiredConcepts.filter(
        (term) => !matchesAny(term, [...allEvidence, ...userFacingEvidence])
      );
      const profileBoundHit = profileBoundTerms.filter((term) => matchesAny(term, conflictDisplays));
      const riskyCollisions = [
        ...suppressedTerms.filter((term) => matchesAny(term, riskyDropDisplays)),
        ...suppressedTerms.filter((term) => matchesAny(term, manualConflictDisplays))
      ];

      curationSupportedSuppressionCount += supportedSuppression.length;
      curationRequiredConceptMissingCount += requiredConceptMissing.length;
      curationProfileBoundHitCount += profileBoundHit.length;
      riskyCollisionCount += riskyCollisions.length;

      const audit: PilotAyahAudit = {
        verseKey,
        selectedProfile,
        reviewStatus: pilot.reviewStatus,
        conflictCount: conflictEntries.length,
        needsManualReviewCount: manualConflictDisplays.length,
        curationSupportedSuppression: supportedSuppression,
        curationRequiredConceptMissing: requiredConceptMissing,
        curationProfileBoundHit: profileBoundHit,
        riskyCollisions
      };
      pilotAudits.push(audit);
      if (riskyCollisions.length > 0) riskyExamples.push(audit);
    }

    if ((index + 1) % 100 === 0 || index + 1 === targetVerses.length) {
      console.log(`processed ${index + 1}/${targetVerses.length} ayahs in ${Math.round((Date.now() - startedAt) / 1000)}s`);
    }
  }

  const summary = {
    pilotRowsRead: pilotRows.length,
    manualReviewPoolRows: manualRows.length,
    pilotRowsAfterManualExclusion: pilotRowsExcludingManual.length,
    matchedPilotAyahs,
    reviewStatusDistribution,
    profileDistribution,
    curationSupportedSuppressionCount,
    curationRequiredConceptMissingCount,
    curationProfileBoundHitCount,
    riskyCollisionCount,
    currentNeedsManualReview,
    estimatedNeedsManualReviewAfterPilotGuidance: Math.max(
      currentNeedsManualReview - curationSupportedSuppressionCount,
      0
    ),
    estimatedNeedsManualReviewDelta: -curationSupportedSuppressionCount,
    fullAuditRecommended: riskyCollisionCount === 0 && matchedPilotAyahs === pilotRowsExcludingManual.length
  };
  const snapshot = {
    generatedAt: new Date().toISOString(),
    rules: {
      runtimeChanged: false,
      defaultSourceChanged: false,
      uiChanged: false,
      hardFilterApplied: false,
      classifierChanged: false,
      v4DefaultEnabled: false,
      sourceDataOverwritten: false,
      pilotAppliedToUserFacingOutput: false
    },
    inputs: {
      pilotPath: path.relative(workspaceRoot, pilotPath).replace(/\\/gu, "/"),
      manualReviewPoolPath: path.relative(workspaceRoot, manualReviewPoolPath).replace(/\\/gu, "/"),
      limit
    },
    summary,
    examples: {
      pilotAyahs: pilotAudits.slice(0, 100),
      riskyExamples
    }
  };
  const markdown = [
    "# vNext Approved Pilot Audit Limit 1000",
    "",
    "Bu audit, 100 satirlik approved_candidate curation pilotunu sadece audit-guidance olarak okur. UI, runtime, default source, classifier ve v4 default davranisi degistirilmedi; hard filter uygulanmadi.",
    "",
    "## Ozet",
    "",
    `- Pilot satiri: ${summary.pilotRowsRead}`,
    `- Manual review pool satiri: ${summary.manualReviewPoolRows}`,
    `- Manual pool dislandiktan sonra pilot satiri: ${summary.pilotRowsAfterManualExclusion}`,
    `- Limit icinde eslesen pilot ayet: ${summary.matchedPilotAyahs}`,
    `- curationSupportedSuppression: ${summary.curationSupportedSuppressionCount}`,
    `- curationRequiredConceptMissing: ${summary.curationRequiredConceptMissingCount}`,
    `- curationProfileBoundHit: ${summary.curationProfileBoundHitCount}`,
    `- Riskli cakisma: ${summary.riskyCollisionCount}`,
    `- Tahmini needsManualReview etkisi: ${summary.currentNeedsManualReview} -> ${summary.estimatedNeedsManualReviewAfterPilotGuidance}`,
    "",
    "## Pilot Profile Dagilimi",
    "",
    ...Object.entries(summary.profileDistribution).map(([profile, count]) => `- \`${profile}\`: ${count}`),
    "",
    "## Karar",
    "",
    summary.fullAuditRecommended
      ? "- Limit=1000 icinde riskli cakisma yok; full audit'e gecmek guvenli gorunuyor."
      : "- Riskli cakisma veya eslesmeyen pilot satiri var; full audit oncesi incelenmeli."
  ].join("\n");

  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await mkdir(path.dirname(markdownPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${markdown}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
