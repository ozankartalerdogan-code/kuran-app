import * as dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  getSafeSemanticSummary,
  getSemanticWarnings,
  selectSemanticSummaryForAyah,
  type SelectableSemanticWarning,
  type SemanticWarningSeverity
} from "@quran-app/core";

import { createGeminiSemanticProvider } from "./geminiSemanticProvider";
import { createGroqSemanticProvider } from "./groqSemanticProvider";
import {
  runHybridSemanticAnalysisWithProvider,
  type HybridSemanticAnalysisInput,
  type HybridSemanticAnalysisOutput,
  type SemanticAiProvider
} from "./semanticPrompt";

export type AppSelectedSemanticSource = "ai" | "safe_deterministic" | "fallback" | "none";
export type SemanticSummaryStatus =
  | "ok"
  | "provider_missing"
  | "missing_translation"
  | "missing_ayah_text"
  | "provider_error"
  | "no_result";

export type SelectSemanticProviderSummaryInput = {
  verseKey: string;
  translation: string;
  semanticOutput: HybridSemanticAnalysisOutput | null;
  label?: string;
  additionalWarnings?: SelectableSemanticWarning[];
};

export type SelectedSemanticProviderSummary = {
  rawSummary: string | null;
  selectedSummary: string | null;
  selectedSource: AppSelectedSemanticSource;
  warnings: SelectableSemanticWarning[];
  severity: SemanticWarningSeverity;
  reason: string;
  status: SemanticSummaryStatus;
};

export type RunSelectedSemanticProviderSummaryInput = {
  verseKey: string;
  semanticInput: HybridSemanticAnalysisInput;
  provider: SemanticAiProvider;
  label?: string;
  additionalWarnings?: SelectableSemanticWarning[];
};

function uniqueWarnings(warnings: SelectableSemanticWarning[]): SelectableSemanticWarning[] {
  return Array.from(new Set(warnings));
}

let semanticServerEnvLoaded = false;

function buildUnavailableSemanticSummary(
  status: Exclude<SemanticSummaryStatus, "ok">,
  reason: string
): SelectedSemanticProviderSummary {
  return {
    rawSummary: null,
    selectedSummary: null,
    selectedSource: "none",
    warnings: [],
    severity: "none",
    reason,
    status
  };
}

function loadSemanticServerEnvIfNeeded(): void {
  if (semanticServerEnvLoaded) {
    return;
  }

  semanticServerEnvLoaded = true;

  const hasProviderEnv =
    (process.env.GROQ_API_KEY?.trim() ?? "").length > 0 ||
    (process.env.GEMINI_API_KEY?.trim() ?? "").length > 0;

  if (hasProviderEnv) {
    return;
  }

  const candidatePaths = Array.from(
    new Set([
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), "../../.env.local")
    ])
  );

  for (const candidatePath of candidatePaths) {
    if (!existsSync(candidatePath)) {
      continue;
    }

    dotenv.config({ path: candidatePath, override: false, quiet: true });

    if (
      (process.env.GROQ_API_KEY?.trim() ?? "").length > 0 ||
      (process.env.GEMINI_API_KEY?.trim() ?? "").length > 0
    ) {
      return;
    }
  }
}

export function resolveServerSemanticProviderFromEnv(): SemanticAiProvider | null {
  loadSemanticServerEnvIfNeeded();

  const groqApiKey = process.env.GROQ_API_KEY?.trim() ?? "";

  if (groqApiKey.length > 0) {
    return createGroqSemanticProvider({ apiKey: groqApiKey });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() ?? "";

  if (geminiApiKey.length > 0) {
    return createGeminiSemanticProvider({ apiKey: geminiApiKey });
  }

  return null;
}

export function selectSemanticProviderSummary(
  input: SelectSemanticProviderSummaryInput
): SelectedSemanticProviderSummary {
  if (input.semanticOutput === null) {
    return buildUnavailableSemanticSummary("no_result", "no semantic result available");
  }

  if (input.semanticOutput.source !== "ai") {
    const providerFallbackSummary = input.semanticOutput.result.summary;
    const safeSummary = getSafeSemanticSummary(input.verseKey);

    if (safeSummary !== null) {
      return {
        rawSummary: providerFallbackSummary,
        selectedSummary: safeSummary,
        selectedSource: "safe_deterministic",
        warnings: [],
        severity: "none",
        reason: "provider fallback replaced by safe deterministic summary",
        status: "ok"
      };
    }

    return {
      rawSummary: providerFallbackSummary,
      selectedSummary: providerFallbackSummary,
      selectedSource: "fallback",
      warnings: [],
      severity: "none",
      reason:
        input.semanticOutput.source === "fallback_after_quality_guard"
          ? "quality-guard fallback summary is being shown"
          : "provider/parser fallback summary is being shown",
      status: "ok"
    };
  }

  const rawSummary = input.semanticOutput.result.summary;
  const warnings = uniqueWarnings([
    ...getSemanticWarnings({
      verseKey: input.verseKey,
      summary: rawSummary,
      translation: input.translation
    }),
    ...(input.additionalWarnings ?? [])
  ]);
  const selection = selectSemanticSummaryForAyah({
    verseKey: input.verseKey,
    rawSummary,
    warnings,
    translation: input.translation,
    label: input.label
  });

  return {
    rawSummary: selection.rawSummary,
    selectedSummary: selection.selectedSummary,
    selectedSource: selection.selectedSource,
    warnings: selection.warnings,
    severity: selection.severity,
    reason: selection.reason,
    status: "ok"
  };
}

export async function runSelectedSemanticAnalysisWithProvider(
  input: RunSelectedSemanticProviderSummaryInput
): Promise<SelectedSemanticProviderSummary> {
  try {
    const semanticOutput = await runHybridSemanticAnalysisWithProvider(
      input.semanticInput,
      input.provider
    );

    return selectSemanticProviderSummary({
      verseKey: input.verseKey,
      translation: input.semanticInput.translation,
      semanticOutput,
      label: input.label,
      additionalWarnings: input.additionalWarnings
    });
  } catch {
    return buildUnavailableSemanticSummary("provider_error", "semantic provider execution failed");
  }
}

export { buildUnavailableSemanticSummary };
