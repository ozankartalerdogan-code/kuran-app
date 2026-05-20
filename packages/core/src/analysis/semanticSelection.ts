import type { SemanticWarning } from "./semanticQuality";
import { getSafeSemanticSummary } from "./semanticSafeSummary";

export type SemanticWarningSeverity = "none" | "low" | "medium" | "high";
export type SelectableSemanticWarning = SemanticWarning | "too-close-to-translation";

export type SelectedSemanticSource = "ai" | "safe_deterministic";

export type SemanticSelectionInput = {
  verseKey: string;
  rawSummary: string;
  warnings: SelectableSemanticWarning[];
  translation?: string;
  label?: string;
};

export type SemanticSelectionResult = {
  rawSummary: string;
  selectedSummary: string;
  selectedSource: SelectedSemanticSource;
  warnings: SelectableSemanticWarning[];
  severity: SemanticWarningSeverity;
  reason: string;
  triggeringWarnings: SelectableSemanticWarning[];
  usedSafeFallback: boolean;
};

export type SafeSemanticSelection = {
  selectedSummary: string;
  selectedSource: SelectedSemanticSource;
  usedSafeFallback: boolean;
  severity: SemanticWarningSeverity;
  triggeringWarnings: SelectableSemanticWarning[];
  selectionReason: string;
};

const highSeverityWarnings = new Set<SelectableSemanticWarning>([
  "possible-semantic-drift",
  "missing-key-relation",
  "too-generic-summary",
  "severe-mechanical-or-awkward-turkish"
]);

const mediumSeverityWarnings = new Set<SelectableSemanticWarning>([
  "too-close-to-translation",
  "weak-summary"
]);
const lowSeverityWarnings = new Set<SelectableSemanticWarning>(["mechanical-or-awkward-turkish"]);

function uniqueWarnings(warnings: SelectableSemanticWarning[]): SelectableSemanticWarning[] {
  return Array.from(new Set(warnings));
}

function getHighSeverityWarnings(
  warnings: SelectableSemanticWarning[]
): SelectableSemanticWarning[] {
  return uniqueWarnings(warnings).filter((warning) => highSeverityWarnings.has(warning));
}

function getMediumQualityWarnings(
  warnings: SelectableSemanticWarning[]
): SelectableSemanticWarning[] {
  const unique = uniqueWarnings(warnings);
  const mediumWarnings = unique.filter((warning) => mediumSeverityWarnings.has(warning));

  if (
    mediumWarnings.length === 0 &&
    unique.includes("mechanical-or-awkward-turkish") &&
    (unique.includes("weak-summary") || unique.includes("too-close-to-translation"))
  ) {
    return ["mechanical-or-awkward-turkish"];
  }

  if (
    mediumWarnings.length > 0 &&
    unique.includes("mechanical-or-awkward-turkish") &&
    !mediumWarnings.includes("mechanical-or-awkward-turkish")
  ) {
    return [...mediumWarnings, "mechanical-or-awkward-turkish"];
  }

  return mediumWarnings;
}

export function classifySemanticWarningSeverity(
  warnings: SelectableSemanticWarning[]
): SemanticWarningSeverity {
  const unique = uniqueWarnings(warnings);

  if (unique.some((warning) => highSeverityWarnings.has(warning))) {
    return "high";
  }

  if (unique.some((warning) => mediumSeverityWarnings.has(warning))) {
    return "medium";
  }

  if (unique.some((warning) => lowSeverityWarnings.has(warning))) {
    return "low";
  }

  return "none";
}

export function shouldUseSafeSemanticFallback(warnings: SelectableSemanticWarning[]): {
  shouldUse: boolean;
  severity: SemanticWarningSeverity;
  triggeringWarnings: SelectableSemanticWarning[];
  reasonCategory: "severe" | "medium_quality" | "none";
} {
  const unique = uniqueWarnings(warnings);
  const severity = classifySemanticWarningSeverity(unique);
  const severeWarnings = getHighSeverityWarnings(unique);
  const mediumQualityWarnings = getMediumQualityWarnings(unique);

  if (severeWarnings.length > 0) {
    return {
      shouldUse: true,
      severity,
      triggeringWarnings: severeWarnings,
      reasonCategory: "severe"
    };
  }

  if (mediumQualityWarnings.length > 0) {
    return {
      shouldUse: true,
      severity,
      triggeringWarnings: mediumQualityWarnings,
      reasonCategory: "medium_quality"
    };
  }

  return {
    shouldUse: false,
    severity,
    triggeringWarnings: [],
    reasonCategory: "none"
  };
}

export function selectSemanticSummaryForAyah(input: SemanticSelectionInput): SemanticSelectionResult {
  const fallbackDecision = shouldUseSafeSemanticFallback(input.warnings);
  const safeSummary = getSafeSemanticSummary(input.verseKey);

  if (fallbackDecision.shouldUse && safeSummary !== null) {
    const reasonPrefix =
      fallbackDecision.reasonCategory === "severe"
        ? "severe warnings"
        : "medium quality warnings with safe summary";

    return {
      rawSummary: input.rawSummary,
      selectedSummary: safeSummary,
      selectedSource: "safe_deterministic",
      warnings: uniqueWarnings(input.warnings),
      severity: fallbackDecision.severity,
      reason: `${reasonPrefix}: ${fallbackDecision.triggeringWarnings.join(", ")}`,
      triggeringWarnings: fallbackDecision.triggeringWarnings,
      usedSafeFallback: true
    };
  }

  if (fallbackDecision.shouldUse) {
    const reasonPrefix =
      fallbackDecision.reasonCategory === "severe"
        ? "severe warnings"
        : "medium quality warnings with safe summary";

    return {
      rawSummary: input.rawSummary,
      selectedSummary: input.rawSummary,
      selectedSource: "ai",
      warnings: uniqueWarnings(input.warnings),
      severity: fallbackDecision.severity,
      reason: `${reasonPrefix}: safe deterministic summary unavailable`,
      triggeringWarnings: fallbackDecision.triggeringWarnings,
      usedSafeFallback: false
    };
  }

  return {
    rawSummary: input.rawSummary,
    selectedSummary: input.rawSummary,
    selectedSource: "ai",
    warnings: uniqueWarnings(input.warnings),
    severity: fallbackDecision.severity,
    reason:
      fallbackDecision.severity === "none"
        ? "no semantic warning requiring replacement"
        : `non-blocking warnings only: ${uniqueWarnings(input.warnings).join(", ")}`,
    triggeringWarnings: [],
    usedSafeFallback: false
  };
}

export function selectSemanticSummaryForDisplay(input: {
  sampleKey: string;
  aiSummary: string;
  warnings: SelectableSemanticWarning[];
}): SafeSemanticSelection {
  const selection = selectSemanticSummaryForAyah({
    verseKey: input.sampleKey,
    rawSummary: input.aiSummary,
    warnings: input.warnings
  });

  return {
    selectedSummary: selection.selectedSummary,
    selectedSource: selection.selectedSource,
    usedSafeFallback: selection.usedSafeFallback,
    severity: selection.severity,
    triggeringWarnings: selection.triggeringWarnings,
    selectionReason: selection.reason
  };
}
