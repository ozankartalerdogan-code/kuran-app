type IndexedItem = {
  index: number;
  [key: string]: any;
};

type ValidatorAyah = {
  id: string | number;
  arabicTokens: string[];
  analysisTokens: IndexedItem[];
  roots: IndexedItem[];
  meanings: IndexedItem[];
};

type IssueType =
  | "TOKEN_COUNT_DIFF"
  | "ANALYSIS_INDEX_MISMATCH"
  | "ROOT_MISSING"
  | "ROOT_INDEX_MISMATCH"
  | "ROOT_DUPLICATE_INDEX"
  | "MEANING_MISSING"
  | "MEANING_INDEX_MISMATCH"
  | "MEANING_DUPLICATE_INDEX";

type Severity = "info" | "warning" | "error";

type Breakdown = Record<IssueType, number>;

const expectedAyahCount = 6236;

const verseCountsBySurah = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
] as const;

function validateAyahs(allAyahs: ValidatorAyah[]) {
  const breakdown: Breakdown = {
    TOKEN_COUNT_DIFF: 0,
    ANALYSIS_INDEX_MISMATCH: 0,
    ROOT_MISSING: 0,
    ROOT_INDEX_MISMATCH: 0,
    ROOT_DUPLICATE_INDEX: 0,
    MEANING_MISSING: 0,
    MEANING_INDEX_MISMATCH: 0,
    MEANING_DUPLICATE_INDEX: 0
  };

  let totalIssues = 0;

  function report(
    ayah: ValidatorAyah,
    issueType: IssueType,
    details: string,
    severity: Severity = "error"
  ) {
    totalIssues++;
    breakdown[issueType]++;

    console.log({
      ayah_id: ayah.id,
      issue_type: issueType,
      severity,
      details
    });
  }

  for (const ayah of allAyahs) {
    const arabicTokens = Array.isArray(ayah.arabicTokens) ? ayah.arabicTokens : [];
    const analysisTokens = Array.isArray(ayah.analysisTokens) ? ayah.analysisTokens : [];
    const roots = Array.isArray(ayah.roots) ? ayah.roots : [];
    const meanings = Array.isArray(ayah.meanings) ? ayah.meanings : [];

    const tokenCount = arabicTokens.length;

    if (tokenCount !== analysisTokens.length) {
      report(
        ayah,
        "TOKEN_COUNT_DIFF",
        `arabicTokens has ${tokenCount} tokens, analysisTokens has ${analysisTokens.length}`
      );
    }

    const seenAnalysisIndices = new Set<number>();

    for (const token of analysisTokens) {
      if (typeof token?.index !== "number" || !Number.isInteger(token.index)) {
        report(ayah, "ANALYSIS_INDEX_MISMATCH", "analysis token has missing or invalid index");
        continue;
      }

      if (seenAnalysisIndices.has(token.index)) {
        report(ayah, "ANALYSIS_INDEX_MISMATCH", `duplicate analysis index ${token.index}`);
      }

      seenAnalysisIndices.add(token.index);

      if (token.index < 0 || token.index >= tokenCount) {
        report(
          ayah,
          "ANALYSIS_INDEX_MISMATCH",
          `analysis index ${token.index} is outside token range 0-${tokenCount - 1}`
        );
      }
    }

    for (let i = 0; i < tokenCount; i++) {
      if (!seenAnalysisIndices.has(i)) {
        report(ayah, "ANALYSIS_INDEX_MISMATCH", `missing analysis index ${i}`);
      }
    }

    const rootByIndex = new Map<number, IndexedItem>();
    const seenRootIndices = new Set<number>();

    for (const root of roots) {
      if (typeof root?.index !== "number" || !Number.isInteger(root.index)) {
        report(ayah, "ROOT_INDEX_MISMATCH", "root has missing or invalid index");
        continue;
      }

      if (seenRootIndices.has(root.index)) {
        report(ayah, "ROOT_DUPLICATE_INDEX", `duplicate root index ${root.index}`);
      }

      seenRootIndices.add(root.index);
      rootByIndex.set(root.index, root);

      if (root.index < 0 || root.index >= tokenCount) {
        report(
          ayah,
          "ROOT_INDEX_MISMATCH",
          `root index ${root.index} is outside token range 0-${tokenCount - 1}`
        );
      }
    }

    for (let i = 0; i < tokenCount; i++) {
      if (!rootByIndex.has(i)) {
        report(ayah, "ROOT_MISSING", `missing root for token index ${i}`, "warning");
      }
    }

    const meaningByIndex = new Map<number, IndexedItem>();
    const seenMeaningIndices = new Set<number>();

    for (const meaning of meanings) {
      if (typeof meaning?.index !== "number" || !Number.isInteger(meaning.index)) {
        report(ayah, "MEANING_INDEX_MISMATCH", "meaning has missing or invalid index");
        continue;
      }

      if (seenMeaningIndices.has(meaning.index)) {
        report(ayah, "MEANING_DUPLICATE_INDEX", `duplicate meaning index ${meaning.index}`);
      }

      seenMeaningIndices.add(meaning.index);
      meaningByIndex.set(meaning.index, meaning);

      if (meaning.index < 0 || meaning.index >= tokenCount) {
        report(
          ayah,
          "MEANING_INDEX_MISMATCH",
          `meaning index ${meaning.index} is outside token range 0-${tokenCount - 1}`
        );
      }
    }

    for (let i = 0; i < tokenCount; i++) {
      if (!meaningByIndex.has(i)) {
        report(ayah, "MEANING_MISSING", `missing meaning for token index ${i}`, "warning");
      }
    }
  }

  console.log({
    summary: "VALIDATION SUMMARY",
    total_ayahs: allAyahs.length,
    total_issues: totalIssues,
    breakdown
  });
}

function getBaseUrl(): string {
  return (process.env.QURAN_APP_WEB_BASE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
}

async function fetchAyahForValidator(
  baseUrl: string,
  surahId: number,
  ayahNumber: number
): Promise<ValidatorAyah> {
  const url = new URL("/api/debug/ayah-validator", baseUrl);

  url.searchParams.set("surahId", String(surahId));
  url.searchParams.set("ayahNumber", String(ayahNumber));

  console.log(`Requesting ${url.toString()}`);

  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `Fetch failed for ${url.toString()}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Request failed for ${url.toString()} with HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }

  return (await response.json()) as ValidatorAyah;
}

async function run() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This validator runner is development-only.");
  }

  const baseUrl = getBaseUrl();
  const allAyahs: ValidatorAyah[] = [];

  console.log("Base URL in use:", baseUrl);
  console.log("Expected ayah count:", expectedAyahCount);
  console.log({
    progress: "VALIDATOR_RUN_STARTED",
    source: "web_debug_endpoint",
    baseUrl
  });

  for (let surahId = 1; surahId <= 114; surahId++) {
    const verseCount = verseCountsBySurah[surahId - 1];

    for (let ayahNumber = 1; ayahNumber <= verseCount; ayahNumber++) {
      console.log(`Processing ${surahId}:${ayahNumber}`);
      console.log({
        progress: "VALIDATOR_COLLECT_AYAH",
        surah_id: surahId,
        ayah_number: ayahNumber
      });

      try {
        const ayah = await fetchAyahForValidator(baseUrl, surahId, ayahNumber);
        allAyahs.push(ayah);
      } catch (error) {
        console.error({
          issue_type: "AYAH_COLLECT_ERROR",
          surah_id: surahId,
          ayah_number: ayahNumber,
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  console.log({
    progress: "VALIDATOR_COLLECTION_DONE",
    total_ayahs: allAyahs.length
  });

  console.log(`Collected ${allAyahs.length} ayahs. Running validator...`);
  if (allAyahs.length !== expectedAyahCount) {
    console.warn(
      `Collected ayah count differs from expected count: ${allAyahs.length}/${expectedAyahCount}`
    );
  }

  validateAyahs(allAyahs);
}

(async () => {
  console.log("VALIDATION SCRIPT STARTED");

  try {
    await run();
    console.log("VALIDATION SCRIPT COMPLETED");
  } catch (err) {
    console.error("VALIDATION SCRIPT FAILED", err);
    process.exitCode = 1;
  }
})();
