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
  arabicText: string;
}

interface OverlayRow {
  verseKey: string;
  surahId: string;
  ayahNumber: string;
  currentProfile: string;
  primaryTranslation: string;
  requiredConcepts: string;
  suppressedTerms: string;
  profileBoundTerms: string;
  riskyTerms: string;
  reviewStatus: string;
  curator: string;
  note: string;
  sourceTrace: string;
}

interface OverlayAyahAudit {
  verseKey: string;
  selectedProfile: string;
  reviewStatus: string;
  conflictCount: number;
  needsManualReviewCount: number;
  riskyDropCount: number;
  suppressedTerms: string[];
  requiredConcepts: string[];
  profileBoundTerms: string[];
  potentialSuppressionHits: string[];
  potentialSuppressionManualHits: string[];
  requiredConceptMissing: string[];
  profileBoundHits: string[];
  riskyCollisions: string[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const arabicPath = path.join(workspaceRoot, "data", "normalized", "arabic.json");
const overlayPath = path.join(
  workspaceRoot,
  "data",
  "curation",
  "ayah_curation_overlay_first400_curated_v3.csv"
);
const rootEasyOnlyPath = path.join(
  workspaceRoot,
  "data2",
  "processed",
  "root_explanations_tr_v2_easy_only.json"
);
function parseArgs(): { limit: number | null; mode: "limit" | "all" } {
  const args = process.argv.slice(2);
  if (args.includes("--all")) {
    return { limit: null, mode: "all" };
  }

  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) {
    return { limit: 1000, mode: "limit" };
  }

  const limit = Number(limitArg.split("=")[1]);
  return { limit: Number.isFinite(limit) && limit > 0 ? limit : 1000, mode: "limit" };
}

function buildOutputPaths(mode: "limit" | "all", limit: number | null): { snapshotPath: string; markdownPath: string } {
  const suffix = mode === "all" ? "all" : `limit-${limit ?? 1000}`;
  return {
    snapshotPath: path.join(
      workspaceRoot,
      "data",
      "analysis-snapshots",
      `vnext-curation-overlay-audit.${suffix}.json`
    ),
    markdownPath: path.join(
      workspaceRoot,
      "docs",
      `VNEXT_CURATION_OVERLAY_AUDIT_${suffix.toUpperCase().replace(/-/gu, "_")}.md`
    )
  };
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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
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
  if (!headers) {
    return [];
  }

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

function termMatches(term: string, values: string[]): boolean {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) {
    return false;
  }

  return values.some((value) => {
    const normalizedValue = normalize(value);
    return normalizedValue.includes(normalizedTerm) || normalizedTerm.includes(normalizedValue);
  });
}

function countQuality(
  record: Partial<Record<EvidenceConflictQualityClass, number>>,
  key: EvidenceConflictQualityClass,
  amount = 1
): void {
  record[key] = (record[key] ?? 0) + amount;
}

async function main(): Promise<void> {
  const { limit, mode } = parseArgs();
  const outputPaths = buildOutputPaths(mode, limit);
  const [arabicVerses, overlayContent, rootEasyOnly] = await Promise.all([
    readFile(arabicPath, "utf8").then((content) => JSON.parse(content) as ArabicVerse[]),
    readFile(overlayPath, "utf8"),
    readFile(rootEasyOnlyPath, "utf8").then((content) => JSON.parse(content) as RootEasyOnlyEntry[])
  ]);
  const overlayRows = parseCsv(overlayContent) as unknown as OverlayRow[];
  const overlayByVerse = new Map(overlayRows.map((row) => [row.verseKey, row]));
  const targetVerses = limit === null ? arabicVerses : arabicVerses.slice(0, limit);

  let matchedOverlayAyahs = 0;
  let potentialSuppressionCount = 0;
  let potentialSuppressionManualHitCount = 0;
  let requiredConceptMissingCount = 0;
  let profileBoundHitCount = 0;
  let riskyCollisionCount = 0;
  let currentNeedsManualReview = 0;
  let currentRiskyDrop = 0;
  let currentConflictCount = 0;
  const reviewStatusDistribution: Record<string, number> = {};
  const profileDistribution: Record<string, number> = {};
  const conflictQualityDistribution: Partial<Record<EvidenceConflictQualityClass, number>> = {};
  const overlayAyahs: OverlayAyahAudit[] = [];
  const riskyExamples: OverlayAyahAudit[] = [];
  const startedAt = Date.now();

  for (let index = 0; index < targetVerses.length; index += 1) {
    const verse = targetVerses[index];
    const verseKey = `${verse.surahId}:${verse.ayahNumber}`;
    const overlay = overlayByVerse.get(verseKey);

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
        const qualityClass = classifyEvidenceConflict({
          conflictType: conflict.type,
          value: item.value,
          selectedProfile
        }).qualityClass;
        return {
          itemValue: displayValue(item.value),
          qualityClass
        };
      })
    );
    const conflictDisplays = conflictEntries.map((entry) => entry.itemValue);
    const manualConflictDisplays = conflictEntries
      .filter((entry) => entry.qualityClass === "needsManualReview")
      .map((entry) => entry.itemValue);
    const riskyConflictDisplays = conflictEntries
      .filter((entry) => entry.qualityClass === "likelyRiskyDrop")
      .map((entry) => entry.itemValue);
    const allEvidenceDisplays = evidenceLayer.items.map((item) => displayValue(item.value));
    const userFacingDisplays = evidenceLayer.items
      .filter((item) => item.userFacingAllowed)
      .map((item) => displayValue(item.value));

    currentConflictCount += conflictEntries.length;
    currentNeedsManualReview += manualConflictDisplays.length;
    currentRiskyDrop += riskyConflictDisplays.length;
    for (const entry of conflictEntries) {
      countQuality(conflictQualityDistribution, entry.qualityClass);
    }

    if (overlay) {
      matchedOverlayAyahs += 1;
      reviewStatusDistribution[overlay.reviewStatus] = (reviewStatusDistribution[overlay.reviewStatus] ?? 0) + 1;
      profileDistribution[selectedProfile] = (profileDistribution[selectedProfile] ?? 0) + 1;

      const suppressedTerms = splitTerms(overlay.suppressedTerms);
      const requiredConcepts = splitTerms(overlay.requiredConcepts);
      const profileBoundTerms = splitTerms(overlay.profileBoundTerms);
      const potentialSuppressionHits = suppressedTerms.filter((term) => termMatches(term, conflictDisplays));
      const potentialSuppressionManualHits = suppressedTerms.filter((term) =>
        termMatches(term, manualConflictDisplays)
      );
      const requiredConceptMissing = requiredConcepts.filter(
        (term) => !termMatches(term, [...userFacingDisplays, ...allEvidenceDisplays])
      );
      const profileBoundHits = profileBoundTerms.filter((term) => termMatches(term, conflictDisplays));
      const riskyCollisions = [
        ...suppressedTerms.filter((term) => termMatches(term, riskyConflictDisplays)),
        ...requiredConcepts.filter((term) => termMatches(term, potentialSuppressionHits))
      ];

      potentialSuppressionCount += potentialSuppressionHits.length;
      potentialSuppressionManualHitCount += potentialSuppressionManualHits.length;
      requiredConceptMissingCount += requiredConceptMissing.length;
      profileBoundHitCount += profileBoundHits.length;
      riskyCollisionCount += riskyCollisions.length;

      const auditRow: OverlayAyahAudit = {
        verseKey,
        selectedProfile,
        reviewStatus: overlay.reviewStatus,
        conflictCount: conflictEntries.length,
        needsManualReviewCount: manualConflictDisplays.length,
        riskyDropCount: riskyConflictDisplays.length,
        suppressedTerms,
        requiredConcepts,
        profileBoundTerms,
        potentialSuppressionHits,
        potentialSuppressionManualHits,
        requiredConceptMissing,
        profileBoundHits,
        riskyCollisions
      };
      overlayAyahs.push(auditRow);

      if (riskyCollisions.length > 0) {
        riskyExamples.push(auditRow);
      }
    }

    if ((index + 1) % 100 === 0 || index + 1 === targetVerses.length) {
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(`processed ${index + 1}/${targetVerses.length} ayahs in ${elapsedSeconds}s`);
    }
  }

  const estimatedNeedsManualReviewAfterOverlay = Math.max(
    currentNeedsManualReview - potentialSuppressionManualHitCount,
    0
  );
  const snapshot = {
    generatedAt: new Date().toISOString(),
    rules: {
      runtimeChanged: false,
      defaultSourceChanged: false,
      uiChanged: false,
      v4DefaultEnabled: false,
      classifierChanged: false,
      sourceDataOverwritten: false,
      draftRowsHardFiltered: false,
      overlayAppliedToUserFacingOutput: false
    },
    inputs: {
      overlayPath: path.relative(workspaceRoot, overlayPath).replace(/\\/gu, "/"),
      mode,
      limit,
      rootEasyOnlyPath: path.relative(workspaceRoot, rootEasyOnlyPath).replace(/\\/gu, "/")
    },
    summary: {
      overlayRowsRead: overlayRows.length,
      matchedOverlayAyahs,
      unmatchedOverlayRowsInLimit: overlayRows.length - matchedOverlayAyahs,
      reviewStatusDistribution,
      profileDistribution,
      currentConflictCount,
      currentNeedsManualReview,
      currentRiskyDrop,
      conflictQualityDistribution,
      potentialSuppressionCount,
      potentialSuppressionManualHitCount,
      requiredConceptMissingCount,
      profileBoundHitCount,
      riskyCollisionCount,
      estimatedNeedsManualReviewAfterOverlay,
      estimatedNeedsManualReviewDelta: estimatedNeedsManualReviewAfterOverlay - currentNeedsManualReview,
      fullAuditRecommended: riskyCollisionCount === 0 && matchedOverlayAyahs > 0
    },
    examples: {
      overlayAyahs: overlayAyahs.slice(0, 100),
      highestPotentialSuppression: [...overlayAyahs]
        .sort((left, right) => right.potentialSuppressionHits.length - left.potentialSuppressionHits.length)
        .slice(0, 20),
      highestRequiredConceptMissing: [...overlayAyahs]
        .sort((left, right) => right.requiredConceptMissing.length - left.requiredConceptMissing.length)
        .slice(0, 20),
      highestProfileBoundHits: [...overlayAyahs]
        .sort((left, right) => right.profileBoundHits.length - left.profileBoundHits.length)
        .slice(0, 20),
      riskyExamples
    }
  };

  const markdown = [
    `# vNext Curation Overlay Audit ${mode === "all" ? "All" : `Limit ${limit ?? 1000}`}`,
    "",
    "Bu audit, curated 400 satirlik ayah overlay dosyasini sadece audit-only modda okur. UI, default source, runtime, classifier kararlari ve v4 default davranisi degistirilmedi. `draft_curated` satirlari hard filter yapilmadi; sadece potansiyel etki olarak raporlandi.",
    "",
    "## Ozet",
    "",
    `- Overlay satiri: ${snapshot.summary.overlayRowsRead}`,
    `- Limit icinde eslesen ayet: ${snapshot.summary.matchedOverlayAyahs}`,
    `- Review status dagilimi: ${JSON.stringify(snapshot.summary.reviewStatusDistribution)}`,
    `- Current needsManualReview conflict: ${snapshot.summary.currentNeedsManualReview}`,
    `- Current riskyDrop conflict: ${snapshot.summary.currentRiskyDrop}`,
    `- Potential suppression hit: ${snapshot.summary.potentialSuppressionCount}`,
    `- Potential suppression manual hit: ${snapshot.summary.potentialSuppressionManualHitCount}`,
    `- Required concept missing: ${snapshot.summary.requiredConceptMissingCount}`,
    `- Profile-bound hit: ${snapshot.summary.profileBoundHitCount}`,
    `- Riskli cakisma: ${snapshot.summary.riskyCollisionCount}`,
    `- Tahmini needsManualReview etkisi: ${snapshot.summary.currentNeedsManualReview} -> ${snapshot.summary.estimatedNeedsManualReviewAfterOverlay}`,
    "",
    "## Profile Dagilimi",
    "",
    ...Object.entries(snapshot.summary.profileDistribution).map(([profile, count]) => `- \`${profile}\`: ${count}`),
    "",
    "## En Yuksek Suppression Hit Ornekleri",
    "",
    "| Ayet | Profile | Suppression hits | Manual hits | Risky collisions |",
    "|---|---|---:|---:|---:|",
    ...snapshot.examples.highestPotentialSuppression
      .slice(0, 20)
      .map(
        (row) =>
          `| ${row.verseKey} | ${row.selectedProfile} | ${row.potentialSuppressionHits.length} | ${row.potentialSuppressionManualHits.length} | ${row.riskyCollisions.length} |`
      ),
    "",
    "## En Yuksek Required Concept Missing Ornekleri",
    "",
    "| Ayet | Profile | Missing count | Missing concepts |",
    "|---|---|---:|---|",
    ...snapshot.examples.highestRequiredConceptMissing
      .slice(0, 20)
      .map(
        (row) =>
          `| ${row.verseKey} | ${row.selectedProfile} | ${row.requiredConceptMissing.length} | ${row.requiredConceptMissing.join("; ")} |`
      ),
    "",
    "## Risk Degerlendirmesi",
    "",
    snapshot.summary.riskyCollisionCount === 0
      ? "- Riskli cakisma gorunmedi; full audit'e gecmek teknik olarak guvenli gorunuyor."
      : "- Riskli cakismalar var; full audit'ten once bu ornekler manuel incelenmeli.",
    "- Overlay satirlari henuz kullanici-facing karara uygulanmadi.",
    "- `draft_curated` satirlar sadece audit sinyali olarak okundu.",
    "",
    "## Ciktilar",
    "",
    `- Snapshot: \`${path.relative(workspaceRoot, outputPaths.snapshotPath).replace(/\\/gu, "/")}\``
  ].join("\n");

  await mkdir(path.dirname(outputPaths.snapshotPath), { recursive: true });
  await mkdir(path.dirname(outputPaths.markdownPath), { recursive: true });
  await writeFile(outputPaths.snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(outputPaths.markdownPath, `${markdown}\n`, "utf8");

  console.log(JSON.stringify(snapshot.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
