import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVerseAnalysisContext,
  type BuildVerseAnalysisContextOptions,
  type VerseAnalysisContext,
  type VerseAnalysisWordEntry
} from "../packages/core/src/analysis/verseAnalysisContext.ts";
import {
  buildVerseAnalysisPreview,
  type VerseAnalysisPreview
} from "../packages/core/src/analysis/verseAnalysisPreview.ts";

type AuditSource = "json" | "v4";

interface VerseSeed {
  surahId: number;
  ayahNumber: number;
}

interface SourcePreviewResult {
  source: AuditSource;
  verseKey: string;
  selectedProfile: string | null;
  keyTermsPreview: string[];
  mainMeaningAxisPreview: string[];
  translationDifferencesPreview: string[];
  weakCorrespondencesPreview: string[];
  profileError: string | null;
  visibleLowConfidenceTerms: string[];
  noisyTerms: string[];
  contentTerms: string[];
}

interface VerseComparison {
  verseKey: string;
  json: SourcePreviewResult;
  v4: SourcePreviewResult;
  profileShift: boolean;
  jsonHadKeyTermsV4Empty: boolean;
  jsonEmptyV4Filled: boolean;
  visibleKeyTermsDelta: number;
  removedTerms: string[];
  addedTerms: string[];
  removedUsefulContentTerms: string[];
  noisyTermsRemovedByV4: string[];
  riskFlags: string[];
}

interface AuditOutput {
  generatedAt: string;
  durationMs: number;
  inspectedAuditInfrastructure: {
    existingScripts: string[];
    existingSnapshots: string[];
    newScript: string;
  };
  rules: {
    defaultSourceChanged: false;
    runtimeChanged: false;
    uiChanged: false;
    canonicalFilesOverwritten: false;
  };
  summary: {
    totalVerses: number;
    errorCount: number;
    jsonEmptyKeyTerms: number;
    v4EmptyKeyTerms: number;
    jsonVisibleKeyTerms: number;
    v4VisibleKeyTerms: number;
    v4LowConfidenceVisibleTermCount: number;
    v4NoisyTermCount: number;
    noisyTermsRemovedByV4Count: number;
    usefulContentTermsLostCount: number;
    jsonHadKeyTermsV4EmptyCount: number;
    jsonEmptyV4FilledCount: number;
    profileShiftCount: number;
  };
  profileDistribution: {
    json: Record<string, number>;
    v4: Record<string, number>;
  };
  examples: {
    jsonHadKeyTermsV4Empty: VerseComparison[];
    profileShifts: VerseComparison[];
    keyTermsEmptied: VerseComparison[];
    lowConfidenceVisibleTerms: VerseComparison[];
    noisyVisibleTerms: VerseComparison[];
    noisyTermsRemovedByV4: VerseComparison[];
    usefulContentTermsLost: VerseComparison[];
  };
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, "..");
const snapshotDirectory = path.join(workspaceRoot, "data", "analysis-snapshots");
const snapshotPath = path.join(snapshotDirectory, "verse-analysis-v4-canonical-optin-audit-1000.json");
const markdownPath = path.join(workspaceRoot, "docs", "V4_CANONICAL_OPTIN_AUDIT_1000.md");
const arabicPath = path.join(workspaceRoot, "data", "normalized", "arabic.json");

const existingAuditScripts = [
  "scripts/audit-verse-analysis-global.ts",
  "scripts/inspect-v2-keyterms-impact.ts",
  "scripts/inspect-verse-analysis-context.ts"
];

const existingAuditSnapshots = [
  "data/analysis-snapshots/verse-analysis-json-audit-1000.json",
  "data/analysis-snapshots/verse-analysis-v3-audit-1000.json",
  "data/analysis-snapshots/verse-analysis-v4-audit-1000.json",
  "data/analysis-snapshots/v4-keyterms-visibility-drift-audit.temp.json"
];

const usefulContentNeedles = [
  "iman",
  "amel",
  "yol",
  "nimet",
  "azap",
  "adalet",
  "elci",
  "elçi",
  "resul",
  "kitap"
];

const noisyMeaningNeedles = [
  "suphesiz ben",
  "şüphesiz ben",
  "icinde",
  "içinde",
  "nasil",
  "nasıl",
  "ancak",
  "sadece",
  "o ki",
  "olan",
  "dost veli"
];

function parseLimit(): number {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const parsed = Number(limitArg?.slice("--limit=".length) ?? 1000);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1000;
}

function normalizeLatin(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeArabic(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[^\u0600-\u06FF]/gu, "");
}

function increment(record: Record<string, number>, key: string | null): void {
  record[key ?? "preview_error"] = (record[key ?? "preview_error"] ?? 0) + 1;
}

function findWordForVisibleTerm(
  context: VerseAnalysisContext,
  keyTerm: string
): VerseAnalysisWordEntry | null {
  const normalizedTerm = normalizeArabic(keyTerm);

  if (!normalizedTerm) {
    return null;
  }

  return (
    context.wordByWord.find((word) => {
      const normalizedArabic = normalizeArabic(word.arabic ?? "");
      return normalizedArabic.length > 0 && normalizedTerm.includes(normalizedArabic);
    }) ?? null
  );
}

function visibleMeaning(keyTerm: string): string {
  const parts = keyTerm.split(/—|-/u).map((part) => part.trim());
  return parts.slice(1).join(" ");
}

function isLowConfidenceWord(word: VerseAnalysisWordEntry | null): boolean {
  return word?.confidence === "low" || word?.confidence === "low-enriched" || word?.confidence === "missing";
}

function isNoisyVisibleTerm(keyTerm: string, word: VerseAnalysisWordEntry | null): boolean {
  const meaning = normalizeLatin(visibleMeaning(keyTerm));

  if (/[`0-9]/u.test(keyTerm) || /Ã|Ä|Å|Ù|Ø/u.test(visibleMeaning(keyTerm))) {
    return true;
  }

  if (word?.role === "particle" || word?.role === "pronoun" || word?.pos === "P" || word?.pos === "P+N") {
    return true;
  }

  return noisyMeaningNeedles.some((needle) => meaning.includes(normalizeLatin(needle)));
}

function extractContentTerms(keyTermsPreview: string[]): string[] {
  return keyTermsPreview.filter((term) => {
    const normalized = normalizeLatin(term);
    return usefulContentNeedles.some((needle) => normalized.includes(normalizeLatin(needle)));
  });
}

async function buildSourcePreview(
  verse: VerseSeed,
  source: AuditSource
): Promise<SourcePreviewResult> {
  const options: BuildVerseAnalysisContextOptions = { source };
  const verseKey = `${verse.surahId}:${verse.ayahNumber}`;

  try {
    const context = await buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, options);
    const preview: VerseAnalysisPreview = buildVerseAnalysisPreview(context);
    const visibleLowConfidenceTerms: string[] = [];
    const noisyTerms: string[] = [];

    for (const keyTerm of preview.keyTermsPreview) {
      const word = findWordForVisibleTerm(context, keyTerm);

      if (isLowConfidenceWord(word)) {
        visibleLowConfidenceTerms.push(keyTerm);
      }

      if (isNoisyVisibleTerm(keyTerm, word)) {
        noisyTerms.push(keyTerm);
      }
    }

    return {
      source,
      verseKey,
      selectedProfile: preview.selectedProfile,
      keyTermsPreview: preview.keyTermsPreview,
      mainMeaningAxisPreview: preview.mainMeaningAxisPreview,
      translationDifferencesPreview: preview.translationDifferencesPreview,
      weakCorrespondencesPreview: preview.weakCorrespondencesPreview,
      profileError: null,
      visibleLowConfidenceTerms,
      noisyTerms,
      contentTerms: extractContentTerms(preview.keyTermsPreview)
    };
  } catch (error) {
    return {
      source,
      verseKey,
      selectedProfile: null,
      keyTermsPreview: [],
      mainMeaningAxisPreview: [],
      translationDifferencesPreview: [],
      weakCorrespondencesPreview: [],
      profileError: error instanceof Error ? error.message : String(error),
      visibleLowConfidenceTerms: [],
      noisyTerms: [],
      contentTerms: []
    };
  }
}

async function compareVerse(verse: VerseSeed): Promise<VerseComparison> {
  const [json, v4] = await Promise.all([
    buildSourcePreview(verse, "json"),
    buildSourcePreview(verse, "v4")
  ]);
  const removedTerms = json.keyTermsPreview.filter((term) => !v4.keyTermsPreview.includes(term));
  const addedTerms = v4.keyTermsPreview.filter((term) => !json.keyTermsPreview.includes(term));
  const removedUsefulContentTerms = removedTerms.filter((term) => {
    const normalized = normalizeLatin(term);
    return usefulContentNeedles.some((needle) => normalized.includes(normalizeLatin(needle)));
  });
  const noisyTermsRemovedByV4 = json.noisyTerms.filter((term) => !v4.keyTermsPreview.includes(term));
  const riskFlags: string[] = [];

  if (json.profileError || v4.profileError) {
    riskFlags.push("preview_error");
  }

  if (json.selectedProfile !== v4.selectedProfile) {
    riskFlags.push("profile_shift");
  }

  if (json.keyTermsPreview.length > 0 && v4.keyTermsPreview.length === 0) {
    riskFlags.push("json_had_keyterms_v4_empty");
  }

  if (removedUsefulContentTerms.length > 0) {
    riskFlags.push("useful_content_terms_lost");
  }

  if (v4.noisyTerms.length > 0) {
    riskFlags.push("v4_noisy_visible_terms");
  }

  if (v4.visibleLowConfidenceTerms.length > 0) {
    riskFlags.push("v4_low_confidence_visible_terms");
  }

  return {
    verseKey: json.verseKey,
    json,
    v4,
    profileShift: json.selectedProfile !== v4.selectedProfile,
    jsonHadKeyTermsV4Empty: json.keyTermsPreview.length > 0 && v4.keyTermsPreview.length === 0,
    jsonEmptyV4Filled: json.keyTermsPreview.length === 0 && v4.keyTermsPreview.length > 0,
    visibleKeyTermsDelta: v4.keyTermsPreview.length - json.keyTermsPreview.length,
    removedTerms,
    addedTerms,
    removedUsefulContentTerms,
    noisyTermsRemovedByV4,
    riskFlags
  };
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const results: U[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);

      if ((currentIndex + 1) % 100 === 0 || currentIndex + 1 === items.length) {
        console.log(JSON.stringify({ processed: currentIndex + 1, total: items.length }));
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function compactComparison(entry: VerseComparison): VerseComparison {
  return {
    ...entry,
    json: {
      ...entry.json,
      mainMeaningAxisPreview: entry.json.mainMeaningAxisPreview.slice(0, 1),
      translationDifferencesPreview: entry.json.translationDifferencesPreview.slice(0, 1),
      weakCorrespondencesPreview: entry.json.weakCorrespondencesPreview.slice(0, 2)
    },
    v4: {
      ...entry.v4,
      mainMeaningAxisPreview: entry.v4.mainMeaningAxisPreview.slice(0, 1),
      translationDifferencesPreview: entry.v4.translationDifferencesPreview.slice(0, 1),
      weakCorrespondencesPreview: entry.v4.weakCorrespondencesPreview.slice(0, 2)
    }
  };
}

function buildAuditOutput(comparisons: VerseComparison[], startedAt: number): AuditOutput {
  const profileDistribution = { json: {}, v4: {} } as AuditOutput["profileDistribution"];

  for (const entry of comparisons) {
    increment(profileDistribution.json, entry.json.selectedProfile);
    increment(profileDistribution.v4, entry.v4.selectedProfile);
  }

  const errorCount = comparisons.filter((entry) => entry.json.profileError || entry.v4.profileError).length;
  const jsonVisibleKeyTerms = comparisons.reduce((total, entry) => total + entry.json.keyTermsPreview.length, 0);
  const v4VisibleKeyTerms = comparisons.reduce((total, entry) => total + entry.v4.keyTermsPreview.length, 0);
  const v4LowConfidenceVisibleTermCount = comparisons.reduce(
    (total, entry) => total + entry.v4.visibleLowConfidenceTerms.length,
    0
  );
  const v4NoisyTermCount = comparisons.reduce((total, entry) => total + entry.v4.noisyTerms.length, 0);
  const noisyTermsRemovedByV4Count = comparisons.reduce(
    (total, entry) => total + entry.noisyTermsRemovedByV4.length,
    0
  );
  const usefulContentTermsLostCount = comparisons.reduce(
    (total, entry) => total + entry.removedUsefulContentTerms.length,
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    inspectedAuditInfrastructure: {
      existingScripts: existingAuditScripts,
      existingSnapshots: existingAuditSnapshots,
      newScript: "scripts/audit-v4-canonical-optin-1000.ts"
    },
    rules: {
      defaultSourceChanged: false,
      runtimeChanged: false,
      uiChanged: false,
      canonicalFilesOverwritten: false
    },
    summary: {
      totalVerses: comparisons.length,
      errorCount,
      jsonEmptyKeyTerms: comparisons.filter((entry) => entry.json.keyTermsPreview.length === 0).length,
      v4EmptyKeyTerms: comparisons.filter((entry) => entry.v4.keyTermsPreview.length === 0).length,
      jsonVisibleKeyTerms,
      v4VisibleKeyTerms,
      v4LowConfidenceVisibleTermCount,
      v4NoisyTermCount,
      noisyTermsRemovedByV4Count,
      usefulContentTermsLostCount,
      jsonHadKeyTermsV4EmptyCount: comparisons.filter((entry) => entry.jsonHadKeyTermsV4Empty).length,
      jsonEmptyV4FilledCount: comparisons.filter((entry) => entry.jsonEmptyV4Filled).length,
      profileShiftCount: comparisons.filter((entry) => entry.profileShift).length
    },
    profileDistribution,
    examples: {
      jsonHadKeyTermsV4Empty: comparisons.filter((entry) => entry.jsonHadKeyTermsV4Empty).slice(0, 30).map(compactComparison),
      profileShifts: comparisons.filter((entry) => entry.profileShift).slice(0, 30).map(compactComparison),
      keyTermsEmptied: comparisons.filter((entry) => entry.jsonHadKeyTermsV4Empty).slice(0, 30).map(compactComparison),
      lowConfidenceVisibleTerms: comparisons.filter((entry) => entry.v4.visibleLowConfidenceTerms.length > 0).slice(0, 30).map(compactComparison),
      noisyVisibleTerms: comparisons.filter((entry) => entry.v4.noisyTerms.length > 0).slice(0, 30).map(compactComparison),
      noisyTermsRemovedByV4: comparisons.filter((entry) => entry.noisyTermsRemovedByV4.length > 0).slice(0, 30).map(compactComparison),
      usefulContentTermsLost: comparisons.filter((entry) => entry.removedUsefulContentTerms.length > 0).slice(0, 30).map(compactComparison)
    }
  };
}

function formatDistribution(distribution: Record<string, number>): string {
  return Object.entries(distribution)
    .sort((left, right) => right[1] - left[1])
    .map(([profile, count]) => `- \`${profile}\`: ${count}`)
    .join("\n");
}

function formatExamples(title: string, entries: VerseComparison[]): string {
  if (entries.length === 0) {
    return `## ${title}\n\n- Yok.\n`;
  }

  const lines = entries.slice(0, 20).map((entry) => {
    return `- \`${entry.verseKey}\`: json(${entry.json.selectedProfile}) ${entry.json.keyTermsPreview.length} term -> v4(${entry.v4.selectedProfile}) ${entry.v4.keyTermsPreview.length} term | removed: ${entry.removedTerms.join(", ") || "-"} | added: ${entry.addedTerms.join(", ") || "-"}`;
  });

  return `## ${title}\n\n${lines.join("\n")}\n`;
}

function buildMarkdown(output: AuditOutput): string {
  return `# V4 Canonical Opt-In Audit 1000

Bu rapor ` + "`canonical_word_analysis_v4`" + ` kaynağının default source'a dokunmadan ilk ${output.summary.totalVerses} ayette JSON default ile karşılaştırmalı etkisini ölçer.

## İncelenen Altyapı

İlgili mevcut scriptler:

${output.inspectedAuditInfrastructure.existingScripts.map((item) => `- \`${item}\``).join("\n")}

İlgili mevcut snapshotlar:

${output.inspectedAuditInfrastructure.existingSnapshots.map((item) => `- \`${item}\``).join("\n")}

Yeni dar kapsamlı script:

- \`${output.inspectedAuditInfrastructure.newScript}\`

## Özet Metrikler

- Toplam ayet: ${output.summary.totalVerses}
- Error count: ${output.summary.errorCount}
- JSON emptyKeyTerms: ${output.summary.jsonEmptyKeyTerms}
- v4 emptyKeyTerms: ${output.summary.v4EmptyKeyTerms}
- JSON visibleKeyTerms: ${output.summary.jsonVisibleKeyTerms}
- v4 visibleKeyTerms: ${output.summary.v4VisibleKeyTerms}
- v4 low-confidence visible term: ${output.summary.v4LowConfidenceVisibleTermCount}
- v4 noisy term: ${output.summary.v4NoisyTermCount}
- JSON'da keyTerms varken v4'te boşalan ayet: ${output.summary.jsonHadKeyTermsV4EmptyCount}
- JSON boşken v4 dolan ayet: ${output.summary.jsonEmptyV4FilledCount}
- Profile shift: ${output.summary.profileShiftCount}
- v4 tarafından bastırılan noisy term: ${output.summary.noisyTermsRemovedByV4Count}
- Kaybolan faydalı content term: ${output.summary.usefulContentTermsLostCount}
- Süre: ${output.durationMs} ms

## JSON Profile Dağılımı

${formatDistribution(output.profileDistribution.json) || "- Yok"}

## v4 Profile Dağılımı

${formatDistribution(output.profileDistribution.v4) || "- Yok"}

${formatExamples("JSON Dolu / v4 Boş Örnekleri", output.examples.jsonHadKeyTermsV4Empty)}

${formatExamples("Profile Shift Örnekleri", output.examples.profileShifts)}

${formatExamples("v4 Low-Confidence Visible Term Örnekleri", output.examples.lowConfidenceVisibleTerms)}

${formatExamples("v4 Noisy Visible Term Örnekleri", output.examples.noisyVisibleTerms)}

${formatExamples("v4'ün Bastırdığı Noisy Term Örnekleri", output.examples.noisyTermsRemovedByV4)}

${formatExamples("Kaybolan Faydalı Content Term Örnekleri", output.examples.usefulContentTermsLost)}

## Kısa Değerlendirme

- v4 bu audit içinde default yapılmadı.
- Runtime/UI davranışı değiştirilmedi.
- Eğer v4 noisy term sayısı düşük, low-confidence visible term sayısı kabul edilebilir ve profile shift sınırlıysa v4 sonraki fazda daha geniş audit'e adaydır.
- Eğer faydalı content term kaybı yüksekse v4 default için erken kabul edilmelidir.
`;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const limit = parseLimit();
  const allVerses = JSON.parse(await readFile(arabicPath, "utf8")) as VerseSeed[];
  const verses = allVerses.slice(0, limit);
  const comparisons = await mapWithConcurrency(verses, 6, (verse) => compareVerse(verse));
  const output = buildAuditOutput(comparisons, startedAt);

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${buildMarkdown(output)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        snapshotPath,
        markdownPath,
        ...output.summary,
        profileDistribution: output.profileDistribution,
        durationMs: output.durationMs
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("audit-v4-canonical-optin-1000 failed");
  console.error(error);
  process.exitCode = 1;
});
