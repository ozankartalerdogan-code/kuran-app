import type { WordAnalysisSource } from "@quran-app/core";

type QueryValue = string | string[] | undefined;

export type ReadingSource = "tr_test";

const canonicalWordAnalysisSource = "canonical";
const legacyWordAnalysisSource = "legacy";
const readingTrTestSource = "tr_test";
const debugQuerySource = "1";

function getSingleQueryValue(value: QueryValue): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim() ?? "";

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function isDebugQueryEnabled(value: QueryValue): boolean {
  return getSingleQueryValue(value) === debugQuerySource;
}

export function areExperimentalQuerySourcesEnabled(debugValue?: QueryValue): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    isDebugQueryEnabled(debugValue) ||
    process.env.QURAN_APP_ENABLE_EXPERIMENTAL_QUERY === "1" ||
    process.env.QURAN_APP_ENABLE_EXPERIMENTAL_QUERY === "true"
  );
}

export function resolveWordAnalysisSource(
  value: QueryValue,
  _debugValue?: QueryValue
): WordAnalysisSource {
  const source = getSingleQueryValue(value);

  if (source === legacyWordAnalysisSource) {
    return "legacy";
  }

  return canonicalWordAnalysisSource;
}

export function resolveReadingSource(value: QueryValue, debugValue?: QueryValue): ReadingSource | null {
  if (!areExperimentalQuerySourcesEnabled(debugValue)) {
    return null;
  }

  return getSingleQueryValue(value) === readingTrTestSource ? "tr_test" : null;
}
