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
  type EvidenceConflictTermFamily
} from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";

interface ArabicVerse {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  status?: string;
}

interface GlobalAuditSnapshotSummary {
  generatedAt?: string;
  summary?: {
    processedAyahs?: number;
    failedAyahs?: number;
    conflictQualityDistribution?: Record<string, number>;
  };
}

interface GroupExample {
  verseKey: string;
  selectedProfile: string;
  conflictType: string;
  displayValue: string;
  sourceIds: string[];
  sourceSupportCount: number;
}

interface ManualReviewGroup {
  normalizedValue: string;
  termFamily: EvidenceConflictTermFamily;
  displayValue: string;
  count: number;
  conflictTypeDistribution: Record<string, number>;
  selectedProfileDistribution: Record<string, number>;
  examples: GroupExample[];
  decision: {
    classifyAs: "genericNeutral" | "likelyUsefulV4Addition" | "likelyRiskyDrop" | "keepNeedsManualReview" | "";
    note: string;
  };
}

interface ManualReviewGroupsSnapshot {
  generatedAt: string;
  inputGlobalAudit: {
    path: string;
    generatedAt: string | null;
    processedAyahs: number | null;
    failedAyahs: number | null;
    reportedNeedsManualReviewConflicts: number | null;
  };
  rules: {
    runtimeChanged: false;
    defaultSourceChanged: false;
    uiChanged: false;
    previewChanged: false;
    decisionChanged: false;
    v4DefaultEnabled: false;
    sourceDataOverwritten: false;
    classifierChanged: false;
  };
  summary: {
    processedAyahs: number;
    failedAyahs: number;
    totalNeedsManualReviewConflicts: number;
    uniqueNormalizedTermCount: number;
    uniqueGroupCount: number;
    termFamilyDistribution: Record<string, number>;
    conflictTypeDistribution: Record<string, number>;
    top20Terms: Array<{
      normalizedValue: string;
      termFamily: EvidenceConflictTermFamily;
      displayValue: string;
      count: number;
    }>;
  };
  groups: ManualReviewGroup[];
  failedAyahs: Array<{ verseKey: string; error: string }>;
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
const globalAuditPath = path.join(
  workspaceRoot,
  "data",
  "analysis-snapshots",
  "vnext-evidence-layer-global-audit.json"
);
const outputDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const outputSnapshotPath = path.join(outputDirectory, "vnext-needs-manual-review-term-groups.json");
const markdownPath = path.join(workspaceRoot, "docs", "VNEXT_NEEDS_MANUAL_REVIEW_TERM_GROUPS.md");

function toVerseKey(surahId: number, ayahNumber: number): string {
  return `${surahId}:${ayahNumber}`;
}

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function increment(record: Record<string, number>, key: string, amount = 1): void {
  record[key] = (record[key] ?? 0) + amount;
}

function pushExample(list: GroupExample[], example: GroupExample): void {
  if (list.some((item) => item.verseKey === example.verseKey && item.conflictType === example.conflictType)) {
    return;
  }
  if (list.length < 5) {
    list.push(example);
  }
}

function groupKey(normalizedValue: string, termFamily: string): string {
  return `${termFamily}\u0000${normalizedValue}`;
}

function emptyGroup(input: {
  normalizedValue: string;
  termFamily: EvidenceConflictTermFamily;
  displayValue: string;
}): ManualReviewGroup {
  return {
    normalizedValue: input.normalizedValue,
    termFamily: input.termFamily,
    displayValue: input.displayValue,
    count: 0,
    conflictTypeDistribution: {},
    selectedProfileDistribution: {},
    examples: [],
    decision: {
      classifyAs: "",
      note: ""
    }
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function buildMarkdown(snapshot: ManualReviewGroupsSnapshot): string {
  const top20Lines = snapshot.summary.top20Terms
    .map(
      (term, index) =>
        `${index + 1}. \`${term.normalizedValue}\` (${term.termFamily}) - ${term.count} conflict - display: ${term.displayValue}`
    )
    .join("\n");

  const familyLines = Object.entries(snapshot.summary.termFamilyDistribution)
    .sort((left, right) => right[1] - left[1])
    .map(([family, count]) => `- \`${family}\`: ${count}`)
    .join("\n");

  const conflictTypeLines = Object.entries(snapshot.summary.conflictTypeDistribution)
    .sort((left, right) => right[1] - left[1])
    .map(([type, count]) => `- \`${type}\`: ${count}`)
    .join("\n");

  const groupTable = snapshot.groups
    .map((group, index) => {
      const examples = group.examples
        .map((example) => `${example.verseKey} (${example.selectedProfile}, ${example.conflictType})`)
        .join("; ");
      return `| ${index + 1} | \`${group.normalizedValue}\` | ${group.termFamily} | ${group.displayValue} | ${group.count} | ${examples || "-"} |  |  |`;
    })
    .join("\n");

  return `# vNext Needs Manual Review Term Groups

Bu rapor, full vNext Evidence Layer global audit sonrasinda \`needsManualReview\` olarak kalan conflict'leri normalized term ve term family bazinda gruplar. Runtime, UI, default source, decision, preview ve classifier davranisi degistirilmedi.

## Kapsam

- Islenen ayet: ${snapshot.summary.processedAyahs}
- Hata veren ayet: ${snapshot.summary.failedAyahs}
- Toplam needsManualReview conflict: ${snapshot.summary.totalNeedsManualReviewConflicts}
- Unique normalized term: ${snapshot.summary.uniqueNormalizedTermCount}
- Unique term/family grubu: ${snapshot.summary.uniqueGroupCount}
- Karar tablosu: ilk ${snapshot.groups.length} grup

## Input Global Audit

- Path: \`${snapshot.inputGlobalAudit.path}\`
- Generated at: ${snapshot.inputGlobalAudit.generatedAt ?? "-"}
- Reported processed ayahs: ${snapshot.inputGlobalAudit.processedAyahs ?? "-"}
- Reported failed ayahs: ${snapshot.inputGlobalAudit.failedAyahs ?? "-"}
- Reported needsManualReview conflicts: ${snapshot.inputGlobalAudit.reportedNeedsManualReviewConflicts ?? "-"}

## Term Family Dagilimi

${familyLines || "- Yok"}

## Conflict Type Dagilimi

${conflictTypeLines || "- Yok"}

## Ilk 20 En Sik Term

${top20Lines || "- Yok"}

## Manuel Karar Tablosu

| # | normalizedValue | termFamily | displayValue | count | examples | classifyAs | note |
|---:|---|---|---|---:|---|---|---|
${groupTable || "| - | - | - | - | - | - | - | - |"}

## Karar Alanlari

\`classifyAs\` alani manuel review icin bos birakildi. Onerilen degerler:

- \`genericNeutral\`
- \`likelyUsefulV4Addition\`
- \`likelyRiskyDrop\`
- \`keepNeedsManualReview\`

## Sonraki Kucuk Adim

Ilk 100 grup icinden tekrar eden ve net generic/content ayrimi yapilabilen 20-30 terim icin classifier'a kucuk, kaynak-agnostic kural eklenebilir. Belirsiz veya profil bagimli terimler \`keepNeedsManualReview\` olarak kalmali.
`;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const [arabicVerses, rootEasyOnly, globalAudit] = await Promise.all([
    readJson<ArabicVerse[]>(arabicPath),
    readJson<RootEasyOnlyEntry[]>(rootEasyOnlyPath),
    readJson<GlobalAuditSnapshotSummary>(globalAuditPath).catch(() => ({}))
  ]);

  const groups = new Map<string, ManualReviewGroup>();
  const uniqueNormalizedTerms = new Set<string>();
  const termFamilyDistribution: Record<string, number> = {};
  const conflictTypeDistribution: Record<string, number> = {};
  const failedAyahs: Array<{ verseKey: string; error: string }> = [];
  let processedAyahs = 0;
  let totalNeedsManualReviewConflicts = 0;

  for (const [index, verse] of arabicVerses.entries()) {
    const verseKey = toVerseKey(verse.surahId, verse.ayahNumber);

    try {
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

      processedAyahs += 1;

      for (const item of evidenceLayer.items) {
        for (const conflict of item.conflictFlags) {
          const classification = classifyEvidenceConflict({
            conflictType: conflict.type,
            value: item.value,
            selectedProfile: evidenceLayer.selectedProfile
          });

          if (classification.qualityClass !== "needsManualReview") {
            continue;
          }

          totalNeedsManualReviewConflicts += 1;
          increment(termFamilyDistribution, classification.termFamily);
          increment(conflictTypeDistribution, conflict.type);
          uniqueNormalizedTerms.add(item.normalizedValue);

          const key = groupKey(item.normalizedValue, classification.termFamily);
          const existing =
            groups.get(key) ??
            emptyGroup({
              normalizedValue: item.normalizedValue,
              termFamily: classification.termFamily,
              displayValue: displayValue(item.value)
            });

          existing.count += 1;
          increment(existing.conflictTypeDistribution, conflict.type);
          increment(existing.selectedProfileDistribution, evidenceLayer.selectedProfile);
          pushExample(existing.examples, {
            verseKey,
            selectedProfile: evidenceLayer.selectedProfile,
            conflictType: conflict.type,
            displayValue: displayValue(item.value),
            sourceIds: item.sourceIds,
            sourceSupportCount: item.sourceSupportCount
          });
          groups.set(key, existing);
        }
      }
    } catch (error) {
      failedAyahs.push({
        verseKey,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    if ((index + 1) % 500 === 0 || index + 1 === arabicVerses.length) {
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `processed ${index + 1}/${arabicVerses.length}; needsManualReview=${totalNeedsManualReviewConflicts}; groups=${groups.size}; elapsed=${elapsedSeconds}s`
      );
    }
  }

  const sortedGroups = Array.from(groups.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.normalizedValue.localeCompare(right.normalizedValue, "tr");
  });
  const topGroups = sortedGroups.slice(0, 100);
  const top20Terms = topGroups.slice(0, 20).map((group) => ({
    normalizedValue: group.normalizedValue,
    termFamily: group.termFamily,
    displayValue: group.displayValue,
    count: group.count
  }));

  const snapshot: ManualReviewGroupsSnapshot = {
    generatedAt: new Date().toISOString(),
    inputGlobalAudit: {
      path: path.relative(workspaceRoot, globalAuditPath).replace(/\\/g, "/"),
      generatedAt: globalAudit.generatedAt ?? null,
      processedAyahs: globalAudit.summary?.processedAyahs ?? null,
      failedAyahs: globalAudit.summary?.failedAyahs ?? null,
      reportedNeedsManualReviewConflicts:
        globalAudit.summary?.conflictQualityDistribution?.needsManualReview ?? null
    },
    rules: {
      runtimeChanged: false,
      defaultSourceChanged: false,
      uiChanged: false,
      previewChanged: false,
      decisionChanged: false,
      v4DefaultEnabled: false,
      sourceDataOverwritten: false,
      classifierChanged: false
    },
    summary: {
      processedAyahs,
      failedAyahs: failedAyahs.length,
      totalNeedsManualReviewConflicts,
      uniqueNormalizedTermCount: uniqueNormalizedTerms.size,
      uniqueGroupCount: sortedGroups.length,
      termFamilyDistribution,
      conflictTypeDistribution,
      top20Terms
    },
    groups: topGroups,
    failedAyahs
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, buildMarkdown(snapshot), "utf8");

  console.log(
    JSON.stringify(
      {
        processedAyahs,
        failedAyahs: failedAyahs.length,
        totalNeedsManualReviewConflicts,
        uniqueNormalizedTermCount: uniqueNormalizedTerms.size,
        uniqueGroupCount: sortedGroups.length,
        top20Terms,
        outputSnapshotPath: path.relative(workspaceRoot, outputSnapshotPath).replace(/\\/g, "/"),
        markdownPath: path.relative(workspaceRoot, markdownPath).replace(/\\/g, "/"),
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
