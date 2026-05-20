import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVerseAnalysisContext, type VerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";

type CanonicalWordIndex = Record<string, Array<{ root?: string | null }>>;

interface RootExplanationEntry {
  root: string;
  short_tr?: string;
  summary_tr?: string;
}

interface LimitSummary {
  limit: number;
  processedVerses: number;
  baseEmptyRootExplanationWordHits: number;
  easyOnlyEmptyRootExplanationWordHits: number;
  filledRootExplanationWordHits: number;
  affectedVerseCount: number;
  affectedVerseKeys: string[];
  affectedRootCount: number;
  topAffectedRoots: Array<{
    root: string;
    wordHits: number;
    verseHits: number;
    short_tr: string;
    sampleVerses: string[];
  }>;
  preview: {
    baseEmptyKeyTerms: number;
    easyOnlyEmptyKeyTerms: number;
    emptyKeyTermsDelta: number;
    baseVisibleKeyTerms: number;
    easyOnlyVisibleKeyTerms: number;
    visibleKeyTermsDelta: number;
    changedKeyTermsCount: number;
    profileChangedCount: number;
    noisyOrRiskyExamples: Array<{
      verseKey: string;
      reason: string;
      baseProfile: string;
      easyOnlyProfile: string;
      baseKeyTerms: string[];
      easyOnlyKeyTerms: string[];
    }>;
  };
}

const canonicalPath = path.join("data2", "processed", "canonical_word_analysis_v4.json");
const enrichedPath = path.join("data2", "processed", "root_explanations_tr_enriched.json");
const easyOnlyPath = path.join("data2", "processed", "root_explanations_tr_v2_easy_only.json");
const outputPath = path.join(
  "data",
  "analysis-snapshots",
  "root-explanations-easy-only-canonical-impact.json"
);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function verseSortKey(verseKey: string): [number, number] {
  const [surah, ayah] = verseKey.split(":").map((part) => Number(part));
  return [surah, ayah];
}

function compareVerseKeys(left: string, right: string): number {
  const [leftSurah, leftAyah] = verseSortKey(left);
  const [rightSurah, rightAyah] = verseSortKey(right);
  return leftSurah === rightSurah ? leftAyah - rightAyah : leftSurah - rightSurah;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => clean(value)).filter(Boolean)));
}

function isPreviewNoisy(keyTerms: string[]): boolean {
  const joined = keyTerms.join(" ").toLowerCase();
  return (
    keyTerms.length > 5 ||
    joined.includes("sevap ve giysi") ||
    joined.includes("anlamı bağlama göre") ||
    joined.includes("undefined") ||
    joined.includes("null")
  );
}

function cloneWithEasyOnlyRootExplanations(
  context: VerseAnalysisContext,
  easyRootExplanations: Map<string, RootExplanationEntry>
): VerseAnalysisContext {
  const wordByWord = context.wordByWord.map((word) => {
    const root = clean(word.root);
    const easy = root ? easyRootExplanations.get(root) : undefined;

    if (!easy || clean(word.rootMeaning)) {
      return { ...word };
    }

    return {
      ...word,
      rootMeaning: clean(easy.summary_tr) || clean(easy.short_tr) || word.rootMeaning
    };
  });

  return {
    ...context,
    wordByWord,
    rootMeanings: uniqueNonEmpty(wordByWord.map((word) => word.rootMeaning))
  };
}

function hasRootExplanation(row: RootExplanationEntry): boolean {
  return Boolean(clean(row.short_tr) && clean(row.summary_tr));
}

async function loadEasyRootExplanations(): Promise<Map<string, RootExplanationEntry>> {
  const enrichedRows = JSON.parse(await readFile(enrichedPath, "utf-8")) as RootExplanationEntry[];
  const enrichedByRoot = new Map(enrichedRows.map((row) => [clean(row.root), row]));
  const rows = JSON.parse(await readFile(easyOnlyPath, "utf-8")) as RootExplanationEntry[];
  const easy = new Map<string, RootExplanationEntry>();

  for (const row of rows) {
    const root = clean(row.root);
    const shortTr = clean(row.short_tr);
    const summaryTr = clean(row.summary_tr);
    const enriched = enrichedByRoot.get(root);

    if (!root || !shortTr || !summaryTr || (enriched && hasRootExplanation(enriched))) {
      continue;
    }

    easy.set(root, row);
  }

  return easy;
}

async function analyzeVerse(
  verseKey: string,
  easyRootExplanations: Map<string, RootExplanationEntry>
): Promise<{
  verseKey: string;
  baseEmptyRootExplanationWordHits: number;
  easyOnlyEmptyRootExplanationWordHits: number;
  filledRootExplanationWordHits: number;
  affectedRoots: Array<{ root: string; wordHits: number }>;
  baseEmptyKeyTerms: number;
  easyOnlyEmptyKeyTerms: number;
  baseVisibleKeyTerms: number;
  easyOnlyVisibleKeyTerms: number;
  keyTermsChanged: boolean;
  profileChanged: boolean;
  noisyOrRiskyExample: LimitSummary["preview"]["noisyOrRiskyExamples"][number] | null;
}> {
  const [surahId, ayahNumber] = verseSortKey(verseKey);
  const baseContext = await buildVerseAnalysisContext(surahId, ayahNumber, { source: "v4" });
  const easyContext = cloneWithEasyOnlyRootExplanations(baseContext, easyRootExplanations);
  const basePreview = buildVerseAnalysisPreview(baseContext);
  const easyPreview = buildVerseAnalysisPreview(easyContext);
  const affectedRoots = new Map<string, number>();
  let baseEmptyRootExplanationWordHits = 0;
  let easyOnlyEmptyRootExplanationWordHits = 0;
  let filledRootExplanationWordHits = 0;

  for (const word of baseContext.wordByWord) {
    const root = clean(word.root);
    const easy = root ? easyRootExplanations.get(root) : undefined;
    const baseHasRootExplanation = Boolean(clean(word.rootMeaning));
    const easyHasRootExplanation = baseHasRootExplanation || Boolean(easy);

    if (!baseHasRootExplanation) {
      baseEmptyRootExplanationWordHits += 1;
    }

    if (!easyHasRootExplanation) {
      easyOnlyEmptyRootExplanationWordHits += 1;
    }

    if (!baseHasRootExplanation && easy) {
      filledRootExplanationWordHits += 1;
      affectedRoots.set(root, (affectedRoots.get(root) ?? 0) + 1);
    }
  }

  const keyTermsChanged = basePreview.keyTermsPreview.join("||") !== easyPreview.keyTermsPreview.join("||");
  const profileChanged = basePreview.selectedProfile !== easyPreview.selectedProfile;
  const noisy =
    isPreviewNoisy(easyPreview.keyTermsPreview) ||
    (basePreview.keyTermsPreview.length > 0 && easyPreview.keyTermsPreview.length === 0) ||
    profileChanged;

  return {
    verseKey,
    baseEmptyRootExplanationWordHits,
    easyOnlyEmptyRootExplanationWordHits,
    filledRootExplanationWordHits,
    affectedRoots: Array.from(affectedRoots.entries()).map(([root, wordHits]) => ({ root, wordHits })),
    baseEmptyKeyTerms: basePreview.keyTermsPreview.length === 0 ? 1 : 0,
    easyOnlyEmptyKeyTerms: easyPreview.keyTermsPreview.length === 0 ? 1 : 0,
    baseVisibleKeyTerms: basePreview.keyTermsPreview.length,
    easyOnlyVisibleKeyTerms: easyPreview.keyTermsPreview.length,
    keyTermsChanged,
    profileChanged,
    noisyOrRiskyExample: noisy
      ? {
          verseKey,
          reason: profileChanged
            ? "profile_changed"
            : easyPreview.keyTermsPreview.length === 0
              ? "became_empty_key_terms"
              : "noisy_preview_pattern",
          baseProfile: basePreview.selectedProfile,
          easyOnlyProfile: easyPreview.selectedProfile,
          baseKeyTerms: basePreview.keyTermsPreview,
          easyOnlyKeyTerms: easyPreview.keyTermsPreview
        }
      : null
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
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

async function analyzeLimit(
  limit: number,
  verseKeys: string[],
  easyRootExplanations: Map<string, RootExplanationEntry>
): Promise<LimitSummary> {
  const affectedVerseKeys: string[] = [];
  const affectedRootWordHits = new Map<string, number>();
  const affectedRootVerses = new Map<string, Set<string>>();
  let baseEmptyRootExplanationWordHits = 0;
  let easyOnlyEmptyRootExplanationWordHits = 0;
  let filledRootExplanationWordHits = 0;
  let baseEmptyKeyTerms = 0;
  let easyOnlyEmptyKeyTerms = 0;
  let baseVisibleKeyTerms = 0;
  let easyOnlyVisibleKeyTerms = 0;
  let changedKeyTermsCount = 0;
  let profileChangedCount = 0;
  const noisyOrRiskyExamples: LimitSummary["preview"]["noisyOrRiskyExamples"] = [];
  const verseResults = await mapWithConcurrency(
    verseKeys.slice(0, limit),
    12,
    (verseKey) => analyzeVerse(verseKey, easyRootExplanations)
  );

  for (const result of verseResults) {
    baseEmptyRootExplanationWordHits += result.baseEmptyRootExplanationWordHits;
    easyOnlyEmptyRootExplanationWordHits += result.easyOnlyEmptyRootExplanationWordHits;
    filledRootExplanationWordHits += result.filledRootExplanationWordHits;
    baseEmptyKeyTerms += result.baseEmptyKeyTerms;
    easyOnlyEmptyKeyTerms += result.easyOnlyEmptyKeyTerms;
    baseVisibleKeyTerms += result.baseVisibleKeyTerms;
    easyOnlyVisibleKeyTerms += result.easyOnlyVisibleKeyTerms;
    changedKeyTermsCount += result.keyTermsChanged ? 1 : 0;
    profileChangedCount += result.profileChanged ? 1 : 0;

    if (result.affectedRoots.length > 0) {
      affectedVerseKeys.push(result.verseKey);
    }

    for (const affectedRoot of result.affectedRoots) {
      affectedRootWordHits.set(
        affectedRoot.root,
        (affectedRootWordHits.get(affectedRoot.root) ?? 0) + affectedRoot.wordHits
      );
      const verses = affectedRootVerses.get(affectedRoot.root) ?? new Set<string>();
      verses.add(result.verseKey);
      affectedRootVerses.set(affectedRoot.root, verses);
    }

    if (result.noisyOrRiskyExample && noisyOrRiskyExamples.length < 30) {
      noisyOrRiskyExamples.push(result.noisyOrRiskyExample);
    }
  }

  const topAffectedRoots = Array.from(affectedRootWordHits.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 30)
    .map(([root, wordHits]) => {
      const entry = easyRootExplanations.get(root);
      return {
        root,
        wordHits,
        verseHits: affectedRootVerses.get(root)?.size ?? 0,
        short_tr: clean(entry?.short_tr),
        sampleVerses: Array.from(affectedRootVerses.get(root) ?? [])
          .sort(compareVerseKeys)
          .slice(0, 8)
      };
    });

  return {
    limit,
    processedVerses: limit,
    baseEmptyRootExplanationWordHits,
    easyOnlyEmptyRootExplanationWordHits,
    filledRootExplanationWordHits,
    affectedVerseCount: affectedVerseKeys.length,
    affectedVerseKeys,
    affectedRootCount: affectedRootWordHits.size,
    topAffectedRoots,
    preview: {
      baseEmptyKeyTerms,
      easyOnlyEmptyKeyTerms,
      emptyKeyTermsDelta: easyOnlyEmptyKeyTerms - baseEmptyKeyTerms,
      baseVisibleKeyTerms,
      easyOnlyVisibleKeyTerms,
      visibleKeyTermsDelta: easyOnlyVisibleKeyTerms - baseVisibleKeyTerms,
      changedKeyTermsCount,
      profileChangedCount,
      noisyOrRiskyExamples
    }
  };
}

async function main(): Promise<void> {
  const canonical = JSON.parse(await readFile(canonicalPath, "utf-8")) as CanonicalWordIndex;
  const verseKeys = Object.keys(canonical).sort(compareVerseKeys);
  const easyRootExplanations = await loadEasyRootExplanations();
  const limits = [100, 500, 1000];
  const summaries: Record<string, LimitSummary> = {};

  for (const limit of limits) {
    summaries[String(limit)] = await analyzeLimit(limit, verseKeys, easyRootExplanations);
  }

  const result = {
    source: {
      canonical: canonicalPath,
      enrichedRootExplanations: enrichedPath,
      easyOnlyRootExplanations: easyOnlyPath
    },
    easyRootExplanationCount: easyRootExplanations.size,
    limits: summaries,
    recommendation: {
      optInV5Suitability:
        "Uygun gorunuyor: easy-only root explanation overlay keyTerms/profile tarafinda gorunur degisim uretmiyor; etkisi root explanation coverage ile sinirli.",
      nextStep:
        "Runtime default degistirmeden opt-in canonical v5 build denenebilir; yine de 1000+ audit ve UI spot check ile dogrulanmali."
    }
  };

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`output: ${outputPath}`);
  console.log(`easy root explanations: ${easyRootExplanations.size}`);
  for (const limit of limits) {
    const summary = summaries[String(limit)];
    console.log(`\nlimit ${limit}`);
    console.log(
      `empty root explanation words: ${summary.baseEmptyRootExplanationWordHits} -> ${summary.easyOnlyEmptyRootExplanationWordHits}`
    );
    console.log(`filled root explanation word hits: ${summary.filledRootExplanationWordHits}`);
    console.log(`affected verses: ${summary.affectedVerseCount}`);
    console.log(`affected roots: ${summary.affectedRootCount}`);
    console.log(
      `emptyKeyTerms: ${summary.preview.baseEmptyKeyTerms} -> ${summary.preview.easyOnlyEmptyKeyTerms}`
    );
    console.log(
      `visible keyTerms: ${summary.preview.baseVisibleKeyTerms} -> ${summary.preview.easyOnlyVisibleKeyTerms}`
    );
    console.log(`changed keyTerms verses: ${summary.preview.changedKeyTermsCount}`);
    console.log(`profile changes: ${summary.preview.profileChangedCount}`);
    console.log(
      `top affected roots: ${summary.topAffectedRoots
        .slice(0, 10)
        .map((root) => `${root.root}(${root.wordHits})`)
        .join(", ")}`
    );
  }
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("audit-root-explanations-easy-only-impact failed");
  console.error(error);
  process.exit(1);
});
