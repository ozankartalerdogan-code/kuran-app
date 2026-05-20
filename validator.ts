type IndexedItem = {
  index: number;
  [key: string]: any;
};

type Ayah = {
  id: string | number;
  arabicTokens?: string[] | null;
  analysisTokens?: IndexedItem[] | null;
  roots?: IndexedItem[] | null;
  meanings?: IndexedItem[] | null;
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

function validateAyahs(allAyahs: Ayah[]) {
  const breakdown: Breakdown = {
    TOKEN_COUNT_DIFF: 0,
    ANALYSIS_INDEX_MISMATCH: 0,
    ROOT_MISSING: 0,
    ROOT_INDEX_MISMATCH: 0,
    ROOT_DUPLICATE_INDEX: 0,
    MEANING_MISSING: 0,
    MEANING_INDEX_MISMATCH: 0,
    MEANING_DUPLICATE_INDEX: 0,
  };

  let totalIssues = 0;

  function report(
    ayah: Ayah,
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
      details,
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

    // -----------------------------
    // ANALYSIS INDEX CHECKS
    // -----------------------------
    const seenAnalysisIndices = new Set<number>();

    for (const token of analysisTokens) {
      if (typeof token?.index !== "number" || !Number.isInteger(token.index)) {
        report(ayah, "ANALYSIS_INDEX_MISMATCH", "analysis token has missing or invalid index");
        continue;
      }

      if (seenAnalysisIndices.has(token.index)) {
        report(
          ayah,
          "ANALYSIS_INDEX_MISMATCH",
          `duplicate analysis index ${token.index}`
        );
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

    // -----------------------------
    // ROOT CHECKS
    // -----------------------------
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

    // -----------------------------
    // MEANING CHECKS
    // -----------------------------
    const meaningByIndex = new Map<number, IndexedItem>();
    const seenMeaningIndices = new Set<number>();

    for (const meaning of meanings) {
      if (typeof meaning?.index !== "number" || !Number.isInteger(meaning.index)) {
        report(ayah, "MEANING_INDEX_MISMATCH", "meaning has missing or invalid index");
        continue;
      }

      if (seenMeaningIndices.has(meaning.index)) {
        report(
          ayah,
          "MEANING_DUPLICATE_INDEX",
          `duplicate meaning index ${meaning.index}`
        );
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
        report(
          ayah,
          "MEANING_MISSING",
          `missing meaning for token index ${i}`,
          "warning"
        );
      }
    }
  }

  console.log({
    total_ayahs: allAyahs.length,
    total_issues: totalIssues,
    breakdown,
  });
}

const allAyahs = [
  {
    id: 1001,
    arabicTokens: [
      "بِسۡمِ",
      "ٱللَّهِ",
      "ٱلرَّحۡمَٰنِ",
      "ٱلرَّحِيمِ"
    ],
    analysisTokens: [
      {
        index: 0,
        sourceIndex: 1,
        arabic: "بِسۡمِ",
        morphology: "noun",
        status: "available"
      },
      {
        index: 1,
        sourceIndex: 2,
        arabic: "ٱللَّهِ",
        morphology: "noun",
        status: "available"
      },
      {
        index: 2,
        sourceIndex: 3,
        arabic: "ٱلرَّحۡمَٰنِ",
        morphology: "adjective",
        status: "available"
      },
      {
        index: 3,
        sourceIndex: 4,
        arabic: "ٱلرَّحِيمِ",
        morphology: "adjective",
        status: "available"
      }
    ],
    roots: [
      {
        index: 0,
        sourceIndex: 1,
        root: "سمو",
        status: "available"
      },
      {
        index: 1,
        sourceIndex: 2,
        root: "أله",
        status: "available"
      },
      {
        index: 2,
        sourceIndex: 3,
        root: "رحم",
        status: "available"
      },
      {
        index: 3,
        sourceIndex: 4,
        root: "رحم",
        status: "available"
      }
    ],
    meanings: [
      {
        index: 0,
        sourceIndex: 1,
        text: "adıyla",
        status: "available"
      },
      {
        index: 1,
        sourceIndex: 2,
        text: "Allah",
        status: "available"
      },
      {
        index: 2,
        sourceIndex: 3,
        text: "Rahman",
        status: "available"
      },
      {
        index: 3,
        sourceIndex: 4,
        text: "Rahim",
        status: "available"
      }
    ] // 👈 sadece ] ile bitir
  }   // 👈 sonra objeyi kapat
];

console.log("ÇALIŞTI");
console.log("AYAH SAYISI:", allAyahs.length);
validateAyahs(allAyahs);
console.log("BİTTİ");