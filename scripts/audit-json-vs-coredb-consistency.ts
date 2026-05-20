import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVerseAnalysisContext,
  type VerseAnalysisContext
} from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";

type DifferenceClass =
  | "same"
  | "minor_difference"
  | "meaningful_difference"
  | "missing_in_one_source"
  | "preview_risk";

interface FieldAudit<TValue> {
  classification: DifferenceClass;
  json: TValue;
  coreDb: TValue;
  note?: string;
}

interface VerseAuditEntry {
  verseKey: string;
  category: string;
  expectedProfile: string | null;
  overallClassification: DifferenceClass;
  counts: {
    translations: FieldAudit<number>;
    words: FieldAudit<number>;
    roots: FieldAudit<number>;
    lemmas: FieldAudit<number>;
  };
  selectedProfile: FieldAudit<string>;
  mainMeaningAxisPreview: FieldAudit<string[]>;
  keyTermsPreview: FieldAudit<string[]>;
  translationDifferencesPreview: FieldAudit<string[]>;
  weakCorrespondencesPreview: FieldAudit<string[]>;
  previewSourceStatus: FieldAudit<{ available: string[]; missing: string[] }>;
  contextAvailableSources: FieldAudit<string[]>;
  contextMissingSources: FieldAudit<string[]>;
  notes: string[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const auditSnapshotPath = path.join(
  snapshotDirectory,
  "json-vs-coredb-consistency-audit.sample.json"
);
const auditMarkdownPath = path.join(
  workspaceRoot,
  "docs",
  "JSON_VS_COREDB_CONSISTENCY_AUDIT.md"
);

const noisyTermIndicators = [
  "ve degil",
  "uzerine ustune",
  "yalniz sana",
  "ve yalniz sana",
  "azginlik",
  "takva sahibi"
];

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function uniqueNormalized(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean))).sort();
}

function overlaps(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  return right.filter((value) => leftSet.has(value)).length;
}

function classifyScalar<TValue>(json: TValue, coreDb: TValue): FieldAudit<TValue> {
  return {
    classification: json === coreDb ? "same" : "meaningful_difference",
    json,
    coreDb
  };
}

function classifyStringArray(
  jsonValues: string[],
  coreDbValues: string[],
  note?: string
): FieldAudit<string[]> {
  const normalizedJson = uniqueNormalized(jsonValues);
  const normalizedCoreDb = uniqueNormalized(coreDbValues);

  if (normalizedJson.length === 0 && normalizedCoreDb.length === 0) {
    return { classification: "same", json: jsonValues, coreDb: coreDbValues, note };
  }

  if (normalizedJson.length === 0 || normalizedCoreDb.length === 0) {
    return {
      classification: "missing_in_one_source",
      json: jsonValues,
      coreDb: coreDbValues,
      note
    };
  }

  if (normalizedJson.join("||") === normalizedCoreDb.join("||")) {
    return { classification: "same", json: jsonValues, coreDb: coreDbValues, note };
  }

  const overlapCount = overlaps(normalizedJson, normalizedCoreDb);
  const baseSize = Math.max(normalizedJson.length, normalizedCoreDb.length);
  const overlapRatio = baseSize === 0 ? 1 : overlapCount / baseSize;

  return {
    classification: overlapRatio >= 0.6 ? "minor_difference" : "meaningful_difference",
    json: jsonValues,
    coreDb: coreDbValues,
    note
  };
}

function classifySourceStatus(
  jsonStatus: { available: string[]; missing: string[] },
  coreDbStatus: { available: string[]; missing: string[] }
): FieldAudit<{ available: string[]; missing: string[] }> {
  const availableComparison = classifyStringArray(jsonStatus.available, coreDbStatus.available);
  const missingComparison = classifyStringArray(jsonStatus.missing, coreDbStatus.missing);

  const classification =
    availableComparison.classification === "same" && missingComparison.classification === "same"
      ? "same"
      : availableComparison.classification === "missing_in_one_source" ||
          missingComparison.classification === "missing_in_one_source"
        ? "missing_in_one_source"
        : availableComparison.classification === "meaningful_difference" ||
            missingComparison.classification === "meaningful_difference"
          ? "meaningful_difference"
          : "minor_difference";

  return {
    classification,
    json: jsonStatus,
    coreDb: coreDbStatus
  };
}

function hasNoisySupportingTerms(context: VerseAnalysisContext): boolean {
  return context.keyTerms.some((term) =>
    noisyTermIndicators.some((indicator) => normalizeText(term).includes(indicator))
  );
}

function deriveOverallClassification(input: {
  profile: FieldAudit<string>;
  axis: FieldAudit<string[]>;
  keyTerms: FieldAudit<string[]>;
  translationDiffs: FieldAudit<string[]>;
  weakDiffs: FieldAudit<string[]>;
  sourceStatus: FieldAudit<{ available: string[]; missing: string[] }>;
  notes: string[];
}): DifferenceClass {
  if (input.profile.classification === "meaningful_difference") {
    return "meaningful_difference";
  }

  const previewClassifications = [
    input.axis.classification,
    input.keyTerms.classification,
    input.translationDiffs.classification,
    input.weakDiffs.classification
  ];

  if (previewClassifications.includes("meaningful_difference")) {
    return "meaningful_difference";
  }

  if (previewClassifications.includes("missing_in_one_source")) {
    return "missing_in_one_source";
  }

  if (input.notes.includes("coreDb_supporting_terms_look_noisier")) {
    return "preview_risk";
  }

  if (
    previewClassifications.includes("minor_difference") ||
    input.sourceStatus.classification !== "same" ||
    input.notes.length > 0
  ) {
    return "minor_difference";
  }

  return "same";
}

function countAuditClass(entries: VerseAuditEntry[], classification: DifferenceClass): number {
  return entries.filter((entry) => entry.overallClassification === classification).length;
}

function buildMarkdownReport(input: {
  entries: VerseAuditEntry[];
  sameProfileCount: number;
  meaningfulAxisDifferenceCount: number;
  richerKeyTermsCount: number;
  noisierKeyTermsCount: number;
}): string {
  const meaningfulEntries = input.entries.filter(
    (entry) =>
      entry.overallClassification === "meaningful_difference" ||
      entry.overallClassification === "missing_in_one_source" ||
      entry.overallClassification === "preview_risk"
  );

  const lines = [
    "# JSON vs coreDb Consistency Audit",
    "",
    `- Compared verses: ${input.entries.length}`,
    `- Same selected profile: ${input.sameProfileCount}/${input.entries.length}`,
    `- Meaningful main axis differences: ${input.meaningfulAxisDifferenceCount}`,
    `- Overall same: ${countAuditClass(input.entries, "same")}`,
    `- Overall minor difference: ${countAuditClass(input.entries, "minor_difference")}`,
    `- Overall meaningful difference: ${countAuditClass(input.entries, "meaningful_difference")}`,
    `- Overall missing in one source: ${countAuditClass(input.entries, "missing_in_one_source")}`,
    `- Overall preview risk: ${countAuditClass(input.entries, "preview_risk")}`,
    `- coreDb richer visible key terms: ${input.richerKeyTermsCount}`,
    `- coreDb noisier term signal count: ${input.noisierKeyTermsCount}`,
    "",
    "## Summary",
    "",
    "This audit compares the 28-verse Kanitli Analiz quality set across `json` and `coreDb` sources.",
    "The current checkpoint suggests that profile selection is stable across sources, while most remaining differences come from source availability labels, supporting-term richness, and occasional preview noisiness rather than category drift.",
    "",
    "## Verses With Non-Same Results",
    ""
  ];

  if (meaningfulEntries.length === 0) {
    lines.push("- None");
  } else {
    for (const entry of meaningfulEntries) {
      lines.push(
        `- \`${entry.verseKey}\` (${entry.category}): ${entry.overallClassification}`
      );
      if (entry.notes.length > 0) {
        lines.push(`  Notes: ${entry.notes.join("; ")}`);
      }
    }
  }

  lines.push(
    "",
    "## Recommendation",
    "",
    "coreDb looks safe for broader audit use and side-by-side preview generation, but it is still early to make it the default source.",
    "The next step should be a broader consistency audit and a targeted review of the verses that show preview-risk or source-status divergence."
  );

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const entries: VerseAuditEntry[] = [];

  for (const verse of verseAnalysisQualitySet) {
    const jsonContext = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
      source: "json"
    });
    const coreDbContext = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
      source: "coreDb"
    });
    const jsonPreview = buildVerseAnalysisPreview(jsonContext);
    const coreDbPreview = buildVerseAnalysisPreview(coreDbContext);

    const notes: string[] = [];

    const selectedProfile = classifyScalar(
      jsonPreview.selectedProfile,
      coreDbPreview.selectedProfile
    );
    const mainMeaningAxisPreview = classifyStringArray(
      jsonPreview.mainMeaningAxisPreview,
      coreDbPreview.mainMeaningAxisPreview
    );
    const keyTermsPreview = classifyStringArray(
      jsonPreview.keyTermsPreview,
      coreDbPreview.keyTermsPreview
    );
    const translationDifferencesPreview = classifyStringArray(
      jsonPreview.translationDifferencesPreview,
      coreDbPreview.translationDifferencesPreview
    );
    const weakCorrespondencesPreview = classifyStringArray(
      jsonPreview.weakCorrespondencesPreview,
      coreDbPreview.weakCorrespondencesPreview
    );
    const previewSourceStatus = classifySourceStatus(
      jsonPreview.sourceStatus,
      coreDbPreview.sourceStatus
    );
    const contextAvailableSources = classifyStringArray(
      jsonContext.availableSources,
      coreDbContext.availableSources
    );
    const contextMissingSources = classifyStringArray(
      jsonContext.missingSources,
      coreDbContext.missingSources
    );

    if (hasNoisySupportingTerms(coreDbContext) && !hasNoisySupportingTerms(jsonContext)) {
      notes.push("coreDb_supporting_terms_look_noisier");
    }

    if (
      coreDbPreview.keyTermsPreview.length > jsonPreview.keyTermsPreview.length &&
      keyTermsPreview.classification !== "same"
    ) {
      notes.push("coreDb_visible_key_terms_richer");
    }

    if (
      contextMissingSources.classification === "meaningful_difference" ||
      contextAvailableSources.classification === "meaningful_difference"
    ) {
      notes.push("source_availability_differs_between_json_and_coredb");
    }

    const overallClassification = deriveOverallClassification({
      profile: selectedProfile,
      axis: mainMeaningAxisPreview,
      keyTerms: keyTermsPreview,
      translationDiffs: translationDifferencesPreview,
      weakDiffs: weakCorrespondencesPreview,
      sourceStatus: previewSourceStatus,
      notes
    });

    entries.push({
      verseKey: verse.verseKey,
      category: verse.category,
      expectedProfile: verse.expectedProfile ?? null,
      overallClassification,
      counts: {
        translations: classifyScalar(
          jsonContext.translations.length,
          coreDbContext.translations.length
        ),
        words: classifyScalar(jsonContext.wordByWord.length, coreDbContext.wordByWord.length),
        roots: classifyScalar(jsonContext.roots.length, coreDbContext.roots.length),
        lemmas: classifyScalar(jsonContext.lemmas.length, coreDbContext.lemmas.length)
      },
      selectedProfile,
      mainMeaningAxisPreview,
      keyTermsPreview,
      translationDifferencesPreview,
      weakCorrespondencesPreview,
      previewSourceStatus,
      contextAvailableSources,
      contextMissingSources,
      notes
    });
  }

  const sameProfileCount = entries.filter(
    (entry) => entry.selectedProfile.classification === "same"
  ).length;
  const meaningfulAxisDifferenceCount = entries.filter(
    (entry) => entry.mainMeaningAxisPreview.classification === "meaningful_difference"
  ).length;
  const richerKeyTermsCount = entries.filter((entry) =>
    entry.notes.includes("coreDb_visible_key_terms_richer")
  ).length;
  const noisierKeyTermsCount = entries.filter((entry) =>
    entry.notes.includes("coreDb_supporting_terms_look_noisier")
  ).length;

  const auditPayload = {
    comparedVerseCount: entries.length,
    sameProfileCount,
    meaningfulAxisDifferenceCount,
    richerKeyTermsCount,
    noisierKeyTermsCount,
    overallCounts: {
      same: countAuditClass(entries, "same"),
      minor_difference: countAuditClass(entries, "minor_difference"),
      meaningful_difference: countAuditClass(entries, "meaningful_difference"),
      missing_in_one_source: countAuditClass(entries, "missing_in_one_source"),
      preview_risk: countAuditClass(entries, "preview_risk")
    },
    entries
  };

  await mkdir(snapshotDirectory, { recursive: true });
  await mkdir(path.dirname(auditMarkdownPath), { recursive: true });
  await writeFile(auditSnapshotPath, `${JSON.stringify(auditPayload, null, 2)}\n`, "utf8");
  await writeFile(
    auditMarkdownPath,
    buildMarkdownReport({
      entries,
      sameProfileCount,
      meaningfulAxisDifferenceCount,
      richerKeyTermsCount,
      noisierKeyTermsCount
    }),
    "utf8"
  );

  console.log(JSON.stringify({ auditSnapshotPath, auditMarkdownPath }, null, 2));
  console.log(JSON.stringify({
    comparedVerseCount: entries.length,
    sameProfileCount,
    meaningfulAxisDifferenceCount,
    richerKeyTermsCount,
    noisierKeyTermsCount,
    overallCounts: auditPayload.overallCounts
  }, null, 2));
}

main().catch((error) => {
  console.error("audit-json-vs-coredb-consistency failed");
  console.error(error);
  process.exitCode = 1;
});
