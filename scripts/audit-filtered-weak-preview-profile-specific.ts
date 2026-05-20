import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface ComparisonEntry {
  verseKey: string;
  selectedProfile: string;
  rawMissingCount: number;
  filteredCandidateCount: number;
  suppressedCount: number;
  existingWeakCorrespondencesPreview: string[];
  filteredWeakGroups: Array<{
    group: string;
    labels: string[];
    count: number;
  }>;
  filteredUserFacingPreview: string[];
  filteredCandidateLabels: string[];
  suppressedReasons: Record<string, number>;
}

const inputPath = path.join(
  "data",
  "analysis-snapshots",
  "filtered-weak-preview-comparison-1000.json"
);
const outputPath = path.join(
  "data",
  "analysis-snapshots",
  "filtered-weak-preview-profile-specific-1000.json"
);
const docPath = path.join("docs", "FILTERED_WEAK_PREVIEW_PROFILE_SPECIFIC.md");

function isSpecificGroup(group: string): boolean {
  return group !== "diger kelime eslesme adaylari";
}

function scoreBest(entry: ProfileSpecificEntry): number {
  return (
    entry.userFacingGroupCount * 20 +
    entry.userFacingLabelCount * 3 +
    (entry.existingWeakCorrespondencesPreview.length > 0 ? 5 : 0) -
    entry.genericDebugLabelCount
  );
}

function scoreRisk(entry: ProfileSpecificEntry): number {
  return (
    entry.genericDebugLabelCount * 3 +
    entry.suppressedCount * 0.5 +
    (entry.userFacingLabelCount > 12 ? 20 : 0) +
    (entry.userFacingGroupCount === 0 && entry.filteredCandidateCount > 0 ? 25 : 0)
  );
}

interface ProfileSpecificEntry extends ComparisonEntry {
  userFacingGroups: ComparisonEntry["filteredWeakGroups"];
  debugOnlyGroups: ComparisonEntry["filteredWeakGroups"];
  userFacingPreview: string[];
  userFacingGroupCount: number;
  userFacingLabelCount: number;
  genericDebugLabelCount: number;
  hiddenAsGenericOnly: boolean;
}

function buildUserFacingPreview(groups: ComparisonEntry["filteredWeakGroups"]): string[] {
  return groups.slice(0, 4).map((group) => {
    return `${group.group} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`;
  });
}

function makeProfileSpecificEntry(entry: ComparisonEntry): ProfileSpecificEntry {
  const userFacingGroups = entry.filteredWeakGroups.filter((group) => isSpecificGroup(group.group));
  const debugOnlyGroups = entry.filteredWeakGroups.filter((group) => !isSpecificGroup(group.group));
  const userFacingLabelCount = userFacingGroups.reduce((sum, group) => sum + group.count, 0);
  const genericDebugLabelCount = debugOnlyGroups.reduce((sum, group) => sum + group.count, 0);

  return {
    ...entry,
    userFacingGroups,
    debugOnlyGroups,
    userFacingPreview: buildUserFacingPreview(userFacingGroups),
    userFacingGroupCount: userFacingGroups.length,
    userFacingLabelCount,
    genericDebugLabelCount,
    hiddenAsGenericOnly: userFacingGroups.length === 0 && entry.filteredWeakGroups.length > 0
  };
}

async function main(): Promise<void> {
  const input = JSON.parse(await readFile(inputPath, "utf-8")) as {
    summary: Record<string, unknown>;
    entries: ComparisonEntry[];
  };
  const entries = input.entries.map(makeProfileSpecificEntry);
  const profileSpecificEntries = entries.filter((entry) => entry.userFacingGroups.length > 0);
  const genericOnlyEntries = entries.filter((entry) => entry.hiddenAsGenericOnly);
  const anyFilteredEntries = entries.filter((entry) => entry.filteredWeakGroups.length > 0);
  const existingWeakEntries = entries.filter((entry) => entry.existingWeakCorrespondencesPreview.length > 0);
  const userFacingLabelCount = entries.reduce((sum, entry) => sum + entry.userFacingLabelCount, 0);
  const genericDebugLabelCount = entries.reduce((sum, entry) => sum + entry.genericDebugLabelCount, 0);
  const filteredCandidateCount = entries.reduce((sum, entry) => sum + entry.filteredCandidateCount, 0);
  const suppressedCount = entries.reduce((sum, entry) => sum + entry.suppressedCount, 0);
  const hiddenCandidateCount = genericOnlyEntries.reduce((sum, entry) => sum + entry.genericDebugLabelCount, 0);
  const bestExamples = profileSpecificEntries.sort((left, right) => scoreBest(right) - scoreBest(left)).slice(0, 20);
  const riskyExamples = entries
    .filter((entry) => entry.filteredWeakGroups.length > 0 || entry.rawMissingCount > 0)
    .sort((left, right) => scoreRisk(right) - scoreRisk(left))
    .slice(0, 20);

  const result = {
    source: {
      previousComparison: inputPath
    },
    summary: {
      processedVerses: entries.length,
      existingWeakVerseCount: existingWeakEntries.length,
      filteredWeakVerseCount: anyFilteredEntries.length,
      profileSpecificWeakVerseCount: profileSpecificEntries.length,
      genericOnlyHiddenVerseCount: genericOnlyEntries.length,
      filteredCandidateCount,
      userFacingSpecificCandidateCount: userFacingLabelCount,
      genericDebugCandidateCount: genericDebugLabelCount,
      hiddenGenericOnlyCandidateCount: hiddenCandidateCount,
      suppressedCount,
      reductionFromRawFilteredCandidateRatio:
        filteredCandidateCount > 0 ? Number((1 - userFacingLabelCount / filteredCandidateCount).toFixed(4)) : 0,
      usefulContentLossRisk:
        "Orta: profile-specific olmayan content debug'a aliniyor; kullanici-facing gurultu azaliyor ama bazi genel content sinyalleri gizlenebilir."
    },
    bestExamples,
    riskyExamples,
    genericOnlyExamples: genericOnlyEntries.slice(0, 40),
    profileSpecificEntries
  };

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");

  const docLines = [
    "# Filtered Weak Preview Profile-Specific Audit",
    "",
    "Tarih: 2026-05-14",
    "",
    "Bu rapor filtreli weak adaylari daha siki bir profile-specific kapidan gecirir. `diger kelime eslesme adaylari` normal kullanici-facing aday sayilmadi; yalniz debug/sourceStatus adayi kabul edildi. Runtime, UI, default source ve mevcut preview logic degistirilmedi.",
    "",
    "## Ozet",
    "",
    `- Islenen ayet: ${result.summary.processedVerses}`,
    `- Mevcut weak preview gosteren ayet: ${result.summary.existingWeakVerseCount}`,
    `- Filtreli herhangi weak adayli ayet: ${result.summary.filteredWeakVerseCount}`,
    `- Profile-specific weak gosterilebilecek ayet: ${result.summary.profileSpecificWeakVerseCount}`,
    `- Generic-only oldugu icin gizlenecek ayet: ${result.summary.genericOnlyHiddenVerseCount}`,
    `- Filtreli candidate toplam: ${result.summary.filteredCandidateCount}`,
    `- Kullanici-facing specific candidate: ${result.summary.userFacingSpecificCandidateCount}`,
    `- Debug generic candidate: ${result.summary.genericDebugCandidateCount}`,
    `- Generic-only gizlenen candidate: ${result.summary.hiddenGenericOnlyCandidateCount}`,
    `- Bastirilan ham gurultu: ${result.summary.suppressedCount}`,
    `- Filtreli candidate uzerinden ek azalma: %${(result.summary.reductionFromRawFilteredCandidateRatio * 100).toFixed(1)}`,
    "",
    "## En Iyi 20 Ornek",
    "",
    "| Ayet | Profile | User-facing grup | Specific label | Debug generic label | Mevcut preview |",
    "|---|---|---|---:|---:|---|",
    ...bestExamples.map(
      (entry) =>
        `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.userFacingGroups.map((group) => group.group).join("; ")} | ${entry.userFacingLabelCount} | ${entry.genericDebugLabelCount} | ${entry.existingWeakCorrespondencesPreview.join("; ") || "-"} |`
    ),
    "",
    "## En Riskli 20 Ornek",
    "",
    "| Ayet | Profile | Specific label | Generic debug | Bastirilan | Risk |",
    "|---|---|---:|---:|---:|---|",
    ...riskyExamples.map((entry) => {
      const risks = [];
      if (entry.hiddenAsGenericOnly) risks.push("generic-only gizlendi");
      if (entry.genericDebugLabelCount > 8) risks.push("generic debug fazla");
      if (entry.userFacingLabelCount > 12) risks.push("specific label fazla");
      return `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.userFacingLabelCount} | ${entry.genericDebugLabelCount} | ${entry.suppressedCount} | ${risks.join(", ") || "manual review"} |`;
    }),
    "",
    "## Kullanici-facing Metin Onerisi",
    "",
    "- `{profile-specific grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`",
    "- `Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`",
    "- Generic grup varsa normal kullanıcıya gösterme; sourceStatus/debug tarafında `Ek kelime eşleşme adayları debug'da tutuldu.` gibi sakla.",
    "",
    "## Karar",
    "",
    "Profile-specific gate kullanici-facing kalite icin daha guvenli. Ancak user-facing ayet sayisi dusuyor; bu bilincli ve olumlu bir tradeoff. Bir sonraki adim, yalniz profile-specific gruplari preview'a opt-in olarak baglayan kucuk bir test paketidir."
  ];

  await writeFile(docPath, docLines.join("\n"), "utf-8");

  console.log(`json: ${outputPath}`);
  console.log(`doc: ${docPath}`);
  console.log(JSON.stringify(result.summary, null, 2));
  console.log("best examples:", bestExamples.map((entry) => entry.verseKey).join(", "));
  console.log("risky examples:", riskyExamples.map((entry) => entry.verseKey).join(", "));
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("audit-filtered-weak-preview-profile-specific failed");
  console.error(error);
  process.exit(1);
});
