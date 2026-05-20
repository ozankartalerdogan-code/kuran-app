export { getSafeDeterministicSemanticSummary, getSafeSemanticSummary } from "../packages/core/src/analysis/semanticSafeSummary.ts";

export {
  classifySemanticWarningSeverity,
  selectSemanticSummaryForAyah,
  selectSemanticSummaryForDisplay,
  shouldUseSafeSemanticFallback
} from "../packages/core/src/analysis/semanticSelection.ts";

export type {
  SafeSemanticSelection,
  SelectedSemanticSource,
  SemanticSelectionInput,
  SemanticSelectionResult,
  SemanticWarningSeverity
} from "../packages/core/src/analysis/semanticSelection.ts";
