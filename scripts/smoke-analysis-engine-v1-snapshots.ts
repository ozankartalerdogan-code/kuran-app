import { getAyahAnalysisEngine } from "@quran-app/core";

type SnapshotCase = {
  verseKey: string;
  requiredThemes?: string[];
  requiredAnyThemes?: string[];
  forbiddenThemes?: string[];
  expectedAddressee?: string | null;
  summaryMustExist?: boolean;
};

const expectedSource = "analysis-engine-v1:rule-based";

const cases: SnapshotCase[] = [
  {
    verseKey: "1:1",
    requiredAnyThemes: ["rahmet", "tevhid"],
    expectedAddressee: null,
    summaryMustExist: false
  },
  {
    verseKey: "1:5",
    requiredThemes: ["dua", "ibadet"],
    summaryMustExist: true
  },
  {
    verseKey: "2:2",
    requiredThemes: ["hidayet", "iman"],
    summaryMustExist: true
  },
  {
    verseKey: "2:21",
    requiredThemes: ["ibadet"],
    expectedAddressee: "insanlar",
    summaryMustExist: true
  },
  {
    verseKey: "112:1",
    requiredThemes: ["tevhid"],
    summaryMustExist: true
  },
  {
    verseKey: "113:1",
    requiredThemes: ["dua"],
    summaryMustExist: true
  },
  {
    verseKey: "114:1",
    requiredThemes: ["dua"],
    summaryMustExist: true
  }
];

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSnapshotCase(testCase: SnapshotCase, result: Awaited<ReturnType<typeof getAyahAnalysisEngine>>): string[] {
  const errors: string[] = [];

  if (result === null) {
    return ["expected data, got null"];
  }

  if (result.verseKey !== testCase.verseKey) {
    errors.push(`expected verseKey ${testCase.verseKey}, got ${result.verseKey}`);
  }

  if (result.source !== expectedSource) {
    errors.push(`expected source ${expectedSource}, got ${result.source}`);
  }

  if (!Array.isArray(result.themes)) {
    errors.push("themes is not an array");
  } else {
    for (const theme of testCase.requiredThemes ?? []) {
      if (!result.themes.includes(theme)) {
        errors.push(`missing required theme: ${theme}`);
      }
    }

    if (
      testCase.requiredAnyThemes &&
      !testCase.requiredAnyThemes.some((theme) => result.themes.includes(theme))
    ) {
      errors.push(`missing one of required themes: ${testCase.requiredAnyThemes.join(", ")}`);
    }

    for (const theme of testCase.forbiddenThemes ?? []) {
      if (result.themes.includes(theme)) {
        errors.push(`forbidden theme returned: ${theme}`);
      }
    }
  }

  if (testCase.summaryMustExist === true && !hasNonEmptyString(result.summary)) {
    errors.push("summary must be a non-empty string");
  }

  if (
    "expectedAddressee" in testCase &&
    result.participants.addressee !== testCase.expectedAddressee
  ) {
    errors.push(
      `expected addressee ${String(testCase.expectedAddressee)}, got ${String(
        result.participants.addressee
      )}`
    );
  }

  return errors;
}

async function main() {
  let failed = false;

  for (const testCase of cases) {
    try {
      const result = await getAyahAnalysisEngine(testCase.verseKey);
      const errors = validateSnapshotCase(testCase, result);

      if (errors.length > 0) {
        failed = true;
        console.error(`FAIL: ${testCase.verseKey} -> ${errors.join("; ")}`);
      } else {
        console.log(`PASS: ${testCase.verseKey}`);
      }
    } catch (error) {
      failed = true;
      console.error(`FAIL: ${testCase.verseKey} -> threw error`, error);
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("All analysis engine V1 snapshot smoke checks passed.");
}

main().catch((error) => {
  console.error("Analysis engine V1 snapshot smoke script crashed.", error);
  process.exit(1);
});
