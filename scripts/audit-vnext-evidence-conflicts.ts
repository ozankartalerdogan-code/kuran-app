import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyEvidenceConflict,
  type EvidenceConflictQualityClass,
  type EvidenceConflictReasonCode,
  type EvidenceConflictTermFamily
} from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";

interface ConflictFlag {
  type: string;
  sourceIds: string[];
  note: string;
}

interface EvidenceItem {
  kind: string;
  value: string;
  normalizedValue: string;
  sourceIds: string[];
  sourceSupportCount: number;
  conflictFlags: ConflictFlag[];
  userFacingAllowed: boolean;
  debugOnly: boolean;
}

interface EvidenceEntry {
  setName: string;
  verseKey: string;
  selectedProfile: string;
  items: EvidenceItem[];
}

interface EvidenceSnapshot {
  generatedAt: string;
  summary: {
    conflictFlagCount: number;
    conflictTypeDistribution: Record<string, number>;
  };
  entries: EvidenceEntry[];
}

interface ConflictAuditRow {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  selectedProfile: string;
  evidenceKind: string;
  conflictType: string;
  value: string;
  displayValue: string;
  normalizedValue: string;
  defaultJsonStatus: "present" | "absent" | "unknown";
  v4Status: "present" | "absent" | "unknown";
  userFacingAllowed: boolean;
  sourceSupportCount: number;
  sourceIds: string[];
  qualityClass: EvidenceConflictQualityClass;
  reasonCode: EvidenceConflictReasonCode;
  termFamily: EvidenceConflictTermFamily;
  isGeneric: boolean;
  isContent: boolean;
  isProfileRelevant: boolean;
}

interface ConflictAuditSnapshot {
  generatedAt: string;
  inputSnapshot: string;
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
    totalConflicts: number;
    affectedVerseCount: number;
    conflictTypeDistribution: Record<string, number>;
    qualityDistribution: Record<EvidenceConflictQualityClass, number>;
    reasonCodeDistribution: Record<string, number>;
    termFamilyDistribution: Record<string, number>;
    conflictsByVerse: Record<string, number>;
    genericNeutralCount: number;
    usefulContentTermCount: number;
  };
  conflicts: ConflictAuditRow[];
  riskiestExamples: ConflictAuditRow[];
  bestSuppressionExamples: ConflictAuditRow[];
  usefulV4AdditionExamples: ConflictAuditRow[];
  genericNeutralExamples: ConflictAuditRow[];
  manualReviewExamples: ConflictAuditRow[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const inputSnapshotPath = path.join(
  workspaceRoot,
  "data",
  "analysis-snapshots",
  "vnext-evidence-layer.v2-sources.sample.json"
);
const outputDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const outputSnapshotPath = path.join(
  outputDirectory,
  "vnext-evidence-layer-conflict-audit.sample.json"
);
const markdownPath = path.join(workspaceRoot, "docs", "VNEXT_EVIDENCE_LAYER_CONFLICT_AUDIT.md");

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function parseVerseKey(verseKey: string): { surahId: number; ayahNumber: number } {
  const [surahId, ayahNumber] = verseKey.split(":").map((part) => Number(part));
  return { surahId, ayahNumber };
}

function sourceStatusFor(conflictType: string): Pick<ConflictAuditRow, "defaultJsonStatus" | "v4Status"> {
  if (conflictType === "keyTermOnlyInV4") {
    return { defaultJsonStatus: "absent", v4Status: "present" };
  }
  if (conflictType === "keyTermMissingInV4" || conflictType === "profileRelevantTermDropped") {
    return { defaultJsonStatus: "present", v4Status: "absent" };
  }
  return { defaultJsonStatus: "unknown", v4Status: "unknown" };
}

function countBy<T extends string>(rows: ConflictAuditRow[], selector: (row: ConflictAuditRow) => T): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const row of rows) {
    const key = selector(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function emptyQualityDistribution(): Record<EvidenceConflictQualityClass, number> {
  return {
    likelyGoodSuppression: 0,
    likelyUsefulV4Addition: 0,
    likelyRiskyDrop: 0,
    genericNeutral: 0,
    needsManualReview: 0
  };
}

function topRows(
  rows: ConflictAuditRow[],
  qualityClass: EvidenceConflictQualityClass,
  limit: number
): ConflictAuditRow[] {
  return rows
    .filter((row) => row.qualityClass === qualityClass)
    .sort((left, right) => {
      if (left.conflictType === "profileRelevantTermDropped" && right.conflictType !== "profileRelevantTermDropped") {
        return -1;
      }
      if (right.conflictType === "profileRelevantTermDropped" && left.conflictType !== "profileRelevantTermDropped") {
        return 1;
      }
      return left.verseKey.localeCompare(right.verseKey, "tr");
    })
    .slice(0, limit);
}

function rowLine(row: ConflictAuditRow): string {
  return `- \`${row.verseKey}\` (${row.selectedProfile}, ${row.conflictType}): ${row.displayValue} -> ${row.qualityClass} / ${row.reasonCode}`;
}

function buildMarkdown(snapshot: ConflictAuditSnapshot): string {
  const typeLines = Object.entries(snapshot.summary.conflictTypeDistribution)
    .map(([type, count]) => `- \`${type}\`: ${count}`)
    .join("\n");
  const qualityLines = Object.entries(snapshot.summary.qualityDistribution)
    .map(([quality, count]) => `- \`${quality}\`: ${count}`)
    .join("\n");
  const reasonLines = Object.entries(snapshot.summary.reasonCodeDistribution)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([reason, count]) => `- \`${reason}\`: ${count}`)
    .join("\n");
  const familyLines = Object.entries(snapshot.summary.termFamilyDistribution)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([family, count]) => `- \`${family}\`: ${count}`)
    .join("\n");
  const verseLines = Object.entries(snapshot.summary.conflictsByVerse)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([verseKey, count]) => `- \`${verseKey}\`: ${count}`)
    .join("\n");

  return `# vNext Evidence Layer Conflict Audit

Bu rapor \`vnext-evidence-layer.v2-sources.sample.json\` snapshot'indaki keyTerm conflict flag'lerini ortak conflict classifier ile siniflandirir. Runtime, UI, default source, decision ve preview davranisi degistirilmedi.

## Kapsam

- Toplam conflict: ${snapshot.summary.totalConflicts}
- Incelenen ayet sayisi: ${snapshot.summary.affectedVerseCount}
- Evidence kind: keyTerm conflict'leri
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Conflict Tur Dagilimi

${typeLines || "- Yok"}

## Kalite Siniflandirmasi

${qualityLines || "- Yok"}

## Reason Code Dagilimi

${reasonLines || "- Yok"}

## Term Family Dagilimi

${familyLines || "- Yok"}

## Conflict Yogun Ayetler

${verseLines || "- Yok"}

## En Riskli 10 Ornek

${snapshot.riskiestExamples.map(rowLine).join("\n") || "- Yok"}

## En Iyi v4 Temizlik Ornekleri

${snapshot.bestSuppressionExamples.map(rowLine).join("\n") || "- Yok"}

## Faydalı v4 Ekleme Ornekleri

${snapshot.usefulV4AdditionExamples.map(rowLine).join("\n") || "- Yok"}

## Generic Neutral Ornekleri

${snapshot.genericNeutralExamples.map(rowLine).join("\n") || "- Yok"}

## Manual Review Ornekleri

${snapshot.manualReviewExamples.map(rowLine).join("\n") || "- Yok"}

## Kisa Yorum

- \`genericNeutral\`: Allah/Rab, isaret zamiri, edat, zaman/formula gibi dogrudan risk sayilmayan generic durumlar.
- \`likelyUsefulV4Addition\`: v4'un yeni anlam tasiyici content term ekledigi durumlar.
- \`likelyRiskyDrop\`: v4'un profile bagli faydali terimi dusurmus olabilecegi durumlar.
- \`needsManualReview\`: ortak helper'a gore hala net siniflanamayan durumlar.

## Karar

Bu audit kullanici-facing analiz uretmez. Yeni classifier yalniz audit gurultusunu azaltmak ve v4 default kararina giden gercek risk listesini netlestirmek icindir.
`;
}

async function main(): Promise<void> {
  const inputSnapshot = JSON.parse(await readFile(inputSnapshotPath, "utf8")) as EvidenceSnapshot;
  const conflicts: ConflictAuditRow[] = [];

  for (const entry of inputSnapshot.entries) {
    const { surahId, ayahNumber } = parseVerseKey(entry.verseKey);
    for (const item of entry.items) {
      for (const flag of item.conflictFlags ?? []) {
        const sourceStatus = sourceStatusFor(flag.type);
        const classification = classifyEvidenceConflict({
          conflictType: flag.type,
          value: item.value,
          selectedProfile: entry.selectedProfile
        });

        conflicts.push({
          verseKey: entry.verseKey,
          surahId,
          ayahNumber,
          selectedProfile: entry.selectedProfile,
          evidenceKind: item.kind,
          conflictType: flag.type,
          value: item.value,
          displayValue: displayValue(item.value),
          normalizedValue: item.normalizedValue,
          defaultJsonStatus: sourceStatus.defaultJsonStatus,
          v4Status: sourceStatus.v4Status,
          userFacingAllowed: item.userFacingAllowed,
          sourceSupportCount: item.sourceSupportCount,
          sourceIds: item.sourceIds,
          qualityClass: classification.qualityClass,
          reasonCode: classification.reasonCode,
          termFamily: classification.termFamily,
          isGeneric: classification.isGeneric,
          isContent: classification.isContent,
          isProfileRelevant: classification.isProfileRelevant
        });
      }
    }
  }

  const qualityDistribution = emptyQualityDistribution();
  for (const row of conflicts) {
    qualityDistribution[row.qualityClass] += 1;
  }

  const output: ConflictAuditSnapshot = {
    generatedAt: new Date().toISOString(),
    inputSnapshot: path.relative(workspaceRoot, inputSnapshotPath).replace(/\\/gu, "/"),
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
      totalConflicts: conflicts.length,
      affectedVerseCount: new Set(conflicts.map((row) => row.verseKey)).size,
      conflictTypeDistribution: countBy(conflicts, (row) => row.conflictType),
      qualityDistribution,
      reasonCodeDistribution: countBy(conflicts, (row) => row.reasonCode),
      termFamilyDistribution: countBy(conflicts, (row) => row.termFamily),
      conflictsByVerse: countBy(conflicts, (row) => row.verseKey),
      genericNeutralCount: conflicts.filter((row) => row.qualityClass === "genericNeutral").length,
      usefulContentTermCount: conflicts.filter((row) => row.isContent).length
    },
    conflicts,
    riskiestExamples: topRows(conflicts, "likelyRiskyDrop", 10),
    bestSuppressionExamples: topRows(conflicts, "likelyGoodSuppression", 10),
    usefulV4AdditionExamples: topRows(conflicts, "likelyUsefulV4Addition", 10),
    genericNeutralExamples: topRows(conflicts, "genericNeutral", 10),
    manualReviewExamples: topRows(conflicts, "needsManualReview", 10)
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputSnapshotPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, buildMarkdown(output), "utf8");

  console.log("vNext evidence conflict audit complete");
  console.log(`input conflicts: ${inputSnapshot.summary.conflictFlagCount}`);
  console.log(`classified conflicts: ${output.summary.totalConflicts}`);
  console.log(`affected verses: ${output.summary.affectedVerseCount}`);
  console.log(`quality distribution: ${JSON.stringify(output.summary.qualityDistribution)}`);
  console.log(`snapshot: ${path.relative(workspaceRoot, outputSnapshotPath)}`);
  console.log(`report: ${path.relative(workspaceRoot, markdownPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
