import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";

interface MissingMeaningEntry {
  surahId: number;
  ayahNumber: number;
  wordIndex: number;
  lemma: string | null;
  root: string | null;
  arabic: string | null;
  reason: string;
}

interface FilteredCandidate extends MissingMeaningEntry {
  label: string;
  filterClass: "visible_candidate" | "suppressed";
  suppressionReason?: string;
}

interface GroupedWeakCandidate {
  group: string;
  labels: string[];
  count: number;
}

interface VerseAuditEntry {
  verseKey: string;
  selectedProfile: string;
  rawMissingCount: number;
  filteredCandidateCount: number;
  suppressedCount: number;
  existingWeakCorrespondencesPreview: string[];
  filteredWeakGroups: GroupedWeakCandidate[];
  filteredUserFacingPreview: string[];
  filteredCandidateLabels: string[];
  suppressedReasons: Record<string, number>;
}

const missingPath = path.join("data", "word-analysis", "reports", "missing-meanings.json");
const canonicalV4Path = path.join("data2", "processed", "canonical_word_analysis_v4.json");
const previousFilteredAuditPath = path.join(
  "data",
  "analysis-snapshots",
  "missing-meanings-filtered-weak-audit.json"
);
const outputPath = path.join(
  "data",
  "analysis-snapshots",
  "filtered-weak-preview-comparison-1000.json"
);
const docPath = path.join("docs", "FILTERED_WEAK_PREVIEW_COMPARISON.md");

const suffixOrParticleArabic = new Set([
  "وا۟",
  "وٓا۟",
  "وْا۟",
  "ونَ",
  "وْنَ",
  "نَا",
  "نَٰ",
  "نَآ",
  "نَّ",
  "نَّا",
  "نِى",
  "نِىٓ",
  "نَ",
  "نِ",
  "هَا",
  "هَآ",
  "هُنَّ",
  "هُمَا",
  "هِنَّ",
  "تُمْ",
  "تُم",
  "تُمُو",
  "تُمُ",
  "تَ",
  "تُ",
  "كُمَا"
]);
const weakLemmaSet = new Set(["أَمّا", "سَوْف"]);

const groupRules: Array<{
  group: string;
  roots: Set<string>;
  lemmas: Set<string>;
  profiles?: Set<string>;
}> = [
  {
    group: "yiyecek ve yasakli maddeler",
    roots: new Set(["دمو", "لحم", "خنزر", "خمر", "يسر", "نصب", "زلم", "رجس"]),
    lemmas: new Set(["دَم", "لَحْم", "خِنزِير", "خَمْر", "مَيْسِر", "نُصُب", "أَزْلام", "رِجْس"]),
    profiles: new Set(["hukum_istisna", "emir_yasak"])
  },
  {
    group: "zaruret, istisna ve sorumluluk",
    roots: new Set(["ضرر", "أثم", "بغي", "جنب"]),
    lemmas: new Set(["اضْطُرَّ", "إِثْم", "اجْتَنَبُ"]),
    profiles: new Set(["hukum_istisna", "emir_yasak"])
  },
  {
    group: "ahlaki yasak ve davranis uyarilari",
    roots: new Set(["جنب", "أثم", "جسس", "ظنن", "غيب", "سخر", "لمز", "لقب", "تجر", "رضو"]),
    lemmas: new Set(["اجْتَنَبُ", "إِثْم", "تَجَسَّسُ", "تِجارَة", "تَراض"]),
    profiles: new Set(["emir_yasak"])
  },
  {
    group: "amel, olcu ve ahiret sonucu",
    roots: new Set(["ثقل", "ذرر", "وزن", "عمل", "خير", "شرر", "لقي"]),
    lemmas: new Set(["ثَقُلَتْ", "ذَرَّة", "مِثْقال"]),
    profiles: new Set(["ahiret"])
  },
  {
    group: "rahmet, tovbe ve umut",
    roots: new Set(["سرف", "قنط", "غفر", "رحم", "توب", "رجو"]),
    lemmas: new Set(["أَسْرَفَ", "قَنَطُ", "يَرْجُوا۟"]),
    profiles: new Set(["rahmet_magfiret"])
  },
  {
    group: "kissa sahnesi ve olay unsurlari",
    roots: new Set(["رفع", "أبو", "عرش", "خرر", "أول", "سجن", "بدو", "قصص"]),
    lemmas: new Set(["رَفَعَ", "أَبَوان", "عَرْش", "خَرَّ", "تَأْوِيل", "سِجْن", "بَدْو"]),
    profiles: new Set(["kissa"])
  },
  {
    group: "yol, hidayet ve sapma",
    roots: new Set(["هدي", "ضلل", "صراط", "نعم", "غضب", "شرق", "غرب"]),
    lemmas: new Set(["مَشْرِق", "مَغْرِب"]),
    profiles: new Set(["yol_hidayet"])
  },
  {
    group: "kulluk, dua ve yardim",
    roots: new Set(["عبد", "عون", "دعو", "رجو"]),
    lemmas: new Set([]),
    profiles: new Set(["dua_kulluk"])
  }
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function verseKeyOf(entry: { surahId: number; ayahNumber: number }): string {
  return `${entry.surahId}:${entry.ayahNumber}`;
}

function verseSortKey(verseKey: string): [number, number] {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return [surah, ayah];
}

function compareVerseKeys(left: string, right: string): number {
  const [leftSurah, leftAyah] = verseSortKey(left);
  const [rightSurah, rightAyah] = verseSortKey(right);
  return leftSurah === rightSurah ? leftAyah - rightAyah : leftSurah - rightSurah;
}

function classifyMissing(entry: MissingMeaningEntry): FilteredCandidate {
  const lemma = clean(entry.lemma);
  const root = clean(entry.root);
  const arabic = clean(entry.arabic);
  const label = lemma || root || arabic;

  if (!lemma && !root) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "no_lemma_root" };
  }

  if (!label || label.length <= 2) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "short_label" };
  }

  if (suffixOrParticleArabic.has(arabic)) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "suffix_or_particle_arabic" };
  }

  if (weakLemmaSet.has(lemma)) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "weak_formula_lemma" };
  }

  return { ...entry, label, filterClass: "visible_candidate" };
}

function groupCandidates(profile: string, candidates: FilteredCandidate[]): GroupedWeakCandidate[] {
  const grouped = new Map<string, string[]>();

  for (const candidate of candidates) {
    const root = clean(candidate.root);
    const lemma = clean(candidate.lemma);
    const matchedRule =
      groupRules.find((rule) => {
        const profileMatches = !rule.profiles || rule.profiles.has(profile);
        return profileMatches && (rule.roots.has(root) || rule.lemmas.has(lemma));
      }) ??
      groupRules.find((rule) => rule.roots.has(root) || rule.lemmas.has(lemma));
    const group = matchedRule?.group ?? "diger kelime eslesme adaylari";
    const label = lemma || root || clean(candidate.arabic);
    const labels = grouped.get(group) ?? [];
    if (!labels.includes(label)) {
      labels.push(label);
    }
    grouped.set(group, labels);
  }

  return Array.from(grouped.entries()).map(([group, labels]) => ({
    group,
    labels: labels.slice(0, 8),
    count: labels.length
  }));
}

function buildUserFacingPreview(groups: GroupedWeakCandidate[]): string[] {
  return groups.slice(0, 4).map((group) => {
    if (group.group === "diger kelime eslesme adaylari") {
      return "Bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.";
    }

    return `${group.group} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`;
  });
}

function groupByVerse<T extends { surahId: number; ayahNumber: number }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const verseKey = verseKeyOf(item);
    const current = map.get(verseKey) ?? [];
    current.push(item);
    map.set(verseKey, current);
  }
  return map;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function scoreGoodExample(entry: VerseAuditEntry): number {
  const hasSpecificGroup = entry.filteredWeakGroups.some((group) => group.group !== "diger kelime eslesme adaylari");
  return (
    (hasSpecificGroup ? 20 : 0) +
    entry.filteredCandidateCount * 2 -
    entry.suppressedCount +
    (entry.existingWeakCorrespondencesPreview.length > 0 ? 5 : 0)
  );
}

function scoreRiskExample(entry: VerseAuditEntry): number {
  const genericGroups = entry.filteredWeakGroups.filter((group) => group.group === "diger kelime eslesme adaylari")
    .length;
  return (
    entry.filteredCandidateCount +
    entry.suppressedCount * 0.5 +
    genericGroups * 10 +
    (entry.filteredCandidateCount > 10 ? 20 : 0) +
    (entry.existingWeakCorrespondencesPreview.length === 0 && entry.filteredCandidateCount > 0 ? 10 : 0)
  );
}

async function main(): Promise<void> {
  const [missing, canonicalRaw, previousAuditRaw] = await Promise.all([
    readFile(missingPath, "utf-8").then((content) => JSON.parse(content) as MissingMeaningEntry[]),
    readFile(canonicalV4Path, "utf-8").then((content) => JSON.parse(content) as Record<string, unknown>),
    readFile(previousFilteredAuditPath, "utf-8").catch(() => "{}")
  ]);
  const classified = missing.map(classifyMissing);
  const rawByVerse = groupByVerse(missing);
  const visibleByVerse = groupByVerse(classified.filter((entry) => entry.filterClass === "visible_candidate"));
  const suppressedByVerse = groupByVerse(classified.filter((entry) => entry.filterClass === "suppressed"));
  const verseKeys = Object.keys(canonicalRaw).sort(compareVerseKeys).slice(0, 1000);
  const previousAudit = JSON.parse(previousAuditRaw);

  const entries = await mapWithConcurrency(verseKeys, 12, async (verseKey): Promise<VerseAuditEntry> => {
    const [surahId, ayahNumber] = verseSortKey(verseKey);
    const context = await buildVerseAnalysisContext(surahId, ayahNumber, { source: "v4" });
    const preview = buildVerseAnalysisPreview(context);
    const visibleCandidates = visibleByVerse.get(verseKey) ?? [];
    const suppressedCandidates = suppressedByVerse.get(verseKey) ?? [];
    const filteredWeakGroups = groupCandidates(preview.selectedProfile, visibleCandidates);
    const suppressedReasons = suppressedCandidates.reduce<Record<string, number>>((acc, candidate) => {
      const key = candidate.suppressionReason ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return {
      verseKey,
      selectedProfile: preview.selectedProfile,
      rawMissingCount: rawByVerse.get(verseKey)?.length ?? 0,
      filteredCandidateCount: visibleCandidates.length,
      suppressedCount: suppressedCandidates.length,
      existingWeakCorrespondencesPreview: preview.weakCorrespondencesPreview,
      filteredWeakGroups,
      filteredUserFacingPreview: buildUserFacingPreview(filteredWeakGroups),
      filteredCandidateLabels: visibleCandidates
        .map((candidate) => candidate.lemma || candidate.root || candidate.arabic || "")
        .filter(Boolean)
        .slice(0, 20),
      suppressedReasons
    };
  });

  const existingWeakVerseCount = entries.filter((entry) => entry.existingWeakCorrespondencesPreview.length > 0).length;
  const filteredWeakVerseCount = entries.filter((entry) => entry.filteredWeakGroups.length > 0).length;
  const rawMissingVerseCount = entries.filter((entry) => entry.rawMissingCount > 0).length;
  const rawMissingCount = entries.reduce((sum, entry) => sum + entry.rawMissingCount, 0);
  const filteredCandidateCount = entries.reduce((sum, entry) => sum + entry.filteredCandidateCount, 0);
  const suppressedCount = entries.reduce((sum, entry) => sum + entry.suppressedCount, 0);
  const existingOnly = entries.filter(
    (entry) => entry.existingWeakCorrespondencesPreview.length > 0 && entry.filteredWeakGroups.length === 0
  );
  const filteredOnly = entries.filter(
    (entry) => entry.existingWeakCorrespondencesPreview.length === 0 && entry.filteredWeakGroups.length > 0
  );
  const both = entries.filter(
    (entry) => entry.existingWeakCorrespondencesPreview.length > 0 && entry.filteredWeakGroups.length > 0
  );

  const bestExamples = entries
    .filter((entry) => entry.filteredWeakGroups.length > 0)
    .sort((left, right) => scoreGoodExample(right) - scoreGoodExample(left))
    .slice(0, 20);
  const riskyExamples = entries
    .filter((entry) => entry.filteredWeakGroups.length > 0 || entry.rawMissingCount > 0)
    .sort((left, right) => scoreRiskExample(right) - scoreRiskExample(left))
    .slice(0, 20);

  const result = {
    source: {
      previousFilteredAudit: previousFilteredAuditPath,
      missing: missingPath,
      canonicalV4: canonicalV4Path
    },
    previousSummary: previousAudit.summary ?? null,
    summary: {
      processedVerses: entries.length,
      rawMissingCount,
      rawMissingVerseCount,
      existingWeakVerseCount,
      filteredWeakVerseCount,
      bothWeakVerseCount: both.length,
      existingOnlyWeakVerseCount: existingOnly.length,
      filteredOnlyWeakVerseCount: filteredOnly.length,
      filteredCandidateCount,
      suppressedCount,
      noiseReductionRatio: rawMissingCount > 0 ? Number((suppressedCount / rawMissingCount).toFixed(4)) : 0,
      usefulContentPreserved: filteredCandidateCount > 0
    },
    bestExamples,
    riskyExamples,
    existingOnlyExamples: existingOnly.slice(0, 30),
    filteredOnlyExamples: filteredOnly.slice(0, 30),
    recommendedUserFacingText: [
      "Bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.",
      "{grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.",
      "Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir."
    ],
    entries
  };

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");

  const docLines = [
    "# Filtered Weak Preview Comparison",
    "",
    "Tarih: 2026-05-14",
    "",
    "Bu rapor ilk 1000 ayette mevcut weak preview ile filtreli missing-meanings aday gruplarini karsilastirir. Runtime, UI, default source ve mevcut preview logic degistirilmedi.",
    "",
    "## Ozet",
    "",
    `- Islenen ayet: ${result.summary.processedVerses}`,
    `- Ham missing kayit: ${rawMissingCount}`,
    `- Ham missing ayet: ${rawMissingVerseCount}`,
    `- Mevcut preview weak gosteren ayet: ${existingWeakVerseCount}`,
    `- Filtreli preview weak gosterebilecek ayet: ${filteredWeakVerseCount}`,
    `- Iki yaklasimda da weak olan ayet: ${both.length}`,
    `- Mevcut var / filtreli yok: ${existingOnly.length}`,
    `- Filtreli var / mevcut yok: ${filteredOnly.length}`,
    `- Filtreli candidate: ${filteredCandidateCount}`,
    `- Bastirilan kayit: ${suppressedCount}`,
    `- Gurultu azalmasi: %${(result.summary.noiseReductionRatio * 100).toFixed(1)}`,
    "",
    "## En Iyi 20 Ornek",
    "",
    "| Ayet | Profile | Ham | Filtreli | Gruplar | Mevcut preview |",
    "|---|---|---:|---:|---|---|",
    ...bestExamples.map(
      (entry) =>
        `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.rawMissingCount} | ${entry.filteredCandidateCount} | ${entry.filteredWeakGroups.map((group) => group.group).join("; ") || "-"} | ${entry.existingWeakCorrespondencesPreview.join("; ") || "-"} |`
    ),
    "",
    "## En Riskli 20 Ornek",
    "",
    "| Ayet | Profile | Ham | Filtreli | Bastirilan | Gruplar | Risk nedeni |",
    "|---|---|---:|---:|---:|---|---|",
    ...riskyExamples.map((entry) => {
      const reasons = [];
      if (entry.filteredCandidateCount > 10) reasons.push("cok fazla aday");
      if (entry.filteredWeakGroups.some((group) => group.group === "diger kelime eslesme adaylari")) {
        reasons.push("generic grup");
      }
      if (entry.existingWeakCorrespondencesPreview.length === 0 && entry.filteredWeakGroups.length > 0) {
        reasons.push("mevcut preview yokken yeni weak");
      }
      return `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.rawMissingCount} | ${entry.filteredCandidateCount} | ${entry.suppressedCount} | ${entry.filteredWeakGroups.map((group) => group.group).join("; ") || "-"} | ${reasons.join(", ") || "manual review"} |`;
    }),
    "",
    "## Kullanici-facing Metin Onerisi",
    "",
    "- `Bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`",
    "- `{grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`",
    "- `Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`",
    "",
    "Raw `matching_gap`, ham Arapca parca veya tekil lemma kullaniciya basilmamali.",
    "",
    "## Karar",
    "",
    "Filtreli aday gruplari mevcut weak preview'a gore daha temiz ve daha source-backed gorunuyor. Ancak generic grup ve cok adayli ayetler icin ekstra sinirlama gerekir. En guvenli sonraki adim, sadece profile-spesifik grup eslesen adaylari opt-in preview auditinde denemektir."
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
  console.error("audit-filtered-weak-preview-comparison failed");
  console.error(error);
  process.exit(1);
});
