import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import {
  buildVerseAnalysisEvidenceLayer,
  type EvidenceKind,
  type InternalConfidence,
  type RootEasyOnlyEntry
} from "../packages/core/src/analysis/verseAnalysisEvidenceLayer.ts";
import {
  classifyEvidenceConflict,
  type EvidenceConflictQualityClass
} from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";

type AyahClass =
  | "strongEvidenceAyah"
  | "weakEvidenceAyah"
  | "emptyEvidenceAyah"
  | "onlyDebugEvidenceAyah"
  | "conflictAffectedAyah"
  | "onlySingleSourceEvidenceAyah"
  | "missingKeyTermsAyah"
  | "missingRootExplanationAyah"
  | "lowCoverageAyah"
  | "riskyDropAyah"
  | "needsManualReviewAyah";

type SuggestedNextAction =
  | "noAction"
  | "inspectGate"
  | "keyTermRecoveryNeeded"
  | "rootExplanationNeeded"
  | "manualReviewNeeded"
  | "sourceDataNeeded";

interface ArabicVerse {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  status?: string;
}

interface AuditExample {
  verseKey: string;
  selectedProfile: string;
  classes: AyahClass[];
  suggestedNextAction: SuggestedNextAction;
  totalItems: number;
  userFacingAllowedCount: number;
  sourceSupportTwoPlusCount: number;
  conflictFlagCount: number;
  keyTermCount: number;
  rootCount: number;
  rootExplanationCount: number;
  coverageRatio: number | null;
  conflictQualityDistribution: Partial<Record<EvidenceConflictQualityClass, number>>;
  sampleConflicts: Array<{
    conflictType: string;
    qualityClass: EvidenceConflictQualityClass;
    displayValue: string;
  }>;
}

interface SlowestAyah {
  verseKey: string;
  totalMs: number;
  contextBuildMs: number;
  evidenceBuildMs: number;
  classificationMs: number;
}

interface GlobalAuditSnapshot {
  generatedAt: string;
  rules: {
    runtimeChanged: false;
    defaultSourceChanged: false;
    uiChanged: false;
    previewChanged: false;
    decisionChanged: false;
    v4DefaultEnabled: false;
    rootEasyOnlyRuntimeEnabled: false;
  };
  summary: {
    totalAyahs: number;
    processedAyahs: number;
    failedAyahs: number;
    totalEvidenceItems: number;
    kindDistribution: Record<EvidenceKind, number>;
    internalConfidenceDistribution: Record<InternalConfidence, number>;
    conflictFlagCount: number;
    conflictTypeDistribution: Record<string, number>;
    conflictQualityDistribution: Record<EvidenceConflictQualityClass, number>;
    affectedByConflictAyahCount: number;
    singleSourceItemCount: number;
    sourceSupportTwoPlusItemCount: number;
    userFacingAllowed: { true: number; false: number };
    debugOnlyCount: number;
    v4ContributionCount: number;
    rootEasyOnlyContributionCount: number;
    sourceUsage: Record<string, number>;
    ayahClassDistribution: Record<AyahClass, number>;
    suggestedNextActionDistribution: Record<SuggestedNextAction, number>;
    lowCoverageThreshold: number;
    auditMode: "limit" | "all";
    requestedLimit: number | null;
    performance: {
      elapsedMs: number;
      averageMsPerAyah: number;
      contextBuildMs: number;
      evidenceBuildMs: number;
      classificationMs: number;
      averageContextBuildMsPerAyah: number;
      averageEvidenceBuildMsPerAyah: number;
      averageClassificationMsPerAyah: number;
    };
  };
  examples: {
    emptyEvidenceAyahs: AuditExample[];
    weakEvidenceAyahs: AuditExample[];
    conflictAffectedAyahs: AuditExample[];
    riskyDropAyahs: AuditExample[];
    needsManualReviewAyahs: AuditExample[];
    missingKeyTermsAyahs: AuditExample[];
    missingRootExplanationAyahs: AuditExample[];
    lowCoverageAyahs: AuditExample[];
    failedAyahs: Array<{ verseKey: string; error: string }>;
    slowestAyahs: SlowestAyah[];
  };
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
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const lowCoverageThreshold = 0.8;
const exampleLimit = 50;
const slowestAyahLimit = 20;

function toVerseKey(surahId: number, ayahNumber: number): string {
  return `${surahId}:${ayahNumber}`;
}

function increment<T extends string>(record: Record<T, number>, key: T, amount = 1): void {
  record[key] = (record[key] ?? 0) + amount;
}

function emptyKindDistribution(): Record<EvidenceKind, number> {
  return {
    keyTerm: 0,
    root: 0,
    lemma: 0,
    rootExplanation: 0,
    weakCorrespondence: 0,
    coverage: 0,
    sourceStatus: 0,
    translationCoverage: 0,
    limitedContext: 0
  };
}

function emptyConfidenceDistribution(): Record<InternalConfidence, number> {
  return {
    low: 0,
    medium: 0,
    high: 0
  };
}

function emptyAyahClassDistribution(): Record<AyahClass, number> {
  return {
    strongEvidenceAyah: 0,
    weakEvidenceAyah: 0,
    emptyEvidenceAyah: 0,
    onlyDebugEvidenceAyah: 0,
    conflictAffectedAyah: 0,
    onlySingleSourceEvidenceAyah: 0,
    missingKeyTermsAyah: 0,
    missingRootExplanationAyah: 0,
    lowCoverageAyah: 0,
    riskyDropAyah: 0,
    needsManualReviewAyah: 0
  };
}

function emptyActionDistribution(): Record<SuggestedNextAction, number> {
  return {
    noAction: 0,
    inspectGate: 0,
    keyTermRecoveryNeeded: 0,
    rootExplanationNeeded: 0,
    manualReviewNeeded: 0,
    sourceDataNeeded: 0
  };
}

function emptyConflictQualityDistribution(): Record<EvidenceConflictQualityClass, number> {
  return {
    likelyGoodSuppression: 0,
    likelyUsefulV4Addition: 0,
    likelyRiskyDrop: 0,
    genericNeutral: 0,
    needsManualReview: 0
  };
}

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function parseCoverageRatio(values: string[]): number | null {
  for (const value of values) {
    const match = value.match(/coverageRatio=([0-9.]+)/u);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pushLimited<T>(list: T[], value: T, limit = exampleLimit): void {
  if (list.length < limit) {
    list.push(value);
  }
}

function trackSlowestAyah(list: SlowestAyah[], value: SlowestAyah): void {
  list.push(value);
  list.sort((left, right) => right.totalMs - left.totalMs);

  if (list.length > slowestAyahLimit) {
    list.length = slowestAyahLimit;
  }
}

function nowMs(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

function parseArgs(): { limit: number | null; mode: "limit" | "all" } {
  const args = process.argv.slice(2);
  const allRequested = args.includes("--all");
  const limitArg = args.find((arg) => arg.startsWith("--limit="));

  if (allRequested) {
    return { limit: null, mode: "all" };
  }

  if (limitArg) {
    const rawLimit = Number(limitArg.split("=")[1]);

    if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
      throw new Error(`Invalid --limit value: ${limitArg}`);
    }

    return { limit: rawLimit, mode: "limit" };
  }

  return { limit: 100, mode: "limit" };
}

function buildOutputPaths(mode: "limit" | "all", limit: number | null): { snapshotPath: string; markdownPath: string } {
  if (mode === "all") {
    return {
      snapshotPath: path.join(snapshotDirectory, "vnext-evidence-layer-global-audit.json"),
      markdownPath: path.join(workspaceRoot, "docs", "VNEXT_EVIDENCE_LAYER_GLOBAL_AUDIT.md")
    };
  }

  const suffix = `limit-${limit ?? 100}`;
  return {
    snapshotPath: path.join(snapshotDirectory, `vnext-evidence-layer-global-audit.${suffix}.json`),
    markdownPath: path.join(workspaceRoot, "docs", `VNEXT_EVIDENCE_LAYER_GLOBAL_AUDIT.${suffix}.md`)
  };
}

function chooseSuggestedNextAction(classes: Set<AyahClass>): SuggestedNextAction {
  if (classes.has("needsManualReviewAyah") || classes.has("riskyDropAyah")) {
    return "manualReviewNeeded";
  }
  if (classes.has("missingKeyTermsAyah")) {
    return "keyTermRecoveryNeeded";
  }
  if (classes.has("missingRootExplanationAyah")) {
    return "rootExplanationNeeded";
  }
  if (classes.has("emptyEvidenceAyah") || classes.has("lowCoverageAyah")) {
    return "sourceDataNeeded";
  }
  if (classes.has("weakEvidenceAyah") || classes.has("conflictAffectedAyah") || classes.has("onlySingleSourceEvidenceAyah")) {
    return "inspectGate";
  }
  return "noAction";
}

function buildMarkdown(snapshot: GlobalAuditSnapshot): string {
  const kindLines = Object.entries(snapshot.summary.kindDistribution)
    .map(([kind, count]) => `- \`${kind}\`: ${count}`)
    .join("\n");
  const confidenceLines = Object.entries(snapshot.summary.internalConfidenceDistribution)
    .map(([confidence, count]) => `- \`${confidence}\`: ${count}`)
    .join("\n");
  const conflictTypeLines = Object.entries(snapshot.summary.conflictTypeDistribution)
    .sort((left, right) => right[1] - left[1])
    .map(([type, count]) => `- \`${type}\`: ${count}`)
    .join("\n");
  const qualityLines = Object.entries(snapshot.summary.conflictQualityDistribution)
    .map(([quality, count]) => `- \`${quality}\`: ${count}`)
    .join("\n");
  const classLines = Object.entries(snapshot.summary.ayahClassDistribution)
    .map(([className, count]) => `- \`${className}\`: ${count}`)
    .join("\n");
  const actionLines = Object.entries(snapshot.summary.suggestedNextActionDistribution)
    .map(([action, count]) => `- \`${action}\`: ${count}`)
    .join("\n");
  const sourceLines = Object.entries(snapshot.summary.sourceUsage)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([source, count]) => `- \`${source}\`: ${count}`)
    .join("\n");

  const exampleLines = (items: AuditExample[]) =>
    items
      .slice(0, 20)
      .map(
        (item) =>
          `- \`${item.verseKey}\` (${item.selectedProfile}): items=${item.totalItems}, userFacing=${item.userFacingAllowedCount}, conflicts=${item.conflictFlagCount}, action=${item.suggestedNextAction}`
      )
      .join("\n") || "- Yok";

  return `# vNext Evidence Layer Global Audit

Bu rapor vNext Evidence Layer'in tum ayetler uzerinde inspect-only global audit sonucudur. Runtime, UI, default source, decision ve preview davranisi degistirilmedi. \`canonical_word_analysis_v4\` ve \`root_explanations_tr_v2_easy_only\` yalniz opt-in evidence source olarak kullanildi.

## Kapsam

- Toplam ayet: ${snapshot.summary.totalAyahs}
- Islenen ayet: ${snapshot.summary.processedAyahs}
- Hata veren ayet: ${snapshot.summary.failedAyahs}
- Audit modu: ${snapshot.summary.auditMode}${snapshot.summary.requestedLimit ? ` (${snapshot.summary.requestedLimit})` : ""}
- Runtime/default source degisti mi?: hayir
- UI degisti mi?: hayir
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Global Metrikler

- Toplam evidence item: ${snapshot.summary.totalEvidenceItems}
- Conflict flag toplami: ${snapshot.summary.conflictFlagCount}
- Conflict etkilenen ayet: ${snapshot.summary.affectedByConflictAyahCount}
- Single-source item: ${snapshot.summary.singleSourceItemCount}
- Source support 2+ item: ${snapshot.summary.sourceSupportTwoPlusItemCount}
- User-facing allowed true: ${snapshot.summary.userFacingAllowed.true}
- User-facing allowed false: ${snapshot.summary.userFacingAllowed.false}
- Debug-only item: ${snapshot.summary.debugOnlyCount}
- v4 katkisi: ${snapshot.summary.v4ContributionCount}
- root_easy_only katkisi: ${snapshot.summary.rootEasyOnlyContributionCount}

## Performans

- Toplam sure: ${(snapshot.summary.performance.elapsedMs / 1000).toFixed(1)} sn
- Ortalama: ${snapshot.summary.performance.averageMsPerAyah.toFixed(1)} ms/ayet
- Context build toplam: ${(snapshot.summary.performance.contextBuildMs / 1000).toFixed(1)} sn
- Evidence build toplam: ${(snapshot.summary.performance.evidenceBuildMs / 1000).toFixed(1)} sn
- Classification toplam: ${(snapshot.summary.performance.classificationMs / 1000).toFixed(1)} sn
- Context build ortalama: ${snapshot.summary.performance.averageContextBuildMsPerAyah.toFixed(1)} ms/ayet
- Evidence build ortalama: ${snapshot.summary.performance.averageEvidenceBuildMsPerAyah.toFixed(1)} ms/ayet
- Classification ortalama: ${snapshot.summary.performance.averageClassificationMsPerAyah.toFixed(1)} ms/ayet

## Evidence Kind Dagilimi

${kindLines}

## Internal Confidence Dagilimi

${confidenceLines}

## Conflict Tur Dagilimi

${conflictTypeLines || "- Yok"}

## Conflict Quality Dagilimi

${qualityLines}

## Ayet Kalite Siniflari

${classLines}

## Suggested Next Action Dagilimi

${actionLines}

## En Cok Kullanilan Source ID'ler

${sourceLines || "- Yok"}

## Ornekler

### Empty Evidence Ayetleri

${exampleLines(snapshot.examples.emptyEvidenceAyahs)}

### Weak Evidence Ayetleri

${exampleLines(snapshot.examples.weakEvidenceAyahs)}

### Conflict Etkilenen Ayetler

${exampleLines(snapshot.examples.conflictAffectedAyahs)}

### Risky Drop Ayetleri

${exampleLines(snapshot.examples.riskyDropAyahs)}

### Missing Root Explanation Ayetleri

${exampleLines(snapshot.examples.missingRootExplanationAyahs)}

## Kisa Yorum

- Bu audit kullanici-facing yeni analiz cumlesi uretmez.
- Internal confidence, source support, conflict ve trace bilgileri sadece audit/debug icindir.
- v4 ve root_easy_only kaynaklari default veya runtime kaynagi yapilmadi.

## En Kucuk Guvenli Sonraki Adim

Global sonuc uzerinden en baskin risk sinifini secip sadece opt-in evidence gate icin kucuk bir iyilestirme paketi hazirlamak. Ozellikle \`riskyDropAyah\`, \`needsManualReviewAyah\` ve \`missingRootExplanationAyah\` dagilimlari karar icin ana sinyaldir.
`;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const startedAtMs = nowMs();
  const args = parseArgs();
  const { snapshotPath, markdownPath } = buildOutputPaths(args.mode, args.limit);
  const [arabicVerses, rootEasyOnly] = await Promise.all([
    readFile(arabicPath, "utf8").then((content) => JSON.parse(content) as ArabicVerse[]),
    readFile(rootEasyOnlyPath, "utf8").then((content) => JSON.parse(content) as RootEasyOnlyEntry[])
  ]);
  const targetVerses = args.limit === null ? arabicVerses : arabicVerses.slice(0, args.limit);

  const kindDistribution = emptyKindDistribution();
  const confidenceDistribution = emptyConfidenceDistribution();
  const conflictQualityDistribution = emptyConflictQualityDistribution();
  const ayahClassDistribution = emptyAyahClassDistribution();
  const suggestedNextActionDistribution = emptyActionDistribution();
  const sourceUsage: Record<string, number> = {};
  const conflictTypeDistribution: Record<string, number> = {};

  const examples: GlobalAuditSnapshot["examples"] = {
    emptyEvidenceAyahs: [],
    weakEvidenceAyahs: [],
    conflictAffectedAyahs: [],
    riskyDropAyahs: [],
    needsManualReviewAyahs: [],
    missingKeyTermsAyahs: [],
    missingRootExplanationAyahs: [],
    lowCoverageAyahs: [],
    failedAyahs: [],
    slowestAyahs: []
  };

  let processedAyahs = 0;
  let failedAyahs = 0;
  let totalEvidenceItems = 0;
  let conflictFlagCount = 0;
  let affectedByConflictAyahCount = 0;
  let singleSourceItemCount = 0;
  let sourceSupportTwoPlusItemCount = 0;
  let userFacingAllowedTrue = 0;
  let userFacingAllowedFalse = 0;
  let debugOnlyCount = 0;
  let v4ContributionCount = 0;
  let rootEasyOnlyContributionCount = 0;
  let totalContextBuildMs = 0;
  let totalEvidenceBuildMs = 0;
  let totalClassificationMs = 0;

  for (const [index, verse] of targetVerses.entries()) {
    const verseKey = toVerseKey(verse.surahId, verse.ayahNumber);
    const ayahStartMs = nowMs();
    let contextBuildMs = 0;
    let evidenceBuildMs = 0;
    let classificationMs = 0;

    try {
      const contextStartMs = nowMs();
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
      contextBuildMs = nowMs() - contextStartMs;
      totalContextBuildMs += contextBuildMs;

      const evidenceStartMs = nowMs();
      const evidenceLayer = buildVerseAnalysisEvidenceLayer(context, {
        v4Context,
        rootEasyOnly
      });
      evidenceBuildMs = nowMs() - evidenceStartMs;
      totalEvidenceBuildMs += evidenceBuildMs;

      const classificationStartMs = nowMs();

      processedAyahs += 1;
      totalEvidenceItems += evidenceLayer.summary.totalItems;
      conflictFlagCount += evidenceLayer.summary.conflictFlagCount;
      singleSourceItemCount += evidenceLayer.summary.singleSourceItemCount;
      sourceSupportTwoPlusItemCount += evidenceLayer.summary.sourceSupportTwoPlusCount;
      userFacingAllowedTrue += evidenceLayer.summary.userFacingAllowedCount;
      userFacingAllowedFalse += evidenceLayer.summary.userFacingBlockedCount;
      debugOnlyCount += evidenceLayer.summary.debugOnlyCount;

      for (const [kind, count] of Object.entries(evidenceLayer.summary.kindDistribution) as Array<[EvidenceKind, number]>) {
        increment(kindDistribution, kind, count);
      }
      for (const [confidence, count] of Object.entries(evidenceLayer.summary.internalConfidenceDistribution) as Array<
        [InternalConfidence, number]
      >) {
        increment(confidenceDistribution, confidence, count);
      }

      const conflictQualityForAyah = emptyConflictQualityDistribution();
      const sampleConflicts: AuditExample["sampleConflicts"] = [];
      const coverageRatio = parseCoverageRatio(
        evidenceLayer.items.filter((item) => item.kind === "coverage").map((item) => item.value)
      );

      for (const item of evidenceLayer.items) {
        if (item.sourceIds.includes("canonical_word_analysis_v4")) {
          v4ContributionCount += 1;
        }
        if (item.sourceIds.includes("root_easy_only")) {
          rootEasyOnlyContributionCount += 1;
        }
        for (const sourceId of item.sourceIds) {
          sourceUsage[sourceId] = (sourceUsage[sourceId] ?? 0) + 1;
        }
        for (const conflict of item.conflictFlags) {
          conflictTypeDistribution[conflict.type] = (conflictTypeDistribution[conflict.type] ?? 0) + 1;
          const quality = classifyEvidenceConflict({
            conflictType: conflict.type,
            value: item.value,
            selectedProfile: evidenceLayer.selectedProfile
          }).qualityClass;
          conflictQualityDistribution[quality] += 1;
          conflictQualityForAyah[quality] += 1;
          pushLimited(sampleConflicts, {
            conflictType: conflict.type,
            qualityClass: quality,
            displayValue: displayValue(item.value)
          }, 5);
        }
      }

      const keyTermCount = evidenceLayer.summary.kindDistribution.keyTerm;
      const rootCount = evidenceLayer.summary.kindDistribution.root;
      const rootExplanationCount = evidenceLayer.summary.kindDistribution.rootExplanation;
      const classes = new Set<AyahClass>();

      if (evidenceLayer.summary.totalItems === 0) {
        classes.add("emptyEvidenceAyah");
      }
      if (evidenceLayer.summary.userFacingAllowedCount === 0 && evidenceLayer.summary.totalItems > 0) {
        classes.add("onlyDebugEvidenceAyah");
      }
      if (evidenceLayer.summary.conflictFlagCount > 0) {
        classes.add("conflictAffectedAyah");
        affectedByConflictAyahCount += 1;
      }
      if (evidenceLayer.summary.sourceSupportTwoPlusCount === 0) {
        classes.add("onlySingleSourceEvidenceAyah");
      }
      if (keyTermCount === 0) {
        classes.add("missingKeyTermsAyah");
      }
      if (rootCount > 0 && rootExplanationCount < rootCount) {
        classes.add("missingRootExplanationAyah");
      }
      if (coverageRatio !== null && coverageRatio < lowCoverageThreshold) {
        classes.add("lowCoverageAyah");
      }
      if (conflictQualityForAyah.likelyRiskyDrop > 0) {
        classes.add("riskyDropAyah");
      }
      if (conflictQualityForAyah.needsManualReview > 0) {
        classes.add("needsManualReviewAyah");
      }
      if (
        evidenceLayer.summary.userFacingAllowedCount > 0 &&
        evidenceLayer.summary.sourceSupportTwoPlusCount > 0 &&
        evidenceLayer.summary.conflictFlagCount === 0 &&
        keyTermCount > 0
      ) {
        classes.add("strongEvidenceAyah");
      }
      if (
        !classes.has("emptyEvidenceAyah") &&
        (evidenceLayer.summary.userFacingAllowedCount === 0 ||
          evidenceLayer.summary.sourceSupportTwoPlusCount === 0 ||
          evidenceLayer.summary.conflictFlagCount > 0 ||
          keyTermCount === 0)
      ) {
        classes.add("weakEvidenceAyah");
      }

      const suggestedNextAction = chooseSuggestedNextAction(classes);
      increment(suggestedNextActionDistribution, suggestedNextAction);
      for (const className of classes) {
        increment(ayahClassDistribution, className);
      }

      const example: AuditExample = {
        verseKey,
        selectedProfile: evidenceLayer.selectedProfile,
        classes: Array.from(classes),
        suggestedNextAction,
        totalItems: evidenceLayer.summary.totalItems,
        userFacingAllowedCount: evidenceLayer.summary.userFacingAllowedCount,
        sourceSupportTwoPlusCount: evidenceLayer.summary.sourceSupportTwoPlusCount,
        conflictFlagCount: evidenceLayer.summary.conflictFlagCount,
        keyTermCount,
        rootCount,
        rootExplanationCount,
        coverageRatio,
        conflictQualityDistribution: Object.fromEntries(
          Object.entries(conflictQualityForAyah).filter(([, count]) => count > 0)
        ) as Partial<Record<EvidenceConflictQualityClass, number>>,
        sampleConflicts
      };

      if (classes.has("emptyEvidenceAyah")) pushLimited(examples.emptyEvidenceAyahs, example);
      if (classes.has("weakEvidenceAyah")) pushLimited(examples.weakEvidenceAyahs, example);
      if (classes.has("conflictAffectedAyah")) pushLimited(examples.conflictAffectedAyahs, example);
      if (classes.has("riskyDropAyah")) pushLimited(examples.riskyDropAyahs, example);
      if (classes.has("needsManualReviewAyah")) pushLimited(examples.needsManualReviewAyahs, example);
      if (classes.has("missingKeyTermsAyah")) pushLimited(examples.missingKeyTermsAyahs, example);
      if (classes.has("missingRootExplanationAyah")) pushLimited(examples.missingRootExplanationAyahs, example);
      if (classes.has("lowCoverageAyah")) pushLimited(examples.lowCoverageAyahs, example);
      classificationMs = nowMs() - classificationStartMs;
      totalClassificationMs += classificationMs;
    } catch (error) {
      failedAyahs += 1;
      pushLimited(examples.failedAyahs, {
        verseKey,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      const totalMs = nowMs() - ayahStartMs;
      trackSlowestAyah(examples.slowestAyahs, {
        verseKey,
        totalMs,
        contextBuildMs,
        evidenceBuildMs,
        classificationMs
      });
    }

    if ((index + 1) % 100 === 0 || index + 1 === targetVerses.length) {
      const elapsedMs = nowMs() - startedAtMs;
      const averageMsPerAyah = elapsedMs / (index + 1);
      console.log(
        `processed ${index + 1}/${targetVerses.length} ayahs in ${(elapsedMs / 1000).toFixed(1)}s; avg=${averageMsPerAyah.toFixed(1)}ms/ayah; contextAvg=${(totalContextBuildMs / Math.max(processedAyahs, 1)).toFixed(1)}ms; evidenceAvg=${(totalEvidenceBuildMs / Math.max(processedAyahs, 1)).toFixed(1)}ms; classificationAvg=${(totalClassificationMs / Math.max(processedAyahs, 1)).toFixed(1)}ms`
      );
    }
  }

  const elapsedMs = nowMs() - startedAtMs;
  const averageMsPerAyah = processedAyahs > 0 ? elapsedMs / processedAyahs : 0;

  const snapshot: GlobalAuditSnapshot = {
    generatedAt: new Date().toISOString(),
    rules: {
      runtimeChanged: false,
      defaultSourceChanged: false,
      uiChanged: false,
      previewChanged: false,
      decisionChanged: false,
      v4DefaultEnabled: false,
      rootEasyOnlyRuntimeEnabled: false
    },
    summary: {
      totalAyahs: targetVerses.length,
      processedAyahs,
      failedAyahs,
      totalEvidenceItems,
      kindDistribution,
      internalConfidenceDistribution: confidenceDistribution,
      conflictFlagCount,
      conflictTypeDistribution,
      conflictQualityDistribution,
      affectedByConflictAyahCount,
      singleSourceItemCount,
      sourceSupportTwoPlusItemCount,
      userFacingAllowed: {
        true: userFacingAllowedTrue,
        false: userFacingAllowedFalse
      },
      debugOnlyCount,
      v4ContributionCount,
      rootEasyOnlyContributionCount,
      sourceUsage,
      ayahClassDistribution,
      suggestedNextActionDistribution,
      lowCoverageThreshold,
      auditMode: args.mode,
      requestedLimit: args.limit,
      performance: {
        elapsedMs,
        averageMsPerAyah,
        contextBuildMs: totalContextBuildMs,
        evidenceBuildMs: totalEvidenceBuildMs,
        classificationMs: totalClassificationMs,
        averageContextBuildMsPerAyah: processedAyahs > 0 ? totalContextBuildMs / processedAyahs : 0,
        averageEvidenceBuildMsPerAyah: processedAyahs > 0 ? totalEvidenceBuildMs / processedAyahs : 0,
        averageClassificationMsPerAyah: processedAyahs > 0 ? totalClassificationMs / processedAyahs : 0
      }
    },
    examples
  };

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, buildMarkdown(snapshot), "utf8");

  console.log(
    JSON.stringify(
      {
        snapshotPath,
        markdownPath,
        processedAyahs,
        failedAyahs,
        totalEvidenceItems,
        conflictFlagCount,
        affectedByConflictAyahCount,
        ayahClassDistribution,
        suggestedNextActionDistribution,
        slowestAyahs: examples.slowestAyahs,
        performance: snapshot.summary.performance,
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1000)
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
