import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import {
  buildVerseAnalysisEvidenceLayer,
  type RootEasyOnlyEntry
} from "../packages/core/src/analysis/verseAnalysisEvidenceLayer.ts";
import { classifyEvidenceConflict } from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";

type RiskClassification = "overlayCorrectSuppression" | "overlayTooAggressive" | "needsManualReview";

interface OverlayRow {
  verseKey: string;
  surahId: string;
  ayahNumber: string;
  currentProfile: string;
  requiredConcepts: string;
  suppressedTerms: string;
  profileBoundTerms: string;
  riskyTerms: string;
  reviewStatus: string;
  curator: string;
  note: string;
}

interface RiskConflictRecord {
  verseKey: string;
  selectedProfile: string;
  reviewStatus: string;
  overlaySuppressedTerm: string;
  evidenceTerm: string;
  conflictType: string;
  conflictQuality: string;
  classifierDecision: {
    qualityClass: string;
    reasonCode: string;
    termFamily: string;
    isGeneric: boolean;
    isContent: boolean;
    isProfileRelevant: boolean;
  } | null;
  requiredConcepts: string[];
  profileBoundTerms: string[];
  note: string;
  classification: RiskClassification;
  classificationReason: string;
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const overlayCsvPath = path.join(
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
function parseArgs(): { mode: "limit" | "all"; limit: number | null } {
  const args = process.argv.slice(2);
  if (args.includes("--all")) {
    return { mode: "all", limit: null };
  }

  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) {
    return { mode: "limit", limit: 1000 };
  }

  const limit = Number(limitArg.split("=")[1]);
  return { mode: "limit", limit: Number.isFinite(limit) && limit > 0 ? limit : 1000 };
}

function buildInputOutputPaths(mode: "limit" | "all", limit: number | null): {
  overlayAuditPath: string;
  snapshotPath: string;
  markdownPath: string;
} {
  const suffix = mode === "all" ? "all" : `limit-${limit ?? 1000}`;
  return {
    overlayAuditPath: path.join(
      workspaceRoot,
      "data",
      "analysis-snapshots",
      `vnext-curation-overlay-audit.${suffix}.json`
    ),
    snapshotPath: path.join(
      workspaceRoot,
      "data",
      "analysis-snapshots",
      `vnext-curation-overlay-risk-conflicts.${suffix}.json`
    ),
    markdownPath: path.join(
      workspaceRoot,
      "docs",
      `VNEXT_CURATION_OVERLAY_RISK_CONFLICTS_${suffix.toUpperCase().replace(/-/gu, "_")}.md`
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

function termMatches(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function includesTerm(term: string, values: string[]): boolean {
  return values.some((value) => termMatches(term, value));
}

function classifyRisk(input: {
  suppressedTerm: string;
  evidenceTerm: string;
  classifierDecision: ReturnType<typeof classifyEvidenceConflict> | null;
  requiredConcepts: string[];
  profileBoundTerms: string[];
}): { classification: RiskClassification; reason: string } {
  const genericTerms = ["şey", "apaçık", "amel", "iş", "işitti", "açtı", "iman etti"];
  const suppressedIsGeneric = includesTerm(input.suppressedTerm, genericTerms);
  const inRequiredConcept = includesTerm(input.suppressedTerm, input.requiredConcepts);
  const inProfileBound = includesTerm(input.suppressedTerm, input.profileBoundTerms);

  if (suppressedIsGeneric && !inRequiredConcept && !inProfileBound) {
    return {
      classification: "overlayCorrectSuppression",
      reason: "Suppressed term is generic and does not appear to carry the curated concept."
    };
  }

  if (input.classifierDecision?.qualityClass === "likelyRiskyDrop" && input.classifierDecision.isContent) {
    if (inRequiredConcept || inProfileBound) {
      return {
        classification: "overlayTooAggressive",
        reason: "Suppressed term overlaps with curated required/profile-bound concept and classifier sees content risk."
      };
    }

    return {
      classification: "needsManualReview",
      reason: "Classifier sees content risk, but curated concept overlap is not clear."
    };
  }

  if (inRequiredConcept || inProfileBound) {
    return {
      classification: "needsManualReview",
      reason: "Suppressed term overlaps with curated concept text; manual check needed."
    };
  }

  return {
    classification: "overlayCorrectSuppression",
    reason: "No strong content/profile overlap found."
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const paths = buildInputOutputPaths(args.mode, args.limit);
  const [overlayAudit, overlayCsv, rootEasyOnly] = await Promise.all([
    readFile(paths.overlayAuditPath, "utf8").then((content) => JSON.parse(content)),
    readFile(overlayCsvPath, "utf8"),
    readFile(rootEasyOnlyPath, "utf8").then((content) => JSON.parse(content) as RootEasyOnlyEntry[])
  ]);
  const riskyVerseKeys = new Set<string>(
    overlayAudit.examples.riskyExamples.map((row: { verseKey: string }) => row.verseKey)
  );
  const auditRiskByVerse = new Map<string, { riskyCollisions: string[] }>(
    overlayAudit.examples.riskyExamples.map((row: { verseKey: string; riskyCollisions: string[] }) => [
      row.verseKey,
      row
    ])
  );
  const overlayRows = parseCsv(overlayCsv) as unknown as OverlayRow[];
  const overlayByVerse = new Map(overlayRows.map((row) => [row.verseKey, row]));
  const records: RiskConflictRecord[] = [];

  for (const verseKey of riskyVerseKeys) {
    const overlay = overlayByVerse.get(verseKey);
    if (!overlay) continue;

    const surahId = Number(overlay.surahId);
    const ayahNumber = Number(overlay.ayahNumber);
    const [context, v4Context] = await Promise.all([
      buildVerseAnalysisContext(surahId, ayahNumber, {
        source: "json",
        debug: { includeCoverageReport: true }
      }),
      buildVerseAnalysisContext(surahId, ayahNumber, {
        source: "v4",
        debug: { includeCoverageReport: true }
      })
    ]);
    const evidenceLayer = buildVerseAnalysisEvidenceLayer(context, { v4Context, rootEasyOnly });
    const selectedProfile = evidenceLayer.selectedProfile;
    const suppressedTerms = splitTerms(overlay.suppressedTerms);
    const requiredConcepts = splitTerms(overlay.requiredConcepts);
    const profileBoundTerms = splitTerms(overlay.profileBoundTerms);
    const conflictEntries = evidenceLayer.items.flatMap((item) =>
      item.conflictFlags.map((conflict) => {
        const classifierDecision = classifyEvidenceConflict({
          conflictType: conflict.type,
          value: item.value,
          selectedProfile
        });
        return {
          evidenceTerm: displayValue(item.value),
          conflictType: conflict.type,
          classifierDecision
        };
      })
    );

    const riskyCollisions = auditRiskByVerse.get(verseKey)?.riskyCollisions ?? [];

    for (const riskyCollision of riskyCollisions) {
      const suppressedTerm =
        suppressedTerms.find((term) => termMatches(term, riskyCollision)) ??
        suppressedTerms.find((term) => includesTerm(term, requiredConcepts)) ??
        suppressedTerms[0] ??
        "";
      const match =
        conflictEntries.find((entry) => termMatches(riskyCollision, entry.evidenceTerm)) ??
        conflictEntries.find((entry) => termMatches(suppressedTerm, entry.evidenceTerm)) ??
        conflictEntries.find((entry) => entry.classifierDecision.qualityClass === "likelyRiskyDrop") ??
        conflictEntries[0];

      if (match) {

        const risk = classifyRisk({
          suppressedTerm,
          evidenceTerm: riskyCollision,
          classifierDecision: match.classifierDecision,
          requiredConcepts,
          profileBoundTerms
        });

        records.push({
          verseKey,
          selectedProfile,
          reviewStatus: overlay.reviewStatus,
          overlaySuppressedTerm: suppressedTerm,
          evidenceTerm: riskyCollision,
          conflictType: match.conflictType,
          conflictQuality: match.classifierDecision.qualityClass,
          classifierDecision: match.classifierDecision,
          requiredConcepts,
          profileBoundTerms,
          note: overlay.note,
          classification: risk.classification,
          classificationReason: risk.reason
        });
      }
    }
  }

  const deduped = Array.from(
    new Map(
      records.map((record) => [`${record.verseKey}|${record.overlaySuppressedTerm}|${record.evidenceTerm}`, record])
    ).values()
  );
  const summary = {
    totalRiskConflicts: deduped.length,
    overlayCorrectSuppression: deduped.filter((record) => record.classification === "overlayCorrectSuppression").length,
    overlayTooAggressive: deduped.filter((record) => record.classification === "overlayTooAggressive").length,
    needsManualReview: deduped.filter((record) => record.classification === "needsManualReview").length,
    affectedAyahs: new Set(deduped.map((record) => record.verseKey)).size,
    fullAuditRecommended: deduped.every((record) => record.classification === "overlayCorrectSuppression")
  };
  const rowsToFix = deduped
    .filter((record) => record.classification === "overlayTooAggressive")
    .map((record) => ({
      verseKey: record.verseKey,
      suppressedTerm: record.overlaySuppressedTerm,
      evidenceTerm: record.evidenceTerm,
      suggestedAction: "Remove from suppressedTerms or move to profileBoundTerms/requiredConcepts."
    }));
  const payload = {
    generatedAt: new Date().toISOString(),
    rules: {
      runtimeChanged: false,
      defaultSourceChanged: false,
      uiChanged: false,
      draftOverlayHardFiltered: false,
      classifierChanged: false,
      sourceDataOverwritten: false
    },
    inputs: {
      overlayAudit: path.relative(workspaceRoot, paths.overlayAuditPath).replace(/\\/gu, "/"),
      overlayCsv: path.relative(workspaceRoot, overlayCsvPath).replace(/\\/gu, "/")
    },
    summary,
    rowsToFix,
    records: deduped
  };

  const markdown = [
    `# vNext Curation Overlay Risk Conflicts ${args.mode === "all" ? "All" : `Limit ${args.limit ?? 1000}`}`,
    "",
    "Bu rapor, curation overlay audit'te riskli gorunen cakismalari ayri siniflandirir. UI, default source, runtime, classifier ve kaynak veri degistirilmedi.",
    "",
    "## Ozet",
    "",
    `- Toplam riskli cakisma: ${summary.totalRiskConflicts}`,
    `- Etkilenen ayet: ${summary.affectedAyahs}`,
    `- overlayCorrectSuppression: ${summary.overlayCorrectSuppression}`,
    `- overlayTooAggressive: ${summary.overlayTooAggressive}`,
    `- needsManualReview: ${summary.needsManualReview}`,
    `- Full audit onerisi: ${summary.fullAuditRecommended ? "evet" : "hayir"}`,
    "",
    "## Duzeltilmesi Gereken Overlay Satirlari",
    "",
    rowsToFix.length > 0
      ? "| Ayet | Suppressed term | Evidence term | Oneri |\n|---|---|---|---|\n" +
          rowsToFix
            .map(
              (row) =>
                `| ${row.verseKey} | ${row.suppressedTerm} | ${row.evidenceTerm} | ${row.suggestedAction} |`
            )
            .join("\n")
      : "- Yok.",
    "",
    "## Tum Risk Kayitlari",
    "",
    "| Ayet | Profile | Suppressed | Evidence | Conflict | Classifier | Sinif |",
    "|---|---|---|---|---|---|---|",
    ...deduped.map(
      (record) =>
        `| ${record.verseKey} | ${record.selectedProfile} | ${record.overlaySuppressedTerm} | ${record.evidenceTerm} | ${record.conflictType} | ${record.conflictQuality} | ${record.classification} |`
    ),
    "",
    "## Karar",
    "",
    summary.fullAuditRecommended
      ? "- Riskli kayitlarin tamami overlayCorrectSuppression gorunuyor; full audit'e gecmek guvenli olabilir."
      : "- Full audit'e gecmeden once overlayTooAggressive ve needsManualReview kayitlari incelenmeli."
  ].join("\n");

  await mkdir(path.dirname(paths.snapshotPath), { recursive: true });
  await mkdir(path.dirname(paths.markdownPath), { recursive: true });
  await writeFile(paths.snapshotPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(paths.markdownPath, `${markdown}\n`, "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
