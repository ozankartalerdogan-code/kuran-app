import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAyahAnalysisEngineDebug, getSurahs } from "@quran-app/core";
import type { AyahAnalysisEngineDebug } from "@quran-app/core";

type CountEntry = {
  key: string;
  count: number;
};

type GroupEntry = CountEntry & {
  examples: string[];
};

type SourceAuditRecord = {
  verseKey: string;
  analysisSummary: string | null;
  themes: string[];
  mentioned: string[];
  addressee: string | null;
  speaker: string | null;
  themeDebug: AyahAnalysisEngineDebug["themeDebug"];
  participantDebug: AyahAnalysisEngineDebug["participantDebug"];
  summaryDebug: AyahAnalysisEngineDebug["summaryDebug"];
};

const outputDirectory = path.join("data", "analysis-audit");
const jsonOutputPath = path.join(outputDirectory, "analysis-engine-v1-sources-audit.json");
const markdownOutputPath = path.join(
  outputDirectory,
  "analysis-engine-v1-sources-audit-summary.md"
);
const exampleLimit = 40;

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function addExamples(map: Map<string, string[]>, key: string, verseKey: string): void {
  const examples = map.get(key) ?? [];

  if (examples.length < exampleLimit) {
    examples.push(verseKey);
    map.set(key, examples);
  }
}

function sortCounts(map: Map<string, number>): CountEntry[] {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function grouped(counts: Map<string, number>, examples: Map<string, string[]>): GroupEntry[] {
  return sortCounts(counts).map((entry) => ({
    ...entry,
    examples: examples.get(entry.key) ?? []
  }));
}

function formatCounts(entries: CountEntry[], limit = 20): string {
  if (entries.length === 0) {
    return "- Yok";
  }

  return entries
    .slice(0, limit)
    .map((entry, index) => `${index + 1}. ${entry.key}: ${entry.count}`)
    .join("\n");
}

function formatGroups(entries: GroupEntry[], limit = 20): string {
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

async function buildVerseKeys(): Promise<string[]> {
  const surahs = await getSurahs();
  const verseKeys: string[] = [];

  for (const surah of surahs) {
    if (!Number.isInteger(surah.verseCount) || surah.verseCount === null || surah.verseCount < 1) {
      continue;
    }

    for (let ayahNumber = 1; ayahNumber <= surah.verseCount; ayahNumber += 1) {
      verseKeys.push(`${surah.id}:${ayahNumber}`);
    }
  }

  return verseKeys;
}

function hasThemeSource(debug: AyahAnalysisEngineDebug, theme: string, source: string): boolean {
  return debug.themeDebug.some((entry) => entry.theme === theme && entry.source === source);
}

function themeTextMatches(debug: AyahAnalysisEngineDebug, theme: string): string[] {
  return debug.themeDebug
    .filter((entry) => entry.theme === theme && entry.source === "text-rule")
    .flatMap((entry) => entry.matchedBy);
}

function participantTextMatches(debug: AyahAnalysisEngineDebug, label: string): string[] {
  return debug.participantDebug.mentioned
    .filter((entry) => entry.label === label && entry.source === "text-rule")
    .flatMap((entry) => entry.matchedBy);
}

function participantHasSource(
  debug: AyahAnalysisEngineDebug,
  label: string,
  source: string
): boolean {
  return debug.participantDebug.mentioned.some(
    (entry) => entry.label === label && entry.source === source
  );
}

function hasOnlyPatterns(matches: string[], allowedPatterns: string[]): boolean {
  return matches.length > 0 && matches.every((match) => allowedPatterns.includes(match));
}

async function main() {
  const startedAt = new Date().toISOString();
  const verseKeys = await buildVerseKeys();
  let completed = 0;

  console.log(`Analysis Engine V1 source audit started. Verse count: ${verseKeys.length}`);

  const records: SourceAuditRecord[] = [];
  const themeSourceCounts = new Map<string, number>();
  const themePatternCounts = new Map<string, number>();
  const themePatternExamples = new Map<string, string[]>();
  const participantSourceCounts = new Map<string, number>();
  const participantPatternCounts = new Map<string, number>();
  const participantPatternExamples = new Map<string, string[]>();
  const addresseePatternCounts = new Map<string, number>();
  const addresseePatternExamples = new Map<string, string[]>();
  const summaryTemplateCounts = new Map<string, number>();
  const weakSummaryCounts = new Map<string, number>();
  const weakSummaryExamples = new Map<string, string[]>();
  const suspicious = {
    tevhidOnlyAllahOrRabText: [] as string[],
    yaratilisOnlyText: [] as string[],
    allahMentionedOnlyText: [] as string[],
    weakGenericSummary: [] as SourceAuditRecord[]
  };

  let summarySingleThemeCount = 0;
  let summaryOnlyAllahTevhidCount = 0;

  for (const verseKey of verseKeys) {
    const debug = await getAyahAnalysisEngineDebug(verseKey);
    completed += 1;

    if (completed === 1 || completed % 100 === 0 || completed === verseKeys.length) {
      console.log(`Processing ${completed}/${verseKeys.length}: ${verseKey}`);
    }

    const analysis = debug.analysis;
    const record: SourceAuditRecord = {
      verseKey: debug.verseKey,
      analysisSummary: analysis?.summary ?? null,
      themes: analysis?.themes ?? [],
      mentioned: analysis?.participants.mentioned ?? [],
      addressee: analysis?.participants.addressee ?? null,
      speaker: analysis?.participants.speaker ?? null,
      themeDebug: debug.themeDebug,
      participantDebug: debug.participantDebug,
      summaryDebug: debug.summaryDebug
    };

    records.push(record);

    for (const entry of debug.themeDebug) {
      increment(themeSourceCounts, `${entry.theme} | ${entry.source}`);

      for (const matchedBy of entry.matchedBy) {
        const key = `${entry.theme} | ${entry.source} | ${matchedBy}`;
        increment(themePatternCounts, key);
        addExamples(themePatternExamples, key, debug.verseKey);
      }
    }

    for (const entry of debug.participantDebug.mentioned) {
      increment(participantSourceCounts, `${entry.label} | mentioned | ${entry.source}`);

      for (const matchedBy of entry.matchedBy) {
        const key = `${entry.label} | mentioned | ${entry.source} | ${matchedBy}`;
        increment(participantPatternCounts, key);
        addExamples(participantPatternExamples, key, debug.verseKey);
      }
    }

    if (debug.participantDebug.addressee !== null) {
      for (const matchedBy of debug.participantDebug.addressee.matchedBy) {
        const key = `${debug.participantDebug.addressee.value} | addressee | ${matchedBy}`;
        increment(addresseePatternCounts, key);
        addExamples(addresseePatternExamples, key, debug.verseKey);
      }
    }

    increment(summaryTemplateCounts, debug.summaryDebug.template ?? "(none)");

    if (debug.summaryDebug.produced && debug.summaryDebug.usedThemes.length === 1) {
      summarySingleThemeCount += 1;
    }

    if (
      debug.summaryDebug.produced &&
      debug.summaryDebug.usedThemes.length === 1 &&
      debug.summaryDebug.usedThemes[0] === "tevhid" &&
      debug.summaryDebug.usedMentioned.length === 1 &&
      debug.summaryDebug.usedMentioned[0] === "Allah"
    ) {
      summaryOnlyAllahTevhidCount += 1;
    }

    const tevhidTextMatches = themeTextMatches(debug, "tevhid");
    if (
      analysis?.themes.includes("tevhid") &&
      !hasThemeSource(debug, "tevhid", "root-rule") &&
      hasOnlyPatterns(tevhidTextMatches, ["/allah/u", "/rab\\b/u"])
    ) {
      suspicious.tevhidOnlyAllahOrRabText.push(debug.verseKey);
    }

    const yaratilisTextMatches = themeTextMatches(debug, "yaratilis");
    if (
      analysis?.themes.includes("yaratilis") &&
      !hasThemeSource(debug, "yaratilis", "root-rule") &&
      hasOnlyPatterns(yaratilisTextMatches, ["/yarat/u", "/var et/u"])
    ) {
      suspicious.yaratilisOnlyText.push(debug.verseKey);
    }

    const allahTextMatches = participantTextMatches(debug, "Allah");
    if (
      analysis?.participants.mentioned.includes("Allah") &&
      !participantHasSource(debug, "Allah", "root-rule") &&
      allahTextMatches.length > 0
    ) {
      suspicious.allahMentionedOnlyText.push(debug.verseKey);
    }

    if (
      debug.summaryDebug.produced &&
      ((debug.summaryDebug.usedThemes.length <= 1 &&
        debug.summaryDebug.usedMentioned.length <= 1) ||
        (debug.summaryDebug.usedThemes.includes("tevhid") &&
          debug.summaryDebug.usedMentioned.length === 1 &&
          debug.summaryDebug.usedMentioned[0] === "Allah"))
    ) {
      const key = `${debug.summaryDebug.template ?? "(none)"} | themes:${debug.summaryDebug.usedThemes.join("+") || "(none)"} | mentioned:${debug.summaryDebug.usedMentioned.join("+") || "(none)"}`;
      increment(weakSummaryCounts, key);
      addExamples(weakSummaryExamples, key, debug.verseKey);

      if (suspicious.weakGenericSummary.length < exampleLimit) {
        suspicious.weakGenericSummary.push(record);
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const audit = {
    metadata: {
      generatedAt: finishedAt,
      startedAt,
      verseSet: "All ayah detail routes derived from getSurahs() verseCount values.",
      totalAyahs: verseKeys.length,
      helper: "getAyahAnalysisEngineDebug"
    },
    totals: {
      totalAyahs: verseKeys.length,
      summarySingleThemeCount,
      summaryOnlyAllahTevhidCount
    },
    themeSources: {
      sourceCounts: sortCounts(themeSourceCounts),
      patternCounts: grouped(themePatternCounts, themePatternExamples),
      focus: {
        tevhid: grouped(
          new Map(sortCounts(themePatternCounts).filter((entry) => entry.key.startsWith("tevhid |")) .map((entry) => [entry.key, entry.count])),
          themePatternExamples
        ),
        yaratilis: grouped(
          new Map(sortCounts(themePatternCounts).filter((entry) => entry.key.startsWith("yaratilis |")).map((entry) => [entry.key, entry.count])),
          themePatternExamples
        ),
        dua: grouped(
          new Map(sortCounts(themePatternCounts).filter((entry) => entry.key.startsWith("dua |")).map((entry) => [entry.key, entry.count])),
          themePatternExamples
        )
      }
    },
    participantSources: {
      sourceCounts: sortCounts(participantSourceCounts),
      patternCounts: grouped(participantPatternCounts, participantPatternExamples),
      addresseePatternCounts: grouped(addresseePatternCounts, addresseePatternExamples)
    },
    summaries: {
      templateCounts: sortCounts(summaryTemplateCounts),
      summarySingleThemeCount,
      summaryOnlyAllahTevhidCount,
      weakSummaryGroups: grouped(weakSummaryCounts, weakSummaryExamples)
    },
    suspicious: {
      tevhidOnlyAllahOrRabTextCount: suspicious.tevhidOnlyAllahOrRabText.length,
      tevhidOnlyAllahOrRabTextExamples: suspicious.tevhidOnlyAllahOrRabText.slice(0, exampleLimit),
      yaratilisOnlyTextCount: suspicious.yaratilisOnlyText.length,
      yaratilisOnlyTextExamples: suspicious.yaratilisOnlyText.slice(0, exampleLimit),
      allahMentionedOnlyTextCount: suspicious.allahMentionedOnlyText.length,
      allahMentionedOnlyTextExamples: suspicious.allahMentionedOnlyText.slice(0, exampleLimit),
      weakGenericSummaryExamples: suspicious.weakGenericSummary
    },
    records
  };

  const markdown = [
    "# Analysis Engine V1 Source Audit",
    "",
    `Generated at: ${finishedAt}`,
    "",
    "## Verse Set",
    "",
    "- Source: all ayah detail routes derived from `getSurahs()` verseCount values.",
    `- Total ayahs audited: ${verseKeys.length}`,
    "",
    "## Theme Source Counts",
    "",
    formatCounts(sortCounts(themeSourceCounts), 30),
    "",
    "## Theme Pattern Counts",
    "",
    formatGroups(grouped(themePatternCounts, themePatternExamples), 30),
    "",
    "## Participant Source Counts",
    "",
    formatCounts(sortCounts(participantSourceCounts), 30),
    "",
    "## Participant Pattern Counts",
    "",
    formatGroups(grouped(participantPatternCounts, participantPatternExamples), 30),
    "",
    "## Addressee Pattern Counts",
    "",
    formatGroups(grouped(addresseePatternCounts, addresseePatternExamples), 20),
    "",
    "## Summary Template Counts",
    "",
    formatCounts(sortCounts(summaryTemplateCounts), 10),
    "",
    "## Summary Weak Signal Counts",
    "",
    `- Summary with only one used theme: ${summarySingleThemeCount}`,
    `- Summary with only Allah mentioned + tevhid: ${summaryOnlyAllahTevhidCount}`,
    "",
    "### Weak Summary Groups",
    "",
    formatGroups(grouped(weakSummaryCounts, weakSummaryExamples), 20),
    "",
    "## Suspicious Buckets",
    "",
    `- tevhid only from /allah/ or /rab\\b/ text rules: ${suspicious.tevhidOnlyAllahOrRabText.length}`,
    `- yaratilis only from text rules: ${suspicious.yaratilisOnlyText.length}`,
    `- Allah mentioned only from text rules: ${suspicious.allahMentionedOnlyText.length}`,
    "",
    "### tevhid only text examples",
    "",
    suspicious.tevhidOnlyAllahOrRabText.slice(0, exampleLimit).join(", ") || "Yok",
    "",
    "### yaratilis only text examples",
    "",
    suspicious.yaratilisOnlyText.slice(0, exampleLimit).join(", ") || "Yok",
    "",
    "### Allah mentioned only text examples",
    "",
    suspicious.allahMentionedOnlyText.slice(0, exampleLimit).join(", ") || "Yok",
    ""
  ].join("\n");

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(jsonOutputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(markdownOutputPath, `${markdown}\n`, "utf8");

  console.log("Analysis Engine V1 source audit completed.");
  console.log(`JSON: ${jsonOutputPath}`);
  console.log(`Markdown: ${markdownOutputPath}`);
  console.log({
    totalAyahs: verseKeys.length,
    topThemeSources: sortCounts(themeSourceCounts).slice(0, 5),
    topParticipantSources: sortCounts(participantSourceCounts).slice(0, 5),
    summaryTemplates: sortCounts(summaryTemplateCounts),
    suspicious: {
      tevhidOnlyAllahOrRabText: suspicious.tevhidOnlyAllahOrRabText.length,
      yaratilisOnlyText: suspicious.yaratilisOnlyText.length,
      allahMentionedOnlyText: suspicious.allahMentionedOnlyText.length
    }
  });
}

main().catch((error) => {
  console.error("Analysis Engine V1 source audit crashed.", error);
  process.exit(1);
});
