import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";

interface CoverageEntry {
  surahId: number;
  ayahNumber: number;
  totalWords: number;
  matchedWords: number;
  coverageRatio: number;
  hasMorphology: boolean;
}

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

const coveragePath = path.join("data", "word-analysis", "reports", "coverage-by-ayah.json");
const missingPath = path.join("data", "word-analysis", "reports", "missing-meanings.json");
const canonicalV4Path = path.join("data2", "processed", "canonical_word_analysis_v4.json");
const outputPath = path.join("data", "analysis-snapshots", "missing-meanings-filtered-weak-audit.json");
const docPath = path.join("docs", "MISSING_MEANINGS_FILTERED_WEAK_AUDIT.md");

const targetVerseKeys = new Set(["2:173", "5:90", "49:12", "99:7", "101:6", "4:29"]);
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
    return {
      ...entry,
      label,
      filterClass: "suppressed",
      suppressionReason: "no_lemma_root"
    };
  }

  if (!label || label.length <= 2) {
    return {
      ...entry,
      label,
      filterClass: "suppressed",
      suppressionReason: "short_label"
    };
  }

  if (suffixOrParticleArabic.has(arabic)) {
    return {
      ...entry,
      label,
      filterClass: "suppressed",
      suppressionReason: "suffix_or_particle_arabic"
    };
  }

  if (weakLemmaSet.has(lemma)) {
    return {
      ...entry,
      label,
      filterClass: "suppressed",
      suppressionReason: "weak_formula_lemma"
    };
  }

  return {
    ...entry,
    label,
    filterClass: "visible_candidate"
  };
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

async function inspectExistingPreview(verseKey: string): Promise<{
  selectedProfile: string;
  weakCorrespondencesPreview: string[];
}> {
  const [surahId, ayahNumber] = verseSortKey(verseKey);
  const context = await buildVerseAnalysisContext(surahId, ayahNumber, { source: "v4" });
  const preview = buildVerseAnalysisPreview(context);

  return {
    selectedProfile: preview.selectedProfile,
    weakCorrespondencesPreview: preview.weakCorrespondencesPreview
  };
}

async function inspectLimit(
  limit: number,
  verseKeys: string[],
  rawByVerse: Map<string, MissingMeaningEntry[]>,
  visibleByVerse: Map<string, FilteredCandidate[]>,
  suppressedByVerse: Map<string, FilteredCandidate[]>
) {
  const selectedVerseKeys = verseKeys.slice(0, limit);
  const affectedRaw = selectedVerseKeys.filter((verseKey) => (rawByVerse.get(verseKey)?.length ?? 0) > 0);
  const affectedVisible = selectedVerseKeys.filter((verseKey) => (visibleByVerse.get(verseKey)?.length ?? 0) > 0);
  const rawCount = affectedRaw.reduce((sum, verseKey) => sum + (rawByVerse.get(verseKey)?.length ?? 0), 0);
  const visibleCount = affectedVisible.reduce((sum, verseKey) => sum + (visibleByVerse.get(verseKey)?.length ?? 0), 0);
  const suppressedCount = selectedVerseKeys.reduce(
    (sum, verseKey) => sum + (suppressedByVerse.get(verseKey)?.length ?? 0),
    0
  );
  const existingPreviewSamples = [];

  for (const verseKey of affectedVisible.slice(0, 30)) {
    const existing = await inspectExistingPreview(verseKey);
    existingPreviewSamples.push({
      verseKey,
      selectedProfile: existing.selectedProfile,
      rawMissingCount: rawByVerse.get(verseKey)?.length ?? 0,
      filteredCandidateCount: visibleByVerse.get(verseKey)?.length ?? 0,
      existingWeakCorrespondencesPreview: existing.weakCorrespondencesPreview,
      filteredCandidates: (visibleByVerse.get(verseKey) ?? []).slice(0, 10).map((item) => ({
        wordIndex: item.wordIndex,
        arabic: item.arabic,
        lemma: item.lemma,
        root: item.root,
        label: item.label
      }))
    });
  }

  return {
    limit,
    processedVerses: selectedVerseKeys.length,
    rawMissingCount: rawCount,
    filteredVisibleCandidateCount: visibleCount,
    suppressedCount,
    rawAffectedVerseCount: affectedRaw.length,
    filteredAffectedVerseCount: affectedVisible.length,
    noiseReductionCount: rawCount - visibleCount,
    noiseReductionRatio: rawCount > 0 ? Number(((rawCount - visibleCount) / rawCount).toFixed(4)) : 0,
    existingPreviewSamples
  };
}

async function main(): Promise<void> {
  const [coverage, missing] = await Promise.all([
    readFile(coveragePath, "utf-8").then((content) => JSON.parse(content) as CoverageEntry[]),
    readFile(missingPath, "utf-8").then((content) => JSON.parse(content) as MissingMeaningEntry[]),
    readFile(canonicalV4Path, "utf-8")
  ]);
  const classified = missing.map(classifyMissing);
  const visible = classified.filter((item) => item.filterClass === "visible_candidate");
  const suppressed = classified.filter((item) => item.filterClass === "suppressed");
  const rawByVerse = groupByVerse(missing);
  const visibleByVerse = groupByVerse(visible);
  const suppressedByVerse = groupByVerse(suppressed);
  const coverageVerseKeys = coverage.map(verseKeyOf).sort(compareVerseKeys);
  const suppressionReasons = suppressed.reduce<Record<string, number>>((acc, item) => {
    const key = item.suppressionReason ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const targetVerses = [];
  for (const verseKey of Array.from(targetVerseKeys).sort(compareVerseKeys)) {
    const existing = await inspectExistingPreview(verseKey);
    targetVerses.push({
      verseKey,
      selectedProfile: existing.selectedProfile,
      coverage: coverage.find((entry) => verseKeyOf(entry) === verseKey),
      rawMissing: rawByVerse.get(verseKey) ?? [],
      filteredVisibleCandidates: visibleByVerse.get(verseKey) ?? [],
      suppressedCandidates: suppressedByVerse.get(verseKey) ?? [],
      existingWeakCorrespondencesPreview: existing.weakCorrespondencesPreview
    });
  }

  const result = {
    source: {
      coverage: coveragePath,
      missing: missingPath,
      canonicalV4: canonicalV4Path
    },
    summary: {
      coverageRecords: coverage.length,
      missingRecords: missing.length,
      rawAffectedVerseCount: rawByVerse.size,
      filteredVisibleCandidateCount: visible.length,
      filteredAffectedVerseCount: visibleByVerse.size,
      suppressedCount: suppressed.length,
      suppressionReasons,
      noiseReductionRatio: Number(((missing.length - visible.length) / missing.length).toFixed(4))
    },
    limits: {
      "100": await inspectLimit(100, coverageVerseKeys, rawByVerse, visibleByVerse, suppressedByVerse),
      "500": await inspectLimit(500, coverageVerseKeys, rawByVerse, visibleByVerse, suppressedByVerse),
      "1000": await inspectLimit(1000, coverageVerseKeys, rawByVerse, visibleByVerse, suppressedByVerse)
    },
    targetVerses,
    recommendedRule: {
      visible: [
        "lemma veya root dolu olsun",
        "label uzunlugu 2'den buyuk olsun",
        "arabic kisa ek/zamir/particle listesinde olmasin",
        "weak formula lemma listesinde olmasin",
        "kullanici-facing metinde reason degil anlam alani/grup gosterilsin"
      ],
      suppressed: [
        "lemma/root bos",
        "kisa suffix veya particle",
        "tekrar eden segment",
        "yalniz teknik matching_gap bilgisi"
      ]
    }
  };

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");

  const docLines = [
    "# Missing Meanings Filtered Weak Audit",
    "",
    "Tarih: 2026-05-14",
    "",
    "Bu rapor missing-meanings kayitlarini filtreleyerek kullanici-facing weak correspondence icin ne kadar uygun olduklarini inceler. Runtime, UI, default source ve veri dosyalari degistirilmedi.",
    "",
    "## Genel Sonuc",
    "",
    `- Ham missing kayit: ${missing.length}`,
    `- Filtre sonrasi visible candidate: ${visible.length}`,
    `- Bastirilan kayit: ${suppressed.length}`,
    `- Ham etkilenen ayet: ${rawByVerse.size}`,
    `- Filtre sonrasi etkilenen ayet: ${visibleByVerse.size}`,
    `- Gurultu azalmasi: %${(result.summary.noiseReductionRatio * 100).toFixed(1)}`,
    "",
    "## Limit Ozetleri",
    "",
    "| Limit | Ham missing | Filtreli visible | Bastirilan | Ham ayet | Filtreli ayet | Azalma |",
    "|---:|---:|---:|---:|---:|---:|---:|",
    ...Object.values(result.limits).map(
      (item) =>
        `| ${item.limit} | ${item.rawMissingCount} | ${item.filteredVisibleCandidateCount} | ${item.suppressedCount} | ${item.rawAffectedVerseCount} | ${item.filteredAffectedVerseCount} | %${(item.noiseReductionRatio * 100).toFixed(1)} |`
    ),
    "",
    "## Bastirma Sebepleri",
    "",
    "| Sebep | Adet |",
    "|---|---:|",
    ...Object.entries(suppressionReasons)
      .sort((left, right) => right[1] - left[1])
      .map(([reason, count]) => `| ${reason} | ${count} |`),
    "",
    "## Kontrol Ayetleri",
    "",
    "| Ayet | Profile | Ham | Filtreli | Bastirilan | Mevcut weak preview |",
    "|---|---|---:|---:|---:|---|",
    ...targetVerses.map(
      (item) =>
        `| ${item.verseKey} | ${item.selectedProfile} | ${item.rawMissing.length} | ${item.filteredVisibleCandidates.length} | ${item.suppressedCandidates.length} | ${item.existingWeakCorrespondencesPreview.join("; ") || "-"} |`
    ),
    "",
    "## Karar",
    "",
    "Kaynak degerli ama ham hali kullanici-facing degil. Filtreli candidate listesi weak correspondence icin daha guvenli bir temel sagliyor. Sonraki adim, preview tarafinda ham missing kayitlari yerine bu filtre mantigini opt-in audit ile denemek olmali."
  ];
  await writeFile(docPath, docLines.join("\n"), "utf-8");

  console.log(`json: ${outputPath}`);
  console.log(`doc: ${docPath}`);
  console.log(JSON.stringify(result.summary, null, 2));
  for (const [limit, item] of Object.entries(result.limits)) {
    console.log(
      `limit ${limit}: raw=${item.rawMissingCount} visible=${item.filteredVisibleCandidateCount} suppressed=${item.suppressedCount} rawAyahs=${item.rawAffectedVerseCount} visibleAyahs=${item.filteredAffectedVerseCount}`
    );
  }
}

main().catch((error) => {
  console.error("audit-missing-meanings-filtered failed");
  console.error(error);
  process.exit(1);
});
