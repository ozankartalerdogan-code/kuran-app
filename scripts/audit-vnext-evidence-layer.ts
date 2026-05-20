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
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";

interface AuditVerse {
  surahId: number;
  ayahNumber: number;
  verseKey: string;
  setName: "quality_set_28" | "manual_examples";
}

const manualExamples = [
  [1, 1],
  [1, 5],
  [2, 7],
  [2, 173],
  [2, 177],
  [4, 29],
  [5, 3],
  [5, 90],
  [39, 53],
  [49, 12]
] as const;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const snapshotPath = path.join(snapshotDirectory, "vnext-evidence-layer.v2-sources.sample.json");
const markdownPath = path.join(workspaceRoot, "docs", "VNEXT_EVIDENCE_LAYER_V4_ROOT_EASY_SNAPSHOT.md");
const rootEasyOnlyPath = path.join(workspaceRoot, "data2", "processed", "root_explanations_tr_v2_easy_only.json");

function toVerseKey(surahId: number, ayahNumber: number): string {
  return `${surahId}:${ayahNumber}`;
}

function buildAuditSet(): AuditVerse[] {
  return [
    ...verseAnalysisQualitySet.map((item) => ({
      surahId: item.surahId,
      ayahNumber: item.ayahNumber,
      verseKey: item.verseKey,
      setName: "quality_set_28" as const
    })),
    ...manualExamples.map(([surahId, ayahNumber]) => ({
      surahId,
      ayahNumber,
      verseKey: toVerseKey(surahId, ayahNumber),
      setName: "manual_examples" as const
    }))
  ];
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

async function loadRootEasyOnly(): Promise<RootEasyOnlyEntry[]> {
  return JSON.parse(await readFile(rootEasyOnlyPath, "utf8")) as RootEasyOnlyEntry[];
}

interface EvidenceAuditSnapshot {
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
    totalAuditCases: number;
    uniqueVerseCount: number;
    qualitySetVerseCount: number;
    manualExampleVerseCount: number;
    totalEvidenceItems: number;
    kindDistribution: Record<EvidenceKind, number>;
    internalConfidenceDistribution: Record<InternalConfidence, number>;
    conflictFlagCount: number;
    conflictTypeDistribution: Record<string, number>;
    singleSourceItemCount: number;
    sourceSupportTwoPlusItemCount: number;
    userFacingAllowed: { true: number; false: number };
    debugOnlyCount: number;
    v4ContributionCount: number;
    rootEasyOnlyContributionCount: number;
    sourceUsage: Record<string, number>;
  };
  entries: Array<{
    setName: AuditVerse["setName"];
    verseKey: string;
    selectedProfile: string;
    summary: ReturnType<typeof buildVerseAnalysisEvidenceLayer>["summary"];
    sources: ReturnType<typeof buildVerseAnalysisEvidenceLayer>["sources"];
    items: ReturnType<typeof buildVerseAnalysisEvidenceLayer>["items"];
  }>;
}

function buildMarkdown(snapshot: EvidenceAuditSnapshot): string {
  const kindLines = Object.entries(snapshot.summary.kindDistribution)
    .map(([kind, count]) => `- \`${kind}\`: ${count}`)
    .join("\n");
  const confidenceLines = Object.entries(snapshot.summary.internalConfidenceDistribution)
    .map(([confidence, count]) => `- \`${confidence}\`: ${count}`)
    .join("\n");
  const sourceLines = Object.entries(snapshot.summary.sourceUsage)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([source, count]) => `- \`${source}\`: ${count}`)
    .join("\n");
  const conflictTypeLines = Object.entries(snapshot.summary.conflictTypeDistribution)
    .sort((left, right) => right[1] - left[1])
    .map(([type, count]) => `- \`${type}\`: ${count}`)
    .join("\n");
  const conflictLines = snapshot.entries
    .filter((entry) => entry.summary.conflictFlagCount > 0)
    .slice(0, 20)
    .map((entry) => `- \`${entry.verseKey}\`: ${entry.summary.conflictFlagCount}`)
    .join("\n");

  return `# vNext Evidence Layer v4 + Root Easy Snapshot

Bu rapor runtime'a bağlanmayan Evidence Layer audit sonucudur. Bu sürümde \`canonical_word_analysis_v4\` ve \`root_explanations_tr_v2_easy_only\` yalnız opt-in evidence source olarak kullanılmıştır.

## Kapsam

- Quality set audit case: ${snapshot.summary.qualitySetVerseCount}
- Manuel örnek audit case: ${snapshot.summary.manualExampleVerseCount}
- Toplam audit case: ${snapshot.summary.totalAuditCases}
- Toplam benzersiz ayet: ${snapshot.summary.uniqueVerseCount}
- Runtime/default source değişti mi?: hayır
- UI değişti mi?: hayır
- Preview/decision davranışı değişti mi?: hayır
- v4 default source yapıldı mı?: hayır
- root easy-only runtime'a bağlandı mı?: hayır

## Özet

- Toplam evidence item: ${snapshot.summary.totalEvidenceItems}
- Conflict flag sayısı: ${snapshot.summary.conflictFlagCount}
- Source support 2+ item sayısı: ${snapshot.summary.sourceSupportTwoPlusItemCount}
- Single-source item sayısı: ${snapshot.summary.singleSourceItemCount}
- User-facing allowed true: ${snapshot.summary.userFacingAllowed.true}
- User-facing allowed false: ${snapshot.summary.userFacingAllowed.false}
- Debug-only item sayısı: ${snapshot.summary.debugOnlyCount}
- v4 katkı sayısı: ${snapshot.summary.v4ContributionCount}
- root_easy_only katkı sayısı: ${snapshot.summary.rootEasyOnlyContributionCount}

## Kind Dağılımı

${kindLines}

## Internal Confidence Dağılımı

${confidenceLines}

## En Çok Kullanılan Source ID'ler

${sourceLines || "- Yok"}

## Conflict Türleri

${conflictTypeLines || "- Yok"}

## Conflict Olan Ayetler

${conflictLines || "- Yok"}

## Not

Bu snapshot kullanıcı-facing analiz üretmez. \`internalConfidence\`, \`sourceSupport\`, \`singleSource\`, \`conflictFlags\` ve \`evidenceTrace\` sadece debug/audit amacıyla üretilmiştir.

## Sonraki Küçük Adım

v4/root_easy_only kaynaklarının ürettiği conflict tiplerini gözden geçirmek; özellikle \`keyTermMissingInV4\`, \`keyTermOnlyInV4\` ve root easy-only desteklerinin gerçekten faydalı mı yoksa fazla gürültülü mü olduğunu audit etmek.
`;
}

async function buildSnapshot(): Promise<EvidenceAuditSnapshot> {
  const auditSet = buildAuditSet();
  const rootEasyOnly = await loadRootEasyOnly();
  const entries: EvidenceAuditSnapshot["entries"] = [];
  const kindDistribution = emptyKindDistribution();
  const internalConfidenceDistribution = emptyConfidenceDistribution();
  const sourceUsage: Record<string, number> = {};
  const conflictTypeDistribution: Record<string, number> = {};
  let totalEvidenceItems = 0;
  let conflictFlagCount = 0;
  let singleSourceItemCount = 0;
  let sourceSupportTwoPlusItemCount = 0;
  let userFacingAllowedTrue = 0;
  let userFacingAllowedFalse = 0;
  let debugOnlyCount = 0;

  for (const verse of auditSet) {
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

    for (const [confidence, count] of Object.entries(evidenceLayer.summary.internalConfidenceDistribution) as Array<[InternalConfidence, number]>) {
      increment(internalConfidenceDistribution, confidence, count);
    }

    for (const item of evidenceLayer.items) {
      for (const conflict of item.conflictFlags) {
        conflictTypeDistribution[conflict.type] = (conflictTypeDistribution[conflict.type] ?? 0) + 1;
      }

      for (const sourceId of item.sourceIds) {
        sourceUsage[sourceId] = (sourceUsage[sourceId] ?? 0) + 1;
      }
    }

    entries.push({
      setName: verse.setName,
      verseKey: verse.verseKey,
      selectedProfile: evidenceLayer.selectedProfile,
      summary: evidenceLayer.summary,
      sources: evidenceLayer.sources,
      items: evidenceLayer.items
    });
  }

  return {
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
      totalAuditCases: auditSet.length,
      uniqueVerseCount: new Set(auditSet.map((entry) => entry.verseKey)).size,
      qualitySetVerseCount: entries.filter((entry) => entry.setName === "quality_set_28").length,
      manualExampleVerseCount: entries.filter((entry) => entry.setName === "manual_examples").length,
      totalEvidenceItems,
      kindDistribution,
      internalConfidenceDistribution,
      conflictFlagCount,
      conflictTypeDistribution,
      singleSourceItemCount,
      sourceSupportTwoPlusItemCount,
      userFacingAllowed: {
        true: userFacingAllowedTrue,
        false: userFacingAllowedFalse
      },
      debugOnlyCount,
      v4ContributionCount: sourceUsage.canonical_word_analysis_v4 ?? 0,
      rootEasyOnlyContributionCount: sourceUsage.root_easy_only ?? 0,
      sourceUsage
    },
    entries
  };
}

async function main(): Promise<void> {
  const snapshot = await buildSnapshot();

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${buildMarkdown(snapshot)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        snapshotPath,
        markdownPath,
        ...snapshot.summary
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("audit-vnext-evidence-layer failed");
  console.error(error);
  process.exitCode = 1;
});
