import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAyahAnalysisEngine, getSurahs } from "@quran-app/core";

type AnalysisResult = Awaited<ReturnType<typeof getAyahAnalysisEngine>>;

type CountEntry = {
  key: string;
  count: number;
};

type GroupEntry = CountEntry & {
  examples: string[];
};

type VerseAuditRecord = {
  verseKey: string;
  isNull: boolean;
  summary: string | null;
  themes: string[];
  themeCombination: string;
  participants: {
    speaker: string | null;
    addressee: string | null;
    mentioned: string[];
  } | null;
};

const outputDirectory = path.join("data", "analysis-audit");
const jsonOutputPath = path.join(outputDirectory, "analysis-engine-v1-audit.json");
const markdownOutputPath = path.join(outputDirectory, "analysis-engine-v1-audit-summary.md");
const source = "analysis-engine-v1:rule-based";
const largeSummaryGroupThreshold = 10;
const largeThemeCombinationThreshold = 50;
const suspiciousExampleLimit = 30;

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function pushExample(map: Map<string, string[]>, key: string, verseKey: string): void {
  const examples = map.get(key) ?? [];

  if (examples.length < suspiciousExampleLimit) {
    examples.push(verseKey);
    map.set(key, examples);
  }
}

function sortCountEntries(map: Map<string, number>): CountEntry[] {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function toGroupedEntries(counts: Map<string, number>, examples: Map<string, string[]>): GroupEntry[] {
  return sortCountEntries(counts).map((entry) => ({
    ...entry,
    examples: examples.get(entry.key) ?? []
  }));
}

function getThemeCombination(themes: string[]): string {
  return themes.length === 0 ? "(none)" : [...themes].sort().join(" + ");
}

function getParticipantSignature(analysis: NonNullable<AnalysisResult>): string {
  const mentioned =
    analysis.participants.mentioned.length === 0
      ? "(none)"
      : [...analysis.participants.mentioned].sort().join(" + ");

  return [
    `speaker:${analysis.participants.speaker ?? "(none)"}`,
    `addressee:${analysis.participants.addressee ?? "(none)"}`,
    `mentioned:${mentioned}`
  ].join(" | ");
}

function getAnalysisSignature(analysis: NonNullable<AnalysisResult>): string {
  return `${getThemeCombination(analysis.themes)} || ${getParticipantSignature(analysis)}`;
}

function formatCountTable(entries: CountEntry[], limit = 20): string {
  if (entries.length === 0) {
    return "- Yok";
  }

  return entries
    .slice(0, limit)
    .map((entry, index) => `${index + 1}. ${entry.key}: ${entry.count}`)
    .join("\n");
}

function formatGroupTable(entries: GroupEntry[], limit = 20): string {
  if (entries.length === 0) {
    return "- Yok";
  }

  return entries
    .slice(0, limit)
    .map((entry, index) => {
      const examples = entry.examples.length > 0 ? ` | örnekler: ${entry.examples.join(", ")}` : "";

      return `${index + 1}. ${entry.key}: ${entry.count}${examples}`;
    })
    .join("\n");
}

async function buildVerseKeys(): Promise<{
  verseKeys: string[];
  skippedSurahs: Array<{ surahId: number; reason: string }>;
}> {
  const surahs = await getSurahs();
  const verseKeys: string[] = [];
  const skippedSurahs: Array<{ surahId: number; reason: string }> = [];

  for (const surah of surahs) {
    if (!Number.isInteger(surah.verseCount) || surah.verseCount === null || surah.verseCount < 1) {
      skippedSurahs.push({
        surahId: surah.id,
        reason: "missing_or_invalid_verse_count"
      });
      continue;
    }

    for (let ayahNumber = 1; ayahNumber <= surah.verseCount; ayahNumber += 1) {
      verseKeys.push(`${surah.id}:${ayahNumber}`);
    }
  }

  return { verseKeys, skippedSurahs };
}

async function main() {
  const startedAt = new Date().toISOString();
  const { verseKeys, skippedSurahs } = await buildVerseKeys();
  const records: VerseAuditRecord[] = [];
  const themeCounts = new Map<string, number>();
  const themeCombinationCounts = new Map<string, number>();
  const themeCombinationExamples = new Map<string, string[]>();
  const summaryCounts = new Map<string, number>();
  const summaryExamples = new Map<string, string[]>();
  const participantMentionedCounts = new Map<string, number>();
  const addresseeCounts = new Map<string, number>();
  const speakerCounts = new Map<string, number>();
  const analysisSignatureCounts = new Map<string, number>();
  const analysisSignatureExamples = new Map<string, string[]>();
  const suspiciousGeneralRecords: VerseAuditRecord[] = [];
  const errors: Array<{ verseKey: string; message: string }> = [];

  let nullAnalysisCount = 0;
  let nonNullAnalysisCount = 0;
  let summaryCount = 0;
  let emptyThemesCount = 0;
  let mentionedCount = 0;
  let tevhidYaratilisCombinationCount = 0;
  let singleThemeCount = 0;
  let allahMentionedCount = 0;

  console.log(`Analysis Engine V1 audit started. Verse count: ${verseKeys.length}`);

  for (let index = 0; index < verseKeys.length; index += 1) {
    const verseKey = verseKeys[index];

    if ((index + 1) % 100 === 0 || index === 0 || index + 1 === verseKeys.length) {
      console.log(`Processing ${index + 1}/${verseKeys.length}: ${verseKey}`);
    }

    try {
      const analysis = await getAyahAnalysisEngine(verseKey);

      if (analysis === null) {
        nullAnalysisCount += 1;
        emptyThemesCount += 1;
        records.push({
          verseKey,
          isNull: true,
          summary: null,
          themes: [],
          themeCombination: "(none)",
          participants: null
        });
        continue;
      }

      nonNullAnalysisCount += 1;

      if (analysis.summary !== null) {
        summaryCount += 1;
        increment(summaryCounts, analysis.summary);
        pushExample(summaryExamples, analysis.summary, verseKey);
      }

      if (analysis.themes.length === 0) {
        emptyThemesCount += 1;
      }

      if (analysis.themes.length === 1) {
        singleThemeCount += 1;
      }

      if (analysis.themes.includes("tevhid") && analysis.themes.includes("yaratilis")) {
        tevhidYaratilisCombinationCount += 1;
      }

      for (const theme of analysis.themes) {
        increment(themeCounts, theme);
      }

      const themeCombination = getThemeCombination(analysis.themes);
      increment(themeCombinationCounts, themeCombination);
      pushExample(themeCombinationExamples, themeCombination, verseKey);

      const analysisSignature = getAnalysisSignature(analysis);
      increment(analysisSignatureCounts, analysisSignature);
      pushExample(analysisSignatureExamples, analysisSignature, verseKey);

      if (analysis.participants.mentioned.length > 0) {
        mentionedCount += 1;
      }

      for (const participant of analysis.participants.mentioned) {
        increment(participantMentionedCounts, participant);

        if (participant === "Allah") {
          allahMentionedCount += 1;
        }
      }

      increment(addresseeCounts, analysis.participants.addressee ?? "(none)");
      increment(speakerCounts, analysis.participants.speaker ?? "(none)");

      const record: VerseAuditRecord = {
        verseKey,
        isNull: false,
        summary: analysis.summary,
        themes: analysis.themes,
        themeCombination,
        participants: analysis.participants
      };

      if (
        analysis.summary !== null &&
        (analysis.themes.length <= 1 ||
          (analysis.participants.mentioned.length === 1 &&
            analysis.participants.mentioned[0] === "Allah"))
      ) {
        suspiciousGeneralRecords.push(record);
      }

      records.push(record);
    } catch (error) {
      errors.push({
        verseKey,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const summaryGroups = toGroupedEntries(summaryCounts, summaryExamples);
  const themeCombinationGroups = toGroupedEntries(themeCombinationCounts, themeCombinationExamples);
  const analysisSignatureGroups = toGroupedEntries(analysisSignatureCounts, analysisSignatureExamples);
  const repeatedSummaryGroups = summaryGroups.filter((entry) => entry.count > 1);
  const largeSummaryGroups = summaryGroups.filter(
    (entry) => entry.count >= largeSummaryGroupThreshold
  );
  const largeThemeCombinationGroups = themeCombinationGroups.filter(
    (entry) => entry.count >= largeThemeCombinationThreshold
  );
  const finishedAt = new Date().toISOString();

  const audit = {
    metadata: {
      source,
      generatedAt: finishedAt,
      startedAt,
      verseSet:
        "All ayah detail routes derived from getSurahs() verseCount values in the local UI/core data spine.",
      requestedVerseCount: verseKeys.length,
      skippedSurahs
    },
    totals: {
      totalAyahs: verseKeys.length,
      analysisNull: nullAnalysisCount,
      analysisNonNull: nonNullAnalysisCount,
      summaryNonNull: summaryCount,
      themesEmpty: emptyThemesCount,
      participantsMentionedNonEmpty: mentionedCount,
      errors: errors.length
    },
    themes: {
      frequencies: Object.fromEntries(sortCountEntries(themeCounts).map((entry) => [entry.key, entry.count])),
      top10: sortCountEntries(themeCounts).slice(0, 10),
      whitelistFocus: {
        tevhid: themeCounts.get("tevhid") ?? 0,
        yaratilis: themeCounts.get("yaratilis") ?? 0,
        dua: themeCounts.get("dua") ?? 0,
        ibadet: themeCounts.get("ibadet") ?? 0,
        iman: themeCounts.get("iman") ?? 0,
        ahiret: themeCounts.get("ahiret") ?? 0
      }
    },
    combinations: {
      topThemeCombinations: themeCombinationGroups.slice(0, 20),
      tevhidYaratilisCombinationCount,
      singleThemeCount,
      largeThemeCombinationGroups
    },
    summaries: {
      topRepeatedSummaries: repeatedSummaryGroups.slice(0, 20),
      largeSummaryGroups
    },
    participants: {
      mentionedFrequencies: sortCountEntries(participantMentionedCounts),
      allahMentionedCount,
      addresseeDistribution: sortCountEntries(addresseeCounts),
      speakerDistribution: sortCountEntries(speakerCounts)
    },
    suspicious: {
      analysisNonNullButGenericSignals: {
        count: suspiciousGeneralRecords.length,
        examples: suspiciousGeneralRecords.slice(0, suspiciousExampleLimit)
      },
      largeSummaryGroups,
      largeThemeCombinationGroups,
      topAnalysisSignatures: toGroupedEntries(analysisSignatureCounts, analysisSignatureExamples).slice(0, 20)
    },
    errors,
    records
  };

  const markdown = [
    "# Analysis Engine V1 Audit",
    "",
    `Generated at: ${finishedAt}`,
    "",
    "## Verse Set",
    "",
    "- Source: all ayah detail routes derived from `getSurahs()` verseCount values.",
    `- Total ayahs audited: ${verseKeys.length}`,
    `- Skipped surahs: ${skippedSurahs.length}`,
    "",
    "## General Counts",
    "",
    `- analysis === null: ${nullAnalysisCount}`,
    `- analysis !== null: ${nonNullAnalysisCount}`,
    `- summary !== null: ${summaryCount}`,
    `- themes.length === 0: ${emptyThemesCount}`,
    `- participants.mentioned.length > 0: ${mentionedCount}`,
    `- errors: ${errors.length}`,
    "",
    "## Theme Distribution",
    "",
    formatCountTable(sortCountEntries(themeCounts), 12),
    "",
    "## Focus Themes",
    "",
    `- tevhid: ${themeCounts.get("tevhid") ?? 0}`,
    `- yaratilis: ${themeCounts.get("yaratilis") ?? 0}`,
    `- dua: ${themeCounts.get("dua") ?? 0}`,
    `- ibadet: ${themeCounts.get("ibadet") ?? 0}`,
    `- iman: ${themeCounts.get("iman") ?? 0}`,
    `- ahiret: ${themeCounts.get("ahiret") ?? 0}`,
    "",
    "## Theme Combinations",
    "",
    `- tevhid + yaratilis appears together: ${tevhidYaratilisCombinationCount}`,
    `- single-theme ayahs: ${singleThemeCount}`,
    "",
    "### Top Theme Combinations",
    "",
    formatGroupTable(themeCombinationGroups, 20),
    "",
    "## Repeated Summaries",
    "",
    formatGroupTable(repeatedSummaryGroups, 20),
    "",
    "## Participants",
    "",
    `- Allah mentioned count: ${allahMentionedCount}`,
    "",
    "### Mentioned Frequencies",
    "",
    formatCountTable(sortCountEntries(participantMentionedCounts), 20),
    "",
    "### Addressee Distribution",
    "",
    formatCountTable(sortCountEntries(addresseeCounts), 20),
    "",
    "### Speaker Distribution",
    "",
    formatCountTable(sortCountEntries(speakerCounts), 20),
    "",
    "## Suspicious Buckets",
    "",
    `- Non-null analysis with generic-looking signals: ${suspiciousGeneralRecords.length}`,
    `- Summary groups with at least ${largeSummaryGroupThreshold} ayahs: ${largeSummaryGroups.length}`,
    `- Theme combinations with at least ${largeThemeCombinationThreshold} ayahs: ${largeThemeCombinationGroups.length}`,
    "",
    "### Large Summary Groups",
    "",
    formatGroupTable(largeSummaryGroups, 20),
    "",
    "### Large Theme Combination Groups",
    "",
    formatGroupTable(largeThemeCombinationGroups, 20),
    "",
    "### Top Analysis Signatures",
    "",
    formatGroupTable(analysisSignatureGroups, 20),
    ""
  ].join("\n");

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(jsonOutputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(markdownOutputPath, `${markdown}\n`, "utf8");

  console.log("Analysis Engine V1 audit completed.");
  console.log(`JSON: ${jsonOutputPath}`);
  console.log(`Markdown: ${markdownOutputPath}`);
  console.log({
    totalAyahs: verseKeys.length,
    analysisNull: nullAnalysisCount,
    analysisNonNull: nonNullAnalysisCount,
    summaryNonNull: summaryCount,
    topThemes: sortCountEntries(themeCounts).slice(0, 5),
    largeSummaryGroups: largeSummaryGroups.length,
    largeThemeCombinationGroups: largeThemeCombinationGroups.length
  });

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Analysis Engine V1 audit crashed.", error);
  process.exit(1);
});
